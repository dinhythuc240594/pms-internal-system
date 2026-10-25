"""Authenticate first, establish tenant context, then authorize every action."""

import hashlib
import hmac
from functools import wraps
from urllib.parse import urlsplit

from flask import current_app, g, jsonify, request
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError, IntegrityError
from werkzeug.exceptions import HTTPException

from common import ApiError, RequestData

from .core_models import AuditLog, AuthSession, Tenant, TenantUser, User, uid, utcnow
from .extensions import db

COOKIE = "pms_session"
GLOBAL_ROLES = {"SUPER_ADMIN", "SYSTEM_MANAGER"}
ROLES = {"HOTEL_OWNER", "FRONT_DESK", "HOUSEKEEPING", "ACCOUNTANT"}
ROLE_ACTIONS = {
    "FRONT_DESK": {
        "dashboard.view",
        "reservations.view",
        "reservations.write",
        "rooms.view",
        "housekeeping.view",
        "housekeeping.write",
        "rates.view",
        "guests.view",
        "guests.write",
        "payments.write",
        "cashbook.view",
        "pos.view",
        "pos.write",
        "housekeeping.manage",
    },
    "HOUSEKEEPING": {"rooms.view", "housekeeping.view", "housekeeping.write"},
    "ACCOUNTANT": {
        "dashboard.view",
        "reservations.view",
        "guests.view",
        "cashbook.view",
        "cashbook.write",
        "pos.view",
        "pos.write",
        "finance.adjust",
        "pos.cancel",
        "cashbook.reverse",
        "reports.view",
        "reports.advanced.view",
        "payments.write",
        "rates.view",
        "inventory.view",
        "inventory.write",
    },
}
for _actions in ROLE_ACTIONS.values():
    _actions.update({"workspace.view", "profile.view", "notifications.view"})
ROLE_ACTIONS["FRONT_DESK"].add("channels.view")


def payload():
    return RequestData.payload()


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def set_context(user_id="", tenant_id="", is_system=False):
    if db.session.info.get("flushing"):
        pass  # avoid recursive flush if this was called somehow during a flush
    else:
        try:
            db.session.flush()
        except Exception:
            pass  # if flush fails, we might be rolling back, ignore
    db.session.execute(
        text(
            "SELECT set_config('app.user_id',:user,true), set_config('app.tenant_id',:tenant,true), set_config('app.is_system',:system,true)"
        ),
        {"user": user_id, "tenant": tenant_id, "system": "true" if is_system else "false"},
    )


def check_origin():
    origin = request.headers.get("Origin")
    if origin:
        parsed = urlsplit(request.host_url)
        own_origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin not in current_app.config["CORS_ORIGINS"] and origin != own_origin:
            raise ApiError(403, "origin_denied", "Nguồn yêu cầu không được phép.")
    elif request.headers.get("Sec-Fetch-Site") == "cross-site":
        raise ApiError(403, "origin_denied", "Nguồn yêu cầu không được phép.")


def authenticate():
    if getattr(g, "user", None):
        return g.user
    token = request.cookies.get(COOKIE, "")
    session = db.session.get(AuthSession, digest(token)) if token and len(token) < 256 else None
    user = (
        db.session.get(User, session.user_id) if session and session.expires_at > utcnow() else None
    )
    if not user or not user.active:
        raise ApiError(401, "unauthenticated", "Vui lòng đăng nhập lại.")
    g.user, g.auth_session = user, session
    set_context(user.id, is_system=user.global_role in GLOBAL_ROLES)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        check_origin()
        supplied_csrf = request.headers.get("X-CSRF-Token", "")
        if not supplied_csrf.isascii() or not hmac.compare_digest(
            supplied_csrf, session.csrf_token
        ):
            raise ApiError(
                403, "csrf_failed", "Phiên thao tác không hợp lệ. Vui lòng tải lại trang."
            )
    return user


def require_system(super_only=False):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = authenticate()
            allowed = {"SUPER_ADMIN"} if super_only else GLOBAL_ROLES
            if user.global_role not in allowed:
                raise ApiError(403, "forbidden", "Bạn không có quyền quản trị hệ thống.")
            return view(*args, **kwargs)

        return wrapped

    return decorator


def require_tenant(action):
    def decorator(view):
        @wraps(view)
        def wrapped(tenant_id, *args, **kwargs):
            user = authenticate()
            membership = db.session.execute(
                select(TenantUser).where(
                    TenantUser.tenant_id == tenant_id,
                    TenantUser.user_id == user.id,
                    TenantUser.active.is_(True),
                )
            ).scalar_one_or_none()
            if user.global_role not in GLOBAL_ROLES and not membership:
                raise ApiError(403, "tenant_denied", "Bạn không có quyền vào khách sạn này.")
            tenant = db.session.get(Tenant, tenant_id)
            if not tenant:
                raise ApiError(404, "not_found", "Không tìm thấy khách sạn.")
            role = "HOTEL_OWNER" if user.global_role in GLOBAL_ROLES else membership.role
            if role != "HOTEL_OWNER" and action not in ROLE_ACTIONS.get(role, set()):
                raise ApiError(403, "forbidden", "Bạn không có quyền thực hiện thao tác này.")
            set_context(user.id, tenant_id, user.global_role in GLOBAL_ROLES)
            from .subscriptions import enforce_entitlements, lock_tenant

            # All tenant mutations share this order, including quota checks and renewals.
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                tenant = lock_tenant(tenant_id)
                if tenant.status != "active":
                    raise ApiError(403, "tenant_suspended", "Khách sạn đang bị tạm ngưng.")
            g.tenant, g.role = tenant, role
            enforce_entitlements(action)
            return view(tenant_id, *args, **kwargs)

        return wrapped

    return decorator


def audit(event, entity_type, entity_id, details=None):
    entry = AuditLog(
        id=uid(),
        tenant_id=getattr(getattr(g, "tenant", None), "id", None),
        user_id=getattr(getattr(g, "user", None), "id", None),
        event=event,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details or {},
    )
    db.session.add(entry)
    from .composition import services

    services().events.publish(entry)
    return entry


def register_security(app):
    app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024

    @app.before_request
    def clean_context():
        # Every request starts in an empty transaction context, even on reused connections.
        if (
            request.path.startswith("/api/")
            and request.path not in ("/api/health", "/api/ready")
            and request.method != "OPTIONS"
        ):
            set_context()

    @app.after_request
    def finish_transaction(response):
        if request.path.startswith("/api/") and request.path not in ("/api/health", "/api/ready"):
            try:
                if request.method not in ("GET", "HEAD", "OPTIONS") and (
                    response.status_code < 400 or getattr(g, "commit_on_error", False)
                ):
                    db.session.commit()
                else:
                    db.session.rollback()
            except IntegrityError:
                db.session.rollback()
                response = jsonify(
                    error={
                        "code": "conflict",
                        "message": "Dữ liệu đã thay đổi hoặc bị trùng. Vui lòng tải lại.",
                    }
                )
                response.status_code = 409
            except DBAPIError:
                db.session.rollback()
                app.logger.warning("Database transaction failed")
                response = jsonify(
                    error={
                        "code": "database_unavailable",
                        "message": "Chưa thể lưu dữ liệu. Vui lòng thử lại.",
                    }
                )
                response.status_code = 503
        response.headers["X-Content-Type-Options"] = "nosniff"
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.errorhandler(ApiError)
    def api_error(error):
        body = {"code": error.code, "message": error.message}
        if error.details is not None:
            body["details"] = error.details
        return jsonify(error=body), error.status

    @app.errorhandler(IntegrityError)
    def conflict(error):
        return jsonify(
            error={
                "code": "conflict",
                "message": "Phòng hoặc dữ liệu đã được sử dụng. Vui lòng tải lại.",
            }
        ), 409

    @app.errorhandler(DBAPIError)
    def database_error(error):
        return jsonify(
            error={
                "code": "database_unavailable",
                "message": "Không thể xử lý dữ liệu. Vui lòng thử lại.",
            }
        ), 503

    @app.errorhandler(HTTPException)
    def http_error(error):
        if request.path.startswith("/api/"):
            return jsonify(error={"code": "http_error", "message": error.description}), error.code
        return error
