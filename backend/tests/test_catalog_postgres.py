from datetime import date
from decimal import Decimal

from sqlalchemy import select

from pms_api.catalog.models import PhysicalRoom, RoomTypeAvailability
from pms_api.catalog.routes import adjust_inventory, lock_inventory
from pms_api.extensions import db
from pms_api.security import set_context
from tests.domain_fixture import DomainTestCase


class CatalogPostgresTests(DomainTestCase):
    def test_fund_type_is_validated_and_cannot_reclassify_existing_ledger(self):
        cash = self.request("post", "/masters/funds", json={"name": "Default cash"})
        self.assertEqual(cash.status_code, 201, cash.json)
        self.assertEqual(cash.json["type"], "cash")
        bank = self.request("post", "/masters/funds", json={"name": "Bank", "type": "bank"})
        self.assertEqual(bank.status_code, 201, bank.json)
        invalid = self.request("post", "/masters/funds", json={"name": "Bad", "type": "other"})
        self.assertEqual(invalid.status_code, 422, invalid.json)
        booking = self.make_booking()
        paid = self.request(
            "post",
            f"/reservations/{booking['id']}/payments",
            json={"amount": "20", "methodId": "cash-a", "fundId": "fund-a"},
            key="fund-history-proof",
        )
        self.assertEqual(paid.status_code, 201, paid.json)
        changed = self.request("patch", "/masters/funds", json={"id": "fund-a", "type": "bank"})
        self.assertEqual(changed.status_code, 409, changed.json)
        self.assertEqual(changed.json["error"]["code"], "FUND_HAS_HISTORY")
        renamed = self.request(
            "patch", "/masters/funds", json={"id": "fund-a", "name": "Renamed cash"}
        )
        self.assertEqual(renamed.status_code, 200, renamed.json)
        self.assertEqual(renamed.json["type"], "cash")

    def make_booking(self):
        result = self.request(
            "post",
            "/reservations",
            json={
                "guest": "Guest",
                "phone": "0900123456",
                "room": "101",
                "source": "Direct",
                "checkIn": "2026-11-01",
                "checkOut": "2026-11-03",
            },
        )
        self.assertEqual(result.status_code, 201, result.json)
        return result.json

    def test_occupied_rooms_cannot_be_removed_or_blocked_and_adjacent_stays_are_allowed(self):
        self.make_booking()
        blocked = self.request(
            "post",
            "/room-blocks",
            json={"room": "101", "start": "2026-11-02", "end": "2026-11-03", "reason": "Repair"},
        )
        self.assertEqual(blocked.status_code, 409, blocked.json)
        removed = self.request(
            "patch", "/masters/roomTypes", json={"id": "rt-a", "roomNumbers": ["102"]}
        )
        self.assertEqual(removed.status_code, 409, removed.json)
        occupied = self.request(
            "post",
            "/quote",
            json={"rooms": ["101"], "checkIn": "2026-11-02", "checkOut": "2026-11-03"},
        )
        self.assertEqual(occupied.status_code, 409)
        adjacent = self.request(
            "post",
            "/quote",
            json={"rooms": ["101"], "checkIn": "2026-11-03", "checkOut": "2026-11-04"},
        )
        self.assertEqual(adjacent.status_code, 200, adjacent.json)

    def test_rates_and_master_deactivation_preserve_booking_snapshot(self):
        booking = self.make_booking()
        changed = self.request(
            "put",
            "/rates",
            json={"roomTypeId": "rt-a", "start": "2026-11-01", "end": "2026-11-03", "price": "999"},
        )
        self.assertEqual(changed.status_code, 200)
        toggled = self.request("post", "/masters/bookingSources/direct-a/toggle")
        self.assertEqual(toggled.status_code, 200)
        detail = self.request("get", f"/reservations/{booking['id']}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(Decimal(detail.json["total"]), Decimal("200"))
        self.assertEqual(detail.json["source"], "Direct")
        currency = self.request("patch", "/settings", json={"currency": "USD"})
        self.assertEqual(currency.status_code, 409)

    def test_composite_foreign_key_rejects_cross_tenant_room_type_even_for_runtime_sql(self):
        from sqlalchemy.exc import IntegrityError

        with self.app.app_context():
            set_context(tenant_id=self.tenant_id, user_id=self.owner_id)
            db.session.add(
                PhysicalRoom(
                    id="invalid-cross-reference",
                    tenant_id=self.tenant_id,
                    room_type_id="rt-b",
                    number="999",
                )
            )
            with self.assertRaises(IntegrityError) as caught:
                db.session.flush()
            self.assertEqual(caught.exception.orig.sqlstate, "23503")
            db.session.rollback()

    def test_nightly_quote_applies_overrides_and_half_open_checkout(self):
        saved = self.request(
            "put",
            "/rates",
            json={
                "roomTypeId": "rt-a",
                "start": "2026-11-01",
                "end": "2026-11-02",
                "price": "150.1250",
                "stopSell": False,
            },
        )
        self.assertEqual(saved.status_code, 200, saved.json)
        result = self.request(
            "post",
            "/quote",
            json={"rooms": ["101", "102"], "checkIn": "2026-11-01", "checkOut": "2026-11-03"},
        )
        self.assertEqual(result.status_code, 200, result.json)
        self.assertEqual(Decimal(result.json["total"]), Decimal("500.2500"))
        self.assertEqual(len(result.json["nightlyRates"]), 4)
        self.assertNotIn("2026-11-03", [row["date"] for row in result.json["nightlyRates"]])

    def test_stop_sell_and_room_block_change_real_availability(self):
        blocked = self.request(
            "post",
            "/room-blocks",
            json={"room": "101", "start": "2026-11-01", "end": "2026-11-03", "reason": "Repair"},
        )
        self.assertEqual(blocked.status_code, 201, blocked.json)
        availability = self.request("get", "/availability?start=2026-11-01&end=2026-11-03")
        self.assertEqual([row["available"] for row in availability.json["availability"]], [1, 1])
        quote = self.request(
            "post",
            "/quote",
            json={"rooms": ["101"], "checkIn": "2026-11-01", "checkOut": "2026-11-03"},
        )
        self.assertEqual(quote.status_code, 409)
        self.assertEqual(quote.json["error"]["code"], "ROOM_BLOCKED")
        self.assertEqual(
            self.request("delete", f"/room-blocks/{blocked.json['id']}").status_code, 200
        )
        saved = self.request(
            "put",
            "/rates",
            json={
                "roomTypeId": "rt-a",
                "start": "2026-11-01",
                "end": "2026-11-02",
                "stopSell": True,
            },
        )
        self.assertEqual(saved.status_code, 200)
        quote = self.request(
            "post",
            "/quote",
            json={"rooms": ["101"], "checkIn": "2026-11-01", "checkOut": "2026-11-02"},
        )
        self.assertEqual(quote.json["error"]["code"], "STOP_SELL")

    def test_removing_room_deactivates_instead_of_deleting(self):
        result = self.request(
            "patch",
            "/masters/roomTypes",
            json={"id": "rt-a", "name": "Standard", "roomNumbers": ["101"]},
        )
        self.assertEqual(result.status_code, 200, result.json)
        with self.app.app_context():
            set_context(tenant_id=self.tenant_id, user_id=self.owner_id)
            room = db.session.scalar(select(PhysicalRoom).where(PhysicalRoom.id == "room-a-102"))
            self.assertIsNotNone(room)
            self.assertFalse(room.active)
            db.session.rollback()

    def test_inventory_enforces_counts_under_transactional_locks(self):
        with self.app.app_context():
            set_context(tenant_id=self.tenant_id, user_id=self.owner_id)
            locked = lock_inventory(self.tenant_id, ["rt-a"], "2026-11-01", "2026-11-02")
            self.assertEqual(locked[("rt-a", date(2026, 11, 1))].total_rooms, 2)
            adjust_inventory(self.tenant_id, ["rt-a"], "2026-11-01", "2026-11-02", {"rt-a": 2})
            db.session.commit()
            set_context(tenant_id=self.tenant_id, user_id=self.owner_id)
            row = db.session.scalar(
                select(RoomTypeAvailability).where(RoomTypeAvailability.room_type_id == "rt-a")
            )
            self.assertEqual(row.booked_rooms, 2)
            from pms_api.security import ApiError

            with self.assertRaises(ApiError):
                adjust_inventory(self.tenant_id, ["rt-a"], "2026-11-01", "2026-11-02", 1)
            db.session.rollback()

    def test_tenant_and_role_permissions_cover_catalog_mutations(self):
        crossed = self.request(
            "put",
            "/rates",
            json={"roomTypeId": "rt-b", "start": "2026-11-01", "end": "2026-11-02", "price": "1"},
        )
        self.assertEqual(crossed.status_code, 404)
        client, headers = self.login("frontdesk@test.local")
        denied = self.request(
            "post",
            "/masters/services",
            json={"name": "X", "price": "1"},
            client=client,
            headers=headers,
        )
        self.assertEqual(denied.status_code, 403)
        with self.app.app_context():
            set_context(tenant_id=self.tenant_id, user_id=self.owner_id)
            self.assertEqual(len(list(db.session.scalars(select(PhysicalRoom)))), 2)
            db.session.rollback()
