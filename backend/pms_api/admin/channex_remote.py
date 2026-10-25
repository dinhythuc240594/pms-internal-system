"""HTTP adapters. Business operations live in the application module."""

from common import CommonMethodView

from ..security import require_system
from . import channex_remote_application as application


class RemoteAccountsView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_remote_accounts()


class RemotePropertiesView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_remote_properties()


class SaveRemotePropertyView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request():
        return application.handle_save_remote_property()


class RemoteCatalogView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(property_id):
        return application.handle_remote_catalog(property_id)


class SaveRemoteRoomTypeView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(property_id, room_type_id=None):
        return application.handle_save_remote_room_type(property_id, room_type_id)


class SaveRemoteRatePlanView(CommonMethodView):
    @staticmethod
    @require_system()
    def dispatch_request(property_id, rate_plan_id=None):
        return application.handle_save_remote_rate_plan(property_id, rate_plan_id)


def __getattr__(name):
    return getattr(application, name)
