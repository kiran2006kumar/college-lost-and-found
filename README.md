# LostLink

LostLink is a full-stack campus lost-and-found project. The React client talks to a FastAPI REST service backed by SQLAlchemy and MySQL. Matching is explainable text/attribute similarity; it only suggests candidates and never approves ownership.

## Project Structure

```text
.
├── frontend/                 # Vite, React, TypeScript, Tailwind client
│   └── src/
├── backend/
│   ├── app/                   # API, ORM models, auth, matching, routes
│   ├── migrations/            # Alembic configuration and revisions
│   ├── tests/                 # API and matching tests (SQLite test DB)
│   ├── requirements.txt
│   └── seed.py
├── docs/system-design.md      # Architecture, ER, use-case, data flow
├── prototype.html             # Original single-file UI reference
├── .env.example
└── README.md
```

See [system design and database schema](docs/system-design.md). Core tables are `users`, `items`, `claims`, `matches`, `notifications`, `audit_logs`, and `contact_messages`; constraints, foreign keys, and lookup indexes are defined in the ORM and initial migration.

## Prerequisites

- Node.js 20.19+ (or 22.12+) and npm
- Python 3.11+
- MySQL 8 (or compatible MySQL server)

## Setup (PowerShell)

From the project root:

```powershell
Copy-Item .env.example .env
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

Create a database and least-privilege application user in MySQL:

```sql
CREATE DATABASE lostlink CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lostlink'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON lostlink.* TO 'lostlink'@'localhost';
```

Edit `.env`: set `DATABASE_URL` to `mysql+pymysql://lostlink:<URL-encoded-password>@localhost:3306/lostlink?charset=utf8mb4`, replace `JWT_SECRET` with a long random value, and set your approved `COLLEGE_EMAIL_DOMAIN` only if your institution requires it. Set `CORS_ORIGINS` to your actual frontend origin(s). Do not commit `.env`.

Run the schema migration and start the API (from project root):

```powershell
alembic -c backend\alembic.ini upgrade head
uvicorn app.main:app --app-dir backend --reload --port 8000
```

Interactive API docs: <http://localhost:8000/docs>. Health check: <http://localhost:8000/api/health>.

Install and start the client in a second terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

The client reads `VITE_API_URL` (default `http://localhost:8000/api`). Restart Vite after changing environment values.

## Demo Data

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` (password must be at least 12 characters), run migrations first, then:

```powershell
python backend\seed.py
```

This creates one administrator and two related sample reports, if the administrator has no existing reports. Treat these credentials and reports as development-only; change/remove them before deployment.

## Tests and Build

```powershell
python -m pytest backend\tests -q
Set-Location frontend
npm run build
npm run lint
```

Backend tests use an isolated in-memory SQLite database; deployed data uses the configured MySQL or PostgreSQL database. Alembic owns schema changes; do not rely on `create_all` in production.

## Deploy to Render

The root `render.yaml` defines a Singapore-based Render Blueprint with a FastAPI service, static frontend, managed PostgreSQL database, and persistent disk for uploaded item photos. The API, database, and disk use paid Render resources; check current pricing in Render before creating the Blueprint.

1. Push this project to a GitHub repository. Do not include `.env`, local databases, or credentials.
2. In Render, choose **New + → Blueprint**, connect the repository, and review the services and costs before applying.
3. Render builds both apps, runs Alembic migrations before starting the API, and configures the API URL and frontend CORS origin from the linked services.
4. After deployment, check `<API service URL>/api/health`. The frontend includes a rewrite for client-side routes.

Set `COLLEGE_EMAIL_DOMAIN` in the API service environment if registration should be restricted to a college email domain. The Blueprint generates `JWT_SECRET` and persists database data and uploaded photos across deploys.

## API Areas

- `POST /api/auth/register`, `POST /api/auth/login`, `GET/PATCH /api/auth/me` (name/password)
- `GET/POST /api/items`, `GET/PATCH /api/items/{id}`, `POST /api/items/{id}/image`, `GET /api/items/{id}/matches`, `PATCH /api/items/{id}/matches/{match_id}`
- `POST /api/claims/items/{id}`, `GET /api/claims/mine`, `PATCH /api/claims/{id}`
- `GET /api/notifications`, `POST /api/notifications/{id}/read`
- `GET /api/stats/public`, `GET /api/dashboard/me`
- `GET /api/admin/stats`, `/claims`, `/users`, `/audit-logs`, `/messages`; `/api/admin/users/{id}/role` and `/api/admin/items/{id}/status` require an administrator
- `POST /api/contact`

OpenAPI is generated at `/openapi.json`. Public item responses never include contact email or private claim evidence. Recovery claims are reviewed by the found-item reporter or an administrator; only the approved claim can be completed. Match suggestions can be confirmed or rejected by the report owner; feedback does not approve a recovery claim.

## Security and Current Boundaries

Passwords use Argon2 hashes; access tokens are signed JWTs; auth endpoints are rate-limited in-process; uploads accept bounded JPEG/PNG/WebP content with signature checks and random filenames. The in-process limiter is suitable for a single development instance, not a multi-worker production deployment. Configure HTTPS, managed secrets, shared rate limiting, image scanning/re-encoding, backup/retention policies, and institution-approved email before campus production use. Optional email delivery and password reset are not enabled until a provider is configured. Image-based AI matching is not implemented; the current matcher uses text and report attributes only.
