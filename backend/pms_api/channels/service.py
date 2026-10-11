"""Durable bounded work; imports and ACK jobs commit before any remote ACK.

Workers hold the normal tenant lock while publishing a fresh inventory snapshot.
This serializes channel workers with booking/catalog writes. A process crash
rolls back its work, so jobs remain queued and idempotent writes can be retried.
"""

import os
from datetime import date, timedelta

from flask import current_app, g
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from ..bookings.models import ReservationRoom
from ..catalog.models import DailyRate, RoomType
from ..catalog.routes import capacity_for, date_range
from ..core_models import TenantUser, User, utcnow
from ..extensions import db
from ..pricing.engine import business_date
from ..security import GLOBAL_ROLES, ApiError, audit, set_context
from ..subscriptions import enforce_entitlements, feature_enabled, lock_tenant
from .client import ChannexClient, ProviderError, remote_id
from .models import ChannelConnection, ChannelJob, ChannelMapping, ChannelRevision


def window(start, end):
    days = date_range(start, end)
    if len(days) > 31:
        raise ApiError(
            422, "channel_window_too_large", "Đồng bộ giá/phòng tối đa 31 ngày mỗi tác vụ."
        )
    return days


def queue_job(tenant_id, actor_id, kind, details, dedupe=None):
    if dedupe:
        existing = db.session.scalar(
            select(ChannelJob).where(
                ChannelJob.tenant_id == tenant_id, ChannelJob.dedupe_key == dedupe
            )
        )
        if existing:
            return existing
    if kind == "push_ari" or (kind == "pull_bookings" and not details):
        existing = db.session.scalar(
            select(ChannelJob).where(
                ChannelJob.tenant_id == tenant_id,
                ChannelJob.kind == kind,
                ChannelJob.status == "queued",
                ChannelJob.payload == details,
            )
        )
        if existing:
            if dedupe and existing.dedupe_key is None:
                existing.dedupe_key = dedupe
            return existing
    pending = db.session.scalar(
        select(func.count())
        .select_from(ChannelJob)
        .where(ChannelJob.tenant_id == tenant_id, ChannelJob.status.in_(["queued", "processing"]))
    )
    if pending >= 500:
        raise ApiError(
            409, "channel_queue_full", "Hàng đợi đồng bộ đã đầy; cần xử lý các tác vụ đang chờ."
        )
    row = ChannelJob(
        tenant_id=tenant_id, actor_id=actor_id, kind=kind, payload=details, dedupe_key=dedupe
    )
    db.session.add(row)
    db.session.flush()
    return row


def authorize_actor(tenant_id, actor_id):
    user = db.session.get(User, actor_id)
    membership = db.session.scalar(
        select(TenantUser).where(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == actor_id,
            TenantUser.active.is_(True),
            TenantUser.role == "HOTEL_OWNER",
        )
    )
    if not user or not user.active or (user.global_role not in GLOBAL_ROLES and not membership):
        raise ApiError(403, "channel_actor_revoked", "Người cấu hình kênh không còn quyền đồng bộ.")
    g.user, g.role = user, "HOTEL_OWNER"
    set_context(user.id, tenant_id, user.global_role in GLOBAL_ROLES)
    if g.tenant.status != "active":
        raise ApiError(403, "tenant_suspended", "Khách sạn đang bị tạm ngưng.")
    enforce_entitlements("channels.write")


def enqueue_audit(entry):
    """An outbox job is part of the same transaction as the initiating mutation."""
    if not entry.tenant_id:
        return
    reservation_event = entry.event in {
        "reservation.created",
        "reservation.updated",
        "reservation.status",
    }
    bounded = reservation_event or entry.event in {"rates.saved", "room.blocked", "room.unblocked"}
    rolling = entry.event in {
        "room.maintenance",
        "room.clean",
        "room.dirty",
        "room.inspection",
        "channel.mapped",
        "channel.configured",
    } or (
        entry.event in {"master.saved", "master.toggled"}
        and entry.entity_type in {"rooms", "roomTypes"}
    )
    if not bounded and not rolling:
        return
    connection = db.session.scalar(
        select(ChannelConnection).where(
            ChannelConnection.tenant_id == entry.tenant_id, ChannelConnection.active.is_(True)
        )
    )
    if not connection or not feature_enabled("OTA_SYNC", for_write=True):
        return
    if not db.session.scalar(
        select(ChannelMapping.id)
        .where(ChannelMapping.tenant_id == entry.tenant_id, ChannelMapping.active.is_(True))
        .limit(1)
    ):
        return
    today = business_date(g.tenant)
    ranges = []
    details = entry.details or {}
    for start_key, end_key in (
        ("start", "end"),
        ("checkIn", "checkOut"),
        ("oldCheckIn", "oldCheckOut"),
    ):
        if details.get(start_key) and details.get(end_key):
            ranges.append(
                (date.fromisoformat(details[start_key]), date.fromisoformat(details[end_key]))
            )
    if rolling or not ranges:
        ranges.append((today, today + timedelta(days=366)))
    for first, last in ranges:
        first = max(today, first)
        while first < last:
            end = min(last, first + timedelta(days=31))
            queue_job(
                entry.tenant_id,
                connection.actor_id,
                "push_ari",
                {"start": first.isoformat(), "end": end.isoformat()},
            )
            first = end


def _relationship(entity, key):
    try:
        return entity["relationships"][key]["data"]["id"]
    except KeyError, TypeError:
        raise ProviderError("channel_mapping_invalid") from None


def _catalog_index(entities):
    if any(not isinstance(e, dict) or not isinstance(e.get("attributes"), dict) for e in entities):
        raise ProviderError("provider_invalid_response")
    return {remote_id(e.get("id")): e for e in entities}


def ari_snapshot(tenant_id, connection, client, details):
    days = window(details.get("start"), details.get("end"))
    mappings = list(
        db.session.scalars(
            select(ChannelMapping)
            .where(ChannelMapping.tenant_id == tenant_id, ChannelMapping.active.is_(True))
            .order_by(ChannelMapping.id)
        )
    )
    if not mappings or len(mappings) > 50:
        raise ProviderError("channel_mapping_required")
    # Validate property ownership and per-room manual rate currency before sending
    # amounts. A UUID by itself is not sufficient evidence of a correct mapping.
    remote_rooms = _catalog_index(client.catalog("room_types", connection.property_id))
    remote_rates = _catalog_index(client.catalog("rate_plans", connection.property_id))
    availability, restrictions = [], []
    currency = (g.tenant.settings or {}).get("currency", "VND")
    for mapping in mappings:
        remote_room, remote_rate = (
            remote_rooms.get(mapping.remote_room_type_id),
            remote_rates.get(mapping.remote_rate_plan_id),
        )
        if (
            not remote_room
            or not remote_rate
            or _relationship(remote_room, "property") != connection.property_id
            or _relationship(remote_rate, "property") != connection.property_id
            or _relationship(remote_rate, "room_type") != mapping.remote_room_type_id
        ):
            raise ProviderError("channel_mapping_invalid")
        attributes = remote_rate.get("attributes", {})
        if (
            attributes.get("sell_mode") != "per_room"
            or attributes.get("rate_mode") != "manual"
            or attributes.get("currency") != currency
            or attributes.get("inherit_rate")
        ):
            raise ProviderError("channel_rate_plan_unsupported")
        room_type = db.session.scalar(
            select(RoomType).where(
                RoomType.tenant_id == tenant_id, RoomType.id == mapping.room_type_id
            )
        )
        overrides = {
            r.date: r
            for r in db.session.scalars(
                select(DailyRate).where(
                    DailyRate.tenant_id == tenant_id,
                    DailyRate.room_type_id == room_type.id,
                    DailyRate.date.in_(days),
                )
            )
        }
        for day in days:
            booked = db.session.scalar(
                select(func.count())
                .select_from(ReservationRoom)
                .where(
                    ReservationRoom.tenant_id == tenant_id,
                    ReservationRoom.room_type_id == room_type.id,
                    ReservationRoom.active.is_(True),
                    ReservationRoom.check_in <= day,
                    ReservationRoom.check_out > day,
                )
            )
            available = capacity_for(tenant_id, room_type.id, day) - booked
            if available < 0:
                raise ProviderError("channel_inventory_inconsistent")
            override = overrides.get(day)
            stop_sell = not room_type.active or bool(override and override.stop_sell)
            availability.append(
                {
                    "property_id": connection.property_id,
                    "room_type_id": mapping.remote_room_type_id,
                    "date": day.isoformat(),
                    "availability": 0 if stop_sell else available,
                }
            )
            restrictions.append(
                {
                    "property_id": connection.property_id,
                    "rate_plan_id": mapping.remote_rate_plan_id,
                    "date": day.isoformat(),
                    "rate": str(override.price if override else room_type.base_price),
                    "stop_sell": stop_sell,
                }
            )
    return availability, restrictions


def _run_job(tenant_id, job, connection, client):
    if job.kind == "push_ari":
        availability, restrictions = ari_snapshot(tenant_id, connection, client, job.payload)
        client.push_availability(availability)
        client.push_restrictions(restrictions)
    elif job.kind == "pull_bookings":
        from .importer import import_revision

        revision_id = job.payload.get("revisionId")
        if revision_id:
            entity = client.revision(revision_id)
            if not isinstance(entity, dict) or entity.get("id") != revision_id:
                raise ProviderError("provider_invalid_response")
            receipt = import_revision(tenant_id, entity, connection.property_id)
            queue_job(
                tenant_id,
                job.actor_id,
                "ack_revision",
                {"revisionId": receipt.revision_id},
                "ack:" + receipt.revision_id,
            )
        else:
            for entity in client.feed(connection.property_id):
                if (
                    not isinstance(entity, dict)
                    or not isinstance(entity.get("attributes"), dict)
                    or entity["attributes"].get("property_id") != connection.property_id
                ):
                    raise ProviderError("provider_invalid_response")
                revision_id = remote_id(entity.get("id"))
                queue_job(
                    tenant_id,
                    job.actor_id,
                    "pull_bookings",
                    {"revisionId": revision_id},
                    "revision:" + revision_id,
                )
    else:
        revision_id = job.payload.get("revisionId")
        if not db.session.scalar(
            select(ChannelRevision.id).where(
                ChannelRevision.tenant_id == tenant_id, ChannelRevision.revision_id == revision_id
            )
        ):
            raise ProviderError("channel_commit_required")
        client.ack(revision_id)


def schedule_jobs(tenant_id):
    """Poll feed every minute and publish a daily 366-day baseline in 31-day jobs.

    Bucket keys are durable across worker restarts; tenant locking prevents two
    workers scheduling duplicate work. No provider call happens in this method.
    """
    with current_app.test_request_context("/api/_channel_schedule", method="POST"):
        try:
            set_context(tenant_id=tenant_id)
            g.tenant = lock_tenant(tenant_id)
            connection = db.session.scalar(
                select(ChannelConnection).where(
                    ChannelConnection.tenant_id == tenant_id, ChannelConnection.active.is_(True)
                )
            )
            if not connection:
                db.session.rollback()
                return 0
            authorize_actor(tenant_id, connection.actor_id)
            before = db.session.scalar(
                select(func.count())
                .select_from(ChannelJob)
                .where(ChannelJob.tenant_id == tenant_id)
            )
            bucket = int(utcnow().timestamp()) // 60
            queue_job(tenant_id, connection.actor_id, "pull_bookings", {}, f"poll:{bucket}")
            if db.session.scalar(
                select(ChannelMapping.id)
                .where(ChannelMapping.tenant_id == tenant_id, ChannelMapping.active.is_(True))
                .limit(1)
            ):
                today = business_date(g.tenant)
                first, last = today, today + timedelta(days=366)
                while first < last:
                    end = min(last, first + timedelta(days=31))
                    queue_job(
                        tenant_id,
                        connection.actor_id,
                        "push_ari",
                        {"start": first.isoformat(), "end": end.isoformat()},
                        f"daily:{today}:{first}",
                    )
                    first = end
            db.session.flush()
            after = db.session.scalar(
                select(func.count())
                .select_from(ChannelJob)
                .where(ChannelJob.tenant_id == tenant_id)
            )
            db.session.commit()
            return after - before
        except ApiError:
            # Paused subscription, revoked owner and full queues are already
            # visible through configuration/job status. Do not spam on each poll.
            db.session.rollback()
            return 0


def process_jobs(tenant_id, limit=10, *, schedule=False):
    """Return processed count; caller supplies app context only, never an actor.

    Each iteration has its own request and DB transaction. Retriable transport
    failures back off 30/60/120/240 seconds (5 attempts), then need owner retry.
    A transaction rolls back on crash: no processing lease can get stranded.
    """
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
        raise ValueError("limit must be 1..100")
    if schedule:
        schedule_jobs(tenant_id)
    count = 0
    for _ in range(limit):
        job_id, actor_id = None, None
        with current_app.test_request_context("/api/_channel_worker", method="POST"):
            try:
                set_context(tenant_id=tenant_id)
                g.tenant = lock_tenant(tenant_id)
                job = db.session.scalar(
                    select(ChannelJob)
                    .where(
                        ChannelJob.tenant_id == tenant_id,
                        ChannelJob.status == "queued",
                        ChannelJob.available_at <= utcnow(),
                    )
                    .order_by(ChannelJob.created_at, ChannelJob.id)
                    .with_for_update(skip_locked=True)
                    .limit(1)
                )
                if job is None:
                    db.session.rollback()
                    break
                job_id, actor_id = job.id, job.actor_id
                job.status, job.attempts = "processing", job.attempts + 1
                authorize_actor(tenant_id, actor_id)
                connection = db.session.scalar(
                    select(ChannelConnection).where(ChannelConnection.tenant_id == tenant_id)
                )
                if not connection or not connection.active:
                    raise ProviderError("channel_inactive")
                client = ChannexClient(
                    connection.environment, os.environ.get(connection.credential_ref)
                )
                _run_job(tenant_id, job, connection, client)
                job.status, job.error_code, job.completed_at = "succeeded", None, utcnow()
                audit("channel.synced", "channel_job", job.id, {"kind": job.kind})
                db.session.commit()
                count += 1
            except (ApiError, ProviderError, SQLAlchemyError) as error:
                db.session.rollback()
                if not job_id:
                    raise
                set_context(tenant_id=tenant_id)
                g.tenant = lock_tenant(tenant_id)
                g.user = db.session.get(User, actor_id)
                failed = db.session.scalar(
                    select(ChannelJob)
                    .where(ChannelJob.tenant_id == tenant_id, ChannelJob.id == job_id)
                    .with_for_update()
                )
                failed.attempts += 1
                failed.error_code = (
                    error.code
                    if isinstance(error, (ApiError, ProviderError))
                    else "channel_database_conflict"
                )
                retry = isinstance(error, ProviderError) and error.retryable and failed.attempts < 5
                failed.status = "queued" if retry else "failed"
                failed.available_at = (
                    utcnow() + timedelta(seconds=30 * 2 ** (failed.attempts - 1))
                    if retry
                    else utcnow()
                )
                failed.completed_at = None if retry else utcnow()
                audit(
                    "channel.sync_error",
                    "channel_job",
                    failed.id,
                    {"kind": failed.kind, "errorCode": failed.error_code},
                )
                db.session.commit()
                count += 1
    return count
