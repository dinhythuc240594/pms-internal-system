"""System-controlled global feature switches and individual hotel grants."""

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from pms_api.ports import runtime

from ..core_models import User, utcnow
from ..extensions import db
from ..security import ApiError, audit
from ..subscriptions import ADVANCED_FEATURES, effective_features, lock_tenant, timestamp
from .feature_models import FEATURE_CATALOG, FeatureControl, TenantFeatureOverride


def known_feature(code):
    if code not in FEATURE_CATALOG:
        raise ApiError(404, "not_found", "Không tìm thấy tính năng.")


def feature_json(code, enabled_global=True):
    return {
        "id": code,
        "code": code,
        "name": FEATURE_CATALOG[code],
        "description": FEATURE_CATALOG[code],
        "category": "i18n:features.category",
        "minPlan": "PRO" if code in ADVANCED_FEATURES else "FREE",
        "enabledGlobal": enabled_global,
    }


def override_json(row, actor_name):
    return {
        "enabled": row.enabled,
        "isTrial": row.is_trial,
        "expiresAt": row.expires_at.isoformat() if row.expires_at else None,
        "notes": row.notes,
        "grantedBy": actor_name,
        "grantedAt": row.granted_at.isoformat(),
    }


def overrides_json(tenant_id=None):
    statement = select(TenantFeatureOverride, User.name).join(
        User, User.id == TenantFeatureOverride.granted_by
    )
    if tenant_id:
        statement = statement.where(TenantFeatureOverride.tenant_id == tenant_id)
    result = {}
    for row, actor_name in db.session.execute(statement.order_by(TenantFeatureOverride.code)):
        result.setdefault(row.tenant_id, {})[row.code] = override_json(row, actor_name)
    return result.get(tenant_id, {}) if tenant_id else result


def handle_list_features():
    controls = {row.code: row.enabled_global for row in db.session.scalars(select(FeatureControl))}
    return runtime().json_response(
        features=[feature_json(code, controls.get(code, True)) for code in FEATURE_CATALOG],
        tenantFeatureOverrides=overrides_json(),
    )


def handle_update_feature(code):
    known_feature(code)
    data = runtime().payload()
    if set(data) != {"enabledGlobal"} or not isinstance(data["enabledGlobal"], bool):
        raise ApiError(422, "invalid_feature", "Chỉ cập nhật enabledGlobal dạng boolean.")
    db.session.execute(
        insert(FeatureControl)
        .values(code=code, enabled_global=data["enabledGlobal"])
        .on_conflict_do_update(
            index_elements=[FeatureControl.code], set_={"enabled_global": data["enabledGlobal"]}
        )
    )
    audit("feature.updated", "feature", code, {"enabledGlobal": data["enabledGlobal"]})
    return runtime().json_response(feature=feature_json(code, data["enabledGlobal"]))


def handle_own_feature_overrides(tenant_id):
    return runtime().json_response(
        features=effective_features(tenant_id, for_write=True),
        featureOverrides=overrides_json(tenant_id),
    )


def handle_put_feature_override(tenant_id, code):
    known_feature(code)
    data = runtime().payload()
    if set(data) - {"enabled", "isTrial", "expiresAt", "notes"}:
        raise ApiError(422, "unsupported_field", "Trường ghi đè tính năng không hợp lệ.")
    enabled, trial = data.get("enabled"), data.get("isTrial", False)
    if not isinstance(enabled, bool) or not isinstance(trial, bool):
        raise ApiError(422, "invalid_feature", "enabled và isTrial phải là boolean.")
    expires = (
        timestamp(data["expiresAt"], "expiresAt") if data.get("expiresAt") is not None else None
    )
    if trial and (not enabled or expires is None):
        raise ApiError(422, "invalid_trial", "Dùng thử cần bật tính năng và có ngày hết hạn.")
    notes = data.get("notes", "")
    if not isinstance(notes, str) or len(notes) > 1000:
        raise ApiError(422, "invalid_notes", "Ghi chú phải là chuỗi tối đa 1000 ký tự.")
    runtime().state.tenant = lock_tenant(tenant_id)
    values = {
        "enabled": enabled,
        "is_trial": trial,
        "expires_at": expires,
        "notes": notes,
        "granted_by": runtime().state.user.id,
        "granted_at": utcnow(),
    }
    row = db.session.scalar(
        insert(TenantFeatureOverride)
        .values(tenant_id=tenant_id, code=code, **values)
        .on_conflict_do_update(
            index_elements=[TenantFeatureOverride.tenant_id, TenantFeatureOverride.code],
            set_=values,
        )
        .returning(TenantFeatureOverride)
    )
    audit(
        "feature_override.upserted",
        "feature",
        code,
        {
            "enabled": enabled,
            "isTrial": trial,
            "expiresAt": expires.isoformat() if expires else None,
        },
    )
    return runtime().json_response(featureOverride=override_json(row, runtime().state.user.name))


def handle_delete_feature_override(tenant_id, code):
    known_feature(code)
    runtime().state.tenant = lock_tenant(tenant_id)
    row = db.session.get(TenantFeatureOverride, (tenant_id, code))
    if row:
        db.session.delete(row)
        audit("feature_override.deleted", "feature", code)
    return runtime().json_response(ok=True)
