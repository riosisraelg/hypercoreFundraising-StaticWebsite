# Implementation Plan: Gift Draw Platform

## Overview

Build the HyperCore Gift Draw Platform as a Django (Python) backend with Django REST Framework and a React (Vite + TypeScript) frontend. The backend handles ticket management, draw execution, ticket file generation, and admin auth. The frontend provides a public read-only website and an authenticated admin panel. Implementation proceeds backend-first (models → API → ticket generation → draw engine), then frontend (public pages → admin panel), then integration and wiring.

## Tasks

- [ ] 1. Set up Django backend project structure
  - [ ] 1.1 Initialize Django project and app inside the repo (e.g., `backend/` directory with `manage.py`, `config/` settings, and a `core` app)
    - Install Django, Django REST Framework, and django-cors-headers
    - Configure settings for SQLite (MVP), REST framework defaults, CORS for local dev
    - _Requirements: 10.1, 11.1, 11.2_

  - [ ] 1.2 Define data models: Ticket, DrawResult, Admin (User)
    - Implement Ticket model with fields: id (UUID), folio, full_name, phone, status (active/cancelled), created_at, cancelled_at, created_by (FK to User)
    - Implement DrawResult model with fields: id (UUID), ticket (FK), prize_rank, prize_name, drawn_at
    - Use Django's built-in User model (or extend AbstractUser) for Admin with username, full_name, role
    - Add model-level validation: full_name max 200 chars, phone required, folio unique among active tickets
    - Run migrations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 12.2, 12.3_

  - [ ]* 1.3 Write property tests for data models
    - **Property 1: Folio uniqueness invariant** — For any sequence of ticket creation, cancellation, and reassignment, no two active tickets share the same folio
    - **Validates: Requirements 1.4, 3.3, 12.3**
    - **Property 3: Ticket state machine** — Only valid transition is active → cancelled; cancelling a cancelled ticket is rejected
    - **Validates: Requirements 2.1, 2.2, 12.1, 12.2**

  - [ ]* 1.4 Write unit tests for model validation
    - Test empty/oversized full_name rejection, empty/invalid phone rejection, folio auto-generation
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 2. Implement ticket management API endpoints
  - [ ] 2.1 Implement ticket creation endpoint (`POST /api/tickets`)
    - Validate buyer name and phone, auto-generate unique folio (e.g., "HC-001"), create active ticket, record creating admin and timestamp
    - Return ticket details with download links
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 2.2 Implement ticket listing and detail endpoints (`GET /api/tickets`, `GET /api/tickets/:id`)
    - Return all tickets (active + cancelled) with folio, name, phone, status, timestamps
    - Detail endpoint returns full ticket info including creating admin
    - _Requirements: 4.1, 4.2_

  - [ ] 2.3 Implement ticket cancellation endpoint (`PATCH /api/tickets/:id/cancel`)
    - Set status to cancelled, record cancellation timestamp
    - Reject if already cancelled
    - Allow unlimited cancel/reassign cycles per folio
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 2.4 Implement folio reassignment endpoint (`POST /api/tickets/:id/reassign`)
    - Accept new buyer name + phone, create new active ticket reusing the cancelled folio
    - Reject if folio is still active
    - Enforce folio uniqueness among active tickets
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.5 Write property tests for ticket lifecycle
    - **Property 2: Invalid input rejection** — Empty/oversized name or empty/invalid phone is rejected, no ticket created
    - **Validates: Requirements 1.2, 1.3**
    - **Property 8: Folio reassignment on cancelled tickets** — Cancelled folio can be reassigned; active folio reassignment is rejected
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.6 Write unit tests for ticket API endpoints
    - Test create, list, detail, cancel, reassign flows including error cases
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2_

- [ ] 3. Implement admin authentication
  - [ ] 3.1 Implement login endpoint (`POST /api/auth/login`) and auth middleware
    - Use Django REST Framework's token auth or JWT (djangorestframework-simplejwt)
    - Return token on valid credentials, reject invalid credentials
    - Protect all admin endpoints with authentication permission classes
    - Allow unauthenticated access to public endpoints (results, dashboard, login)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 3.2 Create initial admin users via Django management command or fixture
    - Ensure passwords are stored hashed (Django default behavior)
    - _Requirements: 10.1, 11.5_

  - [ ]* 3.3 Write property tests for authentication enforcement
    - **Property 11: Admin endpoint authentication enforcement** — Unauthenticated requests to admin endpoints return 401; public endpoints succeed without auth
    - **Validates: Requirements 10.2, 10.3, 10.4**
    - **Property 14: Password storage security** — Stored password is a hash, never plain text
    - **Validates: Requirement 11.5**

- [ ] 4. Checkpoint — Backend ticket management and auth
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement draw engine and execution API
  - [ ] 5.1 Implement Draw Engine as an isolated module
    - Fetch all active tickets, randomly select 3 distinct winners using Python's `random.sample`
    - Assign prize ranks 1st, 2nd, 3rd
    - Return error if fewer than 3 active tickets (or zero active tickets)
    - _Requirements: 6.1, 6.2, 6.6, 6.7_

  - [ ] 5.2 Implement draw execution endpoint (`POST /api/draw/execute`)
    - Call draw engine, store DrawResult records with ticket FK, prize rank, prize name, timestamp
    - If draw already executed: require "rewrite draw" confirmation phrase in request body
    - On confirmed re-run: delete previous results, execute new draw
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [ ] 5.3 Implement public draw results endpoint (`GET /api/draw/results`)
    - Return winning folio numbers and prize ranks only (no names, no phone numbers)
    - Return empty result if no draw has been executed
    - _Requirements: 7.1, 7.2, 11.4_

  - [ ] 5.4 Implement dashboard endpoint (`GET /api/dashboard`)
    - Return count of active tickets and total raised (count × $200 MXN)
    - _Requirements: 8.1_

  - [ ]* 5.5 Write property tests for draw engine
    - **Property 4: Cancelled tickets excluded from draw** — Only active tickets appear in results
    - **Validates: Requirements 2.3, 6.1**
    - **Property 5: Draw produces exactly 3 distinct winners** — Exactly 3 results with ranks 1, 2, 3, each a distinct ticket
    - **Validates: Requirements 6.1, 6.6**
    - **Property 6: Draw fairness** — Over many executions, each active ticket selected with approximately equal frequency
    - **Validates: Requirement 6.2**

  - [ ]* 5.6 Write property tests for public endpoints
    - **Property 9: No PII in public results** — Public results contain only folio numbers and prize ranks, no names or phones
    - **Validates: Requirements 7.1, 11.4**
    - **Property 10: Dashboard computation** — Dashboard returns active ticket count and count × $200 MXN
    - **Validates: Requirement 8.1**
    - **Property 7: Draw immutability** — After draw, results don't change on subsequent GET requests; re-execution requires confirmation
    - **Validates: Requirements 6.3, 6.4**

- [ ] 6. Implement ticket file generation
  - [ ] 6.1 Implement PDF ticket generator (`GET /api/tickets/:id/download/pdf`)
    - Use reportlab or weasyprint to generate a PDF containing folio, buyer name, draw title, draw date, HyperCore branding
    - Return PDF as downloadable file response
    - _Requirements: 5.1_

  - [ ] 6.2 Implement Apple Wallet pass generator (`GET /api/tickets/:id/download/wallet`)
    - Generate .pkpass file containing folio, buyer name, draw title, draw date, HyperCore branding
    - _Requirements: 5.2_

  - [ ] 6.3 Implement Google Wallet pass generator (or stub for MVP)
    - Generate Google Wallet pass link/file containing folio, buyer name, draw title, draw date, HyperCore branding
    - _Requirements: 5.3_

  - [ ]* 6.4 Write property tests for ticket generation
    - **Property 12: Ticket generation content completeness** — Generated output contains folio, buyer name, draw title, draw date, and HyperCore branding
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 7. Add input validation and rate limiting
  - Implement input validation on all API endpoints (Django serializer validation)
  - Add rate limiting on public endpoints using django-ratelimit or DRF throttling
  - _Requirements: 11.2, 11.3_

- [ ] 8. Checkpoint — Full backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Set up React frontend routing and layout
  - [ ] 9.1 Install React Router and set up route structure
    - Public routes: `/` (Home), `/about`, `/results`, `/privacy`
    - Admin routes: `/admin/login`, `/admin/dashboard`, `/admin/tickets`, `/admin/tickets/new`, `/admin/draw`
    - Create layout components for public site and admin panel
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 9.2 Set up API client utility
    - Create a fetch/axios wrapper for calling the Django backend
    - Handle auth token storage and injection for admin requests
    - _Requirements: 10.1_

- [ ] 10. Implement public website pages
  - [ ] 10.1 Implement Home page (`/`)
    - Hero section with raffle info, prizes section (1st: $5,000 MXN, 2nd: JBL Flip 7, 3rd: Botella Maestro Dobel)
    - Fundraising dashboard fetching from `GET /api/dashboard` (progress bar toward $26,000 MXN goal, participant count)
    - How to participate section, WhatsApp contact link (wa.me), social media links
    - Mobile-responsive layout
    - _Requirements: 8.1, 8.2, 9.1_

  - [ ] 10.2 Implement About Us page (`/about`)
    - Team HyperCore intro, KIA challenge description
    - Team member cards with photo/avatar, name, role, LinkedIn link
    - Innovation MeetUp certificates reference
    - _Requirements: 9.2_

  - [ ] 10.3 Implement Results page (`/results`)
    - Fetch from `GET /api/draw/results`
    - Before draw: message "El sorteo aún no se ha realizado. ¡Mantente atento!"
    - After draw: display 3 winning folios with prize emojis and descriptions
    - No buyer names shown — folio numbers and prizes only
    - _Requirements: 7.1, 7.2, 9.3_

  - [ ] 10.4 Implement Privacy Notice page (`/privacy`)
    - Static content: data collected (name + phone only), used for raffle only, deleted after event, not shared/sold
    - _Requirements: 9.4_

- [ ] 11. Implement admin panel
  - [ ] 11.1 Implement admin login page (`/admin/login`)
    - Username + password form, call `POST /api/auth/login`, store token, redirect to dashboard
    - _Requirements: 10.1_

  - [ ] 11.2 Implement admin dashboard (`/admin/dashboard`)
    - Fundraising stats (tickets sold, total raised, goal progress)
    - Quick action buttons: "Register Ticket", "Execute Draw"
    - Recent tickets list
    - _Requirements: 8.1_

  - [ ] 11.3 Implement ticket registration page (`/admin/tickets/new`)
    - Form with full name and phone number fields
    - On success: display created ticket with folio and download options (PDF, Apple Wallet, Google Wallet)
    - _Requirements: 1.1_

  - [ ] 11.4 Implement ticket list page (`/admin/tickets`)
    - Table with folio, buyer name, phone, status, date
    - Filter by status (all, active, cancelled)
    - Actions per ticket: cancel, download PDF, download wallet pass
    - Reassign button for cancelled tickets (inline form or modal for new buyer name + phone)
    - _Requirements: 2.1, 3.1, 4.1, 4.2_

  - [ ] 11.5 Implement draw execution page (`/admin/draw`)
    - "Ejecutar Sorteo" button calling `POST /api/draw/execute`
    - If draw already ran: show current results with buyer names visible, "Re-run Draw" option requiring "rewrite draw" confirmation input
    - After execution: display 3 winners with folio, buyer name, phone, prize rank, prize name
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [ ]* 11.6 Write unit tests for admin panel components
    - Test login flow, ticket registration form validation, draw execution confirmation
    - _Requirements: 10.1, 1.1, 6.4_

- [ ] 12. Checkpoint — Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Integration and wiring
  - [ ] 13.1 Configure CORS and API proxy for local development
    - Ensure Vite dev server proxies API requests to Django backend
    - Configure Django CORS settings for production domain
    - _Requirements: 11.1_

  - [ ] 13.2 Add protected route wrapper for admin pages
    - Redirect unauthenticated users to login page
    - Inject auth token in all admin API calls
    - _Requirements: 10.2, 10.3_

  - [ ]* 13.3 Write integration tests for critical flows
    - Test full flow: register ticket → cancel → reassign → execute draw → view public results
    - Test auth flow: login → access admin endpoints → unauthorized access blocked
    - **Property 13: Ticket list completeness** — All created tickets (active and cancelled) returned by list endpoint
    - **Validates: Requirements 4.1, 4.2**
    - _Requirements: 1.1, 2.1, 3.1, 6.1, 7.1, 10.2_

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend is built first so the frontend can integrate against real API endpoints
- Apple Wallet (.pkpass) and Google Wallet generation may require signing certificates and API keys — task 6.2 and 6.3 can be stubbed initially if credentials are not yet available
