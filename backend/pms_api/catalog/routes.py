"""HTTP entry points; business behavior is implemented in the application layer."""

from common import CommonMethodView

from ..security import require_tenant
from . import application as application


class SaveMasterRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("settings.write")
    def dispatch_request(tenant_id, catalog_name):
        return application.handle_save_master(tenant_id, catalog_name)


class ToggleMasterRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("settings.write")
    def dispatch_request(tenant_id, catalog_name, item_id):
        return application.handle_toggle_master(tenant_id, catalog_name, item_id)


class SettingsRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("settings.write")
    def dispatch_request(tenant_id):
        return application.handle_settings(tenant_id)


class RatesRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("rates.view")
    def dispatch_request(tenant_id):
        return application.handle_rates(tenant_id)


class SaveRatesRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("settings.write")
    def dispatch_request(tenant_id):
        return application.handle_save_rates(tenant_id)


class RoomBlocksRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("rooms.view")
    def dispatch_request(tenant_id):
        return application.handle_room_blocks(tenant_id)


class AddRoomBlockRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("settings.write")
    def dispatch_request(tenant_id):
        return application.handle_add_room_block(tenant_id)


class DeleteRoomBlockRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("settings.write")
    def dispatch_request(tenant_id, block_id):
        return application.handle_delete_room_block(tenant_id, block_id)


class AvailabilityRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("rooms.view")
    def dispatch_request(tenant_id):
        return application.handle_availability(tenant_id)


class QuoteRouteView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.view")
    def dispatch_request(tenant_id):
        return application.handle_quote(tenant_id)


def __getattr__(name):
    if name in {"URL", "catalog"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    return getattr(application, name)
