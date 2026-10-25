"""Dependency boundaries and composition must remain valid as domains evolve."""

import ast
import unittest
from importlib import import_module
from pathlib import Path
from types import SimpleNamespace

from common import CommonMethodView
from pms_api import create_app
from pms_api.ports import runtime, use_runtime

ROOT = Path(__file__).resolve().parents[1] / "pms_api"


class ArchitectureTests(unittest.TestCase):
    def test_domain_rules_have_no_framework_persistence_or_application_dependencies(self):
        for source in ROOT.glob("*/domain.py"):
            tree = ast.parse(source.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    module = node.module or ""
                    with self.subTest(source=source, module=module):
                        self.assertNotIn(module.split(".")[0], {"flask", "sqlalchemy"})
                        self.assertNotIn(
                            module.split(".")[-1],
                            {"routes", "application", "models", "security", "extensions"},
                        )

    def test_application_services_do_not_import_flask_or_http_handlers(self):
        for source in ROOT.rglob("*.py"):
            if "application" not in source.stem and source.name not in {"service.py", "engine.py"}:
                continue
            for node in ast.walk(ast.parse(source.read_text(encoding="utf-8"))):
                if isinstance(node, ast.ImportFrom):
                    module = node.module or ""
                    with self.subTest(source=source, module=module):
                        self.assertNotEqual(module.split(".")[-1], "routes")
                        self.assertNotEqual(module.split(".")[0], "flask")

    def test_every_registered_http_handler_can_be_resolved(self):
        app = create_app(
            {"APP_ENV": "testing", "DATABASE_URL": "postgres://fixture:fixture@127.0.0.1:1/pms"},
            env_file=None,
        )
        for view in app.view_functions.values():
            path = getattr(view, "lazy_view_path", None)
            if path:
                with self.subTest(handler=path):
                    module, name = path.split(":")
                    self.assertTrue(
                        issubclass(getattr(import_module(module), name), CommonMethodView)
                    )
        with app.app_context():
            app.extensions["sqlalchemy"].engine.dispose()

    def test_runtime_injection_is_nested_and_restored_even_on_failure(self):
        original = runtime()
        first, second = SimpleNamespace(name="first"), SimpleNamespace(name="second")
        with use_runtime(first):
            self.assertIs(runtime(), first)
            with self.assertRaises(ValueError), use_runtime(second):
                self.assertIs(runtime(), second)
                raise ValueError("failed operation")
            self.assertIs(runtime(), first)
        self.assertIs(runtime(), original)

    def test_factories_have_independent_subscribers_and_adapters(self):
        config = {
            "APP_ENV": "testing",
            "DATABASE_URL": "postgres://fixture:fixture@127.0.0.1:1/pms",
        }
        first, second = create_app(config, env_file=None), create_app(config, env_file=None)
        one, two = first.extensions["pms_services"], second.extensions["pms_services"]
        self.assertIsNot(one.events, two.events)
        self.assertIsNot(one.channels, two.channels)
        for app in (first, second):
            with app.app_context():
                app.extensions["sqlalchemy"].engine.dispose()
