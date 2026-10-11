"""Normalize an authoritative provider revision, then use canonical stay locks.

The first slice accepts mapped, same-date room stays with exact nightly totals.
Unsupported extras, currencies, in-house edits and settled edits remain unacked
for operator review. Card guarantees, arbitrary provider payloads and prepaid
OTA flags are never stored as local payments.
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, select

from ..bookings.models import (
    Charge,
    Guest,
    Payment,
    Reservation,
    ReservationGuest,
    ReservationNight,
    ReservationRoom,
)
from ..bookings.routes import add_stay, inventory, money_value, set_booking_guests, stay_dates
from ..catalog.models import PhysicalRoom, RoomBlock, RoomType
from ..catalog.routes import lock_inventory
from ..core_models import utcnow
from ..extensions import db
from ..pricing.engine import snapshot_money
from ..security import ApiError, audit
from .client import ProviderError, remote_id
from .models import ChannelBooking, ChannelMapping, ChannelRevision


def invalid(code="unsupported_booking"):
    raise ApiError(409, code, "Đặt phòng kênh cần được kiểm tra trước khi xác nhận đồng bộ.")


def identifier(value):
    try:
        return remote_id(value)
    except ProviderError:
        invalid("invalid_booking_revision")


def text(value, length, *, required=False):
    value = "" if value is None else value
    if (
        not isinstance(value, str)
        or len(value) > length
        or (required and not value.strip())
        or any(ord(c) < 32 for c in value)
    ):
        invalid("invalid_booking_revision")
    return value.strip()


def normalize(entity, property_id):
    if not isinstance(entity, dict) or not isinstance(entity.get("attributes"), dict):
        invalid("invalid_booking_revision")
    raw = entity["attributes"]
    if (
        raw.get("property_id") != property_id
        or not isinstance(raw.get("status"), str)
        or raw["status"] not in {"new", "modified", "cancelled"}
    ):
        invalid("invalid_booking_revision")
    try:
        inserted = datetime.fromisoformat(raw["inserted_at"].replace("Z", "+00:00"))
        # Channex examples use naive ISO timestamps; their timestamps are UTC.
        inserted = (
            inserted.replace(tzinfo=UTC) if inserted.tzinfo is None else inserted.astimezone(UTC)
        )
    except KeyError, ValueError, TypeError, AttributeError:
        invalid("invalid_booking_revision")
    result = {
        "id": identifier(entity.get("id")),
        "bookingId": identifier(raw.get("booking_id")),
        "status": raw["status"],
        "insertedAt": inserted,
    }
    if result["status"] == "cancelled":
        return result
    start, end = stay_dates(raw.get("arrival_date"), raw.get("departure_date"))
    if not isinstance(raw.get("currency"), str) or raw["currency"] not in {"VND", "USD"}:
        invalid("unsupported_booking_currency")
    rooms = raw.get("rooms")
    if not isinstance(rooms, list) or not 1 <= len(rooms) <= 20 or raw.get("services"):
        invalid()
    nights = {(start + timedelta(days=i)).isoformat() for i in range((end - start).days)}
    parsed = []
    for room in rooms:
        if (
            not isinstance(room, dict)
            or room.get("checkin_date") != start.isoformat()
            or room.get("checkout_date") != end.isoformat()
            or room.get("services")
        ):
            invalid()
        prices = room.get("days")
        if not isinstance(prices, dict) or set(prices) != nights:
            invalid("booking_rates_incomplete")
        prices = {day: money_value(value, allow_zero=True) for day, value in prices.items()}
        if sum(prices.values(), Decimal(0)) != money_value(room.get("amount"), allow_zero=True):
            invalid("booking_amount_mismatch")
        occupancy = room.get("occupancy")
        if not isinstance(occupancy, dict) or any(
            isinstance(occupancy.get(k), bool)
            or not isinstance(occupancy.get(k), int)
            or not 0 <= occupancy[k] <= 50
            for k in ("adults", "children", "infants")
        ):
            invalid("invalid_booking_occupancy")
        count = sum(occupancy[k] for k in ("adults", "children", "infants"))
        if count < 1:
            invalid("invalid_booking_occupancy")
        parsed.append(
            {
                "typeId": identifier(room.get("room_type_id")),
                "rateId": identifier(room.get("rate_plan_id")),
                "prices": prices,
                "occupancy": count,
            }
        )
    amount = money_value(raw.get("amount"), allow_zero=True)
    if sum((sum(r["prices"].values(), Decimal(0)) for r in parsed), Decimal(0)) != amount:
        invalid("booking_amount_mismatch")
    customer = raw.get("customer")
    if not isinstance(customer, dict):
        invalid("invalid_booking_revision")
    name = text(
        " ".join(
            filter(None, [text(customer.get("name"), 160), text(customer.get("surname"), 160)])
        ),
        160,
        required=True,
    )
    payment_collect = raw.get("payment_collect")
    if payment_collect is not None and (
        not isinstance(payment_collect, str) or payment_collect not in {"property", "ota"}
    ):
        invalid("invalid_booking_revision")
    result.update(
        start=start,
        end=end,
        rooms=parsed,
        amount=amount,
        currency=raw["currency"],
        name=name,
        phone=text(customer.get("phone"), 40),
        email=text(customer.get("mail"), 254),
        source=text(raw.get("ota_name"), 160, required=True),
        paymentCollect=payment_collect,
    )
    return result


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
    row = db.session.get(Reservation, link.reservation_id) if link else None
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
        (m.remote_room_type_id, m.remote_rate_plan_id): m.room_type_id
        for m in db.session.scalars(
            select(ChannelMapping).where(
                ChannelMapping.tenant_id == tenant_id, ChannelMapping.active.is_(True)
            )
        )
    }
    for room in revision["rooms"]:
        room["localTypeId"] = mappings.get((room["typeId"], room["rateId"]))
        if not room["localTypeId"]:
            invalid("booking_unmapped")
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
            .order_by(PhysicalRoom.id)
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
        row = Reservation(
            tenant_id=tenant_id,
            check_in=revision["start"],
            check_out=revision["end"],
            source_name=revision["source"],
            currency=revision["currency"],
            pricing_snapshot=pricing,
            guest_name=revision["name"],
            **snapshot,
        )
        db.session.add(row)
        db.session.flush()
    else:
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
