import unittest

from pms_api.catalog.routes import date_range, money_value, validated_settings
from pms_api.security import ApiError


class CatalogValidationTests(unittest.TestCase):
    def test_stay_range_is_half_open(self):
        self.assertEqual(
            [day.isoformat() for day in date_range("2026-10-03", "2026-10-05")],
            ["2026-10-03", "2026-10-04"],
        )

    def test_invalid_and_unbounded_ranges_are_rejected(self):
        for start, end in [
            ("bad", "2026-10-05"),
            ("2026-10-03", "2026-10-03"),
            ("2026-10-03", "2030-10-04"),
        ]:
            with self.subTest(start=start, end=end), self.assertRaises(ApiError):
                date_range(start, end)

    def test_price_never_accepts_non_finite_negative_or_excess_precision(self):
        for value in ["NaN", "Infinity", "-1", "0.00001", "1000000000000000", True]:
            with self.subTest(value=value), self.assertRaises(ApiError):
                money_value(value)
        self.assertEqual(str(money_value("12.3400")), "12.3400")

    def test_settings_validate_timezone_and_local_clock(self):
        result = validated_settings(
            {
                "timezone": "Asia/Ho_Chi_Minh",
                "checkInTime": "14:00",
                "checkOutTime": "12:00",
                "currency": "VND",
            }
        )
        self.assertEqual(result["timezone"], "Asia/Ho_Chi_Minh")
        for value in [
            {"timezone": "Fake/Zone"},
            {"checkInTime": "25:61"},
            {"currency": "vnd"},
            {"unknown": "value"},
        ]:
            with self.subTest(value=value), self.assertRaises(ApiError):
                validated_settings(value)
