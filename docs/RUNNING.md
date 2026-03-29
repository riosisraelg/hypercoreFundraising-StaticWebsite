# Running the HyperCore Gift Draw Platform

## Prerequisites

- Python 3.11+
- Node.js >= 20.20.0 / npm >= 10.8.0

## 1. Backend Setup (Django)

### Create and activate a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Install Python dependencies

```bash
pip install -r backend/requirements.txt
```

### Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set a random value for `DJANGO_SECRET_KEY`. The rest of the defaults work for local development.

### Run database migrations

```bash
.venv/bin/python backend/manage.py migrate
```

### Create initial admin users

```bash
.venv/bin/python backend/manage.py create_initial_admins
```

This creates 5 team admin accounts. Default password is `hypercore2026` (override with `--password <your-password>`).

### Start the Django dev server

```bash
.venv/bin/python backend/manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/api/`.

## 2. Frontend Setup (React + Vite)

### Install Node dependencies

```bash
npm install
```

### Start the Vite dev server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`. API requests to `/api/*` are automatically proxied to the Django backend on port 8000.

## 3. Running Both Together

You need two terminal windows:

| Terminal | Command | URL |
|----------|---------|-----|
| 1 | `.venv/bin/python backend/manage.py runserver` | `http://127.0.0.1:8000` |
| 2 | `npm run dev` | `http://localhost:5173` |

Open `http://localhost:5173` in your browser to use the app.

## 4. Running Tests

### Backend tests

```bash
.venv/bin/python backend/manage.py test core --verbosity=2
```

### Frontend tests

```bash
npm run test
```

## 5. Other Useful Commands

| Command | Description |
|---------|-------------|
| `npm run build` | TypeScript check + production build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build locally |
| `.venv/bin/python backend/manage.py createsuperuser` | Create a custom admin user |

## API Endpoints (Quick Reference)

### Public (no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/draw/results` | Winning folios (after draw) |
| GET | `/api/dashboard` | Fundraising progress |
| POST | `/api/auth/login` | Admin login (returns JWT) |

### Admin (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets` | Register a ticket |
| GET | `/api/tickets` | List all tickets |
| GET | `/api/tickets/:id` | Ticket details |
| PATCH | `/api/tickets/:id/cancel` | Cancel a ticket |
| POST | `/api/tickets/:id/reassign` | Reassign cancelled folio |
| GET | `/api/tickets/:id/download/pdf` | Download ticket PDF |
| GET | `/api/tickets/:id/download/wallet` | Download wallet pass |
| POST | `/api/draw/execute` | Execute the draw |
