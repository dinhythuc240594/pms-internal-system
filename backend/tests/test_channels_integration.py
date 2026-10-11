"""Real PostgreSQL boundaries, with a mocked Channex transport only."""

import os
from copy import deepcopy
from datetime import timedelta
from unittest.mock import Mock, patch
from uuid import UUID

from sqlalchemy import create_engine, delete, func, select, text
from sqlalchemy.exc import SQLAlchemyError

from pms_api.bookings.models import Reservation, ReservationNight
from pms_api.channels.client import ProviderError
from pms_api.channels.models import ChannelJob, ChannelRevision
from pms_api.channels.routes import expected_refs
from pms_api.channels.service import process_jobs
from pms_api.core_models import Plan, Tenant, TenantUser, utcnow
from pms_api.extensions import db
from pms_api.security import set_context
from tests.domain_fixture import DomainTestCase

PROPERTY, REMOTE_ROOM, REMOTE_RATE, BOOKING = [str(UUID(int=i)) for i in range(1, 5)]


def revision(
    number=10,
    status="new",
    *,
    booking_id=BOOKING,
    amount="200",
    start="2030-01-01",
    end="2030-01-03",
):
    return {
        "id": str(UUID(int=number)),
        "type": "booking_revision",
        "attributes": {
            "booking_id": booking_id,
            "property_id": PROPERTY,
            "status": status,
            "inserted_at": f"2026-10-07T00:00:{number:02d}Z",
            "arrival_date": start,
            "departure_date": end,
            "currency": "VND",
            "amount": amount,
            "ota_name": "BookingCom",
            "payment_collect": "ota",
            "customer": {
                "name": "Fixture",
                "surname": "Guest",
                "phone": "0123",
                "mail": "guest@test.local",
            },
            "guarantee": {"card_number": "fixture-sensitive-card", "cvv": "private"},
            "services": [],
            "rooms": [
                {
                    "room_type_id": REMOTE_ROOM,
                    "rate_plan_id": REMOTE_RATE,
                    "checkin_date": start,
                    "checkout_date": end,
                    "amount": amount,
                    "occupancy": {"adults": 2, "children": 0, "infants": 0},
                    "services": [],
                    "days": {"2030-01-01": "100", "2030-01-02": "100"},
                }
            ],
        },
    }


class ChannelIntegrationTests(DomainTestCase):
    def setUp(self):
        super().setUp()
        credential, webhook = expected_refs(self.tenant_id)
        self.env = patch.dict(
            os.environ,
            {credential: "fixture-api-key", webhook: "fixture-webhook-secret-32-characters"},
        )
        self.env.start()
        self.addCleanup(self.env.stop)
        self.config = {
            "environment": "staging",
            "propertyId": PROPERTY,
            "credentialRef": credential,
            "webhookSecretRef": webhook,
            "active": False,
        }
        result = self.request("put", "/channels/config", json=self.config)
        self.assertEqual(result.status_code, 200, result.json)
        result = self.request(
            "put",
            "/channels/mappings",
            json={
                "roomTypeId": "rt-a",
                "channexRoomTypeId": REMOTE_ROOM,
                "channexRatePlanId": REMOTE_RATE,
                "active": True,
            },
        )
        self.assertEqual(result.status_code, 200, result.json)
        self.config["active"] = True
        self.assertEqual(self.request("put", "/channels/config", json=self.config).status_code, 200)
        self.clear_push_jobs()
        self.provider = Mock()
        self.provider.feed.return_value = []
        self.provider.catalog.side_effect = self.catalog
        self.patch_provider = patch(
            "pms_api.channels.service.ChannexClient", return_value=self.provider
        )
        self.patch_provider.start()
        self.addCleanup(self.patch_provider.stop)

    def catalog(self, resource, property_id):
        self.assertEqual(property_id, PROPERTY)
        if resource == "room_types":
            return [
                {
                    "id": REMOTE_ROOM,
                    "attributes": {},
                    "relationships": {"property": {"data": {"id": PROPERTY}}},
                }
            ]
        return [
            {
                "id": REMOTE_RATE,
                "attributes": {
                    "sell_mode": "per_room",
                    "rate_mode": "manual",
                    "currency": "VND",
                    "inherit_rate": False,
                },
                "relationships": {
                    "property": {"data": {"id": PROPERTY}},
                    "room_type": {"data": {"id": REMOTE_ROOM}},
                },
            }
        ]

    def clear_push_jobs(self):
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            db.session.execute(
                delete(ChannelJob).where(
                    ChannelJob.tenant_id == self.tenant_id, ChannelJob.kind == "push_ari"
                )
            )
            db.session.commit()

    def run_jobs(self, limit=1):
        with self.app.app_context():
            return process_jobs(self.tenant_id, limit)

    def enqueue_revision(self, entity):
        self.provider.revision.return_value = deepcopy(entity)
        body = {
            "event": "booking",
            "property_id": PROPERTY,
            "payload": {"property_id": PROPERTY, "revision_id": entity["id"]},
        }
        response = self.client.post(
            f"/api/channex/webhooks/{self.tenant_id}",
            json=body,
            headers={"X-Channex-Webhook-Secret": "fixture-webhook-secret-32-characters"},
        )
        self.assertEqual(response.status_code, 202, response.json)
        return body

    def import_booking(self, entity=None):
        entity = entity or revision()
        self.enqueue_revision(entity)
        self.assertEqual(self.run_jobs(), 1)
        self.clear_push_jobs()
        return self.local_bookings()

    def local_bookings(self):
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            return [
                {
                    "id": r.id,
                    "status": r.status,
                    "snapshot": r.pricing_snapshot,
                    "start": r.check_in.isoformat(),
                    "end": r.check_out.isoformat(),
                }
                for r in db.session.scalars(
                    select(Reservation).where(Reservation.tenant_id == self.tenant_id)
                )
            ]

    def jobs(self):
        return self.request("get", "/channels").json["jobs"]

    def test_configuration_does_not_expose_credentials_and_ref_is_tenant_bound(self):
        response = self.request("get", "/channels")
        self.assertTrue(response.json["connection"]["credentialsConfigured"])
        self.assertNotIn("fixture-api-key", response.get_data(as_text=True))
        self.assertNotIn("fixture-webhook-secret", response.get_data(as_text=True))
        wrong = {**self.config, "credentialRef": expected_refs(self.other_tenant_id)[0]}
        self.assertEqual(self.request("put", "/channels/config", json=wrong).status_code, 422)
        wrong = {**self.config, "apiKey": "should-not-be-accepted"}
        self.assertEqual(self.request("put", "/channels/config", json=wrong).status_code, 422)

    def test_roles_csrf_and_cross_tenant(self):
        desk, csrf = self.login("frontdesk@test.local")
        self.assertEqual(
            self.request("get", "/channels", client=desk, headers=csrf).status_code, 200
        )
        self.assertEqual(
            self.request(
                "put", "/channels/config", json=self.config, client=desk, headers=csrf
            ).status_code,
            403,
        )
        self.assertEqual(
            self.request("put", "/channels/config", json=self.config, headers={}).status_code, 403
        )
        other, csrf = self.login("owner-b@test.local")
        self.assertEqual(
            self.request("get", "/channels", client=other, headers=csrf).status_code, 403
        )

    def test_spoofed_webhook_rejected_and_replay_is_idempotent(self):
        body = self.enqueue_revision(revision())
        path = f"/api/channex/webhooks/{self.tenant_id}"
        self.assertEqual(self.client.post(path, json=body).status_code, 401)
        replay = self.client.post(
            path,
            json=body,
            headers={"X-Channex-Webhook-Secret": "fixture-webhook-secret-32-characters"},
        )
        self.assertEqual(replay.status_code, 202)
        self.assertEqual(len(self.jobs()), 1)
        body["property_id"] = str(UUID(int=99))
        self.assertEqual(
            self.client.post(
                path,
                json=body,
                headers={"X-Channex-Webhook-Secret": "fixture-webhook-secret-32-characters"},
            ).status_code,
            422,
        )
        self.provider.revision.assert_not_called()

    def test_feed_enqueues_revisions_and_ack_observes_committed_receipt(self):
        self.provider.feed.return_value = [revision()]
        self.provider.revision.return_value = revision()
        response = self.request("post", "/channels/jobs", json={"kind": "pull_bookings"})
        self.assertEqual(response.status_code, 202)
        self.run_jobs()
        self.assertEqual(self.local_bookings(), [])
        self.provider.ack.assert_not_called()
        self.run_jobs()
        self.assertEqual(len(self.local_bookings()), 1)
        self.provider.ack.assert_not_called()
        self.clear_push_jobs()

        def ack(revision_id):
            engine = create_engine(self.app.config["SQLALCHEMY_DATABASE_URI"], hide_parameters=True)
            try:
                with engine.begin() as connection:
                    connection.execute(
                        text("SELECT set_config('app.tenant_id',:tenant,true)"),
                        {"tenant": self.tenant_id},
                    )
                    count = connection.scalar(
                        text(
                            "SELECT count(*) FROM channel_revisions WHERE tenant_id=:tenant AND revision_id=:revision"
                        ),
                        {"tenant": self.tenant_id, "revision": revision_id},
                    )
                    self.assertEqual(
                        count, 1, "ACK must observe a previously committed transaction"
                    )
            finally:
                engine.dispose()

        self.provider.ack.side_effect = ack
        self.run_jobs()
        self.provider.ack.assert_called_once_with(revision()["id"])

    def test_duplicate_revision_no_duplicate_booking_or_card_storage(self):
        self.import_booking()
        self.enqueue_revision(revision())
        self.run_jobs(5)
        self.assertEqual(len(self.local_bookings()), 1)
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            self.assertEqual(
                db.session.scalar(select(func.count()).select_from(ChannelRevision)), 1
            )
            from pms_api.bookings.models import Payment

            self.assertEqual(db.session.scalar(select(func.count()).select_from(Payment)), 0)
        response = self.request("get", "/channels").get_data(as_text=True)
        self.assertNotIn("fixture-sensitive-card", response)
        self.assertNotIn("guarantee", str(self.local_bookings()))

    def test_unmapped_or_overbooked_revision_never_acknowledged(self):
        entity = revision()
        entity["attributes"]["rooms"][0]["room_type_id"] = str(UUID(int=999))
        self.import_booking(entity)
        self.assertEqual(self.local_bookings(), [])
        self.assertEqual(self.jobs()[0]["errorCode"], "booking_unmapped")
        self.provider.ack.assert_not_called()
        booking = self.request(
            "post",
            "/reservations",
            json={
                "guest": "Full hotel",
                "rooms": ["101", "102"],
                "checkIn": "2030-01-01",
                "checkOut": "2030-01-03",
                "source": "Direct",
            },
        )
        self.assertEqual(booking.status_code, 201, booking.json)
        self.clear_push_jobs()
        self.import_booking(revision(11))
        self.assertEqual(len(self.local_bookings()), 1)
        self.assertEqual(
            next(
                j
                for j in self.jobs()
                if j["kind"] == "pull_bookings" and j["errorCode"] == "room_unavailable"
            )["status"],
            "failed",
        )
        self.provider.ack.assert_not_called()

    def test_modify_and_cancel_release_inventory_without_invented_money(self):
        self.import_booking()
        self.run_jobs()
        modified = revision(11, "modified", amount="150")
        modified["attributes"]["rooms"][0]["days"] = {"2030-01-01": "75", "2030-01-02": "75"}
        self.import_booking(modified)
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            self.assertEqual(db.session.scalar(select(func.sum(ReservationNight.price))), 150)
        self.run_jobs()
        self.import_booking(revision(12, "cancelled"))
        self.assertEqual(self.local_bookings()[0]["status"], "CANCELLED")
        replacement = self.request(
            "post",
            "/reservations",
            json={
                "guest": "Released inventory",
                "rooms": ["101", "102"],
                "checkIn": "2030-01-01",
                "checkOut": "2030-01-03",
                "source": "Direct",
            },
        )
        self.assertEqual(replacement.status_code, 201, replacement.json)

    def test_stale_revision_acknowledged_without_reverting_booking(self):
        self.import_booking(revision(11))
        self.run_jobs()
        self.import_booking(revision(10, "cancelled"))
        self.assertEqual(self.local_bookings()[0]["status"], "CONFIRMED")
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            self.assertEqual(
                db.session.scalar(
                    select(ChannelRevision.outcome).where(
                        ChannelRevision.revision_id == revision()["id"]
                    )
                ),
                "stale",
            )
        self.run_jobs()
        self.assertEqual(self.provider.ack.call_count, 2)

    def test_amount_mismatch_and_in_house_edit_need_review(self):
        entity = revision(amount="250")
        self.import_booking(entity)
        self.assertEqual(self.jobs()[0]["errorCode"], "booking_amount_mismatch")
        self.assertEqual(self.local_bookings(), [])
        self.import_booking(revision(11))
        self.run_jobs()
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            row = db.session.scalar(select(Reservation))
            row.status = "IN_HOUSE"
            db.session.commit()
        self.import_booking(revision(12, "modified"))
        self.assertEqual(self.local_bookings()[0]["status"], "IN_HOUSE")
        self.assertTrue(any(j["errorCode"] == "booking_requires_review" for j in self.jobs()))

    def test_ack_retry_does_not_reimport_booking(self):
        self.import_booking()
        self.provider.ack.side_effect = ProviderError("provider_unavailable", True)
        self.run_jobs()
        failed = next(j for j in self.jobs() if j["kind"] == "ack_revision")
        self.assertEqual((failed["status"], failed["attempts"]), ("queued", 1))
        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            job = db.session.get(ChannelJob, failed["id"])
            job.available_at = utcnow() - timedelta(seconds=1)
            db.session.commit()
        self.provider.ack.side_effect = None
        self.run_jobs()
        self.assertEqual(len(self.local_bookings()), 1)
        self.assertEqual(self.provider.revision.call_count, 1)
        self.assertEqual(self.provider.ack.call_count, 2)

    def test_worker_rechecks_owner_feature_and_tenant_status(self):
        for blocked, code in (
            ("membership", "channel_actor_revoked"),
            ("feature", "feature_disabled"),
            ("tenant", "tenant_suspended"),
        ):
            with self.subTest(blocked=blocked):
                self.request("post", "/channels/jobs", json={"kind": "pull_bookings"})
                with self.app.app_context():
                    set_context(self.owner_id, self.tenant_id)
                    member = db.session.scalar(
                        select(TenantUser).where(
                            TenantUser.user_id == self.owner_id,
                            TenantUser.tenant_id == self.tenant_id,
                        )
                    )
                    plan, tenant = (
                        db.session.get(Plan, "default-pro"),
                        db.session.get(Tenant, self.tenant_id),
                    )
                    member.active, plan.features, tenant.status = (
                        blocked != "membership",
                        {"OTA_SYNC": blocked != "feature"},
                        "suspended" if blocked == "tenant" else "active",
                    )
                    db.session.commit()
                self.run_jobs()
                with self.app.app_context():
                    set_context(self.owner_id, self.tenant_id)
                    self.assertTrue(
                        db.session.scalar(
                            select(ChannelJob.id).where(ChannelJob.error_code == code)
                        )
                    )
                    member = db.session.scalar(
                        select(TenantUser).where(
                            TenantUser.user_id == self.owner_id,
                            TenantUser.tenant_id == self.tenant_id,
                        )
                    )
                    member.active = True
                    db.session.get(Plan, "default-pro").features = {}
                    db.session.get(Tenant, self.tenant_id).status = "active"
                    db.session.commit()
        self.provider.feed.assert_not_called()

    def test_ari_snapshot_uses_rates_inventory_and_cli(self):
        booking = self.request(
            "post",
            "/reservations",
            json={
                "guest": "Booked one",
                "rooms": ["101"],
                "checkIn": "2030-01-01",
                "checkOut": "2030-01-03",
                "source": "Direct",
            },
        )
        self.assertEqual(booking.status_code, 201, booking.json)
        self.clear_push_jobs()
        rates = self.request(
            "put",
            "/rates",
            json={
                "roomTypeId": "rt-a",
                "start": "2030-01-01",
                "end": "2030-01-03",
                "price": "150",
                "stopSell": False,
            },
        )
        self.assertEqual(rates.status_code, 200, rates.json)
        self.assertEqual(len(self.jobs()), 1, "rates mutation must enqueue in its transaction")
        job_id = self.jobs()[0]["id"]
        result = self.app.test_cli_runner().invoke(
            args=["process-channel-jobs", "--tenant", self.tenant_id, "--limit", "1"]
        )
        self.assertEqual(result.exit_code, 0, result.output)
        self.assertEqual(next(j for j in self.jobs() if j["id"] == job_id)["status"], "succeeded")
        self.assertEqual(self.provider.push_availability.call_args.args[0][0]["availability"], 1)
        self.assertEqual(self.provider.push_restrictions.call_args.args[0][0]["rate"], "150.0000")

    def test_unsupported_rate_plan_and_partial_provider_failure_are_visible(self):
        def per_person(resource, property_id):
            data = self.catalog(resource, property_id)
            if resource == "rate_plans":
                data[0]["attributes"]["sell_mode"] = "per_person"
            return data

        self.provider.catalog.side_effect = per_person
        self.request(
            "post",
            "/channels/jobs",
            json={"kind": "push_ari", "start": "2030-01-01", "end": "2030-01-03"},
        )
        self.run_jobs()
        self.assertEqual(self.jobs()[0]["errorCode"], "channel_rate_plan_unsupported")
        self.provider.push_availability.assert_not_called()
        self.provider.catalog.side_effect = self.catalog
        self.provider.push_restrictions.side_effect = ProviderError("provider_rejected")
        failed_id = self.jobs()[0]["id"]
        self.assertEqual(
            self.request("post", f"/channels/jobs/{failed_id}/retry", json={}).status_code, 202
        )
        self.run_jobs()
        self.assertEqual(self.jobs()[0]["errorCode"], "provider_rejected")
        self.provider.push_availability.assert_called_once()

    def test_job_date_bounds_and_unknown_fields_rejected(self):
        for body in (
            {"kind": "push_ari", "start": "2030-01-01", "end": "2030-02-02"},
            {"kind": "pull_bookings", "apiKey": "x"},
            {"kind": "ack_revision"},
        ):
            self.assertEqual(self.request("post", "/channels/jobs", json=body).status_code, 422)

    def test_untrusted_json_types_rejected_without_server_error(self):
        for value in ([], {}, True):
            self.assertEqual(
                self.request(
                    "put", "/channels/config", json={**self.config, "environment": value}
                ).status_code,
                422,
            )
            self.assertEqual(
                self.request("post", "/channels/jobs", json={"kind": value}).status_code, 422
            )
            body = {"event": value, "property_id": PROPERTY}
            self.assertEqual(
                self.client.post(
                    f"/api/channex/webhooks/{self.tenant_id}",
                    json=body,
                    headers={"X-Channex-Webhook-Secret": "fixture-webhook-secret-32-characters"},
                ).status_code,
                422,
            )
        for field in ("status", "currency", "payment_collect"):
            entity = revision(13)
            entity["attributes"][field] = {}
            from pms_api.channels.importer import normalize
            from pms_api.security import ApiError

            with self.assertRaises(ApiError):
                normalize(entity, PROPERTY)

    def test_no_data_webhooks_coalesce_pending_but_allow_later_bookings(self):
        body = {"event": "booking", "property_id": PROPERTY}
        path, headers = (
            f"/api/channex/webhooks/{self.tenant_id}",
            {"X-Channex-Webhook-Secret": "fixture-webhook-secret-32-characters"},
        )
        for _ in range(2):
            self.assertEqual(self.client.post(path, json=body, headers=headers).status_code, 202)
        self.assertEqual(len(self.jobs()), 1)
        self.run_jobs()
        self.assertEqual(self.client.post(path, json=body, headers=headers).status_code, 202)
        self.assertEqual(len(self.jobs()), 2, "A later no-data event must start a fresh feed poll")

    def test_used_mapping_cannot_silently_leave_old_ota_inventory_open(self):
        self.request("post", "/channels/jobs", json={"kind": "pull_bookings"})
        mapping = {
            "roomTypeId": "rt-a",
            "channexRoomTypeId": REMOTE_ROOM,
            "channexRatePlanId": REMOTE_RATE,
            "active": False,
        }
        self.assertEqual(self.request("put", "/channels/mappings", json=mapping).status_code, 409)

    def test_scheduler_coalesces_bucket_and_recovers_missed_webhook(self):
        from pms_api.channels.service import schedule_jobs

        instant = utcnow()
        with self.app.app_context(), patch("pms_api.channels.service.utcnow", return_value=instant):
            self.assertEqual(schedule_jobs(self.tenant_id), 13)
            self.assertEqual(schedule_jobs(self.tenant_id), 0)
        self.assertEqual(len(self.jobs()), 13)
        self.provider.feed.return_value = [revision()]
        self.provider.revision.return_value = revision()
        self.run_jobs(15)
        self.assertEqual(len(self.local_bookings()), 1)
        with (
            self.app.app_context(),
            patch("pms_api.channels.service.utcnow", return_value=instant + timedelta(seconds=60)),
        ):
            self.assertEqual(schedule_jobs(self.tenant_id), 1)
            self.assertEqual(schedule_jobs(self.tenant_id), 0)

    def test_scheduler_does_not_schedule_disabled_feature(self):
        from pms_api.channels.service import schedule_jobs

        with self.app.app_context():
            set_context(self.owner_id, self.tenant_id)
            db.session.get(Plan, "default-pro").features = {"OTA_SYNC": False}
            db.session.commit()
            self.assertEqual(schedule_jobs(self.tenant_id), 0)
        self.provider.feed.assert_not_called()

    def test_failed_local_commit_never_acknowledges_or_leaves_booking(self):
        self.enqueue_revision(revision())
        with self.app.app_context():
            commit = db.session.commit
            attempts = []

            def first_commit_fails():
                attempts.append(1)
                if len(attempts) == 1:
                    raise SQLAlchemyError("fixture commit failure")
                return commit()

            with patch.object(db.session, "commit", side_effect=first_commit_fails):
                self.assertEqual(process_jobs(self.tenant_id, 1), 1)
            set_context(self.owner_id, self.tenant_id)
            self.assertEqual(
                db.session.scalar(select(func.count()).select_from(ChannelRevision)), 0
            )
        self.assertEqual(self.local_bookings(), [])
        self.assertEqual(self.jobs()[0]["errorCode"], "channel_database_conflict")
        self.provider.ack.assert_not_called()
