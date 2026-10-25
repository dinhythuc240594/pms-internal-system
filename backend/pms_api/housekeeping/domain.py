"""Domain values and rules without Flask or database access."""

import re
from calendar import monthrange
from datetime import time, timedelta

from common.errors import ApiError

from ..catalog.domain import parse_date, text_value


def known_fields(data, allowed):
    if set(data) - set(allowed):
        raise ApiError(422, "invalid_input", "Nội dung chứa trường không được hỗ trợ.")


def shift_times(start, end):
    if any(
        not isinstance(v, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", v)
        for v in (start, end)
    ):
        raise ApiError(422, "invalid_shift", "Giờ ca phải theo HH:MM.")
    first, last = time.fromisoformat(start), time.fromisoformat(end)
    if first >= last:
        raise ApiError(
            422, "invalid_shift", "Giờ kết thúc ca phải sau giờ bắt đầu trong cùng ngày."
        )
    return first, last


def revision_value(data, task):
    revision = data.get("revision")
    if isinstance(revision, bool) or not isinstance(revision, int) or revision < 1:
        raise ApiError(422, "revision_required", "Cần phiên bản công việc hiện tại.")
    if revision != task.revision:
        raise ApiError(409, "stale_task", "Công việc đã đổi. Vui lòng tải lại trước khi thao tác.")


def shift_creation_dates(value, period="day"):
    if not isinstance(period, str) or period not in {"day", "week", "month"}:
        raise ApiError(422, "invalid_shift_period", "Chọn tạo ca cho 1 ngày, 7 ngày hoặc 1 tháng.")
    day = parse_date(value)
    count = 1 if period == "day" else 7
    if period == "month":
        next_month = day.month % 12 + 1
        next_year = day.year + (day.month == 12)
        count = (
            monthrange(day.year, day.month)[1]
            - day.day
            + min(day.day, monthrange(next_year, next_month)[1])
        )
    try:
        return [day + timedelta(days=index) for index in range(count)]
    except OverflowError:
        raise ApiError(
            422, "invalid_shift_period", "Khoảng tạo ca vượt giới hạn ngày hỗ trợ."
        ) from None


def plan_day_values(data, days, staff_ids):
    values = data.get("dayPlans", [])
    if not isinstance(values, list) or len(values) > len(days):
        raise ApiError(422, "invalid_day_plan", "Cấu hình theo ngày không hợp lệ.")
    plans = {}
    for value in values:
        if not isinstance(value, dict):
            raise ApiError(422, "invalid_day_plan", "Cấu hình theo ngày không hợp lệ.")
        known_fields(value, {"date", "roomIds", "shifts"})
        day = parse_date(value.get("date"))
        if day not in days or day in plans:
            raise ApiError(
                422, "invalid_day_plan", "Cấu hình phải thuộc ngày đã chọn và không trùng ngày."
            )
        room_ids = value.get("roomIds")
        if room_ids is not None:
            if not isinstance(room_ids, list) or not 1 <= len(room_ids) <= 500:
                raise ApiError(422, "invalid_plan_rooms", "Chọn từ 1 đến 500 phòng cho mỗi ngày.")
            room_ids = [text_value(item, "Mã phòng", 40) for item in room_ids]
            if len(set(room_ids)) != len(room_ids):
                raise ApiError(
                    422, "invalid_plan_rooms", "Danh sách phòng trong ngày không được trùng lặp."
                )
        selections = value.get("shifts", [])
        if not isinstance(selections, list) or len(selections) > len(staff_ids):
            raise ApiError(422, "invalid_plan_shifts", "Lựa chọn ca làm việc không hợp lệ.")
        shifts = {}
        for selection in selections:
            if not isinstance(selection, dict):
                raise ApiError(422, "invalid_plan_shifts", "Lựa chọn ca làm việc không hợp lệ.")
            known_fields(selection, {"staffId", "shiftId"})
            staff_id = text_value(selection.get("staffId"), "Mã nhân viên", 40)
            if staff_id not in staff_ids or staff_id in shifts or "shiftId" not in selection:
                raise ApiError(
                    422,
                    "invalid_plan_shifts",
                    "Ca phải thuộc nhân viên đã chọn và không trùng nhân viên.",
                )
            shift_id = selection["shiftId"]
            shifts[staff_id] = text_value(shift_id, "Mã ca", 40) if shift_id is not None else None
        plans[day] = {"room_ids": room_ids, "shifts": shifts}
    return plans
