"""Provider identifier validation independent of HTTP transport."""

from uuid import UUID

from .errors import ProviderError


def remote_id(value):
    try:
        if not isinstance(value, str) or len(value) != 36:
            raise ValueError
        return str(UUID(value))
    except ValueError, TypeError, AttributeError:
        raise ProviderError("invalid_remote_id") from None
