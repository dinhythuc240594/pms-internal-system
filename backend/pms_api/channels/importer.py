"""Normalize an authoritative provider revision, then use canonical stay locks.

The first slice accepts mapped, same-date room stays with exact nightly totals.
Unsupported extras, currencies, in-house edits and settled edits remain unacked
for operator review. Card guarantees, arbitrary provider payloads and prepaid
OTA flags are never stored as local payments.
"""

from decimal import Decimal

from sqlalchemy import delete, select

from pms_api.bookings.application import (
    add_stay,
    commission_snapshot,
    inventory,
    lock_rooms,
    set_booking_guests,
)
from pms_api.catalog.application import lock_inventory
from pms_api.housekeeping.application import cancel_reservation_tasks

from ..bookings.models import (
    Charge,
    Guest,
    Payment,
    Reservation,
    ReservationGuest,
    ReservationNight,
    ReservationRoom,
)
from ..catalog.models import Master, PhysicalRoom, RoomBlock, RoomType
from ..core_models import utcnow
from ..extensions import db
from ..pricing.engine import snapshot_money
from ..security import audit
from .domain import identifier as identifier
from .domain import invalid as invalid
from .domain import normalize as normalize
from .domain import text as text
from .models import ChannelBooking, ChannelMapping, ChannelRevision


def import_revision(tenant_id, entity, property_id):
    revision = normalize(entity, property_id)
    existing = db.session.scalar(
        select(ChannelRevision).where(
            ChannelRevision.tenant_id == tenant_id, ChannelRevision.revision_id == revision["id"]
        )
    )
    if existing:
        return existing
    link = db.session.scalar(
        select(ChannelBooking)
        .where(
            ChannelBooking.tenant_id == tenant_id,
            ChannelBooking.booking_id == revision["bookingId"],
        )
        .with_for_update()
    )
    row = (
        db.session.get(
            Reservation, link.reservation_id, with_for_update=True, populate_existing=True
        )
        if link
        else None
    )
    stale = link is not None and revision["insertedAt"] < link.latest_revision_at
    if link and revision["insertedAt"] == link.latest_revision_at:
        invalid("revision_order_conflict")
    if not stale:
        if revision["status"] == "cancelled":
            if row is None:
                invalid("channel_booking_not_found")
            if row.status not in {"CONFIRMED", "CANCELLED"}:
                invalid("booking_requires_review")
            if row.status == "CONFIRMED":
                rooms = list(
                    db.session.scalars(
                        select(ReservationRoom).where(
                            ReservationRoom.tenant_id == tenant_id,
                            ReservationRoom.reservation_id == row.id,
                        )
                    )
                )
                physical = lock_rooms(tenant_id, sorted(room.room_number for room in rooms))
                cancel_reservation_tasks(row, physical, "cancelled")
                inventory(tenant_id, rooms, row.check_in, row.check_out, -1)
                for room in rooms:
                    room.active = False
                row.status, row.cancelled_at = "CANCELLED", utcnow()
                audit(
                    "reservation.status",
                    "reservation",
                    row.id,
                    {
                        "from": "CONFIRMED",
                        "to": "CANCELLED",
                        "checkIn": row.check_in.isoformat(),
                        "checkOut": row.check_out.isoformat(),
                    },
                )
        else:
            if row is None and revision["status"] != "new":
                invalid("channel_booking_not_found")
            if row and (
                row.status != "CONFIRMED"
                or row.currency != revision["currency"]
                or db.session.scalar(
                    select(Payment.id)
                    .where(Payment.tenant_id == tenant_id, Payment.reservation_id == row.id)
                    .limit(1)
                )
                or db.session.scalar(
                    select(Charge.id)
                    .where(Charge.tenant_id == tenant_id, Charge.reservation_id == row.id)
                    .limit(1)
                )
            ):
                invalid("booking_requires_review")
            row = apply_stay(tenant_id, revision, row)
            if link is None:
                link = ChannelBooking(
                    tenant_id=tenant_id,
                    booking_id=revision["bookingId"],
                    reservation_id=row.id,
                    latest_revision_at=revision["insertedAt"],
                )
                db.session.add(link)
        link.latest_revision_at = revision["insertedAt"]
    receipt = ChannelRevision(
        tenant_id=tenant_id,
        revision_id=revision["id"],
        booking_id=revision["bookingId"],
        reservation_id=row.id,
        outcome="stale" if stale else "imported",
    )
    db.session.add(receipt)
    db.session.flush()
    return receipt


def apply_stay(tenant_id, revision, row):
    mappings = {
        (m.remote_room_type_id, m.remote_rate_plan_id): m
        for m in db.session.scalars(
            select(ChannelMapping).where(ChannelMapping.tenant_id == tenant_id)
        )
    }
    for room in revision["rooms"]:
        mapping = mappings.get((room["typeId"], room["rateId"]))
        if not mapping or (not mapping.active and mapping.used_at is None):
            invalid("booking_unmapped")
        room["localTypeId"] = mapping.room_type_id
        mapping.used_at = mapping.used_at or utcnow()
        from .service import publication_ranges

        mapping.published_ranges = publication_ranges(
            [
                *mapping.published_ranges,
                {"start": revision["start"].isoformat(), "end": revision["end"].isoformat()},
            ]
        )
    kinds = sorted({r["localTypeId"] for r in revision["rooms"]})
    types = {
        r.id: r
        for r in db.session.scalars(
            select(RoomType).where(RoomType.tenant_id == tenant_id, RoomType.id.in_(kinds))
        )
    }
    if any(
        not types[r["localTypeId"]].active or r["occupancy"] > types[r["localTypeId"]].capacity
        for r in revision["rooms"]
    ):
        invalid("invalid_booking_occupancy")
    old_start, old_end = (
        (row.check_in, row.check_out) if row else (revision["start"], revision["end"])
    )
    old_rooms = (
        list(
            db.session.scalars(
                select(ReservationRoom).where(
                    ReservationRoom.tenant_id == tenant_id, ReservationRoom.reservation_id == row.id
                )
            )
        )
        if row
        else []
    )
    candidates = list(
        db.session.scalars(
            select(PhysicalRoom)
            .where(
                PhysicalRoom.tenant_id == tenant_id,
                PhysicalRoom.room_type_id.in_(set(kinds) | {r.room_type_id for r in old_rooms}),
            )
            .order_by(PhysicalRoom.number)
            .with_for_update()
        )
    )
    lock_inventory(
        tenant_id,
        sorted(set(kinds) | {r.room_type_id for r in old_rooms}),
        min(old_start, revision["start"]),
        max(old_end, revision["end"]),
    )
    blocked = set(
        db.session.scalars(
            select(RoomBlock.room_id).where(
                RoomBlock.tenant_id == tenant_id,
                RoomBlock.start_date < revision["end"],
                RoomBlock.end_date > revision["start"],
            )
        )
    )
    overlaps = select(ReservationRoom.room_id).where(
        ReservationRoom.tenant_id == tenant_id,
        ReservationRoom.active.is_(True),
        ReservationRoom.check_in < revision["end"],
        ReservationRoom.check_out > revision["start"],
    )
    if row:
        overlaps = overlaps.where(ReservationRoom.reservation_id != row.id)
    blocked.update(db.session.scalars(overlaps))
    assigned = []
    previous_room_ids = {room.room_id for room in old_rooms}
    candidates.sort(key=lambda room: (room.id not in previous_room_ids, room.number))
    for requested in revision["rooms"]:
        chosen = next(
            (
                r
                for r in candidates
                if r.room_type_id == requested["localTypeId"]
                and r.active
                and r.condition != "maintenance"
                and r.id not in blocked
            ),
            None,
        )
        if chosen is None:
            invalid("room_unavailable")
        assigned.append(chosen)
        blocked.add(chosen.id)
    snapshot = snapshot_money(tenant_id, revision["currency"], revision["amount"], source=row)
    pricing = {
        "version": 1,
        "rules": [],
        "discount": None,
        "channel": {
            "provider": "channex",
            "bookingId": revision["bookingId"],
            "paymentCollect": revision["paymentCollect"],
        },
    }
    if row is None:
        source = db.session.scalar(
            select(Master)
            .where(
                Master.tenant_id == tenant_id,
                Master.catalog == "bookingSources",
                Master.active.is_(True),
                Master.name == revision["source"],
                Master.data["type"].astext == "OTA",
            )
            .with_for_update(read=True)
        )
        if source:
            pricing["commission"] = commission_snapshot(source)
        row = Reservation(
            tenant_id=tenant_id,
            check_in=revision["start"],
            check_out=revision["end"],
            source_name=revision["source"],
            source_id=source.id if source else None,
            currency=revision["currency"],
            pricing_snapshot=pricing,
            guest_name=revision["name"],
            **snapshot,
        )
        db.session.add(row)
        db.session.flush()
    else:
        if (row.pricing_snapshot or {}).get("commission"):
            pricing["commission"] = row.pricing_snapshot["commission"]
        if (
            old_start != revision["start"]
            or old_end != revision["end"]
            or previous_room_ids != {room.id for room in assigned}
        ):
            cancel_reservation_tasks(row, candidates, "stay_changed")
        inventory(tenant_id, old_rooms, old_start, old_end, -1)
        for model in (ReservationNight, ReservationRoom):
            db.session.execute(
                delete(model).where(model.tenant_id == tenant_id, model.reservation_id == row.id)
            )
        row.check_in, row.check_out, row.pricing_snapshot, row.base_amount = (
            revision["start"],
            revision["end"],
            pricing,
            snapshot["base_amount"],
        )
    nightly = []
    for physical, requested in zip(assigned, revision["rooms"]):
        for day, price in requested["prices"].items():
            nightly.append(
                {
                    "roomId": physical.id,
                    "room": physical.number,
                    "date": day,
                    "price": str(price),
                    "baseAmount": str(
                        snapshot_money(tenant_id, row.currency, price, source=row)["base_amount"]
                    ),
                }
            )
    add_stay(
        row,
        assigned,
        {
            "nightlyRates": nightly,
            "baseCurrency": row.base_currency,
            "exchangeRate": str(row.exchange_rate),
        },
    )
    row.base_amount = sum((Decimal(n["baseAmount"]) for n in nightly), Decimal(0))
    inventory(tenant_id, assigned, row.check_in, row.check_out, 1)
    guest = db.session.scalar(
        select(Guest)
        .join(
            ReservationGuest,
            (ReservationGuest.tenant_id == Guest.tenant_id)
            & (ReservationGuest.guest_id == Guest.id),
        )
        .where(
            ReservationGuest.tenant_id == tenant_id,
            ReservationGuest.reservation_id == row.id,
            ReservationGuest.is_primary.is_(True),
        )
    )
    if guest is None or (guest.name, guest.phone, guest.email) != (
        revision["name"],
        revision["phone"],
        revision["email"],
    ):
        guest = Guest(
            tenant_id=tenant_id,
            name=revision["name"],
            phone=revision["phone"],
            email=revision["email"],
        )
        db.session.add(guest)
        db.session.flush()
    set_booking_guests(row, [guest])
    audit(
        "reservation.updated" if old_rooms else "reservation.created",
        "reservation",
        row.id,
        {
            "checkIn": row.check_in.isoformat(),
            "checkOut": row.check_out.isoformat(),
            "oldCheckIn": old_start.isoformat(),
            "oldCheckOut": old_end.isoformat(),
        },
    )
    return row
