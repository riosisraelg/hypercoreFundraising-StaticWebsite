"""
Unit tests for ticket download endpoints (Task 6).

Covers: PDF download, Apple Wallet stub, Google Wallet stub.
Requirements: 5.1, 5.2, 5.3
"""
import uuid

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Ticket
from core.ticket_generator import generate_ticket_pdf


class TicketDownloadTestBase(TestCase):
    """Shared setup: authenticated admin client + a created ticket."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_dl', password='testpass123',
        )
        resp = self.client.post('/api/auth/login', {
            'username': 'admin_dl',
            'password': 'testpass123',
        })
        self.token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        # Create a ticket to download
        create_resp = self.client.post('/api/tickets', {
            'full_name': 'Maria Lopez',
            'phone': '+5219876543',
        })
        self.ticket_id = create_resp.data['id']
        self.ticket_folio = create_resp.data['folio']


# ── PDF Download (Req 5.1) ─────────────────────────────────────────────


class TicketDownloadPDFTests(TicketDownloadTestBase):
    """Tests for GET /api/tickets/:id/download/pdf."""

    def test_pdf_download_returns_200_with_pdf_content_type(self):
        resp = self.client.get(f'/api/tickets/{self.ticket_id}/download/pdf')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp['Content-Type'], 'application/pdf')

    def test_pdf_download_has_content_disposition(self):
        resp = self.client.get(f'/api/tickets/{self.ticket_id}/download/pdf')
        self.assertIn('attachment', resp['Content-Disposition'])
        self.assertIn(self.ticket_folio, resp['Content-Disposition'])

    def test_pdf_download_returns_nonempty_body(self):
        resp = self.client.get(f'/api/tickets/{self.ticket_id}/download/pdf')
        self.assertGreater(len(resp.content), 0)

    def test_pdf_starts_with_pdf_header(self):
        """Valid PDFs start with %PDF."""
        resp = self.client.get(f'/api/tickets/{self.ticket_id}/download/pdf')
        self.assertTrue(resp.content.startswith(b'%PDF'))

    def test_pdf_nonexistent_ticket_returns_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.get(f'/api/tickets/{fake_id}/download/pdf')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_pdf_requires_authentication(self):
        unauthed = APIClient()
        resp = unauthed.get(f'/api/tickets/{self.ticket_id}/download/pdf')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ── PDF Generator Unit Test ────────────────────────────────────────────


class TicketPDFGeneratorTests(TestCase):
    """Direct tests for the generate_ticket_pdf function."""

    def setUp(self):
        self.user = User.objects.create_user(username='gen_admin', password='pass')
        self.ticket = Ticket.objects.create(
            folio='HC-TEST',
            full_name='Test Buyer',
            phone='+5211111111',
            status=Ticket.Status.ACTIVE,
            created_by=self.user,
        )

    def test_returns_bytes(self):
        result = generate_ticket_pdf(self.ticket)
        self.assertIsInstance(result, bytes)

    def test_returns_valid_pdf(self):
        result = generate_ticket_pdf(self.ticket)
        self.assertTrue(result.startswith(b'%PDF'))

    def test_pdf_has_reasonable_size(self):
        """A ticket PDF should be at least a few hundred bytes."""
        result = generate_ticket_pdf(self.ticket)
        self.assertGreater(len(result), 500)

    def test_long_name_does_not_crash(self):
        """Names longer than 35 chars should be truncated gracefully."""
        self.ticket.full_name = 'A' * 50
        result = generate_ticket_pdf(self.ticket)
        self.assertTrue(result.startswith(b'%PDF'))

    def test_pdf_contains_helvetica_font(self):
        """The PDF should use Helvetica fonts (present in raw PDF structure)."""
        result = generate_ticket_pdf(self.ticket)
        self.assertIn(b'Helvetica', result)


# ── Apple Wallet Stub (Req 5.2) ───────────────────────────────────────


class TicketDownloadWalletTests(TicketDownloadTestBase):
    """Tests for GET /api/tickets/:id/download/wallet (stub)."""

    def test_wallet_returns_501_not_implemented(self):
        resp = self.client.get(f'/api/tickets/{self.ticket_id}/download/wallet')
        self.assertEqual(resp.status_code, status.HTTP_501_NOT_IMPLEMENTED)

    def test_wallet_returns_helpful_message(self):
        resp = self.client.get(f'/api/tickets/{self.ticket_id}/download/wallet')
        self.assertIn('not yet configured', resp.data['detail'])
        self.assertEqual(resp.data['folio'], self.ticket_folio)

    def test_wallet_nonexistent_ticket_returns_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.get(f'/api/tickets/{fake_id}/download/wallet')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_wallet_requires_authentication(self):
        unauthed = APIClient()
        resp = unauthed.get(f'/api/tickets/{self.ticket_id}/download/wallet')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ── Google Wallet Stub (Req 5.3) ──────────────────────────────────────


class TicketDownloadGoogleWalletTests(TicketDownloadTestBase):
    """Tests for GET /api/tickets/:id/download/google-wallet (stub)."""

    def test_google_wallet_returns_501_not_implemented(self):
        resp = self.client.get(
            f'/api/tickets/{self.ticket_id}/download/google-wallet',
        )
        self.assertEqual(resp.status_code, status.HTTP_501_NOT_IMPLEMENTED)

    def test_google_wallet_returns_helpful_message(self):
        resp = self.client.get(
            f'/api/tickets/{self.ticket_id}/download/google-wallet',
        )
        self.assertIn('not yet configured', resp.data['detail'])
        self.assertEqual(resp.data['folio'], self.ticket_folio)

    def test_google_wallet_nonexistent_ticket_returns_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.get(f'/api/tickets/{fake_id}/download/google-wallet')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_google_wallet_requires_authentication(self):
        unauthed = APIClient()
        resp = unauthed.get(
            f'/api/tickets/{self.ticket_id}/download/google-wallet',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
