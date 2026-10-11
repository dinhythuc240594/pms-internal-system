---
type: "query"
date: "2026-10-03T07:57:10.232590+00:00"
question: "bây giờ kết nối postgresql local ok rồi giờ làm chức năng thôi liệt kê chức năng theo ưu tiên"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Planned SaaS PMS architecture", "Planned global and tenant RBAC", "PmsProvider()"]
---

# Q: bây giờ kết nối postgresql local ok rồi giờ làm chức năng thôi liệt kê chức năng theo ưu tiên

## Answer

Expanded via graph vocab: [auth, tenant, rbac, reservations, payment, housekeeping, reports, inventory, ari, plan]. Graph traversal found Planned SaaS PMS architecture, Planned global and tenant RBAC, Reservations(), Reports(), ARI(), Housekeeping(). Current source confirms backend has PostgreSQL configuration/health/baseline migration only; PMS frontend still persists demo workspace via localStorage. Prioritized BE-01 auth+tenant membership+RBAC/RLS+minimal audit; BE-02 masters/settings; BE-03 basic rates/availability; BE-04 guests/bookings/concurrency/checkin/basic housekeeping; BE-05 booking charges/deposits/payments/shared ledger/checkout. P1 POS cashbook, full housekeeping, basic reports, SaaS exactly two plans, warehouse. P2 advanced pricing/multicurrency and OTA/notifications/advanced reports/mobile. User two-plan requirement overrides sample plan tiers; names/entitlements remain open. Plan and task checklist saved tasks/plan.md and tasks/todo.md; no business implementation performed.

## Outcome

- Signal: useful

## Source Nodes

- Planned SaaS PMS architecture
- Planned global and tenant RBAC
- PmsProvider()