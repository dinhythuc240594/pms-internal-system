"""Tenant scoped channel settings, durable jobs and minimal revision receipts."""

from sqlalchemy.dialects.postgresql import JSONB

from ..core_models import uid, utcnow
from ..extensions import db


def ref(column, target):
    return db.ForeignKeyConstraint(["tenant_id", column], [f"{target}.tenant_id", f"{target}.id"])


class ChannelConnection(db.Model):
    __tablename__ = "channel_connections"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False, unique=True)
    environment = db.Column(db.String(12), nullable=False)
    property_id = db.Column(db.String(36), nullable=False)
    credential_ref = db.Column(db.String(120), nullable=False)
    webhook_secret_ref = db.Column(db.String(120), nullable=False)
    secrets_ciphertext = db.Column(db.Text)
    verified_at = db.Column(db.DateTime(timezone=True))
    ari_available_at = db.Column(db.DateTime(timezone=True))
    webhook_id = db.Column(db.String(36))
    actor_id = db.Column(db.String(40), db.ForeignKey("users.id"), nullable=False)
    active = db.Column(db.Boolean, nullable=False, default=False)
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "id"),
        db.UniqueConstraint("environment", "property_id"),
        db.CheckConstraint("environment IN ('staging','production')", name="environment"),
    )


class ChannelMapping(db.Model):
    __tablename__ = "channel_mappings"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    room_type_id = db.Column(db.String(40), nullable=False)
    remote_room_type_id = db.Column(db.String(36), nullable=False)
    remote_rate_plan_id = db.Column(db.String(36), nullable=False)
    active = db.Column(db.Boolean, nullable=False, default=True)
    used_at = db.Column(db.DateTime(timezone=True))
    published_ranges = db.Column(JSONB, nullable=False, default=list)
    pause_requested = db.Column(db.Boolean, nullable=False, default=False)
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "id"),
        db.UniqueConstraint("tenant_id", "room_type_id"),
        db.UniqueConstraint("tenant_id", "remote_room_type_id"),
        db.UniqueConstraint("tenant_id", "remote_rate_plan_id"),
        ref("room_type_id", "room_types"),
    )


class ChannelJob(db.Model):
    __tablename__ = "channel_jobs"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    actor_id = db.Column(db.String(40), db.ForeignKey("users.id"), nullable=False)
    kind = db.Column(db.String(20), nullable=False)
    dedupe_key = db.Column(db.String(100))
    payload = db.Column(JSONB, nullable=False, default=dict)
    status = db.Column(db.String(12), nullable=False, default="queued")
    attempts = db.Column(db.Integer, nullable=False, default=0)
    error_code = db.Column(db.String(80))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    available_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    completed_at = db.Column(db.DateTime(timezone=True))
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "id"),
        db.UniqueConstraint("tenant_id", "dedupe_key"),
        db.CheckConstraint(
            "kind IN ('push_ari','pull_bookings','ack_revision','setup_webhook','pause_mapping')",
            name="kind",
        ),
        db.CheckConstraint("status IN ('queued','processing','succeeded','failed')", name="status"),
        db.CheckConstraint("attempts >= 0", name="attempts"),
        db.Index("ix_channel_jobs_ready", "tenant_id", "status", "available_at"),
    )


class ChannelBooking(db.Model):
    __tablename__ = "channel_bookings"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    booking_id = db.Column(db.String(36), nullable=False)
    reservation_id = db.Column(db.String(40), nullable=False)
    latest_revision_at = db.Column(db.DateTime(timezone=True), nullable=False)
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "id"),
        db.UniqueConstraint("tenant_id", "booking_id"),
        db.UniqueConstraint("tenant_id", "reservation_id"),
        ref("reservation_id", "reservations"),
    )


class ChannelRevision(db.Model):
    __tablename__ = "channel_revisions"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    revision_id = db.Column(db.String(36), nullable=False)
    booking_id = db.Column(db.String(36), nullable=False)
    reservation_id = db.Column(db.String(40))
    outcome = db.Column(db.String(12), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    __table_args__ = (
        db.UniqueConstraint("tenant_id", "id"),
        db.UniqueConstraint("tenant_id", "revision_id"),
        ref("reservation_id", "reservations"),
        db.CheckConstraint("outcome IN ('imported','stale')", name="outcome"),
    )
