/**
 * First-login onboarding — collect restaurant info so AI + quote forms
 * can prefill everywhere. Two steps, each skippable; shows once per user
 * (flag persisted in user.extra JSON as {"onboarded":true}).
 */
import { API_BASE } from './api.js?v=20260728w';

const TYPE_OPTIONS = [
  'Chinese', 'Cantonese / Dim Sum', 'Sichuan / Hunan', 'Hot Pot', 'Japanese / Sushi',
  'Ramen', 'Korean', 'Thai', 'Vietnamese / Pho', 'Indian', 'Middle Eastern',
  'Mediterranean / Greek', 'Mexican', 'Italian / Pizza', 'Burgers / Fast Food',
  'Fried Chicken', 'BBQ / Grill', 'Seafood / Fish & Chips', 'Cafe / Coffee Shop',
  'Bakery / Desserts', 'Bubble Tea / Juice', 'Ice Cream', 'Salad / Healthy',
  'Poke Bowl', 'Brunch / Breakfast', 'Food Truck', 'Other',
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function parseExtra(user) {
  try { return JSON.parse(user?.extra || '{}') || {}; } catch { return {}; }
}

export async function initOnboarding(user) {
  if (!user) return;
  const extra = parseExtra(user);
  if (extra.onboarded) return;
  // Returning user whose profile is already complete — never nag, just flag it.
  if (user.company && user.phone && user.address) { persist(user, extra, {}, true); return; }
  // Session guard: if the flag PUT failed earlier, don't re-pop every page view.
  if (sessionStorage.getItem('fp_onboard_seen')) return;
  sessionStorage.setItem('fp_onboard_seen', '1');

  // Guest designs are claimed on login — a brand kit may already exist. Use it.
  let kit = null;
  try {
    const res = await fetch(`${API_BASE}/design/kits`, { credentials: 'include' });
    if (res.ok) kit = ((await res.json()).kits || [])[0] || null;
  } catch {}

  render(user, extra, kit);
}

function persist(user, extra, fields, silent = false) {
  const body = { ...fields, extra: JSON.stringify({ ...extra, ...(fields._extra || {}), onboarded: true }) };
  delete body._extra;
  return fetch(`${API_BASE}/users/profile`, {
    method: 'PUT', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => { if (!silent) throw new Error(); });
}

function render(user, extra, kit) {
  const wrap = document.createElement('div');
  wrap.id = 'fp-onboard';
  wrap.className = 'fixed inset-0 bg-black/60 z-[9990] flex items-center justify-center p-4';
  wrap.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
      <div style="padding:36px 40px 30px" class="bg-primary-800 text-white">
        <div class="flex items-center gap-2 mb-5">
          <span id="ob-dot1" style="height:5px;max-width:44px;background:#fff" class="rounded-full flex-1"></span>
          <span id="ob-dot2" style="height:5px;max-width:44px;background:rgba(255,255,255,.28)" class="rounded-full flex-1"></span>
          <span class="text-xs text-primary-200 ml-1" id="ob-stepno">1 / 2</span>
        </div>
        <p class="font-extrabold text-2xl leading-snug tracking-tight">Tell us about your restaurant</p>
        <p class="text-primary-200 text-[15px] mt-2 leading-relaxed">So our AI can design and quote for you better — takes 20 seconds.</p>
      </div>
      <div style="padding:32px 40px 36px">

        <div id="ob-step1" class="space-y-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Restaurant name</label>
            <input type="text" id="ob-name" placeholder="e.g. Green Garden Café" value="${esc(kit?.brandText || user.company || '')}"
                   class="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px]">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Restaurant type</label>
            <select id="ob-type" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] bg-white">
              <option value="">Select type…</option>
              ${TYPE_OPTIONS.map(t => `<option${(kit?.restaurantType || extra.restaurantType) === t ? ' selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="flex items-center justify-between gap-4 pt-4">
            <button type="button" id="ob-skip1" class="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">Skip for now</button>
            <button type="button" id="ob-next" style="padding:12px 40px" class="bg-primary-800 hover:bg-primary-900 text-white text-[15px] font-bold rounded-xl shadow-lg shadow-primary-800/20 transition-colors">Next</button>
          </div>
        </div>

        <div id="ob-step2" class="hidden space-y-6">
          <div class="grid grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <input type="tel" id="ob-phone" placeholder="+1 (416) 000-0000" value="${esc(user.phone || kit?.phone || '')}"
                     class="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px]">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" id="ob-email" value="${esc(user.email || '')}" readonly title="From your Google account"
                     class="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] bg-gray-50 text-gray-500">
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Restaurant address</label>
            <input type="text" id="ob-address" placeholder="123 Queen St W, Toronto, ON" value="${esc(user.address || kit?.address || '')}"
                   class="w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px]">
          </div>
          <div class="flex items-center justify-between gap-4 pt-4">
            <button type="button" id="ob-skip2" class="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">Skip for now</button>
            <button type="button" id="ob-done" style="padding:12px 40px" class="bg-accent-500 hover:bg-accent-600 text-white text-[15px] font-bold rounded-xl shadow-lg shadow-accent-500/25 transition-colors">Finish</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const fields = {};
  const grab1 = () => {
    const name = document.getElementById('ob-name').value.trim();
    const type = document.getElementById('ob-type').value;
    if (name) fields.company = name;
    if (type) fields._extra = { restaurantType: type };
  };
  const showStep2 = () => {
    document.getElementById('ob-step1').classList.add('hidden');
    document.getElementById('ob-step2').classList.remove('hidden');
    document.getElementById('ob-dot2').style.background = '#fff';
    document.getElementById('ob-stepno').textContent = '2 / 2';
  };
  const close = () => {
    wrap.remove();
    persist(user, extra, fields, true);
  };

  document.getElementById('ob-next').onclick = () => { grab1(); showStep2(); };
  document.getElementById('ob-skip1').onclick = showStep2;
  document.getElementById('ob-skip2').onclick = close;
  document.getElementById('ob-done').onclick = () => {
    const phone = document.getElementById('ob-phone').value.trim();
    const address = document.getElementById('ob-address').value.trim();
    if (phone) fields.phone = phone;
    if (address) fields.address = address;
    close();
  };
}
