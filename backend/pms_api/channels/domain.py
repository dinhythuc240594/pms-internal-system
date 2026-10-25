"""Domain values and rules without Flask or database access."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from common.errors import ApiError

from ..bookings.domain import money_value, stay_dates
from .errors import ProviderError
from .identifiers import remote_id


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
    except (KeyError, ValueError, TypeError, AttributeError):
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
