"""
Unit tests for ticket API endpoints (Task 2.6).

Covers: create, list, detail, cancel, reassign flows including error cases.
Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2
"""
import uuid

from core.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Ticket


class TicketAPITestBase(TestCase):
    """Shared setup: authenticated admin client + helper to create tickets."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_test', password='testpass123',
        )
        resp = self.client.post('/api/auth/login', {
            'username': 'admin_test',
            'password': 'testpass123',
        })
        self.token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def _create_ticket(self, full_name='Juan Pérez', phone='+5212345678'):
        return self.client.post('/api/tickets', {
            'full_name': full_name,
            'phone': phone,
        })


# ── POST /api/tickets — Ticket Creation (Req 1.1) ─────────────────────


class TicketCreateTests(TicketAPITestBase):
    """Tests for POST /api/tickets."""

    def test_create_returns_201_with_ticket_data(self):
        resp = self._create_ticket()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', resp.data)
        self.assertIn('folio', resp.data)
        self.assertEqual(resp.data['full_name'], 'Juan Pérez')
        self.assertEqual(resp.data['phone'], '+5212345678')
        self.assertEqual(resp.data['status'], 'active')

    def test_create_records_creating_admin(self):
        """Req 1.5 — created_by is recorded."""
        resp = self._create_ticket()
        self.assertEqual(resp.data['created_by_username'], 'admin_test')

    def test_create_includes_download_links(self):
        resp = self._create_ticket()
        self.assertIn('download_links', resp.data)
        self.assertIn('pdf', resp.data['download_links'])
        self.assertIn('wallet', resp.data['download_links'])

    def test_create_auto_generates_sequential_folios(self):
        """Req 1.4 — folios are auto-generated sequentially."""
        r1 = self._create_ticket(full_name='Buyer 1', phone='+5211111111')
        r2 = self._create_ticket(full_name='Buyer 2', phone='+5222222222')
        r3 = self._create_ticket(full_name='Buyer 3', phone='+5233333333')
        self.assertEqual(r1.data['folio'], 'HC-001')
        self.assertEqual(r2.data['folio'], 'HC-002')
        self.assertEqual(r3.data['folio'], 'HC-003')

    def test_create_sets_created_at_timestamp(self):
        resp = self._create_ticket()
        self.assertIsNotNone(resp.data['created_at'])

    def test_create_empty_name_returns_400(self):
        resp = self._create_ticket(full_name='')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_oversized_name_returns_400(self):
        resp = self._create_ticket(full_name='A' * 201)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_empty_phone_returns_400(self):
        resp = self._create_ticket(phone='')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_invalid_phone_returns_400(self):
        resp = self._create_ticket(phone='not-a-phone')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_requires_authentication(self):
        unauthed = APIClient()
        resp = unauthed.post('/api/tickets', {
            'full_name': 'Test', 'phone': '+5212345678',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ── GET /api/tickets/ — Ticket Listing (Req 4.1) ──────────────────────


class TicketListTests(TicketAPITestBase):
    """Tests for GET /api/tickets/."""

    def test_list_empty_returns_200_with_empty_array(self):
        resp = self.client.get('/api/tickets/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_list_returns_all_tickets(self):
        self._create_ticket(full_name='Buyer A', phone='+5211111111')
        self._create_ticket(full_name='Buyer B', phone='+5222222222')
        resp = self.client.get('/api/tickets/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)

    def test_list_includes_active_and_cancelled(self):
        """Req 4.1 — list returns both active and cancelled tickets."""
        r1 = self._create_ticket(full_name='Active', phone='+5211111111')
        r2 = self._create_ticket(full_name='ToBeCancelled', phone='+5222222222')
        # Cancel the second ticket
        self.client.patch(f"/api/tickets/{r2.data['id']}/cancel")
        resp = self.client.get('/api/tickets/')
        self.assertEqual(len(resp.data), 2)
        statuses = {t['status'] for t in resp.data}
        self.assertEqual(statuses, {'active', 'cancelled'})

    def test_list_contains_expected_fields(self):
        self._create_ticket()
        resp = self.client.get('/api/tickets/')
        ticket = resp.data[0]
        for field in ('id', 'folio', 'full_name', 'phone', 'status',
                      'created_at', 'cancelled_at'):
            self.assertIn(field, ticket)

    def test_list_requires_authentication(self):
        unauthed = APIClient()
        resp = unauthed.get('/api/tickets/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ── GET /api/tickets/:id — Ticket Detail (Req 4.2) ────────────────────


class TicketDetailTests(TicketAPITestBase):
    """Tests for GET /api/tickets/:id."""

    def test_detail_returns_full_ticket_info(self):
        """Req 4.2 — detail returns all fields including creating admin."""
        create_resp = self._create_ticket()
        ticket_id = create_resp.data['id']
        resp = self.client.get(f'/api/tickets/{ticket_id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['folio'], 'HC-001')
        self.assertEqual(resp.data['full_name'], 'Juan Pérez')
        self.assertEqual(resp.data['created_by_username'], 'admin_test')

    def test_detail_nonexistent_ticket_returns_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.get(f'/api/tickets/{fake_id}')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_requires_authentication(self):
        create_resp = self._create_ticket()
        ticket_id = create_resp.data['id']
        unauthed = APIClient()
        resp = unauthed.get(f'/api/tickets/{ticket_id}')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ── PATCH /api/tickets/:id/cancel — Ticket Cancellation (Req 2.1, 2.2) ─


class TicketCancelTests(TicketAPITestBase):
    """Tests for PATCH /api/tickets/:id/cancel."""

    def test_cancel_active_ticket_succeeds(self):
        """Req 2.1 — cancelling an active ticket sets status to cancelled."""
        create_resp = self._create_ticket()
        ticket_id = create_resp.data['id']
        resp = self.client.patch(f'/api/tickets/{ticket_id}/cancel')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'cancelled')

    def test_cancel_sets_cancelled_at_timestamp(self):
        """Req 2.1 — cancellation timestamp is recorded."""
        create_resp = self._create_ticket()
        ticket_id = create_resp.data['id']
        resp = self.client.patch(f'/api/tickets/{ticket_id}/cancel')
        self.assertIsNotNone(resp.data['cancelled_at'])

    def test_cancel_already_cancelled_returns_400(self):
        """Req 2.2 — cancelling a cancelled ticket is rejected."""
        create_resp = self._create_ticket()
        ticket_id = create_resp.data['id']
        self.client.patch(f'/api/tickets/{ticket_id}/cancel')
        resp = self.client.patch(f'/api/tickets/{ticket_id}/cancel')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already cancelled', resp.data['detail'].lower())

    def test_cancel_nonexistent_ticket_returns_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.patch(f'/api/tickets/{fake_id}/cancel')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_cancel_requires_authentication(self):
        create_resp = self._create_ticket()
        ticket_id = create_resp.data['id']
        unauthed = APIClient()
        resp = unauthed.patch(f'/api/tickets/{ticket_id}/cancel')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cancel_persists_in_database(self):
        """Verify the cancellation is actually persisted."""
        create_resp = self._create_ticket()
        ticket_id = create_resp.data['id']
        self.client.patch(f'/api/tickets/{ticket_id}/cancel')
        ticket = Ticket.objects.get(pk=ticket_id)
        self.assertEqual(ticket.status, Ticket.Status.CANCELLED)
        self.assertIsNotNone(ticket.cancelled_at)


# ── POST /api/tickets/:id/reassign — Folio Reassignment (Req 3.1, 3.2) ─


class TicketReassignTests(TicketAPITestBase):
    """Tests for POST /api/tickets/:id/reassign."""

    def _create_and_cancel(self, full_name='Original', phone='+5211111111'):
        """Helper: create a ticket and cancel it, return the ticket id and folio."""
        create_resp = self._create_ticket(full_name=full_name, phone=phone)
        ticket_id = create_resp.data['id']
        folio = create_resp.data['folio']
        self.client.patch(f'/api/tickets/{ticket_id}/cancel')
        return ticket_id, folio

    def test_reassign_cancelled_folio_creates_new_active_ticket(self):
        """Req 3.1 — reassigning a cancelled folio creates a new active ticket."""
        ticket_id, folio = self._create_and_cancel()
        resp = self.client.post(f'/api/tickets/{ticket_id}/reassign', {
            'full_name': 'New Buyer',
            'phone': '+5299999999',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['folio'], folio)
        self.assertEqual(resp.data['full_name'], 'New Buyer')
        self.assertEqual(resp.data['status'], 'active')

    def test_reassign_active_folio_returns_400(self):
        """Req 3.2 — reassigning an active folio is rejected."""
        create_resp = self._create_ticket()
        ticket_id = create_resp.data['id']
        resp = self.client.post(f'/api/tickets/{ticket_id}/reassign', {
            'full_name': 'New Buyer',
            'phone': '+5299999999',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reassign_with_invalid_name_returns_400(self):
        ticket_id, _ = self._create_and_cancel()
        resp = self.client.post(f'/api/tickets/{ticket_id}/reassign', {
            'full_name': '',
            'phone': '+5299999999',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reassign_with_invalid_phone_returns_400(self):
        ticket_id, _ = self._create_and_cancel()
        resp = self.client.post(f'/api/tickets/{ticket_id}/reassign', {
            'full_name': 'New Buyer',
            'phone': 'invalid',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reassign_nonexistent_ticket_returns_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.post(f'/api/tickets/{fake_id}/reassign', {
            'full_name': 'New Buyer',
            'phone': '+5299999999',
        })
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_reassign_requires_authentication(self):
        ticket_id, _ = self._create_and_cancel()
        unauthed = APIClient()
        resp = unauthed.post(f'/api/tickets/{ticket_id}/reassign', {
            'full_name': 'New Buyer',
            'phone': '+5299999999',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reassign_multiple_cycles(self):
        """Req 2.4 / 3.4 — folio can cycle through cancel/reassign unlimited times."""
        create_resp = self._create_ticket()
        folio = create_resp.data['folio']
        current_id = create_resp.data['id']

        for i in range(3):
            # Cancel
            self.client.patch(f'/api/tickets/{current_id}/cancel')
            # Reassign
            resp = self.client.post(f'/api/tickets/{current_id}/reassign', {
                'full_name': f'Buyer Cycle {i}',
                'phone': f'+521000000{i}',
            })
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
            self.assertEqual(resp.data['folio'], folio)
            current_id = resp.data['id']

    def test_reassign_records_new_creating_admin(self):
        """The new ticket from reassignment should record the current admin."""
        ticket_id, _ = self._create_and_cancel()
        resp = self.client.post(f'/api/tickets/{ticket_id}/reassign', {
            'full_name': 'New Buyer',
            'phone': '+5299999999',
        })
        self.assertEqual(resp.data['created_by_username'], 'admin_test')
