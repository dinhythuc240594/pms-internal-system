---
type: "query"
date: "2026-10-09T09:14:44.711180+00:00"
question: "Role Manager da day du chuc nang chua, dang thieu quan ly khach hang?"
contributor: "graphify"
outcome: "corrected"
correction: "Use current source; old graph paths and mock UI links do not prove backend completeness."
source_nodes: ["AdminTenants()", "AdminBilling()", "ManagerSidebar.jsx"]
---

# Q: Role Manager da day du chuc nang chua, dang thieu quan ly khach hang?

## Answer

Expanded via graph vocab: manager tenant admin billing user role. Graph dated 2026-10-02 is stale. Verified current source: Manager supports tenants list/create/suspend, subscriptions/renewal/history, feature overrides. Tenant PATCH accepts name/status only; owner fields used during create are not returned as contact fields. No separate SaaS customer/CRM entity or contact edit workflow. Guest management exists independently at /id/guests with persistent GET/POST/PATCH APIs but neither sidebar links there. Booking create lacks existing guest selection, so repeat guests can duplicate. Review only, no implementation or production verification.

## Outcome

- Signal: corrected
- Correction: Use current source; old graph paths and mock UI links do not prove backend completeness.

## Source Nodes

- AdminTenants()
- AdminBilling()
- ManagerSidebar.jsx