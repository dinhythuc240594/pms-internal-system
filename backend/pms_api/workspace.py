"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from . import workspace_application as application
from .security import require_tenant


class WorkspaceView(CommonMethodView):
    @staticmethod
    @require_tenant("workspace.view")
    def dispatch_request(tenant_id):
        return application.handle_workspace(tenant_id)


def __getattr__(name):
    return getattr(application, name)
