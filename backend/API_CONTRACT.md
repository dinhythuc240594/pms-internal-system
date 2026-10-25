# PMS API contract

Hotel business routes live under `/api/tenants/<tenant_id>`; system SaaS billing
uses `/api/billing` and `/api/manager`. Cookie authentication;
mutations require `X-CSRF-Token` from `/api/auth/session` or login. JSON camelCase.
Errors `{error:{code,message,details?}}`. No automatic localStorage fallback.

Shared backend modules: `core_models.py`, `security.py`, `auth/routes.py`,
`admin/routes.py`, `__init__.py`, `0002_identity.py`. Shared `security` exports:
`require_tenant(action)` decorator (sets `g.tenant`, `g.user`, `g.role`),
`require_system(super_only=False)`, `ApiError(status,code,message)`,
`audit(event,entity_type,entity_id,details=None)`, `payload()` JSON-object validation.
Successful mutations commit in after_request; routes MUST NOT commit independently.
Flush when IDs/constraint checks needed. API uses transaction-local RLS context.

HTTP implementation uses `common.CommonMethodView` handlers and `CommonURL`
registration in each module's `urls.py` (lazy `module:ViewClass`, explicit methods).
`ApiError` and JSON-object validation live in `common`; the `security` imports
remain compatible. All existing paths, endpoint names, response shapes, CSRF,
authorization, locking and idempotency contracts remain unchanged. Register new
ORM models in `pms_api/model_registry.py` independently of handler imports.

Core models: User(id String(40),name,email,password_hash,global_role,active);
Tenant(id String(40),name,status,settings JSONB); TenantUser(id,tenant_id,user_id,role,active);
AuditLog(id,tenant_id nullable,user_id,event,entity_type,entity_id,details,created_at).
All authenticated account roles may update their own display name through
`PATCH /api/auth/profile` with `{name}` (1–160 trimmed characters). Email, roles,
and another user's ID cannot be changed here. Migration `0019_self_service_audit`
permits INSERT-only global audit records for the actor's own profile/session events;
it grants no additional audit read, update, or delete access. Migration
`0022_merge_client_settings` joins this history with `0021_booking_commissions`;
`db upgrade` applies both branches without rewriting existing revisions.

GET `/api/audit` requires SUPER_ADMIN. Optional exact-match `tenantId`/`userId`
filters are IDs (1–40 characters); `event` is an exact-match code (1–80 characters).
Unknown IDs/events return an empty list. Optional
`start`/`end` are ISO timestamps with timezone; start is inclusive and end exclusive.
With both supplied, end must follow start. Encode `+` offsets in query strings.
`page` defaults to 1 (1–100000); `pageSize` defaults to 200 (1–200). Invalid filters
return 422. Response keeps `auditLogs` and adds
`pagination:{page,pageSize,totalItems}` (count after filtering). Results sort by
createdAt descending, then id descending for ties. Omitted filters preserve the
latest 200 records, including system events with null tenant/user IDs. Filtering
and paging happen in SQL; offset pages may shift when new events arrive.
GET `/api/tenants/<id>/audit` has the same response and filters except `tenantId`:
the URL fixes the tenant and supplying `tenantId` returns 422. Owner and system
roles may read it; other hotel roles receive 403. Each log includes
`{id,tenantId,userId,userName,event,entityType,entityId,details,createdAt}`;
`userName` is the current actor name or an empty string when unavailable.

`uid()` UUID string, `utcnow()` aware datetime. db from extensions.
Each domain model has tenant_id FK tenants.id and unique(tenant_id,id), with
composite tenant FKs for references. Domain migrations
0003_catalog -> 0004_booking -> 0005_finance -> 0006_housekeeping.
Migration helpers in `rls.py`: `protect_table(table)` creates FORCE RLS tenant
policy, `unprotect_table(table)` disables; root migration owns identity RLS.

Catalog: `catalog/models.py`, `catalog/routes.py`, `0003_catalog.py`.
Models exports RoomType(id,tenant_id,name,base_price,capacity,active),
PhysicalRoom(id,tenant_id,room_type_id,number,condition,active),
Master(id,tenant_id,catalog,name,data JSONB,active),
DailyRate(id,tenant_id,room_type_id,date,price,stop_sell),
RoomBlock(id,tenant_id,room_id,start_date,end_date,reason),
RoomTypeAvailability(id,tenant_id,room_type_id,date,total_rooms,booked_rooms).
PhysicalRoom is serialized as `{id:number,uuid:id,typeId:room_type_id,condition,active}`.
RoomType `{id,code,name,price:decimal-string,capacity,active}`. `id` is the immutable
internal UUID; `code` is a tenant-unique business string (1–40 trimmed characters)
and preserves values such as `2` and `02`. Legacy rows may have null code; omitted
code on PATCH preserves it. Existing room, reservation and OTA references keep the UUID.
masters include roomTypes, bookingSources, services, paymentMethods, funds,
cashbookCategories.
Client accounting settings also use `cashbookCategories` with
`{name,type:"INCOME"|"EXPENSE",active}`, `commissionTypes` with `{name,active}`,
and `commissionRules` with `{name,typeId,active}`. Commission `typeId` must refer to
a type in the same tenant; new or changed references require an active type.
Existing recipients can retain a disabled type when edited. These are configuration
catalogs; they do not calculate commissions or create cash documents automatically.
Funds have `type:cash|bank` (default cash); type changes are rejected after ledger history.
Other existing settings catalog names may use Master but do not fake advanced inventory.
Unit masters are persisted per tenant. New tenants and migration 0016 receive
missing Cái, Gói, Chai, Lon, Hộp, Bộ, Kg, Lít, Lần and Đêm; custom or disabled units
are preserved. Settings saves directly to the database through the existing API.
POST/PATCH `/masters/<catalog>` (input id optional); POST `/masters/<catalog>/<id>/toggle`;
PATCH `/settings`; GET `/rates?start=&end=`; PUT `/rates` with
`{roomTypeId,start,end,price,stopSell}`; POST/DELETE `/room-blocks[/<id>]`;
GET `/availability?start=&end=&typeId=`; POST `/quote` accepts
`{checkIn,checkOut,rooms:[number,...]}` returns nightly rows and total decimal string.
Exports `catalog_snapshot(tenant_id)` => `{rooms,masters,settings}`,
`quote_stay(tenant_id,room_numbers,start_date,end_date)` returns JSON-ready quote,
`lock_inventory(tenant_id,room_type_ids,start,end)` materializes/locks availability
rows in deterministic order; `adjust_inventory(...,delta)` updates locked booked counts.
Quote rejects inactive/maintenance, block, stop sell and overlapping active stays.
Booking creation repeats these checks under inventory and room locks.

PATCH `/settings` also accepts optional hotel profile fields `phone` (40),
`contactEmail` (254), `website`/`logoUrl` (2048), `taxCode` (80), `bankName` (160),
`bankAccount` (80), `bankAccountName` (160), and `defaultLanguage:vi|en`.
Lengths are maximum trimmed string lengths; empty strings clear optional values.
Email is normalized/validated. Website permits HTTP/HTTPS; logo requires HTTPS.
URLs reject embedded credentials, whitespace/control characters, backslashes,
invalid hosts and invalid ports. The server stores URLs without fetching them;
this is not an upload endpoint. `defaultLanguage` records profile metadata rather
than translating the application. Existing timezone/currency/history guards apply.
The hotel contact profile is separate from Manager's private customer/CRM profile.

Booking: `bookings/models.py`, `bookings/routes.py`, `0004_booking.py`.
Imports catalog/core exports above. Implements guest information within reservations,
reservations CRUD and cancel/checkin/checkout, clean/dirty/maintenance, charges/services, payments/refunds,
notes/history and immutable nightly prices; multiple rooms/guests; money Decimal.
Booking JSON existing aliases `{id,guest,phone,room,source,checkIn,checkOut,total,status}`
plus `{rooms:[number],guests:[{id,name,phone,email}],nightlyRates,charges,payments,
notes,history,paid,balance,currency}`. POST/PATCH `/reservations` (PATCH /<id>) accepts
old single room/guest and multiroom `rooms`/`guests`. Source accepts master ID or name.
Guest objects with existing `id` and supplied profile fields update within the same
reservation transaction. Failure rolls back both the profile and booking edit.
Unchanged historical sources remain editable after source rename/deactivation.
POST `/reservations/<id>/status` `{status}`; POST `/rooms/<number>/condition` `{condition}`.
`CONFIRMED -> NO_SHOW` is permitted only on or after check-in in the hotel's
timezone. Booking JSON adds nullable `noShowAt`. NO_SHOW is terminal for stay
edits/check-in; it releases room inventory and cancels this reservation's open
housekeeping tasks without changing the room's physical condition. It preserves
night prices, charges, deposits, payments and refunds. No automatic fee, refund
or deposit conversion is posted. Staff may still add charges/payments/refunds
through the existing financial endpoints. OTA modifications/cancellations cannot
replace a locally recorded NO_SHOW; an incompatible revision stays unprocessed.
Forecast/occupancy exclude NO_SHOW. Current realized-revenue and debt reports do
not classify manually entered no-show fees; cash movements remain in the ledger.
Booking status must be a string (422 `invalid_status` otherwise); a string that
does not match an allowed transition returns 409 `invalid_transition`.
Guest information is created and edited through `/reservations`; there is no
standalone guest management endpoint. POST `/reservations/<id>/charges`,
POST `/reservations/<id>/payments`, POST `/reservations/<id>/payments/<payment_id>/refund`,
POST `/reservations/<id>/notes`; GET `/reservations/<id>` detail.
Optional guest emails must contain one `@`, nonempty local/domain parts, and no
whitespace; invalid values return 422 `invalid_guest` and roll back the mutation.
Money mutations use required Idempotency-Key (stable client intent, fingerprint,
unique tenant/key, replay same response, 409 mismatch), reservation locked first.
Payment `{amount,methodId,fundId,note}`; charge `{serviceId?,description,quantity,
unitPrice,type:service|fee|tax|discount}`; refund `{amount,reason}`. No overpayment or
over-refund; ledger same transaction and append-only. Checkout ONLY fully paid.
Exports `booking_snapshot(tenant_id)` => `{bookings,guests,housekeepingLogs,ledger}`.
Housekeeping logs include `{createdAt,actor,actorId,room,condition}`.
New bookings acquire a shared tenant lock with refreshed settings before room locks;
payments acquire a shared fund lock before writing ledger. Configuration edits take
exclusive locks, so history guards serialize with first booking/payment creation.
Booking lock order room numbers sorted then daily inventory. Edits retain original
nightly snapshots if rooms/dates unchanged. RLS all tables, row exclusion/lock prevents races.

Root GET `/workspace` merges snapshots and `{users,tenant}`.
For HOUSEKEEPING it omits catalog `price`/`commission`/`tax` and daily-rate `price`
while retaining room identities, names, dates, and stop-sell flags. Existing guest
contact and booking financial redaction still applies; other roles retain prices.
Auth GET `/api/auth/session` returns `{user,tenants,csrfToken,expiresAt}` or401;
POST `/api/auth/login` `{email,password,remember}` same response;
POST logout, POST change-password `{currentPassword,newPassword}`.
User JSON `{id,name,email,globalRole,active,memberships:[{tenantId,role,active}]}`.
Tenant JSON `{id,name,status,...settings,rooms:number}`.
Root staff GET/POST/PATCH `/users[/<id>]` `{name,email,password?,role,active}`.
Root system GET/POST/PATCH `/api/tenants[/<id>]` creates hotel + owner
`{name,ownerName,ownerEmail,ownerPassword,status?}`. GET `/api/audit` super admin.

## System user administration

All `/api/users` endpoints require SUPER_ADMIN; SYSTEM_MANAGER and tenant users
receive 403. This is separate from tenant staff `/api/tenants/<id>/users`.

- GET `/api/users` returns `{users:[...]}` containing only internal accounts with
  globalRole SUPER_ADMIN or SYSTEM_MANAGER, including inactive accounts, ordered
  by name/id. Each entry is the existing User JSON plus `createdAt`; passwords and
  password hashes are never serialized.
- POST `/api/users` accepts `{name,email,password,globalRole?,active?}` and returns
  the created entry with 201. Defaults: SYSTEM_MANAGER and active=true. Name is
  1–160 characters after trimming; email uses the existing normalized unique
  login identity; password is 12–128 characters. Only the two system roles and
  boolean active are valid. Unknown fields return 422; duplicate email returns 409.
- PATCH `/api/users/<id>` accepts a nonempty subset of `{name,globalRole,active}`
  and returns the accepted entry. Email/password are not editable here. A tenant
  account target returns 404. Deactivation or a role change revokes the account's
  sessions; reactivation requires a fresh login. Self-deactivation/self-demotion
  and removal of the last active Super Admin return 409. There is no DELETE route.

Changes are serialized and audited as `system_user.created`/`system_user.updated`
without credentials. Staff membership updates remain scoped to their tenant and
cannot grant global roles or remove its last active Owner.

Frontend preserves the original PMS layout and styles.
Default real API, credentials include; dev proxy `/api` ->127.0.0.1:5000.
Provider async methods retain existing names, fetch workspace after mutations.
No auth tokens stored in browser storage; selected tenant ID may persist in localStorage.
Pending financial intents retain only hashed fingerprints/opaque keys in sessionStorage
until the accepted write and workspace refresh are confirmed, allowing safe retry after reload.
Return API 401/403/errors visibly; loading prevents guard premature redirects.
Booking modal multiroom/guest and server quote; complete detail tabs via endpoints;
Settings, Users, Rates, admin tenants real API. Multiroom occupancy affects
RoomDiagram/TapeChart/helpers. Sales, Cashflow and housekeeping screens use the
domain APIs below. Future features must not show fake successful writes.
Supported role actions: owner all tenant actions; frontdesk reservations.view/write,
rooms.view,housekeeping.view/write,rates.view,guests.view/write,payments.write,
cashbook.view,dashboard.view,pos.view/write,housekeeping.manage;
HK rooms.view,housekeeping.view/write (own assigned work only);
accountant dashboard.view,reservations.view,guests.view,cashbook.view/write,reports.view,
rates.view,payments.write,pos.view/write/cancel,cashbook.reverse,finance.adjust.
All tenant roles also have workspace.view/profile.view.

## BE-06: POS and shared cash ledger

`finance/{models,routes}.py` exports `finance_snapshot`, `ledger_json`,
`lock_funds`, `fund_balance`, `ensure_available` and `local_date` for booking writes.
Every POS/cash-document/closed-booking financial mutation requires
`Idempotency-Key`. Replays return the original accepted result; a changed payload,
actor or endpoint under the same tenant/key returns 409. Money is Decimal(19,4),
serialized as decimal strings with four fractional digits. Documents retain their
original and base-currency snapshots; new rates do not rewrite posted history.

- GET `/pos/invoices?q=&status=&page=&pageSize=` returns `{posInvoices,pagination}`;
  GET `/pos/invoices/<id>` returns invoice detail.
- POST `/pos/invoices` with `{items:[{serviceId,quantity,unitPrice?}],customerName?,note?,currency?}`
  creates a DRAFT. PATCH `/pos/invoices/<id>` edits only items/customerName/note.
  Item descriptions and prices are snapshots; posted items cannot be edited.
- POST `/pos/invoices/<id>/post` with `{}` posts retail; `{bookingId}` appends
  charges to an open booking in the same transaction. Booking payments then use
  booking endpoints; posting does not create a second cash receipt.
- POST `/pos/invoices/<id>/payments` with `{amount,methodId,fundId,note?}`;
  POST `/pos/invoices/<id>/payments/<paymentId>/refund` with `{amount,reason}`.
  Refunds use the original fund and cannot exceed the unrefunded payment.
- POST `/pos/invoices/<id>/cancel` with `{reason}` appends refund/charge
  compensation. No deletion of posted items or monetary history. Closed bookings
  require the adjustment endpoint rather than cancelling historical charges.
- POST `/cash-documents` with `{type,amount,fundId,description,currency?,toFundId?,date?,categoryId?}`.
  Types: receipt, expense, withdrawal, transfer, opening. Transfer requires two
  different funds and posts equal opposite ledger entries. Only opening accepts
  a date; it must be no later than today and before existing fund history.
  One opening document per fund/currency, including after reversal.
- POST `/cash-documents/<id>/reverse` with `{reason}` appends one linked reversal.
  Original documents/ledger remain immutable. Insufficient current funds returns
  409 and rolls back the entire operation.
- GET `/cashbook?startDate=&endDate=&fundId=&fundType=&actorId=&currency=&categoryId=&documentId=&page=&pageSize=`
  returns `{ledger,cashDocuments,summary,fundBalances,pagination}`. Fund type is
  cash or bank. Summary follows `opening + income - outflow = closing` across the
  entire filtered period, independent of pagination. `fundBalances` are actual
  current balances, independent of the period and actor filters.
- POST `/reservations/<id>/adjustments` for a CHECKED_OUT, fully paid booking:
  `{type:'credit',amount,reason,paymentId}` appends a discount plus refund;
  `{type:'debit',amount,reason,methodId,fundId}` appends a fee plus payment.
  The closed booking stays fully settled; the original payment/charge is retained.
  Only owner/accountant can adjust.

All monetary writes lock funds in sorted order using tenant/fund advisory locks,
shared with booking payments/refunds. Debits cannot make a fund negative. An
inactive historical fund remains usable only for its refund/reversal.
Workspace includes `{posInvoices,cashDocuments,ledger,cashbookActors}` for roles
that may see finance. Invoices/documents/ledger are limited to the most recent 100;
Sales uses paginated search and detail endpoints to retrieve older invoices.
Cashbook documents cover the returned ledger page and any linked reversals,
including reversals outside the requested period. Actor options contain only
`{id,name}`. Batch invoice serialization avoids queries per invoice.

Cashbook categories use the existing master endpoints with catalog
`cashbookCategories` and `{name,type:INCOME|EXPENSE,active?}`. Category assignment
is optional and only allowed on receipt/expense documents. The selected master
must be active, belong to the same tenant, and match the document direction.
Documents add nullable `{categoryId,categoryName,categoryType}` snapshots;
renaming/deactivating a category does not rewrite history. Reversal copies the
original category snapshot. `categoryId=<id>` includes historical use of an
inactive category; `categoryId=uncategorized` includes rows without classification.
Summary follows the category filter; actual fund balances remain unfiltered.
`documentId=<id>` narrows rows to that tenant's original document and linked
reversals, subject to the remaining filters. Unknown IDs return an empty page;
the parameter does not grant access to another tenant's document.

### Booking-source commissions

Migration `0021_booking_commissions` adds tenant-protected, append-only
`commission_settlements` and `commission_payouts`. Reads require `cashbook.view`;
settlement/payment require `cashbook.write`, the CASHBOOK entitlement and CSRF.

- GET `/commissions?startDate=&endDate=&currency=&sourceId=&status=&page=&pageSize=` returns
  `{items,candidates,summary:{accrued,paid,balance,currency},pagination:{page,pageSize,totalItems}}`.
  Currency is VND/USD (default hotel currency). SQL pagination covers the combined
  list of settled and pending bookings; summary covers the full filtered result.
  Dates use the frozen settlement business date, or actual checkout in hotel
  timezone for pending bookings, with scheduled checkout as a fallback; both date endpoints are inclusive. Omitted
  start includes older history, omitted end uses today. Status is empty, UNPAID,
  PARTIAL, PAID or NEEDS_REVIEW; status filtering applies to settled items.
  Candidates are checked-out bookings not yet reconciled.
  A specific cashbook `documentId` link includes its original and reversal entries
  without the default today cutoff; explicit date filters still apply. Ordinary
  cashbook reads retain the default cutoff. This keeps saved voucher dates visible
  after changing hotel timezone.
- POST `/commissions/settle` with `{bookingId}` freezes one settlement per
  CHECKED_OUT booking. A repeat returns the existing record. New bookings retain
  source ID/name/percentage in `pricingSnapshot.commission`; later master changes
  do not change that rate. A legacy booking without a snapshot requires explicit
  `{bookingId,legacyPercent,confirmLegacyRate:true}`, with percentage 0–100.
  The API never silently substitutes today's source rate for old bookings.
- POST `/commissions/<id>/payments` with
  `{amount,fundId,categoryId?,note?}` requires `Idempotency-Key`. It records a
  positive partial/full payment up to the remaining balance, using an active
  same-currency fund with sufficient funds. Optional category must be EXPENSE.
  Settlement/payment/ledger writes are atomic. Other-currency writes also require
  MULTI_CURRENCY. This records a cash expense; it does not call a bank or OTA.

Settlement items contain `{id,bookingId,guestName,sourceId,sourceName,percent,
roomNet,baseRoomNet,amount,baseAmount,currency,baseCurrency,exchangeRate,paid,
balance,status,needsReview,date,payments}`; monetary values are decimal strings.
Payments contain `{id,cashDocumentId,fundId,amount,date,note,reversed}`. Reversing
the linked cash document restores the amount due while retaining payout history.
Candidates contain `{bookingId,guestName,sourceId,sourceName,percent,missingRate,
needsReview,currency,checkOut}`.

The basis is the sum of saved nightly room prices after room-price discounts,
excluding services, tax and fees; commission = roomNet × percent / 100. The base
amount uses the saved booking FX snapshot. Whole-bill discount charges lack room
allocation and mark the booking NEEDS_REVIEW. Post-checkout charge/refund changes
also require review. A frozen settlement is retained, but further payment is
blocked with 409 `commission_needs_review`; no automatic allocation or accounting
override is available. Locks serialize payment with booking adjustments and fund
writes; overpayment returns 409 `commission_overpayment`.

## BE-07: Housekeeping assignments and inspection

The plan calendar reads `GET /housekeeping/tasks?start=YYYY-MM-DD&end=YYYY-MM-DD`
and `/housekeeping/shifts` with the same range (end exclusive, 1–31 days).
The existing `date` query remains supported; it cannot be combined with a range.
Range responses include all matching work and preserve the housekeeper's own-work scope.
`POST /housekeeping/tasks/manual` accepts `{date,room,note?,staffId?,shiftId?}`,
where `room` is the physical room number. Owner/front desk can create and optionally
assign a task atomically. Staff must be active; an optional shift must belong to
that staff member on the same date. A room with an open task that day, a maintenance
room, or an inspection room is rejected. Creating work does not change room condition.
Tasks expose `source: manual|automatic`; manual work uses the existing `dirty` kind,
room revision, assignment/status workflow and audit logs. No schema migration is needed.

`housekeeping/{models,routes}.py` exports `housekeeping_snapshot`,
`guard_room_condition`, `invalidate_room_tasks` and `checkout_task`.
All routes below are relative to `/housekeeping` within the tenant prefix.

- GET/POST `/staff`; PATCH `/staff/<id>` with `{name,phone?,userId?,active?}`.
  A linked account must be an active HOUSEKEEPING member of the same tenant.
- GET `/shifts?date=&staffId=`; POST `/shifts`; PATCH `/shifts/<id>` with
  `{staffId,date,startTime,endTime,note?,active?}`. Times are HH:mm, same day,
  start before end. Active shifts for one staff member cannot overlap.
  POST additionally accepts `period: day|week|month` (default `day`). Repeat the
  same staff member, hours, notes and active state on consecutive dates from
  `date`: one day, seven days, or one calendar month. A month ends immediately
  before the same date in the next month, clamped to its last valid day, e.g.
  October 17–November 16 or January 31–February 27 in a non-leap year.
  The tenant mutation lock and request transaction cover the whole batch. Any
  invalid shift or overlap rolls back all created rows and logs. Batch overlap
  returns 409 `shift_overlap` with the date in `error.details.date` and a
  translatable message. Day creation keeps the single-shift response; week/month
  return `{date,throughDate,created,shifts:[...]}`. PATCH still edits only the
  selected shift and rejects `period`. No schema migration is required.
- GET `/tasks?date=` returns scoped work; POST `/tasks` with
  `{date}` generates arrival/departure/stayover/dirty tasks without duplicates.
  Checkout creates its task atomically without requiring plan generation.
- POST `/tasks` also accepts `{dates:[YYYY-MM-DD,...],staffIds?:[id,...]}` for
  one atomic batch. Select 1–31 unique dates within a 31-day inclusive span and
  up to 100 unique active staff members belonging to this hotel. Do not combine
  `date` and `dates`. Staff with linked accounts require active HOUSEKEEPING
  memberships. All participants are validated before generating any tasks.
  Omitted/empty `staffIds` generates work without assignment, as before.
  New and existing unassigned **pending** work with a current room revision is
  distributed among selected staff by their open workload on that day; ties
  rotate using cumulative workload over the selected days. Attach the earliest
  active shift belonging to the chosen staff member on the task date, or leave
  `shiftId` null when no shift exists. Existing assignments, started/inspection/
  closed tasks and maintenance/inspection rooms are preserved. Generation still
  follows the existing booking/dirty-room intents; it does not invent a daily
  task for rooms without applicable work.
  Response: `{date,dates,created,assigned,days:[{date,created,assigned}]}`;
  `date` is the first selected day. The legacy `{date}` request additionally
  retains its `tasks` response. Batch responses omit task payloads; reload the
  relevant calendar range once. A retry preserves tasks and assignments and
  reports zero new creations/assignments when there is no new pending work.
- Optional `dayPlans` adds choices for individual dates:
  `[{date,roomIds?:[physicalRoomUuid,...]|null,shifts?:[{staffId,shiftId:null|id}]}]`.
  Dates must be distinct members of `dates` (or match legacy `date`). Omitted
  dates/roomIds or null roomIds retain demand-based generation. An explicit
  room list contains 1–500 distinct active rooms of this tenant, excluding
  maintenance and inspection rooms. It restricts **both** generation and
  assignment to those rooms and creates daily cleaning work for selected rooms
  even when clean or without bookings. Existing current-revision work for a
  selected room/date, including closed work, is preserved rather than recreated.
  The additional daily intent is unique by date, room and room revision.
  Each shift override must belong to a selected employee and be active on that
  exact date. Omitted employees keep earliest-shift selection; explicit null
  means no linked shift even when active shifts exist. Validate every room and
  shift across all dates before generation, with the same atomic rollback and
  tenant mutation lock as the batch. Already assigned work retains its shift.
- POST `/tasks/<id>/assign` with `{staffId,shiftId?,revision}`.
  POST `/tasks/<id>/status` with `{status,note?,revision}`. A stale revision
  returns 409. Reassignment restarts work in pending state.

Task flow: pending -> in_progress -> inspection -> completed. An assigned
housekeeper can start and submit inspection; owner/front desk confirm clean,
send back for rework or cancel. Staff may see and update only their linked
assignments. They cannot confirm their own room as clean. Room condition is
clean/dirty/inspection/maintenance. Direct room/catalog writes cannot bypass an
assigned task or create inspection state. Inspection blocks check-in until clean.

Check-in, checkout and room configuration changes invalidate old tasks using
`housekeeping_revision`; an old occupant's task cannot clean a new stay. Planner
locks reservation references before rooms to match lifecycle writes. Staff and
shift changes cannot orphan open assignments. History is append-only and audited.
Workspace adds `{housekeepingStaff,housekeepingShifts,housekeepingTasks,
housekeepingWorkLogs,housekeepingAccounts}`. Housekeepers get only their own work;
accountants receive no housekeeping snapshot. Account options contain `{id,name}`
and are exposed only to managers of housekeeping.

`python manage.py process-housekeeping-plans --actor-email <existing-system-email>`
runs one pass; add `--watch --interval 900` for a separate polling worker, or
`--tenant <id>` to scope a pass. Actor must be an existing active SYSTEM_MANAGER
or SUPER_ADMIN and is rechecked on each pass/tenant. The worker creates no account.
It uses each active hotel's local business date, checks current entitlements,
takes the same tenant/reservation/room locks and reuses the manual planner's
immutable task intents. Repeated passes do not duplicate tasks and can pick up
bookings created later that day. Empty background passes do not create work logs.
The HTTP API does not start or schedule this process automatically.

## BE-08: Operational and financial reports

All report paths use the tenant prefix. Dates follow the hotel's timezone; periods
include `start` and exclude `end`, with 1–366 days. Invalid dates return 422.
Money is a four-place decimal string; currencies are never combined or converted.
Omitting currency uses the tenant setting.

- GET `/reports/dashboard?date=YYYY-MM-DD` requires `dashboard.view`. Returns
  arrival/departure bookings, current distinct IN_HOUSE rooms (including rooms due
  or overdue for checkout), housekeeping alerts and a seven-day chart. Financial
  fields and booking balances are omitted for front desk. `financial` is null
  without financial permission or when REPORTS_BASIC is disabled.
- GET `/reports/revenue?start=&end=&currency=` requires `reports.view`. Each row
  contains `{date,amount,nights,reserved,reservedRooms}`. Amount/nights/reserved
  follow the selected currency; `reservedRooms` counts distinct booked rooms across
  all currencies so occupancy does not change when the monetary filter changes.
- GET `/reports/financial?start=&end=&currency=` requires `reports.view`. Returns
  `{summary,rows,snapshot,asOf,timezone,currency,definitions}`. Summary contains
  forecastRoomRevenue, roomRevenue, servedNights, adr, realizedRevenue,
  cashReceived, cashRefunded, netReceipts, income, outflow, netCash, opening, closing.
  `opening + income - outflow = closing` reconciles the cash ledger. Snapshot
  deposits/debt are current balances at asOf, independent of the selected period.

ADR uses completed room nights before the current business day, excluding services
and taxes. Realized revenue recognizes closed booking bills on actual checkout,
later adjustments on their own posting day and retail POS on posting/cancellation.
Booking-linked POS is counted once through booking charges. This is closed-bill
reporting; nightly accrual/Night Audit remains separate future work. Historical
occupancy uses the current active-room capacity, whose historical changes are not
yet snapshotted. Reports exposes these definitions to users.

### Advanced business reports

GET `/reports/business?report=&start=&end=&currency=&basis=` requires
`reports.advanced.view` and REPORTS_ADVANCED. Supported reports are source
(default), room, roomType, cancellations, nationality and discounts. Date period
is `[start,end)`, 1–366 days in hotel timezone. `basis=original|base` chooses
original currency or saved base-currency amounts; no current FX revaluation.
Response is `{report,start,end,currency,basis,timezone,asOf,rows,summary,definitions}`.

| Report | Row fields | Meaning |
| --- | --- | --- |
| source / room / roomType | `id,label,bookings,nights,servedNights,forecastRoomRevenue,roomRevenue` | Saved nightly amounts within the period; served nights ended before today for IN_HOUSE/CHECKED_OUT. Excludes CANCELLED/NO_SHOW. Room type uses the saved booking type ID and its current display name. |
| cancellations | `date,source,bookings,nights,cancelledRoomValue` | Actual local cancellation day; value is the saved full room quote, not a fee or measured lost revenue. |
| nationality | `nationality,guests,bookings,guestNights` | Current guest profile; IN_HOUSE/CHECKED_OUT stays overlapping the period, across all currencies. Unique guests per nationality; guest nights use the stay's overlap. Guest arrival/departure within a group and nationality history are not separately recorded. |
| discounts | `kind,label,code,bookings,discountAmount` | Booking created within the period, excluding CANCELLED/NO_SHOW; saved pricing-policy discount, not today's master configuration. Repricing the booking can change its snapshot. |

Money fields are four-place decimal strings; counts are integers. Summary sums
the relevant row measures. Grouped booking totals can count a multi-room or
multi-nationality booking in more than one group. The response explains these
limits; nationality does not use the monetary currency filter.

## BE-09: Plans, subscriptions and quotas

GET `/api/plans` is for system roles. POST `/api/plans`, PATCH and DELETE
`/api/plans/<id>` are Super Admin only. FREE/PRO remain defaults; additional codes
match `[A-Z][A-Z0-9_]{0,11}` and are unique and immutable once assigned. Plan fields
are `{code,name,price,priceYear,currency,maxRooms,maxUsers,features,active,deleted}`;
features is a boolean object, nullable plan ceilings are positive integers.
FREE has zero monthly/yearly price and at most 30 rooms/five active accounts.
DELETE archives the plan (`deleted=true`), removes it from sale and blocks new
assignments without breaking existing subscriptions or immutable history.
PATCH `{deleted:false}` restores it. `active=false` also disables existing access.

GET `/api/public/plans` is anonymous and returns `{plans,featureLabels}` from the
same plan catalog, with only active, nonarchived plans and `Cache-Control:no-store`.
It exposes no tenant or billing records. Marketing reads this API on mount/focus;
only enabled plan features appear and unavailable API data shows an error/retry.

System roles may GET/PUT `/api/tenants/<id>/subscription` and GET its `/history`.
PUT accepts `{planId,roomCount,status,startDate?,endDate?,amount?,currency?,cycle?}`.
`roomCount` is a positive integer required for a new subscription; omission on an
existing subscription preserves the registered quantity. It cannot exceed the
plan ceiling or fall below currently active rooms. Each assigned hotel has a
finite allowance `min(roomCount,maxRooms)` (or roomCount when maxRooms is null).
Registering 10 rooms permits at most 10 active rooms. Dates must include a timezone;
end must follow start; an active plan other than FREE needs a future end.
Cycle is monthly/yearly. Omit amount for configuration changes; a supplied amount
must be a finite nonnegative exact decimal and its currency must match the plan.
Subscription and append-only history commit atomically. History snapshots plan
name/code, previous plan, roomCount, amount, currency, cycle, dates, status and actor, with
actions created/changed_plan/renewed/changed_status/updated. History lists the latest
200 entries, newest first; editing plan metadata does not rewrite these snapshots.

Subscription/history have tenant RLS with system access. Tenant writes take the
tenant lock before subscription/plan locks, also used by renewal and quota checks.
Inactive, cancelled, future or expired subscriptions block tenant writes but retain
existing read access. Explicit feature=false blocks the corresponding module APIs
for reads and writes. Workspace aggregation remains scoped by tenant and role;
feature flags control module access and are not a separate confidentiality boundary.
Legacy tenants without a subscription retain read/edit access but cannot add or
reactivate rooms before receiving a registered room allowance.
Plan changes are observed on each API request; client workspace refresh/reload gets
the new configuration. Quotas cover creation/reactivation and bulk room edits;
lowering a quota preserves existing data and blocks additions above the new limit.
Tenant suspension independently blocks writes.

Workspace includes `subscription` (effectiveActive, blockedReason, raw
planFeatures, and effectiveFeatures for module reads), effective `features` for
writes, and `quota:{rooms:{used,limit},users:{used,limit}}`.
Billing/Tenants read and write these endpoints and reread the accepted server state.
Amounts in subscription history are manually recorded, not payment-gateway receipts.

## Manager feature controls and Owner access overview

The finite feature codes are DASHBOARD, ROOM_DIAGRAM, RESERVATION_VIEW,
RESERVATION_CREATE, TAPE_CHART, ARI_MANAGEMENT, HOUSEKEEPING, POS_SALES, CASHBOOK,
REPORTS_BASIC, OTA_SYNC, REPORTS_ADVANCED, INVENTORY_WAREHOUSE, MULTI_CURRENCY,
VOUCHER_PROMO and API_EXTERNAL. Commercial plans support additional codes; a feature flag
does not indicate that a future module has been implemented.

- GET `/api/features` is available to both system roles. It returns
  `{features:[{id,code,name,description,category,minPlan,enabledGlobal}],
  tenantFeatureOverrides:{tenantId:{code:override}}}`. minPlan is FREE/PRO.
  An absent global-control row means enabledGlobal=true.
- PATCH `/api/features/<code>` is SUPER_ADMIN only, accepts exactly
  `{enabledGlobal:boolean}` and returns `{feature:metadata}`. A global disable
  takes precedence over every plan and tenant grant.
- PUT `/api/tenants/<id>/feature-overrides/<code>` is available to both system
  roles. It accepts `{enabled:boolean,isTrial?:boolean,expiresAt?:timestamp|null,
  notes?:string}` and returns `{featureOverride:override}`. Defaults: isTrial=false,
  expiresAt=null and notes="". Timestamps require a timezone; notes are at most
  1000 characters. Trial grants require enabled=true and an expiry. An expiry in
  the past is stored but has no effect. Unknown fields/invalid values return 422;
  unknown feature/tenant returns 404.
- DELETE the same override URL returns `{ok:true}`, including an absent override;
  the tenant resumes its plan setting, subject to global controls.
- GET `/api/tenants/<id>/feature-overrides` is for that tenant's Owner or a system
  role, returning `{features:{code:boolean},featureOverrides:{code:override}}`.
  The feature map represents current write access; owners cannot mutate grants.

Override entries contain `{enabled,isTrial,expiresAt,notes,grantedBy,grantedAt}`;
grantedBy is the granting user's current display name. Resolution starts with the
plan (legacy tenants without a subscription default enabled), applies unexpired
tenant overrides, then global disables. Overrides cannot revive a suspended tenant
or an inactive/expired/future/cancelled subscription. Such tenants retain reads
provided by the plan, while the workspace write feature map is entirely false.
The frontend checks `subscription.effectiveFeatures` before module access and
separately blocks writes on subscription expiry; raw planFeatures remain available
to Billing. Role checks still apply when a grant enables a module.

Migration `0012_manager_features` adds `feature_controls` and
`tenant_feature_overrides` with FORCE RLS. Only Super Admin can write global
controls; only system roles can write overrides. Owners read only their hotel's
overrides. Mutations emit `feature.updated`, `feature_override.upserted` or
`feature_override.deleted` audit events in the same transaction. Downgrade refuses
to discard stored controls or grants. Run `python manage.py db upgrade` with the
target environment's migration URL before serving this code; no production
database URL is committed.

## BE-10 inventory

Tenant prefix `/api/tenants/<tenant_id>/inventory`; Owner/Accountant actions
`inventory.view` / `inventory.write`, feature `INVENTORY_WAREHOUSE`. RLS applies
to every row. Documents/movements are immutable; mutations have audit and require
`Idempotency-Key` (except catalog/recipe configuration).

- GET `/masters`: `{warehouses,itemCategories,items,suppliers,openingLocked,serviceStockLinks}`.
- POST/PATCH `/masters/<catalog>`; PATCH includes `id` in body. All references are tenant-scoped.
- POST `/documents`: `{kind,date,warehouseId,toWarehouseId?,supplierId?,note?,lines}`;
  kind `opening|receipt|issue|transfer|count`; lines
  `{itemId,quantity,unitCost?,warehouseId?,expectedVersion?}`. Count quantity is
  absolute and requires a matching stock version.
- GET `/documents?kind=&warehouseId=&start=&end=&page=&pageSize=` and `/documents/<id>`.
- POST `/documents/<id>/reverse`: `{reason}` creates compensating movements.
- GET `/stock?warehouseId=&start=&end=`: stock quantities, costs, low-stock flags
  and reconciliation. Dates inclusive; period closing is separate from current balance.
- POST `/service-stock-links`: `{serviceId,warehouseId,active,lines:[{itemId,quantity}]}`.
- POST `/pos/<invoice_id>/returns`: `{reason,lines:[{movementId,quantity}]}`;
  physical returns cannot exceed original unreturned consumption.

Opening is tenant-wide and one-time; use count corrections after opening locks.
Posting dates cannot exceed hotel today or precede the latest stock document.
Quantity/unit cost use 4 decimals; cost values use 8. Weighted average valuation,
transfers and reversals conserve value. Issues cannot produce negative stock.
Only configured POS recipes consume stock; insufficient stock rolls back the
invoice. Cancellation restores original quantities/costs. Money refunds alone
do not return goods. All stock writes commit with the shared idempotency journal.

## BE-11 pricing and FX

GET tenant `/pricing` returns `{rules,vouchers,promotions,exchangeRates,baseCurrency,businessDate}`.
POST/PATCH `/pricing/rules|vouchers|promotions` use `settings.write`; PATCH body
includes `id`. Voucher/promotion features require `VOUCHER_PROMO`; exchange rates
require `MULTI_CURRENCY`.

- Rule: `{name,kind:weekend|los,roomTypeId?,priority,adjustmentPercent,weekdays,minNights,maxNights?,active}`.
  ISO weekdays Monday=1..Sunday=7. Daily override wins; otherwise highest priority
  eligible rule wins, ascending ID for ties.
- Promotion: `{name,kind:earlybird|lastminute|staypay,percent,minDaysBefore,maxDaysBefore?,minNights,stayN,payM,startDate?,endDate?,active}`.
  Stay window half-open. Stay/pay makes the cheapest eligible nights free per
  room. One largest eligible discount wins; no stacking.
- Voucher: `{name,code,discountType:percent|fixed,value,minNights,minTotal,validFrom?,validTo?,usageLimit?,active}`.
  Validity uses hotel booking date; validTo exclusive. Fixed values/minimum total
  are base currency. Explicit voucher replaces promotions. Quota consumed atomically
  only on booking creation (including zero-value redemption); cancellation does
  not restore usage. Quote never reserves quota.
- PUT `/pricing/exchange-rates`: `{currency:VND|USD,rate}`; one foreign unit equals
  rate hotel-base units (positive, 8 decimals).
- POST `/quote` and `/reservations` accept additional `{currency?,voucherCode?}`.
  Missing currency defaults to VND for direct hotel bookings; guest nationality
  does not choose a currency. The client direct-booking form displays VND read-only.
  OTA imports keep the currency and amounts supplied by Channex (currently VND/USD).
  Different base currency requires a configured FX rate; no conversion rate is invented.
  Discounted nightly rates plus `pricingSnapshot,baseCurrency,exchangeRate,baseAmount`
  are saved by server at creation.

Old bookings retain applied policies/FX. CONFIRMED room/date changes reprice at
current FX and retain the original voucher policy and old payments; no second
redemption. Financial rows expose original money and frozen base money. Refunds
reuse payment FX; final refund conserves the remaining base amount. Cash reversals
reuse original FX. Funds have fixed currency after ledger history; payments and
transfers require matching currency. Transfers do not perform currency exchange.
Legacy financial rows retain original currency/rate 1; no historic FX is invented.

Channex is selected for BE-12. BE-10/11 make no live OTA requests.

## BE-12: Channex

Manager remote views require `SYSTEM_MANAGER` or `SUPER_ADMIN`; inactive or unknown
users fail closed. They use an explicit server-side `accountId` for every request.
No automatic credential/environment fallback, hotel creation, mapping changes,
booking import/ACK, or ARI publication happens from these views.

- GET `/api/admin/channex/accounts`: `{accounts:[{id,label,environment,configured,errorCode}]}`.
  Optional `system:staging`/`system:production` sources read backend runtime
  `CHANNEX_MANAGER_API_KEY_STAGING`/`CHANNEX_MANAGER_API_KEY_PRODUCTION`.
  Existing `hotel:<tenantId>` connections use their saved encrypted or legacy
  credentials, including paused connections. Listing sources makes no provider call.
  Keys, environment variable references, ciphertext, and private provider fields are never returned.
- GET `/api/admin/channex/properties?accountId=&page=1`:
  `{environment,properties,pagination:{page,pageSize:25,totalItems,totalPages}}`.
  Fetches real Channex `/properties` with title ascending order, page and limit 25.
  Each property is `{id,name,currency,timezone,city,country,linkedHotel}`;
  `linkedHotel` is null or `{tenantId,name}` from a local property/environment match.
  Properties not linked to LOHA remain visible. Malformed or duplicate provider
  entities and inconsistent pagination fail without partial results. Page is a
  positive int32, matching the provider contract; supplied timezones must be valid IANA names.
- POST `/api/admin/channex/properties`:
  `{accountId,name,currency,timezone,country?,city?,address?,email?,phone?}`.
  Requires a system role and CSRF; only `system:staging` or `system:production`
  sources may create. Name is 1–255 characters, currency is `VND`/`USD`, timezone
  is a valid IANA name; country is two uppercase letters, city/address at most
  255 characters, email at most 254 and phone at most 32. Blank optional fields
  are omitted. The backend creates `property_type=hotel` in the Channex user's
  default group, returning 201 `{environment,property}` with the safe property DTO
  above and `linkedHotel:null`. It does not create a PMS hotel, link it, or publish
  inventory. Audit contains only the Property ID and environment. Creation is
  never retried automatically; reload/reconcile the list after an uncertain result.
  Upstream contract: [Create Property API](https://docs.channex.io/api-v.1-documentation/hotels-collection/create-property-api).
- GET `/api/admin/channex/properties/<property_id>/catalog?accountId=`:
  `{environment,property,roomTypes,ratePlans}`. The requested property is verified
  using the selected key. Rooms expose `{id,name,countOfRooms,adults,children,infants,mapped}`;
  missing counts/occupancy are null. Rates expose
  `{id,name,roomTypeId,currency,sellMode,rateMode,supported,rate,editable}`. All plans remain visible;
  support is calculated against the remote property's currency. The existing
  hotel mapping/catalog rules and response stay unchanged. Lists are bounded at 100 each.
  `rate` is the primary option's default price as a decimal string, or null when
  unavailable. `editable` permits a simple manual/per-room single primary option;
  complex, inherited, and provider read-only plans remain readable.
- GET `/api/admin/channex/properties/<property_id>/bookings?accountId=&page=1`:
  paginated latest remote bookings, including acknowledged history. The response
  allowlists display name, reference, source, dates, original amount/currency,
  room count and creation time. Contact details, cards, guarantees and notes are omitted.
  This endpoint never imports or acknowledges bookings.
- GET `/api/admin/channex/properties/<property_id>/inventory?accountId=&start=&end=`:
  inclusive `YYYY-MM-DD` range, at most 31 days. Returns dates, room availability,
  and rate/stop-sell matrices. IDs must belong to this property/catalog and dates
  must stay in the requested range. Missing/null values mean unknown, not zero.
  This endpoint never publishes inventory or rates.
- GET `/api/admin/channex/properties/<property_id>/channels?accountId=&page=1`:
  `{channels,pagination}` with safe channel identity, title, code, active status,
  nullable currency, unique mapped-rate count and property count. Counts describe
  the whole channel; a channel can serve several properties. Provider settings,
  credentials and actions are omitted. This endpoint never changes channel mappings.
  Native channel setup uses the separate mutation endpoints below.
- POST `/api/admin/channex/properties/<property_id>/room-types` and PATCH
  `/api/admin/channex/properties/<property_id>/room-types/<room_type_id>`:
  exact `{accountId,name,countOfRooms,adults,children,infants}` body. Name is 1–255
  characters, room count 1–10000, adults 1–50 and children/infants 0–50, all integers.
  Return `{roomType}` with the catalog room DTO, 201/200. Creates standard rooms
  with default occupancy equal to adults; updates preserve the existing default
  occupancy unless new adults require a reduction. No force/kind/capacity edits.
  Any saved LOHA mapping protects counts/occupancy; changing the name is allowed.
- POST `/api/admin/channex/properties/<property_id>/rate-plans`:
  exact `{accountId,name,roomTypeId,currency,rate}` body, returns `{ratePlan}` (201).
  Currency is uppercase three-letter code; rate is a nonnegative decimal string
  with at most 15 integer digits and four decimals. Creates manual/per-room,
  non-inherited rates with one primary adult occupancy option for the verified room.
- PATCH `/api/admin/channex/properties/<property_id>/rate-plans/<rate_plan_id>`:
  exact `{accountId,name,rate}` body, returns `{ratePlan}` (200). Property, room,
  currency and calculation modes cannot be changed. Complex options are not overwritten.
  Pending LOHA close-outs block edits; linked room IDs and hotel currency are validated.

Native catalog writes require CSRF and system authorization, verify remote property/resource
ownership, and use the existing linked-tenant lock to serialize with PMS mutations
and workers. Audit records contain identifiers/environment only. No deletes,
automatic retries or idempotency guarantee are provided;
reload the catalog after an uncertain response before submitting again. Default
rate edits do not publish daily ARI. Channex initializes new-room availability
to zero; daily inventory/rates still need their separate synchronization flow.

### Native OTA channel setup

All endpoints use the verified property prefix
`/api/admin/channex/properties/<property_id>`, require a system role and explicit
account source. Writes also require CSRF. Connection settings are allowlisted by
the actual adapter's descriptor; hidden fields cannot be submitted. Passwords,
tokens, private defaults and unknown settings never cross the API boundary.
Stored secrets are represented only by field names in `secrets`; blank edit
passwords preserve their stored value. Unknown advanced settings and unmentioned
mappings are merged server-side, since Channex replaces these objects wholesale.

- GET `/channel-adapters?accountId=` returns `{adapters,unavailableAdapters,groups,rateOptions}`.
  Descriptors contain `{code,name,kind,propertyMapping,mappingMode,oauth,fields,mappingFields}`.
  Only OTA descriptors are included. Unsupported OTA descriptors appear in
  `unavailableAdapters:[{code,name}]` without settings or defaults, and are disabled
  in the UI; they do not block other valid adapters. Malformed/duplicate public
  identifiers still fail the list. Individual adapter/probe/write requests retain
  full descriptor validation and reject unsupported schemas.
  Fields contain `{key,label,type,position,secret,options,rules,default?}`. Options
  are strings; conditional hidden rules contain `{apply,when,influenceField,withValue}`.
  Groups come only from the verified property's `relationships.groups`; options
  contain `{id,name,roomTypeId,occupancy}` from that property's validated catalog.
- GET `/channel-adapters/<code>?accountId=` returns `{adapter}`.
- GET `/channels/<channel_id>?accountId=` returns `{channel,adapter,rateOptions}`.
  Channel adds `{revision,editable,settings,secrets,mappings}` to the safe summary;
  mappings contain `{id,ratePlanId,settings,secrets}`. A channel spanning multiple
  properties is read-only (`editable=false`). `revision` is an opaque server HMAC
  of its current contents; stale writes return 409, including after external edits.
- POST `/channel-probe/<action>` with `{accountId,code,settings,channelId?,revision?}`.
  Action is `test_connection`, `connection_details` or `mapping_details`.
  Existing credentials are reused only after checking the channel and revision.
  Test returns `{success,message}`, connection details `{currency,available}`,
  mapping details `{rooms,pricingType,listings}`. OTA error bodies/settings are omitted.
  Rooms/rates expose only identifiers, names, occupancy and pricing/read-only metadata.
- POST `/channels` with `{accountId,code,name,groupId,settings,mappings}` creates
  one **inactive** connection and returns `{channel}` (201). Group and rate plan IDs
  must belong to the selected property. Mapping entries are `{ratePlanId,settings}`.
- PATCH `/channels/<channel_id>` with `{accountId,revision,name?,settings?,mappings?}`.
  Only rename is allowed while active. Mapping edits use `{id?,ratePlanId,settings}`;
  an existing ID is scoped to this channel and cannot change its rate plan. Omitted
  rows survive; `{id,ratePlanId,settings:null}` explicitly removes one mapping.
  Changing public connection fields while any mapping remains returns 409 to
  prevent old mappings being reused with a different OTA hotel/account. Secret
  rotation is allowed; explicitly removing all mappings in the same request also
  permits changing the public connection fields.
  Airbnb settings/mappings use its dedicated flow below instead of this bulk update.
- POST `/channels/<channel_id>/readiness` with `{accountId,revision}` returns
  `{ready,issues}`. Issue messages are local, never raw provider descriptions.
- POST `/channels/<channel_id>/activate` or `/deactivate` with
  `{accountId,revision,confirm:true}` returns `{channel}` after reloading actual state.
  Activation performs a readiness check first and starts full inventory/rate sync.
  Deactivation stops data exchange and **does not close OTA sales**; the provider may
  schedule deletion in 30 days. Airbnb requires its listing mappings removed first.
- DELETE `/channels/<channel_id>` with `{accountId,revision,confirm:true}` returns
  `{deleted:true}`. Only inactive, single-property connections can be removed.
  Removing a channel permanently removes its mappings/events; received bookings remain.

Explicit asynchronous provider responses return HTTP 202 `{pending:true,message}`
instead of claiming completion. Reload before sending another write; these APIs
do not automatically retry uncertain creates or provide a provider idempotency key.
Provider writes can race with a change made directly on Channex after the last read;
reload/reconcile before editing again. Property updates and deletion are not implemented.

Airbnb uses the official owner authorization and dedicated listing mapping APIs:

- POST `/airbnb/connection-link` with `{accountId,name,returnOrigin,groupId?,channelId?}`
  returns `{url,expiresIn}`. New links require a group; reconnect derives it from
  the verified channel. The return origin must be the caller's allowed LOHA origin.
- POST `/api/admin/channex/airbnb/confirm` with `{channelId,token}` validates the
  session-bound, signed OAuth state and returns `{accountId,propertyId,property,channel}`.
- GET `/channels/<channel_id>/airbnb/listings?accountId=` returns `{listings}`.
- POST `/channels/<channel_id>/airbnb/mappings` with
  `{accountId,revision,listingId,ratePlanId}` adds a listing to an inactive channel.
- DELETE `/channels/<channel_id>/airbnb/mappings/<mapping_id>` with
  `{accountId,revision,confirm:true}` explicitly unmaps a listing, including while
  active so the channel can be deactivated. Both return `{channel,status}` where
  status is `pending` or `completed`. OAuth credentials remain inside Channex/backend.

Provider requests follow the official [properties collection](https://docs.channex.io/api-v.1-documentation/hotels-collection/get-list-of-properties-api),
[room types](https://docs.channex.io/api-v.1-documentation/room-types-collection/get-list-of-room-types-api),
[room mutations](https://docs.channex.io/api-v.1-documentation/room-types-collection),
[rate plans](https://docs.channex.io/api-v.1-documentation/rate-plans-collection),
and [Channels API](https://docs.channex.io/api-v.1-documentation/channel-api) contracts.
Provider errors contain safe local messages; they never echo response bodies or keys.

GET `/api/admin/channex` requires `SYSTEM_MANAGER` or `SUPER_ADMIN` and returns
`{hotels:[{tenantId,name,city,roomCount,status,connection,mappingCount,closingCount,roomTypeCount,latestJob}]}`.
This roster uses local database aggregates only; no provider calls. `roomCount` is
active physical rooms; `roomTypeCount` is active local room types. `mappingCount`
counts active mappings to active local room types without a pending pause;
`closingCount` counts all pending pauses, including inactive local room types.
`connection` is null or `{environment,propertyId,active,credentialsConfigured,credentialError,credentialSource,verifiedAt,webhookRegistered}`.
`latestJob` is null or `{kind,status,errorCode,createdAt}`. References, secret values,
ciphertext, job payloads and customer notes are excluded. Tenant IDs match tenant routes.

Tenant prefix `/api/tenants/<tenant_id>/channels`:

- GET `/`: connection, mappings, active local room types and latest 50 jobs.
  Top-level `credentialStorageAvailable` and `webhookRegistrationAvailable` describe
  shared server setup. Connection adds `credentialSource` (`encrypted|environment`),
  `verifiedAt`, `credentialError`, `credentialsConfigured`, `webhookConfigured`
  (secret readiness) and `webhookRegistered` (last successful registration).
  Secret values/ciphertext are never returned. Legacy reference names remain available.
- GET `/catalog`: `{roomTypes:[{id,name}],ratePlans:[{id,name,roomTypeId,currency,supported}]}`.
  Loads credentials server-side and requests only the saved property's room types and
  rate plans. A configured paused connection can still load options for editing unused
  mappings. Names come from provider titles. `supported` uses the same predicate as
  ARI publication: per-room/manual, tenant currency and no inherited rate. Unsupported
  plans remain visible. Malformed, duplicate or cross-property resources fail the whole
  request; rate plans must belong to a returned room type. Catalogs are limited to 100
  resources of each kind; a larger catalog returns 422 `channel_catalog_too_large`.
  Missing configuration returns 409; unreadable/missing credentials return 503;
  invalid provider responses return 502 and retryable provider failures return 503.
- PUT `/config`: `{environment:staging|production,propertyId,active,apiKey?}`.
  System managers may instead submit the exact `{accountId,propertyId,active}`
  shape to link a property from `system:staging`, `system:production`, or the
  target hotel's own `hotel:<tenant_id>` source. Server credentials are verified
  and encrypted per hotel without being returned to the browser. Hotel sources
  cannot be reused for another hotel or property. Tenant permissions, feature
  entitlements, CSRF, property uniqueness and history protection still apply.
  A supplied key is verified against GET `/properties/{propertyId}` before saving
  tenant/property/environment-bound Fernet ciphertext with a generated webhook
  secret. Only status is returned. Blank/omitted key preserves the current source
  for the same target; a new target requires a key. Re-enabling verifies again;
  pausing works without decryption/provider availability. Property/environment
  cannot change after any channel history, including webhook setup jobs.
  Shared `CHANNEX_ENCRYPTION_KEY` is required for new encrypted storage. Corrupt
  ciphertext or an unavailable/wrong master key fails closed without env fallback.
  The exact legacy shape `{environment,propertyId,credentialRef,webhookSecretRef,active}`
  remains supported; references must match server-generated tenant names. Mixed
  legacy/new shapes are rejected. A legacy request cannot replace encrypted secrets.
- PUT `/mappings`: `{roomTypeId,channexRoomTypeId,channexRatePlanId,active}`.
  One local room type maps to one remote room type/manual rate plan. Mapping responses
  add `targetLocked` (remote identifiers protected) and `pauseRequested` (closing sales).
  Webhook jobs and empty booking polls do not lock unused mappings. Before ARI writes,
  the worker durably records each mapping's use and date windows; successful booking
  imports also record use. Protected mappings reject identifier changes with 409.
  Setting `active:false` on a used active mapping queues internal `pause_mapping`
  work and returns `active:true,pauseRequested:true` until closing succeeds. The worker
  sends availability zero and stop-sell on recorded windows plus the rolling baseline,
  then returns `active:false,pauseRequested:false`. Failed closing stays pending and
  supports normal job retry. Repeated pause requests are idempotent; re-enable while
  pending returns 409. After closing, the same identifiers may be re-enabled. Paused
  used mappings still resolve incoming booking revisions. Migration `0018` conservatively
  protects legacy ARI history because it lacks per-mapping publication records.
- POST `/jobs`: `{kind:push_ari,start,end}` or `{kind:pull_bookings}`; returns 202.
  Manual booking pulls retry failed revision/ACK jobs still present in the feed;
  scheduled polls and webhook replays do not reset terminal failures. Committed
  revision receipts retry only ACK, without importing the booking again.
  Job responses include nullable `revisionId`; a successful feed job means the
  feed was scanned and follow-up work queued, not that import/ACK has completed.
  ARI uses a half-open window of at most 31 days. Booking/catalog changes enqueue
  ARI within the same database transaction; the worker sends a fresh snapshot.
  The worker also polls booking feed every minute and schedules a daily 366-day
  baseline in 31-day jobs. ARI prices use base/DailyRate, not PMS LOS/promotions.
  Migration `0023_channel_ari_pacing` persists a per-connection ARI cooldown:
  `push_ari` and `pause_mapping` attempts are spaced by at least 7 seconds, with
  at least 60 seconds after retryable failures (or longer job backoff). Booking
  reads and ACKs remain eligible during this cooldown. Worker polling interval
  can make the delay longer. Apply the migration before starting the new code.
- POST `/jobs/<id>/retry`: `{}`; retries failed work, retaining its history row.

Read requires `channels.view` (owner/front desk); changes require
`channels.write` (owner). Both require `OTA_SYNC`. Worker execution rechecks the
actor, membership, tenant status and subscription before using credentials.
API origin is fixed to Channex staging/production; redirects are refused.
Deactivating the connection pauses work; it does not close sales on remote OTAs.

With a trusted global HTTPS origin `CHANNEX_WEBHOOK_BASE_URL`, an active encrypted
save with a supplied key or re-enable queues internal `setup_webhook` work (empty
payload). The worker reconciles only the exact callback URL/property, creates or
updates a property-level `booking` webhook with `send_data=false` and its encrypted
secret header, then records registration success. Retries adopt an existing match
instead of creating duplicates; ambiguous matches/overlarge catalogs fail safely.
This job is not accepted through POST `/jobs`; failed setup can use normal retry.
Without the optional public origin, polling remains available. API and workers
must share the same stable encryption key and callback origin.

POST `/api/channex/webhooks/<tenant_id>` requires the configured
`X-Channex-Webhook-Secret` and matching property. It queues work and never trusts
webhook prices/guest data as an authoritative booking. The worker fetches booking
revisions, saves the reservation/receipt and an ACK job atomically, then processes
the ACK after commit. Repeated revisions cannot create a second reservation.

Provider bookings need complete nightly prices, mapped rooms, supported currency
and available physical rooms. Unsupported extras, ambiguous order and changes to
settled/in-house stays remain unacknowledged for operator review. OTA prepaid flags
do not create local payments. PMS LOS/promotions/vouchers are not translated into
unsupported OTA rate rules. This implementation requires Channex sandbox acceptance
with real property mappings before live activation.

Retryable failures remain `queued` until their retry budget is exhausted. These
attempts retain audit/history/log entries without sending an `OTA_SYNC_ERROR`
notification; terminal failures still notify. Existing notifications are retained.
Safe worker diagnostics include upstream `http_status` or a bounded transport
`cause`; provider response bodies, credentials and guest data are not logged.

Contracts: [booking revisions](https://docs.channex.io/api-v.1-documentation/bookings-collection),
[ARI](https://docs.channex.io/api-v.1-documentation/ari),
[rate limits](https://docs.channex.io/api-v.1-documentation/rate-limits),
[webhook authentication](https://docs.channex.io/api-v.1-documentation/webhook-collection).

## BE-12: in-app notifications

Tenant prefix `/api/tenants/<tenant_id>/notifications`:

- GET `/`: `{items,unreadCount,nextBefore}`. Query `limit` 1–100 (default 50),
  `unread=true|false`, `before=<opaque nextBefore>`; use URL encoding for the cursor.
  Each item has `id,eventCode,title,body,entityType,entityId,createdAt,readAt`.
  Timestamps are ISO UTC; count covers this user's unread inbox, independent of page.
- POST `/<id>/read`, POST `/read-all`: idempotent read marking for the current user.
- GET `/preferences`: `{events,availableRoles}`; each event exposes code/name,
  priority, recipient roles and the supported `in_app` channel.
- PATCH `/preferences`: `{events:[{code,roles:[...]}]}`; owner only. An empty roles
  list selects no recipients. Settings apply to future events.

Notifications share the business transaction and reference its audit record.
Rollback emits no notification. Default recipients are active hotel members with
the configured roles; inactive users are excluded. RLS protects the recipient's
inbox as well as tenant boundaries. No guest contact/payment payload is copied into
the notification body. Email, external delivery webhooks and mobile push are not
enabled by this contract.

## Manager: customer profiles and account sessions

System roles (`SUPER_ADMIN`, `SYSTEM_MANAGER`) manage SaaS customers at
`/api/tenants`; hotel guest information is managed within tenant reservations.

- GET `/api/tenants`: `{tenants:[...]}`. Each tenant now adds `contactName`,
  `contactEmail`, `contactPhone`, `address`, `city`, `taxId`, `domain`,
  `customerNotes`, `rooms` (active physical rooms) and `createdAt` to the existing
  tenant fields. For older hotels, missing contact name/email fall back to an
  Owner's identity. Explicit empty values stay empty.
- POST `/api/tenants`: existing `name,status?,ownerName,ownerEmail,ownerPassword`
  plus optional contact fields above. Creates the hotel, Owner membership and
  private contact profile atomically. It does not assign a subscription.
- PATCH `/api/tenants/<id>`: nonempty subset of `name,status` and contact fields.
  Contact name/city <=160, email <=254, phone/tax ID <=40, address <=500,
  domain <=253, notes <=4000 characters. Values must be strings; empty strings
  clear optional fields. Email is normalized/validated; domain accepts a DNS
  hostname (not a URL). Storing it does not provision DNS, Tunnel or TLS.
- GET `/api/tenants/<id>/customer-history`: system roles only, including when
  the hotel is suspended. Same filtering, paging and response as tenant `/audit`;
  URL fixes the tenant and `tenantId` query is rejected. Global SaaS payment
  events are excluded; invoice details hold their payment history.
- Tenant `/users` continues its existing account contract: system roles may
  create hotel accounts and change membership role/active state, subject to
  quota, subscription, suspension and last-Owner guards. Contact email changes
  never change an Owner's login identity.

Profiles are stored in `tenant_client_profiles` with system-only FORCE RLS.
Private contacts/CRM notes are not added to hotel `/workspace`, auth session
tenant payloads, or audit details. Profile audits record changed field names.

Any authenticated user may operate on their own account:

- PATCH `/api/auth/profile`: `{name}` only, trimmed 1–160 characters;
  returns `{user}`. Email, role, ID and other fields cannot be changed here.
- GET `/api/auth/sessions`: `{sessions:[{current,createdAt,expiresAt}]}` for
  this user's unexpired sessions, newest first. No tokens or other users' rows.
- POST `/api/auth/sessions/revoke-others`: `{}` returns `{ok:true,revoked}`;
  preserves the current session and removes other sessions for this user.
- POST `/api/auth/change-password` retains its existing validated
  `{currentPassword,newPassword}` contract and revokes other sessions.

All writes require CSRF. Profile/session-revoke emit global audit events;
user locking serializes them with concurrent login. Session validity is rechecked
after the lock so a revoked request cannot change profile/password or revoke the
surviving session. No 2FA is implemented.

## Manager: SaaS invoices and system overview

All routes below require a system role. Hotel roles receive 403. Hotel revenue,
POS invoices and ledger are separate from SaaS software invoices/payments.

- GET `/api/billing/invoices?tenantId=&status=&start=&end=&page=&pageSize=`:
  `{invoices,pagination:{page,pageSize,totalItems}}`. Status is
  `unpaid|partial|paid|void`. Dates are `YYYY-MM-DD` UTC creation dates:
  start inclusive, end exclusive; end must follow start. Paging uses the
  existing finance limits; frontend requests 20 per page.
- POST `/api/billing/invoices`:
  `{tenantId,description,amount,currency,dueDate?}` returns the invoice (201).
  Description is required, <=500 characters; currency `VND|USD`; due date is
  `YYYY-MM-DD`. Positive money uses Decimal, up to 15 integer and 4 fractional
  digits. Use decimal strings to avoid precision loss. Requires `Idempotency-Key`:
  same key/actor/route/body replays the original invoice (201), including after
  a lost response; changed content with the same key returns 409. Invoice and
  private retry record are saved atomically.
- POST `/api/billing/invoices/<id>/payments`:
  `{amount,method:bank|cash,reference?,note?}` with required `Idempotency-Key`.
  Reference <=160, note <=1000. Returns updated invoice (201). Same key/actor/
  route/body replays the original result; different content returns 409.
  Invoice locking and database guards prevent concurrent overpayment or payment
  on a void invoice. This records a received payment; it does not transfer funds.
- POST `/api/billing/invoices/<id>/void`: `{reason}` (required, <=1000) returns
  updated invoice. Only wholly unpaid invoices can be voided. The row and reason
  remain in history; invoices/payments cannot be deleted or rewritten.

Invoice:
`{id,number,tenantId,tenantName,description,amount,currency,dueDate,status,paid,
balance,createdAt,voidedAt,voidReason,payments}`. Number displays `SAAS-000001`.
Payment: `{id,amount,method,reference,note,createdAt}`. Money is serialized as
decimal strings; void balance is zero. Dates/timestamps use ISO representation.

GET `/api/manager/overview?start=&end=` uses the same half-open UTC date range,
defaulting to the current month. Returns:
`{start,end,tenants:{total,active,suspended},users:{active},
plans:{FREE,PRO,...customCodes,unassigned},currencies,recentPayments}`.
Each currency entry has `{currency,invoiced,received,outstanding,overdue}`.
Invoiced/received reflect the selected period; current outstanding/overdue cover
all unvoided invoices. Due dates before today's UTC date are overdue. Currencies
are never summed together. Recent payments include invoice number, hotel name,
currency, amount and timestamp. Plan counts include only currently effective
subscriptions to active plans, including custom and archived plans still serving
existing subscribers; other hotels are unassigned.

`saas_invoices`, `saas_payments`, `saas_idempotency_records` have system-only FORCE
RLS. Payment records/cache are append-only. SaaS audit events have null tenant ID
and tenant reference in system-only details, so Owner audit reads cannot expose
software billing. Recording payment does not automatically grant/renew a plan;
subscription changes remain explicit at the existing subscription endpoint.

Migrations `0015_plan_room_limits` then `0016_room_type_codes` follow
`0014_manager_customers`. They preserve UUIDs and paid history; legacy finite
room allowances are retained and uncapped subscriptions register current active
room count (at least one). Review each hotel's actual room registration after upgrade.
Run `python manage.py db upgrade` using the target environment's
`DATABASE_MIGRATION_URL`, then check `/api/ready`. Downgrades refuse to discard
stored billing or customer records. No production migrations run automatically
from these feature changes.
