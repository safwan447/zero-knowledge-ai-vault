const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Thin wrapper around fetch - always sends credentials (so the httpOnly
 * JWT cookie is included) and always parses/returns JSON, throwing a
 * readable error on non-2xx responses.
 */
async function apiRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include', // sends the httpOnly cookie set by /api/auth
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || data.message || `Request failed (${response.status})`);
  }

  return data;
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};
