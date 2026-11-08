"""HTTP entry points; business behavior is implemented in the application layer."""

from common import CommonMethodView

from ..security import require_system
from . import channex_airbnb_application as application


class AirbnbConnectionLinkView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(property_id):
        return application.handle_airbnb_connection_link(property_id)


class AirbnbConfirmView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_airbnb_confirm()


class AirbnbListingsView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(property_id, channel_id):
        return application.handle_airbnb_listings(property_id, channel_id)


class AirbnbMappingView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(property_id, channel_id, mapping_id=None):
        return application.handle_airbnb_mapping(property_id, channel_id, mapping_id)


def __getattr__(name):
    return getattr(application, name)
