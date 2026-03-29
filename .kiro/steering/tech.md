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

_To be defined when project scaffolding is created._

## Guidelines
- Keep the backend API simple — admin-only write endpoints, public read-only endpoints
- No email system — all communication happens via WhatsApp
- No payment processing — all payments are offline
- Privacy notice required on the site (simple, not full LFPDPPP compliance)
