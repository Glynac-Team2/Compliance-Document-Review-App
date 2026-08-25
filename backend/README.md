# Backend — Compliance Document Review API

FastAPI + SQLAlchemy. SQLite by default for zero-setup local dev; swap
`DATABASE_URL` in `.env` for Postgres when the team's ready (schema is
plain SQLAlchemy, no SQLite-specific tricks, so the swap is just the URL).

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API docs (auto-generated): http://localhost:8000/docs

## What's here vs. what's stubbed

- **Auth, roles, upload, document state machine, revision linking, audit
  trail, decisions** — real, working, covered by the smoke test below.
- **`GET /documents/{id}/assist`** — stubbed. Returns `available: false`
  with an error message when `LLM_API_KEY` is unset in `.env` (this is
  also the app's "AI degraded" state, built in from day one rather than
  bolted on later). Once the AI track has masking + retrieval working,
  swap the body of `get_assist()` in `app/routers/documents.py` — the
  response shape (`AssistOut` in `schemas.py`) is the contract the
  frontend already builds against, so the frontend shouldn't need to
  change.
- **Vector store / rule retrieval / precedent search** — not here; that's
  Data Engineering's track. The `assist` endpoint is the seam where their
  work plugs in.

## Smoke-testing the core loop without the frontend

```bash
# from backend/, with the venv active
python -c "
from app.main import app
from fastapi.testclient import TestClient
client = TestClient(app)
r = client.post('/auth/signup', json={'email':'a@x.com','name':'Advisor','password':'pass1234','role':'advisor'})
print(r.status_code, r.json())
"
```

Or just hit `/docs` and try it from the Swagger UI.

## Notes for whoever picks up Backend/DevOps

- Role enforcement is in `app/deps.py` (`require_role`) and applied at
  the route level, not just checked in the frontend — verified in the
  test above that an advisor token gets a 403 on an officer-only route.
- Audit events are append-only (`_log()` in `routers/documents.py`) —
  nothing should ever UPDATE or DELETE an `AuditEvent` row.
- `uploads/` is gitignored on purpose — never commit real or fake client
  files.
