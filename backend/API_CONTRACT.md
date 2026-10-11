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
RoomType `{id,name,price:decimal-string,capacity,active}`.
masters include roomTypes, bookingSources, services, paymentMethods, funds.
Funds have `type:cash|bank` (default cash); type changes are rejected after ledger history.
Other existing settings catalog names may use Master but do not fake advanced inventory.
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

Booking: `bookings/models.py`, `bookings/routes.py`, `0004_booking.py`.
Imports catalog/core exports above. Implements guests CRUD, reservations CRUD and
cancel/checkin/checkout, clean/dirty/maintenance, charges/services, payments/refunds,
notes/history and immutable nightly prices; multiple rooms/guests; money Decimal.
Booking JSON existing aliases `{id,guest,phone,room,source,checkIn,checkOut,total,status}`
plus `{rooms:[number],guests:[{id,name,phone,email}],nightlyRates,charges,payments,
notes,history,paid,balance,currency}`. POST/PATCH `/reservations` (PATCH /<id>) accepts
old single room/guest and multiroom `rooms`/`guests`. Source accepts master ID or name.
Guest objects with existing `id` and supplied profile fields update within the same
reservation transaction. Failure rolls back both the profile and booking edit.
Unchanged historical sources remain editable after source rename/deactivation.
POST `/reservations/<id>/status` `{status}`; POST `/rooms/<number>/condition` `{condition}`.
GET/POST/PATCH `/guests[/<id>]`; POST `/reservations/<id>/charges`,
POST `/reservations/<id>/payments`, POST `/reservations/<id>/payments/<payment_id>/refund`,
POST `/reservations/<id>/notes`; GET `/reservations/<id>` detail.
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
Settings, Users, Rates, Guests, admin tenants real API. Multiroom occupancy affects
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
serialized as decimal strings with four fractional digits. No FX conversion.

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
- POST `/cash-documents` with `{type,amount,fundId,description,currency?,toFundId?,date?}`.
  Types: receipt, expense, withdrawal, transfer, opening. Transfer requires two
  different funds and posts equal opposite ledger entries. Only opening accepts
  a date; it must be no later than today and before existing fund history.
  One opening document per fund/currency, including after reversal.
- POST `/cash-documents/<id>/reverse` with `{reason}` appends one linked reversal.
  Original documents/ledger remain immutable. Insufficient current funds returns
  409 and rolls back the entire operation.
- GET `/cashbook?startDate=&endDate=&fundId=&fundType=&actorId=&currency=&page=&pageSize=`
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

## BE-07: Housekeeping assignments and inspection

`housekeeping/{models,routes}.py` exports `housekeeping_snapshot`,
`guard_room_condition`, `invalidate_room_tasks` and `checkout_task`.
All routes below are relative to `/housekeeping` within the tenant prefix.

- GET/POST `/staff`; PATCH `/staff/<id>` with `{name,phone?,userId?,active?}`.
  A linked account must be an active HOUSEKEEPING member of the same tenant.
- GET `/shifts?date=&staffId=`; POST `/shifts`; PATCH `/shifts/<id>` with
  `{staffId,date,startTime,endTime,note?,active?}`. Times are HH:mm, same day,
  start before end. Active shifts for one staff member cannot overlap.
- GET `/tasks?date=` returns scoped work; POST `/tasks` with
  `{date}` generates arrival/departure/stayover/dirty tasks without duplicates.
  Checkout creates its task atomically without requiring plan generation.
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

## BE-09: Plans, subscriptions and quotas

GET `/api/plans` is for system roles. POST and PATCH `/api/plans/<id>` are Super
Admin only. The commercial codes are FREE/PRO. Plan fields are
`{code,name,price,priceYear,currency,maxRooms,maxUsers,features,active}`; code is
immutable, features is a boolean object, nullable limits are positive integers.
Free has zero monthly/yearly price and at most 30 active rooms/five active accounts.

System roles may GET/PUT `/api/tenants/<id>/subscription` and GET its `/history`.
PUT accepts `{planId,status,startDate?,endDate?,amount?,currency?,cycle?}`. Dates
must include a timezone; end must follow start; active PRO needs a future end.
Cycle is monthly/yearly. Omit amount for configuration changes; a supplied amount
must be a finite nonnegative exact decimal and its currency must match the plan.
Subscription and append-only history commit atomically. History snapshots plan
name/code, previous plan, amount, currency, cycle, dates, status and actor, with
actions created/changed_plan/renewed/changed_status/updated. History lists the latest
200 entries, newest first; editing plan metadata does not rewrite these snapshots.

Subscription/history have tenant RLS with system access. Tenant writes take the
tenant lock before subscription/plan locks, also used by renewal and quota checks.
Inactive, cancelled, future or expired subscriptions block tenant writes but retain
existing read access. Explicit feature=false blocks the corresponding module APIs
for reads and writes. Workspace aggregation remains scoped by tenant and role;
feature flags control module access and are not a separate confidentiality boundary.
Legacy tenants without a subscription retain access until explicitly assigned one.
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
VOUCHER_PROMO and API_EXTERNAL. Commercial plans remain FREE/PRO; a feature flag
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

Tenant prefix `/api/tenants/<tenant_id>/channels`:

- GET `/`: connection, expected server environment variable names, mappings,
  active local room types and latest 50 jobs. Secret values are never returned.
- PUT `/config`: `{environment:staging|production,propertyId,credentialRef,webhookSecretRef,active}`.
  References must match the server-generated names for this tenant; another
  hotel's secret reference is rejected. Property/environment cannot change after history.
- PUT `/mappings`: `{roomTypeId,channexRoomTypeId,channexRatePlanId,active}`.
  One local room type maps to one remote room type/manual rate plan. Used mappings
  cannot change remote identifiers or be disabled after channel history.
- POST `/jobs`: `{kind:push_ari,start,end}` or `{kind:pull_bookings}`; returns 202.
  ARI uses a half-open window of at most 31 days. Booking/catalog changes enqueue
  ARI within the same database transaction; the worker sends a fresh snapshot.
  The worker also polls booking feed every minute and schedules a daily 366-day
  baseline in 31-day jobs. ARI prices use base/DailyRate, not PMS LOS/promotions.
- POST `/jobs/<id>/retry`: `{}`; retries failed work, retaining its history row.

Read requires `channels.view` (owner/front desk); changes require
`channels.write` (owner). Both require `OTA_SYNC`. Worker execution rechecks the
actor, membership, tenant status and subscription before using credentials.
API origin is fixed to Channex staging/production; redirects are refused.
Deactivating the connection pauses work; it does not close sales on remote OTAs.

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

Contracts: [booking revisions](https://docs.channex.io/api-v.1-documentation/bookings-collection),
[ARI](https://docs.channex.io/api-v.1-documentation/ari),
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
`/api/tenants`; hotel guests remain at tenant `/guests`.

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
plans:{FREE,PRO,unassigned},currencies,recentPayments}`.
Each currency entry has `{currency,invoiced,received,outstanding,overdue}`.
Invoiced/received reflect the selected period; current outstanding/overdue cover
all unvoided invoices. Due dates before today's UTC date are overdue. Currencies
are never summed together. Recent payments include invoice number, hotel name,
currency, amount and timestamp. Plan counts include only currently effective
subscriptions to active FREE/PRO plans; other hotels are unassigned.

`saas_invoices`, `saas_payments`, `saas_idempotency_records` have system-only FORCE
RLS. Payment records/cache are append-only. SaaS audit events have null tenant ID
and tenant reference in system-only details, so Owner audit reads cannot expose
software billing. Recording payment does not automatically grant/renew a plan;
subscription changes remain explicit at the existing subscription endpoint.

Migrations `0013_manager_billing` then `0014_manager_customers` are additive.
Run `python manage.py db upgrade` using the target environment's
`DATABASE_MIGRATION_URL`, then check `/api/ready`. Downgrades refuse to discard
stored billing or customer records. No production migrations run automatically
from these feature changes.
