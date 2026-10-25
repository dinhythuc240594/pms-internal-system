"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from . import notifications_application as application
from .security import require_tenant


class InboxView(CommonMethodView):
    @staticmethod
    @require_tenant("notifications.view")
    def dispatch_request(tenant_id):
        return application.handle_inbox(tenant_id)


class ReadNotificationView(CommonMethodView):
    @staticmethod
    @require_tenant("notifications.view")
    def dispatch_request(tenant_id, notification_id):
        return application.handle_read_notification(tenant_id, notification_id)


class ReadAllView(CommonMethodView):
    @staticmethod
    @require_tenant("notifications.view")
    def dispatch_request(tenant_id):
        return application.handle_read_all(tenant_id)


class GetPreferencesView(CommonMethodView):
    @staticmethod
    @require_tenant("notifications.view")
    def dispatch_request(tenant_id):
        return application.handle_get_preferences(tenant_id)


class SetPreferencesView(CommonMethodView):
    @staticmethod
    @require_tenant("notifications.configure")
    def dispatch_request(tenant_id):
        return application.handle_set_preferences(tenant_id)


def __getattr__(name):
    if name in {"URL", "notifications"}:
        from importlib import import_module

        return getattr(import_module(".notifications_urls", __package__), name)
    if hasattr(application, name):
        return getattr(application, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
