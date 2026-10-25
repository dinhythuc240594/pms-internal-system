"""Reconcile frozen room-net commissions and pay through the shared cash ledger."""

from collections import defaultdict
from decimal import Decimal

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import aliased

from pms_api.bookings.application import (
    decimal_text,
    find_reservation,
    iso,
    money_value,
    string_value,
)
from pms_api.finance.application import (
    begin,
    cash_category,
    ensure_available,
    finish,
    ledger,
    local_date,
    lock_funds,
    pagination,
    parse_date,
)
from pms_api.ports import runtime

from ..bookings.models import Charge, Refund, Reservation, ReservationNight
from ..extensions import db
from ..pricing.engine import money_json, rounded, snapshot_money
from ..security import ApiError, audit
from ..subscriptions import feature_enabled
from .models import CashDocument, CommissionPayout, CommissionSettlement


def review_condition(tenant_id):
    after_checkout = func.coalesce(Reservation.checked_out_at, Reservation.created_at)
    return or_(
        Reservation.status != "CHECKED_OUT",
        select(Charge.id)
        .where(
            Charge.tenant_id == tenant_id,
            Charge.reservation_id == Reservation.id,
            or_(Charge.created_at > after_checkout, Charge.kind == "discount"),
        )
        .correlate(Reservation)
        .exists(),
        select(Refund.id)
        .where(
            Refund.tenant_id == tenant_id,
            Refund.reservation_id == Reservation.id,
            Refund.created_at > after_checkout,
        )
        .correlate(Reservation)
        .exists(),
    )


def review_booking_ids(bookings):
    return set(
        db.session.scalars(
            select(Reservation.id).where(
                Reservation.tenant_id == runtime().state.tenant.id,
                Reservation.id.in_([row.id for row in bookings]),
                review_condition(runtime().state.tenant.id),
            )
        )
    )


def commission_json(rows, bookings):
    by_booking = {row.id: row for row in bookings}
    payouts = list(
        db.session.execute(
            select(CommissionPayout, CashDocument)
            .join(
                CashDocument,
                (CashDocument.tenant_id == CommissionPayout.tenant_id)
                & (CashDocument.id == CommissionPayout.cash_document_id),
            )
            .where(
                CommissionPayout.tenant_id == runtime().state.tenant.id,
                CommissionPayout.commission_id.in_([row.id for row in rows]),
            )
            .order_by(CommissionPayout.created_at, CommissionPayout.id)
        )
    )
    reversed_ids = set(
        db.session.scalars(
            select(CashDocument.reversal_of_id).where(
                CashDocument.tenant_id == runtime().state.tenant.id,
                CashDocument.reversal_of_id.in_([document.id for _, document in payouts]),
            )
        )
    )
    histories = defaultdict(list)
    paid = defaultdict(lambda: Decimal(0))
    for payout, document in payouts:
        reversed_payment = document.id in reversed_ids
        if not reversed_payment:
            paid[payout.commission_id] += document.amount
        histories[payout.commission_id].append(
            {
                "id": payout.id,
                "cashDocumentId": document.id,
                "fundId": document.fund_id,
                "amount": decimal_text(document.amount),
                "date": iso(document.effective_date),
                "note": document.description,
                "reversed": reversed_payment,
            }
        )
    review = review_booking_ids(bookings)
    result = []
    for row in rows:
        remaining = row.amount - paid[row.id]
        needs_review = row.reservation_id in review
        status = (
            "NEEDS_REVIEW"
            if needs_review
            else "PAID"
            if remaining == 0
            else "PARTIAL"
            if paid[row.id]
            else "UNPAID"
        )
        booking = by_booking[row.reservation_id]
        result.append(
            {
                "id": row.id,
                "bookingId": row.reservation_id,
                "guestName": booking.guest_name,
                "sourceId": row.source_id,
                "sourceName": row.source_name,
                "percent": decimal_text(row.percent),
                "roomNet": decimal_text(row.room_net),
                "baseRoomNet": decimal_text(row.base_room_net),
                "amount": decimal_text(row.amount),
                "currency": row.currency,
                **money_json(row),
                "paid": decimal_text(paid[row.id]),
                "balance": decimal_text(remaining),
                "status": status,
                "needsReview": needs_review,
                "payments": histories[row.id],
                "date": iso(row.business_date),
            }
        )
    return result


def handle_list_commissions(tenant_id):
    page, size = pagination()
    currency = runtime().request.args.get(
        "currency", (runtime().state.tenant.settings or {}).get("currency", "VND")
    )
    if currency not in {"VND", "USD"}:
        raise ApiError(422, "invalid_currency", "Tiền tệ phải là VND hoặc USD.")
    end = (
        parse_date(runtime().request.args["endDate"])
        if runtime().request.args.get("endDate")
        else local_date()
    )
    start = (
        parse_date(runtime().request.args["startDate"])
        if runtime().request.args.get("startDate")
        else None
    )
    if start and end < start:
        raise ApiError(422, "invalid_dates", "Ngày kết thúc phải từ ngày bắt đầu.")
    status = runtime().request.args.get("status", "")
    if status not in {"", "UNPAID", "PARTIAL", "PAID", "NEEDS_REVIEW"}:
        raise ApiError(422, "invalid_status", "Trạng thái hoa hồng không hợp lệ.")
    source_id = string_value(runtime().request.args.get("sourceId"), "Nguồn đặt phòng", 40)
    reversal = aliased(CashDocument)
    payouts = (
        select(CommissionPayout.commission_id, func.sum(CashDocument.amount).label("paid"))
        .join(
            CashDocument,
            (CashDocument.tenant_id == CommissionPayout.tenant_id)
            & (CashDocument.id == CommissionPayout.cash_document_id),
        )
        .outerjoin(
            reversal,
            (reversal.tenant_id == CashDocument.tenant_id)
            & (reversal.reversal_of_id == CashDocument.id),
        )
        .where(CommissionPayout.tenant_id == tenant_id, reversal.id.is_(None))
        .group_by(CommissionPayout.commission_id)
        .subquery()
    )
    paid = func.coalesce(payouts.c.paid, 0)
    business_date = func.coalesce(
        CommissionSettlement.business_date,
        func.timezone(
            (runtime().state.tenant.settings or {}).get("timezone", "Asia/Ho_Chi_Minh"),
            Reservation.checked_out_at,
        ).cast(db.Date),
        Reservation.check_out,
    )
    conditions = [
        Reservation.tenant_id == tenant_id,
        Reservation.status == "CHECKED_OUT",
        Reservation.currency == currency,
        business_date <= end,
    ]
    if start:
        conditions.append(business_date >= start)
    if source_id:
        conditions.append(
            case(
                (CommissionSettlement.id.is_not(None), CommissionSettlement.source_id),
                else_=func.coalesce(
                    Reservation.pricing_snapshot["commission"]["sourceId"].astext,
                    Reservation.source_id,
                ),
            )
            == source_id
        )
    if status:
        conditions.extend(
            [
                CommissionSettlement.id.is_not(None),
                case(
                    (review_condition(tenant_id), "NEEDS_REVIEW"),
                    (CommissionSettlement.amount == paid, "PAID"),
                    (paid > 0, "PARTIAL"),
                    else_="UNPAID",
                )
                == status,
            ]
        )
    query = (
        select(Reservation, CommissionSettlement)
        .select_from(Reservation)
        .outerjoin(
            CommissionSettlement,
            (CommissionSettlement.tenant_id == Reservation.tenant_id)
            & (CommissionSettlement.reservation_id == Reservation.id),
        )
        .outerjoin(payouts, payouts.c.commission_id == CommissionSettlement.id)
        .where(*conditions)
    )
    count, accrued, total_paid = db.session.execute(
        query.with_only_columns(
            func.count(),
            func.coalesce(func.sum(CommissionSettlement.amount), 0),
            func.coalesce(func.sum(paid), 0),
        )
    ).one()
    rows = list(
        db.session.execute(
            query.order_by(business_date.desc(), Reservation.id)
            .limit(size)
            .offset((page - 1) * size)
        )
    )
    bookings = [booking for booking, _ in rows]
    settlements = [settlement for _, settlement in rows if settlement is not None]
    candidates = []
    needs_review = review_booking_ids(bookings)
    for booking, settlement in rows:
        if settlement is not None:
            continue
        snapshot = (booking.pricing_snapshot or {}).get("commission") or {}
        candidates.append(
            {
                "bookingId": booking.id,
                "guestName": booking.guest_name,
                "sourceId": snapshot.get("sourceId", booking.source_id),
                "sourceName": snapshot.get("sourceName", booking.source_name),
                "percent": snapshot.get("percent"),
                "missingRate": "percent" not in snapshot,
                "needsReview": booking.id in needs_review,
                "currency": booking.currency,
                "checkOut": iso(booking.check_out),
            }
        )
    return {
        "items": commission_json(settlements, bookings),
        "candidates": candidates,
        "summary": {
            "accrued": decimal_text(accrued),
            "paid": decimal_text(total_paid),
            "balance": decimal_text(accrued - total_paid),
            "currency": currency,
        },
        "pagination": {"page": page, "pageSize": size, "totalItems": count},
    }


def handle_settle_commission(tenant_id):
    data = runtime().payload()
    if set(data) - {"bookingId", "legacyPercent", "confirmLegacyRate"}:
        raise ApiError(422, "invalid_commission", "Thông tin đối soát có trường không được hỗ trợ.")
    booking = find_reservation(
        tenant_id,
        string_value(data.get("bookingId"), "Đặt phòng", 40, required=True),
        locked=True,
    )
    if booking.status != "CHECKED_OUT":
        raise ApiError(409, "stay_unsettled", "Chỉ đối soát hoa hồng sau khi trả phòng.")
    existing = db.session.scalar(
        select(CommissionSettlement).where(
            CommissionSettlement.tenant_id == tenant_id,
            CommissionSettlement.reservation_id == booking.id,
        )
    )
    if existing is not None:
        if (
            "legacyPercent" in data
            and money_value(data["legacyPercent"], allow_zero=True, limit=Decimal(100))
            != existing.percent
        ):
            raise ApiError(
                409, "commission_frozen", "Hoa hồng đã đối soát; không đổi tỷ lệ đã chốt."
            )
        return commission_json([existing], [booking])[0], 200
    snapshot = (booking.pricing_snapshot or {}).get("commission")
    if not snapshot or "percent" not in snapshot:
        if data.get("confirmLegacyRate") is not True or "legacyPercent" not in data:
            raise ApiError(
                409,
                "commission_rate_missing",
                "Đặt phòng chưa có tỷ lệ; cần xác nhận tỷ lệ đối soát rõ ràng.",
            )
        snapshot = {
            "percent": data["legacyPercent"],
            "sourceId": booking.source_id,
            "sourceName": booking.source_name,
        }
        audit(
            "commission.legacy_rate_confirmed",
            "reservation",
            booking.id,
            {"percent": str(data["legacyPercent"])},
        )
    elif "legacyPercent" in data or "confirmLegacyRate" in data:
        raise ApiError(
            422,
            "commission_rate_frozen",
            "Đặt phòng đã lưu tỷ lệ; không thay bằng tỷ lệ thủ công.",
        )
    percent = money_value(snapshot["percent"], allow_zero=True, limit=Decimal(100))
    nights = list(
        db.session.scalars(
            select(ReservationNight).where(
                ReservationNight.tenant_id == tenant_id,
                ReservationNight.reservation_id == booking.id,
            )
        )
    )
    room_net = sum((night.price for night in nights), Decimal(0))
    base_room_net = sum((night.base_amount for night in nights), Decimal(0))
    row = CommissionSettlement(
        tenant_id=tenant_id,
        reservation_id=booking.id,
        source_id=snapshot.get("sourceId"),
        source_name=snapshot.get("sourceName", booking.source_name),
        percent=percent,
        room_net=room_net,
        base_room_net=base_room_net,
        amount=rounded(room_net * percent / 100),
        currency=booking.currency,
        base_amount=rounded(base_room_net * percent / 100),
        base_currency=booking.base_currency,
        exchange_rate=booking.exchange_rate,
        business_date=local_date(booking.checked_out_at)
        if booking.checked_out_at
        else booking.check_out,
        user_id=runtime().state.user.id,
    )
    db.session.add(row)
    db.session.flush()
    audit(
        "commission.reconciled",
        "commission",
        row.id,
        {
            "bookingId": booking.id,
            "percent": decimal_text(percent),
            "roomNet": decimal_text(room_net),
            "amount": decimal_text(row.amount),
        },
    )
    return commission_json([row], [booking])[0], 201


def handle_pay_commission(tenant_id, commission_id):
    data = runtime().payload()
    if set(data) - {"amount", "fundId", "categoryId", "note"}:
        raise ApiError(422, "invalid_payment", "Thanh toán hoa hồng chứa trường không được hỗ trợ.")
    key, fingerprint, replay = begin(tenant_id, data)
    if replay is not None:
        return replay, 201
    row = db.session.scalar(
        select(CommissionSettlement).where(
            CommissionSettlement.tenant_id == tenant_id,
            CommissionSettlement.id == commission_id,
        )
    )
    if row is None:
        raise ApiError(404, "not_found", "Không tìm thấy đối soát hoa hồng.")
    # Reservation corrections take this same booking lock before writing cash.
    booking = find_reservation(tenant_id, row.reservation_id, locked=True)
    row = db.session.scalar(
        select(CommissionSettlement)
        .where(
            CommissionSettlement.tenant_id == tenant_id,
            CommissionSettlement.id == commission_id,
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    current = commission_json([row], [booking])[0]
    if current["needsReview"]:
        raise ApiError(
            409,
            "commission_needs_review",
            "Lưu trú có chiết khấu hóa đơn chưa phân bổ hoặc điều chỉnh sau trả phòng; cần đối soát trước khi chi tiếp.",
        )
    amount = money_value(data.get("amount"))
    if amount > Decimal(current["balance"]):
        raise ApiError(409, "commission_overpayment", "Khoản chi vượt hoa hồng còn phải trả.")
    if row.currency != (runtime().state.tenant.settings or {}).get(
        "currency", "VND"
    ) and not feature_enabled("MULTI_CURRENCY", for_write=True):
        raise ApiError(403, "feature_disabled", "Gói chưa bật đa tiền tệ.")
    category = cash_category(tenant_id, "expense", data.get("categoryId"))
    fund_id = string_value(data.get("fundId"), "Quỹ chi", 40, required=True)
    fund = lock_funds(tenant_id, [fund_id], row.currency)[fund_id]
    ensure_available(tenant_id, fund_id, row.currency, amount)
    note = (
        string_value(data.get("note"), "Nội dung", 500)
        or f"Hoa hồng {row.source_name} · {row.reservation_id}"
    )
    document = CashDocument(
        tenant_id=tenant_id,
        kind="expense",
        fund_id=fund.id,
        fund_name=fund.name,
        amount=amount,
        currency=row.currency,
        description=note,
        effective_date=local_date(),
        category_id=category.id if category else None,
        category_name=category.name if category else None,
        category_type=category.data["type"] if category else None,
        user_id=runtime().state.user.id,
        **snapshot_money(tenant_id, row.currency, amount, row),
    )
    db.session.add(document)
    db.session.flush()
    ledger(
        tenant_id,
        fund.id,
        row.currency,
        -amount,
        "expense",
        note,
        cash_document_id=document.id,
        source=document,
    )
    db.session.add(
        CommissionPayout(tenant_id=tenant_id, commission_id=row.id, cash_document_id=document.id)
    )
    db.session.flush()
    audit(
        "commission.payment",
        "commission",
        row.id,
        {"cashDocumentId": document.id, "amount": decimal_text(amount), "fundId": fund.id},
    )
    return finish(tenant_id, key, fingerprint, commission_json([row], [booking])[0])
