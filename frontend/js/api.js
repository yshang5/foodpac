/**
 * api.js — All backend API calls live here.
 *
 * Base URL switches automatically between local dev and production.
 * Spring Boot backend is expected at /api/v1/...
 *
 * To wire up: replace the TODO stubs with real fetch() calls once
 * the Spring Boot endpoints are live.
 */

// Always use relative URLs — Nginx (Docker) and production both proxy /api/ → backend.
// For pure frontend-only dev (npx serve), API calls gracefully fail and show unauthenticated state.
export const API_BASE = '/api/v1';

/** Generic fetch wrapper with JSON handling and error normalisation */
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ── Quotes ──────────────────────────────────────────────────── */

/**
 * Submit a quote request.
 * @param {Object} payload  Form data matching QuoteRequestDTO on the backend
 * @returns {Promise<{ id: string }>}
 *
 * Spring Boot endpoint: POST /api/v1/quotes
 */
export async function submitQuote(payload) {
  return request('/contact', { method: 'POST', body: JSON.stringify(payload) });
}

/* ── Products ────────────────────────────────────────────────── */

/**
 * Fetch all products, optionally filtered by category.
 * @param {string} [category]  e.g. 'boxes', 'cups' — omit for all
 * @returns {Promise<Product[]>}
 *
 * Spring Boot endpoint: GET /api/v1/products?category=boxes
 */
export async function fetchProducts(category) {
  // TODO: uncomment when backend is ready
  // const qs = category && category !== 'all' ? `?category=${category}` : '';
  // return request(`/products${qs}`);

  // Temporary: use local data from products.js
  const { getProducts } = await import('./products.js');
  return getProducts(category);
}
