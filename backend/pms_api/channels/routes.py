"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_tenant
from . import application as application


class SnapshotView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.view")
    def dispatch_request(tenant_id):
        return application.handle_snapshot(tenant_id)


class CatalogView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.view")
    def dispatch_request(tenant_id):
        return application.handle_catalog(tenant_id)


class SaveConfigView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.write")
    def dispatch_request(tenant_id):
        return application.handle_save_config(tenant_id)


class SaveMappingView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.write")
    def dispatch_request(tenant_id):
        return application.handle_save_mapping(tenant_id)


class CreateJobView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.write")
    def dispatch_request(tenant_id):
        return application.handle_create_job(tenant_id)


class RetryJobView(CommonMethodView):
    @staticmethod
    @require_tenant("channels.write")
    def dispatch_request(tenant_id, job_id):
        return application.handle_retry_job(tenant_id, job_id)


class WebhookView(CommonMethodView):
    @staticmethod
    def dispatch_request(tenant_id):
        return application.handle_webhook(tenant_id)


def __getattr__(name):
    if name in {"URL", "channels"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    if hasattr(application, name):
        return getattr(application, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
