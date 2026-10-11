import re

from sqlalchemy import func, select

from ..auth.routes import tenant_json, validate_email
from ..catalog.models import PhysicalRoom
from ..core_models import Tenant, TenantUser, User
from ..extensions import db
from ..security import ApiError
from .client_models import TenantClientProfile

CLIENT_FIELDS = {
    "contactName": ("contact_name", 160),
    "contactEmail": ("contact_email", 254),
    "contactPhone": ("contact_phone", 40),
    "address": ("address", 500),
    "city": ("city", 160),
    "taxId": ("tax_id", 40),
    "domain": ("domain", 253),
    "customerNotes": ("customer_notes", 4000),
}


def client_values(data):
    result = {}
    for key, (column, limit) in CLIENT_FIELDS.items():
        if key not in data:
            continue
        value = data[key]
        if not isinstance(value, str) or len(value.strip()) > limit:
            raise ApiError(422, "invalid_contact", f"{key} phải là chuỗi tối đa {limit} ký tự.")
        value = value.strip()
        if key == "contactEmail" and value:
            value = validate_email(value)
        if key == "domain" and value:
            value = value.lower()
            labels = value.split(".")
            if len(labels) < 2 or any(
                not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label) for label in labels
            ):
                raise ApiError(
                    422, "invalid_domain", "Nhập hostname như hotel.example.com, không nhập URL."
                )
        result[column] = value
    return result


def customer_tenants(tenant_id=None):
    query = select(Tenant).order_by(Tenant.created_at, Tenant.id)
    if tenant_id:
        query = query.where(Tenant.id == tenant_id)
    rows = db.session.scalars(query).all()
    ids = [row.id for row in rows]
    profiles = {
        row.tenant_id: row
        for row in db.session.scalars(
            select(TenantClientProfile).where(TenantClientProfile.tenant_id.in_(ids))
        )
    }
    owners = {}
    for tid, owner in db.session.execute(
        select(TenantUser.tenant_id, User)
        .join(User, User.id == TenantUser.user_id)
        .where(TenantUser.tenant_id.in_(ids), TenantUser.role == "HOTEL_OWNER")
        .order_by(TenantUser.active.desc(), User.active.desc(), User.id)
    ):
        owners.setdefault(tid, owner)
    room_counts = dict(
        db.session.execute(
            select(PhysicalRoom.tenant_id, func.count())
            .where(PhysicalRoom.tenant_id.in_(ids), PhysicalRoom.active.is_(True))
            .group_by(PhysicalRoom.tenant_id)
        ).all()
    )
    result = []
    for tenant in rows:
        owner, profile = owners.get(tenant.id), profiles.get(tenant.id)
        fields = {
            key: getattr(profile, column) if profile else None
            for key, (column, _) in CLIENT_FIELDS.items()
        }
        for key, attribute in (("contactName", "name"), ("contactEmail", "email")):
            if fields[key] is None and owner:
                fields[key] = getattr(owner, attribute)
        result.append(
            {
                **tenant_json(tenant),
                **{key: value or "" for key, value in fields.items()},
                "rooms": room_counts.get(tenant.id, 0),
                "createdAt": tenant.created_at.isoformat(),
            }
        )
    return result
