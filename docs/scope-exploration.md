# Scope Exploration: HyperCore Gift Draw Platform

> Living document — grows with each conversation session.
> Raw material for IEEE 29148 SRS/SyRS/StRS formalization.

---

## 1. Big Picture

`[StRS 9.3.1 Business Purpose]`
The platform exists to fundraise travel expenses for team **HyperCore** (5 members, funding 4) to attend the final competition of the **KIA Mexico Innovation MeetUp 2026** in Cancún, Mexico. The challenge is organized by **Universidad Tecmilenio** and sponsored by **KIA Mexico**. The team won the regional phase (Phase 1) and needs to fund the national finals (Phase 2).

`[StRS 9.3.6 Goal and Objective]`

- Fundraising target from the draw: **$26,000 MXN** (half of total $52,000 MXN needed)
- Remaining $26,000 MXN to be raised through other efforts (selling, seeking help)
- Per-member cost: **$13,000 MXN** (3 nights, 4 days — del 6 al 9 — airfare, lodging, food)

`[StRS 9.3.2 Business Scope]`

- This is a **single-use platform** for one specific draw — not a multi-draw platform
- The draw is a raffle where participants buy digital tickets for a chance to win prizes
- **Priority**: MVP / One-time use

---

## 2. Stakeholders

`[StRS 9.3.4 Stakeholders]`

| Stakeholder              | Role                          | Notes                                                    |
| ------------------------ | ----------------------------- | -------------------------------------------------------- |
| HyperCore team (5)       | Organizers, admins, sellers   | Run the draw, register participants, manage tickets      |
| Family & friends         | Primary ticket buyers         | First target audience                                    |
| General public           | Secondary ticket buyers       | Broader reach                                            |
| KIA Mexico               | Challenge sponsor / customer  | Stakeholder in the Innovation MeetUp challenge           |
| Universidad Tecmilenio   | Challenge organizer           | Hosts the Innovation MeetUp                              |

`[StRS 9.3.14 Business Structure]`

- Team name: **HyperCore**
- Category: KIA Challenge — Digital Paint Shop (Industry 4.0)
- The team's project: digitizing 80% of critical variables in KIA's automotive painting process (Pre-Treatment & Electrodeposition) using OPC UA, MQTT, Edge Computing, AI, Digital Twins
- Estimated annual savings from the solution: ~$110,831 USD

---

## 3. The Draw — Core Mechanics (SIMPLIFIED v2)

`[SRS 9.5.4 Product Functions]` `[SRS 9.5.11 Functions]`

### Ticket Registration (Team-Only)

- **Only team members can register tickets** — there is NO public-facing registration form
- The public site announces that interested buyers will be **contacted via WhatsApp** — no redirect link, no WhatsApp CTA button
- Registration data: **phone number** and **full name** — that's it, no email
- Ticket is created **instantly** upon registration — no pending state, no payment validation in the system
- Each ticket gets a unique folio number
- Ticket delivery options (buyer chooses):
  - **Auto-add to wallet** (Google Wallet / Apple Wallet)
  - **Download wallet file** (.pkpass / Google Wallet link) if auto-add fails
  - **Download as PDF** if they prefer a printable/static version

### Payment Handling

- **All payments happen offline** — cash or bank transfers, handled outside the system
- The system does **not** track or validate payments
- If someone doesn't pay, the team can **cancel their ticket** in the admin panel
- Cancelled ticket IDs are freed up and can be reassigned to a new buyer
- The ticket counter keeps incrementing for new clients regardless

### Ticket Status Flow

- Team member registers buyer → ticket created as **active** immediately
- If buyer doesn't pay → admin cancels ticket → status becomes **cancelled** → folio is available for reassignment
- Only **active** tickets participate in the draw

### Prizes (3 winners)

| Place | Prize                  | Status       |
| ----- | ---------------------- | ------------ |
| 1st   | $5,000 MXN (cash)     | ✅ Confirmed |
| 2nd   | Bocina JBL Flip 7     | ✅ Confirmed |
| 3rd   | Botella Maestro Dobel  | ✅ Confirmed |

### Draw Execution

- Triggered by admin (not live-streamed)
- System selects 3 winners randomly from **active** tickets
- Results published on the platform — shows **winning ticket folio numbers**
- **No email notifications** — winners are contacted personally by the team
- Participants can check results on the website by looking at the winning folios

`[StRS 9.3.17 Operational Scenarios]`

- **Purchase scenario**: Person learns about the draw → team contacts them via WhatsApp → pays cash/transfer offline → team member registers them in admin panel → ticket created instantly → buyer receives ticket (auto-added to wallet, downloadable wallet file, or PDF)
- **Winner scenario**: Draw runs → winning folios published on site → team contacts winner personally → winner claims prize with folio
- **Non-payment scenario**: Team cancels ticket in admin → folio freed for reassignment

---

## 4. User-Facing Features (Public Website)

`[SRS 9.5.11 Functions]` `[SyRS 9.4.12 System Security]`

The public website is **read-only for visitors** — no self-registration, no accounts, no login.

- **Home / Flyer Digital**: Landing page with draw info, prizes, how to participate, **fundraising dashboard** (progress toward goal + number of people helping), announcement that buyers will be contacted via WhatsApp, wa.me contact link
- **About Us**: Team profiles, LinkedIn links, Innovation MeetUp certificates, why the draw exists
- **Results**: After the draw, shows the winning ticket folio numbers (public, no login needed)
- **No user accounts** — no login, no email, no account management
- **No self-service registration** — all registration is done by team members

---

## 5. Digital Flyer & About Us

`[SRS 9.5.4 Product Functions]` `[StRS 9.3.16 Operational Concept]`

### Digital Flyer (Landing Page / Home)

- Acts as the main promotional page for the draw
- Draw info, prizes, how to participate
- **Fundraising dashboard**: shows current progress toward the goal and number of people helping
- Announcement that interested buyers will be **contacted via WhatsApp**
- Contact via WhatsApp link (wa.me) — this IS the contact method and social media link
- Buyers can also reach out to the team directly via WhatsApp

### About Us (Trust & Credibility Section)

- Team introduction: who is HyperCore
- Team composition: **4 engineers** — 2 mechatronics, 2 developers (5th member role TBD — needs confirmation)
- Team member profiles with roles
- LinkedIn profile links for each member
- Innovation MeetUp certificates — **linked from each member's LinkedIn profile**
- Brief about the KIA Digital Paint Shop challenge
- Why the draw exists — funding the trip to nationals in Cancún
- **Goal**: build confidence and veracity for potential ticket buyers

---

## 6. Admin Panel (Team-Only)

`[SRS 9.5.11 Functions]`

- **Register new tickets**: enter buyer's name and phone number → ticket created instantly
- **View all tickets**: list of all tickets with status (active, cancelled)
- **Cancel tickets**: mark a ticket as cancelled if buyer doesn't pay → folio freed for reassignment
- **Reassign folio**: register a new buyer on a previously cancelled folio
- **Execute draw**: trigger the random winner selection (only from active tickets)
- **View results**: see the winning folios after the draw
- **Authentication**: admin login required (team members only)

---

## 7. Notifications — REMOVED

~~Email notifications have been removed from scope.~~

- **No email field** collected from buyers
- **No confirmation emails**
- **No results emails**
- Winners are contacted **personally by the team** (WhatsApp, phone call, in person)
- Results are published on the website (winning folio numbers)

---

## 8. Platform Scope Boundaries

`[SyRS 9.4.2 System Scope]`

### In Scope

- Single draw for the HyperCore Cancún trip
- Public website: flyer, about us, results page
- WhatsApp announcement on the site (no redirect link)
- Admin panel: ticket registration, cancellation, reassignment, draw execution
- Downloadable digital ticket (Google Wallet, Apple Wallet, or PDF)
- Results publication (winning folio numbers)
- Social media links and contact info

### Out of Scope

- Public self-registration (all registration is team-only via admin)
- Payment processing / validation in the system
- Email notifications
- User accounts / login for buyers
- Multi-draw support
- Live-streaming the draw
- Automatic refund processing
- Mobile app (web only)

---

## 9. Constraints & Environment

`[StRS 9.3.18 Project Constraints]`

- **Timeline**: Draw must be ready by approximately **April 20, 2026** (date may shift)
- **Budget**: Minimal — team is self-funding the platform development
- **Team size**: 5 members handling both development and ticket sales

`[SyRS 9.4.11 Environmental Conditions]`

- Web-based platform (no mobile app)
- **Tech stack**: Django (Python) backend + React frontend
- **Hosting**: AWS Amplify
- **SSL/Domain**: AWS Certificate Manager + custom domain via AWS

`[SyRS 9.4.14 Policies and Regulations]`

- **No full LFPDPPP compliance required** — just a simple privacy notice stating:
  - Data (name + phone) is used solely for the draw
  - Data will be deleted after the fundraising and Innovation MeetUp event concludes
  - Data will not be shared, sold, or misused

---

## 10. Open Questions

| #  | Question                                                          | Status                            |
| -- | ----------------------------------------------------------------- | --------------------------------- |
| 1  | ~~What are the exact prizes and their 1st/2nd/3rd placement?~~    | ✅ Resolved                       |
| 2  | ~~Cash prize amount?~~                                            | ✅ Resolved — $5,000 MXN          |
| 3  | ~~LFPDPPP compliance requirements~~                               | ✅ Resolved — simple privacy notice only |
| 4  | ~~Which payment gateway to use?~~                                 | ✅ Removed — no online payments    |
| 5  | Exact draw date (April 20 is approximate)                         | ⚠️ May change                     |
| 6  | ~~Tech stack selection~~                                          | ✅ Resolved — Django + React + AWS Amplify |
| 7  | ~~Where will the Innovation MeetUp certificates be hosted/linked?~~ | ✅ Resolved — on each member's LinkedIn |
| 8  | ~~What social media accounts to link?~~                           | ✅ Resolved — WhatsApp (wa.me link) |
| 9  | ~~Email provider selection~~                                      | ✅ Removed — no emails             |
| 10 | ~~Hosting/deployment platform~~                                   | ✅ Resolved — AWS Amplify          |
| 11 | ~~WhatsApp number for the CTA redirect~~                          | ✅ Removed — just an announcement  |
| 12 | Google Wallet / Apple Wallet / PDF ticket generation approach     | ⚠️ Needs research                 |
| 13 | 5th team member role — needs confirmation                         | ⚠️ Pending                        |
| 14 | Trip dates month (del 6 al 9 de ?)                                | ⚠️ Needs month                    |

---

Last updated: March 28, 2026 — Session 3 (Tech stack, privacy, team details, dashboard)
