"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_system
from . import application as application


class ListInvoicesView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_list_invoices()


class CreateInvoiceView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_create_invoice()


class AddPaymentView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(invoice_id):
        return application.handle_add_payment(invoice_id)


class VoidInvoiceView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(invoice_id):
        return application.handle_void_invoice(invoice_id)


class OverviewView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_overview()


def __getattr__(name):
    if name in {"URL", "billing"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    if hasattr(application, name):
        return getattr(application, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
