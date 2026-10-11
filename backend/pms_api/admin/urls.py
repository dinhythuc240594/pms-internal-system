"""Routing metadata; handlers load only when their route is dispatched."""

from flask import Blueprint

from common import CommonURL


class URL(CommonURL):
    SYSTEM_USERS = "/users"
    CREATE_SYSTEM_USER = "/users"
    UPDATE_SYSTEM_USER = "/users/<user_id>"
    TENANTS = "/tenants"
    CREATE_TENANT = "/tenants"
    UPDATE_TENANT = "/tenants/<tenant_id>"
    CUSTOMER_HISTORY = "/tenants/<tenant_id>/customer-history"
    TENANT_USERS = "/tenants/<tenant_id>/users"
    CREATE_TENANT_USER = "/tenants/<tenant_id>/users"
    UPDATE_TENANT_USER = "/tenants/<tenant_id>/users/<user_id>"
    SYSTEM_AUDIT = "/audit"
    TENANT_AUDIT = "/tenants/<tenant_id>/audit"
    LIST_PLANS = "/plans"
    CREATE_PLAN = "/plans"
    UPDATE_PLAN = "/plans/<plan_id>"
    TENANT_SUBSCRIPTION = "/tenants/<tenant_id>/subscription"
    SUBSCRIPTION_HISTORY = "/tenants/<tenant_id>/subscription/history"
    UPDATE_SUBSCRIPTION = "/tenants/<tenant_id>/subscription"


admin = Blueprint("admin", __name__, url_prefix="/api")

URL.register(
    admin,
    URL.SYSTEM_USERS,
    "pms_api.admin.routes:SystemUsersView",
    endpoint="system_users",
    methods=["GET"],
)

URL.register(
    admin,
    URL.CREATE_SYSTEM_USER,
    "pms_api.admin.routes:CreateSystemUserView",
    endpoint="create_system_user",
    methods=["POST"],
)

URL.register(
    admin,
    URL.UPDATE_SYSTEM_USER,
    "pms_api.admin.routes:UpdateSystemUserView",
    endpoint="update_system_user",
    methods=["PATCH"],
)

URL.register(
    admin, URL.TENANTS, "pms_api.admin.routes:TenantsView", endpoint="tenants", methods=["GET"]
)

URL.register(
    admin,
    URL.CREATE_TENANT,
    "pms_api.admin.routes:CreateTenantView",
    endpoint="create_tenant",
    methods=["POST"],
)

URL.register(
    admin,
    URL.UPDATE_TENANT,
    "pms_api.admin.routes:UpdateTenantView",
    endpoint="update_tenant",
    methods=["PATCH"],
)

URL.register(
    admin,
    URL.CUSTOMER_HISTORY,
    "pms_api.admin.routes:CustomerHistoryView",
    endpoint="customer_history",
    methods=["GET"],
)

URL.register(
    admin,
    URL.TENANT_USERS,
    "pms_api.admin.routes:TenantUsersView",
    endpoint="tenant_users",
    methods=["GET"],
)

URL.register(
    admin,
    URL.CREATE_TENANT_USER,
    "pms_api.admin.routes:CreateTenantUserView",
    endpoint="create_tenant_user",
    methods=["POST"],
)

URL.register(
    admin,
    URL.UPDATE_TENANT_USER,
    "pms_api.admin.routes:UpdateTenantUserView",
    endpoint="update_tenant_user",
    methods=["PATCH"],
)

URL.register(
    admin,
    URL.SYSTEM_AUDIT,
    "pms_api.admin.routes:SystemAuditView",
    endpoint="system_audit",
    methods=["GET"],
)

URL.register(
    admin,
    URL.TENANT_AUDIT,
    "pms_api.admin.routes:TenantAuditView",
    endpoint="tenant_audit",
    methods=["GET"],
)

URL.register(
    admin,
    URL.LIST_PLANS,
    "pms_api.admin.routes:ListPlansView",
    endpoint="list_plans",
    methods=["GET"],
)

URL.register(
    admin,
    URL.CREATE_PLAN,
    "pms_api.admin.routes:CreatePlanView",
    endpoint="create_plan",
    methods=["POST"],
)

URL.register(
    admin,
    URL.UPDATE_PLAN,
    "pms_api.admin.routes:UpdatePlanView",
    endpoint="update_plan",
    methods=["PATCH"],
)

URL.register(
    admin,
    URL.TENANT_SUBSCRIPTION,
    "pms_api.admin.routes:TenantSubscriptionView",
    endpoint="tenant_subscription",
    methods=["GET"],
)

URL.register(
    admin,
    URL.SUBSCRIPTION_HISTORY,
    "pms_api.admin.routes:SubscriptionHistoryView",
    endpoint="subscription_history",
    methods=["GET"],
)

URL.register(
    admin,
    URL.UPDATE_SUBSCRIPTION,
    "pms_api.admin.routes:UpdateSubscriptionView",
    endpoint="update_subscription",
    methods=["PUT"],
)
