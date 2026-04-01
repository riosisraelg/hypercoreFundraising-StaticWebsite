# Implementation Plan: QR Ticket Validation

## Overview

Implement QR code generation and public ticket validation for the HyperCore Gift Draw Platform. The work is split into four incremental steps: dependencies/config, the QR utility, the validation endpoint, and PDF embedding — each building on the previous.

## Tasks

- [ ] 1. Add `qrcode[pil]>=7.4` dependency and `SITE_BASE_URL` setting
  - Add `qrcode[pil]>=7.4` to `backend/requirements.txt`
  - Add `SITE_BASE_URL = os.getenv('SITE_BASE_URL', 'http://localhost:8000')` to `backend/config/settings.py`
  - _Requirements: 5.1, 5.2_

- [ ] 2. Implement `generate_qr_image()` in `backend/core/qr_utils.py`
  - [ ] 2.1 Create `backend/core/qr_utils.py` with `generate_qr_image(ticket_id, base_url) -> bytes`
    - Build validation URL as `{base_url}/api/tickets/{ticket_id}/validate`
    - Use `qrcode.QRCode` with `ERROR_CORRECT_M`, `box_size=10`, `border=2`, `version=None`
    - Render to PIL image, serialize to PNG bytes via `io.BytesIO`, return bytes
    - Function must be pure (no side effects, no Django imports)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.4_

  - [ ]* 2.2 Write property test for `generate_qr_image()` — Property 1: QR URL Round-Trip
    - **Property 1: QR URL Round-Trip**
    - For any valid UUID and non-empty base URL, decoding the PNG returned by `generate_qr_image()` must yield exactly `{base_url}/api/tickets/{ticket_id}/validate`
    - Use `hypothesis` with `st.uuids()` and `st.text(min_size=1)` strategies; decode QR with `pyzbar` or `qrcode` reader
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ] 3. Implement `TicketValidationSerializer` and `TicketValidateView`
  - [ ] 3.1 Add `TicketValidationSerializer` to `backend/core/serializers.py`
    - `ModelSerializer` on `Ticket` with `fields = ['id', 'folio', 'status', 'full_name']`
    - Must NOT include `phone`, `created_by`, `created_at`, or `cancelled_at`
    - _Requirements: 2.1, 2.4_

  - [ ] 3.2 Add `TicketValidateView` to `backend/core/views.py`
    - `APIView` with `permission_classes = [AllowAny]` and `throttle_classes = [PublicEndpointThrottle]`
    - `GET` handler: look up ticket by UUID PK; return 200 + serialized data or 404 `{"detail": "Ticket not found."}`
    - No write operations of any kind
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.7_

  - [ ] 3.3 Register URL route in `backend/core/urls.py`
    - Add `path('tickets/<uuid:ticket_id>/validate', views.TicketValidateView.as_view(), name='ticket-validate')`
    - The `<uuid:...>` converter enforces UUID format at the router level (no view logic needed for 2.6)
    - _Requirements: 2.6, 5.3_

  - [ ]* 3.4 Write unit tests for `TicketValidateView`
    - Test 200 response for existing active ticket — verify fields `id`, `folio`, `status`, `full_name` present and `phone`/`created_by`/`created_at`/`cancelled_at` absent
    - Test 200 response for existing cancelled ticket — verify `"status": "cancelled"`
    - Test 404 for non-existent UUID
    - Test 404 for non-UUID path segment (router rejects before view)
    - Test no auth token required (unauthenticated client gets 200)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [ ]* 3.5 Write property test for `TicketValidateView` — Property 2: Response Fields
    - **Property 2: Validation Response Contains Exactly the Required Fields**
    - For any ticket in the DB, GET `/api/tickets/{uuid}/validate` returns 200 with exactly `{id, folio, status, full_name}` and never `phone`, `created_by`, `created_at`, or `cancelled_at`
    - **Validates: Requirements 2.1, 2.4**

  - [ ]* 3.6 Write property test for `TicketValidateView` — Property 3: Non-Existent UUID Returns 404
    - **Property 3: Non-Existent UUID Returns 404**
    - For any randomly generated UUID not present in the DB, GET `/api/tickets/{uuid}/validate` returns HTTP 404
    - Use `hypothesis` with `st.uuids()` strategy; ensure generated UUIDs are not inserted into the DB
    - **Validates: Requirements 2.2**

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Embed QR code in `generate_ticket_pdf()`
  - [ ] 5.1 Modify `generate_ticket_pdf()` in `backend/core/ticket_generator.py`
    - Accept optional `base_url: str = ""` parameter
    - If `base_url` is empty, fall back to `settings.SITE_BASE_URL`
    - Call `generate_qr_image(ticket.id, base_url)` to get PNG bytes
    - Wrap bytes in `io.BytesIO`, pass to `reportlab.lib.utils.ImageReader`
    - Draw QR at `qr_size = 22 * mm`, positioned at lower-right (`qr_x = width - margin - qr_size`, `qr_y = 14 * mm`)
    - Draw label `"ESCANEA PARA VALIDAR"` in `Helvetica` 5pt at `qr_y - 3 * mm`
    - Preserve all existing ticket elements (header, folio, participant card, date chip, footer)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.2 Write property test for `generate_ticket_pdf()` — Property 6: PDF Generation Embeds QR
    - **Property 6: PDF Generation Embeds QR**
    - For any `Ticket` instance, `generate_ticket_pdf()` returns non-empty bytes and internally calls `generate_qr_image()` with the ticket's UUID and the resolved base URL
    - Mock `generate_qr_image` to verify it is called with correct arguments; assert returned bytes are non-empty and start with `%PDF`
    - **Validates: Requirements 3.1, 3.2, 3.6**

- [ ] 6. Verify cancellation and reassignment isolation
  - [ ] 6.1 Write unit tests for cancellation/reassignment isolation
    - Test: cancel ticket UUID-A → GET `/validate` for UUID-A returns `"status": "cancelled"`
    - Test: reassign folio → new ticket UUID-B has a different UUID than UUID-A but same folio
    - Test: after reassignment, UUID-A still returns `"status": "cancelled"` and UUID-B returns `"status": "active"`
    - These tests exercise existing model/view behavior; no new code required — confirm it holds
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.2 Write property test — Property 4: Cancelled Ticket Permanence
    - **Property 4: Cancelled Ticket Permanence**
    - For any ticket whose status is `cancelled`, the validation endpoint always returns `"status": "cancelled"` for that UUID regardless of folio reassignment
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 6.3 Write property test — Property 5: Reassignment UUID Uniqueness
    - **Property 5: Reassignment UUID Uniqueness**
    - For any cancelled ticket that is reassigned, the new ticket's UUID differs from the original UUID while sharing the same folio value
    - Use `hypothesis` to generate ticket data; assert `new_ticket.id != original_ticket.id` and `new_ticket.folio == original_ticket.folio`
    - **Validates: Requirements 4.2**

- [ ] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use Hypothesis (already configured in `.hypothesis/`)
- The `<uuid:ticket_id>` URL converter handles requirement 2.6 at the router level — no view code needed
- `SITE_BASE_URL` already exists in `settings.py` with value `http://localhost:5173`; task 1 updates the default to `http://localhost:8000` to match the Django dev server
