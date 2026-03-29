# Requirements Document

## Introduction

The HyperCore Gift Draw Platform is a single-use web application for a fundraising raffle organized by Team HyperCore (Universidad Tecmilenio). The platform enables team members to register ticket buyers, generate downloadable digital tickets, execute a randomized draw selecting 3 winners, and publish results publicly. All payments are handled offline (cash/transfers), and winner communication happens via WhatsApp. The fundraising goal is $26,000 MXN (200 tickets × $200 MXN) to fund the team's trip to the KIA Mexico Innovation MeetUp 2026 finals in Cancún.

## Glossary

- **Platform**: The HyperCore Gift Draw Platform web application (frontend + backend)
- **Admin_Panel**: The authenticated React interface used by Team HyperCore members to manage tickets and execute the draw
- **Public_Website**: The read-only React website accessible to visitors without authentication
- **API_Server**: The Django REST Framework backend handling all business logic and data persistence
- **Draw_Engine**: The isolated component responsible for randomized winner selection from active tickets
- **Ticket_Generator**: The component that produces downloadable ticket files in PDF, Apple Wallet, and Google Wallet formats
- **Ticket**: A raffle entry record containing a folio, buyer name, phone number, and status (active or cancelled)
- **Folio**: A human-readable unique identifier for a ticket (e.g., "HC-001"), reusable after cancellation
- **Active_Ticket**: A ticket with status `active` that is eligible to participate in the draw
- **Cancelled_Ticket**: A ticket with status `cancelled` that is excluded from the draw
- **Draw_Result**: An immutable record linking a winning ticket to a prize rank (1st, 2nd, or 3rd place)
- **Admin**: An authenticated team member with credentials to access the Admin_Panel
- **Visitor**: Any unauthenticated person viewing the Public_Website
- **Dashboard**: The fundraising progress display showing ticket count and amount raised toward the $26,000 MXN goal

## Requirements

### Requirement 1: Ticket Registration

**User Story:** As an admin, I want to register ticket buyers by entering their name and phone number, so that each buyer receives a unique folio and an active ticket.

#### Acceptance Criteria

1. WHEN an admin submits a valid buyer name and phone number, THE API_Server SHALL create a new Active_Ticket with an auto-generated unique Folio and return the ticket details including download links
2. WHEN an admin submits a buyer name that is empty or exceeds 200 characters, THE API_Server SHALL reject the request with a validation error and create no ticket
3. WHEN an admin submits a phone number that is empty or in an invalid format, THE API_Server SHALL reject the request with a validation error and create no ticket
4. WHEN a new ticket is created, THE API_Server SHALL assign a Folio that is unique among all currently Active_Tickets
5. WHEN a ticket is created, THE API_Server SHALL record the creating Admin as the `created_by` field and set `created_at` to the current timestamp

### Requirement 2: Ticket Cancellation

**User Story:** As an admin, I want to cancel a ticket, so that the buyer's entry is removed from the draw and the folio becomes available for reassignment again.

#### Acceptance Criteria

1. WHEN an admin cancels an Active_Ticket, THE API_Server SHALL set the ticket status to `cancelled` and record the cancellation timestamp
2. WHEN an admin attempts to cancel a Cancelled_Ticket, THE API_Server SHALL return a validation error and make no state change
3. WHEN a ticket is cancelled, THE Draw_Engine SHALL exclude that ticket from any future draw execution
4. WHEN a folio has been reassigned and the new Active_Ticket is cancelled again, THE API_Server SHALL allow the folio to be reassigned once more — there is no limit to how many times a folio can cycle through active → cancelled → reassigned

### Requirement 3: Folio Reassignment

**User Story:** As an admin, I want to reassign a cancelled folio to a new buyer, so that folio numbers are reused and no gaps appear in the sequence.

#### Acceptance Criteria

1. WHEN an admin reassigns a cancelled Folio with a valid new buyer name and phone number, THE API_Server SHALL create a new Active_Ticket reusing that Folio
2. WHEN an admin attempts to reassign a Folio that belongs to an Active_Ticket, THE API_Server SHALL return a validation error and make no change
3. WHILE a Folio is reassigned, THE API_Server SHALL ensure no two Active_Tickets share the same Folio at any given time
4. WHEN a reassigned folio's new ticket is later cancelled, THE API_Server SHALL allow that same folio to be reassigned again — there is no limit to the number of cancel/reassign cycles per folio

### Requirement 4: Ticket Listing and Details

**User Story:** As an admin, I want to view all tickets and their details, so that I can track registrations and manage the raffle.

#### Acceptance Criteria

1. WHEN an admin requests the ticket list, THE API_Server SHALL return all tickets (active and cancelled) with their folio, buyer name, phone, status, and timestamps
2. WHEN an admin requests a specific ticket by ID, THE API_Server SHALL return the full ticket details including folio, buyer name, phone, status, creation timestamp, cancellation timestamp, and creating admin

### Requirement 5: Ticket Generation (PDF and Wallet Passes)

**User Story:** As an admin, I want to download a buyer's ticket as a PDF, Apple Wallet pass, or Google Wallet pass, so that I can share the ticket with the buyer.

#### Acceptance Criteria

1. WHEN an admin requests a PDF download for a ticket, THE Ticket_Generator SHALL produce a PDF file containing the folio number, buyer name, draw title, draw date, and HyperCore branding
2. WHEN an admin requests an Apple Wallet download for a ticket, THE Ticket_Generator SHALL produce a valid .pkpass file containing the folio number, buyer name, draw title, draw date, and HyperCore branding
3. WHEN an admin requests a Google Wallet download for a ticket, THE Ticket_Generator SHALL produce a valid Google Wallet pass containing the folio number, buyer name, draw title, draw date, and HyperCore branding

### Requirement 6: Draw Execution

**User Story:** As an admin, I want to execute the raffle draw, so that 3 winners are randomly selected from all active tickets.

#### Acceptance Criteria

1. WHEN an admin triggers the draw, THE Draw_Engine SHALL randomly select exactly 3 winners from all Active_Tickets, assigning prize ranks 1st, 2nd, and 3rd
2. WHILE the draw executes, THE Draw_Engine SHALL give each Active_Ticket an equal probability of being selected
3. WHEN the draw completes, THE API_Server SHALL store the Draw_Results as records linking each winning ticket to its prize rank and recording the draw timestamp
4. WHEN an admin attempts to re-run the draw, THE API_Server SHALL require the admin to type the confirmation phrase "rewrite draw" before proceeding
5. WHEN the admin confirms with "rewrite draw", THE API_Server SHALL delete the previous Draw_Results and execute a new draw, overwriting the old results with new winners
6. WHEN an admin attempts to execute the draw with zero Active_Tickets, THE API_Server SHALL return a validation error and not execute the draw
7. WHEN the draw completes, THE Draw_Engine SHALL select exactly 3 distinct tickets (no duplicate winners)

### Requirement 7: Draw Results (Public)

**User Story:** As a visitor, I want to view the winning folio numbers on the public results page, so that I can check if my ticket won.

#### Acceptance Criteria

1. WHEN a visitor requests draw results after the draw has been executed, THE API_Server SHALL return the winning Folio numbers and their prize ranks without exposing buyer names or phone numbers
2. WHEN a visitor requests draw results before the draw has been executed, THE API_Server SHALL return an empty result indicating no draw has occurred

### Requirement 8: Fundraising Dashboard

**User Story:** As a visitor, I want to see the fundraising progress on the home page, so that I can understand how close the team is to their goal.

#### Acceptance Criteria

1. WHEN a visitor or admin requests the dashboard, THE API_Server SHALL return the count of Active_Tickets and the total amount raised (active ticket count × $200 MXN)
2. THE Public_Website SHALL display the fundraising progress toward the $26,000 MXN goal and the count of participants on the home page

### Requirement 9: Public Website Pages

**User Story:** As a visitor, I want to browse the public website to learn about the raffle, the team, and the privacy policy, so that I can make an informed decision about participating.

#### Acceptance Criteria

1. THE Public_Website SHALL display a home page at `/` containing draw information, prizes, the fundraising dashboard, a WhatsApp contact link (wa.me), and instructions on how to participate
2. THE Public_Website SHALL display an about page at `/about` containing Team HyperCore member profiles with roles, LinkedIn links, Innovation MeetUp certificates, and a description of the KIA challenge
3. THE Public_Website SHALL display a results page at `/results` showing winning Folio numbers after the draw has been executed
4. THE Public_Website SHALL display a privacy notice page at `/privacy` explaining that buyer data is used only for the draw, deleted after the event, and not shared or sold

### Requirement 10: Admin Authentication

**User Story:** As an admin, I want to log in with my credentials, so that only authorized team members can manage tickets and execute the draw.

#### Acceptance Criteria

1. WHEN an admin submits valid credentials, THE API_Server SHALL authenticate the admin and return a session token or JWT
2. WHEN a request to an admin-only endpoint lacks valid authentication, THE API_Server SHALL return an unauthorized error and deny access
3. THE API_Server SHALL require authentication for all ticket management endpoints (create, list, detail, cancel, reassign, download) and the draw execution endpoint
4. THE API_Server SHALL allow unauthenticated access to the public results endpoint, the dashboard endpoint, and the login endpoint

### Requirement 11: Data Privacy and Security

**User Story:** As a visitor or buyer, I want my personal data to be protected, so that my information is not exposed publicly or misused.

#### Acceptance Criteria

1. THE API_Server SHALL enforce HTTPS for all communication using AWS Certificate Manager
2. THE API_Server SHALL validate all input fields on every request to prevent malformed or malicious data
3. THE API_Server SHALL apply rate limiting on public endpoints to prevent abuse
4. WHEN returning draw results on public endpoints, THE API_Server SHALL expose only Folio numbers and prize ranks, excluding buyer names and phone numbers
5. THE API_Server SHALL store admin passwords as hashed values, never in plain text

### Requirement 12: Ticket Data Integrity

**User Story:** As an admin, I want the system to enforce valid ticket state transitions, so that data remains consistent throughout the raffle lifecycle.

#### Acceptance Criteria

1. THE API_Server SHALL allow only the state transition from `active` to `cancelled` for a ticket's status field
2. WHEN a ticket is in `cancelled` status, THE API_Server SHALL reject any attempt to transition the ticket back to `active` (reassignment creates a new ticket on the same folio instead)
3. THE API_Server SHALL enforce that each Folio is unique among all Active_Tickets at any given time
