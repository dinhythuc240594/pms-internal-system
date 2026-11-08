"""PostgreSQL access for OTA receipts, using the worker's existing session."""

from sqlalchemy import select

from .models import ChannelRevision


class SQLAlchemyRevisionRepository:
    def __init__(self, session, enqueue):
        self.session = session
        self.enqueue = enqueue

    def has_revision(self, tenant_id, revision_id):
        return bool(
            self.session.scalar(
                select(ChannelRevision.id).where(
                    ChannelRevision.tenant_id == tenant_id,
                    ChannelRevision.revision_id == revision_id,
                    ChannelRevision.outcome.in_(("imported", "stale", "cancelled")),
                )
            )
        )

    def enqueue_ack(self, tenant_id, actor_id, revision_id):
        return self.enqueue(
            tenant_id, actor_id, "ack_revision", {"revisionId": revision_id}, "ack:" + revision_id
        )
