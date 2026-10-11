"""Persisted housekeeping work, assignment and inspection within the request transaction."""

import re
from datetime import datetime, time
from zoneinfo import ZoneInfo

from flask import g, request
from sqlalchemy import select

from common import CommonMethodView, ValueFormatter

from ..bookings.models import Reservation, ReservationRoom
from ..catalog.models import PhysicalRoom
from ..catalog.routes import bool_value, parse_date, text_value
from ..core_models import TenantUser, User, utcnow
from ..extensions import db
from ..security import ApiError, audit, payload, require_tenant
from .models import HousekeepingLog, HousekeepingShift, HousekeepingStaff, HousekeepingTask

OPEN_TASKS = {"pending", "in_progress", "inspection"}


def local_date():
    return datetime.now(ZoneInfo(g.tenant.settings.get("timezone", "Asia/Ho_Chi_Minh"))).date()


def iso(value):
    return ValueFormatter.iso(value)


def manager_only():
    if g.role not in {"HOTEL_OWNER", "FRONT_DESK"}:
        raise ApiError(403, "forbidden", "Chỉ quản lý hoặc lễ tân được điều phối buồng phòng.")


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


def staff_json(row):
    return {
        "id": row.id,
        "name": row.name,
        "phone": row.phone,
        "userId": row.user_id,
        "active": row.active,
    }


def shift_json(row):
    return {
        "id": row.id,
        "staffId": row.staff_id,
        "date": iso(row.date),
        "startTime": row.start_time.strftime("%H:%M"),
        "endTime": row.end_time.strftime("%H:%M"),
        "note": row.note,
        "active": row.active,
    }


def task_json(row, rooms=None):
    room = (
        rooms.get(row.room_id) if rooms is not None else db.session.get(PhysicalRoom, row.room_id)
    )
    return {
        "id": row.id,
        "roomId": row.room_id,
        "room": room.number if room else "",
        "date": iso(row.date),
        "kind": row.kind,
        "bookingId": row.reservation_id,
        "staffId": row.staff_id,
        "shiftId": row.shift_id,
        "status": row.status,
        "note": row.note,
        "revision": row.revision,
        "createdAt": iso(row.created_at),
        "startedAt": iso(row.started_at),
        "completedAt": iso(row.completed_at),
    }


def work_log(event, *, task=None, room=None, details=None, entity_type=None, entity_id=None):
    details = details or {}
    db.session.add(
        HousekeepingLog(
            tenant_id=g.tenant.id,
            task_id=task.id if task else None,
            room_id=room.id if room else task.room_id if task else None,
            user_id=g.user.id,
            event=event,
            details=details,
        )
    )
    audit(
        event,
        entity_type or ("housekeeping_task" if task else "room"),
        entity_id or (task.id if task else room.number),
        details,
    )


def member_link(tenant_id, user_id):
    if user_id is None:
        return
    user_id = text_value(user_id, "Tài khoản", 40)
    user = db.session.scalar(
        select(User).where(User.id == user_id, User.active.is_(True)).with_for_update(read=True)
    )
    member = db.session.scalar(
        select(TenantUser)
        .where(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == user_id,
            TenantUser.active.is_(True),
            TenantUser.role == "HOUSEKEEPING",
        )
        .with_for_update(read=True)
    )
    if not user or not member:
        raise ApiError(
            422,
            "invalid_staff_user",
            "Tài khoản phải là thành viên buồng phòng đang hoạt động của khách sạn.",
        )


def find_staff(tenant_id, staff_id, *, active=False, locked=False):
    staff_id = text_value(staff_id, "Mã nhân viên", 40)
    statement = select(HousekeepingStaff).where(
        HousekeepingStaff.tenant_id == tenant_id, HousekeepingStaff.id == staff_id
    )
    if active:
        statement = statement.where(HousekeepingStaff.active.is_(True))
    if locked:
        statement = statement.with_for_update(read=True).execution_options(populate_existing=True)
    row = db.session.scalar(statement)
    if not row:
        raise ApiError(404, "not_found", "Không tìm thấy nhân viên buồng phòng.")
    if active:
        member_link(tenant_id, row.user_id)
    return row


def staff_values(tenant_id, data, row=None):
    known_fields(data, {"name", "phone", "userId", "active"})
    row = row or HousekeepingStaff(tenant_id=tenant_id)
    row.name = text_value(data.get("name", row.name), "Tên nhân viên", 160)
    row.phone = text_value(data.get("phone", row.phone or ""), "Điện thoại", 40, empty=True)
    user_id = data.get("userId", row.user_id)
    active = bool_value(data.get("active", row.active if row.active is not None else True))
    if user_id is not None:
        user_id = text_value(user_id, "Tài khoản", 40)
        if active or user_id != row.user_id:
            member_link(tenant_id, user_id)
    if (
        row.id
        and (not active or user_id != row.user_id)
        and db.session.scalar(
            select(HousekeepingTask.id)
            .where(
                HousekeepingTask.tenant_id == tenant_id,
                HousekeepingTask.staff_id == row.id,
                HousekeepingTask.status.in_(OPEN_TASKS),
            )
            .limit(1)
        )
    ):
        raise ApiError(
            409,
            "staff_busy",
            "Cần chuyển công việc đang mở trước khi ngừng hoặc đổi tài khoản nhân viên.",
        )
    row.user_id, row.active = user_id, active
    db.session.add(row)
    db.session.flush()
    work_log(
        "housekeeping.staff_updated",
        entity_type="housekeeping_staff",
        entity_id=row.id,
        details={"active": row.active, "userId": row.user_id},
    )
    return row


def own_staff_ids(tenant_id):
    return select(HousekeepingStaff.id).where(
        HousekeepingStaff.tenant_id == tenant_id,
        HousekeepingStaff.user_id == g.user.id,
        HousekeepingStaff.active.is_(True),
    )


class ListStaffView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.view")
    def dispatch_request(tenant_id):
        statement = select(HousekeepingStaff).where(HousekeepingStaff.tenant_id == tenant_id)
        if g.role == "HOUSEKEEPING":
            statement = statement.where(HousekeepingStaff.id.in_(own_staff_ids(tenant_id)))
        return {
            "staff": [
                staff_json(row)
                for row in db.session.scalars(statement.order_by(HousekeepingStaff.name))
            ]
        }


class CreateStaffView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id):
        manager_only()
        return staff_json(staff_values(tenant_id, payload())), 201


class UpdateStaffView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, staff_id):
        manager_only()
        row = db.session.scalar(
            select(HousekeepingStaff)
            .where(
                HousekeepingStaff.tenant_id == tenant_id,
                HousekeepingStaff.id == staff_id,
            )
            .with_for_update()
        )
        if not row:
            raise ApiError(404, "not_found", "Không tìm thấy nhân viên buồng phòng.")
        return staff_json(staff_values(tenant_id, payload(), row))


def shift_values(tenant_id, data, row=None):
    known_fields(data, {"staffId", "date", "startTime", "endTime", "note", "active"})
    row = row or HousekeepingShift(tenant_id=tenant_id)
    staff_id = text_value(data.get("staffId", row.staff_id), "Mã nhân viên", 40)
    active = bool_value(data.get("active", row.active if row.active is not None else True))
    find_staff(tenant_id, staff_id, active=active, locked=True)
    day = parse_date(data.get("date", row.date))
    start, end = shift_times(
        data.get("startTime", row.start_time.strftime("%H:%M") if row.start_time else None),
        data.get("endTime", row.end_time.strftime("%H:%M") if row.end_time else None),
    )
    if (
        row.id
        and (
            staff_id != row.staff_id
            or day != row.date
            or not active
            or start != row.start_time
            or end != row.end_time
        )
        and db.session.scalar(
            select(HousekeepingTask.id)
            .where(
                HousekeepingTask.tenant_id == tenant_id,
                HousekeepingTask.shift_id == row.id,
                HousekeepingTask.status.in_(OPEN_TASKS),
            )
            .limit(1)
        )
    ):
        raise ApiError(409, "shift_busy", "Ca còn công việc đang mở; cần chuyển công việc trước.")
    if active and db.session.scalar(
        select(HousekeepingShift.id)
        .where(
            HousekeepingShift.tenant_id == tenant_id,
            HousekeepingShift.staff_id == staff_id,
            HousekeepingShift.date == day,
            HousekeepingShift.active.is_(True),
            HousekeepingShift.start_time < end,
            HousekeepingShift.end_time > start,
            HousekeepingShift.id != (row.id or ""),
        )
        .limit(1)
    ):
        raise ApiError(409, "shift_overlap", "Ca làm việc bị chồng giờ.")
    row.staff_id, row.date, row.start_time, row.end_time, row.active = (
        staff_id,
        day,
        start,
        end,
        active,
    )
    row.note = text_value(data.get("note", row.note or ""), "Ghi chú", 500, empty=True)
    db.session.add(row)
    db.session.flush()
    work_log(
        "housekeeping.shift_updated",
        entity_type="housekeeping_shift",
        entity_id=row.id,
        details={"staffId": staff_id, "date": iso(day), "active": active},
    )
    return row


class ListShiftsView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.view")
    def dispatch_request(tenant_id):
        statement = select(HousekeepingShift).where(HousekeepingShift.tenant_id == tenant_id)
        if "date" in request.args:
            statement = statement.where(HousekeepingShift.date == parse_date(request.args["date"]))
        if g.role == "HOUSEKEEPING":
            statement = statement.where(HousekeepingShift.staff_id.in_(own_staff_ids(tenant_id)))
        return {
            "shifts": [
                shift_json(row)
                for row in db.session.scalars(
                    statement.order_by(
                        HousekeepingShift.date.desc(), HousekeepingShift.start_time
                    ).limit(500)
                )
            ]
        }


class CreateShiftView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id):
        manager_only()
        return shift_json(shift_values(tenant_id, payload())), 201


class UpdateShiftView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, shift_id):
        manager_only()
        row = db.session.scalar(
            select(HousekeepingShift)
            .where(
                HousekeepingShift.tenant_id == tenant_id,
                HousekeepingShift.id == shift_id,
            )
            .with_for_update()
        )
        if not row:
            raise ApiError(404, "not_found", "Không tìm thấy ca làm việc.")
        return shift_json(shift_values(tenant_id, payload(), row))


def task_rows(tenant_id, day=None):
    statement = select(HousekeepingTask).where(HousekeepingTask.tenant_id == tenant_id)
    if day is not None:
        statement = statement.where(HousekeepingTask.date == day)
    if getattr(g, "role", None) == "HOUSEKEEPING":
        statement = statement.where(HousekeepingTask.staff_id.in_(own_staff_ids(tenant_id)))
    return list(
        db.session.scalars(
            statement.order_by(
                HousekeepingTask.date.desc(), HousekeepingTask.created_at.desc()
            ).limit(500)
        )
    )


class ListTasksView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.view")
    def dispatch_request(tenant_id):
        day = parse_date(request.args["date"]) if "date" in request.args else local_date()
        rooms = {
            row.id: row
            for row in db.session.scalars(
                select(PhysicalRoom).where(PhysicalRoom.tenant_id == tenant_id)
            )
        }
        return {
            "date": iso(day),
            "tasks": [task_json(row, rooms) for row in task_rows(tenant_id, day)],
        }


def add_task(room, day, kind, source_key, reservation_id=None):
    existing = db.session.scalar(
        select(HousekeepingTask).where(
            HousekeepingTask.tenant_id == room.tenant_id,
            HousekeepingTask.source_key == source_key,
        )
    )
    if existing:
        return existing, False
    row = HousekeepingTask(
        tenant_id=room.tenant_id,
        room_id=room.id,
        date=day,
        kind=kind,
        source_key=source_key,
        reservation_id=reservation_id,
        room_revision=room.housekeeping_revision,
    )
    db.session.add(row)
    db.session.flush()
    work_log(
        "housekeeping.task_created", task=row, room=room, details={"kind": kind, "date": iso(day)}
    )
    return row, True


class GeneratePlanView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id):
        manager_only()
        data = payload()
        known_fields(data, {"date"})
        day = parse_date(data.get("date"))
        # Match checkout lock order: reservation references before rooms.
        stays = db.session.execute(
            select(ReservationRoom, Reservation)
            .join(
                Reservation,
                (Reservation.id == ReservationRoom.reservation_id)
                & (Reservation.tenant_id == ReservationRoom.tenant_id),
            )
            .where(
                ReservationRoom.tenant_id == tenant_id,
                Reservation.status.in_({"CONFIRMED", "IN_HOUSE", "CHECKED_OUT"}),
                Reservation.check_in <= day,
                Reservation.check_out >= day,
            )
            .order_by(Reservation.id)
            .with_for_update(read=True, key_share=True, of=Reservation)
        ).all()
        rooms = list(
            db.session.scalars(
                select(PhysicalRoom)
                .where(
                    PhysicalRoom.tenant_id == tenant_id,
                    PhysicalRoom.active.is_(True),
                )
                .order_by(PhysicalRoom.number)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
        )
        room_map = {row.id: row for row in rooms}
        created, covered = 0, set()
        for link, stay in stays:
            room = room_map.get(link.room_id)
            if not room or room.condition == "maintenance":
                continue
            if stay.check_out == day:
                kind = "departure"
            elif stay.check_in == day and stay.status != "CHECKED_OUT":
                kind = "arrival"
            elif stay.check_in < day < stay.check_out and stay.status == "IN_HOUSE":
                kind = "stayover"
            else:
                continue
            # Checkout and daily-plan retries refer to one immutable intent.
            source = (
                f"checkout:{stay.id}:{room.id}"
                if stay.status == "CHECKED_OUT" and stay.check_out == day
                else f"plan:{day}:{kind}:{stay.id}:{room.id}"
            )
            _, added = add_task(room, day, kind, source, stay.id)
            created += added
            covered.add(room.id)
        open_rooms = set(
            db.session.scalars(
                select(HousekeepingTask.room_id).where(
                    HousekeepingTask.tenant_id == tenant_id,
                    HousekeepingTask.status.in_(OPEN_TASKS),
                )
            )
        )
        for room in rooms:
            if room.id not in covered and room.id not in open_rooms and room.condition == "dirty":
                _, added = add_task(
                    room, day, "dirty", f"dirty:{room.id}:{room.housekeeping_revision}"
                )
                created += added
        work_log(
            "housekeeping.plan_generated",
            entity_type="housekeeping_plan",
            entity_id=iso(day),
            details={"date": iso(day), "created": created},
        )
        return {
            "date": iso(day),
            "created": created,
            "tasks": [task_json(row, room_map) for row in task_rows(tenant_id, day)],
        }, 201


def find_task_locked(tenant_id, task_id):
    task = db.session.scalar(
        select(HousekeepingTask).where(
            HousekeepingTask.tenant_id == tenant_id, HousekeepingTask.id == task_id
        )
    )
    if not task:
        raise ApiError(404, "not_found", "Không tìm thấy công việc buồng phòng.")
    # Every workflow locks room first, then tasks. Checkout uses the same order.
    room = db.session.scalar(
        select(PhysicalRoom)
        .where(PhysicalRoom.tenant_id == tenant_id, PhysicalRoom.id == task.room_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    task = db.session.scalar(
        select(HousekeepingTask)
        .where(HousekeepingTask.tenant_id == tenant_id, HousekeepingTask.id == task_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return task, room


def task_current(task, room):
    if task.room_revision != room.housekeeping_revision or not room.active:
        raise ApiError(
            409, "stale_room", "Phòng đã đổi lượt lưu trú hoặc tình trạng; cần dùng công việc mới."
        )


class AssignTaskView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, task_id):
        manager_only()
        data = payload()
        known_fields(data, {"staffId", "shiftId", "revision"})
        if "staffId" not in data:
            raise ApiError(422, "invalid_staff", "Cần mã nhân viên hoặc null để gỡ phân công.")
        task, room = find_task_locked(tenant_id, task_id)
        revision_value(data, task)
        task_current(task, room)
        if task.status not in OPEN_TASKS:
            raise ApiError(409, "task_closed", "Công việc đã đóng.")
        staff_id, shift_id = data.get("staffId"), data.get("shiftId")
        if staff_id is not None:
            staff_id = text_value(staff_id, "Mã nhân viên", 40)
            find_staff(tenant_id, staff_id, active=True, locked=True)
        elif shift_id is not None:
            raise ApiError(422, "invalid_shift", "Ca phải được gắn với nhân viên.")
        if shift_id is not None:
            shift_id = text_value(shift_id, "Mã ca", 40)
            shift = db.session.scalar(
                select(HousekeepingShift)
                .where(
                    HousekeepingShift.tenant_id == tenant_id,
                    HousekeepingShift.id == shift_id,
                    HousekeepingShift.staff_id == staff_id,
                    HousekeepingShift.date == task.date,
                    HousekeepingShift.active.is_(True),
                )
                .with_for_update(read=True)
            )
            if not shift:
                raise ApiError(
                    422, "invalid_shift", "Ca phải thuộc nhân viên, cùng ngày và đang hoạt động."
                )
        previous = task.staff_id
        task.staff_id, task.shift_id, task.status = staff_id, shift_id, "pending"
        task.started_at = None
        task.revision += 1
        if room.condition == "inspection":
            room.condition = "dirty"
        work_log(
            "housekeeping.task_assigned",
            task=task,
            room=room,
            details={"fromStaffId": previous, "staffId": staff_id, "shiftId": shift_id},
        )
        db.session.flush()
        return task_json(task)


class ChangeTaskStatusView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, task_id):
        data = payload()
        known_fields(data, {"status", "note", "revision"})
        task, room = find_task_locked(tenant_id, task_id)
        revision_value(data, task)
        task_current(task, room)
        status = data.get("status")
        if not isinstance(status, str):
            raise ApiError(422, "invalid_status", "Trạng thái công việc không hợp lệ.")
        staff = (
            find_staff(tenant_id, task.staff_id, active=True, locked=True)
            if task.staff_id and (g.role == "HOUSEKEEPING" or status != "cancelled")
            else None
        )
        if g.role == "HOUSEKEEPING":
            if not staff or staff.user_id != g.user.id:
                raise ApiError(
                    403, "not_assigned", "Bạn chỉ được cập nhật công việc được giao cho mình."
                )
            if status not in {"in_progress", "inspection"}:
                raise ApiError(
                    403, "inspection_required", "Cần lễ tân hoặc quản lý kiểm tra và xác nhận sạch."
                )
        else:
            manager_only()
        transitions = {
            "pending": {"in_progress", "cancelled"},
            "in_progress": {"inspection", "cancelled"},
            "inspection": {"completed", "in_progress", "cancelled"},
        }
        if status not in transitions.get(task.status, set()):
            raise ApiError(
                409, "invalid_transition", "Trạng thái công việc không cho phép thao tác này."
            )
        if status != "cancelled":
            if task.date > local_date():
                raise ApiError(
                    409, "outside_work_date", "Chưa đến ngày thực hiện công việc được lập kế hoạch."
                )
            if room.condition == "maintenance":
                raise ApiError(409, "room_maintenance", "Phòng đang bảo trì.")
            if task.kind in {"checkout", "departure"}:
                stay = db.session.get(Reservation, task.reservation_id)
                if not stay or stay.status != "CHECKED_OUT":
                    raise ApiError(
                        409,
                        "departure_pending",
                        "Khách chưa trả phòng; chưa thể bắt đầu dọn lượt trả phòng.",
                    )
            if status == "completed" and room.condition != "inspection":
                raise ApiError(
                    409,
                    "inspection_required",
                    "Phòng phải ở trạng thái đang kiểm tra trước khi xác nhận sạch.",
                )
            if status == "in_progress" and db.session.scalar(
                select(HousekeepingTask.id)
                .where(
                    HousekeepingTask.tenant_id == tenant_id,
                    HousekeepingTask.room_id == room.id,
                    HousekeepingTask.id != task.id,
                    HousekeepingTask.status.in_({"in_progress", "inspection"}),
                )
                .limit(1)
            ):
                raise ApiError(
                    409, "room_work_active", "Phòng đã có công việc đang dọn hoặc đang kiểm tra."
                )
        previous = task.status
        task.status = status
        task.revision += 1
        if "note" in data:
            task.note = text_value(data["note"], "Ghi chú", 1000, empty=True)
        if status == "in_progress":
            task.started_at = task.started_at or utcnow()
            room.condition = "dirty"
        elif status == "inspection":
            room.condition = "inspection"
        elif status == "completed":
            task.completed_at = utcnow()
            room.condition = "clean"
        elif room.condition == "inspection":
            room.condition = "dirty"
        work_log(
            "housekeeping.task_status",
            task=task,
            room=room,
            details={
                "from": previous,
                "to": status,
                "condition": room.condition,
                "note": task.note,
            },
        )
        audit(
            f"room.{room.condition}",
            "room",
            room.number,
            {"condition": room.condition, "taskId": task.id},
        )
        db.session.flush()
        return task_json(task)


def invalidate_room_tasks(room, reason):
    """Caller holds the room lock; a previous occupant's work must never clean a new stay."""
    room.housekeeping_revision += 1
    tasks = db.session.scalars(
        select(HousekeepingTask)
        .where(
            HousekeepingTask.tenant_id == room.tenant_id,
            HousekeepingTask.room_id == room.id,
            HousekeepingTask.status.in_(OPEN_TASKS),
        )
        .order_by(HousekeepingTask.id)
        .with_for_update()
    )
    for task in tasks:
        task.status = "cancelled"
        task.revision += 1
        work_log("housekeeping.task_superseded", task=task, room=room, details={"reason": reason})


def guard_room_condition(room, condition):
    tasks = list(
        db.session.scalars(
            select(HousekeepingTask).where(
                HousekeepingTask.tenant_id == room.tenant_id,
                HousekeepingTask.room_id == room.id,
                HousekeepingTask.status.in_(OPEN_TASKS),
            )
        )
    )
    if (
        g.role == "HOUSEKEEPING"
        or room.condition == "inspection"
        or any(task.staff_id for task in tasks)
    ):
        raise ApiError(
            409,
            "task_workflow_required",
            "Cần cập nhật phòng qua công việc được giao và bước kiểm tra.",
        )
    if condition == "inspection":
        raise ApiError(
            409,
            "task_workflow_required",
            "Trạng thái đang kiểm tra phải được gửi từ công việc dọn phòng.",
        )


def checkout_task(room, reservation):
    invalidate_room_tasks(room, "checkout")
    return add_task(
        room, local_date(), "checkout", f"checkout:{reservation.id}:{room.id}", reservation.id
    )[0]


def housekeeping_snapshot(tenant_id):
    staff = select(HousekeepingStaff).where(HousekeepingStaff.tenant_id == tenant_id)
    shifts = select(HousekeepingShift).where(HousekeepingShift.tenant_id == tenant_id)
    logs = select(HousekeepingLog).where(HousekeepingLog.tenant_id == tenant_id)
    if getattr(g, "role", None) == "HOUSEKEEPING":
        staff = staff.where(HousekeepingStaff.id.in_(own_staff_ids(tenant_id)))
        shifts = shifts.where(HousekeepingShift.staff_id.in_(own_staff_ids(tenant_id)))
        logs = logs.where(
            HousekeepingLog.task_id.in_(
                select(HousekeepingTask.id).where(
                    HousekeepingTask.tenant_id == tenant_id,
                    HousekeepingTask.staff_id.in_(own_staff_ids(tenant_id)),
                )
            )
        )
    rooms = {
        row.id: row
        for row in db.session.scalars(
            select(PhysicalRoom).where(PhysicalRoom.tenant_id == tenant_id)
        )
    }
    events = list(db.session.scalars(logs.order_by(HousekeepingLog.created_at.desc()).limit(100)))
    actors = (
        {
            row.id: row.name
            for row in db.session.scalars(
                select(User).where(User.id.in_({event.user_id for event in events}))
            )
        }
        if events
        else {}
    )
    return {
        "housekeepingAccounts": [
            {"id": user.id, "name": user.name}
            for user in db.session.scalars(
                select(User)
                .join(TenantUser, TenantUser.user_id == User.id)
                .where(
                    TenantUser.tenant_id == tenant_id,
                    TenantUser.role == "HOUSEKEEPING",
                    TenantUser.active.is_(True),
                    User.active.is_(True),
                )
                .order_by(User.name)
            )
        ]
        if g.role in {"HOTEL_OWNER", "FRONT_DESK"}
        else [],
        "housekeepingStaff": [
            staff_json(row) for row in db.session.scalars(staff.order_by(HousekeepingStaff.name))
        ],
        "housekeepingShifts": [
            shift_json(row)
            for row in db.session.scalars(shifts.order_by(HousekeepingShift.date.desc()).limit(500))
        ],
        "housekeepingTasks": [task_json(row, rooms) for row in task_rows(tenant_id)],
        "housekeepingWorkLogs": [
            {
                "id": row.id,
                "taskId": row.task_id,
                "room": rooms[row.room_id].number if row.room_id in rooms else None,
                "action": row.event,
                "details": row.details,
                "condition": row.details.get("condition"),
                "createdAt": iso(row.created_at),
                "actorId": row.user_id,
                "actor": actors.get(row.user_id, ""),
            }
            for row in events
        ],
    }


def __getattr__(name):
    if name in {"URL", "housekeeping"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
