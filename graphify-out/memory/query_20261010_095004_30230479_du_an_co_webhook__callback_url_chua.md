---
type: "query"
date: "2026-10-10T09:50:04.508843+00:00"
question: "du an co webhook, callback url chua"
contributor: "graphify"
outcome: "corrected"
correction: "Current source has implemented Channex webhook; old graph describing integration as planned is stale. Use backend/pms_api/channels/routes.py and current API contract for webhook status."
source_nodes: ["Planned Channex-style Channel Manager integration"]
---

# Q: du an co webhook, callback url chua

## Answer

Expanded via graph vocabulary: channel provider payment. Graph contains Planned Channex-style Channel Manager integration but predates current code. Verified current backend has POST /api/channex/webhooks/<tenant_id> in backend/pms_api/channels/routes.py:274, registered in backend/pms_api/__init__.py:45. It authenticates X-Channex-Webhook-Secret, queues pull_bookings and returns 202. backend/README.md:234-256 documents required worker and provider configuration. No OAuth/payment callback route or callback URL config found in current backend/frontend source. Public deployment and live provider configuration were not checked.

## Outcome

- Signal: corrected
- Correction: Current source has implemented Channex webhook; old graph describing integration as planned is stale. Use backend/pms_api/channels/routes.py and current API contract for webhook status.

## Source Nodes

- Planned Channex-style Channel Manager integration