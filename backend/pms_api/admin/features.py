"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_system, require_tenant
from . import features_application as application


class ListFeaturesView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_list_features()


class UpdateFeatureView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request(code):
        return application.handle_update_feature(code)


class OwnFeatureOverridesView(CommonMethodView):
    @staticmethod
    @require_tenant("settings.write")
    def dispatch_request(tenant_id):
        return application.handle_own_feature_overrides(tenant_id)


class PutFeatureOverrideView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id, code):
        return application.handle_put_feature_override(tenant_id, code)


class DeleteFeatureOverrideView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id, code):
        return application.handle_delete_feature_override(tenant_id, code)


def __getattr__(name):
    if name in {"URL", "features"}:
        from importlib import import_module

        return getattr(import_module(".features_urls", __package__), name)
    if hasattr(application, name):
        return getattr(application, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
