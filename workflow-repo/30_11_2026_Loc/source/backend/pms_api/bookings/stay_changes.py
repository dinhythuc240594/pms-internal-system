"""HTTP entry points; business behavior is implemented in the application layer."""

from common import CommonMethodView

from ..security import require_tenant
from . import stay_changes_application as application


class PreviewStayChangeView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.write")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_preview_stay_change(tenant_id, reservation_id)


class ConfirmStayChangeView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.write")
    def dispatch_request(tenant_id, reservation_id):
        return application.handle_confirm_stay_change(tenant_id, reservation_id)


def __getattr__(name):
    return getattr(application, name)
