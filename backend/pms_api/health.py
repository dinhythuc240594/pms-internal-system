"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from . import health_application as application


class LivenessView(CommonMethodView):
    @staticmethod
    def dispatch_request():
        return application.handle_liveness()


class ReadinessView(CommonMethodView):
    @staticmethod
    def dispatch_request():
        return application.handle_readiness()


def __getattr__(name):
    if name == "database_check":
        from .commands import database_check

        return database_check
    if name in {"URL", "health"}:
        from importlib import import_module

        return getattr(import_module(".health_urls", __package__), name)
    if hasattr(application, name):
        return getattr(application, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
