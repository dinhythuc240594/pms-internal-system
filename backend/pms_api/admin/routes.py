from flask import g, jsonify, request
from sqlalchemy import func, select, text
from werkzeug.security import generate_password_hash

from common import CommonMethodView

from ..auth.routes import user_json, validate_email, validate_password
from ..bookings.routes import money_value
from ..core_models import (
    AuditLog,
    AuthSession,
    Plan,
    Subscription,
    SubscriptionHistory,
    Tenant,
    TenantUser,
    User,
    utcnow,
)
from ..extensions import db
from ..security import GLOBAL_ROLES, ROLES, ApiError, audit, payload, require_system, require_tenant
from ..subscriptions import (
    default_features,
    ensure_quota,
    feature_values,
    integer_limit,
    lock_tenant,
    plan_code,
    plan_json,
    subscription_json,
    timestamp,
)
from .client_models import TenantClientProfile
from .customers import CLIENT_FIELDS, client_values, customer_tenants


def name_value(value):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > 160:
        raise ApiError(422, "invalid_name", "Tên cần từ 1 đến 160 ký tự.")
    return value.strip()


def new_user(data, *, prefix=""):
    email = validate_email(data.get(f"{prefix}Email" if prefix else "email"))
    if db.session.scalar(select(User).where(User.email == email)):
        raise ApiError(
            409, "email_exists", "Email đã được sử dụng. Dùng tài khoản đã có hoặc email khác."
        )
    user = User(
        name=name_value(data.get(f"{prefix}Name" if prefix else "name")),
        email=email,
        password_hash=generate_password_hash(
            validate_password(data.get(f"{prefix}Password" if prefix else "password"))
        ),
    )
    db.session.add(user)
    db.session.flush()
    return user


def system_user_json(user):
    return {**user_json(user), "createdAt": user.created_at.isoformat()}


def lock_system_users():
    # Serialize role changes and recheck an actor who may have lost access while waiting.
    db.session.execute(text("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE"))
    actor = db.session.scalar(
        select(User).where(User.id == g.user.id).execution_options(populate_existing=True)
    )
    if not actor.active or actor.global_role != "SUPER_ADMIN":
        raise ApiError(403, "forbidden", "Quyền quản trị của bạn đã thay đổi.")


class SystemUsersView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request():
        return jsonify(
            users=[
                system_user_json(user)
                for user in db.session.scalars(
                    select(User)
                    .where(User.global_role.in_(GLOBAL_ROLES))
                    .order_by(User.name, User.id)
                )
            ]
        )


class CreateSystemUserView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request():
        data = payload()
        if set(data) - {"name", "email", "password", "globalRole", "active"}:
            raise ApiError(422, "unsupported_field", "Tài khoản chứa trường không được hỗ trợ.")
        role, active = data.get("globalRole", "SYSTEM_MANAGER"), data.get("active", True)
        if not isinstance(role, str) or role not in GLOBAL_ROLES or not isinstance(active, bool):
            raise ApiError(422, "invalid_user", "Vai trò hoặc trạng thái hệ thống không hợp lệ.")
        lock_system_users()
        user = new_user(data)
        user.global_role, user.active = role, active
        audit("system_user.created", "user", user.id, {"globalRole": role, "active": active})
        db.session.flush()
        return jsonify(system_user_json(user)), 201


class UpdateSystemUserView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request(user_id):
        data = payload()
        if not data or set(data) - {"name", "globalRole", "active"}:
            raise ApiError(
                422, "unsupported_field", "Chỉ sửa tên, vai trò và trạng thái tài khoản."
            )
        lock_system_users()
        user = db.session.scalar(
            select(User)
            .where(User.id == user_id, User.global_role.in_(GLOBAL_ROLES))
            .with_for_update()
        )
        if not user:
            raise ApiError(404, "not_found", "Không tìm thấy tài khoản hệ thống.")
        role, active = data.get("globalRole", user.global_role), data.get("active", user.active)
        if not isinstance(role, str) or role not in GLOBAL_ROLES or not isinstance(active, bool):
            raise ApiError(422, "invalid_user", "Vai trò hoặc trạng thái hệ thống không hợp lệ.")
        if user.id == g.user.id and (not active or role != "SUPER_ADMIN"):
            raise ApiError(
                409, "self_lockout", "Không thể tự khóa hoặc hạ quyền tài khoản đang đăng nhập."
            )
        if (
            user.active
            and user.global_role == "SUPER_ADMIN"
            and (not active or role != "SUPER_ADMIN")
        ):
            owners = db.session.scalar(
                select(func.count())
                .select_from(User)
                .where(User.active.is_(True), User.global_role == "SUPER_ADMIN")
            )
            if owners <= 1:
                raise ApiError(
                    409, "last_super_admin", "Hệ thống cần một Super Admin đang hoạt động."
                )
        if "name" in data:
            user.name = name_value(data["name"])
        if not active or role != user.global_role:
            db.session.query(AuthSession).filter(AuthSession.user_id == user.id).delete(
                synchronize_session=False
            )
        user.global_role, user.active = role, active
        audit("system_user.updated", "user", user.id, {"globalRole": role, "active": active})
        db.session.flush()
        return jsonify(system_user_json(user))


class TenantsView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return jsonify(tenants=customer_tenants())


class CreateTenantView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        data = payload()
        if set(data) - {
            "name",
            "status",
            "ownerName",
            "ownerEmail",
            "ownerPassword",
            *CLIENT_FIELDS,
        }:
            raise ApiError(
                422, "unsupported_field", "Thông tin khách sạn chứa trường không hỗ trợ."
            )
        values = client_values(data)
        status = data.get("status", "active")
        if status not in ("active", "suspended"):
            raise ApiError(422, "invalid_status", "Trạng thái không hợp lệ.")
        tenant = Tenant(name=name_value(data.get("name")), status=status)
        db.session.add(tenant)
        db.session.flush()
        owner = new_user(data, prefix="owner")
        db.session.add(TenantUser(tenant_id=tenant.id, user_id=owner.id, role="HOTEL_OWNER"))
        db.session.add(
            TenantClientProfile(
                tenant_id=tenant.id,
                **{"contact_name": owner.name, "contact_email": owner.email, **values},
            )
        )
        db.session.flush()
        g.tenant = tenant
        audit("tenant.created", "tenant", tenant.id)
        return jsonify(customer_tenants(tenant.id)[0]), 201


class UpdateTenantView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        tenant = db.session.scalar(select(Tenant).where(Tenant.id == tenant_id).with_for_update())
        if not tenant:
            raise ApiError(404, "not_found", "Không tìm thấy khách sạn.")
        data = payload()
        if not data or set(data) - {"name", "status", *CLIENT_FIELDS}:
            raise ApiError(
                422, "unsupported_field", "Chỉ sửa tên, trạng thái hoặc hồ sơ khách hàng."
            )
        values = client_values(data)
        if "name" in data:
            tenant.name = name_value(data["name"])
        if "status" in data:
            if data["status"] not in ("active", "suspended"):
                raise ApiError(422, "invalid_status", "Trạng thái không hợp lệ.")
            tenant.status = data["status"]
        if values:
            profile = db.session.get(TenantClientProfile, tenant.id)
            if profile is None:
                profile = TenantClientProfile(tenant_id=tenant.id)
                db.session.add(profile)
            for key, value in values.items():
                setattr(profile, key, value)
        g.tenant = tenant
        audit(
            "tenant.updated", "tenant", tenant.id, {"status": tenant.status, "fields": sorted(data)}
        )
        db.session.flush()
        return jsonify(customer_tenants(tenant.id)[0])


class CustomerHistoryView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        if not db.session.get(Tenant, tenant_id):
            raise ApiError(404, "not_found", "Không tìm thấy khách sạn.")
        return audit_response(tenant_id)


def tenant_users_json(tenant_id):
    rows = db.session.execute(
        select(User, TenantUser)
        .join(TenantUser, TenantUser.user_id == User.id)
        .where(TenantUser.tenant_id == tenant_id)
        .order_by(User.name)
    ).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "globalRole": u.global_role,
            "active": m.active,
            "role": m.role,
            "memberships": [{"tenantId": m.tenant_id, "role": m.role, "active": m.active}],
        }
        for u, m in rows
    ]


class TenantUsersView(CommonMethodView):
    @staticmethod
    @require_tenant("users.view")
    def dispatch_request(tenant_id):
        return jsonify(users=tenant_users_json(tenant_id))


class CreateTenantUserView(CommonMethodView):
    @staticmethod
    @require_tenant("users.write")
    def dispatch_request(tenant_id):
        data = payload()
        role = data.get("role", "FRONT_DESK")
        if role not in ROLES:
            raise ApiError(422, "invalid_role", "Vai trò khách sạn không hợp lệ.")
        if "globalRole" in data:
            raise ApiError(403, "forbidden", "Không thể cấp quyền hệ thống tại khách sạn.")
        active = data.get("active", True)
        if not isinstance(active, bool):
            raise ApiError(422, "invalid_membership", "Trạng thái không hợp lệ.")
        ensure_quota(tenant_id, "users", 1 if active else 0)
        user = new_user(data)
        db.session.add(TenantUser(tenant_id=tenant_id, user_id=user.id, role=role, active=active))
        audit("membership.created", "user", user.id, {"role": role})
        db.session.flush()
        return jsonify(user_json(user)), 201


class UpdateTenantUserView(CommonMethodView):
    @staticmethod
    @require_tenant("users.write")
    def dispatch_request(tenant_id, user_id):
        # Serialize owner changes to ensure a hotel always has an active owner.
        db.session.execute(
            select(Tenant).where(Tenant.id == tenant_id).with_for_update()
        ).scalar_one()
        membership = db.session.scalar(
            select(TenantUser).where(
                TenantUser.tenant_id == tenant_id, TenantUser.user_id == user_id
            )
        )
        if not membership:
            raise ApiError(404, "not_found", "Không tìm thấy nhân viên.")
        data = payload()
        role, active = data.get("role", membership.role), data.get("active", membership.active)
        if role not in ROLES or not isinstance(active, bool):
            raise ApiError(422, "invalid_membership", "Vai trò hoặc trạng thái không hợp lệ.")
        if (
            membership.role == "HOTEL_OWNER"
            and membership.active
            and (role != "HOTEL_OWNER" or not active)
        ):
            owners = db.session.scalar(
                select(func.count())
                .select_from(TenantUser)
                .where(
                    TenantUser.tenant_id == tenant_id,
                    TenantUser.role == "HOTEL_OWNER",
                    TenantUser.active.is_(True),
                )
            )
            if owners <= 1:
                raise ApiError(409, "last_owner", "Khách sạn cần ít nhất một Owner đang hoạt động.")
        if "password" in data or "globalRole" in data:
            raise ApiError(
                403,
                "forbidden",
                "Dùng luồng đổi mật khẩu cá nhân; không thể cấp quyền hệ thống ở đây.",
            )
        user = db.session.get(User, user_id)
        if "email" in data and validate_email(data["email"]) != user.email:
            raise ApiError(
                422, "email_immutable", "Email đăng nhập không được đổi trong quản lý nhân viên."
            )
        if "name" in data and data["name"] != user.name:
            # A global user profile can belong to multiple hotels.
            if user.id != g.user.id and g.user.global_role not in GLOBAL_ROLES:
                raise ApiError(
                    403, "profile_restricted", "Chỉ người dùng hoặc Admin được đổi hồ sơ cá nhân."
                )
            user.name = name_value(data["name"])
        if active and not membership.active:
            ensure_quota(tenant_id, "users")
        membership.role, membership.active = role, active
        audit("membership.updated", "user", user_id, {"role": role, "active": active})
        db.session.flush()
        return jsonify(user_json(user))


class SystemAuditView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request():
        return audit_response()


class TenantAuditView(CommonMethodView):
    @staticmethod
    @require_tenant("users.write")
    def dispatch_request(tenant_id):
        return audit_response(tenant_id)


def audit_response(tenant_id=None):
    allowed = {"userId", "start", "end", "event", "page", "pageSize"}
    if tenant_id is None:
        allowed.add("tenantId")
    if set(request.args) - allowed:
        raise ApiError(422, "invalid_filter", "Bộ lọc nhật ký không được hỗ trợ.")
    conditions = []
    if tenant_id is not None:
        conditions.append(AuditLog.tenant_id == tenant_id)
    for name, column in (
        ("tenantId", AuditLog.tenant_id),
        ("userId", AuditLog.user_id),
        ("event", AuditLog.event),
    ):
        if name in request.args:
            value = request.args[name]
            limit = 80 if name == "event" else 40
            if not value.strip() or len(value) > limit:
                raise ApiError(422, "invalid_filter", f"{name} phải từ 1 đến {limit} ký tự.")
            conditions.append(column == value)
    start = timestamp(request.args["start"], "start") if "start" in request.args else None
    end = timestamp(request.args["end"], "end") if "end" in request.args else None
    if start is not None and end is not None and start >= end:
        raise ApiError(422, "invalid_dates", "end phải sau start.")
    if start is not None:
        conditions.append(AuditLog.created_at >= start)
    if end is not None:
        conditions.append(AuditLog.created_at < end)
    try:
        page = int(request.args.get("page", "1"))
        size = int(request.args.get("pageSize", "200"))
    except ValueError:
        raise ApiError(422, "invalid_pagination", "Phân trang không hợp lệ.") from None
    if not 1 <= page <= 100000 or not 1 <= size <= 200:
        raise ApiError(422, "invalid_pagination", "page từ 1 đến 100000; pageSize từ 1 đến 200.")
    total = db.session.scalar(select(func.count()).select_from(AuditLog).where(*conditions))
    rows = db.session.scalars(
        select(AuditLog)
        .where(*conditions)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    actor_names = dict(
        db.session.execute(
            select(User.id, User.name).where(
                User.id.in_({row.user_id for row in rows if row.user_id})
            )
        ).all()
    )
    return jsonify(
        auditLogs=[
            {
                "id": row.id,
                "tenantId": row.tenant_id,
                "userId": row.user_id,
                "userName": actor_names.get(row.user_id, ""),
                "event": row.event,
                "entityType": row.entity_type,
                "entityId": row.entity_id,
                "details": row.details,
                "createdAt": row.created_at.isoformat(),
            }
            for row in rows
        ],
        pagination={"page": page, "pageSize": size, "totalItems": total},
    )


class ListPlansView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return jsonify(
            plans=[
                plan_json(plan)
                for plan in db.session.scalars(select(Plan).order_by(Plan.price, Plan.id))
                if plan_code(plan) in {"FREE", "PRO"}
            ]
        )


def plan_values(data, plan=None):
    if set(data) - {
        "id",
        "code",
        "name",
        "price",
        "priceYear",
        "currency",
        "maxRooms",
        "maxUsers",
        "features",
        "active",
    }:
        raise ApiError(422, "invalid_plan", "Gói chứa trường không được hỗ trợ.")
    name = name_value(data.get("name", plan.name if plan else None))
    if len(name) > 100:
        raise ApiError(422, "invalid_name", "Tên gói tối đa 100 ký tự.")
    code = data.get("code", plan_code(plan) if plan else plan_code(Plan(name=name)))
    if not isinstance(code, str) or code not in {"FREE", "PRO"}:
        raise ApiError(422, "invalid_plan", "Hệ thống chỉ có hai gói FREE và PRO.")
    if plan and code != plan_code(plan):
        raise ApiError(422, "immutable_plan_code", "Không đổi định danh gói đã có.")
    price = money_value(
        data.get("price", plan.price if plan else "0" if code == "FREE" else "2500000"),
        allow_zero=True,
    )
    annual = money_value(
        data.get(
            "priceYear",
            plan_json(plan)["priceYear"] if plan else "0" if code == "FREE" else "25000000",
        ),
        allow_zero=True,
    )
    if code == "FREE" and (price != 0 or annual != 0):
        raise ApiError(422, "invalid_price", "Gói Miễn Phí phải có giá bằng 0.")
    currency = data.get("currency", plan.currency if plan else "VND")
    if not isinstance(currency, str) or currency not in {"VND", "USD"}:
        raise ApiError(422, "invalid_currency", "Tiền tệ phải là VND hoặc USD.")
    rooms = integer_limit(
        data.get(
            "maxRooms", plan_json(plan)["maxRooms"] if plan else 30 if code == "FREE" else None
        ),
        "Giới hạn phòng",
    )
    users = integer_limit(
        data.get(
            "maxUsers", plan_json(plan)["maxUsers"] if plan else 5 if code == "FREE" else None
        ),
        "Giới hạn tài khoản",
    )
    if code == "FREE" and (rooms is None or rooms > 30 or users is None or users > 5):
        raise ApiError(422, "invalid_quota", "Gói Miễn Phí có tối đa 30 phòng và 5 tài khoản.")
    features = feature_values(
        data.get("features", plan.features if plan else default_features(code))
    )
    active = data.get("active", plan.active if plan else True)
    if not isinstance(active, bool):
        raise ApiError(422, "invalid_plan", "Trạng thái gói phải là boolean.")
    db.session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended('pms:commercial-plans',0))")
    )
    if active and any(
        other.id != (plan.id if plan else None) and plan_code(other) == code
        for other in db.session.scalars(select(Plan).where(Plan.active.is_(True)))
    ):
        raise ApiError(409, "plan_exists", "Gói đang hoạt động đã tồn tại; hãy sửa gói đó.")
    plan = plan or Plan()
    plan.name, plan.code, plan.price, plan.price_year, plan.currency = (
        name,
        code,
        price,
        annual,
        currency,
    )
    plan.max_rooms, plan.max_users, plan.features, plan.active = rooms, users, features, active
    db.session.add(plan)
    db.session.flush()
    return plan


class CreatePlanView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request():
        plan = plan_values(payload())
        audit("plan.created", "plan", plan.id, {"name": plan.name})
        return jsonify(plan_json(plan)), 201


class UpdatePlanView(CommonMethodView):
    @staticmethod
    @require_system(super_only=True)
    def dispatch_request(plan_id):
        db.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended('pms:commercial-plans',0))")
        )
        plan = db.session.scalar(select(Plan).where(Plan.id == plan_id).with_for_update())
        if plan is None:
            raise ApiError(404, "not_found", "Không tìm thấy gói.")
        data = payload()
        if "id" in data and data["id"] != plan.id:
            raise ApiError(422, "invalid_plan", "Mã gói không khớp URL.")
        plan = plan_values(data, plan)
        audit("plan.updated", "plan", plan.id, {"code": plan.code, "active": plan.active})
        return jsonify(plan_json(plan))


def history_json(tenant_id):
    rows = db.session.execute(
        select(SubscriptionHistory, Plan, User.name)
        .join(Plan, Plan.id == SubscriptionHistory.plan_id)
        .outerjoin(User, User.id == SubscriptionHistory.user_id)
        .where(SubscriptionHistory.tenant_id == tenant_id)
        .order_by(SubscriptionHistory.created_at.desc(), SubscriptionHistory.id)
        .limit(200)
    ).all()
    return [
        {
            "id": row.id,
            "planId": row.plan_id,
            "planName": row.plan_name or plan.name,
            "planCode": row.plan_code or plan_code(plan),
            "previousPlanId": row.previous_plan_id,
            "action": row.action,
            "amount": format(row.amount, ".4f") if row.amount is not None else None,
            "currency": row.currency,
            "cycle": row.cycle,
            "status": row.status,
            "effectiveDate": row.effective_date.isoformat(),
            "endDate": row.end_date.isoformat() if row.end_date else None,
            "actorId": row.user_id,
            "actorName": actor,
            "createdAt": row.created_at.isoformat(),
        }
        for row, plan, actor in rows
    ]


def subscription_response(tenant_id):
    row = db.session.execute(
        select(Subscription, Plan)
        .join(Plan, Plan.id == Subscription.plan_id)
        .where(Subscription.tenant_id == tenant_id)
    ).one_or_none()
    return {
        "subscription": subscription_json(*row) if row else None,
        "history": history_json(tenant_id),
    }


class TenantSubscriptionView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        if db.session.get(Tenant, tenant_id) is None:
            raise ApiError(404, "not_found", "Không tìm thấy khách sạn.")
        return jsonify(subscription_response(tenant_id))


class SubscriptionHistoryView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        if db.session.get(Tenant, tenant_id) is None:
            raise ApiError(404, "not_found", "Không tìm thấy khách sạn.")
        return jsonify(history=history_json(tenant_id))


class UpdateSubscriptionView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(tenant_id):
        data = payload()
        if set(data) - {"planId", "status", "startDate", "endDate", "amount", "currency", "cycle"}:
            raise ApiError(422, "invalid_subscription", "Yêu cầu chứa trường không được hỗ trợ.")
        g.tenant = lock_tenant(tenant_id)
        plan_id = data.get("planId")
        status = data.get("status", "active")
        if (
            not isinstance(plan_id, str)
            or not isinstance(status, str)
            or status not in {"active", "expired", "cancelled"}
        ):
            raise ApiError(
                422, "invalid_subscription", "Gói hoặc trạng thái subscription không hợp lệ."
            )
        plan = db.session.scalar(select(Plan).where(Plan.id == plan_id).with_for_update(read=True))
        if plan is None or plan_code(plan) not in {"FREE", "PRO"}:
            raise ApiError(404, "not_found", "Không tìm thấy gói.")
        if status == "active" and not plan.active:
            raise ApiError(409, "inactive_plan", "Gói đã ngừng hoạt động.")
        sub = db.session.scalar(
            select(Subscription).where(Subscription.tenant_id == tenant_id).with_for_update()
        )
        previous = sub.plan_id if sub else None
        previous_end, previous_status = (sub.end_date, sub.status) if sub else (None, None)
        start = (
            timestamp(data["startDate"], "Ngày bắt đầu")
            if "startDate" in data
            else sub.start_date
            if sub
            else utcnow()
        )
        if "endDate" in data:
            end = (
                timestamp(data["endDate"], "Ngày kết thúc") if data["endDate"] is not None else None
            )
        elif plan_code(plan) == "FREE" and previous != plan_id:
            end = None
        else:
            end = previous_end
        if end is not None and end <= start:
            raise ApiError(422, "invalid_dates", "Hạn gói phải sau ngày bắt đầu.")
        if status == "active" and plan_code(plan) == "PRO" and (end is None or end <= utcnow()):
            raise ApiError(
                422, "invalid_dates", "Gói Chuyên Nghiệp đang hoạt động cần hạn trong tương lai."
            )
        currency = data.get("currency", plan.currency)
        if currency != plan.currency:
            raise ApiError(422, "currency_mismatch", "Tiền tệ thanh toán phải cùng loại với gói.")
        amount = money_value(data["amount"], allow_zero=True) if "amount" in data else None
        cycle = data.get("cycle")
        if cycle is not None and (not isinstance(cycle, str) or cycle not in {"monthly", "yearly"}):
            raise ApiError(422, "invalid_cycle", "Chu kỳ phải là monthly hoặc yearly.")
        if previous is None:
            action = "created"
        elif previous != plan_id:
            action = "changed_plan"
        elif end is not None and (previous_end is None or end > previous_end):
            action = "renewed"
        elif previous_status != status:
            action = "changed_status"
        else:
            action = "updated"
        sub = sub or Subscription(tenant_id=tenant_id)
        sub.plan_id, sub.status, sub.start_date, sub.end_date = plan_id, status, start, end
        db.session.add(sub)
        db.session.add(
            SubscriptionHistory(
                tenant_id=tenant_id,
                plan_id=plan_id,
                action=action,
                user_id=g.user.id,
                plan_name=plan.name,
                plan_code=plan_code(plan),
                previous_plan_id=previous,
                amount=amount,
                currency=currency,
                effective_date=timestamp(data["startDate"], "Ngày hiệu lực")
                if "startDate" in data
                else utcnow(),
                end_date=end,
                cycle=cycle,
                status=status,
            )
        )
        db.session.flush()
        audit("subscription.updated", "tenant", tenant_id, {"planId": plan_id, "status": status})
        return jsonify(id=sub.id, **subscription_response(tenant_id))


def __getattr__(name):
    if name in {"URL", "admin"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
