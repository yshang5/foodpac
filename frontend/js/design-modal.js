/**
 * design-modal.js — the site-wide AI design experience.
 *
 * One call to initDesignModal() gives any page:
 *   - the "Design Your Packaging" modal (form + brand colors + More Options)
 *   - the My Designs dock + floating chip (with generating animation)
 *   - the order modal (size/qty -> cart) and the guest login prompt
 *   - history restore (/design/my-designs) and the ?design=1 deep link
 *
 * Page hooks (all optional, used by the homepage hero swap):
 *   window.fpHeroStart(jobId) — called after a hero-mode submit succeeds
 *   window.fpAddResult(r)     — push an external result into the dock
 *   window.fpChipBusy(on)     — toggle the chip generating animation
 */

import { loginWithGoogle } from './auth.js?v=20260726f';
import { _refreshCartBadge } from './components.js?v=20260726f';

const FP_CSS = `
  .fp-swatch.sel { outline: 3px solid #1b5e20; outline-offset: 2px; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  #fp-dock-chip.generating .fp-chip-icon { animation: fp-chip-spin 1.1s linear infinite; }
  #fp-dock-chip.generating { animation: fp-chip-glow 1.4s ease-in-out infinite; }
  @keyframes fp-chip-spin { to { transform: rotate(360deg); } }
  @keyframes fp-chip-glow {
    0%,100% { box-shadow: 0 10px 15px -3px rgba(0,0,0,.25); }
    50%     { box-shadow: 0 0 18px 4px rgba(245,124,0,.6); }
  }
  /* When the Design Online FAB is present, stack the chip above it */
  body:has(#fp-fab) #fp-dock-chip { bottom: 5.5rem; }
`;

const FP_HTML = `
  <!-- ══════════ DESIGN ONLINE：表单弹窗 ══════════ -->
  <div id="fp-design-modal" class="hidden fixed inset-0 bg-black/60 z-[9990] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 bg-primary-800 text-white shrink-0">
        <div>
          <p class="font-bold">✨ Design Your Packaging</p>
          <p class="text-primary-200 text-xs mt-0.5">Free · 6 AI mockups in 1–2 minutes</p>
        </div>
        <button onclick="fpCloseDesign()" class="text-white/70 hover:text-white text-2xl leading-none">×</button>
      </div>
      <form id="fp-design-form" class="px-6 py-5 space-y-4 overflow-y-auto">
        <div>
          <label class="block text-sm font-bold text-gray-800 mb-1.5">Your brand name <span class="text-red-500">*</span></label>
          <input type="text" id="fpd-brand" required maxlength="30" placeholder="e.g. Golden Dragon Kitchen"
                 class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Brand color</label>
          <div class="flex items-center gap-3" id="fpd-swatches">
            <button type="button" data-c="#2e7d32" class="fp-swatch sel w-9 h-9 rounded-lg" style="background:#2e7d32" title="Green (default)"></button>
            <button type="button" data-c="#f57c00" class="fp-swatch w-9 h-9 rounded-lg" style="background:#f57c00" title="Orange"></button>
            <button type="button" data-c="#c62828" class="fp-swatch w-9 h-9 rounded-lg" style="background:#c62828" title="Red"></button>
            <button type="button" data-c="#1565c0" class="fp-swatch w-9 h-9 rounded-lg" style="background:#1565c0" title="Blue"></button>
            <button type="button" data-c="#212121" class="fp-swatch w-9 h-9 rounded-lg" style="background:#212121" title="Black"></button>
            <label class="fp-swatch h-9 px-3 rounded-lg cursor-pointer border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-2 relative transition-colors" title="Custom color">
              <span id="fpd-custom-view" class="w-4 h-4 rounded border border-gray-200" style="background:#2e7d32"></span>
              <span class="text-xs font-semibold text-gray-600">Custom</span>
              <input type="color" id="fpd-custom" value="#2e7d32" class="absolute inset-0 opacity-0 cursor-pointer">
            </label>
          </div>
        </div>

        <button type="button" id="fpd-more-toggle"
                class="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
          More Options
          <svg id="fpd-more-chevron" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <div id="fpd-more" class="hidden space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Logo <span class="text-gray-400 font-normal">(optional)</span></label>
            <label id="fpd-logo-drop" class="flex items-center gap-3 border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-lg px-4 py-3 cursor-pointer transition-colors">
              <svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16l4-4a3 3 0 014 0l4 4m-2-2l1-1a3 3 0 014 0l1 1M4 20h16M4 4h16v12H4z"/>
              </svg>
              <span id="fpd-logo-label" class="text-sm text-gray-500">Upload your logo (PNG / JPG, max 5MB)</span>
              <img id="fpd-logo-preview" class="hidden w-10 h-10 rounded object-contain border border-gray-200 ml-auto" alt="">
              <input type="file" id="fpd-logo" accept="image/*" class="hidden">
            </label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Restaurant type <span class="text-gray-400 font-normal">(optional)</span></label>
            <select id="fpd-type" class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white">
              <option value="">Select type…</option>
              <option>Chinese</option><option>Cantonese / Dim Sum</option><option>Sichuan / Hunan</option>
              <option>Hot Pot</option><option>Japanese / Sushi</option><option>Ramen</option>
              <option>Korean</option><option>Thai</option><option>Vietnamese / Pho</option>
              <option>Indian</option><option>Middle Eastern</option><option>Mediterranean / Greek</option>
              <option>Mexican</option><option>Italian / Pizza</option><option>Burgers / Fast Food</option>
              <option>Fried Chicken</option><option>BBQ / Grill</option><option>Seafood / Fish &amp; Chips</option>
              <option>Cafe / Coffee Shop</option><option>Bakery / Desserts</option><option>Bubble Tea / Juice</option>
              <option>Ice Cream</option><option>Salad / Healthy</option><option>Poke Bowl</option>
              <option>Brunch / Breakfast</option><option>Food Truck</option><option>Other</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Slogan <span class="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" id="fpd-slogan" placeholder="e.g. Fresh wok, every day"
                   class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
          </div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Address <span class="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" id="fpd-address" placeholder="123 Main St, Toronto"
                     class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Phone <span class="text-gray-400 font-normal">(optional)</span></label>
              <input type="tel" id="fpd-phone" placeholder="+1 (416) 000-0000"
                     class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Ordering QR code <span class="text-gray-400 font-normal">(optional)</span></label>
            <label class="flex items-center gap-3 border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-lg px-4 py-3 cursor-pointer transition-colors">
              <svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 17v3h-3"/>
              </svg>
              <span id="fpd-qr-label" class="text-sm text-gray-500">Upload the QR customers scan to order</span>
              <img id="fpd-qr-preview" class="hidden w-10 h-10 rounded object-contain border border-gray-200 ml-auto" alt="">
              <input type="file" id="fpd-qr" accept="image/*" class="hidden">
            </label>
          </div>
        </div>

        <div id="fpd-error" class="hidden text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"></div>
        <button type="submit" id="fpd-submit" disabled
                class="w-full py-3.5 bg-accent-500 hover:bg-accent-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-accent-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-500">
          ✨ Generate My Designs
        </button>
      </form>
    </div>
  </div>

  <!-- ══════════ 登录提示弹窗（游客第二次生成）══════════ -->
  <div id="fp-login-modal" class="hidden fixed inset-0 bg-black/60 z-[9995] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
      <div class="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
        </svg>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">Sign in to keep designing</h3>
      <p class="text-gray-500 text-sm mb-6">You've used your 2 free generations. Sign in with Google for unlimited designs — everything you've already created will be merged into your account.</p>
      <button id="fp-login-google"
              class="w-full py-3 bg-primary-800 hover:bg-primary-900 text-white font-bold rounded-xl transition-colors mb-3">
        Sign in with Google
      </button>
      <button onclick="document.getElementById('fp-login-modal').classList.add('hidden')"
              class="text-sm text-gray-400 hover:text-gray-600">Maybe later</button>
    </div>
  </div>

  <!-- ══════════ 结果悬浮面板：桌面右侧 / 移动端底部 ══════════ -->
  <div id="fp-dock" class="hidden fixed z-[9980] bg-white shadow-2xl border border-gray-200
        inset-x-0 bottom-0 rounded-t-2xl max-h-[45vh]
        lg:inset-x-auto lg:right-5 lg:top-32 lg:bottom-8 lg:w-96 lg:rounded-2xl lg:max-h-none
        flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3.5 bg-primary-800 text-white shrink-0">
      <div>
        <p class="font-bold text-sm">Your Designs <span id="fp-dock-count" class="text-primary-200 font-normal"></span></p>
        <p id="fp-dock-status" class="text-primary-200 text-xs mt-0.5">Generating…</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="fpOpenDesign()"
          class="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-bold rounded-lg transition-colors">+ New Design</button>
        <button onclick="fpToggleDock(false)" title="Minimize" class="text-white/70 hover:text-white text-2xl leading-none px-1.5">−</button>
      </div>
    </div>
    <div id="fp-dock-grid" class="flex lg:flex-col gap-4 p-4 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto no-scrollbar"></div>
  </div>

  <!-- 收起后的悬浮胶囊 -->
  <button id="fp-dock-chip" onclick="fpToggleDock(true)"
    class="hidden fixed bottom-5 right-5 z-[9980] items-center gap-2.5 px-5 py-3 bg-primary-800 hover:bg-primary-900 text-white text-sm font-bold rounded-2xl shadow-xl">
    <img src="assets/images/logo-icon-v2.png?v=9" alt="" class="fp-chip-icon w-5 h-5 rounded-full bg-white/90 object-contain">
    My Designs <span id="fp-chip-count" class="bg-accent-500 text-white text-xs font-bold rounded-full px-2 py-0.5"></span>
  </button>

  <!-- ══════════ 下单弹窗（选中设计 → 选规格 → 加购）══════════ -->
  <div id="fp-order-modal" class="hidden fixed inset-0 bg-black/60 z-[9992] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h3 class="text-lg font-bold text-gray-900">Order This Design</h3>
        <button onclick="document.getElementById('fp-order-modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
      </div>
      <form id="fp-order-form" class="px-6 py-5 space-y-4 overflow-y-auto">
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <img id="fpo-preview" src="" alt="Design" class="w-16 h-16 rounded-lg object-cover border border-gray-200">
          <div>
            <p id="fpo-label" class="text-sm font-bold text-gray-900"></p>
            <p class="text-xs text-gray-500">Selected design</p>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Size <span class="text-red-500">*</span></label>
          <select id="fpo-size" required class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white">
            <option value="">Loading sizes…</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Quantity <span class="text-red-500">*</span></label>
          <input type="number" id="fpo-qty" required min="1000" step="500" placeholder="Minimum 1,000"
                 class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
          <p class="text-xs text-gray-400 mt-1">Minimum order: 1,000 units</p>
        </div>
        <div id="fpo-error" class="hidden text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"></div>
        <button type="submit" id="fpo-submit"
                class="w-full py-3 bg-primary-800 hover:bg-primary-900 text-white font-bold rounded-xl transition-colors disabled:opacity-60">
          Add to Cart
        </button>
      </form>
    </div>
  </div>
`;

let _inited = false;

export function initDesignModal() {
  if (_inited || document.getElementById('fp-design-modal')) return;
  _inited = true;

  const style = document.createElement('style');
  style.textContent = FP_CSS;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', FP_HTML);

    // ══════════ Design Online（表单式设计）══════════
    const FP_API = '/api/v1';
    let fpJobId = localStorage.getItem('fp_last_job') || null;
    let fpPollTimer = null;
    let fpSeen = new Set();

    let fpModalMode = 'form';   // 'form' = Design Online 入口, 'hero' = 首屏光点入口
    const fpSyncSubmit = () => {
      document.getElementById('fpd-submit').disabled =
        !document.getElementById('fpd-brand').value.trim();
    };
    document.getElementById('fpd-brand').addEventListener('input', fpSyncSubmit);
    window.fpOpenDesign = (mode = 'form') => {
      fpModalMode = mode;
      document.getElementById('fp-design-modal').classList.remove('hidden');
      fpSyncSubmit();
      setTimeout(() => document.getElementById('fpd-brand').focus(), 50);
    };
    // More Options 折叠
    document.getElementById('fpd-more-toggle').addEventListener('click', () => {
      const more = document.getElementById('fpd-more');
      const open = more.classList.toggle('hidden');
      document.getElementById('fpd-more-chevron').style.transform = open ? '' : 'rotate(180deg)';
    });
    // 颜色选择
    let fpColor = '#2e7d32';
    document.querySelectorAll('#fpd-swatches .fp-swatch[data-c]').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#fpd-swatches .fp-swatch').forEach(s => s.classList.remove('sel'));
        b.classList.add('sel');
        fpColor = b.dataset.c;
      });
    });
    document.getElementById('fpd-custom').addEventListener('input', (e) => {
      fpColor = e.target.value;
      document.querySelectorAll('#fpd-swatches .fp-swatch').forEach(s => s.classList.remove('sel'));
      e.target.closest('.fp-swatch').classList.add('sel');
      document.getElementById('fpd-custom-view').style.background = fpColor;
    });
    window.fpCloseDesign = () => {
      document.getElementById('fp-design-modal').classList.add('hidden');
    };
    const fpChipBusy = window.fpChipBusy = (on) =>
      document.getElementById('fp-dock-chip')?.classList.toggle('generating', on);

    /** Push an externally-generated result (e.g. hero swap) into My Designs */
    window.fpAddResult = (r) => {
      if (fpSeen.has(r.id)) return;
      fpSeen.add(r.id);
      document.getElementById('fp-dock-grid').insertAdjacentHTML('afterbegin', fpCard(r));
      document.getElementById('fp-dock-count').textContent = `(${fpSeen.size})`;
      document.getElementById('fp-chip-count').textContent = fpSeen.size;
      const chip = document.getElementById('fp-dock-chip');
      if (document.getElementById('fp-dock').classList.contains('hidden')) {
        chip.classList.remove('hidden'); chip.classList.add('flex');
      }
    };

    window.fpToggleDock = (show) => {
      document.getElementById('fp-dock').classList.toggle('hidden', !show);
      const chip = document.getElementById('fp-dock-chip');
      chip.classList.toggle('hidden', show || fpSeen.size === 0);
      chip.classList.toggle('flex', !show && fpSeen.size > 0);
    };

    // 文件选择预览
    function fpWireFile(inputId, labelId, previewId) {
      const input = document.getElementById(inputId);
      input.addEventListener('change', () => {
        const f = input.files[0];
        if (!f) return;
        document.getElementById(labelId).textContent = f.name;
        const img = document.getElementById(previewId);
        img.src = URL.createObjectURL(f);
        img.classList.remove('hidden');
      });
    }
    fpWireFile('fpd-logo', 'fpd-logo-label', 'fpd-logo-preview');
    fpWireFile('fpd-qr', 'fpd-qr-label', 'fpd-qr-preview');

    async function fpUpload(file) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${FP_API}/design/uploads`, { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) throw new Error('upload failed');
      return (await res.json()).file;
    }

    document.getElementById('fp-design-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('fpd-error');
      const btn = document.getElementById('fpd-submit');
      err.classList.add('hidden');
      const brand = document.getElementById('fpd-brand').value.trim();
      const logoInput = document.getElementById('fpd-logo');
      if (!brand) {
        err.textContent = 'Please enter your brand name.';
        err.classList.remove('hidden');
        return;
      }
      btn.disabled = true; btn.textContent = 'Starting…';
      try {
        let res;
        if (fpModalMode === 'hero') {
          // 首屏品牌试穿：只重绘 4 张 hero 图（快）
          res = await fetch(`${FP_API}/design/hero-swap`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandText: brand, color: fpColor })
          });
        } else {
          // 完整设计：6 个产品 mockup
          btn.textContent = 'Uploading…';
          let logoFile = null, qrFile = null;
          if (logoInput.files[0]) logoFile = await fpUpload(logoInput.files[0]);
          const qrInput = document.getElementById('fpd-qr');
          if (qrInput.files[0]) qrFile = await fpUpload(qrInput.files[0]);
          btn.textContent = 'Starting generation…';
          res = await fetch(`${FP_API}/design/generate`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brandText: brand, brandColor: fpColor, logoFile,
              restaurantType: document.getElementById('fpd-type').value || null,
              slogan: document.getElementById('fpd-slogan').value.trim() || null,
              address: document.getElementById('fpd-address').value.trim() || null,
              phone: document.getElementById('fpd-phone').value.trim() || null,
              qrFile
            })
          });
        }
        if (res.status === 401) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'LOGIN_REQUIRED' || data.error === 'Unauthorized') {
            fpCloseDesign();
            document.getElementById('fp-login-modal').classList.remove('hidden');
            return;
          }
        }
        if (!res.ok) throw new Error();
        const { jobId } = await res.json();
        fpCloseDesign();
        if (fpModalMode === 'hero') {
          // 首页专属：毛玻璃 + Designing 徽章 + 轮询换图（由页面钩子接管）
          window.fpHeroStart?.(jobId);
        } else {
          fpJobId = jobId;
          localStorage.setItem('fp_last_job', jobId);
          document.getElementById('fp-dock-grid').insertAdjacentHTML('afterbegin', fpSkeletons(6));
          fpToggleDock(true);
          fpStartPolling();
        }
      } catch (ex) {
        err.textContent = 'Something went wrong. Please try again.';
        err.classList.remove('hidden');
      } finally {
        btn.textContent = '✨ Generate My Designs';
        fpSyncSubmit();
      }
    });

    function fpSkeletons(n) {
      return Array.from({ length: n }, () => `
        <div class="fp-skel shrink-0 w-40 lg:w-full">
          <div class="aspect-[4/3] rounded-xl bg-gray-100 animate-pulse"></div>
          <div class="h-3 w-24 bg-gray-100 rounded mt-2 animate-pulse"></div>
        </div>`).join('');
    }

    function fpStartPolling() {
      clearInterval(fpPollTimer);
      fpChipBusy(true);
      fpPollTimer = setInterval(fpPoll, 1500);
      fpPoll();
    }

    async function fpPoll() {
      if (!fpJobId) return;
      try {
        const res = await fetch(`${FP_API}/design/jobs/${fpJobId}`, { credentials: 'include' });
        if (!res.ok) { clearInterval(fpPollTimer); fpChipBusy(false); return; }
        const job = await res.json();
        const grid = document.getElementById('fp-dock-grid');
        job.results.forEach(r => {
          if (fpSeen.has(r.id)) return;
          fpSeen.add(r.id);
          const skel = grid.querySelector('.fp-skel');
          if (skel) skel.remove();
          grid.insertAdjacentHTML('beforeend', fpCard(r));
        });
        document.getElementById('fp-dock-count').textContent = `(${fpSeen.size})`;
        document.getElementById('fp-chip-count').textContent = fpSeen.size;
        const st = document.getElementById('fp-dock-status');
        if (job.status === 'COMPLETED') {
          st.textContent = 'Done — pick one to order, or redo with new info.';
          clearInterval(fpPollTimer);
          fpChipBusy(false);
          grid.querySelectorAll('.fp-skel').forEach(s => s.remove());
        } else if (job.status === 'FAILED') {
          st.textContent = 'Generation failed — please try again.';
          clearInterval(fpPollTimer);
          fpChipBusy(false);
          grid.querySelectorAll('.fp-skel').forEach(s => s.remove());
        } else {
          st.textContent = `Generating… ${fpSeen.size}/6`;
        }
      } catch {}
    }

    function fpCard(r) {
      return `
        <div class="shrink-0 w-40 lg:w-full group" id="fp-item-${r.id}">
          <div class="relative rounded-xl overflow-hidden border border-gray-200">
            <img src="${r.imageUrl}" alt="${r.productLabel}" class="w-full aspect-[4/3] object-cover">
            <button onclick="fpDeleteItem('${r.id}')" title="Delete"
              class="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-600 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
          </div>
          <div class="flex items-center justify-between mt-2 gap-2">
            <p class="text-xs font-semibold text-gray-700 truncate">${r.productLabel}</p>
            ${r.productType === 'HERO' ? '' : `<button onclick='fpOrder(${JSON.stringify(r)})'
              class="shrink-0 text-xs font-bold text-white bg-accent-500 hover:bg-accent-600 rounded-lg px-3 py-1.5 transition-colors">Order</button>`}
          </div>
        </div>`;
    }

    window.fpDeleteItem = async (id) => {
      document.getElementById(`fp-item-${id}`)?.remove();
      fpSeen.delete(id);
      document.getElementById('fp-dock-count').textContent = `(${fpSeen.size})`;
      document.getElementById('fp-chip-count').textContent = fpSeen.size;
      try { await fetch(`${FP_API}/design/job-items/${id}`, { method: 'DELETE', credentials: 'include' }); } catch {}
    };

    // ── 下单 ──
    let fpOrderCtx = null;
    window.fpOrder = async (r) => {
      fpOrderCtx = r;
      document.getElementById('fpo-preview').src = r.imageUrl;
      document.getElementById('fpo-label').textContent = r.productLabel;
      document.getElementById('fpo-qty').value = '';
      document.getElementById('fpo-error').classList.add('hidden');
      document.getElementById('fp-order-modal').classList.remove('hidden');
      const sizeEl = document.getElementById('fpo-size');
      sizeEl.innerHTML = '<option value="">Loading sizes…</option>';
      try {
        const res = await fetch(`${FP_API}/products/sizes/${r.productType}`);
        const sizes = await res.json();
        sizeEl.innerHTML = '<option value="">Select size…</option>' +
          sizes.map(s => `<option value="${s.label}">${s.label}</option>`).join('');
      } catch {
        sizeEl.innerHTML = '<option value="">Failed to load sizes</option>';
      }
    };

    document.getElementById('fp-order-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!fpOrderCtx) return;
      const err = document.getElementById('fpo-error');
      const btn = document.getElementById('fpo-submit');
      const size = document.getElementById('fpo-size').value;
      const qty = parseInt(document.getElementById('fpo-qty').value, 10);
      err.classList.add('hidden');
      if (!size || !qty || qty < 1000) {
        err.textContent = 'Please choose a size and a quantity of at least 1,000.';
        err.classList.remove('hidden');
        return;
      }
      btn.disabled = true; btn.textContent = 'Adding…';
      try {
        const res = await fetch(`${FP_API}/cart`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: fpOrderCtx.imageUrl,
            productType: fpOrderCtx.productType,
            productLabel: fpOrderCtx.productLabel,
            sizeSpec: size, material: null, quantity: qty
          })
        });
        if (res.status === 401) {
          document.getElementById('fp-order-modal').classList.add('hidden');
          document.getElementById('fp-login-modal').classList.remove('hidden');
          return;
        }
        if (!res.ok) throw new Error();
        document.getElementById('fp-order-modal').classList.add('hidden');
        _refreshCartBadge();
        const t = document.createElement('div');
        t.innerHTML = '✓ Added to cart &nbsp;<a href="cart.html" style="text-decoration:underline">View cart</a>';
        t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary-800 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg z-[99999]';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3500);
      } catch {
        err.textContent = 'Failed to add to cart. Please try again.';
        err.classList.remove('hidden');
      } finally {
        btn.disabled = false; btn.textContent = 'Add to Cart';
      }
    });

    // 页面加载：登录用户先合并游客历史，然后加载完整 My Designs
    (async () => {
      try {
        const me = await fetch(`${FP_API}/auth/me`, { credentials: 'include' });
        if (me.ok) await fetch(`${FP_API}/design/claim`, { method: 'POST', credentials: 'include' }).catch(() => {});
      } catch {}
      try {
        const res = await fetch(`${FP_API}/design/my-designs`, { credentials: 'include' });
        if (res.ok) {
          const { items } = await res.json();
          const grid = document.getElementById('fp-dock-grid');
          items.forEach(r => {
            if (fpSeen.has(r.id)) return;
            fpSeen.add(r.id);
            grid.insertAdjacentHTML('beforeend', fpCard(r));
          });
          if (fpSeen.size > 0) {
            document.getElementById('fp-dock-count').textContent = `(${fpSeen.size})`;
            document.getElementById('fp-chip-count').textContent = fpSeen.size;
            document.getElementById('fp-dock-status').textContent = 'Your saved designs';
            const chip = document.getElementById('fp-dock-chip');
            chip.classList.remove('hidden');
            chip.classList.add('flex');
          }
        }
      } catch {}
      // 上一个任务还在生成中则继续轮询
      if (fpJobId) {
        try {
          const res = await fetch(`${FP_API}/design/jobs/${fpJobId}`, { credentials: 'include' });
          if (res.ok) {
            const job = await res.json();
            if (job.status === 'RUNNING' || job.status === 'PENDING') { fpToggleDock(true); fpStartPolling(); }
          }
        } catch {}
      }
    })();

    // Deep link from design-history "Redesign": index.html?design=1 opens the modal
    if (new URLSearchParams(location.search).has('design')) fpOpenDesign();

    document.getElementById('fp-login-google')?.addEventListener('click', loginWithGoogle);
}
