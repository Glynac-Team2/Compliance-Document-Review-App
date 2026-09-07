const BASE = "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (payload) =>
    fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  login: (payload) => {
    const form = new URLSearchParams();
    form.append("username", payload.email);
    form.append("password", payload.password);
    return fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    }).then(handle);
  },

  listDocuments: (statusFilter) => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return fetch(`${BASE}/documents${qs}`, { headers: authHeaders() }).then(handle);
  },

  getDocument: (id) =>
    fetch(`${BASE}/documents/${id}`, { headers: authHeaders() }).then(handle),

  getAssist: (id) =>
    fetch(`${BASE}/documents/${id}/assist`, { headers: authHeaders() }).then(handle),

  submitDocument: (file, revisesId) => {
    const form = new FormData();
    form.append("file", file);
    const qs = revisesId ? `?revises_id=${revisesId}` : "";
    return fetch(`${BASE}/documents${qs}`, {
      method: "POST",
      headers: authHeaders(), // don't set Content-Type — browser sets the multipart boundary
      body: form,
    }).then(handle);
  },

  decide: (id, status, comment) =>
    fetch(`${BASE}/documents/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status, comment }),
    }).then(handle),
};