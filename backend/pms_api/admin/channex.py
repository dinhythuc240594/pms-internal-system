"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_system
from . import channex_application as application


class ChannexView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_channex()


def __getattr__(name):
    return getattr(application, name)
