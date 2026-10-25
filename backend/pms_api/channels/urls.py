"""Routing metadata; handlers load only when their route is dispatched."""

from flask import Blueprint

from common import CommonURL


class URL(CommonURL):
    SNAPSHOT = "/api/tenants/<tenant_id>/channels"
    CATALOG = "/api/tenants/<tenant_id>/channels/catalog"
    SAVE_CONFIG = "/api/tenants/<tenant_id>/channels/config"
    SAVE_MAPPING = "/api/tenants/<tenant_id>/channels/mappings"
    CREATE_JOB = "/api/tenants/<tenant_id>/channels/jobs"
    RETRY_JOB = "/api/tenants/<tenant_id>/channels/jobs/<job_id>/retry"
    WEBHOOK = "/api/channex/webhooks/<tenant_id>"

    REMOTE_CHANNELS = "/api/tenants/<tenant_id>/channels/remote"
    REMOTE_CREATE_CHANNEL = "/api/tenants/<tenant_id>/channels/remote"
    REMOTE_ADAPTERS = "/api/tenants/<tenant_id>/channels/remote/adapters"
    REMOTE_ADAPTER = "/api/tenants/<tenant_id>/channels/remote/adapters/<code>"
    REMOTE_PROBE = "/api/tenants/<tenant_id>/channels/remote/probe/<action>"
    REMOTE_CHANNEL = "/api/tenants/<tenant_id>/channels/remote/<channel_id>"
    REMOTE_UPDATE_CHANNEL = "/api/tenants/<tenant_id>/channels/remote/<channel_id>"
    REMOTE_DELETE_CHANNEL = "/api/tenants/<tenant_id>/channels/remote/<channel_id>"
    REMOTE_CHANNEL_ACTION = "/api/tenants/<tenant_id>/channels/remote/<channel_id>/<action>"
    REMOTE_AIRBNB_LINK = "/api/tenants/<tenant_id>/channels/remote/airbnb-link"
    REMOTE_AIRBNB_CONFIRM = "/api/tenants/<tenant_id>/channels/remote/airbnb-confirm"
    REMOTE_AIRBNB_LISTINGS = "/api/tenants/<tenant_id>/channels/remote/<channel_id>/airbnb/listings"
    REMOTE_AIRBNB_MAPPING = "/api/tenants/<tenant_id>/channels/remote/<channel_id>/airbnb/mappings"
    REMOTE_AIRBNB_UNMAP = (
        "/api/tenants/<tenant_id>/channels/remote/<channel_id>/airbnb/mappings/<mapping_id>"
    )


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
    URL.CATALOG,
    "pms_api.channels.routes:CatalogView",
    endpoint="catalog",
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

URL.register(
    channels,
    URL.REMOTE_CHANNELS,
    "pms_api.channels.remote:RemoteChannelsView",
    endpoint="remote_channels",
    methods=["GET"],
)

URL.register(
    channels,
    URL.REMOTE_CREATE_CHANNEL,
    "pms_api.channels.remote:SaveRemoteChannelView",
    endpoint="remote_create_channel",
    methods=["POST"],
)

URL.register(
    channels,
    URL.REMOTE_ADAPTERS,
    "pms_api.channels.remote:RemoteAdaptersView",
    endpoint="remote_adapters",
    methods=["GET"],
)

URL.register(
    channels,
    URL.REMOTE_ADAPTER,
    "pms_api.channels.remote:RemoteAdaptersView",
    endpoint="remote_adapter",
    methods=["GET"],
)

URL.register(
    channels,
    URL.REMOTE_PROBE,
    "pms_api.channels.remote:RemoteProbeView",
    endpoint="remote_probe",
    methods=["POST"],
)

URL.register(
    channels,
    URL.REMOTE_CHANNEL,
    "pms_api.channels.remote:RemoteChannelDetailView",
    endpoint="remote_channel",
    methods=["GET"],
)

URL.register(
    channels,
    URL.REMOTE_UPDATE_CHANNEL,
    "pms_api.channels.remote:SaveRemoteChannelView",
    endpoint="remote_update_channel",
    methods=["PATCH"],
)

URL.register(
    channels,
    URL.REMOTE_DELETE_CHANNEL,
    "pms_api.channels.remote:RemoteChannelActionView",
    endpoint="remote_delete_channel",
    methods=["DELETE"],
)

URL.register(
    channels,
    URL.REMOTE_CHANNEL_ACTION,
    "pms_api.channels.remote:RemoteChannelActionView",
    endpoint="remote_channel_action",
    methods=["POST"],
)

URL.register(
    channels,
    URL.REMOTE_AIRBNB_LINK,
    "pms_api.channels.remote:RemoteAirbnbLinkView",
    endpoint="remote_airbnb_link",
    methods=["POST"],
)

URL.register(
    channels,
    URL.REMOTE_AIRBNB_CONFIRM,
    "pms_api.channels.remote:RemoteAirbnbConfirmView",
    endpoint="remote_airbnb_confirm",
    methods=["POST"],
)

URL.register(
    channels,
    URL.REMOTE_AIRBNB_LISTINGS,
    "pms_api.channels.remote:RemoteAirbnbListingsView",
    endpoint="remote_airbnb_listings",
    methods=["GET"],
)

URL.register(
    channels,
    URL.REMOTE_AIRBNB_MAPPING,
    "pms_api.channels.remote:RemoteAirbnbMappingView",
    endpoint="remote_airbnb_mapping",
    methods=["POST"],
)

URL.register(
    channels,
    URL.REMOTE_AIRBNB_UNMAP,
    "pms_api.channels.remote:RemoteAirbnbMappingView",
    endpoint="remote_airbnb_unmap",
    methods=["DELETE"],
)
