# Design Document: Gift Draw Platform (Simplified v2)

## Overview

The HyperCore Gift Draw Platform is a single-use web application for a fundraising raffle. Team HyperCore (Universidad Tecmilenio) needs to fund their trip to the KIA Mexico Innovation MeetUp 2026 finals in Cancún. The platform lets the team register ticket buyers, run a randomized draw, and publish results — all through a simple public website and an admin panel.

Key simplifications from v1:
- No payment processing in the system (all offline — cash/transfers)
- No email notifications (winners contacted personally via WhatsApp)
- No public self-registration (team registers buyers via admin panel)
- No user accounts or login for buyers
- Registration data: name + phone number only

## Architecture

```mermaid
flowchart TD
    subgraph Client
        A[Public Website - React]
        B[Admin Panel - React]
    end

    subgraph Backend
        C[Django API Server]
        D[Draw Engine]
        E[Ticket Generator]
    end

    subgraph Infrastructure
        F[(Database)]
        G[AWS Amplify]
    end

    A -->|REST API| C
    B -->|REST API + Auth| C
    C --> F
    C -->|Trigger Draw| D
    D --> F
    C -->|Generate Ticket| E
    E -->|PDF / Wallet Pass| C
    G -->|Hosts| A
    G -->|Hosts| B
```

### Request Flow: Ticket Registration (Admin)

```mermaid
sequenceDiagram
    participant Admin
    participant AdminPanel as Admin Panel
    participant API as Django API
    participant DB as Database
    participant TG as Ticket Generator

    Admin->>AdminPanel: Enter buyer name + phone
    AdminPanel->>API: POST /api/tickets (name, phone)
    API->>DB: Create active ticket with folio
    API->>TG: Generate ticket (PDF + wallet pass)
    TG-->>API: Ticket files ready
    API-->>AdminPanel: Ticket created + download links
    AdminPanel-->>Admin: Show ticket + download options
```

### Request Flow: Draw Execution

```mermaid
sequenceDiagram
    participant Admin
    participant API as Django API
    participant Engine as Draw Engine
    participant DB as Database

    Admin->>API: POST /api/draw/execute (admin auth)
    API->>Engine: Execute draw
    Engine->>DB: Fetch all active tickets
    Engine->>Engine: Random selection (3 winners)
    Engine->>DB: Store results (winning folios + prize ranks)
    Engine-->>API: Draw results
    API-->>Admin: Winners displayed
```

### Request Flow: Public Results Query

```mermaid
sequenceDiagram
    participant Visitor
    participant Website as Public Website
    participant API as Django API
    participant DB as Database

    Visitor->>Website: Open results page
    Website->>API: GET /api/draw/results
    API->>DB: Fetch winning folios
    DB-->>API: Winner folios + prize info
    API-->>Website: Display winning folios
```

## Components and Interfaces

### Component 1: Public Website (React)

**Purpose**: Read-only site for visitors. No registration, no login, no accounts.

**Pages**:

| Page | Route | Description |
| ---- | ----- | ----------- |
| Home / Flyer | `/` | Landing page: draw info, prizes, fundraising dashboard (progress + helpers count), WhatsApp contact (wa.me link), how to participate |
| About Us | `/about` | Team HyperCore intro, member profiles with roles, LinkedIn links, Innovation MeetUp certificates, KIA challenge description |
| Results | `/results` | Winning ticket folio numbers (public, shown after draw executes) |
| Privacy Notice | `/privacy` | Simple data usage notice |

### Component 2: Admin Panel (React, authenticated)

**Purpose**: Team-only interface for managing tickets and running the draw.

**Functions**:
- Register new ticket (name + phone → instant active ticket)
- View all tickets (active, cancelled)
- Cancel a ticket (frees folio for reassignment)
- Reassign a cancelled folio to a new buyer
- Execute the draw (random selection from active tickets)
- View draw results
- View fundraising dashboard stats

**Authentication**: Admin login required (team members only)

### Component 3: Django API Server

**Purpose**: Backend handling all business logic.

**REST API Surface**:

| Method | Endpoint | Description | Auth |
| ------ | -------- | ----------- | ---- |
| POST | `/api/tickets` | Register a new ticket (name, phone) | Admin |
| GET | `/api/tickets` | List all tickets | Admin |
| GET | `/api/tickets/:id` | Get ticket details | Admin |
| PATCH | `/api/tickets/:id/cancel` | Cancel a ticket | Admin |
| POST | `/api/tickets/:id/reassign` | Reassign cancelled folio to new buyer | Admin |
| GET | `/api/tickets/:id/download/pdf` | Download ticket as PDF | Admin |
| GET | `/api/tickets/:id/download/wallet` | Download wallet pass (.pkpass / Google Wallet) | Admin |
| POST | `/api/draw/execute` | Execute the draw | Admin |
| GET | `/api/draw/results` | Get winning folios (public after draw) | Public |
| GET | `/api/dashboard` | Fundraising progress + participant count | Public |
| POST | `/api/auth/login` | Admin login | Public |

### Component 4: Draw Engine

**Purpose**: Isolated randomized winner selection. Selects 3 winners from active tickets.

**Rules**:
- Only active tickets participate (cancelled tickets excluded)
- Each active ticket has equal probability
- Selects exactly 3 winners (1st, 2nd, 3rd place)
- Results are immutable once created
- Draw can only execute once

### Component 5: Ticket Generator

**Purpose**: Generates downloadable ticket files in multiple formats.

**Formats**:
- **PDF**: printable ticket with folio, buyer name, draw info
- **Apple Wallet**: .pkpass file for iOS Wallet
- **Google Wallet**: Google Wallet pass link/file

**Ticket content**: folio number, buyer name, draw title, draw date, HyperCore branding

## Data Models

### Ticket

| Field | Type | Description |
| ----- | ---- | ----------- |
| id | UUID | Unique identifier |
| folio | String | Human-readable folio (e.g., "HC-001") — unique, reusable on cancellation |
| full_name | String | Buyer's preferred full name |
| phone | String | Buyer's phone number |
| status | Enum | `active`, `cancelled` |
| created_at | Timestamp | When the ticket was registered |
| cancelled_at | Timestamp | When cancelled (nullable) |
| created_by | FK(Admin) | Which admin registered this ticket |

**Validation Rules**:
- `full_name` required, max 200 characters
- `phone` required, valid format
- `folio` auto-generated, unique, reusable after cancellation
- Only `active` tickets participate in the draw

### DrawResult

| Field | Type | Description |
| ----- | ---- | ----------- |
| id | UUID | Unique identifier |
| ticket_id | UUID | FK to winning ticket |
| prize_rank | Integer | 1, 2, or 3 |
| prize_name | String | Prize description |
| drawn_at | Timestamp | When the draw was executed |

**Validation Rules**:
- Exactly 3 results per draw execution
- `prize_rank` must be 1, 2, or 3
- Results are immutable once created
- Draw can only execute once

### Admin (User)

| Field | Type | Description |
| ----- | ---- | ----------- |
| id | UUID | Unique identifier |
| username | String | Login username |
| password_hash | String | Hashed password |
| full_name | String | Admin's display name |
| role | String | Team role (e.g., "Mechatronics Engineer", "Developer") |

### Flyer / About Us Content

No database table needed — all flyer content (headline, prizes, about us, team profiles, contact info) is **static in the React frontend**. The only dynamic data on the home page is the fundraising dashboard, which is computed from the ticket count via `/api/dashboard`.

### Entity Relationship Diagram

```mermaid
erDiagram
    Admin ||--o{ Ticket : "registers"
    Ticket ||--o| DrawResult : "wins"

    Admin {
        UUID id PK
        String username
        String full_name
        String role
    }

    Ticket {
        UUID id PK
        String folio
        String full_name
        String phone
        Enum status
        UUID created_by FK
    }

    DrawResult {
        UUID id PK
        UUID ticket_id FK
        Integer prize_rank
        String prize_name
        Timestamp drawn_at
    }
```

## Error Handling

### Error Scenario 1: Draw with No Active Tickets

**Condition**: Admin tries to execute draw but no tickets have `active` status.
**Response**: API returns validation error. Draw does not execute.

### Error Scenario 2: Draw Already Executed

**Condition**: Admin tries to execute draw again after it already ran.
**Response**: API returns conflict error. Existing results are immutable.

### Error Scenario 3: Cancel Already Cancelled Ticket

**Condition**: Admin tries to cancel a ticket that's already cancelled.
**Response**: API returns validation error. No state change.

### Error Scenario 4: Reassign Active Ticket Folio

**Condition**: Admin tries to reassign a folio that's still active.
**Response**: API returns validation error. Only cancelled folios can be reassigned.

## Testing Strategy

### Unit Testing

- Draw Engine: random selection logic, edge cases (3 tickets exactly, 1 ticket, 200 tickets)
- Ticket lifecycle: create, cancel, reassign
- Folio generation and reuse logic
- Admin authentication

### Property-Based Testing

- Draw fairness: over many executions, each active ticket selected with approximately equal frequency
- Folio uniqueness: no two active tickets share the same folio at any point
- Status transitions: only valid transitions allowed (`active` → `cancelled`)

### Integration Testing

- Full flow: register ticket → cancel → reassign → execute draw → view results
- Ticket download: PDF generation, wallet pass generation
- Admin auth flow: login → perform actions → unauthorized access blocked
- Public results page: shows correct winning folios after draw

## Security Considerations

- Admin endpoints require authentication (Django session or JWT)
- Public endpoints are read-only (results, dashboard)
- No PII exposed on public pages (results show folio numbers only, not names)
- HTTPS enforced (AWS Certificate Manager)
- Input validation on all fields
- Rate limiting on public endpoints
- Simple privacy notice: data used only for the draw, deleted after event, not shared/sold

## Tech Stack

| Component | Technology |
| --------- | ---------- |
| Backend | Django (Python) |
| Frontend | React |
| Database | PostgreSQL (or SQLite for MVP) |
| Hosting | AWS Amplify |
| SSL/Domain | AWS Certificate Manager |
| Ticket PDF | Python PDF library (reportlab or weasyprint) |
| Wallet Passes | Apple: .pkpass generation / Google: Google Wallet API |

## Performance Considerations

- 200 tickets max — performance is not a concern at this scale
- Draw execution is instant for this ticket count
- Results page is cacheable (immutable after draw)
- Dashboard can be computed on-the-fly (count active tickets × $200)

## Dependencies

| Dependency | Purpose |
| ---------- | ------- |
| Django + DRF | API server, auth, ORM |
| React | Frontend SPA |
| PostgreSQL or SQLite | Database |
| reportlab or weasyprint | PDF ticket generation |
| passbook / wallet library | Apple Wallet .pkpass generation |
| Google Wallet API | Google Wallet pass generation |
| AWS Amplify | Hosting + CI/CD |
| AWS Certificate Manager | SSL certificates |
