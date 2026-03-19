/**
 * Packify integration — loads SDK, wires "Design Online" buttons,
 * shows generated images in a floating results panel.
 */

import { loginWithGoogle } from './auth.js';
import { _refreshCartBadge } from './components.js';

const PACKIFY_APP_ID      = 'DBoFUkjLlTIrcrXXYDghX';
const API_BASE            = '/api/v1';
const CART_PENDING_KEY    = '_fp_pendingCart';
const REOPEN_DESIGN_KEY   = '_fp_reopenDesign';

// ── Load SDK ──────────────────────────────────────────────────────────────────
function loadSDK() {
  return new Promise(resolve => {
    if (window.packify) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.packify.ai/api/packify-v0.0.2.js';
    s.onload = resolve;
    s.onerror = resolve;
    document.body.appendChild(s);
  });
}

// ── Add-to-Cart spec modal ────────────────────────────────────────────────────
function injectCartModal() {
  if (document.getElementById('fp-cart-modal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="fp-cart-modal" style="display:none"
         class="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900">Add to Cart</h3>
          <button id="fp-cart-modal-close" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form id="fp-cart-form" class="px-6 py-5 space-y-4">
          <input type="hidden" id="fp-cart-imageUrl">
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <img id="fp-cart-preview" src="" alt="Design" class="w-16 h-16 rounded-lg object-cover border border-gray-200">
            <p class="text-sm text-gray-500">Selected design</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Packaging Type <span class="text-red-500">*</span></label>
            <select id="fp-cart-type" required
                    style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:14px;">
              <option value="">Select type...</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Size <span class="text-red-500">*</span></label>
            <select id="fp-cart-size" required disabled
                    style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:14px;background:#f9fafb;color:#9ca3af;">
              <option value="">Select type first...</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <select id="fp-cart-material"
                    style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:14px;">
              <option value="">No preference</option>
              <option value="KRAFT">Kraft Paper (Brown)</option>
              <option value="WHITE_CARD">White Cardboard</option>
              <option value="FOIL">Foil Lined</option>
              <option value="PLASTIC">Plastic</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Quantity <span class="text-red-500">*</span></label>
            <input type="number" id="fp-cart-qty" required min="1000" step="500" placeholder="Minimum 1,000"
                   style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:14px;box-sizing:border-box;">
            <p class="text-xs text-gray-400 mt-1">Minimum order: 1,000 units</p>
          </div>
          <div id="fp-cart-error" style="display:none;color:#dc2626;background:#fef2f2;border-radius:8px;padding:8px 12px;font-size:14px;"></div>
          <button type="submit"
                  style="width:100%;padding:12px;background:#2e7d32;color:white;font-weight:600;border:none;border-radius:12px;font-size:15px;cursor:pointer;">
            Add to Cart
          </button>
        </form>
      </div>
    </div>
  `);

  document.getElementById('fp-cart-modal-close').onclick = _hideCartModal;

  fetch(`${API_BASE}/products/types`)
    .then(r => r.json())
    .then(types => {
      const sel = document.getElementById('fp-cart-type');
      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.key;
        opt.dataset.label = t.label;
        opt.textContent = t.label;
        sel.appendChild(opt);
      });
    }).catch(() => {});

  document.getElementById('fp-cart-type').addEventListener('change', async function() {
    const sizeEl = document.getElementById('fp-cart-size');
    sizeEl.innerHTML = '<option value="">Loading...</option>';
    sizeEl.disabled = true;
    sizeEl.style.color = '#9ca3af';
    if (!this.value) {
      sizeEl.innerHTML = '<option value="">Select type first...</option>';
      return;
    }
    try {
      const res  = await fetch(`${API_BASE}/products/sizes/${this.value}`);
      const data = await res.json();
      sizeEl.innerHTML = '<option value="">Select size...</option>';
      data.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.label;
        opt.textContent = s.label;
        sizeEl.appendChild(opt);
      });
      sizeEl.disabled = false;
      sizeEl.style.color = '';
      sizeEl.style.background = '';
    } catch {
      sizeEl.innerHTML = '<option value="">Failed to load sizes</option>';
    }
  });

  document.getElementById('fp-cart-form').addEventListener('submit', _submitCartForm);
}

function _showCartModal(imageUrl) {
  injectCartModal();
  document.getElementById('fp-cart-imageUrl').value = imageUrl;
  document.getElementById('fp-cart-preview').src    = imageUrl;
  document.getElementById('fp-cart-type').value     = '';
  document.getElementById('fp-cart-size').innerHTML = '<option value="">Select type first...</option>';
  document.getElementById('fp-cart-size').disabled  = true;
  document.getElementById('fp-cart-material').value = '';
  document.getElementById('fp-cart-qty').value      = '';
  document.getElementById('fp-cart-error').style.display = 'none';
  document.getElementById('fp-cart-modal').style.display = 'flex';
}

function _hideCartModal() {
  const m = document.getElementById('fp-cart-modal');
  if (m) m.style.display = 'none';
}

async function _submitCartForm(e) {
  e.preventDefault();
  const errEl    = document.getElementById('fp-cart-error');
  const imageUrl = document.getElementById('fp-cart-imageUrl').value;
  const typeEl   = document.getElementById('fp-cart-type');
  const sizeEl   = document.getElementById('fp-cart-size');
  const material = document.getElementById('fp-cart-material').value;
  const qty      = parseInt(document.getElementById('fp-cart-qty').value, 10);

  errEl.style.display = 'none';

  if (!typeEl.value || !sizeEl.value || !qty || qty < 1) {
    errEl.textContent = 'Please fill in all required fields.';
    errEl.style.display = 'block';
    return;
  }

  const productLabel = typeEl.options[typeEl.selectedIndex].dataset.label || typeEl.value;
  const submitBtn    = e.target.querySelector('button[type=submit]');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Adding...';

  try {
    const res = await fetch(`${API_BASE}/cart`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl,
        productType:  typeEl.value,
        productLabel,
        sizeSpec:     sizeEl.value,
        material:     material || null,
        quantity:     qty
      })
    });

    if (res.status === 401) {
      sessionStorage.setItem(CART_PENDING_KEY, JSON.stringify({
        imageUrl, productType: typeEl.value, productLabel,
        sizeSpec: sizeEl.value, material: material || null, quantity: qty
      }));
      sessionStorage.setItem(REOPEN_DESIGN_KEY, '1');
      _hideCartModal();
      loginWithGoogle();
      return;
    }
    if (!res.ok) throw new Error();

    _hideCartModal();
    _refreshCartBadge();
    _showAddedToast();
  } catch {
    errEl.textContent = 'Failed to add to cart. Please try again.';
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Add to Cart';
  }
}

// ── Results panel HTML ────────────────────────────────────────────────────────
function injectResultsPanel() {
  if (document.getElementById('fp-results-panel')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="fp-results-panel" style="display:none"
         class="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 bg-primary-800 text-white shrink-0">
          <div class="flex items-center gap-3">
            <img src="/assets/images/logo-icon.png" class="w-8 h-8 rounded-full object-contain bg-white p-0.5">
            <div>
              <div class="font-semibold text-base">Your Designs Are Ready</div>
              <div class="text-primary-200 text-xs">Select a design to add to your quote</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <a href="contact.html"
               class="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent-500 hover:bg-accent-600
                      text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
              Get a Free Quote
            </a>
            <button id="fp-results-close" class="text-white/70 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>
        <!-- Grid -->
        <div id="fp-results-grid"
             class="grid grid-cols-2 gap-4 p-6 overflow-y-auto">
          <!-- images injected here -->
        </div>
        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-between items-center">
          <button id="fp-results-redesign"
                  class="text-sm text-primary-700 hover:text-primary-900 font-medium flex items-center gap-1">
            ↺ Design again
          </button>
          <button id="fp-results-done"
                  class="px-5 py-2 bg-primary-800 hover:bg-primary-900 text-white text-sm font-semibold rounded-lg transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('fp-results-close').onclick  = hideResults;
  document.getElementById('fp-results-done').onclick   = hideResults;
  document.getElementById('fp-results-redesign').onclick = () => {
    hideResults();
    openDesign();
  };
}

function showResults(imageUrls) {
  const grid = document.getElementById('fp-results-grid');
  grid.innerHTML = imageUrls.map((url, i) => `
    <div class="group relative rounded-xl overflow-hidden border border-gray-200 hover:border-primary-400 transition-colors cursor-pointer">
      <img src="${url}" alt="Design ${i + 1}" class="w-full aspect-square object-cover">
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center p-3 opacity-0 group-hover:opacity-100">
        <button onclick="window._fpAddToCart('${url}')"
                class="w-full py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg shadow transition-colors">
          Add to Cart
        </button>
      </div>
    </div>
  `).join('');
  document.getElementById('fp-results-panel').style.display = 'flex';
}

function hideResults() {
  document.getElementById('fp-results-panel').style.display = 'none';
}

// ── Inject "Add to Cart" into Packify's in-chat image hover bar ───────────────
function _patchEditorBar(bar) {
  if (bar.dataset.fpPatched) return;
  bar.dataset.fpPatched = '1';

  // Hide the Download button using its GTM attribute
  const dl = bar.querySelector('[gtm="ga-click_chat_design_result_download"]');
  if (dl) dl.style.display = 'none';
  // Also hide the separator that was between Use and Download
  const sep = bar.querySelector('[class*="itemAfter2_line"]');
  if (sep) sep.style.display = 'none';

  // Add "Add to Cart" styled to match the other items
  const btn = document.createElement('div');
  btn.className = 'editBar_item itemAfter1';
  btn.style.cssText = 'color:#2e7d32;font-weight:600;';
  btn.textContent = 'Add to Cart';
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const img = bar.closest('.imgBox')?.querySelector('img');
    window._fpAddToCart(img?.src || '');
  });
  bar.appendChild(btn);
}

function _watchEditorBars() {
  // Patch any bars already in DOM
  document.querySelectorAll('.editorBar').forEach(_patchEditorBar);
  // Watch for future bars (they appear on hover)
  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.classList.contains('editorBar')) { _patchEditorBar(node); }
        else node.querySelectorAll?.('.editorBar').forEach(_patchEditorBar);
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// ── FAB ───────────────────────────────────────────────────────────────────────
function injectFAB() {
  if (document.getElementById('fp-fab')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <button id="fp-fab"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5
             bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold rounded-2xl
             shadow-lg shadow-accent-500/30 hover:shadow-xl hover:shadow-accent-500/40
             hover:-translate-y-0.5 transition-all duration-200">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      ✨ Design Online
    </button>
  `);
  document.getElementById('fp-fab').addEventListener('click', () => openDesign());
}

// ── Open Packify ──────────────────────────────────────────────────────────────
export function openDesign(opts = {}) {
  if (!window.packify) {
    alert('Design service is loading, please try again in a moment.');
    return;
  }
  window.packify.openDesign(opts);
}

// ── Init ──────────────────────────────────────────────────────────────────────
export async function initPackify() {
  await loadSDK();
  await window.packify?.init({
    appId:    PACKIFY_APP_ID,
    language: navigator.language?.startsWith('zh') ? 'zh' : 'en',
    packifyConfig: {
      themeColor:    '#2e7d32',
      enterpriseLogo: window.location.origin + '/assets/images/logo-icon.png',
      numberOfDesignImages: 4
    }
  });

  injectResultsPanel();
  _watchEditorBars();

  injectFAB();

  // Wire all "Design Online" buttons/links on the page
  document.querySelectorAll('[data-open-design]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); openDesign(); });
  });
  // Also support legacy onclick="openDesignWidget && openDesignWidget()"
  window.openDesignWidget = openDesign;

  // Re-open Packify if user was redirected here after login while trying to add to cart
  if (sessionStorage.getItem(REOPEN_DESIGN_KEY)) {
    sessionStorage.removeItem(REOPEN_DESIGN_KEY);
    setTimeout(() => openDesign(), 500);
  }

  // Receive results from Packify
  window.packify?.eventBus?.on('getDesignResults', async ({ projectId, list }) => {
    if (!list?.length) return;
    showResults(list);
    // Save to backend (best-effort, for logged-in users)
    try {
      const meRes = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (meRes.ok) {
        // Create a session to attach the results to
        const sessRes = await fetch(`${API_BASE}/design/sessions`, {
          method: 'POST', credentials: 'include'
        });
        if (sessRes.ok) {
          const sess = await sessRes.json();
          await fetch(`${API_BASE}/design/sessions/${sess.id}/results`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: list })
          });
        }
      }
    } catch {}
  });

  // Add to cart — open spec form modal (handles auth inside the form submit)
  window._fpAddToCart = (imageUrl) => {
    if (!imageUrl) return;
    _showCartModal(imageUrl);
  };

  function _showAddedToast() {
    const t = document.createElement('div');
    t.innerHTML = `✓ Added to cart &nbsp;<a href="cart.html" style="text-decoration:underline">View cart</a>`;
    t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-[99999] transition-opacity duration-300';
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  }
}
