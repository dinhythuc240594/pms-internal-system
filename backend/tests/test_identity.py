from datetime import timedelta

from domain_fixture import TEST_PASSWORD, DomainTestCase
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from werkzeug.security import check_password_hash

from pms_api.core_models import AuthSession, User, utcnow
from pms_api.extensions import db


class IdentityTests(DomainTestCase):
    def test_login_cookie_hash_and_logout_revocation(self):
        response = self.client.get("/api/auth/session")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([t["id"] for t in response.json["tenants"]], [self.tenant_id])
        with self.app.app_context():
            user = db.session.get(User, self.owner_id)
            self.assertNotEqual(user.password_hash, TEST_PASSWORD)
            self.assertTrue(check_password_hash(user.password_hash, TEST_PASSWORD))
        response = self.request("POST", "/api/auth/logout")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/session").status_code, 401)

    def test_wrong_password_and_expired_session(self):
        client = self.app.test_client()
        self.assertEqual(
            client.post(
                "/api/auth/login", json={"email": "owner-a@test.local", "password": "wrong"}
            ).status_code,
            401,
        )
        with self.app.app_context():
            session = db.session.scalar(
                select(AuthSession).where(AuthSession.user_id == self.owner_id)
            )
            session.expires_at = utcnow() - timedelta(seconds=1)
            db.session.commit()
        self.assertEqual(self.client.get("/api/auth/session").status_code, 401)

    def test_csrf_origin_and_cross_tenant_rejected(self):
        response = self.request(
            "PATCH", "/settings", {"name": "Oops"}, headers={"X-CSRF-Token": "é"}
        )
        self.assertEqual(response.status_code, 403)
        response = self.client.patch(
            f"/api/tenants/{self.tenant_id}/settings", json={"name": "Oops"}
        )
        self.assertEqual(response.status_code, 403)
        response = self.request(
            "PATCH",
            "/settings",
            {"name": "Oops"},
            headers={**self.headers, "Origin": "https://evil.example"},
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            self.request("GET", f"/api/tenants/{self.other_tenant_id}/workspace").status_code, 403
        )

    def test_role_matrix_last_owner_and_membership_deactivation(self):
        self.assertEqual(
            self.request("PATCH", "/users/frontdesk", {"email": "renamed@test.local"}).status_code,
            422,
        )
        hk, headers = self.login("hk@test.local")
        self.assertEqual(
            self.request(
                "POST", "/masters/services", {"name": "No"}, client=hk, headers=headers
            ).status_code,
            403,
        )
        self.assertEqual(
            self.request("PATCH", f"/users/{self.owner_id}", {"active": False}).status_code, 409
        )
        self.assertEqual(
            self.request("PATCH", "/users/frontdesk", {"active": False}).status_code, 200
        )
        frontdesk, headers = self.login("frontdesk@test.local")
        self.assertEqual(
            self.request("GET", "/workspace", client=frontdesk, headers=headers).status_code, 403
        )

    def test_system_manager_and_suspended_hotel(self):
        manager, headers = self.login("manager@test.local")
        self.assertEqual(manager.get("/api/audit").status_code, 403)
        response = self.request(
            "PATCH",
            f"/api/tenants/{self.tenant_id}",
            {"status": "suspended"},
            client=manager,
            headers=headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.request("POST", "/masters/services", {"name": "No"}).status_code, 403)
        self.assertEqual(self.request("GET", "/workspace").status_code, 200)

    def test_raw_rls_read_write_and_pool_context_reset(self):
        with self.app.app_context():
            engine = db.engine
            with engine.begin() as connection:
                connection.execute(
                    text("SELECT set_config('app.tenant_id',:tenant,true)"),
                    {"tenant": self.tenant_id},
                )
                ids = connection.execute(text("SELECT tenant_id FROM room_types")).scalars().all()
                self.assertEqual(ids, [self.tenant_id])
                result = connection.execute(
                    text("UPDATE room_types SET name='Hidden' WHERE tenant_id=:tenant"),
                    {"tenant": self.other_tenant_id},
                )
                self.assertEqual(result.rowcount, 0)
            with engine.connect() as connection:
                self.assertEqual(
                    connection.execute(text("SELECT tenant_id FROM room_types")).all(), []
                )

    def test_rate_limit_persists_failed_attempts(self):
        client = self.app.test_client()
        for _ in range(10):
            self.assertEqual(
                client.post(
                    "/api/auth/login", json={"email": "missing@test.local", "password": "wrong"}
                ).status_code,
                401,
            )
        self.assertEqual(
            client.post(
                "/api/auth/login", json={"email": "missing@test.local", "password": "wrong"}
            ).status_code,
            429,
        )

    def test_admin_creates_hotel_owner_and_owner_creates_staff(self):
        admin, headers = self.login("admin@test.local")
        created = self.request(
            "POST",
            "/api/tenants",
            {
                "name": "New hotel",
                "ownerName": "New owner",
                "ownerEmail": "new-owner@test.local",
                "ownerPassword": TEST_PASSWORD,
            },
            client=admin,
            headers=headers,
        )
        self.assertEqual(created.status_code, 201, created.json)
        owner, owner_headers = self.login("new-owner@test.local")
        tenant_id = created.json["id"]
        workspace = owner.get(f"/api/tenants/{tenant_id}/workspace")
        self.assertEqual(workspace.status_code, 200)
        self.assertEqual(workspace.json["rooms"], [])
        staff = self.request(
            "POST",
            f"/api/tenants/{tenant_id}/users",
            {
                "name": "New staff",
                "email": "new-staff@test.local",
                "password": TEST_PASSWORD,
                "role": "FRONT_DESK",
            },
            client=owner,
            headers=owner_headers,
        )
        self.assertEqual(staff.status_code, 201, staff.json)
        updated = self.request(
            "PATCH",
            f"/api/tenants/{tenant_id}/users/{staff.json['id']}",
            {"role": "ACCOUNTANT"},
            client=owner,
            headers=owner_headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json["memberships"][0]["role"], "ACCOUNTANT")

    def test_password_change_revokes_other_sessions(self):
        other, _ = self.login()
        new_password = "Changed-password-2026!"
        changed = self.request(
            "POST",
            "/api/auth/change-password",
            {"currentPassword": TEST_PASSWORD, "newPassword": new_password},
        )
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(other.get("/api/auth/session").status_code, 401)
        self.assertEqual(self.client.get("/api/auth/session").status_code, 200)
        fresh, _ = self.login(password=new_password)
        self.assertEqual(fresh.get("/api/auth/session").status_code, 200)

    def test_rls_rejects_cross_tenant_insert(self):
        with self.app.app_context():
            with db.engine.connect() as connection:
                connection.execute(
                    text("SELECT set_config('app.tenant_id',:tenant,true)"),
                    {"tenant": self.tenant_id},
                )
                with self.assertRaises(DBAPIError) as caught:
                    connection.execute(
                        text(
                            "INSERT INTO room_types(id,tenant_id,name,base_price,capacity,active) VALUES('bad-id',:tenant,'Intruder',1,2,true)"
                        ),
                        {"tenant": self.other_tenant_id},
                    )
                self.assertEqual(caught.exception.orig.sqlstate, "42501")
                connection.rollback()
