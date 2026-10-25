"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_tenant
from . import commissions_application as application


class ListCommissionsView(CommonMethodView):
    @staticmethod
    @require_tenant("cashbook.view")
    def dispatch_request(tenant_id):
        return application.handle_list_commissions(tenant_id)


class SettleCommissionView(CommonMethodView):
    @staticmethod
    @require_tenant("cashbook.write")
    def dispatch_request(tenant_id):
        return application.handle_settle_commission(tenant_id)


class PayCommissionView(CommonMethodView):
    @staticmethod
    @require_tenant("cashbook.write")
    def dispatch_request(tenant_id, commission_id):
        return application.handle_pay_commission(tenant_id, commission_id)


def __getattr__(name):
    return getattr(application, name)
