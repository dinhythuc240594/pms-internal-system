"""Pure inventory publication rules, shared by channel integration strategies."""

from .errors import ProviderError


class AvailabilityPolicy:
    def calculate(self, *, capacity, booked, pause_requested, room_active, stop_sell):
        available = capacity - booked
        if available < 0:
            raise ProviderError("channel_inventory_inconsistent")
        closed = pause_requested or not room_active or stop_sell
        return (0 if closed else available), closed
