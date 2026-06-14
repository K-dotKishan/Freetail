# SplitSpace — Shared Expenses App

> Assignment submission for Spreetail Software Engineering Intern

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
(All users use the same password: `aisha`, `rohan`, `priya`, `meera`, `sam`)

## Importing the CSV

1. Log in → Import CSV (sidebar)
2. Select group "Flat 5B"
3. Upload `backend/media/csv_uploads/expenses_export.csv`
4. Review flagged anomalies (19 detected)
5. Accept/reject each row
6. Click "Import"
7. View the generated report

## Docs

| File | Contents |
|------|---------|
| `docs/SCOPE.md` | All 19 CSV anomalies + database schema |
| `docs/DECISIONS.md` | Engineering decision log |
| `docs/AI_USAGE.md` | AI tools, prompts, corrections |
| `docs/IMPORT_POLICIES.md` | Per-anomaly import policies |

## Features

- ✅ JWT auth (login / register)
- ✅ Groups with time-bounded membership (join/leave dates)
- ✅ Expenses: equal, unequal, percentage, share splits
- ✅ Multi-currency (USD → INR conversion at configurable rate)
- ✅ Balance summary with minimum-payment settlement plan
- ✅ Per-expense breakdown (Rohan's requirement)
- ✅ Settlement recording
- ✅ CSV import with anomaly detection + user approval flow
- ✅ Import report (JSON + downloadable text)
- ✅ Soft delete + audit log
