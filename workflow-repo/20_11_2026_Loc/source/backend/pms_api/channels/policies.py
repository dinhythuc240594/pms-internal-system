"""Pure inventory publication rules, shared by channel integration strategies."""

from .errors import ProviderError


class AvailabilityPolicy:
    def calculate(
        self, *, capacity, booked, pause_requested, room_active, stop_sell, inventory_hold=False
    ):
        available = capacity - booked
        if available < 0 and not inventory_hold:
            raise ProviderError("channel_inventory_inconsistent")
        closed = inventory_hold or pause_requested or not room_active or stop_sell
        return (0 if closed else available), closed
