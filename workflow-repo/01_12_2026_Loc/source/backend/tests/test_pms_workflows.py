"""Acceptance scenarios traced to PMS-01..09 in the draw.io business flows."""

from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch
from zoneinfo import ZoneInfo

from pms_api.extensions import db
from pms_api.housekeeping.models import HousekeepingTask
from pms_api.security import set_context
from tests.domain_fixture import DomainTestCase
from tests.test_channels_integration import ChannelTestCase, revision


class PmsWorkflowTests(DomainTestCase):
    def setUp(self):
        super().setUp()
        self.today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()

    def booking(self, **changes):
        data = {
            "guest": "Khách kiểm thử",
            "rooms": ["101"],
            "sourceId": "direct-a",
            "checkIn": self.today.isoformat(),
            "checkOut": (self.today + timedelta(days=2)).isoformat(),
        }
        data.update(changes)
        response = self.request("POST", "/reservations", data)
        self.assertEqual(response.status_code, 201, response.json)
        return response.json

    def status(self, row, status, expected=200):
        response = self.request("POST", f"/reservations/{row['id']}/status", {"status": status})
        self.assertEqual(response.status_code, expected, response.json)
        return response

    def payment(self, row, amount, key="workflow-payment"):
        return self.request(
            "POST", f"/reservations/{row['id']}/payments",
            {"amount": amount, "methodId": "cash-a", "fundId": "fund-a"}, key=key,
        )

    def plan(self):
        response = self.request("POST", "/housekeeping/tasks", {"date": self.today.isoformat()})
        self.assertEqual(response.status_code, 201, response.json)
        return response.json["tasks"]

    def task_status(self, task, status, expected=200, **kwargs):
        response = self.request(
            "POST", f"/housekeeping/tasks/{task['id']}/status",
            {"status": status, "revision": task["revision"]}, **kwargs,
        )
        self.assertEqual(response.status_code, expected, response.json)
        return response.json

    def test_pms01_quote_does_not_hold_rooms_and_creation_does(self):
        data = {
            "rooms": ["101", "102"], "checkIn": self.today.isoformat(),
            "checkOut": (self.today + timedelta(days=2)).isoformat(),
        }
        quote = self.request("POST", "/quote", data)
        self.assertEqual(quote.status_code, 200, quote.json)
        self.assertEqual(self.request("GET", "/reservations").json["bookings"], [])
        row = self.booking(rooms=data["rooms"])
        self.assertEqual(Decimal(row["total"]), Decimal(quote.json["total"]))
        self.assertEqual(row["status"], "CONFIRMED")
        self.assertEqual(Decimal(row["paid"]), 0)
        self.assertEqual(len(row["nightlyRates"]), 4)
        conflict = self.request("POST", "/quote", data)
        self.assertEqual(conflict.status_code, 409, conflict.json)

    def test_pms02_cancel_releases_rooms_cancels_only_its_tasks_and_keeps_deposit(self):
        row = self.booking()
        other = self.booking(rooms=["102"])
        paid = self.payment(row, "50")
        self.assertEqual(paid.status_code, 201, paid.json)
        tasks = self.plan()
        self.assertTrue(any(task["bookingId"] == row["id"] for task in tasks))
        cancelled = self.status(row, "CANCELLED").json
        original_payment = paid.json["payments"][0]
        current_payment = cancelled["payments"][0]
        self.assertEqual(
            datetime.fromisoformat(current_payment["createdAt"]),
            datetime.fromisoformat(original_payment["createdAt"]),
        )
        self.assertEqual(
            {k: v for k, v in current_payment.items() if k != "createdAt"},
            {k: v for k, v in original_payment.items() if k != "createdAt"},
        )
        self.assertEqual(cancelled["nightlyRates"], row["nightlyRates"])
        tasks = self.request("GET", "/housekeeping/tasks").json["tasks"]
        self.assertTrue(all(t["status"] == "cancelled" for t in tasks if t["bookingId"] == row["id"]))
        self.assertTrue(any(t["status"] == "pending" for t in tasks if t["bookingId"] == other["id"]))
        self.booking()
        self.status(row, "IN_HOUSE", 409)

    def test_pms02_edit_replaces_planned_tasks_only_when_stay_changes(self):
        row = self.booking()
        task = next(t for t in self.plan() if t["bookingId"] == row["id"])
        contact = self.request("PATCH", f"/reservations/{row['id']}", {"phone": "0901234567"})
        self.assertEqual(contact.status_code, 200, contact.json)
        self.assertEqual(self.plan()[0]["revision"], task["revision"])
        moved = self.request("PATCH", f"/reservations/{row['id']}", {"rooms": ["102"]})
        self.assertEqual(moved.status_code, 200, moved.json)
        tasks = self.plan()
        self.assertEqual(next(t for t in tasks if t["id"] == task["id"])["status"], "cancelled")
        self.assertTrue(any(t["room"] == "102" and t["status"] == "pending" for t in tasks))

    def test_pms02_failed_edit_keeps_original_booking_and_tasks(self):
        row = self.booking()
        self.booking(rooms=["102"])
        before = self.plan()
        result = self.request("PATCH", f"/reservations/{row['id']}", {"rooms": ["102"]})
        self.assertEqual(result.status_code, 409, result.json)
        detail = self.request("GET", f"/reservations/{row['id']}").json
        self.assertEqual(detail["rooms"], ["101"])
        self.assertEqual(detail["nightlyRates"], row["nightlyRates"])
        self.assertEqual(self.request("GET", "/housekeeping/tasks").json["tasks"], before)

    def test_pms02_replanning_after_returning_to_original_room_keeps_task_history(self):
        row = self.booking()
        old_task = next(t for t in self.plan() if t["bookingId"] == row["id"])
        for room in ("102", "101"):
            moved = self.request("PATCH", f"/reservations/{row['id']}", {"rooms": [room]})
            self.assertEqual(moved.status_code, 200, moved.json)
            tasks = self.plan()
            self.assertTrue(any(t["room"] == room and t["status"] == "pending" for t in tasks))
        self.assertEqual(next(t for t in tasks if t["id"] == old_task["id"])["status"], "cancelled")
        self.assertEqual(len(tasks), len(self.plan()))

    def test_pms03_checkin_blocks_overdue_occupant_even_when_room_is_clean(self):
        previous_day = self.today - timedelta(days=1)
        old = self.booking(checkIn=previous_day.isoformat(), checkOut=self.today.isoformat())
        with patch("pms_api.bookings.application.datetime", wraps=datetime) as clock:
            clock.now.return_value = datetime.combine(previous_day, datetime.min.time(), ZoneInfo("Asia/Ho_Chi_Minh"))
            self.status(old, "IN_HOUSE")
        new = self.booking()
        tasks_before = self.plan()
        denied = self.status(new, "IN_HOUSE", 409)
        self.assertEqual(denied.json["error"]["code"], "room_occupied")
        self.assertEqual(self.request("GET", "/housekeeping/tasks").json["tasks"], tasks_before)
        paid = self.payment(old, old["total"])
        self.assertEqual(paid.status_code, 201, paid.json)
        self.status(old, "CHECKED_OUT")
        self.assertEqual(self.status(new, "IN_HOUSE", 409).json["error"]["code"], "room_not_ready")

    def test_pms03_checkin_checks_every_room_and_stay_date(self):
        row = self.booking(rooms=["101", "102"])
        dirty = self.request("POST", "/rooms/102/condition", {"condition": "dirty"})
        self.assertEqual(dirty.status_code, 200, dirty.json)
        self.assertEqual(self.status(row, "IN_HOUSE", 409).json["error"]["code"], "room_not_ready")
        self.assertEqual(self.request("GET", f"/reservations/{row['id']}").json["status"], "CONFIRMED")

    def test_pms04_housekeeper_submits_inspection_and_frontdesk_approves_clean(self):
        self.request("POST", "/rooms/101/condition", {"condition": "dirty"})
        task = next(t for t in self.plan() if t["room"] == "101")
        staff = self.request("POST", "/housekeeping/staff", {"name": "Nhân viên", "userId": "hk"})
        self.assertEqual(staff.status_code, 201, staff.json)
        assigned = self.request("POST", f"/housekeeping/tasks/{task['id']}/assign", {"staffId": staff.json["id"], "revision": task["revision"]})
        self.assertEqual(assigned.status_code, 200, assigned.json)
        hk, headers = self.login("hk@test.local")
        started = self.task_status(assigned.json, "in_progress", client=hk, headers=headers)
        self.task_status(assigned.json, "inspection", 409, client=hk, headers=headers)
        inspected = self.task_status(started, "inspection", client=hk, headers=headers)
        self.task_status(inspected, "completed", 403, client=hk, headers=headers)
        desk, headers = self.login("frontdesk@test.local")
        completed = self.task_status(inspected, "completed", client=desk, headers=headers)
        self.assertEqual(completed["status"], "completed")
        room = next(r for r in self.request("GET", "/workspace").json["rooms"] if r["id"] == "101")
        self.assertEqual(room["condition"], "clean")

    def test_pms05_service_charge_is_atomic_and_rejects_untrusted_types(self):
        row = self.booking()
        self.status(row, "IN_HOUSE")
        path = f"/reservations/{row['id']}/charges"
        data = {"serviceId": "service-a", "quantity": "2", "unitPrice": "20.1234"}
        charged = self.request("POST", path, data, key="workflow-service")
        self.assertEqual(charged.status_code, 201, charged.json)
        self.assertEqual(Decimal(charged.json["balance"]), Decimal(row["total"]) + Decimal("40.2468"))
        for index, kind in enumerate(([], {}, True, None)):
            invalid = self.request("POST", path, {**data, "type": kind}, key=f"invalid-type-{index}")
            self.assertEqual(invalid.status_code, 422, invalid.json)
        self.assertEqual(len(self.request("GET", f"/reservations/{row['id']}").json["charges"]), 1)

    def test_pms06_checkout_requires_zero_balance_and_dirties_all_rooms_once(self):
        row = self.booking(rooms=["101", "102"])
        self.status(row, "IN_HOUSE")
        self.assertEqual(self.status(row, "CHECKED_OUT", 409).json["error"]["code"], "unpaid_balance")
        self.assertEqual(self.payment(row, row["total"]).status_code, 201)
        checked = self.status(row, "CHECKED_OUT").json
        self.assertEqual(Decimal(checked["balance"]), 0)
        self.status(row, "CHECKED_OUT", 409)
        workspace = self.request("GET", "/workspace").json
        self.assertTrue(all(r["condition"] == "dirty" for r in workspace["rooms"]))
        self.assertEqual(sum(t["kind"] == "checkout" for t in workspace["housekeepingTasks"]), 2)
        self.assertEqual(checked["nightlyRates"], row["nightlyRates"])

    def test_pms07_deposit_replay_cancel_and_refund_do_not_duplicate_ledger(self):
        row = self.booking()
        paid = self.payment(row, "50")
        self.assertEqual(paid.status_code, 201, paid.json)
        self.assertEqual(self.payment(row, "50").json, paid.json)
        self.assertEqual(self.payment(row, "51").status_code, 409)
        self.status(row, "CANCELLED")
        path = f"/reservations/{row['id']}/payments/{paid.json['payments'][0]['id']}/refund"
        refund = self.request("POST", path, {"amount": "50", "reason": "Hoàn cọc"}, key="workflow-refund")
        self.assertEqual(refund.status_code, 201, refund.json)
        self.assertEqual(Decimal(refund.json["paid"]), 0)
        ledger = self.request("GET", "/workspace").json["ledger"]
        self.assertEqual(len(ledger), 2)
        self.assertEqual(sum(Decimal(e["amount"]) for e in ledger), 0)

    def test_pms09_reports_exclude_cancelled_forecast_and_keep_actual_cash(self):
        row = self.booking()
        paid = self.payment(row, "50")
        self.assertEqual(paid.status_code, 201, paid.json)
        self.status(row, "CANCELLED")
        query = f"?start={row['checkIn']}&end={row['checkOut']}&currency=VND"
        revenue = self.request("GET", "/reports/revenue" + query)
        self.assertEqual(revenue.status_code, 200, revenue.json)
        self.assertEqual(sum(Decimal(r["amount"]) for r in revenue.json["rows"]), 0)
        finance = self.request("GET", "/reports/financial" + query)
        self.assertEqual(finance.status_code, 200, finance.json)
        self.assertEqual(Decimal(finance.json["summary"]["cashReceived"]), 50)
        hk, headers = self.login("hk@test.local")
        self.assertEqual(self.request("GET", "/reports/financial" + query, client=hk, headers=headers).status_code, 403)
        self.assertEqual(self.request("GET", f"/api/tenants/{self.other_tenant_id}/reports/revenue" + query).status_code, 403)


class PmsOtaWorkflowTests(ChannelTestCase):
    def plan_for_ota(self):
        response = self.request("POST", "/housekeeping/tasks", {"date": "2030-01-01"})
        self.assertEqual(response.status_code, 201, response.json)
        return response.json["tasks"]

    def test_pms08_provider_cancellation_cancels_work_before_ack(self):
        row = self.import_booking()[0]
        self.assertEqual(self.run_jobs(), 1)  # ACK the first committed revision.
        tasks = self.plan_for_ota()
        self.assertTrue(any(t["bookingId"] == row["id"] for t in tasks))
        self.import_booking(revision(11, "cancelled"))
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            self.assertTrue(all(db.session.get(HousekeepingTask, t["id"]).status == "cancelled" for t in tasks))
        self.assertEqual(self.local_bookings()[0]["status"], "CANCELLED")

    def test_pms08_contact_revision_preserves_the_room_already_assigned(self):
        row = self.import_booking()[0]
        self.assertEqual(self.run_jobs(), 1)
        moved = self.request("PATCH", f"/reservations/{row['id']}", {"rooms": ["102"]})
        self.assertEqual(moved.status_code, 200, moved.json)
        self.clear_push_jobs()
        tasks = self.plan_for_ota()
        self.import_booking(revision(11, "modified"))
        self.assertEqual(self.provider.revision.call_count, 2)
        detail = self.request("GET", f"/reservations/{row['id']}").json
        self.assertEqual(detail["rooms"], ["102"])
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            self.assertTrue(all(db.session.get(HousekeepingTask, t["id"]).status == "pending" for t in tasks))

    def test_pms08_provider_stay_change_invalidates_tasks_but_contact_change_does_not(self):
        self.import_booking()
        self.assertEqual(self.run_jobs(), 1)
        tasks = self.plan_for_ota()
        self.import_booking(revision(11, "modified"))
        self.assertEqual(self.provider.revision.call_count, 2)
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            self.assertTrue(all(db.session.get(HousekeepingTask, t["id"]).status == "pending" for t in tasks))
        self.assertEqual(self.run_jobs(), 1)
        change = revision(12, "modified", end="2030-01-04", amount="300")
        change["attributes"]["rooms"][0]["days"]["2030-01-03"] = "100"
        self.import_booking(change)
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            self.assertTrue(all(db.session.get(HousekeepingTask, t["id"]).status == "cancelled" for t in tasks))
