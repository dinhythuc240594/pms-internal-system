"""Routing metadata; handlers load only when their route is dispatched."""

from flask import Blueprint

from common import CommonURL


class URL(CommonURL):
    SNAPSHOT = "/api/tenants/<tenant_id>/channels"
    SAVE_CONFIG = "/api/tenants/<tenant_id>/channels/config"
    SAVE_MAPPING = "/api/tenants/<tenant_id>/channels/mappings"
    CREATE_JOB = "/api/tenants/<tenant_id>/channels/jobs"
    RETRY_JOB = "/api/tenants/<tenant_id>/channels/jobs/<job_id>/retry"
    WEBHOOK = "/api/channex/webhooks/<tenant_id>"


channels = Blueprint("channels", __name__)

URL.register(
    channels,
    URL.SNAPSHOT,
    "pms_api.channels.routes:SnapshotView",
    endpoint="snapshot",
    methods=["GET"],
)

URL.register(
    channels,
    URL.SAVE_CONFIG,
    "pms_api.channels.routes:SaveConfigView",
    endpoint="save_config",
    methods=["PUT"],
)

URL.register(
    channels,
    URL.SAVE_MAPPING,
    "pms_api.channels.routes:SaveMappingView",
    endpoint="save_mapping",
    methods=["PUT"],
)

URL.register(
    channels,
    URL.CREATE_JOB,
    "pms_api.channels.routes:CreateJobView",
    endpoint="create_job",
    methods=["POST"],
)

URL.register(
    channels,
    URL.RETRY_JOB,
    "pms_api.channels.routes:RetryJobView",
    endpoint="retry_job",
    methods=["POST"],
)

URL.register(
    channels,
    URL.WEBHOOK,
    "pms_api.channels.routes:WebhookView",
    endpoint="webhook",
    methods=["POST"],
)
