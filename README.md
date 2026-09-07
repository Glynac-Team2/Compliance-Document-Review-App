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

Built and working: two-role auth with server-side enforcement, file upload (PDF/DOCX/XLSX, 10MB cap), the officer queue and advisor submissions list, decisions (approve / reject / needs revision) with a required comment, revision resubmission linked into one thread, an append-only audit trail, server-side PII masking (regex/heuristic per pii_masking_specification.md, tested), and AI-generated summary + flags via a free-tier LLM (Gemini), cached per document.

GET /documents/{id}/assist now runs the real pipeline: masks PII in code before anything leaves the app, checks a small static rule corpus (not yet wired to Data Engineering's PrecedentIndex/ComplianceCorpus tables — that integration is the next step), calls the LLM, and caches the result. If LLM_API_KEY isn't set or the call fails, it degrades to available: false without breaking the review page.

Stubbed on purpose: precedents in the assist response return empty until the AI track integrates with Data Engineering's precedent tables.

Out of scope per the spec: per-officer routing/assignment, fine-tuning or self-hosting a model, production-grade PII detection.

## Team tracks

| Track             | Status here                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| Backend           | Done for the core loop — see `backend/README.md` for what's real vs. stubbed |
| Frontend          | Done for the core loop — see `frontend/README.md`                            |
| AI                |Masking + LLM summary/flags done, tested end-to-end with a real key (3 PRs merged) |
| Data engineering  |pgvector models, PrecedentIndex/ComplianceCorpus tables,seeding pipeline merged |
| DevOps / platform | Postgres/pgvector via docker-compose, CI running tests on every push         |
