const BASE = import.meta.env.VITE_API_URL || "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (Array.isArray(body.detail)) {
        detail = body.detail.map((d) => d.message).join(", ");
      } else if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // response wasn't JSON - fall back to statusText
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listDocuments(status = "") {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetch(`${BASE}/documents${qs}`, { headers: authHeaders() }).then(
    handle,
  );
}

export async function getDocument(id) {
  return fetch(`${BASE}/documents/${id}`, { headers: authHeaders() }).then(
    handle,
  );
}

export async function getAssist(id) {
  return fetch(`${BASE}/documents/${id}/assist`, {
    headers: authHeaders(),
  }).then(handle);
}

export async function submitDocument(file, revisesId) {
  const form = new FormData();
  form.append("file", file);
  const qs = revisesId ? `?revises_id=${revisesId}` : "";
  return fetch(`${BASE}/documents${qs}`, {
    method: "POST",
    headers: authHeaders(), // don't set Content-Type - browser sets the multipart boundary
    body: form,
  }).then(handle);
}

export async function decide(id, status, comment) {
  return fetch(`${BASE}/documents/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status, comment }),
  }).then(handle);
}

async function fetchBlob(path) {
  const res = await fetch(path, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (Array.isArray(body.detail)) {
        detail = body.detail.map((d) => d.message).join(", ");
      } else if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // Unhandled
    }

    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.blob();
}

async function download(id) {
  return fetchBlob(`${BASE}/documents/${id}/download`);
}

async function preview(id) {
  return fetchBlob(`${BASE}/documents/${id}/preview`);
}

export const api = {
  listDocuments,
  getDocument,
  getAssist,
  submitDocument,
  decide,
  download,
  preview,
  signup: (payload) =>
    fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),
  login: (payload) => {
    const form = new URLSearchParams();
    // FastAPI's OAuth2PasswordRequestForm requires the field to be named
    // "username", even though our app logs in with an email address.
    form.append("username", payload.email);
    form.append("password", payload.password);
    return fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    }).then(handle);
  },
};
