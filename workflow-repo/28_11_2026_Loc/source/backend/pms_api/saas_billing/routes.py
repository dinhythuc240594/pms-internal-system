"""HTTP entry points; business behavior is implemented in the application layer."""

from common import CommonMethodView

from ..security import require_system, require_tenant
from . import application as application


class ListInvoicesView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_list_invoices()


class TenantBillingView(CommonMethodView):
    @staticmethod
    @require_tenant("billing.view")
    def dispatch_request(tenant_id):
        return application.handle_tenant_billing(tenant_id)


class TenantInvoicesView(CommonMethodView):
    @staticmethod
    @require_tenant("billing.view")
    def dispatch_request(tenant_id):
        return application.handle_tenant_invoices(tenant_id)


class TenantInvoiceView(CommonMethodView):
    @staticmethod
    @require_tenant("billing.view")
    def dispatch_request(tenant_id, invoice_id):
        # The same immutable document and payment values shown in Manager.
        return application.handle_tenant_invoice(tenant_id, invoice_id)


class TenantBillingHistoryView(CommonMethodView):
    @staticmethod
    @require_tenant("billing.view")
    def dispatch_request(tenant_id):
        return application.handle_tenant_billing_history(tenant_id)


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


class RefundPaymentView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(invoice_id, payment_id):
        return application.handle_refund_payment(invoice_id, payment_id)


class OperationalAccessView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        return application.handle_operational_access(tenant_id)


class OverviewView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_overview()


def __getattr__(name):
    if name in {"URL", "billing"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    return getattr(application, name)
