"""Domain values and rules without Flask or database access."""

from decimal import Decimal

from common.errors import ApiError

from ..bookings.domain import MONEY_LIMIT


def line_amount(quantity, unit_price):
    amount = quantity * unit_price
    if amount > MONEY_LIMIT or amount != amount.quantize(Decimal("0.0001")):
        raise ApiError(
            422, "invalid_amount", "Thành tiền vượt giới hạn hoặc có hơn 4 số thập phân."
        )
    return amount.quantize(Decimal("0.0001"))
