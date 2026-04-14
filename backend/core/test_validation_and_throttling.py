"""
Tests for input validation and rate limiting (Task 7).

Requirements:
  11.2 — Validate all input fields on every request
  11.3 — Rate limiting on public endpoints to prevent abuse
"""
from unittest.mock import patch, PropertyMock

from core.models import User
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from core.throttles import LoginThrottle, PublicEndpointThrottle


# ── Input Validation Tests (Req 11.2) ─────────────────────────────────


class DrawExecuteValidationTests(TestCase):
    """Validate the confirmation field on POST /api/draw/execute."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_val', password='testpass123',
        )
        resp = self.client.post('/api/auth/login', {
            'username': 'admin_val', 'password': 'testpass123',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def _create_tickets(self, count=3):
        """Helper to create enough active tickets for a draw."""
        for i in range(count):
            self.client.post('/api/tickets', {
                'full_name': f'Buyer {i}',
                'phone': f'+521000000{i}',
            })

    def test_invalid_confirmation_phrase_rejected(self):
        """Non-empty confirmation that isn't 'rewrite draw' is rejected."""
        self._create_tickets()
        # Execute draw first
        self.client.post('/api/draw/execute')
        # Try re-run with wrong confirmation
        resp = self.client.post('/api/draw/execute', {
            'confirmation': 'wrong phrase',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_confirmation_on_first_draw_succeeds(self):
        """First draw with no confirmation should succeed."""
        self._create_tickets()
        resp = self.client.post('/api/draw/execute')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_correct_confirmation_on_redraw_succeeds(self):
        """Re-draw with 'rewrite draw' confirmation should succeed."""
        self._create_tickets()
        self.client.post('/api/draw/execute')
        resp = self.client.post('/api/draw/execute', {
            'confirmation': 'rewrite draw',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)


class TicketCreateInputValidationTests(TestCase):
    """Comprehensive input validation on ticket creation (Req 11.2)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_val2', password='testpass123',
        )
        resp = self.client.post('/api/auth/login', {
            'username': 'admin_val2', 'password': 'testpass123',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def test_missing_full_name_field_rejected(self):
        resp = self.client.post('/api/tickets', {'phone': '+5212345678'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_phone_field_rejected(self):
        resp = self.client.post('/api/tickets', {'full_name': 'Test'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_body_rejected(self):
        resp = self.client.post('/api/tickets', {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_phone_too_short_rejected(self):
        resp = self.client.post('/api/tickets', {
            'full_name': 'Test', 'phone': '123',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_name_at_max_length_accepted(self):
        resp = self.client.post('/api/tickets', {
            'full_name': 'A' * 200, 'phone': '+5212345678',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)


class ReassignInputValidationTests(TestCase):
    """Input validation on folio reassignment (Req 11.2)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_val3', password='testpass123',
        )
        resp = self.client.post('/api/auth/login', {
            'username': 'admin_val3', 'password': 'testpass123',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        # Create and cancel a ticket
        create_resp = self.client.post('/api/tickets', {
            'full_name': 'Original', 'phone': '+5211111111',
        })
        self.ticket_id = create_resp.data['id']
        self.client.patch(f'/api/tickets/{self.ticket_id}/cancel')

    def test_reassign_missing_name_rejected(self):
        resp = self.client.post(f'/api/tickets/{self.ticket_id}/reassign', {
            'phone': '+5299999999',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reassign_missing_phone_rejected(self):
        resp = self.client.post(f'/api/tickets/{self.ticket_id}/reassign', {
            'full_name': 'New Buyer',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reassign_empty_body_rejected(self):
        resp = self.client.post(f'/api/tickets/{self.ticket_id}/reassign', {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ── Rate Limiting Tests (Req 11.3) ────────────────────────────────────


class PublicEndpointThrottleTests(TestCase):
    """Verify rate limiting is applied to public endpoints (Req 11.3).

    Uses mock to force a low rate for testing. Each test clears the
    DRF throttle cache to avoid cross-test interference.
    """

    def setUp(self):
        self.client = APIClient()
        from django.core.cache import cache
        cache.clear()

    @patch.object(PublicEndpointThrottle, 'get_rate', return_value='3/minute')
    def test_dashboard_throttled_after_limit(self, _mock_rate):
        """Dashboard endpoint should return 429 after exceeding rate limit."""
        for _ in range(3):
            resp = self.client.get('/api/dashboard')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.get('/api/dashboard')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @patch.object(PublicEndpointThrottle, 'get_rate', return_value='3/minute')
    def test_draw_results_throttled_after_limit(self, _mock_rate):
        """Draw results endpoint should return 429 after exceeding rate limit."""
        for _ in range(3):
            resp = self.client.get('/api/draw/results')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.get('/api/draw/results')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class LoginThrottleTests(TestCase):
    """Verify rate limiting on the login endpoint (Req 11.3)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_throttle', password='testpass123',
        )
        from django.core.cache import cache
        cache.clear()

    @patch.object(LoginThrottle, 'get_rate', return_value='3/minute')
    def test_login_throttled_after_limit(self, _mock_rate):
        """Login endpoint should return 429 after exceeding rate limit."""
        for _ in range(3):
            self.client.post('/api/auth/login', {
                'username': 'admin_throttle', 'password': 'testpass123',
            })
        resp = self.client.post('/api/auth/login', {
            'username': 'admin_throttle', 'password': 'testpass123',
        })
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class ThrottleClassConfigTests(TestCase):
    """Verify throttle classes are correctly configured on views."""

    def test_public_endpoint_throttle_has_correct_scope(self):
        self.assertEqual(PublicEndpointThrottle.scope, 'public')

    def test_login_throttle_has_correct_scope(self):
        self.assertEqual(LoginThrottle.scope, 'login')

    def test_dashboard_view_has_throttle(self):
        from core.views import DashboardView
        throttle_classes = DashboardView.throttle_classes
        self.assertTrue(
            any(issubclass(t, PublicEndpointThrottle) for t in throttle_classes),
            "DashboardView should have PublicEndpointThrottle",
        )

    def test_draw_results_view_has_throttle(self):
        from core.views import DrawResultsPublicView
        throttle_classes = DrawResultsPublicView.throttle_classes
        self.assertTrue(
            any(issubclass(t, PublicEndpointThrottle) for t in throttle_classes),
            "DrawResultsPublicView should have PublicEndpointThrottle",
        )

    def test_login_view_has_throttle(self):
        from core.views import ThrottledTokenObtainPairView
        throttle_classes = ThrottledTokenObtainPairView.throttle_classes
        self.assertTrue(
            any(issubclass(t, LoginThrottle) for t in throttle_classes),
            "Login view should have LoginThrottle",
        )
