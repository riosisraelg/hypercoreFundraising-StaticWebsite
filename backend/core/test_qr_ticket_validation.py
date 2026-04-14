import io
import uuid
import qrcode
from unittest.mock import patch, MagicMock
from django.test import TestCase
from PIL import Image

from hypothesis import given, settings
from hypothesis.extra.django import TestCase as HypothesisTestCase
import hypothesis.strategies as st

from rest_framework import status
from rest_framework.test import APIClient
from core.models import User

from core.models import Ticket
from core.qr_utils import generate_qr_image
from core.ticket_generator import generate_ticket_pdf

# Strategies
phone_strategy = st.from_regex(r"\+?\d{7,15}", fullmatch=True)
name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "Zs")),
    min_size=1,
    max_size=100,
).filter(lambda s: s.strip() != "")



class TestTicketValidationView(TestCase):
    """
    Unit tests for TicketValidateView
    """
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="valid_admin", password="password")
        self.active_ticket = Ticket.objects.create(
            folio="HC-V001", full_name="Active Buyer", phone="123456789", status=Ticket.Status.ACTIVE, created_by=self.user
        )
        self.cancelled_ticket = Ticket.objects.create(
            folio="HC-V002", full_name="Cancelled Buyer", phone="987654321", status=Ticket.Status.CANCELLED, created_by=self.user
        )

    def test_active_ticket_returns_200(self):
        url = f"/api/tickets/{self.active_ticket.id}/validate"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['folio'], "HC-V001")
        self.assertEqual(response.data['status'], "active")
        self.assertEqual(response.data['full_name'], "Active Buyer")
        self.assertNotIn('phone', response.data)
        self.assertNotIn('created_by', response.data)
        self.assertNotIn('created_at', response.data)
        self.assertNotIn('cancelled_at', response.data)

    def test_cancelled_ticket_returns_200_with_cancelled_status(self):
        url = f"/api/tickets/{self.cancelled_ticket.id}/validate"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], "cancelled")

    def test_nonexistent_ticket_returns_404(self):
        random_uuid = uuid.uuid4()
        url = f"/api/tickets/{random_uuid}/validate"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_uuid_returns_404(self):
        url = "/api/tickets/not-a-uuid/validate"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_auth_not_required(self):
        client_no_auth = APIClient()
        url = f"/api/tickets/{self.active_ticket.id}/validate"
        response = client_no_auth.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

class TestValidationProperties(HypothesisTestCase):
    """
    Property tests for TicketValidateView
    """
    def setUp(self):
        self.client = APIClient()

    def _get_authed_client(self):
        user = User.objects.create_user(username=f"admin_{uuid.uuid4()}", password="password")
        client = APIClient()
        client.force_authenticate(user=user)
        return client, user

    @given(full_name=name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_response_fields_property(self, full_name, phone):
        """Property 2: Validation Response Contains Exactly the Required Fields"""
        client, user = self._get_authed_client()
        resp = client.post("/api/tickets", {"full_name": full_name, "phone": phone})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        ticket_id = resp.data["id"]

        val_resp = self.client.get(f"/api/tickets/{ticket_id}/validate")
        self.assertEqual(val_resp.status_code, status.HTTP_200_OK)
        
        expected_keys = {"id", "folio", "status", "full_name"}
        self.assertEqual(set(val_resp.data.keys()), expected_keys)

    @given(random_uuid=st.uuids())
    @settings(max_examples=10, deadline=None)
    def test_nonexistent_uuid_returns_404_property(self, random_uuid):
        """Property 3: Non-Existent UUID Returns 404"""
        if Ticket.objects.filter(id=random_uuid).exists():
            return
        
        val_resp = self.client.get(f"/api/tickets/{random_uuid}/validate")
        self.assertEqual(val_resp.status_code, status.HTTP_404_NOT_FOUND)

class TestPDFGenerationQRProperty(HypothesisTestCase):
    def _create_ticket(self):
        user = User.objects.create_user(username=f"admin_pdf_{uuid.uuid4()}", password="password")
        return Ticket.objects.create(
            folio="HC-PDF01", full_name="PDF Buyer", phone="123456", status=Ticket.Status.ACTIVE, created_by=user
        )

    @patch('core.qr_utils.generate_qr_image')
    def test_pdf_embeds_qr_property(self, mock_generate_qr_image):
        """Property 6: PDF Generation Embeds QR"""
        mock_generate_qr_image.return_value = generate_qr_image(uuid.uuid4(), "http://test")
        
        ticket = self._create_ticket()
        base_url = "http://test-base-url.dev"
        pdf_bytes = generate_ticket_pdf(ticket, base_url=base_url)
        
        self.assertTrue(len(pdf_bytes) > 0)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        
        mock_generate_qr_image.assert_called_with(ticket.id, base_url)

class TestCancellationReassignmentIsolation(TestCase):
    """
    Unit tests for cancellation/reassignment isolation
    """
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username=f"iso_admin_{uuid.uuid4()}", password="password")
        self.client.force_authenticate(user=self.user)

    def test_cancellation_reassignment_isolation(self):
        # Create ticket UUID-A
        create_resp = self.client.post("/api/tickets", {"full_name": "Original Buyer", "phone": "1234567"})
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED, create_resp.data)
        ticket_a_id = create_resp.data["id"]
        folio = create_resp.data["folio"]

        # Cancel UUID-A
        self.client.patch(f"/api/tickets/{ticket_a_id}/cancel")
        
        # Validate UUID-A returns cancelled
        val_a = self.client.get(f"/api/tickets/{ticket_a_id}/validate")
        self.assertEqual(val_a.data["status"], "cancelled")

        # Reassign folio
        reassign_resp = self.client.post(f"/api/tickets/{ticket_a_id}/reassign", {"full_name": "New Buyer", "phone": "6543210"})
        ticket_b_id = reassign_resp.data["id"]

        self.assertNotEqual(ticket_a_id, ticket_b_id)
        self.assertEqual(reassign_resp.data["folio"], folio)

        # Validate UUID-A still cancelled, UUID-B active
        val_a_after = self.client.get(f"/api/tickets/{ticket_a_id}/validate")
        self.assertEqual(val_a_after.data["status"], "cancelled")

        val_b = self.client.get(f"/api/tickets/{ticket_b_id}/validate")
        self.assertEqual(val_b.data["status"], "active")

class TestCancellationReassignmentProperties(HypothesisTestCase):
    def _get_authed_client(self):
        user = User.objects.create_user(username=f"admin_{uuid.uuid4()}", password="password")
        client = APIClient()
        client.force_authenticate(user=user)
        return client, user

    @given(full_name=name_strategy, phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_cancelled_ticket_permanence(self, full_name, phone):
        """Property 4: Cancelled Ticket Permanence"""
        client, user = self._get_authed_client()
        resp = client.post("/api/tickets", {"full_name": full_name, "phone": phone})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        ticket_id = resp.data["id"]

        client.patch(f"/api/tickets/{ticket_id}/cancel")
        
        val_resp = self.client.get(f"/api/tickets/{ticket_id}/validate")
        self.assertEqual(val_resp.data["status"], "cancelled")

        # Reassign
        client.post(f"/api/tickets/{ticket_id}/reassign", {"full_name": "Another", "phone": "0000000"})
        
        val_resp_after = self.client.get(f"/api/tickets/{ticket_id}/validate")
        self.assertEqual(val_resp_after.data["status"], "cancelled")

    @given(orig_name=name_strategy, orig_phone=phone_strategy, new_name=name_strategy, new_phone=phone_strategy)
    @settings(max_examples=10, deadline=None)
    def test_reassignment_uuid_uniqueness(self, orig_name, orig_phone, new_name, new_phone):
        """Property 5: Reassignment UUID Uniqueness"""
        client, user = self._get_authed_client()
        resp = client.post("/api/tickets", {"full_name": orig_name, "phone": orig_phone})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        orig_ticket_id = resp.data["id"]
        orig_folio = resp.data["folio"]

        client.patch(f"/api/tickets/{orig_ticket_id}/cancel")
        
        reassign_resp = client.post(f"/api/tickets/{orig_ticket_id}/reassign", {"full_name": new_name, "phone": new_phone})
        self.assertEqual(reassign_resp.status_code, status.HTTP_201_CREATED)
        new_ticket_id = reassign_resp.data["id"]
        new_folio = reassign_resp.data["folio"]

        self.assertNotEqual(orig_ticket_id, new_ticket_id)
        self.assertEqual(orig_folio, new_folio)
