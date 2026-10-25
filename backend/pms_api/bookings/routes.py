"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_tenant
from . import application as application


class ListReservationsView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.view")
    def dispatch_request(tenant_id):
        return application.handle_list_reservations(tenant_id)


class ReservationDetailView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.view")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_reservation_detail(tenant_id, reservation_id)


class CreateReservationView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.write")
    def dispatch_request(tenant_id):
        return application.handle_create_reservation(tenant_id)


class EditReservationView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.write")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_edit_reservation(tenant_id, reservation_id)


class ChangeStatusView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.write")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_change_status(tenant_id, reservation_id)


class RoomConditionView(CommonMethodView):
    @staticmethod
    @require_tenant("housekeeping.write")
    def dispatch_request(tenant_id, number):
        return application.handle_room_condition(tenant_id, number)


class AddChargeView(CommonMethodView):
    @staticmethod
    @require_tenant("payments.write")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_add_charge(tenant_id, reservation_id)


class AddPaymentView(CommonMethodView):
    @staticmethod
    @require_tenant("payments.write")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_add_payment(tenant_id, reservation_id)


class RefundPaymentView(CommonMethodView):
    @staticmethod
    @require_tenant("payments.write")
    def dispatch_request(tenant_id, reservation_id, payment_id):
        return application.handle_refund_payment(tenant_id, reservation_id, payment_id)


class AdjustClosedStayView(CommonMethodView):
    @staticmethod
    @require_tenant("finance.adjust")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_adjust_closed_stay(tenant_id, reservation_id)


class AddNoteView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.write")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_add_note(tenant_id, reservation_id)


def __getattr__(name):
    if name in {"URL", "booking"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    if hasattr(application, name):
        return getattr(application, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
