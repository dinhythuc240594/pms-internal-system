"""HTTP entry points; business behavior is implemented in the application layer."""

from common import CommonMethodView

from ..channels.access import require_channel_access
from ..security import require_system
from . import channex_application as application


class ChannexView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_channex()


class ChannelSupportWorkspaceView(CommonMethodView):
    @staticmethod
    @require_channel_access("channels.view")
    def dispatch_request(tenant_id):
        return application.handle_channel_support_workspace(tenant_id)


def __getattr__(name):
    return getattr(application, name)
