// Example structure in frontend/src/lib/api.js

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