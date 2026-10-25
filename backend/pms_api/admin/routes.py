"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_system, require_tenant
from . import application as application


class SystemUsersView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request():
        return application.handle_system_users()


class CreateSystemUserView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request():
        return application.handle_create_system_user()


class UpdateSystemUserView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request(user_id):
        return application.handle_update_system_user(user_id)


class TenantsView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_tenants()


class CreateTenantView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_create_tenant()


class UpdateTenantView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        return application.handle_update_tenant(tenant_id)


class CustomerHistoryView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        return application.handle_customer_history(tenant_id)


class TenantUsersView(CommonMethodView):
    @staticmethod
    @require_tenant("users.view")
    def dispatch_request(tenant_id):
        return application.handle_tenant_users(tenant_id)


class CreateTenantUserView(CommonMethodView):
    @staticmethod
    @require_tenant("users.write")
    def dispatch_request(tenant_id):
        return application.handle_create_tenant_user(tenant_id)


class UpdateTenantUserView(CommonMethodView):
    @staticmethod
    @require_tenant("users.write")
    def dispatch_request(tenant_id, user_id):
        return application.handle_update_tenant_user(tenant_id, user_id)


class SystemAuditView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request():
        return application.handle_system_audit()


class TenantAuditView(CommonMethodView):
    @staticmethod
    @require_tenant("users.write")
    def dispatch_request(tenant_id):
        return application.handle_tenant_audit(tenant_id)


class ListPlansView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_list_plans()


class PublicPlansView(CommonMethodView):
    @staticmethod
    def dispatch_request():
        return application.handle_public_plans()


class CreatePlanView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request():
        return application.handle_create_plan()


class UpdatePlanView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request(plan_id):
        return application.handle_update_plan(plan_id)


class DeletePlanView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request(plan_id):
        return application.handle_delete_plan(plan_id)


class TenantSubscriptionView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        return application.handle_tenant_subscription(tenant_id)


class SubscriptionHistoryView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        return application.handle_subscription_history(tenant_id)


class UpdateSubscriptionView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        return application.handle_update_subscription(tenant_id)


def __getattr__(name):
    if name in {"URL", "admin"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    if hasattr(application, name):
        return getattr(application, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
