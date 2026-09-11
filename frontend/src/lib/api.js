// Example structure in frontend/src/lib/api.js

<<<<<<< HEAD
export async function listDocuments(status = '') {
  // ... implementation
}

export async function getDocument(id) {
  // ... implementation
}

export async function getAssist(id) {
  // ... implementation
}

export async function submitDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/documents', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload document');
  }
  
  return response.json();
}

export async function decide(id, status, comment) {
  // ... implementation
}
=======
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
        return fetch(`${BASE}/documents${qs}`, { headers: authHeaders() }).then(
            handle,
        );
    },

    getDocument: (id) =>
        fetch(`${BASE}/documents/${id}`, { headers: authHeaders() }).then(
            handle,
        ),

    getAssist: (id) =>
        fetch(`${BASE}/documents/${id}/assist`, {
            headers: authHeaders(),
        }).then(handle),

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
>>>>>>> 95e48294a03625f4d201623179f98f9760bcf8e7
