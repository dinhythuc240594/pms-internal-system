"""Shift validation and optimistic versions reject ambiguous input before writes."""

import unittest
from types import SimpleNamespace

from pms_api.housekeeping.routes import revision_value, shift_times
from pms_api.security import ApiError


class HousekeepingValueTests(unittest.TestCase):
    def test_shift_times_are_same_day_and_exact_minutes(self):
        first, last = shift_times("08:00", "16:30")
        self.assertEqual((first.hour, last.minute), (8, 30))
        for first, last in (
            ("8:00", "12:00"),
            ("23:00", "06:00"),
            ("08:00", "08:00"),
            ("00:00", "24:00"),
            (True, "12:00"),
            ("08:00:10", "12:00"),
        ):
            with self.subTest(first=first, last=last), self.assertRaises(ApiError):
                shift_times(first, last)

    def test_task_revision_is_required_and_never_coerces_boolean_or_float(self):
        row = SimpleNamespace(revision=2)
        revision_value({"revision": 2}, row)
        for value in (None, True, "2", 2.0, 0):
            with self.subTest(value=value), self.assertRaises(ApiError) as caught:
                revision_value({"revision": value}, row)
            self.assertEqual(caught.exception.status, 422)
        with self.assertRaises(ApiError) as caught:
            revision_value({"revision": 1}, row)
        self.assertEqual(caught.exception.status, 409)
