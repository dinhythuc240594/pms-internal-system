"""Session protected configuration; authenticated provider webhook is an outbox trigger."""

import hashlib
import hmac
import os

from flask import g, request
from sqlalchemy import select

from common import CommonMethodView

from ..catalog.models import RoomType
from ..extensions import db
from ..security import ApiError, audit, payload, require_tenant, set_context
from ..subscriptions import enforce_entitlements, lock_tenant
from .client import BASES, ProviderError, remote_id
from .models import ChannelBooking, ChannelConnection, ChannelJob, ChannelMapping

PREFIX = "/api/tenants/<tenant_id>/channels"


def expected_refs(tenant_id):
    suffix = hashlib.sha256(tenant_id.encode()).hexdigest()[:16].upper()
    return "CHANNEX_API_KEY_" + suffix, "CHANNEX_WEBHOOK_SECRET_" + suffix


def connection(tenant_id, *, active=False):
    row = db.session.scalar(
        select(ChannelConnection).where(ChannelConnection.tenant_id == tenant_id)
    )
    if active and (not row or not row.active):
        raise ApiError(409, "channel_inactive", "Kết nối Channex chưa hoạt động.")
    return row


def uuid_input(value):
    try:
        return remote_id(value)
    except ProviderError:
        raise ApiError(422, "invalid_channel_config", "Mã Channex phải là UUID.") from None


def mapping_json(row):
    return {
        "id": row.id,
        "roomTypeId": row.room_type_id,
        "channexRoomTypeId": row.remote_room_type_id,
        "channexRatePlanId": row.remote_rate_plan_id,
        "active": row.active,
    }


def job_json(row):
    return {
        "id": row.id,
        "kind": row.kind,
        "status": row.status,
        "attempts": row.attempts,
        "errorCode": row.error_code,
        "start": row.payload.get("start"),
        "end": row.payload.get("end"),
        "createdAt": row.created_at.isoformat(),
        "completedAt": row.completed_at.isoformat() if row.completed_at else None,
    }


class SnapshotView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.view")
    def dispatch_request(tenant_id):
        row = connection(tenant_id)
        refs = expected_refs(tenant_id)
        return {
            "expectedCredentialRef": refs[0],
            "expectedWebhookSecretRef": refs[1],
            "connection": None
            if not row
            else {
                "environment": row.environment,
                "propertyId": row.property_id,
                "credentialRef": row.credential_ref,
                "webhookSecretRef": row.webhook_secret_ref,
                "active": row.active,
                "credentialsConfigured": bool(os.environ.get(row.credential_ref)),
                "webhookConfigured": len(os.environ.get(row.webhook_secret_ref, "")) >= 32,
            },
            "mappings": [
                mapping_json(m)
                for m in db.session.scalars(
                    select(ChannelMapping)
                    .where(ChannelMapping.tenant_id == tenant_id)
                    .order_by(ChannelMapping.room_type_id)
                )
            ],
            "jobs": [
                job_json(j)
                for j in db.session.scalars(
                    select(ChannelJob)
                    .where(ChannelJob.tenant_id == tenant_id)
                    .order_by(ChannelJob.created_at.desc())
                    .limit(50)
                )
            ],
            "roomTypes": [
                {"id": r.id, "name": r.name}
                for r in db.session.scalars(
                    select(RoomType)
                    .where(RoomType.tenant_id == tenant_id, RoomType.active.is_(True))
                    .order_by(RoomType.name)
                )
            ],
        }


class SaveConfigView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.write")
    def dispatch_request(tenant_id):
        data = payload()
        if (
            set(data)
            != {"environment", "propertyId", "credentialRef", "webhookSecretRef", "active"}
            or not isinstance(data["environment"], str)
            or data["environment"] not in BASES
            or not isinstance(data["active"], bool)
            or (data["credentialRef"], data["webhookSecretRef"]) != expected_refs(tenant_id)
        ):
            raise ApiError(
                422, "invalid_channel_config", "Cấu hình hoặc tên biến môi trường không hợp lệ."
            )
        property_id = uuid_input(data["propertyId"])
        row = connection(tenant_id)
        if row and (row.property_id != property_id or row.environment != data["environment"]):
            if db.session.scalar(
                select(ChannelBooking.id).where(ChannelBooking.tenant_id == tenant_id).limit(1)
            ) or db.session.scalar(
                select(ChannelJob.id).where(ChannelJob.tenant_id == tenant_id).limit(1)
            ):
                raise ApiError(
                    409,
                    "channel_has_history",
                    "Không đổi khách sạn hoặc môi trường sau khi có lịch sử đồng bộ.",
                )
        if row is None:
            row = ChannelConnection(tenant_id=tenant_id)
            db.session.add(row)
        (
            row.environment,
            row.property_id,
            row.credential_ref,
            row.webhook_secret_ref,
            row.active,
            row.actor_id,
        ) = (
            data["environment"],
            property_id,
            data["credentialRef"],
            data["webhookSecretRef"],
            data["active"],
            g.user.id,
        )
        db.session.flush()
        audit(
            "channel.configured",
            "channel_connection",
            row.id,
            {"environment": row.environment, "active": row.active},
        )
        return {"saved": True}


class SaveMappingView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.write")
    def dispatch_request(tenant_id):
        data = payload()
        if (
            set(data) != {"roomTypeId", "channexRoomTypeId", "channexRatePlanId", "active"}
            or not isinstance(data["active"], bool)
            or not isinstance(data["roomTypeId"], str)
        ):
            raise ApiError(422, "invalid_channel_mapping", "Ánh xạ loại phòng không hợp lệ.")
        connection(tenant_id)
        room_type = db.session.scalar(
            select(RoomType).where(
                RoomType.tenant_id == tenant_id, RoomType.id == data["roomTypeId"]
            )
        )
        if not room_type:
            raise ApiError(404, "not_found", "Không tìm thấy loại phòng.")
        row = db.session.scalar(
            select(ChannelMapping).where(
                ChannelMapping.tenant_id == tenant_id, ChannelMapping.room_type_id == room_type.id
            )
        )
        remote_room, remote_rate = (
            uuid_input(data["channexRoomTypeId"]),
            uuid_input(data["channexRatePlanId"]),
        )
        if (
            row
            and (row.remote_room_type_id, row.remote_rate_plan_id, row.active)
            != (remote_room, remote_rate, data["active"])
            and db.session.scalar(
                select(ChannelJob.id).where(ChannelJob.tenant_id == tenant_id).limit(1)
            )
        ):
            raise ApiError(
                409,
                "channel_mapping_has_history",
                "Ánh xạ đã sử dụng cần được đóng bán và đối soát tại Channex trước khi thay đổi.",
            )
        if row is None:
            row = ChannelMapping(tenant_id=tenant_id, room_type_id=room_type.id)
            db.session.add(row)
        row.remote_room_type_id, row.remote_rate_plan_id, row.active = (
            remote_room,
            remote_rate,
            data["active"],
        )
        db.session.flush()
        audit("channel.mapped", "room_type", room_type.id)
        return mapping_json(row)


class CreateJobView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.write")
    def dispatch_request(tenant_id):
        from .service import queue_job, window

        data = payload()
        kind = data.get("kind")
        if (
            not isinstance(kind, str)
            or kind not in {"push_ari", "pull_bookings"}
            or set(data) - {"kind", "start", "end"}
        ):
            raise ApiError(422, "invalid_channel_job", "Tác vụ đồng bộ không hợp lệ.")
        connection(tenant_id, active=True)
        details = {}
        if kind == "push_ari":
            days = window(data.get("start"), data.get("end"))
            details = {"start": days[0].isoformat(), "end": data["end"]}
        elif set(data) != {"kind"}:
            raise ApiError(422, "invalid_channel_job", "Đồng bộ đặt phòng không nhận khoảng ngày.")
        row = queue_job(tenant_id, g.user.id, kind, details)
        db.session.flush()
        audit("channel.queued", "channel_job", row.id, {"kind": kind})
        return job_json(row), 202


class RetryJobView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.write")
    def dispatch_request(tenant_id, job_id):
        from ..core_models import utcnow

        if payload():
            raise ApiError(422, "invalid_channel_job", "Thử lại không nhận tham số.")
        row = db.session.scalar(
            select(ChannelJob)
            .where(ChannelJob.tenant_id == tenant_id, ChannelJob.id == job_id)
            .with_for_update()
        )
        if not row:
            raise ApiError(404, "not_found", "Không tìm thấy tác vụ.")
        if row.status != "failed":
            raise ApiError(409, "channel_job_not_failed", "Tác vụ chưa ở trạng thái lỗi.")
        connection(tenant_id, active=True)
        (
            row.status,
            row.error_code,
            row.completed_at,
            row.available_at,
            row.attempts,
            row.actor_id,
        ) = (
            "queued",
            None,
            None,
            utcnow(),
            0,
            g.user.id,
        )
        audit("channel.retried", "channel_job", row.id)
        return job_json(row), 202


class WebhookView(CommonMethodView):
    @staticmethod
    def dispatch_request(tenant_id):
        from .service import queue_job

        # No session cookie is required here. A per-tenant secret replaces provider HMAC,
        # which Channex does not support: webhook-collection#authentication-and-security.
        set_context(tenant_id=tenant_id)
        row = connection(tenant_id, active=True)
        secret = os.environ.get(row.webhook_secret_ref, "")
        supplied = request.headers.get("X-Channex-Webhook-Secret", "")
        if (
            len(secret) < 32
            or len(supplied) > 1024
            or not supplied.isascii()
            or not hmac.compare_digest(secret.encode(), supplied.encode())
        ):
            raise ApiError(401, "invalid_webhook_secret", "Webhook không được xác thực.")
        if request.content_length is None or request.content_length > 16384:
            raise ApiError(413, "webhook_too_large", "Webhook vượt giới hạn.")
        data = payload()
        if (
            not isinstance(data.get("event"), str)
            or data["event"]
            not in {
                "booking",
                "booking_new",
                "booking_modification",
                "booking_cancellation",
                "non_acked_booking",
            }
            or data.get("property_id") != row.property_id
        ):
            raise ApiError(
                422, "invalid_channel_webhook", "Webhook không đúng khách sạn hoặc sự kiện."
            )
        body = data.get("payload") or {}
        if (
            not isinstance(body, dict)
            or body.get("property_id", row.property_id) != row.property_id
        ):
            raise ApiError(422, "invalid_channel_webhook", "Nội dung webhook không hợp lệ.")
        revision = body.get("revision_id") or body.get("booking_revision_id")
        details = {"revisionId": uuid_input(revision)} if revision else {}
        from .service import authorize_actor

        g.tenant = lock_tenant(tenant_id)
        authorize_actor(tenant_id, row.actor_id)
        enforce_entitlements("channels.write")
        queue_job(
            tenant_id,
            row.actor_id,
            "pull_bookings",
            details,
            "revision:" + details["revisionId"] if revision else None,
        )
        return {"accepted": True}, 202


def __getattr__(name):
    if name in {"URL", "channels"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
