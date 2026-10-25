"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_tenant
from . import application as application


class ListStaffView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.view")
    def dispatch_request(tenant_id):
        return application.handle_list_staff(tenant_id)


class CreateStaffView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id):
        return application.handle_create_staff(tenant_id)


class UpdateStaffView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, staff_id):
        return application.handle_update_staff(tenant_id, staff_id)


class ListShiftsView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.view")
    def dispatch_request(tenant_id):
        return application.handle_list_shifts(tenant_id)


class CreateShiftView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id):
        return application.handle_create_shift(tenant_id)


class UpdateShiftView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, shift_id):
        return application.handle_update_shift(tenant_id, shift_id)


class ListTasksView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.view")
    def dispatch_request(tenant_id):
        return application.handle_list_tasks(tenant_id)


class GeneratePlanView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id):
        return application.handle_generate_plan(tenant_id)


class CreateManualTaskView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id):
        return application.handle_create_manual_task(tenant_id)


class AssignTaskView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, task_id):
        return application.handle_assign_task(tenant_id, task_id)


class ChangeTaskStatusView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, task_id):
        return application.handle_change_task_status(tenant_id, task_id)


def __getattr__(name):
    if name in {"URL", "housekeeping"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    if hasattr(application, name):
        return getattr(application, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
