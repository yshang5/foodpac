/**
 * dropdown.js — replace native <select> UI with the site's custom dropdown
 * (rounded panel, generous padding, chevron kept off the edge).
 *
 * The native select stays in the DOM (invisible but focusable) so form
 * serialization, validation bubbles and existing change-listeners keep
 * working. Options are re-read every time the panel opens, so selects with
 * dynamically loaded options (e.g. product sizes) need no extra wiring.
 * Programmatic `sel.value = x` assignments are intercepted to keep the
 * visible label in sync.
 */

const CHEVRON = `<svg class="fps-chevron w-4 h-4 text-gray-400 shrink-0 transition-transform" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>`;

let openPanel = null;

function closeOpen() {
  if (!openPanel) return;
  openPanel.panel.classList.add('hidden');
  openPanel.btn.querySelector('.fps-chevron').style.transform = '';
  openPanel = null;
}
document.addEventListener('click', closeOpen);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOpen(); });
// fixed 面板不随页面滚动，页面滚动/缩放时收起避免悬空错位；
// 但面板自身的滚动（选项列表）必须放行，否则列表刚滚就被关掉
window.addEventListener('scroll', (e) => {
  if (openPanel && e.target instanceof Node && openPanel.panel.contains(e.target)) return;
  closeOpen();
}, true);
window.addEventListener('resize', closeOpen);

export function fpSelect(sel) {
  if (!sel || sel.dataset.fpsel || sel.multiple) return;
  sel.dataset.fpsel = '1';

  const wrap = document.createElement('div');
  wrap.className = 'relative';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white text-left flex items-center justify-between gap-3 hover:border-gray-300 transition-colors';
  btn.innerHTML = `<span class="fps-label truncate"></span>${CHEVRON}`;
  if (sel.disabled) btn.disabled = true;

  const panel = document.createElement('div');
  panel.className = 'hidden bg-white border border-gray-100 rounded-xl shadow-xl py-1.5';
  // fixed 定位：脱离弹窗/滚动容器的 overflow 裁剪；高度与滚动写成内联，不依赖 CSS 构建
  panel.style.cssText = 'position:fixed;z-index:100000;max-height:16rem;overflow-y:auto;';

  wrap.append(btn, panel);

  // 原生 select 保持可聚焦（校验气泡、键盘可用），视觉上让位给按钮
  sel.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;';

  const label = btn.querySelector('.fps-label');
  const sync = () => {
    const o = sel.selectedOptions[0];
    label.textContent = o ? o.textContent : '';
    label.classList.toggle('text-gray-400', !sel.value);
    btn.disabled = sel.disabled;
    btn.classList.toggle('opacity-60', sel.disabled);
  };
  sync();

  // 拦截程序性赋值（预填、恢复等），保持可见文案同步
  const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(sel, 'value', {
    get() { return desc.get.call(this); },
    set(v) { desc.set.call(this, v); sync(); },
  });
  sel.addEventListener('change', sync);
  // options 被 innerHTML 整体替换（如动态加载尺寸）时也要刷新文案
  new MutationObserver(sync).observe(sel, { childList: true, attributes: true, attributeFilter: ['disabled'] });

  function renderItems() {
    panel.innerHTML = [...sel.options].map((o, i) => {
      const selArr = o.selected;
      return `<button type="button" data-i="${i}" ${o.disabled ? 'disabled' : ''}
        class="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3
               ${selArr ? 'bg-primary-50 text-primary-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'}
               ${o.disabled ? 'opacity-40 cursor-not-allowed' : ''}">
        <span class="truncate">${o.textContent.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>
        ${selArr ? '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
      </button>`;
    }).join('');
  }

  function positionPanel() {
    const r = btn.getBoundingClientRect();
    const gap = 6, margin = 8;
    panel.style.width = r.width + 'px';
    panel.style.left = r.left + 'px';
    const below = window.innerHeight - r.bottom - gap - margin;
    const above = r.top - gap - margin;
    // 下方放不下且上方更宽敞时向上弹出
    if (below < 160 && above > below) {
      panel.style.maxHeight = Math.min(256, above) + 'px';
      panel.style.top = '';
      panel.style.bottom = (window.innerHeight - r.top + gap) + 'px';
    } else {
      panel.style.maxHeight = Math.min(256, below) + 'px';
      panel.style.bottom = '';
      panel.style.top = (r.bottom + gap) + 'px';
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (openPanel && openPanel.panel === panel) { closeOpen(); return; }
    closeOpen();
    renderItems();
    panel.classList.remove('hidden');
    positionPanel();
    btn.querySelector('.fps-chevron').style.transform = 'rotate(180deg)';
    openPanel = { panel, btn };
    const cur = panel.querySelector('.bg-primary-50');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  });

  panel.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.target.closest('button[data-i]');
    if (!item || item.disabled) return;
    sel.selectedIndex = Number(item.dataset.i);
    sync();
    closeOpen();
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export function fpEnhanceSelects(root = document) {
  root.querySelectorAll('select:not([data-fpsel])').forEach(fpSelect);
}

/** Auto-enhance current and future selects (modals injected later included) */
export function initDropdowns() {
  fpEnhanceSelects();
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.tagName === 'SELECT') fpSelect(n);
        else if (n.querySelectorAll) fpEnhanceSelects(n);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
