"""Synchronous domain events; subscribers share the caller's transaction.

Dispatch deliberately propagates failures: an unsuccessful subscriber must roll
back the business write as it did before event dispatch was introduced.
"""

from collections.abc import Callable
from typing import Any


class EventBus:
    def __init__(self):
        self._subscribers: list[Callable[[Any], None]] = []

    def subscribe(self, subscriber):
        if subscriber not in self._subscribers:
            self._subscribers.append(subscriber)

    def publish(self, event):
        for subscriber in tuple(self._subscribers):
            subscriber(event)
