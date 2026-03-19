/**
 * auth.js — Authentication state management.
 *
 * All auth-related API calls and state live here.
 * The nav reads this module to decide which UI to render.
 *
 * Spring Boot endpoints consumed:
 *   GET  /api/v1/auth/me     → { id, email, name, picture, phone, company }
 *   POST /api/v1/auth/logout → clears HttpOnly JWT cookie
 *   GET  /oauth2/authorization/google → starts Google OAuth2 flow (backend redirect)
 */

import { API_BASE } from './api.js';

/** In-memory cache so we don't hammer /auth/me on every render */
let _currentUser = undefined; // undefined = not yet fetched, null = not logged in

/**
 * Returns the current user object, or null if not authenticated.
 * Uses in-memory cache; set forceRefresh=true to re-fetch.
 * @param {boolean} [forceRefresh]
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser(forceRefresh = false) {
  if (_currentUser !== undefined && !forceRefresh) return _currentUser;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000); // 3 s timeout
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include', // send the HttpOnly JWT cookie
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      _currentUser = await res.json();
    } else {
      _currentUser = null;
    }
  } catch {
    // backend not running yet (dev / static preview) or request timed out
    _currentUser = null;
  }
  return _currentUser;
}

/**
 * Trigger Google OAuth2 login.
 * Redirects the browser to the Spring Boot OAuth2 endpoint.
 */
export function loginWithGoogle() {
  // Save current page so we can redirect back after login
  sessionStorage.setItem('authRedirect', window.location.href);
  // Use window.location.origin so the request always goes through Nginx → backend
  window.location.href = `${window.location.origin}/oauth2/authorization/google`;
}

/**
 * Log out the current user.
 *
 * Navigates the browser directly to /api/v1/auth/logout (GET).
 * Spring Security's LogoutFilter intercepts it, clears the HttpOnly JWT cookie
 * via Set-Cookie: fp_token=; Max-Age=0, then 302-redirects back to the
 * frontend home page.
 *
 * Using a full page navigation (instead of fetch) guarantees the browser
 * applies the Set-Cookie header before the next page loads.
 */
export function logout() {
  _currentUser = null;
  sessionStorage.removeItem('authRedirect');
  // Full navigation → backend clears cookie → 302 → frontend home
  window.location.href = '/api/v1/auth/logout';
}
