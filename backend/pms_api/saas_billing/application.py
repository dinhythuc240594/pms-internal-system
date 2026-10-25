"""Manual SaaS invoicing and current system overview; no payment gateway or plan grants."""

import re
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import case, func, select

from pms_api.bookings.application import begin_money, decimal_text, iso, money_value, string_value
from pms_api.finance.application import pagination
from pms_api.ports import runtime

from ..core_models import Plan, Subscription, Tenant, User, utcnow
from ..extensions import db
from ..security import ApiError, audit
from ..subscriptions import plan_code
from .models import SaaSIdempotencyRecord, SaaSInvoice, SaaSPayment

PREFIX = "/api/billing/invoices"


def parse_date(value):
    try:
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError
        return date.fromisoformat(value)
    except ValueError:
        raise ApiError(422, "invalid_dates", "Ngày phải có định dạng YYYY-MM-DD.") from None


def window(*, default_month=False):
    today = utcnow().date()
    first = today.replace(day=1)
    next_month = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    start = (
        parse_date(runtime().request.args["start"])
        if "start" in runtime().request.args
        else first
        if default_month
        else None
    )
    end = (
        parse_date(runtime().request.args["end"])
        if "end" in runtime().request.args
        else next_month
        if default_month
        else None
    )
    if start and end and start >= end:
        raise ApiError(422, "invalid_dates", "Ngày kết thúc phải sau ngày bắt đầu.")
    return (
        datetime.combine(start, time.min, UTC) if start else None,
        datetime.combine(end, time.min, UTC) if end else None,
    )


def allowed_fields(data, fields):
    if data.keys() - fields:
        raise ApiError(422, "invalid_input", "Nội dung có trường không được hỗ trợ.")


def payment_totals():
    return (
        select(
            SaaSPayment.invoice_id,
            func.sum(SaaSPayment.amount).label("paid"),
        )
        .group_by(SaaSPayment.invoice_id)
        .subquery()
    )


def invoice_query():
    totals = payment_totals()
    paid = func.coalesce(totals.c.paid, 0)
    return select(SaaSInvoice, Tenant.name, paid).join(
        Tenant, Tenant.id == SaaSInvoice.tenant_id
    ).outerjoin(totals, totals.c.invoice_id == SaaSInvoice.id), paid


def invoice_status(row, paid):
    return (
        "void"
        if row.voided_at
        else "paid"
        if paid == row.amount
        else "partial"
        if paid
        else "unpaid"
    )


def invoice_json(row, tenant_name, payments):
    paid = sum((payment.amount for payment in payments), Decimal(0))
    return {
        "id": row.id,
        "number": f"SAAS-{row.number:06d}",
        "tenantId": row.tenant_id,
        "tenantName": tenant_name,
        "description": row.description,
        "amount": decimal_text(row.amount),
        "currency": row.currency,
        "dueDate": iso(row.due_date),
        "status": invoice_status(row, paid),
        "paid": decimal_text(paid),
        "balance": decimal_text(0 if row.voided_at else row.amount - paid),
        "createdAt": iso(row.created_at),
        "voidedAt": iso(row.voided_at),
        "voidReason": row.void_reason,
        "payments": [
            {
                "id": payment.id,
                "amount": decimal_text(payment.amount),
                "method": payment.method,
                "reference": payment.reference,
                "note": payment.note,
                "createdAt": iso(payment.created_at),
            }
            for payment in payments
        ],
    }


def invoice_response(row):
    payments = db.session.scalars(
        select(SaaSPayment)
        .where(SaaSPayment.tenant_id == row.tenant_id, SaaSPayment.invoice_id == row.id)
        .order_by(SaaSPayment.created_at, SaaSPayment.id)
    ).all()
    return invoice_json(row, db.session.get(Tenant, row.tenant_id).name, payments)


def find_invoice(invoice_id, *, locked=False):
    query = select(SaaSInvoice).where(SaaSInvoice.id == invoice_id)
    if locked:
        query = query.with_for_update().execution_options(populate_existing=True)
    row = db.session.scalar(query)
    if not row:
        raise ApiError(404, "not_found", "Không tìm thấy hóa đơn SaaS.")
    return row


def handle_list_invoices():
    page, size = pagination()
    query, paid = invoice_query()
    if runtime().request.args.get("tenantId"):
        query = query.where(SaaSInvoice.tenant_id == runtime().request.args["tenantId"])
    start, end = window()
    if start:
        query = query.where(SaaSInvoice.created_at >= start)
    if end:
        query = query.where(SaaSInvoice.created_at < end)
    if runtime().request.args.get("status"):
        status = runtime().request.args["status"]
        if status not in {"unpaid", "partial", "paid", "void"}:
            raise ApiError(422, "invalid_status", "Trạng thái hóa đơn không hợp lệ.")
        if status == "void":
            query = query.where(SaaSInvoice.voided_at.is_not(None))
        else:
            condition = (
                paid == 0
                if status == "unpaid"
                else paid == SaaSInvoice.amount
                if status == "paid"
                else (paid > 0) & (paid < SaaSInvoice.amount)
            )
            query = query.where(SaaSInvoice.voided_at.is_(None), condition)
    count = db.session.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.session.execute(
        query.order_by(SaaSInvoice.created_at.desc(), SaaSInvoice.number.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    grouped = defaultdict(list)
    if rows:
        for payment in db.session.scalars(
            select(SaaSPayment)
            .where(SaaSPayment.invoice_id.in_([row.id for row, _, _ in rows]))
            .order_by(SaaSPayment.created_at, SaaSPayment.id)
        ):
            grouped[payment.invoice_id].append(payment)
    return {
        "invoices": [invoice_json(row, name, grouped[row.id]) for row, name, _ in rows],
        "pagination": {"page": page, "pageSize": size, "totalItems": count},
    }


def handle_create_invoice():
    data = runtime().payload()
    allowed_fields(data, {"tenantId", "description", "amount", "currency", "dueDate"})
    tenant_id = string_value(data.get("tenantId"), "Khách sạn", 40, required=True)
    if db.session.get(Tenant, tenant_id) is None:
        raise ApiError(422, "invalid_tenant", "Khách sạn không tồn tại.")
    currency = data.get("currency")
    if not isinstance(currency, str) or currency not in {"VND", "USD"}:
        raise ApiError(422, "invalid_currency", "Tiền tệ phải là VND hoặc USD.")
    row = SaaSInvoice(
        tenant_id=tenant_id,
        description=string_value(data.get("description"), "Nội dung", 500, required=True),
        amount=money_value(data.get("amount")),
        currency=currency,
        due_date=parse_date(data["dueDate"]) if data.get("dueDate") is not None else None,
        user_id=runtime().state.user.id,
    )
    key, fingerprint, replay = begin_money(row, data, record_model=SaaSIdempotencyRecord)
    if replay is not None:
        return replay, 201
    db.session.add(row)
    db.session.flush()
    audit(
        "saas.invoice_created",
        "saas_invoice",
        row.id,
        {
            "tenantId": row.tenant_id,
            "number": f"SAAS-{row.number:06d}",
            "amount": decimal_text(row.amount),
            "currency": row.currency,
        },
    )
    response = invoice_response(row)
    db.session.add(
        SaaSIdempotencyRecord(
            tenant_id=row.tenant_id,
            key=key,
            fingerprint=fingerprint,
            response=response,
        )
    )
    db.session.flush()
    return response, 201


def handle_add_payment(invoice_id):
    data = runtime().payload()
    allowed_fields(data, {"amount", "method", "reference", "note"})
    row = find_invoice(invoice_id)
    key, fingerprint, replay = begin_money(row, data, record_model=SaaSIdempotencyRecord)
    if replay is not None:
        return replay, 201
    row = find_invoice(invoice_id, locked=True)
    amount = money_value(data.get("amount"))
    method = data.get("method")
    if not isinstance(method, str) or method not in {"bank", "cash"}:
        raise ApiError(422, "invalid_method", "Phương thức phải là bank hoặc cash.")
    paid = db.session.scalar(
        select(func.coalesce(func.sum(SaaSPayment.amount), 0)).where(
            SaaSPayment.tenant_id == row.tenant_id, SaaSPayment.invoice_id == row.id
        )
    )
    if row.voided_at:
        raise ApiError(409, "invoice_void", "Không thể thu tiền hóa đơn đã hủy.")
    if amount > row.amount - paid:
        raise ApiError(409, "overpayment", "Số tiền vượt số dư hóa đơn.")
    payment = SaaSPayment(
        tenant_id=row.tenant_id,
        invoice_id=row.id,
        amount=amount,
        method=method,
        reference=string_value(data.get("reference"), "Mã tham chiếu", 160),
        note=string_value(data.get("note"), "Ghi chú", 1000),
        user_id=runtime().state.user.id,
    )
    db.session.add(payment)
    db.session.flush()
    audit(
        "saas.payment_recorded",
        "saas_invoice",
        row.id,
        {
            "tenantId": row.tenant_id,
            "paymentId": payment.id,
            "amount": decimal_text(amount),
            "currency": row.currency,
        },
    )
    response = invoice_response(row)
    db.session.add(
        SaaSIdempotencyRecord(
            tenant_id=row.tenant_id,
            key=key,
            fingerprint=fingerprint,
            response=response,
        )
    )
    db.session.flush()
    return response, 201


def handle_void_invoice(invoice_id):
    data = runtime().payload()
    allowed_fields(data, {"reason"})
    reason = string_value(data.get("reason"), "Lý do", 1000, required=True)
    row = find_invoice(invoice_id, locked=True)
    paid = db.session.scalar(
        select(func.coalesce(func.sum(SaaSPayment.amount), 0)).where(
            SaaSPayment.tenant_id == row.tenant_id, SaaSPayment.invoice_id == row.id
        )
    )
    if row.voided_at or paid:
        raise ApiError(409, "invoice_not_unpaid", "Chỉ hủy được hóa đơn chưa thu tiền.")
    row.voided_at, row.voided_by, row.void_reason = utcnow(), runtime().state.user.id, reason
    db.session.flush()
    audit(
        "saas.invoice_voided",
        "saas_invoice",
        row.id,
        {"tenantId": row.tenant_id, "reason": reason},
    )
    return invoice_response(row)


def handle_overview():
    start, end = window(default_month=True)
    now = utcnow()
    tenants = dict(
        db.session.execute(select(Tenant.status, func.count()).group_by(Tenant.status)).all()
    )
    total = sum(tenants.values())
    plans = {"FREE": 0, "PRO": 0, "unassigned": total}
    for plan, count in db.session.execute(
        select(Plan, func.count())
        .join(Subscription, Subscription.plan_id == Plan.id)
        .where(
            Plan.active.is_(True),
            Subscription.status == "active",
            Subscription.start_date <= now,
            (Subscription.end_date.is_(None)) | (Subscription.end_date > now),
        )
        .group_by(Plan.id)
    ):
        code = plan_code(plan)
        if code:
            plans[code] = plans.get(code, 0) + count
            plans["unassigned"] -= count
    totals = payment_totals()
    balance = SaaSInvoice.amount - func.coalesce(totals.c.paid, 0)
    invoiced_period = (SaaSInvoice.created_at >= start) & (SaaSInvoice.created_at < end)
    sums = db.session.execute(
        select(
            SaaSInvoice.currency,
            func.sum(case((invoiced_period, SaaSInvoice.amount), else_=0)),
            func.sum(balance),
            func.sum(case((SaaSInvoice.due_date < now.date(), balance), else_=0)),
        )
        .outerjoin(totals, totals.c.invoice_id == SaaSInvoice.id)
        .where(SaaSInvoice.voided_at.is_(None))
        .group_by(SaaSInvoice.currency)
    ).all()
    received = dict(
        db.session.execute(
            select(SaaSInvoice.currency, func.sum(SaaSPayment.amount))
            .join(SaaSInvoice, SaaSInvoice.id == SaaSPayment.invoice_id)
            .where(SaaSPayment.created_at >= start, SaaSPayment.created_at < end)
            .group_by(SaaSInvoice.currency)
        ).all()
    )
    recent = db.session.execute(
        select(SaaSPayment, SaaSInvoice.number, SaaSInvoice.currency, Tenant.name)
        .join(SaaSInvoice, SaaSInvoice.id == SaaSPayment.invoice_id)
        .join(Tenant, Tenant.id == SaaSPayment.tenant_id)
        .where(SaaSPayment.created_at >= start, SaaSPayment.created_at < end)
        .order_by(SaaSPayment.created_at.desc(), SaaSPayment.id)
        .limit(10)
    ).all()
    return {
        "start": start.date().isoformat(),
        "end": end.date().isoformat(),
        "tenants": {
            "total": total,
            "active": tenants.get("active", 0),
            "suspended": tenants.get("suspended", 0),
        },
        "users": {
            "active": db.session.scalar(
                select(func.count()).select_from(User).where(User.active.is_(True))
            )
        },
        "plans": plans,
        "currencies": [
            {
                "currency": currency,
                "invoiced": decimal_text(invoiced),
                "received": decimal_text(received.get(currency, 0)),
                "outstanding": decimal_text(outstanding),
                "overdue": decimal_text(overdue),
            }
            for currency, invoiced, outstanding, overdue in sorted(sums)
        ],
        "recentPayments": [
            {
                "invoiceNumber": f"SAAS-{number:06d}",
                "tenantName": name,
                "amount": decimal_text(payment.amount),
                "currency": currency,
                "createdAt": iso(payment.created_at),
            }
            for payment, number, currency, name in recent
        ],
    }
