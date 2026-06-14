# SplitSpace — Shared Expenses App

A full-stack shared expense tracking app built with Django REST Framework + React + Tailwind CSS.

## Stack

| Layer     | Technology                                      |
|-----------|--------------------------------------------------|
| Backend   | Python 3.12, Django 4.2, Django REST Framework  |
| Auth      | JWT (djangorestframework-simplejwt)              |
| Database  | SQLite (dev) / PostgreSQL (prod-ready)           |
| Frontend  | React 18, Vite, Tailwind CSS, Framer Motion     |
| Charts    | Recharts                                         |
| Icons     | Lucide React                                     |

## Setup — Backend

```bash
cd shared-expenses-app/backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
python manage.py migrate
python seed_data.py            # creates demo users
python manage.py runserver
```

Backend runs at: http://localhost:8000

## Setup — Frontend

```bash
cd shared-expenses-app/frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

## Demo Credentials

All users share the password: `password123`

| Username | Display Name | Role |
|----------|-------------|------|
| aisha    | Aisha       | Flat member (Feb–present) |
| rohan    | Rohan       | Flat member (Feb–present) |
| priya    | Priya       | Flat member (Feb–present) |
| meera    | Meera       | Left 31 Mar 2026 |
| sam      | Sam         | Joined 8 Apr 2026 |
| dev      | Dev         | Guest/visitor |

## AI Usage

See `AI_USAGE.md`

## Data Import

Upload `expenses_export.csv` via the Import CSV page.
The importer detects 19+ data anomalies and requires user approval before committing.
See `SCOPE.md` for the full anomaly log.
