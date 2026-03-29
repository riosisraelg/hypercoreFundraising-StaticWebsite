"""
Property-based tests for core data models using Hypothesis.

Property 1: Folio uniqueness invariant
  — For any sequence of ticket creation, cancellation, and reassignment,
    no two active tickets share the same folio.
  **Validates: Requirements 1.4, 3.3, 12.3**

Property 2: Invalid input rejection
  — Empty/oversized name or empty/invalid phone is rejected, no ticket created.
  **Validates: Requirements 1.2, 1.3**

Property 3: Ticket state machine
  — Only valid transition is active → cancelled;
    cancelling a cancelled ticket is rejected.
  **Validates: Requirements 2.1, 2.2, 12.1, 12.2**

Property 8: Folio reassignment on cancelled tickets
  — Cancelled folio can be reassigned; active folio reassignment is rejected.
  **Validates: Requirements 3.1, 3.2**
"""

from django.contrib.auth.models import User
from django.test import TestCase
from hypothesis import given, settings, assume
from hypothesis.extra.django import TestCase as HypothesisTestCase
from hypothesis.stateful import (
    Bundle,
    RuleBasedStateMachine,
    initialize,
    rule,
)
from rest_framework import status
from rest_framework.test import APIClient

import hypothesis.strategies as st


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

phone_strategy = st.from_regex(r"\+?\d{7,15}", fullmatch=True)
name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "Zs")),
    min_size=1,
    max_size=100,
).filter(lambda s: s.strip() != "")


# ---------------------------------------------------------------------------
# Property 1 — Folio uniqueness invariant (stateful)
# **Validates: Requirements 1.4, 3.3, 12.3**
# ---------------------------------------------------------------------------

class FolioUniquenessStateMachine(RuleBasedStateMachine):
    """
    Stateful test that drives create / cancel / reassign through the API
    and asserts that no two active tickets ever share the same folio.
    """

    cancelled_ticket_ids = Bundle("cancelled_ticket_ids")

    @initialize()
    def setup(self):
        self.user = User.objects.create_user(
            username="prop_admin", password="testpass123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # -- Create a ticket --------------------------------------------------
    @rule(
        target=cancelled_ticket_ids,
        full_name=name_strategy,
        phone=phone_strategy,
    )
    def create_and_cancel(self, full_name, phone):
        """Create a ticket then immediately cancel it so the folio is free."""
        resp = self.client.post(
            "/api/tickets",
            {"full_name": full_name, "phone": phone},
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        ticket_id = resp.data["id"]

        # Cancel it so the folio can later be reassigned
        cancel_resp = self.client.patch(f"/api/tickets/{ticket_id}/cancel")
        assert cancel_resp.status_code == status.HTTP_200_OK, cancel_resp.data

        self._assert_folio_uniqueness()
        return ticket_id

    @rule(full_name=name_strategy, phone=phone_strategy)
    def create_ticket(self, full_name, phone):
        """Create a ticket and leave it active."""
        resp = self.client.post(
            "/api/tickets",
            {"full_name": full_name, "phone": phone},
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        self._assert_folio_uniqueness()

    # -- Reassign a cancelled folio ---------------------------------------
    @rule(
        ticket_id=cancelled_ticket_ids,
        full_name=name_strategy,
        phone=phone_strategy,
    )
    def reassign_folio(self, ticket_id, full_name, phone):
        """Reassign a cancelled ticket's folio to a new buyer."""
        resp = self.client.post(
            f"/api/tickets/{ticket_id}/reassign",
            {"full_name": full_name, "phone": phone},
        )
        # May fail if folio is already active (another reassign beat us).
        # Either way, the invariant must hold.
        self._assert_folio_uniqueness()

    # -- Invariant check ---------------------------------------------------
    def _assert_folio_uniqueness(self):
        from core.models import Ticket

        active = Ticket.objects.filter(status=Ticket.Status.ACTIVE)
        folios = list(active.values_list("folio", flat=True))
        assert len(folios) == len(set(folios)), (
            f"Duplicate active folios found: {folios}"
        )

    def teardown(self):
        from core.models import Ticket
        Ticket.objects.all().delete()
        User.objects.filter(username="prop_admin").delete()


class TestFolioUniquenessProperty(TestCase):
    """
    Property 1: Folio uniqueness invariant.
    **Validates: Requirements 1.4, 3.3, 12.3**
    """

    @settings(max_examples=10, stateful_step_count=10, deadline=None)
    def test_folio_uniqueness_invariant(self):
        """No two active tickets share the same folio after any operation sequence."""
        FolioUniquenessStateMachine.TestCase.settings = settings(
            max_examples=10, stateful_step_count=10, deadline=None
        )
        state_machine = FolioUniquenessStateMachine()
        state_machine.setup = state_machine.setup  # noqa
        # Run via the TestCase wrapper provided by Hypothesis
        FolioUniquenessStateMachine.TestCase(
            "runTest"
        ).runTest()


# ---------------------------------------------------------------------------
# Property 3 — Ticket state machine
# **Validates: Requirements 2.1, 2.2, 12.1, 12.2**
# ---------------------------------------------------------------------------

class TestTicketStateMachineProperty(HypothesisTestCase):
    """
    Property 3: Ticket state machine.
    Only valid transition is active → cancelled; cancelling a cancelled
    ticket is rejected.
    **Validates: Requirements 2.1, 2.2, 12.1, 12.2**
    """

    def _get_authed_client(self):
        """Create a user and return an authenticated APIClient.

        Called inside each @given example so the user lives within the
        per-example transaction that HypothesisTestCase manages.
        Uses force_authenticate to avoid JWT endpoint issues within
        Hypothesis transactions.
        """
        user = User.objects.create_user(
            username="sm_admin", password="testpass123"
        )
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    @given(full_name=name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_active_to_cancelled_succeeds(self, full_name, phone):
        """
        For any valid ticket, cancelling an active ticket succeeds and
        sets status to cancelled.
        **Validates: Requirements 2.1, 12.1**
        """
        client = self._get_authed_client()

        # Create
        resp = client.post(
            "/api/tickets",
            {"full_name": full_name, "phone": phone},
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        ticket_id = resp.data["id"]
        assert resp.data["status"] == "active"

        # Cancel (active → cancelled)
        cancel_resp = client.patch(f"/api/tickets/{ticket_id}/cancel")
        assert cancel_resp.status_code == status.HTTP_200_OK, cancel_resp.data
        assert cancel_resp.data["status"] == "cancelled"
        assert cancel_resp.data["cancelled_at"] is not None

    @given(full_name=name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_cancelling_cancelled_ticket_rejected(self, full_name, phone):
        """
        For any cancelled ticket, attempting to cancel again returns 400.
        **Validates: Requirements 2.2, 12.2**
        """
        client = self._get_authed_client()

        # Create then cancel
        resp = client.post(
            "/api/tickets",
            {"full_name": full_name, "phone": phone},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        ticket_id = resp.data["id"]

        cancel_resp = client.patch(f"/api/tickets/{ticket_id}/cancel")
        assert cancel_resp.status_code == status.HTTP_200_OK

        # Try to cancel again — must be rejected
        second_cancel = client.patch(f"/api/tickets/{ticket_id}/cancel")
        assert second_cancel.status_code == status.HTTP_400_BAD_REQUEST
        assert "already cancelled" in second_cancel.data["detail"].lower()

    @given(full_name=name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_cancelled_to_active_transition_impossible(self, full_name, phone):
        """
        For any cancelled ticket, directly setting status back to active
        at the model level violates the business rule — reassignment creates
        a NEW ticket instead.
        **Validates: Requirements 12.1, 12.2**
        """
        from core.models import Ticket

        client = self._get_authed_client()

        # Create and cancel via API
        resp = client.post(
            "/api/tickets",
            {"full_name": full_name, "phone": phone},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        ticket_id = resp.data["id"]

        cancel_resp = client.patch(f"/api/tickets/{ticket_id}/cancel")
        assert cancel_resp.status_code == status.HTTP_200_OK

        # Verify the ticket is cancelled in DB
        ticket = Ticket.objects.get(pk=ticket_id)
        assert ticket.status == Ticket.Status.CANCELLED

        # The API has no endpoint to reactivate — reassignment creates a
        # new ticket. Verify the original stays cancelled after reassign.
        reassign_resp = client.post(
            f"/api/tickets/{ticket_id}/reassign",
            {"full_name": full_name, "phone": phone},
        )
        assert reassign_resp.status_code == status.HTTP_201_CREATED

        # Original ticket must still be cancelled
        ticket.refresh_from_db()
        assert ticket.status == Ticket.Status.CANCELLED


# ---------------------------------------------------------------------------
# Property 2 — Invalid input rejection
# **Validates: Requirements 1.2, 1.3**
# ---------------------------------------------------------------------------

# Strategies that generate INVALID names
invalid_name_strategy = st.one_of(
    # Empty string
    st.just(""),
    # Whitespace-only strings
    st.text(
        alphabet=st.sampled_from([" ", "\t", "\n"]),
        min_size=1,
        max_size=10,
    ),
    # Oversized names (201–300 chars)
    st.text(
        alphabet=st.characters(whitelist_categories=("L",)),
        min_size=201,
        max_size=300,
    ).filter(lambda s: s.strip() != ""),
)

# Strategies that generate INVALID phones
invalid_phone_strategy = st.one_of(
    # Empty string
    st.just(""),
    # Whitespace-only strings
    st.text(
        alphabet=st.sampled_from([" ", "\t", "\n"]),
        min_size=1,
        max_size=10,
    ),
    # Alphabetic strings (no digits)
    st.text(
        alphabet=st.characters(whitelist_categories=("L",)),
        min_size=1,
        max_size=15,
    ).filter(lambda s: s.strip() != ""),
    # Too short (fewer than 7 digits)
    st.from_regex(r"\+?\d{1,6}", fullmatch=True),
)


class TestInvalidInputRejectionProperty(HypothesisTestCase):
    """
    Property 2: Invalid input rejection.
    Empty/oversized name or empty/invalid phone is rejected, no ticket created.
    **Validates: Requirements 1.2, 1.3**
    """

    def _get_authed_client(self):
        user = User.objects.create_user(
            username="inv_admin", password="testpass123"
        )
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    @given(bad_name=invalid_name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_invalid_name_rejected_no_ticket_created(self, bad_name, phone):
        """
        For any invalid name (empty, whitespace-only, or >200 chars) with
        any valid phone, ticket creation is rejected and no ticket is created.
        **Validates: Requirement 1.2**
        """
        from core.models import Ticket

        client = self._get_authed_client()
        count_before = Ticket.objects.count()

        resp = client.post(
            "/api/tickets",
            {"full_name": bad_name, "phone": phone},
        )

        assert resp.status_code == status.HTTP_400_BAD_REQUEST, (
            f"Expected 400 for name={bad_name!r}, got {resp.status_code}: {resp.data}"
        )
        assert Ticket.objects.count() == count_before, (
            "No ticket should be created when name is invalid"
        )

    @given(full_name=name_strategy, bad_phone=invalid_phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_invalid_phone_rejected_no_ticket_created(self, full_name, bad_phone):
        """
        For any valid name with any invalid phone (empty, whitespace-only,
        alphabetic, or too short), ticket creation is rejected and no ticket
        is created.
        **Validates: Requirement 1.3**
        """
        from core.models import Ticket

        client = self._get_authed_client()
        count_before = Ticket.objects.count()

        resp = client.post(
            "/api/tickets",
            {"full_name": full_name, "phone": bad_phone},
        )

        assert resp.status_code == status.HTTP_400_BAD_REQUEST, (
            f"Expected 400 for phone={bad_phone!r}, got {resp.status_code}: {resp.data}"
        )
        assert Ticket.objects.count() == count_before, (
            "No ticket should be created when phone is invalid"
        )


# ---------------------------------------------------------------------------
# Property 8 — Folio reassignment on cancelled tickets
# **Validates: Requirements 3.1, 3.2**
# ---------------------------------------------------------------------------

class TestFolioReassignmentProperty(HypothesisTestCase):
    """
    Property 8: Folio reassignment on cancelled tickets.
    Cancelled folio can be reassigned; active folio reassignment is rejected.
    **Validates: Requirements 3.1, 3.2**
    """

    def _get_authed_client(self):
        user = User.objects.create_user(
            username="ra_admin", password="testpass123"
        )
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    @given(
        orig_name=name_strategy,
        orig_phone=phone_strategy,
        new_name=name_strategy,
        new_phone=phone_strategy,
    )
    @settings(max_examples=10, deadline=None)
    def test_cancelled_folio_can_be_reassigned(
        self, orig_name, orig_phone, new_name, new_phone
    ):
        """
        For any cancelled ticket, reassigning its folio with valid buyer
        data creates a new active ticket reusing that folio.
        **Validates: Requirement 3.1**
        """
        from core.models import Ticket

        client = self._get_authed_client()

        # Create and cancel a ticket
        create_resp = client.post(
            "/api/tickets",
            {"full_name": orig_name, "phone": orig_phone},
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        ticket_id = create_resp.data["id"]
        folio = create_resp.data["folio"]

        cancel_resp = client.patch(f"/api/tickets/{ticket_id}/cancel")
        assert cancel_resp.status_code == status.HTTP_200_OK

        # Reassign the cancelled folio
        reassign_resp = client.post(
            f"/api/tickets/{ticket_id}/reassign",
            {"full_name": new_name, "phone": new_phone},
        )
        assert reassign_resp.status_code == status.HTTP_201_CREATED, (
            f"Reassignment failed: {reassign_resp.data}"
        )
        assert reassign_resp.data["folio"] == folio, (
            "Reassigned ticket must reuse the original folio"
        )
        assert reassign_resp.data["status"] == "active"

        # Original ticket must remain cancelled
        orig = Ticket.objects.get(pk=ticket_id)
        assert orig.status == Ticket.Status.CANCELLED

    @given(
        orig_name=name_strategy,
        orig_phone=phone_strategy,
        new_name=name_strategy,
        new_phone=phone_strategy,
    )
    @settings(max_examples=10, deadline=None)
    def test_active_folio_reassignment_rejected(
        self, orig_name, orig_phone, new_name, new_phone
    ):
        """
        For any active ticket, attempting to reassign its folio is rejected.
        **Validates: Requirement 3.2**
        """
        client = self._get_authed_client()

        # Create a ticket (stays active — do NOT cancel)
        create_resp = client.post(
            "/api/tickets",
            {"full_name": orig_name, "phone": orig_phone},
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        ticket_id = create_resp.data["id"]

        # Attempt to reassign an active folio — must be rejected
        reassign_resp = client.post(
            f"/api/tickets/{ticket_id}/reassign",
            {"full_name": new_name, "phone": new_phone},
        )
        assert reassign_resp.status_code == status.HTTP_400_BAD_REQUEST, (
            f"Expected 400 for active folio reassignment, got {reassign_resp.status_code}"
        )


# ---------------------------------------------------------------------------
# Property 11 — Admin endpoint authentication enforcement
# **Validates: Requirements 10.2, 10.3, 10.4**
# ---------------------------------------------------------------------------

# Admin-only endpoints: each tuple is (http_method, url_template, needs_ticket)
# needs_ticket=True means we substitute a real ticket UUID into the URL.
_ADMIN_ENDPOINTS = [
    ("post", "/api/tickets", False),
    ("get", "/api/tickets/", False),
    ("get", "/api/tickets/{ticket_id}", True),
    ("patch", "/api/tickets/{ticket_id}/cancel", True),
    ("post", "/api/tickets/{ticket_id}/reassign", True),
]

# Public endpoints that must succeed without authentication.
_PUBLIC_ENDPOINTS = [
    ("post", "/api/auth/login"),
]


class TestAuthEnforcementProperty(HypothesisTestCase):
    """
    Property 11: Admin endpoint authentication enforcement.
    Unauthenticated requests to admin endpoints return 401;
    public endpoints succeed without auth.
    **Validates: Requirements 10.2, 10.3, 10.4**
    """

    def _create_ticket_for_url(self):
        """Create a real ticket so URL-based endpoints have a valid UUID."""
        from core.models import Ticket

        user = User.objects.create_user(
            username="auth_helper", password="testpass123"
        )
        ticket = Ticket.objects.create(
            folio="HC-AUTH-TEST",
            full_name="Auth Test Buyer",
            phone="+5551234567",
            status=Ticket.Status.ACTIVE,
            created_by=user,
        )
        return ticket

    @given(
        endpoint_index=st.integers(min_value=0, max_value=len(_ADMIN_ENDPOINTS) - 1),
        full_name=name_strategy,
        phone=phone_strategy,
    )
    @settings(max_examples=10, deadline=None)
    def test_unauthenticated_admin_requests_return_401(
        self, endpoint_index, full_name, phone
    ):
        """
        For any admin-only endpoint, sending a request without valid
        authentication returns 401 Unauthorized.
        **Validates: Requirements 10.2, 10.3**
        """
        method, url_template, needs_ticket = _ADMIN_ENDPOINTS[endpoint_index]
        client = APIClient()  # no credentials

        if needs_ticket:
            ticket = self._create_ticket_for_url()
            url = url_template.format(ticket_id=ticket.pk)
        else:
            url = url_template

        # Build a body for POST/PATCH requests
        body = {"full_name": full_name, "phone": phone} if method in ("post", "patch") else None

        resp = getattr(client, method)(url, body, format="json") if body else getattr(client, method)(url)

        assert resp.status_code == status.HTTP_401_UNAUTHORIZED, (
            f"Expected 401 for unauthenticated {method.upper()} {url}, "
            f"got {resp.status_code}: {resp.data}"
        )

    @given(
        username=st.from_regex(r"[a-zA-Z0-9]{3,20}", fullmatch=True),
        password=st.from_regex(r"[a-zA-Z0-9]{8,30}", fullmatch=True),
    )
    @settings(max_examples=10, deadline=None)
    def test_public_login_endpoint_accessible_without_auth(self, username, password):
        """
        For any credentials (valid or not), the login endpoint is reachable
        without authentication — it returns 200 on valid creds or 401 on
        invalid creds, but never a 403 Forbidden which would indicate the
        endpoint itself requires prior authentication.
        **Validates: Requirement 10.4**
        """
        client = APIClient()  # no credentials

        resp = client.post(
            "/api/auth/login",
            {"username": username, "password": password},
            format="json",
        )

        # The login endpoint must NOT return 403 Forbidden, which would
        # indicate the endpoint requires prior authentication.
        assert resp.status_code != status.HTTP_403_FORBIDDEN, (
            f"Login endpoint should be public, got 403 for user={username!r}"
        )
        # Valid responses:
        #   200 — good creds
        #   400 — malformed input (serializer validation)
        #   401 — bad creds
        #   429 — rate-limited (expected per Requirement 11.3)
        # The point is the endpoint is reachable without prior auth.
        assert resp.status_code in (
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_429_TOO_MANY_REQUESTS,
        ), (
            f"Unexpected status {resp.status_code} from public login endpoint"
        )

    @given(full_name=name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_authenticated_admin_requests_not_rejected_as_401(
        self, full_name, phone
    ):
        """
        For any valid admin credentials, admin endpoints do NOT return 401.
        This is the positive counterpart: auth works when provided.
        **Validates: Requirements 10.2, 10.3**
        """
        user = User.objects.create_user(
            username="auth_ok_admin", password="testpass123"
        )
        client = APIClient()
        client.force_authenticate(user=user)

        # Try ticket creation as a representative admin endpoint
        resp = client.post(
            "/api/tickets",
            {"full_name": full_name, "phone": phone},
            format="json",
        )

        assert resp.status_code != status.HTTP_401_UNAUTHORIZED, (
            f"Authenticated request should not get 401, got: {resp.data}"
        )


# ---------------------------------------------------------------------------
# Property 14 — Password storage security
# **Validates: Requirement 11.5**
# ---------------------------------------------------------------------------

class TestPasswordStorageSecurityProperty(HypothesisTestCase):
    """
    Property 14: Password storage security.
    Stored password is a hash, never plain text.
    **Validates: Requirement 11.5**
    """

    @given(
        username=st.text(
            alphabet=st.characters(whitelist_categories=("L", "Nd")),
            min_size=3,
            max_size=20,
        ).filter(lambda s: s.strip() != ""),
        raw_password=st.text(min_size=8, max_size=50).filter(
            lambda s: s.strip() != ""
        ),
    )
    @settings(max_examples=10, deadline=None)
    def test_password_never_stored_as_plain_text(self, username, raw_password):
        """
        For any admin created with any password, the stored password field
        is a hash (starts with a Django hasher prefix) and never equals the
        raw password.
        **Validates: Requirement 11.5**
        """
        user = User.objects.create_user(
            username=username, password=raw_password
        )

        # Reload from DB to ensure we're checking persisted value
        user.refresh_from_db()

        # The stored value must NOT be the raw password
        assert user.password != raw_password, (
            f"Password stored as plain text for user {username!r}"
        )

        # Django password hashes follow the format: algorithm$iterations$salt$hash
        # or pbkdf2_sha256$..., argon2$..., bcrypt$..., etc.
        assert "$" in user.password, (
            f"Password doesn't look like a hash (no '$' separator): {user.password[:20]}..."
        )

        # check_password must validate the raw password against the hash
        assert user.check_password(raw_password), (
            f"Hashed password doesn't verify against the original for user {username!r}"
        )

    @given(
        raw_password=st.text(min_size=8, max_size=50).filter(
            lambda s: s.strip() != ""
        ),
    )
    @settings(max_examples=10, deadline=None)
    def test_password_hash_not_reversible_to_plain_text(self, raw_password):
        """
        For any password, the hash does not contain the raw password as a
        substring (basic check against trivially reversible storage).
        **Validates: Requirement 11.5**
        """
        user = User.objects.create_user(
            username="hash_check_user", password=raw_password
        )
        user.refresh_from_db()

        # The raw password should not appear as a substring in the hash
        # (this catches base64-encoded-but-not-hashed scenarios)
        assert raw_password not in user.password, (
            f"Raw password found as substring in stored hash for password length {len(raw_password)}"
        )


# ---------------------------------------------------------------------------
# Property 4 — Cancelled tickets excluded from draw
# **Validates: Requirements 2.3, 6.1**
# ---------------------------------------------------------------------------


class TestCancelledTicketsExcludedFromDraw(HypothesisTestCase):
    """
    Property 4: Cancelled tickets excluded from draw.
    Only active tickets appear in draw results.
    **Validates: Requirements 2.3, 6.1**
    """

    def _get_authed_client(self):
        user = User.objects.create_user(
            username="draw_excl_admin", password="testpass123"
        )
        client = APIClient()
        client.force_authenticate(user=user)
        return client, user

    @given(
        num_active=st.integers(min_value=3, max_value=15),
        num_cancelled=st.integers(min_value=1, max_value=10),
    )
    @settings(max_examples=10, deadline=None)
    def test_cancelled_tickets_never_appear_in_draw_results(
        self, num_active, num_cancelled
    ):
        """
        For any mix of active and cancelled tickets, executing the draw
        only selects from active tickets. No cancelled ticket ever appears
        in the results.
        **Validates: Requirements 2.3, 6.1**
        """
        from core.models import Ticket, DrawResult
        from core.draw_engine import execute_draw

        user = User.objects.create_user(
            username="excl_admin", password="testpass123"
        )

        active_tickets = []
        for i in range(num_active):
            t = Ticket.objects.create(
                folio=f"HC-A-{i:04d}",
                full_name=f"Active Buyer {i}",
                phone=f"+555000{i:04d}",
                status=Ticket.Status.ACTIVE,
                created_by=user,
            )
            active_tickets.append(t)

        cancelled_ids = set()
        for i in range(num_cancelled):
            t = Ticket.objects.create(
                folio=f"HC-C-{i:04d}",
                full_name=f"Cancelled Buyer {i}",
                phone=f"+555100{i:04d}",
                status=Ticket.Status.CANCELLED,
                created_by=user,
            )
            cancelled_ids.add(t.pk)

        results = execute_draw()

        active_ids = {t.pk for t in active_tickets}
        for r in results:
            assert r["ticket"].pk in active_ids, (
                f"Winner {r['ticket'].folio} is not an active ticket"
            )
            assert r["ticket"].pk not in cancelled_ids, (
                f"Cancelled ticket {r['ticket'].folio} appeared in draw results"
            )
            assert r["ticket"].status == Ticket.Status.ACTIVE, (
                f"Winner {r['ticket'].folio} has status {r['ticket'].status}, expected active"
            )


# ---------------------------------------------------------------------------
# Property 5 — Draw produces exactly 3 distinct winners
# **Validates: Requirements 6.1, 6.6**
# ---------------------------------------------------------------------------


class TestDrawProducesThreeDistinctWinners(HypothesisTestCase):
    """
    Property 5: Draw produces exactly 3 distinct winners.
    Exactly 3 results with ranks 1, 2, 3, each a distinct ticket.
    **Validates: Requirements 6.1, 6.6**
    """

    @given(num_active=st.integers(min_value=3, max_value=50))
    @settings(max_examples=10, deadline=None)
    def test_draw_returns_exactly_three_distinct_winners(self, num_active):
        """
        For any set of 3 or more active tickets, the draw produces exactly
        3 results with prize ranks {1, 2, 3}, each referencing a distinct ticket.
        **Validates: Requirements 6.1, 6.6**
        """
        from core.models import Ticket
        from core.draw_engine import execute_draw

        user = User.objects.create_user(
            username="three_admin", password="testpass123"
        )

        for i in range(num_active):
            Ticket.objects.create(
                folio=f"HC-D-{i:04d}",
                full_name=f"Draw Buyer {i}",
                phone=f"+555200{i:04d}",
                status=Ticket.Status.ACTIVE,
                created_by=user,
            )

        results = execute_draw()

        # Exactly 3 results
        assert len(results) == 3, (
            f"Expected exactly 3 winners, got {len(results)}"
        )

        # Prize ranks are exactly {1, 2, 3}
        ranks = {r["prize_rank"] for r in results}
        assert ranks == {1, 2, 3}, (
            f"Expected prize ranks {{1, 2, 3}}, got {ranks}"
        )

        # All winners are distinct tickets
        winner_ids = [r["ticket"].pk for r in results]
        assert len(winner_ids) == len(set(winner_ids)), (
            f"Duplicate winners found: {winner_ids}"
        )

    @given(num_active=st.integers(min_value=0, max_value=2))
    @settings(max_examples=5, deadline=None)
    def test_draw_fails_with_fewer_than_three_active_tickets(self, num_active):
        """
        For any set of fewer than 3 active tickets, the draw raises DrawError.
        **Validates: Requirement 6.6**
        """
        from core.models import Ticket
        from core.draw_engine import DrawError, execute_draw

        user = User.objects.create_user(
            username="few_admin", password="testpass123"
        )

        for i in range(num_active):
            Ticket.objects.create(
                folio=f"HC-F-{i:04d}",
                full_name=f"Few Buyer {i}",
                phone=f"+555300{i:04d}",
                status=Ticket.Status.ACTIVE,
                created_by=user,
            )

        with self.assertRaises(DrawError):
            execute_draw()


# ---------------------------------------------------------------------------
# Property 6 — Draw fairness
# **Validates: Requirement 6.2**
# ---------------------------------------------------------------------------


class TestDrawFairness(TestCase):
    """
    Property 6: Draw fairness.
    Over many executions, each active ticket is selected with approximately
    equal frequency (uniform distribution).
    **Validates: Requirement 6.2**
    """

    def test_draw_selects_each_ticket_with_approximately_equal_frequency(self):
        """
        Over many independent draw executions on the same set of active
        tickets, each ticket is selected as a winner with approximately
        equal frequency.
        **Validates: Requirement 6.2**
        """
        from collections import Counter
        from core.models import Ticket
        from core.draw_engine import execute_draw

        user = User.objects.create_user(
            username="fair_admin", password="testpass123"
        )

        num_tickets = 10
        tickets = []
        for i in range(num_tickets):
            t = Ticket.objects.create(
                folio=f"HC-FAIR-{i:04d}",
                full_name=f"Fair Buyer {i}",
                phone=f"+555400{i:04d}",
                status=Ticket.Status.ACTIVE,
                created_by=user,
            )
            tickets.append(t)

        num_draws = 1000
        selection_counts = Counter()

        for _ in range(num_draws):
            results = execute_draw()
            for r in results:
                selection_counts[r["ticket"].pk] += 1

        # Each ticket should be selected approximately
        # (num_draws * 3 / num_tickets) times = 900 times for 3000 draws, 10 tickets
        expected_per_ticket = (num_draws * 3) / num_tickets

        for ticket in tickets:
            count = selection_counts.get(ticket.pk, 0)
            # Allow a generous tolerance: within 40% of expected value
            # to avoid flaky tests while still catching gross unfairness
            lower_bound = expected_per_ticket * 0.6
            upper_bound = expected_per_ticket * 1.4
            assert lower_bound <= count <= upper_bound, (
                f"Ticket {ticket.folio} selected {count} times, "
                f"expected ~{expected_per_ticket:.0f} "
                f"(acceptable range: {lower_bound:.0f}–{upper_bound:.0f})"
            )

        # Also verify every ticket was selected at least once
        for ticket in tickets:
            assert ticket.pk in selection_counts, (
                f"Ticket {ticket.folio} was never selected in {num_draws} draws"
            )


# ---------------------------------------------------------------------------
# Property 9 — No PII in public results
# **Validates: Requirements 7.1, 11.4**
# ---------------------------------------------------------------------------


class TestNoPIIInPublicResults(HypothesisTestCase):
    """
    Property 9: No PII in public results.
    Public results contain only folio numbers and prize ranks, no names
    or phones.
    **Validates: Requirements 7.1, 11.4**
    """

    @given(
        num_tickets=st.integers(min_value=3, max_value=10),
        data=st.data(),
    )
    @settings(max_examples=10, deadline=None)
    def test_public_results_contain_no_pii(self, num_tickets, data):
        """
        For any set of tickets with arbitrary names and phones, the public
        results endpoint returns only folio and prize info — never buyer
        names or phone numbers.
        **Validates: Requirements 7.1, 11.4**
        """
        from core.models import Ticket, DrawResult
        from core.draw_engine import execute_draw

        names = [data.draw(name_strategy) for _ in range(num_tickets)]
        phones = [data.draw(phone_strategy) for _ in range(num_tickets)]

        user = User.objects.create_user(
            username="pii_admin", password="testpass123"
        )

        tickets = []
        for i, (name, phone) in enumerate(zip(names, phones)):
            t = Ticket.objects.create(
                folio=f"HC-PII-{i:04d}",
                full_name=name,
                phone=phone,
                status=Ticket.Status.ACTIVE,
                created_by=user,
            )
            tickets.append(t)

        # Execute draw and store results
        winners = execute_draw()
        for w in winners:
            DrawResult.objects.create(
                ticket=w["ticket"],
                prize_rank=w["prize_rank"],
                prize_name=w["prize_name"],
            )

        # Hit the public endpoint
        client = APIClient()  # unauthenticated
        resp = client.get("/api/draw/results")
        assert resp.status_code == status.HTTP_200_OK, resp.data

        # 1) Structural check: each result dict must only contain
        #    the allowed public fields — no PII fields like full_name or phone.
        pii_fields = {"full_name", "phone", "name", "buyer_name", "buyer_phone"}
        allowed_keys = {"folio", "prize_rank", "prize_name"}
        for result in resp.data["results"]:
            result_keys = set(result.keys())
            assert result_keys <= allowed_keys, (
                f"Public result contains unexpected fields: "
                f"{result_keys - allowed_keys}"
            )
            assert result_keys.isdisjoint(pii_fields), (
                f"Public result exposes PII fields: "
                f"{result_keys & pii_fields}"
            )

        # 2) Value check: none of the result values should contain
        #    any buyer name or phone. We compare against the actual
        #    string values in each result dict.
        for result in resp.data["results"]:
            result_values = [str(v) for v in result.values()]
            for name in names:
                for val in result_values:
                    assert val != name, (
                        f"Buyer name '{name}' found as a value in public results"
                    )
            for phone in phones:
                for val in result_values:
                    assert val != phone, (
                        f"Phone '{phone}' found as a value in public results"
                    )


# ---------------------------------------------------------------------------
# Property 10 — Dashboard computation
# **Validates: Requirement 8.1**
# ---------------------------------------------------------------------------


class TestDashboardComputation(HypothesisTestCase):
    """
    Property 10: Dashboard computation.
    Dashboard returns active ticket count and count × $200 MXN.
    **Validates: Requirement 8.1**
    """

    @given(
        num_active=st.integers(min_value=0, max_value=50),
        num_cancelled=st.integers(min_value=0, max_value=20),
    )
    @settings(max_examples=10, deadline=None)
    def test_dashboard_returns_correct_active_count_and_total(
        self, num_active, num_cancelled
    ):
        """
        For any mix of active and cancelled tickets, the dashboard endpoint
        returns a count equal to the number of active tickets and a total
        amount equal to that count × $200 MXN.
        **Validates: Requirement 8.1**
        """
        from core.models import Ticket

        TICKET_PRICE = 200

        user = User.objects.create_user(
            username="dash_admin", password="testpass123"
        )

        for i in range(num_active):
            Ticket.objects.create(
                folio=f"HC-DA-{i:04d}",
                full_name=f"Active Dash {i}",
                phone=f"+555600{i:04d}",
                status=Ticket.Status.ACTIVE,
                created_by=user,
            )

        for i in range(num_cancelled):
            Ticket.objects.create(
                folio=f"HC-DC-{i:04d}",
                full_name=f"Cancelled Dash {i}",
                phone=f"+555700{i:04d}",
                status=Ticket.Status.CANCELLED,
                created_by=user,
            )

        client = APIClient()  # unauthenticated — public endpoint
        resp = client.get("/api/dashboard")
        assert resp.status_code == status.HTTP_200_OK, resp.data

        assert resp.data["active_tickets"] == num_active, (
            f"Expected {num_active} active tickets, got {resp.data['active_tickets']}"
        )
        assert resp.data["total_raised"] == num_active * TICKET_PRICE, (
            f"Expected total_raised={num_active * TICKET_PRICE}, "
            f"got {resp.data['total_raised']}"
        )
        assert resp.data["goal"] == 26_000, (
            f"Expected goal=26000, got {resp.data['goal']}"
        )


# ---------------------------------------------------------------------------
# Property 7 — Draw immutability
# **Validates: Requirements 6.3, 6.4**
# ---------------------------------------------------------------------------


class TestDrawImmutability(HypothesisTestCase):
    """
    Property 7: Draw immutability.
    After draw, results don't change on subsequent GET requests;
    re-execution requires confirmation.
    **Validates: Requirements 6.3, 6.4**
    """

    def _setup_tickets_and_draw(self, num_active):
        """Helper: create tickets, execute draw via API, return authed client."""
        from core.models import Ticket

        user = User.objects.create_user(
            username="immut_admin", password="testpass123"
        )
        client = APIClient()
        client.force_authenticate(user=user)

        for i in range(num_active):
            Ticket.objects.create(
                folio=f"HC-IM-{i:04d}",
                full_name=f"Immut Buyer {i}",
                phone=f"+555800{i:04d}",
                status=Ticket.Status.ACTIVE,
                created_by=user,
            )

        # Execute the draw
        resp = client.post("/api/draw/execute")
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        return client

    @given(
        num_active=st.integers(min_value=3, max_value=20),
        num_gets=st.integers(min_value=2, max_value=5),
    )
    @settings(max_examples=10, deadline=None)
    def test_results_unchanged_on_subsequent_gets(self, num_active, num_gets):
        """
        For any completed draw, subsequent GET requests to the public
        results endpoint return identical data.
        **Validates: Requirement 6.3**
        """
        self._setup_tickets_and_draw(num_active)

        public_client = APIClient()  # unauthenticated
        first_resp = public_client.get("/api/draw/results")
        assert first_resp.status_code == status.HTTP_200_OK
        first_results = first_resp.data["results"]

        for _ in range(num_gets):
            resp = public_client.get("/api/draw/results")
            assert resp.status_code == status.HTTP_200_OK
            assert resp.data["results"] == first_results, (
                "Public results changed between GET requests"
            )

    @given(num_active=st.integers(min_value=3, max_value=15))
    @settings(max_examples=10, deadline=None)
    def test_re_execution_without_confirmation_rejected(self, num_active):
        """
        For any completed draw, attempting to re-execute without the
        confirmation phrase returns 409 Conflict and preserves existing
        results.
        **Validates: Requirement 6.4**
        """
        from core.models import DrawResult

        client = self._setup_tickets_and_draw(num_active)

        # Capture current results
        original_results = list(
            DrawResult.objects.values_list("ticket_id", "prize_rank").order_by("prize_rank")
        )

        # Attempt re-execution without confirmation
        resp = client.post("/api/draw/execute")
        assert resp.status_code == status.HTTP_409_CONFLICT, (
            f"Expected 409 for re-execution without confirmation, got {resp.status_code}"
        )
        assert resp.data.get("already_executed") is True

        # Results must be unchanged
        current_results = list(
            DrawResult.objects.values_list("ticket_id", "prize_rank").order_by("prize_rank")
        )
        assert current_results == original_results, (
            "Draw results changed after rejected re-execution attempt"
        )

    @given(num_active=st.integers(min_value=3, max_value=15))
    @settings(max_examples=5, deadline=None)
    def test_re_execution_with_confirmation_overwrites_results(self, num_active):
        """
        For any completed draw, re-executing with the confirmation phrase
        'rewrite draw' deletes old results and produces new ones.
        **Validates: Requirements 6.4, 6.5**
        """
        from core.models import DrawResult

        client = self._setup_tickets_and_draw(num_active)

        original_ids = set(
            DrawResult.objects.values_list("id", flat=True)
        )

        # Re-execute with confirmation
        resp = client.post(
            "/api/draw/execute",
            {"confirmation": "rewrite draw"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED, resp.data

        # New results should exist
        new_count = DrawResult.objects.count()
        assert new_count == 3, f"Expected 3 new results, got {new_count}"

        # Old result IDs should be gone
        new_ids = set(DrawResult.objects.values_list("id", flat=True))
        assert original_ids.isdisjoint(new_ids), (
            "Old draw result records were not deleted on re-execution"
        )


# ---------------------------------------------------------------------------
# Property 12 — Ticket generation content completeness
# **Validates: Requirements 5.1, 5.2, 5.3**
# ---------------------------------------------------------------------------

import io
from PyPDF2 import PdfReader

from core.ticket_generator import (
    generate_ticket_pdf,
    DRAW_DATE,
    BRAND_NAME,
)
from core.models import Ticket


folio_strategy = st.from_regex(r"HC-[0-9]{3,4}", fullmatch=True)

# ASCII-only name strategy for PDF text extraction tests.
# PyPDF2 can't reliably extract non-ASCII glyphs rendered by reportlab,
# so we restrict to basic Latin letters + spaces for content assertions.
ascii_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll"), whitelist_characters=" ",
                           codec="ascii"),
    min_size=1,
    max_size=60,
).filter(lambda s: s.strip() != "")


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract all text from PDF bytes using PyPDF2."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


class TestTicketGenerationContentCompleteness(HypothesisTestCase):
    """
    Property 12: Ticket generation content completeness.
    Generated output contains folio, buyer name, draw title, draw date,
    and HyperCore branding.
    **Validates: Requirements 5.1, 5.2, 5.3**
    """

    # -- PDF (fully implemented — Req 5.1) --------------------------------

    @given(folio=folio_strategy, full_name=ascii_name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_pdf_contains_folio_name_date_and_branding(self, folio, full_name, phone):
        """
        For any ticket, the generated PDF contains the folio, buyer name
        (or truncated version), draw date, and HyperCore branding.
        **Validates: Requirement 5.1**
        """
        user = User.objects.create_user(
            username="pdfgen_admin", password="testpass123"
        )
        ticket = Ticket.objects.create(
            folio=folio,
            full_name=full_name,
            phone=phone,
            status=Ticket.Status.ACTIVE,
            created_by=user,
        )

        pdf_bytes = generate_ticket_pdf(ticket)

        # Valid PDF header
        assert pdf_bytes.startswith(b"%PDF"), (
            "Generated output is not a valid PDF (missing %PDF header)"
        )

        # Extract text for content assertions
        text = _extract_pdf_text(pdf_bytes)

        # Folio present
        assert folio in text, (
            f"Folio '{folio}' not found in PDF text"
        )

        # Buyer name: if > 35 chars the generator truncates to 32 + "..."
        if len(full_name) > 35:
            expected_name = full_name[:32] + "..."
        else:
            expected_name = full_name
        assert expected_name in text, (
            f"Buyer name '{expected_name}' not found in PDF text"
        )

        # Draw date
        assert DRAW_DATE in text, (
            f"Draw date '{DRAW_DATE}' not found in PDF text"
        )

        # Brand name
        assert BRAND_NAME in text, (
            f"Brand name '{BRAND_NAME}' not found in PDF text"
        )

    # -- Apple Wallet stub (Req 5.2) --------------------------------------

    @given(folio=folio_strategy, full_name=name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_apple_wallet_stub_preserves_folio(self, folio, full_name, phone):
        """
        For any ticket, the Apple Wallet stub response includes the
        ticket's folio in the response data.
        **Validates: Requirement 5.2**
        """
        user = User.objects.create_user(
            username="wallet_admin", password="testpass123"
        )
        ticket = Ticket.objects.create(
            folio=folio,
            full_name=full_name,
            phone=phone,
            status=Ticket.Status.ACTIVE,
            created_by=user,
        )

        client = APIClient()
        client.force_authenticate(user=user)

        resp = client.get(f"/api/tickets/{ticket.pk}/download/wallet")
        assert resp.status_code == status.HTTP_501_NOT_IMPLEMENTED
        assert resp.data["folio"] == folio, (
            f"Expected folio '{folio}' in wallet stub, got '{resp.data.get('folio')}'"
        )

    # -- Google Wallet stub (Req 5.3) -------------------------------------

    @given(folio=folio_strategy, full_name=name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_google_wallet_stub_preserves_folio(self, folio, full_name, phone):
        """
        For any ticket, the Google Wallet stub response includes the
        ticket's folio in the response data.
        **Validates: Requirement 5.3**
        """
        user = User.objects.create_user(
            username="gwallet_admin", password="testpass123"
        )
        ticket = Ticket.objects.create(
            folio=folio,
            full_name=full_name,
            phone=phone,
            status=Ticket.Status.ACTIVE,
            created_by=user,
        )

        client = APIClient()
        client.force_authenticate(user=user)

        resp = client.get(f"/api/tickets/{ticket.pk}/download/google-wallet")
        assert resp.status_code == status.HTTP_501_NOT_IMPLEMENTED
        assert resp.data["folio"] == folio, (
            f"Expected folio '{folio}' in Google Wallet stub, got '{resp.data.get('folio')}'"
        )
