from alembic.runtime.migration import MigrationContext
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from pms_api.ports import runtime

from .extensions import db


def database_status():
    try:
        with db.engine.connect() as connection:
            connection.execute(text("SET LOCAL statement_timeout = '3s'"))
            connection.execute(text("SELECT 1")).scalar_one()
            if runtime().config["APP_ENV"] == "production":
                role = connection.execute(
                    text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")
                ).one()
                if role.rolsuper or role.rolbypassrls:
                    return {"status": "error", "database": "unsafe_role"}
            heads = set(MigrationContext.configure(connection).get_current_heads())
            if heads != runtime().extensions["migration_heads"]:
                return {"status": "error", "database": "ok", "schema": "pending"}
        return {"status": "ok", "database": "ok", "schema": "ok"}
    except SQLAlchemyError as error:
        runtime().logger.warning("database_unavailable (%s)", type(error).__name__)
        return {"status": "error", "database": "unavailable"}


def handle_liveness():
    return runtime().json_response(status="ok", message="Backend is running")


def handle_readiness():
    status = database_status()
    return runtime().json_response(status), 200 if status["status"] == "ok" else 503
