"""Compose the tenant workspace without coupling it to application setup."""

from pms_api.admin.application import tenant_users_json
from pms_api.auth.application import tenant_json
from pms_api.bookings.application import booking_snapshot
from pms_api.catalog.application import catalog_snapshot
from pms_api.finance.application import finance_snapshot
from pms_api.housekeeping.application import housekeeping_snapshot
from pms_api.inventory.application import inventory_snapshot
from pms_api.ports import runtime

from .subscriptions import workspace_entitlements


def handle_workspace(tenant_id):
    data = {
        **catalog_snapshot(tenant_id),
        **booking_snapshot(tenant_id),
        **(finance_snapshot(tenant_id) if runtime().state.role != "HOUSEKEEPING" else {}),
        **(housekeeping_snapshot(tenant_id) if runtime().state.role != "ACCOUNTANT" else {}),
        **(
            inventory_snapshot(tenant_id)
            if runtime().state.role in {"HOTEL_OWNER", "ACCOUNTANT"}
            else {}
        ),
        "tenant": tenant_json(runtime().state.tenant),
    }
    data["users"] = tenant_users_json(tenant_id) if runtime().state.role == "HOTEL_OWNER" else []
    data.update(workspace_entitlements(tenant_id))

    if runtime().state.role not in {"HOTEL_OWNER", "ACCOUNTANT"}:
        for catalog in ("warehouses", "items", "itemCategories", "suppliers"):
            data["masters"][catalog] = []

    if runtime().state.role == "HOUSEKEEPING":
        data["masters"]["funds"] = []
        data["masters"]["paymentMethods"] = []
        for rows in data["masters"].values():
            for item in rows:
                for key in ("price", "commission", "tax"):
                    item.pop(key, None)
        for item in data["rates"]:
            item.pop("price", None)
    return runtime().json_response(data)
