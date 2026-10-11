"""Explicit operator commands; credentials never enter source control or stdout."""

import json
import secrets
import time

import click
from flask import current_app
from flask.cli import with_appcontext
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError
from werkzeug.security import generate_password_hash

from .config import BACKEND_DIR
from .core_models import Tenant, TenantUser, User
from .extensions import db
from .security import set_context


@click.command("init-admin")
@click.option("--email", prompt=True)
@click.option("--name", prompt=True)
@click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
@with_appcontext
def init_admin(email, name, password):
    from .auth.routes import validate_email, validate_password

    email = validate_email(email)
    validate_password(password)
    if db.session.scalar(select(User).where(User.email == email)):
        raise click.ClickException("Email already exists; no account was changed.")
    if not name.strip() or len(name) > 160:
        raise click.ClickException("Invalid name.")
    db.session.add(
        User(
            name=name.strip(),
            email=email,
            password_hash=generate_password_hash(password),
            global_role="SUPER_ADMIN",
        )
    )
    db.session.commit()
    click.echo("Administrator created. Password is stored as a scrypt hash.")


@click.command("seed-local")
@with_appcontext
def seed_local():
    url = current_app.config["SQLALCHEMY_DATABASE_URI"]
    if (
        current_app.config["APP_ENV"] != "development"
        or url.host not in ("127.0.0.1", "localhost")
        or url.database != "pms_local"
    ):
        raise click.ClickException(
            "Local seed is restricted to development / loopback / pms_local."
        )
    if db.session.scalar(select(User.id).limit(1)):
        raise click.ClickException("Accounts already exist. No data or passwords were changed.")
    from decimal import Decimal

    from .catalog.models import Master, PhysicalRoom, RoomType

    set_context(is_system=True)
    accounts = []
    for key, name, email, global_role in [
        ("local-admin", "Quản trị hệ thống", "admin@bluejay.vn", "SUPER_ADMIN"),
        ("local-owner", "Chủ khách sạn", "owner@bluejay.vn", "USER"),
        ("local-owner-b", "Chủ khách sạn B", "owner-b@bluejay.vn", "USER"),
        ("local-frontdesk", "Lễ tân", "frontdesk@bluejay.vn", "USER"),
        ("local-hk", "Buồng phòng", "hk@bluejay.vn", "USER"),
        ("local-accountant", "Kế toán", "accountant@bluejay.vn", "USER"),
    ]:
        password = secrets.token_urlsafe(18)
        accounts.append({"email": email, "password": password})
        db.session.add(
            User(
                id=key,
                name=name,
                email=email,
                global_role=global_role,
                password_hash=generate_password_hash(password),
            )
        )
    for tenant_id, name in [("TNT1092", "Blue Jay Quận 7"), ("TNT1088", "Blue Jay Đà Nẵng")]:
        db.session.add(Tenant(id=tenant_id, name=name))
    db.session.flush()
    for user_id, tenant_id, role in [
        ("local-owner", "TNT1092", "HOTEL_OWNER"),
        ("local-owner-b", "TNT1088", "HOTEL_OWNER"),
        ("local-frontdesk", "TNT1092", "FRONT_DESK"),
        ("local-hk", "TNT1092", "HOUSEKEEPING"),
        ("local-accountant", "TNT1092", "ACCOUNTANT"),
    ]:
        db.session.add(TenantUser(user_id=user_id, tenant_id=tenant_id, role=role))
    for tenant_id in ("TNT1092", "TNT1088"):
        room_type = RoomType(
            tenant_id=tenant_id, name="Standard", base_price=Decimal("800000"), capacity=2
        )
        db.session.add(room_type)
        db.session.flush()
        for number in ("101", "102", "103"):
            db.session.add(
                PhysicalRoom(tenant_id=tenant_id, room_type_id=room_type.id, number=number)
            )
        for catalog, name, data in [
            ("bookingSources", "Direct", {}),
            ("services", "Ăn sáng", {"price": "80000"}),
            ("paymentMethods", "Tiền mặt", {}),
            ("paymentMethods", "Chuyển khoản", {}),
            ("funds", "Quỹ tiền mặt", {"type": "cash"}),
            ("funds", "Tài khoản ngân hàng", {"type": "bank"}),
        ]:
            db.session.add(Master(tenant_id=tenant_id, catalog=catalog, name=name, data=data))
    # Write before commit: if writing credentials fails, no unusable accounts are committed.
    path = BACKEND_DIR / ".local-postgres" / "demo-users.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(
        json.dumps({"localOnly": True, "accounts": accounts}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    db.session.commit()
    click.echo(f"Local hotel accounts created. Credentials: {path}")


def register_commands(app):
    app.cli.add_command(database_check)
    app.cli.add_command(init_admin)
    app.cli.add_command(seed_local)
    app.cli.add_command(process_channel_jobs)


@click.command("db-check")
@with_appcontext
def database_check():
    from .health import database_status

    status = database_status()
    if status["status"] != "ok":
        raise click.ClickException(
            f"Database check failed: {status.get('schema', status['database'])}."
        )
    click.echo("PostgreSQL connection and migrations: OK")


@click.command("process-channel-jobs")
@click.option("--tenant", help="Limit processing to one hotel; omit for all pending hotels.")
@click.option("--limit", type=click.IntRange(1, 100), default=10, show_default=True)
@click.option("--watch", is_flag=True, help="Keep polling; run as a separate worker service.")
@click.option("--interval", type=click.IntRange(5, 300), default=15, show_default=True)
@with_appcontext
def process_channel_jobs(tenant, limit, watch, interval):
    from .channels.models import ChannelConnection, ChannelJob
    from .channels.service import process_jobs

    while True:
        try:
            set_context(is_system=True)
            statement = (
                select(ChannelJob.tenant_id)
                .where(ChannelJob.status.in_({"queued", "processing"}))
                .distinct()
            )
            if tenant:
                statement = statement.where(ChannelJob.tenant_id == tenant)
            connections = select(ChannelConnection.tenant_id).where(
                ChannelConnection.active.is_(True)
            )
            if tenant:
                connections = connections.where(ChannelConnection.tenant_id == tenant)
            tenant_ids = db.session.scalars(statement.union(connections)).all()
            db.session.rollback()
            count = sum(
                process_jobs(tenant_id, limit=limit, schedule=True) for tenant_id in tenant_ids
            )
            if count or not watch:
                click.echo(f"Processed {count} channel jobs.")
        except DBAPIError:
            db.session.rollback()
            if not watch:
                raise click.ClickException("Channel worker database is unavailable.") from None
            click.echo("Channel worker database unavailable; waiting to retry.", err=True)
        if not watch:
            return
        time.sleep(interval)
