# Frontend — Compliance Document Review

React + Vite + Tailwind + React Router. Talks to the FastAPI backend
through `/api` (see `vite.config.js` — the dev server proxies that to
`http://localhost:8000`).

## Setup

```bash
cd frontend
npm install
npm run dev
```

Runs at http://localhost:5173. The backend must be running separately
(see `../backend/README.md`) or every call will fail.

## Structure

```
src/
  lib/
    api.js            fetch wrapper — every backend call goes through here
    AuthContext.jsx    holds the logged-in user + token, drives redirects
  components/
    Layout.jsx         header + sign-out
    RequireRole.jsx     UI-side route gate (backend is the real gate)
    AssistPanel.jsx     calls GET /documents/{id}/assist, renders its states
    Badges.jsx          status pill + severity tag, shared everywhere
  pages/
    Login.jsx, Signup.jsx
    AdvisorDashboard.jsx   upload + submissions list + resubmit flow
    OfficerDashboard.jsx   queue + document detail + decision + assist
```

## Things to know before extending this

- **Role gating is cosmetic here on purpose.** `RequireRole` just decides
  what renders — the backend's `require_role` dependency is the actual
  boundary. Don't add logic here that assumes the frontend check is
  sufficient.
- **AssistPanel already handles the degraded state.** If the backend's
  `/assist` endpoint returns `available: false` (no `LLM_API_KEY` set) or
  the request fails outright, the panel shows a retry — the rest of the
  page, including the decision buttons, stays fully usable. Don't add a
  loading blocker around the whole review page for this.
- **Revision threads** come from the backend's `thread` field on
  `GET /documents/{id}` — it's already walked and ordered oldest-first,
  so render it as-is rather than re-deriving it client-side.
