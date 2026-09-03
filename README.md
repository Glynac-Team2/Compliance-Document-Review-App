# Compliance Document Review

A web app that closes the loop between advisors producing client-facing
material and the compliance officers who have to sign off on it before it
goes out.

- `backend/` — FastAPI + SQLAlchemy. Auth, roles, upload, document state
  machine, revision linking, audit trail, decisions. Real and tested.
- `frontend/` — React + Vite + Tailwind. Both dashboards, wired to the
  real backend endpoints (no mock data).

See each folder's README for setup. Quick start:

```bash
# terminal 1
docker compose up -d
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# terminal 2
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173, sign up as an advisor in one browser
(or incognito) tab and an officer in another, and run a document through
the full lifecycle.

## What's real vs. stubbed

Built and working: two-role auth with server-side enforcement, file
upload (PDF/DOCX/XLSX, 10MB cap), the officer queue and advisor
submissions list, decisions (approve / reject / needs revision) with a
required comment, revision resubmission linked into one thread, and an
append-only audit trail.

Stubbed on purpose: `GET /documents/{id}/assist` returns a fixed
placeholder response (or an "unavailable" response if `LLM_API_KEY`
isn't set) rather than calling a real LLM or vector store. That's the
AI and Data Engineering tracks' work — the frontend already builds
against the response shape (`AssistOut`), so plugging in the real
analysis shouldn't require frontend changes. This also means the
"review page still works when the AI is down" requirement is already
satisfied by default, not something to retrofit later.

Out of scope per the spec: per-officer routing/assignment, fine-tuning
or self-hosting a model, production-grade PII detection.

## Team tracks

| Track             | Status here                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| Backend           | Done for the core loop — see `backend/README.md` for what's real vs. stubbed |
| Frontend          | Done for the core loop — see `frontend/README.md`                            |
| AI                |Not Started |
| Data engineering  |pgvector models, PrecedentIndex/ComplianceCorpus tables,seeding pipeline merged |
| DevOps / platform | Postgres/pgvector via docker-compose, CI running tests on every push         |
