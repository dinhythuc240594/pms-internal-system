"""Provider contract checks use no Flask, credentials, database or network."""

import importlib.util
import io
import json
import unittest
from pathlib import Path
from unittest.mock import Mock
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location(
    "channex_client", Path(__file__).resolve().parents[1] / "pms_api/channels/client.py"
)
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class Response(io.BytesIO):
    status = 200


class ChannexClientTests(unittest.TestCase):
    def provider(self, response):
        transport = Mock()
        transport.open.return_value = Response(json.dumps(response).encode())
        return client.ChannexClient("staging", "fixture-key", transport), transport

    def test_fixed_host_header_and_feed_query(self):
        provider, transport = self.provider({"data": []})
        self.assertEqual(provider.feed("11111111-1111-1111-1111-111111111111"), [])
        req = transport.open.call_args.args[0]
        self.assertTrue(
            req.full_url.startswith("https://staging.channex.io/api/v1/booking_revisions/feed?")
        )
        self.assertIn("filter%5Bproperty_id%5D=", req.full_url)
        self.assertIn("order%5Binserted_at%5D=asc", req.full_url)
        self.assertEqual(req.get_header("User-api-key"), "fixture-key")
        self.assertEqual(transport.open.call_args.kwargs["timeout"], 15)

    def test_no_arbitrary_base_or_header_injection(self):
        for environment, key in [("http://localhost", "a"), ("production", "a\nb")]:
            with self.assertRaises(client.ProviderError):
                client.ChannexClient(environment, key)

    def test_ari_warnings_are_not_success(self):
        provider, _ = self.provider({"data": [], "meta": {"warnings": [{"warning": "invalid"}]}})
        with self.assertRaises(client.ProviderError) as caught:
            provider.push_availability([])
        self.assertEqual(caught.exception.code, "provider_rejected")

    def test_rate_limit_is_retryable_and_body_never_exposed(self):
        provider, transport = self.provider({})
        transport.open.side_effect = HTTPError(
            "https://staging.channex.io", 429, "fixture-key", {}, io.BytesIO(b"private response")
        )
        with self.assertRaises(client.ProviderError) as caught:
            provider.feed("11111111-1111-1111-1111-111111111111")
        self.assertTrue(caught.exception.retryable)
        self.assertEqual(str(caught.exception), "provider_rate_limited")

    def test_non_json_and_oversized_responses_rejected(self):
        provider, transport = self.provider({})
        for body in (b"not json", b"x" * (2 * 1024 * 1024 + 1)):
            transport.open.return_value = Response(body)
            with self.assertRaises(client.ProviderError):
                provider.feed("11111111-1111-1111-1111-111111111111")

    def test_ack_has_safe_uuid_path_and_empty_object(self):
        provider, transport = self.provider({"meta": {"message": "Success"}})
        revision = "22222222-2222-2222-2222-222222222222"
        provider.ack(revision)
        req = transport.open.call_args.args[0]
        self.assertTrue(req.full_url.endswith(f"/booking_revisions/{revision}/ack"))
        self.assertEqual(json.loads(req.data), {})
        with self.assertRaises(client.ProviderError):
            provider.ack("../../properties")


if __name__ == "__main__":
    unittest.main()
