"""Small PMS Channex adapter. URLs are fixed; provider bodies never become errors.

Contract: https://docs.channex.io/api-v.1-documentation/bookings-collection
ARI: https://docs.channex.io/api-v.1-documentation/ari
"""

import json
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID

BASES = {
    "staging": "https://staging.channex.io/api/v1",
    "production": "https://app.channex.io/api/v1",
}
MAX_RESPONSE = 2 * 1024 * 1024


class ProviderError(Exception):
    def __init__(self, code, retryable=False):
        self.code, self.retryable = code, retryable
        super().__init__(code)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def remote_id(value):
    try:
        if not isinstance(value, str) or len(value) != 36:
            raise ValueError
        return str(UUID(value))
    except ValueError, TypeError, AttributeError:
        raise ProviderError("invalid_remote_id") from None


class ChannexClient:
    def __init__(self, environment, api_key, transport=None):
        if (
            not isinstance(environment, str)
            or environment not in BASES
            or not isinstance(api_key, str)
            or not api_key
            or len(api_key) > 1024
            or any(ord(c) < 32 or ord(c) > 126 for c in api_key)
        ):
            raise ProviderError("credentials_unavailable")
        self.base, self.api_key = BASES[environment], api_key
        self.transport = transport or build_opener(NoRedirect())

    def _request(self, method, path, body=None, query=None):
        url = self.base + path + ("?" + urlencode(query) if query else "")
        raw = json.dumps(body, allow_nan=False).encode() if body is not None else None
        req = Request(
            url,
            data=raw,
            method=method,
            headers={
                "user-api-key": self.api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with self.transport.open(req, timeout=15) as response:
                if not 200 <= response.status < 300:
                    raise ProviderError("provider_rejected")
                data = response.read(MAX_RESPONSE + 1)
            if len(data) > MAX_RESPONSE:
                raise ProviderError("provider_response_too_large")
            result = json.loads(data)
            if (
                not isinstance(result, dict)
                or "errors" in result
                or not ({"data", "meta"} & result.keys())
            ):
                raise ProviderError("provider_invalid_response")
            if not isinstance(result.get("meta", {}), dict):
                raise ProviderError("provider_invalid_response")
            if result.get("meta", {}).get("warnings"):
                raise ProviderError("provider_rejected")
            return result
        except HTTPError as error:
            code = (
                "provider_rate_limited"
                if error.code == 429
                else "provider_unavailable"
                if error.code >= 500
                else "provider_rejected"
            )
            raise ProviderError(code, error.code == 429 or error.code >= 500) from None
        except URLError, TimeoutError, socket.timeout, OSError:
            raise ProviderError("provider_unavailable", True) from None
        except ValueError, UnicodeDecodeError:
            raise ProviderError("provider_invalid_response") from None

    def feed(self, property_id):
        result = self._request(
            "GET",
            "/booking_revisions/feed",
            query={
                "filter[property_id]": remote_id(property_id),
                "order[inserted_at]": "asc",
                "pagination[page]": 1,
                "pagination[limit]": 100,
            },
        )
        rows = result.get("data")
        if not isinstance(rows, list) or len(rows) > 100:
            raise ProviderError("provider_invalid_response")
        return rows

    def revision(self, revision_id):
        result = self._request("GET", f"/booking_revisions/{remote_id(revision_id)}")
        if not isinstance(result.get("data"), dict):
            raise ProviderError("provider_invalid_response")
        return result["data"]

    def ack(self, revision_id):
        self._request("POST", f"/booking_revisions/{remote_id(revision_id)}/ack", {})

    def push_availability(self, values):
        self._request("POST", "/availability", {"values": values})

    def push_restrictions(self, values):
        self._request("POST", "/restrictions", {"values": values})

    def catalog(self, resource, property_id):
        if resource not in {"room_types", "rate_plans"}:
            raise ProviderError("provider_invalid_response")
        result = self._request(
            "GET",
            "/" + resource,
            query={
                "filter[property_id]": remote_id(property_id),
                "pagination[page]": 1,
                "pagination[limit]": 100,
            },
        )
        rows = result.get("data")
        total = result.get("meta", {}).get("total", len(rows) if isinstance(rows, list) else 0)
        if (
            not isinstance(total, int)
            or isinstance(total, bool)
            or not isinstance(rows, list)
            or len(rows) > 100
            or total > 100
        ):
            raise ProviderError("channel_catalog_too_large")
        return rows
