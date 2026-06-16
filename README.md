# SplitSpace — Shared Expenses App

> Assignment submission for Spreetail Software Engineering Intern

## Live Deployment

**Backend API:** https://freetail.onrender.com/

## Quick Start

### Option A: Manual (recommended for development)

**Backend:**

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python seed_data.py
python manage.py runserver
# → http://localhost:8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Option B: Docker

```bash
docker-compose up --build
```

## Demo Login

Username: `aisha` | Password: `password123`

(All users use the same password: `password123`)

Available users:

* `aisha`
* `rohan`
* `priya`
* `meera`
* `sam`

## Importing the CSV

1. Log in → Import CSV (sidebar)
2. Select group "Flat 5B"
3. Upload `backend/media/csv_uploads/expenses_export.csv`
4. Review flagged anomalies (19 detected)
5. Accept/reject each row
6. Click "Import"
7. View the generated report

## Docs

| File                      | Contents                               |
| ------------------------- | -------------------------------------- |
| `docs/SCOPE.md`           | All 19 CSV anomalies + database schema |
| `docs/DECISIONS.md`       | Engineering decision log               |
| `docs/AI_USAGE.md`        | AI tools, prompts, corrections         |
| `docs/IMPORT_POLICIES.md` | Per-anomaly import policies            |

## Features

* ✅ JWT authentication (login / register)
* ✅ Groups with time-bounded membership (join/leave dates)
* ✅ Expenses with equal, unequal, percentage, and share splits
* ✅ Multi-currency support (USD → INR conversion at configurable rate)
* ✅ Balance summary with minimum-payment settlement plan
* ✅ Per-expense breakdown (Rohan's requirement)
* ✅ Settlement recording
* ✅ CSV import with anomaly detection and user approval workflow
* ✅ Import report generation (JSON + downloadable text)
* ✅ Soft delete support
* ✅ Audit logging

## Tech Stack

### Backend

* Django
* Django REST Framework
* JWT Authentication
* SQLite / PostgreSQL compatible

### Frontend

* React
* Vite
* Axios
* React Router

### Deployment

* Backend: https://freetail.onrender.com/
* Database: Neon PostgreSQL
