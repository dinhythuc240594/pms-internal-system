"""HTTP entry points; business behavior is implemented in the application layer."""

from common import CommonMethodView

from ..security import require_tenant
from . import application as application


class GetMastersView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.view")
    def dispatch_request(tenant_id):
        return application.handle_get_masters(tenant_id)


class SaveMasterView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.write")
    def dispatch_request(tenant_id, catalog_name):
        return application.handle_save_master(tenant_id, catalog_name)


class SaveLinkView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.write")
    def dispatch_request(tenant_id):
        return application.handle_save_link(tenant_id)


class CreateDocumentView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.write")
    def dispatch_request(tenant_id):
        return application.handle_create_document(tenant_id)


class ListDocumentsView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.view")
    def dispatch_request(tenant_id):
        return application.handle_list_documents(tenant_id)


class GetDocumentView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.view")
    def dispatch_request(tenant_id, document_id):
        return application.handle_get_document(tenant_id, document_id)


class ReverseDocumentView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.write")
    def dispatch_request(tenant_id, document_id):
        return application.handle_reverse_document(tenant_id, document_id)


class ReturnPosView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.write")
    def dispatch_request(tenant_id, invoice_id):
        return application.handle_return_pos(tenant_id, invoice_id)


class GetStockView(CommonMethodView):
    @staticmethod
    @require_tenant("inventory.view")
    def dispatch_request(tenant_id):
        return application.handle_get_stock(tenant_id)


def __getattr__(name):
    if name in {"URL", "inventory"}:
        from importlib import import_module

        return getattr(import_module(".urls", __package__), name)
    return getattr(application, name)
