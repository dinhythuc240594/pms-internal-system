"""HTTP entry points; business behavior is implemented in the application layer."""

from common import CommonMethodView

from . import health_application as application
from .security import require_system


class LivenessView(CommonMethodView):
    @staticmethod
    def dispatch_request():
        return application.handle_liveness()


class ReadinessView(CommonMethodView):
    @staticmethod
    def dispatch_request():
        return application.handle_readiness()


class OperationsView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_operations()


def __getattr__(name):
    if name == "database_check":
        from .commands import database_check

        return database_check
    if name in {"URL", "health"}:
        from importlib import import_module

        return getattr(import_module(".health_urls", __package__), name)
    return getattr(application, name)
