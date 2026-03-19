/**
 * components.js — Shared UI components injected into every page.
 *
 * Usage in HTML:
 *   <div id="navbar"></div>
 *   <div id="footer"></div>
 *   <script type="module">
 *     import { initNav, initFooter } from './js/components.js';
 *     initNav('products');   // pass active page key
 *     initFooter();
 *   </script>
 */

import { getCurrentUser, loginWithGoogle, logout } from './auth.js';
import { avatarHtml } from './avatar.js';
import { API_BASE } from './api.js';

const CART_PENDING_KEY = '_fp_pendingCart';

const NAV_LINKS = [
  { key: 'products',  label: 'Products',     href: 'products.html' },
  { key: 'solutions', label: 'Solutions',    href: 'index.html#restaurant-types' },
  { key: 'why',       label: 'Why foodPac',  href: 'index.html#why-foodpac' },
  { key: 'how',       label: 'How It Works', href: 'index.html#how-it-works' },
  { key: 'about',     label: 'About',        href: 'about.html' },
];

/**
 * Tailwind Play CDN injects base-utility stylesheets AFTER responsive ones,
 * so `hidden md:flex` renders as `display:none` at ALL widths because `.hidden`
 * (sheet N+1) overrides `@media{.md\:flex}` (sheet N).
 * Fix: append a <style> that re-declares responsive display rules with !important
 * so they always beat the `hidden` class regardless of sheet order.
 */
function _fixTailwindResponsive() {
  if (document.getElementById('fp-tw-fix')) return;
  const s = document.createElement('style');
  s.id = 'fp-tw-fix';
  s.textContent = [
    '@media(min-width:1024px){',
    '.lg\\:grid{display:grid!important}',
    '.lg\\:block{display:block!important}',
    '.lg\\:flex{display:flex!important}',
    '.lg\\:inline-flex{display:inline-flex!important}',
    '.lg\\:hidden{display:none!important}',
    '}',
    '@media(min-width:768px){',
    '.md\\:flex{display:flex!important}',
    '.md\\:block{display:block!important}',
    '.md\\:grid{display:grid!important}',
    '.md\\:inline-flex{display:inline-flex!important}',
    '.md\\:hidden{display:none!important}',
    '}',
    '@media(min-width:640px){',
    '.sm\\:inline-flex{display:inline-flex!important}',
    '.sm\\:flex{display:flex!important}',
    '.sm\\:block{display:block!important}',
    '.sm\\:grid{display:grid!important}',
    '.sm\\:hidden{display:none!important}',
    '}',
  ].join('');
  document.head.appendChild(s);
}

export async function initNav(activePage = '') {
  const el = document.getElementById('navbar');
  if (!el) return;

  _fixTailwindResponsive();

  const links = NAV_LINKS.map(({ key, label, href }) => {
    const isActive = key === activePage;
    return `<a href="${href}"
      class="nav-link px-5 py-7 text-[15px] font-medium transition-colors inline-flex items-center
        ${isActive ? 'text-primary-800' : 'text-gray-700 hover:text-primary-800'}">
      ${label}
    </a>`;
  }).join('');

  const mobileLinks = NAV_LINKS.map(({ label, href }) =>
    `<a href="${href}" class="px-4 py-3 text-[15px] font-medium text-gray-700 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors block">${label}</a>`
  ).join('');

  el.innerHTML = `
    <header class="sticky top-0 z-50">

      <!-- ── Top info bar ───────────────────────────────────── -->
      <div class="bg-primary-800 text-white text-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <span class="hidden sm:block text-white/75">
            🌱 Canada's Eco-Friendly Packaging Partner — Custom branded, low MOQ, fast delivery
          </span>
          <div class="flex items-center gap-5 ml-auto text-white/80">
            <a href="mailto:hello@foodpac.ca" class="flex items-center gap-1.5 hover:text-white transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              hello@foodpac.ca
            </a>
            <span class="hidden md:flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Toronto, Canada
            </span>
          </div>
        </div>
      </div>

      <!-- ── Main nav ───────────────────────────────────────── -->
      <div class="bg-white border-b border-gray-200 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">

            <!-- Logo -->
            <a href="index.html" class="flex items-center shrink-0">
              <img src="assets/images/logo-horizontal.png"
                   alt="foodPac"
                   class="h-14 w-auto"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
              <span class="hidden items-center" id="logo-fallback">
                <span class="text-2xl font-extrabold tracking-tight">
                  <span class="text-primary-800">food</span><span class="text-primary-600">Pac</span>
                </span>
              </span>
            </a>

            <!-- Desktop nav -->
            <nav class="hidden md:flex items-center gap-0">
              ${links}
            </nav>

            <!-- CTA + user icon + mobile toggle -->
            <div class="flex items-center gap-3">
              <a href="contact.html"
                 class="hidden sm:inline-flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-accent-500/25 hover:shadow-lg hover:shadow-accent-500/30 hover:-translate-y-px">
                Get a Free Quote
              </a>

              <!-- Cart icon -->
              <a href="cart.html" id="cartIconBtn" title="My Cart"
                 class="relative flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:text-primary-800 hover:bg-gray-100 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <span id="cartBadge" class="hidden absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"></span>
              </a>

              <!-- User icon area — filled by JS after auth check -->
              <div id="userMenuDesktop" class="relative flex items-center"></div>

              <button id="menuToggle" class="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div id="mobileMenu" class="hidden md:hidden border-t border-gray-100 bg-white px-4 pb-5 pt-3 shadow-lg">
        <!-- Mobile user area — filled by JS -->
        <div id="userMenuMobile" class="mb-3 pb-3 border-b border-gray-100"></div>
        <nav class="flex flex-col gap-1 mb-4">
          ${mobileLinks}
          <a href="cart.html" class="px-4 py-3 text-[15px] font-medium text-gray-700 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-2 block">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            My Cart <span id="cartBadgeMobile" class="hidden ml-1 bg-accent-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none"></span>
          </a>
        </nav>
        <a href="contact.html"
           class="flex items-center justify-center px-6 py-3 bg-accent-500 text-white text-sm font-bold rounded-xl">
          Get a Free Quote
        </a>
      </div>
    </header>
  `;

  // Mobile menu toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('mobileMenu')?.classList.toggle('hidden');
  });
  document.querySelectorAll('#mobileMenu a').forEach(a =>
    a.addEventListener('click', () =>
      document.getElementById('mobileMenu')?.classList.add('hidden')
    )
  );

  // Populate auth UI
  const user = await getCurrentUser();
  _renderUserMenu(user);

  if (user) {
    // Process any pending "add to cart" from before login
    const pending = sessionStorage.getItem(CART_PENDING_KEY);
    if (pending) {
      sessionStorage.removeItem(CART_PENDING_KEY);
      try {
        const data = JSON.parse(pending);
        const res = await fetch(`${API_BASE}/cart`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) _showCartToast('Design added to cart!');
      } catch {}
    }
    // Load cart badge count
    _refreshCartBadge();
  }
}

/** Fetch cart count and update badge(s) */
export async function _refreshCartBadge() {
  try {
    const res = await fetch(`${API_BASE}/cart`, { credentials: 'include' });
    if (!res.ok) return;
    const items = await res.json();
    const count = items.length;
    ['cartBadge', 'cartBadgeMobile'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (count > 0) {
        el.textContent = count > 99 ? '99+' : count;
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  } catch {}
}

/** Show a brief success toast */
function _showCartToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-[99999] transition-opacity duration-300';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
}

/** Render the user icon / avatar for both desktop and mobile */
function _renderUserMenu(user) {
  const desktop = document.getElementById('userMenuDesktop');
  const mobile  = document.getElementById('userMenuMobile');
  if (!desktop) return;

  if (!user) {
    // ── Not logged in ──────────────────────────────────────
    const loginBtn = `
      <button id="loginBtn"
        title="Sign in"
        class="flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:text-primary-800 hover:bg-gray-100 transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
            d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
        </svg>
      </button>`;
    desktop.innerHTML = loginBtn;
    if (mobile) mobile.innerHTML = `
      <button id="loginBtnMobile"
        class="w-full flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-gray-700 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
            d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
        </svg>
        Sign in with Google
      </button>`;

    document.getElementById('loginBtn')?.addEventListener('click', loginWithGoogle);
    document.getElementById('loginBtnMobile')?.addEventListener('click', loginWithGoogle);

  } else {
    // ── Logged in ──────────────────────────────────────────
    const avatar = avatarHtml(user, 32);

    // Desktop — hover dropdown
    desktop.innerHTML = `
      <div class="group relative">
        <button class="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none">
          ${avatar}
          <svg class="w-3.5 h-3.5 text-gray-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <!-- Dropdown -->
        <div class="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    translate-y-1 group-hover:translate-y-0 transition-all duration-150 z-50">
          <div class="px-4 py-3 border-b border-gray-100">
            <p class="text-sm font-semibold text-gray-900 truncate">${user.name || ''}</p>
            <p class="text-xs text-gray-400 truncate mt-0.5">${user.email || ''}</p>
          </div>
          <div class="py-1">
            <a href="profile.html"
               class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              My Profile
            </a>
            <a href="orders.html"
               class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              My Orders
            </a>
          </div>
          <div class="border-t border-gray-100 py-1">
            <button id="logoutBtn"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </div>`;

    // Mobile — inline links
    if (mobile) mobile.innerHTML = `
      <div class="flex items-center gap-3 px-4 py-3">
        ${avatar}
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">${user.name || ''}</p>
          <p class="text-xs text-gray-400 truncate">${user.email || ''}</p>
        </div>
      </div>
      <a href="profile.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 rounded-lg">My Profile</a>
      <a href="orders.html" class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 rounded-lg">My Orders</a>
      <button id="logoutBtnMobile" class="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-lg">Sign out</button>`;

    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', logout);
  }
}

export function initFooter() {
  const el = document.getElementById('footer');
  if (!el) return;

  el.innerHTML = `
    <footer class="bg-primary-900 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-10">

          <div class="lg:col-span-1">
            <div class="flex items-center gap-2.5 mb-4">
              <img src="assets/images/logo-icon.png"
                   alt="foodPac"
                   class="h-9 w-9 object-contain rounded-xl"
                   onerror="this.style.display='none'">
              <span class="text-xl font-bold">
                <span class="text-white">food</span><span style="color:#f57c00">Pac</span>
              </span>
            </div>
            <span class="hidden text-xl font-bold mb-4 block">
              <span class="text-white">food</span><span class="text-accent-400">Pac</span>
            </span>
            <p class="text-white/60 text-sm leading-relaxed mb-5">
              Professional Takeaway Solutions for independent restaurants across Canada.
            </p>
            <div class="flex gap-3">
              <a href="#" aria-label="Facebook"
                 class="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" aria-label="Instagram"
                 class="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 class="font-semibold mb-4 text-white/90">Products</h4>
            <ul class="space-y-2 text-sm text-white/60">
              <li><a href="products.html?cat=boxes"   class="hover:text-white transition-colors">Takeout Boxes</a></li>
              <li><a href="products.html?cat=cups"    class="hover:text-white transition-colors">Cups & Lids</a></li>
              <li><a href="products.html?cat=bags"    class="hover:text-white transition-colors">Paper Bags</a></li>
              <li><a href="products.html?cat=bowls"   class="hover:text-white transition-colors">Bowls</a></li>
              <li><a href="products.html?cat=wraps"   class="hover:text-white transition-colors">Wrapping Paper</a></li>
              <li><a href="products.html?cat=cutlery" class="hover:text-white transition-colors">Cutlery Sets</a></li>
            </ul>
          </div>

          <div>
            <h4 class="font-semibold mb-4 text-white/90">Company</h4>
            <ul class="space-y-2 text-sm text-white/60">
              <li><a href="about.html"              class="hover:text-white transition-colors">About Us</a></li>
              <li><a href="index.html#how-it-works" class="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="contact.html"            class="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 class="font-semibold mb-4 text-white/90">Contact</h4>
            <ul class="space-y-3 text-sm text-white/60">
              <li class="flex items-start gap-2">
                <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <span>hello@foodpac.ca</span>
              </li>
              <li class="flex items-start gap-2">
                <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Toronto, Ontario<br>Canada</span>
              </li>
            </ul>
            <a href="contact.html"
               class="inline-flex items-center mt-5 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors">
              Get a Quote
            </a>
          </div>
        </div>

        <div class="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-white/40">
          <p>© 2025 foodPac. All rights reserved.</p>
          <div class="flex gap-6">
            <a href="#" class="hover:text-white/70 transition-colors">Privacy Policy</a>
            <a href="#" class="hover:text-white/70 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}
