"""Manager roster from local data; credentials and provider payloads stay private."""

from sqlalchemy import and_, func, select

from pms_api.channels.application import connection_json

from ..catalog.models import PhysicalRoom, RoomType
from ..channels.models import ChannelConnection, ChannelJob, ChannelMapping
from ..core_models import Tenant
from ..extensions import db
from .client_models import TenantClientProfile


def handle_channex():
    tenants = db.session.execute(
        select(Tenant, TenantClientProfile.city)
        .outerjoin(TenantClientProfile, TenantClientProfile.tenant_id == Tenant.id)
        .order_by(Tenant.name, Tenant.id)
    ).all()
    connections = {row.tenant_id: row for row in db.session.scalars(select(ChannelConnection))}
    room_counts = dict(
        db.session.execute(
            select(PhysicalRoom.tenant_id, func.count())
            .where(PhysicalRoom.active.is_(True))
            .group_by(PhysicalRoom.tenant_id)
        ).all()
    )
    room_type_counts = dict(
        db.session.execute(
            select(RoomType.tenant_id, func.count())
            .where(RoomType.active.is_(True))
            .group_by(RoomType.tenant_id)
        ).all()
    )
    mapping_counts = {
        tenant_id: (active, closing)
        for tenant_id, active, closing in db.session.execute(
            select(
                ChannelMapping.tenant_id,
                func.count().filter(
                    ChannelMapping.active.is_(True),
                    ChannelMapping.pause_requested.is_(False),
                    RoomType.active.is_(True),
                ),
                func.count().filter(ChannelMapping.pause_requested.is_(True)),
            )
            .join(
                RoomType,
                and_(
                    RoomType.tenant_id == ChannelMapping.tenant_id,
                    RoomType.id == ChannelMapping.room_type_id,
                ),
            )
            .group_by(ChannelMapping.tenant_id)
        )
    }
    latest_jobs = {
        row.tenant_id: {
            "kind": row.kind,
            "status": row.status,
            "errorCode": row.error_code,
            "createdAt": row.created_at.isoformat(),
        }
        for row in db.session.execute(
            select(
                ChannelJob.tenant_id,
                ChannelJob.kind,
                ChannelJob.status,
                ChannelJob.error_code,
                ChannelJob.created_at,
            )
            .distinct(ChannelJob.tenant_id)
            .order_by(ChannelJob.tenant_id, ChannelJob.created_at.desc(), ChannelJob.id.desc())
        )
    }
    hotels = []
    for tenant, city in tenants:
        connection = connections.get(tenant.id)
        summary = connection_json(connection) if connection else None
        hotels.append(
            {
                "tenantId": tenant.id,
                "name": tenant.name,
                "city": city or "",
                "status": tenant.status,
                "roomCount": room_counts.get(tenant.id, 0),
                "roomTypeCount": room_type_counts.get(tenant.id, 0),
                "mappingCount": mapping_counts.get(tenant.id, (0, 0))[0],
                "closingCount": mapping_counts.get(tenant.id, (0, 0))[1],
                "connection": {
                    key: summary[key]
                    for key in (
                        "environment",
                        "propertyId",
                        "active",
                        "credentialsConfigured",
                        "credentialError",
                        "credentialSource",
                        "verifiedAt",
                        "webhookRegistered",
                    )
                }
                if summary
                else None,
                "latestJob": latest_jobs.get(tenant.id),
            }
        )
    return {"hotels": hotels}
