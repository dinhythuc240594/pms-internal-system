"""Routing metadata; handlers load only when their route is dispatched."""

from flask import Blueprint

from common import CommonURL


class URL(CommonURL):
    LIST_INVOICES = "/api/billing/invoices"
    CREATE_INVOICE = "/api/billing/invoices"
    ADD_PAYMENT = "/api/billing/invoices/<invoice_id>/payments"
    VOID_INVOICE = "/api/billing/invoices/<invoice_id>/void"
    OVERVIEW = "/api/manager/overview"


billing = Blueprint("saas_billing", __name__)

URL.register(
    billing,
    URL.LIST_INVOICES,
    "pms_api.saas_billing.routes:ListInvoicesView",
    endpoint="list_invoices",
    methods=["GET"],
)

URL.register(
    billing,
    URL.CREATE_INVOICE,
    "pms_api.saas_billing.routes:CreateInvoiceView",
    endpoint="create_invoice",
    methods=["POST"],
)

URL.register(
    billing,
    URL.ADD_PAYMENT,
    "pms_api.saas_billing.routes:AddPaymentView",
    endpoint="add_payment",
    methods=["POST"],
)

URL.register(
    billing,
    URL.VOID_INVOICE,
    "pms_api.saas_billing.routes:VoidInvoiceView",
    endpoint="void_invoice",
    methods=["POST"],
)

URL.register(
    billing,
    URL.OVERVIEW,
    "pms_api.saas_billing.routes:OverviewView",
    endpoint="overview",
    methods=["GET"],
)
