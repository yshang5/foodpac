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

import { loginWithGoogle } from './auth.js?v=20260728y';
import { _refreshCartBadge } from './components.js?v=20260728y';
import { STYLE_LIBRARY, styleImg, styleThumb, getStyle, setStyle } from './styles.js?v=20260728y';

const FP_CSS = `
  .fp-swatch.sel { outline: 3px solid #1b5e20; outline-offset: 2px; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  #fp-dock-chip.generating .fp-chip-icon { animation: fp-chip-spin 1.1s linear infinite; }
  .fp-genglass { background: rgba(255,255,255,.35); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
  /* Safari 的嵌套 flex min-height 链不可靠——滚动区直接给显式高度上限 */
  @media (min-width:1024px) { .fp-form-scroll { max-height: calc(92vh - 148px); } }
  .fp-genspin { animation: fp-chip-spin 1.1s linear infinite; }
  #fp-dock-chip.generating { animation: fp-chip-glow 1.4s ease-in-out infinite; }
  @keyframes fp-chip-spin { to { transform: rotate(360deg); } }
  @keyframes fp-chip-glow {
    0%,100% { box-shadow: 0 10px 15px -3px rgba(0,0,0,.25); }
    50%     { box-shadow: 0 0 18px 4px rgba(245,124,0,.6); }
  }
`;

const FP_HTML = `
  <!-- ══════════ DESIGN ONLINE：表单弹窗 ══════════ -->
  <div id="fp-design-modal" class="hidden fixed inset-0 bg-black/60 z-[9990] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg lg:max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 bg-primary-800 text-white shrink-0">
        <div>
          <p class="font-bold">✨ Design Your Packaging</p>
          <p class="text-primary-200 text-xs mt-0.5">Free · 4 AI mockups in ~1 minute</p>
        </div>
        <button onclick="fpCloseDesign()" class="text-white/70 hover:text-white text-2xl leading-none">×</button>
      </div>
      <div class="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">

        <!-- 左侧：参考风格（全家福 + 换风格） -->
        <aside class="lg:w-[44%] shrink-0 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-100 px-6 py-5 lg:overflow-y-auto">
          <p class="text-sm font-bold text-gray-800 mb-2.5">Reference style</p>
          <div class="relative aspect-[3/2] rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
            <img id="fps-family" src="" alt="Style reference"
                 class="w-full h-full object-cover opacity-0 transition-opacity duration-300">
          </div>
          <div class="flex items-center justify-between gap-3 mt-3">
            <div class="min-w-0">
              <p id="fps-name" class="text-sm font-bold text-gray-900 truncate"></p>
              <p id="fps-type" class="text-xs text-gray-500 truncate"></p>
            </div>
            <button type="button" onclick="fpOpenStylePicker()"
                    class="shrink-0 px-3.5 py-2 text-xs font-bold text-primary-800 bg-white border border-primary-200 hover:bg-primary-50 rounded-lg transition-colors">
              Change Style
            </button>
          </div>
          <p class="text-xs text-gray-400 mt-3 leading-relaxed">We'll repaint this packaging style with your brand name and color — box, cup, bag and the full set.</p>
        </aside>

        <!-- 右侧：表单 -->
        <form id="fp-design-form" class="flex-1 min-h-0 flex flex-col">
        <!-- 滚动区：所有字段；按钮在滚动区外固定 -->
        <div class="fp-form-scroll flex-1 min-h-0 px-6 py-5 space-y-4 overflow-y-auto">
        <div>
          <label class="block text-sm font-bold text-gray-800 mb-1.5">Your brand name <span class="text-red-500">*</span></label>
          <div class="relative">
            <input type="text" id="fpd-brand" required maxlength="30" placeholder="e.g. Golden Dragon Kitchen"
                   class="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm">
            <button type="button" id="fpd-kit-toggle" title="Your saved brand kits"
                    class="hidden absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div id="fpd-kit-menu" class="hidden absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto py-1"></div>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Brand color</label>
          <div class="flex items-center flex-wrap gap-2.5" id="fpd-swatches">
            <button type="button" data-c="#4a7c59" class="fp-swatch sel w-8 h-8 rounded-lg" style="background:#4a7c59" title="Forest (default)"></button>
            <button type="button" data-c="#c1683c" class="fp-swatch w-8 h-8 rounded-lg" style="background:#c1683c" title="Terracotta"></button>
            <button type="button" data-c="#a13e34" class="fp-swatch w-8 h-8 rounded-lg" style="background:#a13e34" title="Brick Red"></button>
            <button type="button" data-c="#46618c" class="fp-swatch w-8 h-8 rounded-lg" style="background:#46618c" title="Porcelain Blue"></button>
            <button type="button" data-c="#c49a2f" class="fp-swatch w-8 h-8 rounded-lg" style="background:#c49a2f" title="Mustard"></button>
            <button type="button" data-c="#8a6240" class="fp-swatch w-8 h-8 rounded-lg" style="background:#8a6240" title="Caramel"></button>
            <button type="button" data-c="#3a3a3a" class="fp-swatch w-8 h-8 rounded-lg" style="background:#3a3a3a" title="Charcoal"></button>
            <label class="fp-swatch h-8 px-3 rounded-lg cursor-pointer border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-2 relative transition-colors" title="Custom color">
              <span id="fpd-custom-view" class="w-4 h-4 rounded border border-gray-200" style="background:#4a7c59"></span>
              <span class="text-xs font-semibold text-gray-600">Custom</span>
              <input type="color" id="fpd-custom" value="#4a7c59" class="absolute inset-0 opacity-0 cursor-pointer">
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
        </div>
        <!-- 固定底部：不参与滚动，按钮始终可见（移动端靠 sticky 贴住外层滚动容器底部）-->
        <div class="shrink-0 sticky bottom-0 bg-white px-6 border-t border-gray-100" style="padding-top:18px;padding-bottom:18px;box-shadow:0 -10px 18px -10px rgba(0,0,0,.08)">
          <button type="submit" id="fpd-submit" disabled
                  class="w-full py-3.5 bg-accent-500 hover:bg-accent-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-accent-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-500">
            ✨ Generate My Designs
          </button>
        </div>
      </form>
      </div>
    </div>
  </div>

  <!-- ══════════ 风格选择器（餐厅分类 tab → 全家福网格）══════════ -->
  <div id="fp-style-modal" class="hidden fixed inset-0 bg-black/60 z-[9993] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <h3 class="text-lg font-bold text-gray-900">Choose a Packaging Style</h3>
        <button onclick="fpCloseStylePicker()" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
      </div>
      <div id="fps-tabs" class="flex gap-2 px-6 pt-4 pb-1 overflow-x-auto no-scrollbar shrink-0"></div>
      <div id="fps-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-4 px-6 py-5 overflow-y-auto"></div>
    </div>
  </div>

  <!-- ══════════ 编辑设计：大图 + 修改指令输入 ══════════ -->
  <div id="fp-edit-modal" class="hidden fixed inset-0 bg-black/85 z-[9993] flex flex-col items-center justify-center p-4 sm:p-8">
    <button id="fpe-close" class="absolute top-4 right-5 text-white/70 hover:text-white text-3xl leading-none z-10">×</button>
    <!-- 列宽由图片决定：输入框 w-full 跟随，左右与图片边框对齐 -->
    <div class="max-w-3xl" style="width:fit-content">
      <div class="relative">
        <img id="fpe-img" src="" alt="Design being edited" class="max-w-full rounded-2xl shadow-2xl object-contain" style="max-height:58vh">
        <div id="fpe-glass" class="hidden absolute inset-0 fp-genglass flex-col items-center justify-center gap-3 rounded-2xl">
          <img src="assets/images/logo-icon-v2.png?v=9" alt="" class="fp-genspin w-10 h-10 rounded-full bg-white/90 object-contain p-1 shadow">
          <span class="text-sm font-bold text-gray-800 bg-white/85 rounded-full px-4 py-1.5">Applying your edit…</span>
        </div>
      </div>
      <div id="fpe-error" class="hidden mt-3 text-sm text-red-100 bg-red-900/70 border border-red-500/40 rounded-lg px-4 py-2.5"></div>
      <div class="relative mt-4">
        <textarea id="fpe-input" rows="3" maxlength="500"
                  placeholder="Describe the change — e.g. make the logo bigger, use a red background…"
                  class="w-full rounded-xl px-4 py-3 text-sm bg-white border border-gray-200 resize-none" style="padding-bottom:52px"></textarea>
        <button id="fpe-confirm"
                class="absolute px-7 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style="right:12px;bottom:14px">Run</button>
      </div>
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
    <div class="flex items-center justify-between gap-3 px-5 py-3.5 bg-primary-800 text-white shrink-0">
      <div class="min-w-0 flex-1">
        <p class="font-bold text-sm truncate">Your Designs <span id="fp-dock-count" class="text-primary-200 font-normal"></span></p>
        <p id="fp-dock-status" class="text-primary-200 text-xs mt-0.5 truncate">Generating…</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="fpOpenDesign()"
          class="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap">+ New Design</button>
        <button onclick="fpToggleDock(false)" title="Minimize" class="text-white/70 hover:text-white text-2xl leading-none px-1.5">−</button>
      </div>
    </div>
    <div id="fp-dock-grid" class="flex lg:flex-col gap-4 p-4 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto no-scrollbar"></div>
  </div>

  <!-- 悬浮入口：无设计 = Design Online 单按钮；有设计 = + New | My Designs (n) -->
  <div id="fp-dock-chip"
    class="hidden fixed bottom-5 right-5 z-[9980] items-stretch rounded-2xl shadow-xl overflow-hidden">
    <button id="fp-chip-new" onclick="fpOpenDesign()" title="Start a new design"
      class="hidden items-center px-4 bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold border-r border-white/25 whitespace-nowrap">+ New</button>
    <button id="fp-chip-main"
      class="flex items-center gap-2.5 px-4 py-3 bg-primary-800 hover:bg-primary-900 text-white text-sm font-bold whitespace-nowrap">
      <img src="assets/images/logo-icon-v2.png?v=9" alt="" class="fp-chip-icon w-5 h-5 rounded-full bg-white/90 object-contain">
      <span id="fp-chip-label">Design Online</span>
      <span id="fp-chip-count" class="hidden bg-accent-500 text-white text-xs font-bold rounded-full px-2 py-0.5"></span>
    </button>
  </div>

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
        <p id="fpo-quote" class="hidden text-sm bg-primary-50 border border-primary-100 text-primary-900 rounded-lg px-4 py-2.5"></p>
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
      fpsRefresh();
      // 自动带入最近一个品牌的设计 kit（表单还空着时）；
      // hero/solution 入口的参考风格 = 页面当前选中的风格，不被 kit 里存的旧风格覆盖
      if (fpKits.length && !document.getElementById('fpd-brand').value.trim())
        fpApplyKit(fpKits[0], mode === 'hero' || mode === 'solution');
      document.getElementById('fp-design-modal').classList.remove('hidden');
      fpSyncSubmit();
      setTimeout(() => document.getElementById('fpd-brand').focus(), 50);
    };

    // ── Design kits：历史输入沉淀为品牌资产，可下拉复用 ──
    let fpKits = [];
    let fpKitLogoFile = null, fpKitQrFile = null;   // 选中 kit 带入的已存文件名

    const fpEsc = (s) => String(s ?? '').replace(/[&<>"']/g,
      c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const fpHex = (c) => /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#4a7c59';

    async function fpLoadKits() {
      try {
        const res = await fetch(`${FP_API}/design/kits`, { credentials: 'include' });
        if (res.ok) fpKits = (await res.json()).kits || [];
      } catch {}
      const t = document.getElementById('fpd-kit-toggle');
      t.classList.toggle('hidden', fpKits.length === 0);
      t.classList.toggle('flex', fpKits.length > 0);
      // 弹窗已开且表单还空着（如 ?design=1 深链）→ 补一次自动带入
      if (fpKits.length && !document.getElementById('fp-design-modal').classList.contains('hidden')
          && !document.getElementById('fpd-brand').value.trim())
        fpApplyKit(fpKits[0], fpModalMode === 'hero' || fpModalMode === 'solution');
    }

    function fpSelectSwatchFor(color) {
      color = fpHex(color);
      document.querySelectorAll('#fpd-swatches .fp-swatch').forEach(s => s.classList.remove('sel'));
      const preset = document.querySelector(`#fpd-swatches .fp-swatch[data-c="${color}"]`);
      if (preset) preset.classList.add('sel');
      else {
        const custom = document.getElementById('fpd-custom');
        custom.value = color;
        document.getElementById('fpd-custom-view').style.background = color;
        custom.closest('.fp-swatch').classList.add('sel');
      }
      fpColor = color;
    }

    function fpSetFilePreview(labelId, previewId, file, savedText, emptyText) {
      const img = document.getElementById(previewId);
      if (file) {
        document.getElementById(labelId).textContent = savedText;
        img.src = `${FP_API}/design/files/${file}`;
        img.classList.remove('hidden');
      } else {
        document.getElementById(labelId).textContent = emptyText;
        img.removeAttribute('src');
        img.classList.add('hidden');
      }
    }

    function fpApplyKit(kit, keepStyle = false) {
      document.getElementById('fpd-brand').value = kit.brandText || '';
      fpSelectSwatchFor(kit.brandColor);
      document.getElementById('fpd-type').value = kit.restaurantType || '';
      document.getElementById('fpd-slogan').value = kit.slogan || '';
      document.getElementById('fpd-address').value = kit.address || '';
      document.getElementById('fpd-phone').value = kit.phone || '';
      fpKitLogoFile = kit.logoFile || null;
      fpKitQrFile = kit.qrFile || null;
      document.getElementById('fpd-logo').value = '';
      document.getElementById('fpd-qr').value = '';
      fpSetFilePreview('fpd-logo-label', 'fpd-logo-preview', fpKitLogoFile,
        'Saved logo from this kit', 'Upload your logo (PNG / JPG, max 5MB)');
      fpSetFilePreview('fpd-qr-label', 'fpd-qr-preview', fpKitQrFile,
        'Saved QR from this kit', 'Upload the QR customers scan to order');
      if (!keepStyle && kit.styleType && kit.styleId) setStyle(kit.styleType, kit.styleId);
      // kit 带了扩展信息时展开 More Options，让用户看到自动填充的内容
      if (kit.slogan || kit.logoFile || kit.address || kit.phone || kit.qrFile || kit.restaurantType) {
        document.getElementById('fpd-more').classList.remove('hidden');
        document.getElementById('fpd-more-chevron').style.transform = 'rotate(180deg)';
      }
      fpSyncSubmit();
    }

    function fpResetKitForm() {
      ['fpd-brand', 'fpd-slogan', 'fpd-address', 'fpd-phone'].forEach(id =>
        document.getElementById(id).value = '');
      document.getElementById('fpd-type').value = '';
      document.getElementById('fpd-logo').value = '';
      document.getElementById('fpd-qr').value = '';
      fpKitLogoFile = fpKitQrFile = null;
      fpSelectSwatchFor('#4a7c59');
      fpSetFilePreview('fpd-logo-label', 'fpd-logo-preview', null, '', 'Upload your logo (PNG / JPG, max 5MB)');
      fpSetFilePreview('fpd-qr-label', 'fpd-qr-preview', null, '', 'Upload the QR customers scan to order');
      fpSyncSubmit();
      document.getElementById('fpd-brand').focus();
    }

    function fpKitMenuRender() {
      const menu = document.getElementById('fpd-kit-menu');
      menu.innerHTML = `
        <button type="button" data-k="-1"
                class="w-full text-left px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          ✎ Start fresh — new design brief
        </button>` +
        fpKits.map((k, i) => `
        <button type="button" data-k="${i}"
                class="w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-gray-50 truncate"
                style="color:${fpHex(k.brandColor)}">
          ${fpEsc(k.brandText)}${k.slogan ? ` <span class="font-normal opacity-70">— ${fpEsc(k.slogan)}</span>` : ''}
        </button>`).join('');
      menu.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        const i = parseInt(b.dataset.k, 10);
        if (i < 0) fpResetKitForm(); else fpApplyKit(fpKits[i]);
        menu.classList.add('hidden');
      }));
    }

    document.getElementById('fpd-kit-toggle').addEventListener('click', () => {
      const menu = document.getElementById('fpd-kit-menu');
      if (menu.classList.contains('hidden')) { fpKitMenuRender(); menu.classList.remove('hidden'); }
      else menu.classList.add('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#fpd-kit-menu') && !e.target.closest('#fpd-kit-toggle'))
        document.getElementById('fpd-kit-menu')?.classList.add('hidden');
    });

    // ── 参考风格：左侧面板 + 风格选择器 ──
    let fpsType = getStyle().type.id;    // 选择器当前分类 tab
    function fpsRefresh() {
      const cur = getStyle();
      const fam = document.getElementById('fps-family');
      const url = styleImg(cur.type.id, cur.style.id, 'family');
      if (fam.getAttribute('src') !== url) {
        // 骨架态：换图期间容器脉动，图片加载完淡入
        fam.classList.add('opacity-0');
        fam.parentElement.classList.add('animate-pulse');
        fam.src = url;
      }
      document.getElementById('fps-name').textContent = cur.style.label;
      document.getElementById('fps-type').textContent = cur.type.label;
    }
    document.getElementById('fps-family').addEventListener('load', function () {
      this.classList.remove('opacity-0');
      this.parentElement.classList.remove('animate-pulse');
    });
    window.fpOpenStylePicker = () => {
      fpsType = getStyle().type.id;
      fpsRender();
      document.getElementById('fp-style-modal').classList.remove('hidden');
    };
    window.fpCloseStylePicker = () =>
      document.getElementById('fp-style-modal').classList.add('hidden');
    function fpsRender() {
      const cur = getStyle();
      const tabs = document.getElementById('fps-tabs');
      tabs.innerHTML = STYLE_LIBRARY.map(t => `
        <button type="button" data-t="${t.id}" class="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
          t.id === fpsType ? 'bg-primary-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">${t.label}</button>`).join('');
      tabs.querySelectorAll('button').forEach(b =>
        b.addEventListener('click', () => { fpsType = b.dataset.t; fpsRender(); }));
      const type = STYLE_LIBRARY.find(t => t.id === fpsType);
      const grid = document.getElementById('fps-grid');
      grid.innerHTML = type.styles.map(s => {
        const sel = cur.type.id === type.id && cur.style.id === s.id;
        return `
        <button type="button" data-s="${s.id}" class="group text-left">
          <div class="relative aspect-[3/2] bg-gray-100 animate-pulse rounded-xl overflow-hidden border-2 ${sel ? 'border-primary-700' : 'border-transparent group-hover:border-primary-300'} transition-colors">
            <img src="${styleThumb(type.id, s.id)}" alt="${s.label}" loading="lazy"
                 class="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                 onload="this.classList.remove('opacity-0');this.parentElement.classList.remove('animate-pulse')">
            ${sel ? '<span class="absolute top-2 right-2 w-6 h-6 bg-primary-700 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>' : ''}
          </div>
          <p class="text-xs font-semibold text-gray-700 mt-1.5 truncate">${s.label}</p>
        </button>`;
      }).join('');
      grid.querySelectorAll('button[data-s]').forEach(b =>
        b.addEventListener('click', () => { setStyle(fpsType, b.dataset.s); fpCloseStylePicker(); }));
    }
    window.addEventListener('fp:style', fpsRefresh);
    fpsRefresh();
    // More Options 折叠
    document.getElementById('fpd-more-toggle').addEventListener('click', () => {
      const more = document.getElementById('fpd-more');
      const open = more.classList.toggle('hidden');
      document.getElementById('fpd-more-chevron').style.transform = open ? '' : 'rotate(180deg)';
    });
    // 颜色选择
    let fpColor = '#4a7c59';
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

    /** 悬浮入口形态：0 设计 = 单个 Design Online；有设计 = + New | My Designs (n) */
    function fpChipSync() {
      const n = fpSeen.size;
      document.getElementById('fp-dock-count').textContent = n ? `(${n})` : '';
      const neu = document.getElementById('fp-chip-new');
      neu.classList.toggle('hidden', n === 0);
      neu.classList.toggle('flex', n > 0);
      document.getElementById('fp-chip-label').textContent = n === 0 ? 'Design Online' : 'My Designs';
      const cnt = document.getElementById('fp-chip-count');
      cnt.textContent = n;
      cnt.classList.toggle('hidden', n === 0);
    }
    document.getElementById('fp-chip-main').addEventListener('click', () =>
      fpSeen.size === 0 ? window.fpOpenDesign() : window.fpToggleDock(true));

    /** Push an externally-generated result (e.g. hero swap) into My Designs */
    window.fpAddResult = (r) => {
      if (fpSeen.has(r.id)) return;
      fpSeen.add(r.id);
      document.getElementById('fp-dock-grid').insertAdjacentHTML('afterbegin', fpCard(r));
      fpChipSync();
    };

    // ── 历史分页：默认最近 20 条，滚动到底继续加载 ──
    let fpHistory = [];
    function fpRenderMore(n = 20) {
      const grid = document.getElementById('fp-dock-grid');
      fpHistory.splice(0, n).forEach(r => grid.insertAdjacentHTML('beforeend', fpCard(r)));
    }
    document.getElementById('fp-dock-grid').addEventListener('scroll', (e) => {
      if (!fpHistory.length) return;
      const g = e.target;
      const nearV = g.scrollHeight > g.clientHeight && g.scrollTop + g.clientHeight >= g.scrollHeight - 200;
      const nearH = g.scrollWidth > g.clientWidth && g.scrollLeft + g.clientWidth >= g.scrollWidth - 200;
      if (nearV || nearH) fpRenderMore(20);
    });

    window.fpToggleDock = (show) => {
      document.getElementById('fp-dock').classList.toggle('hidden', !show);
      const chip = document.getElementById('fp-dock-chip');
      chip.classList.toggle('hidden', !!show);
      chip.classList.toggle('flex', !show);
      fpChipSync();
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

    async function fpUpload(file, kind) {
      const fd = new FormData();
      fd.append('file', file);
      if (kind) fd.append('kind', kind);
      const res = await fetch(`${FP_API}/design/uploads`, { method: 'POST', body: fd, credentials: 'include' });
      if (res.status === 413) throw new Error('That image is too large — please upload a file under 5MB.');
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.error;
        throw new Error(msg || 'Image upload failed. Please try again.');
      }
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
        const st = getStyle();
        let res;
        if (fpModalMode === 'solution' && window.fpSolutionStart) {
          // 行业方案页：品牌信息交回页面，由页面发起整套商品的批量生成
          btn.textContent = 'Uploading…';
          let logoFile = fpKitLogoFile;
          if (logoInput.files[0]) logoFile = await fpUpload(logoInput.files[0], 'logo');
          fpCloseDesign();
          window.fpSolutionStart({ brandText: brand, brandColor: fpColor, logoFile });
          return;
        }
        if (fpModalMode === 'hero') {
          // 首屏品牌试穿：重绘当前风格的 4 张图（快）
          res = await fetch(`${FP_API}/design/hero-swap`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandText: brand, color: fpColor,
                                   styleType: st.type.id, styleId: st.style.id })
          });
        } else {
          // 完整设计：基于参考风格的 4 张 mockup（盒/杯/袋/全家福）
          btn.textContent = 'Uploading…';
          // 新上传的文件优先；否则沿用 kit 里保存的 logo/QR
          let logoFile = fpKitLogoFile, qrFile = fpKitQrFile;
          if (logoInput.files[0]) logoFile = await fpUpload(logoInput.files[0], 'logo');
          const qrInput = document.getElementById('fpd-qr');
          if (qrInput.files[0]) qrFile = await fpUpload(qrInput.files[0], 'qr');
          btn.textContent = 'Starting generation…';
          res = await fetch(`${FP_API}/design/generate`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brandText: brand, brandColor: fpColor, logoFile,
              styleType: st.type.id, styleId: st.style.id,
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
        fpLoadKits();   // 本次输入沉淀/更新为该品牌的设计 kit
        fpCloseDesign();
        if (fpModalMode === 'hero') {
          // 首页专属：毛玻璃 + Designing 徽章 + 轮询换图（由页面钩子接管）
          window.fpHeroStart?.(jobId);
        } else {
          fpJobId = jobId;
          localStorage.setItem('fp_last_job', jobId);
          const dockGrid = document.getElementById('fp-dock-grid');
          dockGrid.insertAdjacentHTML('afterbegin',
            ['box', 'cup', 'bag', 'family'].map(pt =>
              fpGenCard(styleImg(st.type.id, st.style.id, pt))).join(''));
          dockGrid.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          fpToggleDock(true);
          fpStartPolling();
        }
      } catch (ex) {
        err.textContent = ex?.message && ex.message !== 'Failed to fetch'
          ? ex.message : 'Something went wrong. Please try again.';
        err.classList.remove('hidden');
      } finally {
        btn.textContent = '✨ Generate My Designs';
        fpSyncSubmit();
      }
    });

    /** 生成中的占位卡：参考图打底 + 毛玻璃 + logo 转圈 Generating… */
    function fpGenCard(imgUrl) {
      return `
        <div class="fp-skel shrink-0 w-40 lg:w-full">
          <div class="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200">
            ${imgUrl ? `<img src="${imgUrl}" alt="" class="w-full h-full object-cover">` : ''}
            <div class="absolute inset-0 fp-genglass flex flex-col items-center justify-center gap-2">
              <img src="assets/images/logo-icon-v2.png?v=9" alt=""
                   class="fp-genspin w-9 h-9 rounded-full bg-white/90 object-contain p-1 shadow">
              <span class="text-xs font-bold text-gray-700 bg-white/80 rounded-full px-3 py-1">Generating…</span>
            </div>
          </div>
          <div class="h-3 w-24 bg-gray-100 rounded mt-2 animate-pulse"></div>
        </div>`;
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
          // 新结果保持时间倒序：优先原位替换顶部的占位卡，否则插到最前
          const skel = grid.querySelector('.fp-skel');
          if (skel) skel.outerHTML = fpCard(r);
          else grid.insertAdjacentHTML('afterbegin', fpCard(r));
        });
        fpChipSync();
        const st = document.getElementById('fp-dock-status');
        if (job.status === 'COMPLETED') {
          st.textContent = 'Done — pick one to order.';
          clearInterval(fpPollTimer);
          fpChipBusy(false);
          grid.querySelectorAll('.fp-skel').forEach(s => s.remove());
        } else if (job.status === 'FAILED') {
          st.textContent = 'Generation failed — please try again.';
          clearInterval(fpPollTimer);
          fpChipBusy(false);
          grid.querySelectorAll('.fp-skel').forEach(s => s.remove());
        } else {
          st.textContent = `Generating… ${job.results.length}/4`;
        }
      } catch {}
    }

    function fpCard(r) {
      return `
        <div class="shrink-0 w-40 lg:w-full group" id="fp-item-${r.id}">
          <div class="relative rounded-xl overflow-hidden border border-gray-200">
            <img src="${r.imageUrl}" alt="${r.productLabel}" class="w-full aspect-[4/3] object-cover">
            <button onclick="fpDeleteItem('${r.id}')" title="Delete"
              class="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m3 0V5a2 2 0 012-2h4a2 2 0 012 2v2M3 7h18M10 11v6M14 11v6"/></svg>
            </button>
            <button onclick="fpEditOpen('${r.id}', this.closest('.relative').querySelector('img').src)" title="Edit this design"
              style="top:44px" class="absolute right-2 w-7 h-7 bg-black/50 hover:bg-primary-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <div class="flex items-center justify-between mt-2 gap-2">
            <p class="text-xs font-semibold text-gray-700 truncate">${r.productLabel}</p>
            <div class="flex items-center gap-1.5 shrink-0">
              <button onclick="fpRedo('${r.id}')" title="Generate a different design with the same brief"
                class="text-xs font-bold text-primary-800 border border-primary-200 hover:bg-primary-50 rounded-lg px-2.5 py-1.5 transition-colors">Redesign</button>
              ${r.productType === 'HERO' ? '' : `<button onclick='fpOrder(${JSON.stringify(r)})'
                class="flex items-center gap-1.5 text-xs font-bold text-white bg-accent-500 hover:bg-accent-600 rounded-lg px-2.5 py-1.5 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6a1 1 0 00.9 1.4H19"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>
                Order</button>`}
            </div>
          </div>
        </div>`;
    }

    /** Redesign：同一输入再出一张不同设计；完成前在列表首位显示 loading */
    window.fpRedo = async (id) => {
      fpToggleDock(true);
      const grid = document.getElementById('fp-dock-grid');
      // 原设计图作为占位背景；插入后滚回列表最头部
      const srcImg = document.querySelector(`#fp-item-${CSS.escape(id)} img`)?.src || '';
      grid.insertAdjacentHTML('afterbegin', fpGenCard(srcImg));
      grid.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      const skel = grid.querySelector('.fp-skel');
      fpChipBusy(true);
      document.getElementById('fp-dock-status').textContent = 'Generating a new version…';
      const stop = (msg) => {
        skel.remove();
        fpChipBusy(false);
        if (msg) document.getElementById('fp-dock-status').textContent = msg;
        window.dispatchEvent(new Event('fp:redo-fail'));   // 页面占位卡同步撤掉
      };
      try {
        const res = await fetch(`${FP_API}/design/redesign`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: id })
        });
        if (res.status === 401) {
          stop('');
          document.getElementById('fp-login-modal').classList.remove('hidden');
          return;
        }
        if (!res.ok) throw new Error();
        const { jobId } = await res.json();
        const timer = setInterval(async () => {
          try {
            const jr = await fetch(`${FP_API}/design/jobs/${jobId}`, { credentials: 'include' });
            if (!jr.ok) { clearInterval(timer); stop('Redesign failed — please try again.'); return; }
            const job = await jr.json();
            const r = job.results[0];
            if (r) {
              clearInterval(timer);
              fpSeen.add(r.id);
              skel.outerHTML = fpCard(r);
              fpChipSync();
              document.getElementById('fp-dock-status').textContent = 'Done — pick one to order.';
              fpChipBusy(false);
              window.dispatchEvent(new CustomEvent('fp:redo-done', { detail: r }));
            } else if (job.status === 'FAILED') {
              clearInterval(timer);
              stop('Redesign failed — please try again.');
            }
          } catch {}
        }, 2000);
      } catch {
        stop('Redesign failed — please try again.');
      }
    };

    window.fpDeleteItem = async (id) => {
      document.getElementById(`fp-item-${id}`)?.remove();
      fpSeen.delete(id);
      fpChipSync();
      try { await fetch(`${FP_API}/design/job-items/${id}`, { method: 'DELETE', credentials: 'include' }); } catch {}
    };

    // ── 编辑设计：大图 + 修改指令，生成后原地刷新（新图沉入列表首位）──
    let fpEditCtx = null;   // { id }  当前正在编辑的条目
    let fpEditBusy = false;
    const fpeEl = (id) => document.getElementById(id);

    window.fpEditOpen = (id, src) => {
      fpEditCtx = { id };
      fpeEl('fpe-img').src = src || document.querySelector(`#fp-item-${CSS.escape(id)} img`)?.src || '';
      fpeEl('fpe-input').value = '';
      fpeEl('fpe-error').classList.add('hidden');
      fpeEl('fp-edit-modal').classList.remove('hidden');
      setTimeout(() => fpeEl('fpe-input').focus(), 50);
    };
    const fpEditClose = () => {
      fpeEl('fp-edit-modal').classList.add('hidden');
      fpEditCtx = null;
    };
    fpeEl('fpe-close').addEventListener('click', fpEditClose);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !fpeEl('fp-edit-modal').classList.contains('hidden')) fpEditClose();
    });

    async function fpEditConfirm() {
      if (fpEditBusy || !fpEditCtx) return;
      const instruction = fpeEl('fpe-input').value.trim();
      if (!instruction) { fpeEl('fpe-input').focus(); return; }
      const glass = fpeEl('fpe-glass');
      const err = fpeEl('fpe-error');
      const fail = (msg) => {
        fpEditBusy = false;
        fpeEl('fpe-confirm').disabled = false;
        glass.classList.add('hidden'); glass.classList.remove('flex');
        if (msg) { err.textContent = msg; err.classList.remove('hidden'); }
      };
      fpEditBusy = true;
      fpeEl('fpe-confirm').disabled = true;
      err.classList.add('hidden');
      glass.classList.remove('hidden'); glass.classList.add('flex');
      const editingId = fpEditCtx.id;
      try {
        const res = await fetch(`${FP_API}/design/edit-item`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: editingId, instruction })
        });
        if (res.status === 401) {
          fail('');
          document.getElementById('fp-login-modal').classList.remove('hidden');
          return;
        }
        if (!res.ok) throw new Error();
        const { jobId } = await res.json();
        const timer = setInterval(async () => {
          try {
            const jr = await fetch(`${FP_API}/design/jobs/${jobId}`, { credentials: 'include' });
            if (!jr.ok) { clearInterval(timer); fail('Edit failed — please try again.'); return; }
            const job = await jr.json();
            const r = job.results[0];
            if (r) {
              clearInterval(timer);
              // 弹窗内原地换新图，停留在编辑页可继续改
              if (fpEditCtx && fpEditCtx.id === editingId) {
                fpEditCtx.id = r.id;
                fpeEl('fpe-img').src = r.imageUrl;
                fpeEl('fpe-input').value = '';
              }
              // 列表：旧卡移除、新卡置顶（最新在第一个）
              document.getElementById(`fp-item-${editingId}`)?.remove();
              fpSeen.delete(editingId);
              fpSeen.add(r.id);
              document.getElementById('fp-dock-grid')?.insertAdjacentHTML('afterbegin', fpCard(r));
              fpChipSync();
              window.dispatchEvent(new CustomEvent('fp:edit-done', { detail: { oldId: editingId, item: r } }));
              fpEditBusy = false;
              fpeEl('fpe-confirm').disabled = false;
              glass.classList.add('hidden'); glass.classList.remove('flex');
            } else if (job.status === 'FAILED') {
              clearInterval(timer);
              fail('Edit failed — please try again.');
            }
          } catch {}
        }, 2000);
      } catch {
        fail('Edit failed — please try again.');
      }
    }
    fpeEl('fpe-confirm').addEventListener('click', fpEditConfirm);
    fpeEl('fpe-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fpEditConfirm(); }
    });

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
      fpOrderSizes = [];
      fpOrderQuote();
      try {
        const res = await fetch(`${FP_API}/products/sizes/${r.productType}`);
        fpOrderSizes = await res.json();
        sizeEl.innerHTML = '<option value="">Select size…</option>' +
          fpOrderSizes.map(s => `<option value="${s.label}">${s.label}</option>`).join('');
      } catch {
        sizeEl.innerHTML = '<option value="">Failed to load sizes</option>';
      }
    };

    // ── 实时报价：尺寸 basePrice × 数量档折扣（与 Pricing 表一致）──
    let fpOrderSizes = [];
    function fpOrderQuote() {
      const el = document.getElementById('fpo-quote');
      const s = fpOrderSizes.find(x => x.label === document.getElementById('fpo-size').value);
      const qty = parseInt(document.getElementById('fpo-qty').value, 10);
      if (!s || !s.basePrice || !qty || qty < 1000) { el.classList.add('hidden'); return; }
      const f = qty >= 10000 ? 0.72 : qty >= 5000 ? 0.82 : qty >= 3000 ? 0.90 : 1;
      const unit = s.basePrice * f;
      const u = unit.toFixed(3).replace(/0$/, '');
      el.innerHTML = `Est. <b>$${u}</b>/unit × ${qty.toLocaleString()} ≈ <b>$${Math.round(unit * qty).toLocaleString()}</b> + shipping`;
      el.classList.remove('hidden');
    }
    document.getElementById('fpo-size').addEventListener('change', fpOrderQuote);
    document.getElementById('fpo-qty').addEventListener('input', fpOrderQuote);

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

    // 悬浮入口常驻（0 设计时 = Design Online 单按钮）
    {
      const chip = document.getElementById('fp-dock-chip');
      chip.classList.remove('hidden');
      chip.classList.add('flex');
      fpChipSync();
    }

    // 页面加载：登录用户先合并游客历史，然后加载完整 My Designs
    (async () => {
      try {
        const me = await fetch(`${FP_API}/auth/me`, { credentials: 'include' });
        if (me.ok) await fetch(`${FP_API}/design/claim`, { method: 'POST', credentials: 'include' }).catch(() => {});
      } catch {}
      fpLoadKits();
      try {
        const res = await fetch(`${FP_API}/design/my-designs`, { credentials: 'include' });
        if (res.ok) {
          const { items } = await res.json();
          // 分页：先渲染最近 20 条，其余滚动到底再续载
          fpHistory = items.filter(r => !fpSeen.has(r.id));
          fpHistory.forEach(r => fpSeen.add(r.id));
          fpRenderMore(20);
          fpChipSync();
          if (fpSeen.size > 0)
            document.getElementById('fp-dock-status').textContent = 'Your saved designs';
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
