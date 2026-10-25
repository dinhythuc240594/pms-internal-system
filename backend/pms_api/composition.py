"""Composition root. Concrete integrations are resolved here, never by domain rules."""

from dataclasses import dataclass
from typing import TYPE_CHECKING

from flask import current_app

from .events import EventBus

if TYPE_CHECKING:
    from .bookings.ports import ReservationRepository
    from .channels.factory import ChannelAdapterFactory
    from .pricing.ports import PricingRepository


def notify_audit(entry):
    from .notifications_application import emit_audit

    emit_audit(entry)


def synchronize_audit(entry):
    from .channels.service import enqueue_audit

    enqueue_audit(entry)


@dataclass
class Services:
    events: EventBus
    channels: "ChannelAdapterFactory"
    reservations: "ReservationRepository"
    pricing: "PricingRepository"


def register_services(app):
    # Keep app creation and health checks independent of channel HTTP adapters.
    from .bookings.repository import SQLAlchemyReservationRepository
    from .channels.factory import ChannelAdapterFactory
    from .extensions import db
    from .pricing.repository import SQLAlchemyPricingRepository

    events = EventBus()
    events.subscribe(notify_audit)
    events.subscribe(synchronize_audit)
    app.extensions["pms_services"] = Services(
        events,
        ChannelAdapterFactory(),
        SQLAlchemyReservationRepository(db.session),
        SQLAlchemyPricingRepository(db.session),
    )


def services() -> Services:
    return current_app.extensions["pms_services"]


def channel_adapter(environment, api_key, *, provider="channex"):
    return services().channels.create(provider, environment, api_key)
