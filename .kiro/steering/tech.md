# Tech Stack

## Backend
- Django (Python) + Django REST Framework
- PostgreSQL (or SQLite for MVP)

## Frontend
- React (SPA)

## Infrastructure
- AWS Amplify (hosting + CI/CD)
- AWS Certificate Manager (SSL + custom domain)

## Ticket Generation
- reportlab or weasyprint (PDF)
- passbook library (Apple Wallet .pkpass)
- Google Wallet API

## Build & Run Commands

- `npm run dev` — Start Vite dev server (frontend, port 5173)
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — ESLint check
- `npm run preview` — Preview production build locally
- `.venv/bin/python backend/manage.py runserver` — Start Django dev server (backend, port 8000)
- `.venv/bin/python backend/manage.py migrate` — Run database migrations
- `.venv/bin/python backend/manage.py createsuperuser` — Create admin user
- `npx ampx sandbox` — Start Amplify sandbox (local cloud backend)

## Guidelines
- Keep the backend API simple — admin-only write endpoints, public read-only endpoints
- No email system — all communication happens via WhatsApp
- No payment processing — all payments are offline
- Privacy notice required on the site (simple, not full LFPDPPP compliance)
