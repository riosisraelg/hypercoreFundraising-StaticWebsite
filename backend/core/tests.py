from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class AuthLoginTests(TestCase):
    """Tests for POST /api/auth/login — JWT token obtain."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin1', password='testpass123'
        )

    def test_login_valid_credentials_returns_tokens(self):
        response = self.client.post('/api/auth/login', {
            'username': 'admin1',
            'password': 'testpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_password_rejected(self):
        response = self.client.post('/api/auth/login', {
            'username': 'admin1',
            'password': 'wrongpass',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user_rejected(self):
        response = self.client.post('/api/auth/login', {
            'username': 'nobody',
            'password': 'testpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields_rejected(self):
        response = self.client.post('/api/auth/login', {})
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        ])

    def test_login_endpoint_allows_unauthenticated(self):
        """Login endpoint must be accessible without auth."""
        response = self.client.post('/api/auth/login', {
            'username': 'admin1',
            'password': 'testpass123',
        })
        # Should not get 401/403 for missing auth — the endpoint itself is public
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AuthTokenRefreshTests(TestCase):
    """Tests for POST /api/auth/refresh — JWT token refresh."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin1', password='testpass123'
        )

    def test_refresh_with_valid_token(self):
        login_resp = self.client.post('/api/auth/login', {
            'username': 'admin1',
            'password': 'testpass123',
        })
        refresh_token = login_resp.data['refresh']
        response = self.client.post('/api/auth/refresh', {
            'refresh': refresh_token,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_refresh_with_invalid_token_rejected(self):
        response = self.client.post('/api/auth/refresh', {
            'refresh': 'invalid-token',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AuthMiddlewareTests(TestCase):
    """Tests that admin endpoints require auth and login is public."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin1', password='testpass123'
        )

    def _get_token(self):
        resp = self.client.post('/api/auth/login', {
            'username': 'admin1',
            'password': 'testpass123',
        })
        return resp.data['access']

    def test_ticket_list_requires_auth(self):
        response = self.client.get('/api/tickets/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_ticket_create_requires_auth(self):
        response = self.client.post('/api/tickets', {
            'full_name': 'Test User',
            'phone': '+521234567890',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_ticket_list_with_valid_token_succeeds(self):
        token = self._get_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/tickets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ticket_create_with_valid_token_succeeds(self):
        token = self._get_token()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/tickets', {
            'full_name': 'Test User',
            'phone': '+521234567890',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class CreateInitialAdminsCommandTests(TestCase):
    """Tests for the create_initial_admins management command."""

    def _call_command(self, *args, **kwargs):
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('create_initial_admins', *args, stdout=out, **kwargs)
        return out.getvalue()

    def test_creates_all_five_admin_users(self):
        output = self._call_command()
        self.assertEqual(User.objects.count(), 5)
        self.assertIn('CREATED', output)

    def test_all_users_are_staff(self):
        self._call_command()
        for user in User.objects.all():
            self.assertTrue(user.is_staff)

    def test_passwords_are_hashed_not_plaintext(self):
        """Requirement 11.5 — passwords stored as hashes, never plain text."""
        self._call_command()
        for user in User.objects.all():
            # Django hashed passwords start with the algorithm identifier
            self.assertTrue(user.password.startswith('pbkdf2_sha256$'))
            self.assertNotEqual(user.password, 'HyperCore2026!')

    def test_custom_password_argument(self):
        self._call_command('--password', 'CustomPass99!')
        user = User.objects.first()
        self.assertTrue(user.check_password('CustomPass99!'))

    def test_idempotent_skips_existing_users(self):
        self._call_command()
        self.assertEqual(User.objects.count(), 5)
        # Run again — should skip all
        output = self._call_command()
        self.assertEqual(User.objects.count(), 5)
        self.assertIn('SKIPPED', output)

    def test_created_users_can_authenticate(self):
        """Requirement 10.1 — admin can log in with created credentials."""
        self._call_command()
        user = User.objects.get(username='admin_dev1')
        self.assertTrue(user.check_password('HyperCore2026!'))


class TicketModelValidationTests(TestCase):
    """Unit tests for Ticket model validation — name, phone, folio.

    Tests exercise validation through the API (POST /api/tickets) since
    the serializer is the primary validation layer in production.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_val', password='testpass123',
        )
        # Authenticate all requests
        resp = self.client.post('/api/auth/login', {
            'username': 'admin_val',
            'password': 'testpass123',
        })
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}",
        )

    def _create_ticket(self, full_name='Valid Name', phone='+5212345678'):
        return self.client.post('/api/tickets', {
            'full_name': full_name,
            'phone': phone,
        })

    # ── Requirement 1.2: full_name validation ──────────────────────

    def test_empty_full_name_rejected(self):
        """Empty full_name must be rejected (Req 1.2)."""
        resp = self._create_ticket(full_name='')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_whitespace_only_full_name_rejected(self):
        """Whitespace-only full_name must be rejected (Req 1.2)."""
        resp = self._create_ticket(full_name='   ')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_full_name_rejected(self):
        """full_name > 200 chars must be rejected (Req 1.2)."""
        resp = self._create_ticket(full_name='A' * 201)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_full_name_accepted(self):
        """A normal name should pass validation."""
        resp = self._create_ticket(full_name='María López')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    # ── Requirement 1.3: phone validation ──────────────────────────

    def test_empty_phone_rejected(self):
        """Empty phone must be rejected (Req 1.3)."""
        resp = self._create_ticket(phone='')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_whitespace_only_phone_rejected(self):
        """Whitespace-only phone must be rejected (Req 1.3)."""
        resp = self._create_ticket(phone='   ')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_phone_with_letters_rejected(self):
        """Phone containing letters must be rejected (Req 1.3)."""
        resp = self._create_ticket(phone='abc1234567')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_phone_accepted(self):
        """Valid phone numbers should pass validation."""
        resp = self._create_ticket(phone='+52 1234 5678')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    # ── Requirement 1.4: folio auto-generation ─────────────────────

    def test_first_ticket_gets_hc_001(self):
        """First ticket should receive folio HC-001 (Req 1.4)."""
        resp = self._create_ticket()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['folio'], 'HC-001')

    def test_second_ticket_gets_hc_002(self):
        """Second ticket should receive folio HC-002 (Req 1.4)."""
        self._create_ticket(full_name='First Buyer', phone='+5211111111')
        resp = self._create_ticket(full_name='Second Buyer', phone='+5222222222')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['folio'], 'HC-002')

    def test_folio_sequential_after_gap(self):
        """Next folio is based on the max existing number, not count (Req 1.4).

        If HC-001 and HC-003 exist, the next folio should be HC-004.
        """
        from core.models import Ticket
        # Manually create tickets with a gap in folio numbers
        Ticket.objects.create(
            folio='HC-001', full_name='A', phone='+5211111111',
            status=Ticket.Status.ACTIVE, created_by=self.user,
        )
        Ticket.objects.create(
            folio='HC-003', full_name='B', phone='+5222222222',
            status=Ticket.Status.ACTIVE, created_by=self.user,
        )
        resp = self._create_ticket(full_name='C', phone='+5233333333')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['folio'], 'HC-004')

    def test_folio_unique_among_active_tickets(self):
        """Two active tickets cannot share the same folio (Req 1.4)."""
        from django.db import IntegrityError
        from core.models import Ticket
        Ticket.objects.create(
            folio='HC-100', full_name='A', phone='+5211111111',
            status=Ticket.Status.ACTIVE, created_by=self.user,
        )
        with self.assertRaises(IntegrityError):
            Ticket.objects.create(
                folio='HC-100', full_name='B', phone='+5222222222',
                status=Ticket.Status.ACTIVE, created_by=self.user,
            )
