"""Pure OTA revision validation and normalization; no persistence or HTTP."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from common.errors import ApiError

from ..bookings.domain import money_value, stay_dates
from ..currencies import is_hotel_currency
from ..pricing.domain import allocate_discount
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


def revision_identity(entity, property_id):
    if (
        not isinstance(entity, dict)
        or entity.get("type") != "booking_revision"
        or not isinstance(entity.get("attributes"), dict)
    ):
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
    except KeyError, ValueError, TypeError, AttributeError, OverflowError:
        invalid("invalid_booking_revision")
    return {
        "id": identifier(entity.get("id")),
        "bookingId": identifier(raw.get("booking_id")),
        "status": raw["status"],
        "insertedAt": inserted,
    }


def financial_lines(items, kind):
    """Provider total_price is authoritative; included room taxes are split, not added twice."""
    if items is None:
        items = []
    if not isinstance(items, list) or len(items) > 100:
        invalid("booking_financial_extras_unsupported")
    lines = []
    for item in items:
        if not isinstance(item, dict) or item.get("is_withheld"):
            invalid("booking_financial_extras_unsupported")
        if kind == "tax" and type(item.get("is_inclusive")) is not bool:
            invalid("booking_financial_extras_unsupported")
        try:
            amount = money_value(item.get("total_price"), allow_zero=True)
            description = text(item.get("name"), 200, required=True)
        except ApiError:
            invalid("booking_financial_extras_unsupported")
        lines.append(
            {
                "kind": kind,
                "description": description,
                "amount": amount,
                "included": item["is_inclusive"] if kind == "tax" else False,
            }
        )
    return lines


def normalize(entity, property_id):
    result = revision_identity(entity, property_id)
    raw = entity["attributes"]
    if result["status"] == "cancelled":
        if raw.get("services"):
            invalid("booking_financial_extras_unsupported")
        return result
    start, end = stay_dates(raw.get("arrival_date"), raw.get("departure_date"))
    if not is_hotel_currency(raw.get("currency")):
        invalid("unsupported_booking_currency")
    # Channex documents room taxes; undocumented booking-level/withheld totals need reconciliation.
    if raw.get("taxes") or raw.get("collected_taxes"):
        invalid("booking_financial_extras_unsupported")
    rooms = raw.get("rooms")
    if not isinstance(rooms, list) or not 1 <= len(rooms) <= 20:
        invalid()
    nights = {(start + timedelta(days=i)).isoformat() for i in range((end - start).days)}
    parsed = []
    extras = financial_lines(raw.get("services"), "service")
    for room in rooms:
        if isinstance(room, dict) and room.get("collected_taxes"):
            invalid("booking_financial_extras_unsupported")
        if (
            not isinstance(room, dict)
            or room.get("checkin_date") != start.isoformat()
            or room.get("checkout_date") != end.isoformat()
        ):
            invalid()
        prices = room.get("days")
        if not isinstance(prices, dict) or set(prices) != nights:
            invalid("booking_rates_incomplete")
        prices = {day: money_value(value, allow_zero=True) for day, value in prices.items()}
        if sum(prices.values(), Decimal(0)) != money_value(room.get("amount"), allow_zero=True):
            invalid("booking_amount_mismatch")
        room_extras = financial_lines(room.get("taxes"), "tax") + financial_lines(
            room.get("services"), "service"
        )
        included = sum((line["amount"] for line in room_extras if line["included"]), Decimal(0))
        if included > sum(prices.values(), Decimal(0)):
            invalid("booking_amount_mismatch")
        original_prices = dict(prices)
        prices = dict(zip(prices, allocate_discount(list(prices.values()), included)))
        extras.extend(room_extras)
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
                "providerPrices": original_prices,
                "occupancy": count,
            }
        )
    amount = money_value(raw.get("amount"), allow_zero=True)
    if (
        sum((sum(r["prices"].values(), Decimal(0)) for r in parsed), Decimal(0))
        + sum((line["amount"] for line in extras), Decimal(0))
        != amount
    ):
        invalid("booking_amount_mismatch")
    commission = raw.get("ota_commission")
    if commission is not None:
        try:
            commission = money_value(commission, allow_zero=True, limit=amount)
        except ApiError:
            invalid("booking_commission_unsupported")
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
        extras=extras,
        amount=amount,
        currency=raw["currency"],
        name=name,
        phone=text(customer.get("phone"), 40),
        email=text(customer.get("mail"), 254),
        source=text(raw.get("ota_name"), 160, required=True),
        paymentCollect=payment_collect,
        otaCommission=commission,
    )
    return result


def review_details(entity):
    """Retain bounded reconciliation fields, never guarantees or arbitrary provider data."""
    raw = entity["attributes"]

    def value(item, length):
        return "".join(c for c in item[:length] if ord(c) >= 32) if isinstance(item, str) else None

    details = {
        key: value(raw.get(source), limit)
        for key, source, limit in (
            ("source", "ota_name", 160),
            ("bookingCode", "unique_id", 160),
            ("arrivalDate", "arrival_date", 10),
            ("departureDate", "departure_date", 10),
            ("currency", "currency", 3),
            ("amount", "amount", 48),
            ("otaCommission", "ota_commission", 48),
        )
    }
    details["hasTaxes"] = bool(raw.get("taxes"))
    details["hasCollectedTaxes"] = bool(raw.get("collected_taxes"))
    details["paymentCollect"] = value(raw.get("payment_collect"), 20)

    def extras(items):
        return (
            [
                {
                    "name": value(line.get("name"), 200),
                    "totalPrice": value(line.get("total_price"), 48),
                    "type": value(line.get("type"), 80),
                    "included": line.get("is_inclusive") is True,
                    "withheld": line.get("is_withheld") is True,
                }
                for line in items[:100]
                if isinstance(line, dict)
            ]
            if isinstance(items, list)
            else []
        )

    details["services"] = extras(raw.get("services"))
    details["taxes"] = extras(raw.get("taxes"))
    details["collectedTaxes"] = extras(raw.get("collected_taxes"))
    details["rooms"] = []
    raw_rooms = raw.get("rooms")
    for room in raw_rooms[:20] if isinstance(raw_rooms, list) else []:
        if not isinstance(room, dict):
            continue
        occupancy = room.get("occupancy")
        details["rooms"].append(
            {
                "roomTypeId": value(room.get("room_type_id"), 36),
                "ratePlanId": value(room.get("rate_plan_id"), 36),
                "amount": value(room.get("amount"), 48),
                "hasTaxes": bool(room.get("taxes")),
                "hasCollectedTaxes": bool(room.get("collected_taxes")),
                "taxes": extras(room.get("taxes")),
                "collectedTaxes": extras(room.get("collected_taxes")),
                "services": extras(room.get("services")),
                "days": {
                    day: value(amount, 48)
                    for day, amount in list(room["days"].items())[:366]
                    if isinstance(day, str) and len(day) == 10
                }
                if isinstance(room.get("days"), dict)
                else {},
                "occupancy": {
                    key: occupancy.get(key)
                    for key in ("adults", "children", "infants")
                    if isinstance(occupancy, dict)
                    and type(occupancy.get(key)) is int
                    and 0 <= occupancy[key] <= 50
                },
            }
        )
    return details
