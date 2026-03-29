# UI/UX Design Brief — HyperCore Gift Draw Platform

Use this document as a reference when designing screens in Stitch AI or any design tool.

---

## Context

A fundraising raffle website for Team HyperCore (5 engineering students from Universidad Tecmilenio, Mexico). They won the regional phase of the KIA Mexico Innovation MeetUp 2026 and need to fund their trip to the national finals in Cancún. The raffle sells 200 digital tickets at $200 MXN each, with 3 prizes.

Audience: family, friends, and general public in Mexico. Tone: trustworthy, friendly, energetic, young/university vibe.

---

## Two Interfaces

### 1. Public Website (visitors — no login)

Read-only. No registration forms, no accounts, no login. Visitors come here to learn about the raffle and check results.

#### Page: Home / Flyer (`/`)

Purpose: the main promotional page. This is what gets shared on social media.

Content:
- Hero section with the raffle name, a catchy headline, and a brief description of why the raffle exists (funding the trip to Cancún for the KIA Innovation MeetUp finals)
- Prizes section showing the 3 prizes:
  - 1st place: $5,000 MXN cash
  - 2nd place: JBL Flip 7 speaker
  - 3rd place: Botella Maestro Dobel
- Fundraising dashboard: a progress bar or visual showing how much has been raised vs. the $40,000 MXN goal (200 tickets × $200), plus the number of people participating
- How to participate: a short explanation that tickets are sold by the team, and interested buyers will be contacted via WhatsApp
- WhatsApp contact link (wa.me)
- Social media links

#### Page: About Us (`/about`)

Purpose: build trust and credibility. Prove the team is real and the cause is legitimate.

Content:
- Team name: HyperCore
- Brief intro: who they are, what the KIA Digital Paint Shop challenge is about (Industry 4.0, digitizing automotive painting processes)
- Team member cards (4-5 members), each showing:
  - Photo or avatar
  - Name
  - Role (e.g., "Mechatronics Engineer", "Software Developer")
  - LinkedIn profile link
- Link to Innovation MeetUp certificates (on each member's LinkedIn)
- Why the raffle exists: funding 4 members' trip to Cancún (3 nights, 4 days, airfare, lodging, food — $13,000 MXN per person)

#### Page: Results (`/results`)

Purpose: after the draw, show the winning ticket numbers.

Content:
- Before draw: a message like "El sorteo aún no se ha realizado. ¡Mantente atento!"
- After draw: 3 winning folio numbers with their prize:
  - 🥇 HC-042 — $5,000 MXN
  - 🥈 HC-117 — JBL Flip 7
  - 🥉 HC-003 — Botella Maestro Dobel
- No names shown — only folio numbers and prizes
- A note: "Si tu folio aparece aquí, ¡felicidades! Contáctanos por WhatsApp para reclamar tu premio."

#### Page: Privacy Notice (`/privacy`)

Purpose: simple data usage notice.

Content:
- Data collected: name and phone number only
- Used exclusively for the raffle
- Will be deleted after the event and Innovation MeetUp results are announced
- Will not be shared, sold, or misused

---

### 2. Admin Panel (team members only — requires login)

Authenticated interface. Only the 5 team members use this. Functional, clean, doesn't need to be flashy.

#### Screen: Login

- Username + password form
- Simple, centered layout

#### Screen: Dashboard (admin home)

- Fundraising stats: total tickets sold (active), total raised, goal progress
- Quick actions: "Register Ticket", "Execute Draw"
- Recent tickets list (last 5-10)

#### Screen: Register Ticket

- Form with two fields: buyer's full name, phone number
- Submit button
- On success: show the created ticket with folio number and download options (PDF, Apple Wallet, Google Wallet)

#### Screen: Ticket List

- Table or card list of all tickets
- Columns: folio, buyer name, phone, status (active/cancelled), date
- Filter by status (all, active, cancelled)
- Actions per ticket: cancel, download PDF, download wallet pass
- For cancelled tickets: "Reassign" button

#### Screen: Reassign Folio

- Shows the cancelled folio number
- Form: new buyer name, new phone number
- Submit creates a new active ticket on that folio

#### Screen: Execute Draw

- Button: "Ejecutar Sorteo"
- If draw already ran: show current results and a "Re-run Draw" option that requires typing "rewrite draw" to confirm
- After execution: show the 3 winners with folio, buyer name, and prize

#### Screen: Draw Results (admin view)

- Same as public results but with buyer names visible (admin can see who won)
- Folio, buyer name, phone, prize rank, prize name

---

## Design Notes

- Mobile-responsive: the public site will be shared via WhatsApp, so most visitors will be on phones
- Language: Spanish (Mexico)
- Color palette: not defined yet — suggest something energetic and trustworthy (blues, greens, or the team's branding if they have one)
- Typography: clean, modern, readable on mobile
- The public site should feel like a digital flyer — visual, engaging, shareable
- The admin panel should feel functional and clean — it's a tool, not a marketing page
- No dark mode needed
- Accessibility: good contrast, readable font sizes, touch-friendly buttons on mobile
