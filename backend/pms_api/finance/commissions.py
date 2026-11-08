"""HTTP entry points; business behavior is implemented in the application layer."""

from common import CommonMethodView

from ..security import require_tenant
from . import commissions_application as application


class CommissionReviewPreviewView(CommonMethodView):
    @staticmethod
    @require_tenant("cashbook.view")
    def dispatch_request(tenant_id, commission_id):
        return application.handle_commission_review_preview(tenant_id, commission_id)


class ReviewCommissionView(CommonMethodView):
    @staticmethod
    @require_tenant("cashbook.write")
    def dispatch_request(tenant_id, commission_id):
        return application.handle_review_commission(tenant_id, commission_id)


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


class RecoverCommissionView(CommonMethodView):
    @staticmethod
    @require_tenant("cashbook.write")
    def dispatch_request(tenant_id, commission_id):
        return application.handle_recover_commission(tenant_id, commission_id)


def __getattr__(name):
    return getattr(application, name)
