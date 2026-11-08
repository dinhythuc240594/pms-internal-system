"""Booking input tests: financial values must never silently round user input."""

import unittest
from decimal import Decimal

from pms_api.bookings.routes import money_value, stay_dates
from pms_api.security import ApiError


class BookingValueTests(unittest.TestCase):
    def test_money_is_exact_and_accepts_four_decimal_places(self):
        self.assertEqual(money_value("123.4567"), Decimal("123.4567"))

    def test_money_rejects_nonfinite_negative_or_excess_precision(self):
        for value in ("NaN", "Infinity", "-1", "1.00001", True, "1e40"):
            with self.subTest(value=value), self.assertRaises(ApiError):
                money_value(value)

    def test_zero_allowed_only_when_requested(self):
        self.assertEqual(money_value("0", allow_zero=True), Decimal(0))
        with self.assertRaises(ApiError):
            money_value("0")

    def test_stay_uses_half_open_dates_and_bounds_length(self):
        start, end = stay_dates("2026-10-03", "2026-10-04")
        self.assertEqual((end - start).days, 1)
        for dates in (
            ("2026-10-04", "2026-10-04"),
            ("2026-10-04", "2026-10-03"),
            ("2026-10-03", "2028-10-03"),
            ("bad", "2026-10-04"),
        ):
            with self.subTest(dates=dates), self.assertRaises(ApiError):
                stay_dates(*dates)
