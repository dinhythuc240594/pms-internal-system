"""Draft invoice headers; posted lines and cash movements are immutable snapshots."""

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from ..core_models import uid, utcnow
from ..extensions import db
from ..pricing.models import MoneySnapshot


class PosInvoice(MoneySnapshot, db.Model):
    __tablename__ = "pos_invoices"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    customer_name = db.Column(db.String(160), nullable=False, default="")
    note = db.Column(db.String(500), nullable=False, default="")
    status = db.Column(db.String(20), nullable=False, default="DRAFT")
    currency = db.Column(db.String(3), nullable=False)
    total = db.Column(db.Numeric(19, 4), nullable=False)
    draft_items = db.Column(JSONB, nullable=False)
    reservation_id = db.Column(db.String(40))
    user_id = db.Column(db.String(40), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    posted_at = db.Column(db.DateTime(timezone=True))
    cancelled_at = db.Column(db.DateTime(timezone=True))
    cancellation_reason = db.Column(db.String(500), nullable=False, default="")
    __table_args__ = (
        UniqueConstraint("tenant_id", "id"),
        ForeignKeyConstraint(
            ["tenant_id", "reservation_id"], ["reservations.tenant_id", "reservations.id"]
        ),
        CheckConstraint("status IN ('DRAFT','POSTED','CANCELLED')", name="status"),
        CheckConstraint("total >= 0", name="nonnegative_total"),
    )


class PosInvoiceItem(MoneySnapshot, db.Model):
    __tablename__ = "pos_invoice_items"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    invoice_id = db.Column(db.String(40), nullable=False)
    service_id = db.Column(db.String(40), nullable=False)
    charge_id = db.Column(db.String(40))
    description = db.Column(db.String(240), nullable=False)
    quantity = db.Column(db.Numeric(12, 4), nullable=False)
    unit_price = db.Column(db.Numeric(19, 4), nullable=False)
    amount = db.Column(db.Numeric(19, 4), nullable=False)
    __table_args__ = (
        UniqueConstraint("tenant_id", "id"),
        UniqueConstraint("tenant_id", "charge_id", name="uq_pos_invoice_items_charge"),
        ForeignKeyConstraint(
            ["tenant_id", "invoice_id"], ["pos_invoices.tenant_id", "pos_invoices.id"]
        ),
        ForeignKeyConstraint(["tenant_id", "service_id"], ["masters.tenant_id", "masters.id"]),
        ForeignKeyConstraint(["tenant_id", "charge_id"], ["charges.tenant_id", "charges.id"]),
        CheckConstraint("quantity > 0 AND unit_price >= 0 AND amount >= 0", name="values"),
    )


class PosPayment(MoneySnapshot, db.Model):
    __tablename__ = "pos_payments"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    invoice_id = db.Column(db.String(40), nullable=False)
    method_id = db.Column(db.String(40), nullable=False)
    fund_id = db.Column(db.String(40), nullable=False)
    method_name = db.Column(db.String(160), nullable=False)
    fund_name = db.Column(db.String(160), nullable=False)
    amount = db.Column(db.Numeric(19, 4), nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    note = db.Column(db.String(500), nullable=False, default="")
    user_id = db.Column(db.String(40), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    __table_args__ = (
        UniqueConstraint("tenant_id", "id"),
        ForeignKeyConstraint(
            ["tenant_id", "invoice_id"], ["pos_invoices.tenant_id", "pos_invoices.id"]
        ),
        ForeignKeyConstraint(["tenant_id", "method_id"], ["masters.tenant_id", "masters.id"]),
        ForeignKeyConstraint(["tenant_id", "fund_id"], ["masters.tenant_id", "masters.id"]),
        CheckConstraint("amount > 0", name="positive_amount"),
    )


class PosRefund(MoneySnapshot, db.Model):
    __tablename__ = "pos_refunds"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    invoice_id = db.Column(db.String(40), nullable=False)
    payment_id = db.Column(db.String(40), nullable=False)
    amount = db.Column(db.Numeric(19, 4), nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    reason = db.Column(db.String(500), nullable=False)
    user_id = db.Column(db.String(40), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    __table_args__ = (
        UniqueConstraint("tenant_id", "id"),
        ForeignKeyConstraint(
            ["tenant_id", "invoice_id"], ["pos_invoices.tenant_id", "pos_invoices.id"]
        ),
        ForeignKeyConstraint(
            ["tenant_id", "payment_id"], ["pos_payments.tenant_id", "pos_payments.id"]
        ),
        CheckConstraint("amount > 0", name="positive_amount"),
    )


class CashDocument(MoneySnapshot, db.Model):
    __tablename__ = "cash_documents"
    id = db.Column(db.String(40), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(40), db.ForeignKey("tenants.id"), nullable=False)
    kind = db.Column(db.String(20), nullable=False)
    fund_id = db.Column(db.String(40), nullable=False)
    to_fund_id = db.Column(db.String(40))
    fund_name = db.Column(db.String(160), nullable=False)
    to_fund_name = db.Column(db.String(160))
    amount = db.Column(db.Numeric(19, 4), nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    effective_date = db.Column(db.Date, nullable=False)
    reversal_of_id = db.Column(db.String(40))
    user_id = db.Column(db.String(40), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    __table_args__ = (
        UniqueConstraint("tenant_id", "id"),
        UniqueConstraint("tenant_id", "reversal_of_id", name="uq_cash_documents_reversal"),
        ForeignKeyConstraint(["tenant_id", "fund_id"], ["masters.tenant_id", "masters.id"]),
        ForeignKeyConstraint(["tenant_id", "to_fund_id"], ["masters.tenant_id", "masters.id"]),
        ForeignKeyConstraint(
            ["tenant_id", "reversal_of_id"], ["cash_documents.tenant_id", "cash_documents.id"]
        ),
        CheckConstraint(
            "kind IN ('receipt','expense','withdrawal','transfer','opening','reversal')",
            name="kind",
        ),
        CheckConstraint("amount >= 0 AND (amount > 0 OR kind = 'opening')", name="amount"),
        CheckConstraint(
            "(kind = 'transfer' AND to_fund_id IS NOT NULL AND to_fund_id != fund_id) "
            "OR kind != 'transfer'",
            name="transfer_funds",
        ),
    )
