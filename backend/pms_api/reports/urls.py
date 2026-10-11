"""Routing metadata; handlers load only when their route is dispatched."""

from flask import Blueprint

from common import CommonURL


class URL(CommonURL):
    DASHBOARD = "/dashboard"
    REVENUE_REPORT = "/revenue"
    FINANCIAL_REPORT = "/financial"


reports = Blueprint("reports", __name__, url_prefix="/api/tenants/<tenant_id>/reports")

URL.register(
    reports,
    URL.DASHBOARD,
    "pms_api.reports.routes:DashboardView",
    endpoint="dashboard",
    methods=["GET"],
)

URL.register(
    reports,
    URL.REVENUE_REPORT,
    "pms_api.reports.routes:RevenueReportView",
    endpoint="revenue_report",
    methods=["GET"],
)

URL.register(
    reports,
    URL.FINANCIAL_REPORT,
    "pms_api.reports.routes:FinancialReportView",
    endpoint="financial_report",
    methods=["GET"],
)
