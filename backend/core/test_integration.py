"""
Integration tests for critical flows (Task 13.3).

1. Full lifecycle: register → cancel → reassign → execute draw → public results → dashboard
2. Auth flow: login → admin endpoints → unauthorized blocked → public endpoints open
3. Property 13: Ticket list completeness (Hypothesis)

Requirements: 1.1, 2.1, 3.1, 6.1, 7.1, 10.2
"""

from django.contrib.auth.models import User
from django.test import TestCase
from hypothesis import given, settings as h_settings
from hypothesis.extra.django import TestCase as HypothesisTestCase
from rest_framework import status
from rest_framework.test import APIClient

import hypothesis.strategies as st


# ---------------------------------------------------------------------------
# Strategies (reused for Property 13)
# ---------------------------------------------------------------------------

phone_strategy = st.from_regex(r"\+?\d{7,15}", fullmatch=True)
name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "Zs")),
    min_size=1,
    max_size=100,
).filter(lambda s: s.strip() != "")


# ---------------------------------------------------------------------------
# 1. Full lifecycle integration test
# ---------------------------------------------------------------------------

class FullLifecycleIntegrationTest(TestCase):
    """
    End-to-end: register 4 tickets → cancel one → reassign cancelled folio →
    execute draw → verify 3 winners from active tickets → view public results
    (no PII) → verify dashboard counts.

    Requirements: 1.1, 2.1, 3.1, 6.1, 7.1
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="integ_admin", password="testpass123"
        )
        resp = self.client.post("/api/auth/login", {
            "username": "integ_admin",
            "password": "testpass123",
        })
        self.token = resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_full_lifecycle(self):
        # ── Step 1: Register 4 tickets ──────────────────────────────
        buyers = [
            ("Alice García", "+5211111111"),
            ("Bob López", "+5222222222"),
            ("Carlos Ruiz", "+5233333333"),
            ("Diana Flores", "+5244444444"),
        ]
        ticket_ids = []
        folios = []
        for name, phone in buyers:
            resp = self.client.post("/api/tickets", {
                "full_name": name, "phone": phone,
            })
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
            ticket_ids.append(resp.data["id"])
            folios.append(resp.data["folio"])

        self.assertEqual(len(ticket_ids), 4)

        # ── Step 2: Cancel the second ticket ────────────────────────
        cancel_resp = self.client.patch(f"/api/tickets/{ticket_ids[1]}/cancel")
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_resp.data["status"], "cancelled")
        cancelled_folio = folios[1]

        # ── Step 3: Reassign the cancelled folio ────────────────────
        reassign_resp = self.client.post(
            f"/api/tickets/{ticket_ids[1]}/reassign",
            {"full_name": "Elena Martínez", "phone": "+5255555555"},
        )
        self.assertEqual(reassign_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(reassign_resp.data["folio"], cancelled_folio)
        self.assertEqual(reassign_resp.data["status"], "active")
        reassigned_ticket_id = reassign_resp.data["id"]

        # ── Step 4: Execute draw ────────────────────────────────────
        draw_resp = self.client.post("/api/draw/execute")
        self.assertEqual(draw_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(draw_resp.data), 3)

        # Verify 3 distinct winners with ranks 1, 2, 3
        ranks = {r["prize_rank"] for r in draw_resp.data}
        self.assertEqual(ranks, {1, 2, 3})

        winner_folios = {r["folio"] for r in draw_resp.data}
        self.assertEqual(len(winner_folios), 3)

        # Winners must be from active tickets only (not the cancelled one)
        active_folios = {folios[0], cancelled_folio, folios[2], folios[3]}
        for wf in winner_folios:
            self.assertIn(wf, active_folios)

        # ── Step 5: View public results (no PII) ───────────────────
        public_client = APIClient()  # unauthenticated
        results_resp = public_client.get("/api/draw/results")
        self.assertEqual(results_resp.status_code, status.HTTP_200_OK)
        results = results_resp.data["results"]
        self.assertEqual(len(results), 3)

        for result in results:
            # Only folio, prize_rank, prize_name — no PII
            self.assertIn("folio", result)
            self.assertIn("prize_rank", result)
            self.assertIn("prize_name", result)
            self.assertNotIn("full_name", result)
            self.assertNotIn("phone", result)

        # ── Step 6: Verify dashboard counts ─────────────────────────
        dashboard_resp = public_client.get("/api/dashboard")
        self.assertEqual(dashboard_resp.status_code, status.HTTP_200_OK)
        # 4 active tickets: original 3 that weren't cancelled + 1 reassigned
        self.assertEqual(dashboard_resp.data["active_tickets"], 4)
        self.assertEqual(dashboard_resp.data["total_raised"], 4 * 200)


# ---------------------------------------------------------------------------
# 2. Auth flow integration test
# ---------------------------------------------------------------------------

class AuthFlowIntegrationTest(TestCase):
    """
    Login → use token on admin endpoints → verify unauthenticated access
    blocked on admin endpoints → verify public endpoints work without auth.

    Requirements: 10.2
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="auth_integ", password="testpass123"
        )

    def test_auth_flow(self):
        client = APIClient()

        # ── Step 1: Login and get token ─────────────────────────────
        login_resp = client.post("/api/auth/login", {
            "username": "auth_integ",
            "password": "testpass123",
        })
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_resp.data)
        token = login_resp.data["access"]

        # ── Step 2: Access admin endpoints with token ───────────────
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # Create a ticket
        create_resp = client.post("/api/tickets", {
            "full_name": "Auth Test Buyer",
            "phone": "+5212345678",
        })
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        ticket_id = create_resp.data["id"]

        # List tickets
        list_resp = client.get("/api/tickets/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)

        # Get ticket detail
        detail_resp = client.get(f"/api/tickets/{ticket_id}")
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)

        # ── Step 3: Unauthenticated access blocked on admin endpoints
        unauthed = APIClient()

        self.assertEqual(
            unauthed.post("/api/tickets", {
                "full_name": "X", "phone": "+5200000000",
            }).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            unauthed.get("/api/tickets/").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            unauthed.get(f"/api/tickets/{ticket_id}").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            unauthed.patch(f"/api/tickets/{ticket_id}/cancel").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            unauthed.post(f"/api/tickets/{ticket_id}/reassign", {
                "full_name": "Y", "phone": "+5200000001",
            }).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            unauthed.post("/api/draw/execute").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        # ── Step 4: Public endpoints work without auth ──────────────
        self.assertIn(
            unauthed.get("/api/draw/results").status_code,
            [status.HTTP_200_OK],
        )
        self.assertIn(
            unauthed.get("/api/dashboard").status_code,
            [status.HTTP_200_OK],
        )
        # Login endpoint itself is public
        login_check = unauthed.post("/api/auth/login", {
            "username": "wrong", "password": "wrong",
        })
        self.assertIn(login_check.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        ])


# ---------------------------------------------------------------------------
# 3. Property 13 — Ticket list completeness
# **Validates: Requirements 4.1, 4.2**
# ---------------------------------------------------------------------------

class TestTicketListCompletenessProperty(HypothesisTestCase):
    """
    Property 13: Ticket list completeness.
    For any set of created tickets (active and cancelled), the ticket list
    endpoint returns all of them. For any individual ticket, the detail
    endpoint returns all fields.
    **Validates: Requirements 4.1, 4.2**
    """

    def _get_authed_client(self):
        user = User.objects.create_user(
            username="list_admin", password="testpass123"
        )
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    @given(
        num_active=st.integers(min_value=0, max_value=8),
        num_cancelled=st.integers(min_value=0, max_value=5),
    )
    @h_settings(max_examples=10, deadline=None)
    def test_list_returns_all_active_and_cancelled_tickets(
        self, num_active, num_cancelled
    ):
        """
        For any mix of active and cancelled tickets, the list endpoint
        returns every single one of them.
        **Validates: Requirement 4.1**
        """
        from core.models import Ticket

        client = self._get_authed_client()
        user = User.objects.get(username="list_admin")

        created_ids = set()

        # Create active tickets
        for i in range(num_active):
            t = Ticket.objects.create(
                folio=f"HC-LA-{i:04d}",
                full_name=f"Active Buyer {i}",
                phone=f"+555000{i:04d}",
                status=Ticket.Status.ACTIVE,
                created_by=user,
            )
            created_ids.add(str(t.pk))

        # Create cancelled tickets
        for i in range(num_cancelled):
            t = Ticket.objects.create(
                folio=f"HC-LC-{i:04d}",
                full_name=f"Cancelled Buyer {i}",
                phone=f"+555100{i:04d}",
                status=Ticket.Status.CANCELLED,
                created_by=user,
            )
            created_ids.add(str(t.pk))

        total_expected = num_active + num_cancelled

        resp = client.get("/api/tickets/")
        assert resp.status_code == status.HTTP_200_OK

        returned_ids = {str(t["id"]) for t in resp.data}
        assert created_ids.issubset(returned_ids), (
            f"Missing tickets in list: {created_ids - returned_ids}"
        )
        assert len(resp.data) >= total_expected

    @given(
        full_name=name_strategy,
        phone=phone_strategy,
        cancel=st.booleans(),
    )
    @h_settings(max_examples=10, deadline=None)
    def test_detail_returns_all_fields(self, full_name, phone, cancel):
        """
        For any individual ticket (active or cancelled), the detail endpoint
        returns all required fields: folio, full_name, phone, status,
        created_at, cancelled_at, created_by_username.
        **Validates: Requirement 4.2**
        """
        client = self._get_authed_client()

        # Create ticket via API
        create_resp = client.post("/api/tickets", {
            "full_name": full_name,
            "phone": phone,
        })
        assert create_resp.status_code == status.HTTP_201_CREATED, create_resp.data
        ticket_id = create_resp.data["id"]

        if cancel:
            cancel_resp = client.patch(f"/api/tickets/{ticket_id}/cancel")
            assert cancel_resp.status_code == status.HTTP_200_OK

        # Fetch detail
        detail_resp = client.get(f"/api/tickets/{ticket_id}")
        assert detail_resp.status_code == status.HTTP_200_OK

        data = detail_resp.data
        required_fields = [
            "id", "folio", "full_name", "phone", "status",
            "created_at", "cancelled_at", "created_by_username",
        ]
        for field in required_fields:
            assert field in data, f"Missing field '{field}' in detail response"

        # Verify values match what was created (serializer strips whitespace)
        assert data["full_name"] == full_name.strip()
        assert data["phone"] == phone.strip()

        if cancel:
            assert data["status"] == "cancelled"
            assert data["cancelled_at"] is not None
        else:
            assert data["status"] == "active"
