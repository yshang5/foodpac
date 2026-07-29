import { API_BASE } from './api.js?v=20260729a';
import { getCurrentUser, loginWithGoogle } from './auth.js?v=20260729a';
import { _refreshCartBadge } from './components.js?v=20260729a';

const MATERIAL_LABELS = {
  KRAFT:      'Kraft Paper',
  WHITE_CARD: 'White Cardboard',
  FOIL:       'Foil Lined',
  PLASTIC:    'Plastic',
};

export async function initCart() {
  _showSkeleton();
  // 用户信息与购物车并行拉取，首屏不串行等待
  const [user, cartState] = await Promise.all([getCurrentUser(), _loadCart()]);

  if (!user || cartState === 'unauth') {
    document.getElementById('cartEmpty').classList.add('hidden');
    document.getElementById('cartList').classList.add('hidden');
    document.getElementById('cartLogin').classList.remove('hidden');
    document.getElementById('cartLoginBtn')?.addEventListener('click', loginWithGoogle);
    return;
  }

  _initQuoteModal(user);
}

/** 数据到达前先铺骨架卡 */
function _showSkeleton() {
  document.getElementById('cartList').classList.remove('hidden');
  document.getElementById('cartGrid').innerHTML = Array.from({ length: 3 }, () => `
    <div class="bg-white rounded-2xl overflow-hidden border-2 border-gray-200">
      <div class="bg-gray-100 animate-pulse" style="aspect-ratio:1"></div>
      <div class="p-4 space-y-2">
        <div class="h-3 w-3/4 bg-gray-100 rounded animate-pulse"></div>
        <div class="h-3 w-1/3 bg-gray-100 rounded animate-pulse"></div>
      </div>
    </div>`).join('');
}

/** 生成图卡片走 320px 服务端缩略缓存 */
function _cartThumb(u) {
  return u && u.includes('/api/v1/design/files/') && !u.includes('?') ? `${u}?w=320` : u;
}

// ── Load cart items ────────────────────────────────────────────────────────────
async function _loadCart() {
  const list  = document.getElementById('cartList');
  const empty = document.getElementById('cartEmpty');
  const grid  = document.getElementById('cartGrid');

  try {
    const res = await fetch(`${API_BASE}/cart`, { credentials: 'include' });
    if (res.status === 401 || res.status === 403) { grid.innerHTML = ''; return 'unauth'; }
    if (!res.ok) throw new Error();
    const items = await res.json();

    if (items.length === 0) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      document.getElementById('requestQuoteBtnTop')?.classList.add('hidden');
      return 'empty';
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');
    const topBtn = document.getElementById('requestQuoteBtnTop');
    topBtn?.classList.remove('hidden');
    topBtn?.classList.add('inline-flex');

    grid.innerHTML = items.map(item => {
      const materialLabel = item.material ? (MATERIAL_LABELS[item.material] || item.material) : '';
      const specLine = [item.productLabel, item.sizeSpec, materialLabel].filter(Boolean).join(' · ');
      const qtyLine  = item.quantity ? `${item.quantity.toLocaleString()} units` : '';
      const date     = new Date(item.createdAt).toLocaleDateString('en-CA', { year:'numeric', month:'short', day:'numeric' });

      return `
        <div class="group relative bg-white rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm transition-all cursor-pointer cart-card"
             data-id="${item.id}">
          <!-- Checkbox -->
          <label class="absolute top-2 left-2 z-10 flex items-center cursor-pointer" onclick="event.stopPropagation()">
            <input type="checkbox" class="cart-checkbox w-4 h-4 accent-primary-700 cursor-pointer rounded"
                   data-id="${item.id}" onchange="window._fpSelectionChanged()">
          </label>
          <div class="relative overflow-hidden bg-gray-100 animate-pulse" style="aspect-ratio:1">
            <img src="${_cartThumb(item.imageUrl)}" alt="Design" loading="lazy"
                 class="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                 onload="this.classList.remove('opacity-0');this.parentElement.classList.remove('animate-pulse')"
                 onerror="this.parentElement.style.background='#f3f4f6';this.parentElement.classList.remove('animate-pulse')">
            <button onclick="event.stopPropagation(); window._fpRemoveCart('${item.id}')"
                    class="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-red-50 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 shadow transition-colors opacity-0 group-hover:opacity-100">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-4">
            ${specLine ? `<p class="text-xs font-medium text-gray-700 mb-1">${specLine}</p>` : ''}
            ${qtyLine  ? `<p class="text-xs font-semibold mb-2" style="color:#2e7d32">${qtyLine}</p>` : ''}
            <p class="text-xs text-gray-400">${date}</p>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('cartCount').textContent =
      `${items.length} design${items.length !== 1 ? 's' : ''}`;

    // Click card to toggle checkbox
    document.querySelectorAll('.cart-card').forEach(card => {
      card.addEventListener('click', () => {
        const cb = card.querySelector('.cart-checkbox');
        if (cb) { cb.checked = !cb.checked; window._fpSelectionChanged(); }
      });
    });

  } catch {
    grid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-10">Failed to load cart. Please refresh.</p>';
  }

  // Selection changed handler — update CTA
  window._fpSelectionChanged = () => {
    const selected = _getSelectedIds();
    const total    = document.querySelectorAll('#cartGrid [data-id]').length;
    const btn      = document.getElementById('requestQuoteBtn');
    const selBar   = document.getElementById('selectionBar');
    const selCount = document.getElementById('selectionCount');

    // Update card border styling
    document.querySelectorAll('.cart-card').forEach(card => {
      const cb = card.querySelector('.cart-checkbox');
      if (cb?.checked) {
        card.classList.add('border-primary-500', 'shadow-md');
        card.classList.remove('border-gray-200');
      } else {
        card.classList.remove('border-primary-500', 'shadow-md');
        card.classList.add('border-gray-200');
      }
    });

    // Update select-all checkbox state
    const selAll = document.getElementById('selectAllCb');
    if (selAll) {
      const partial = selected.length > 0 && selected.length < total;
      selAll.indeterminate = partial;
      selAll.dataset.partial = partial ? '1' : '';
      selAll.checked = selected.length === total && total > 0;
    }

    // Update selection bar
    if (selected.length > 0) {
      selBar?.classList.remove('hidden');
      if (selCount) selCount.textContent = `${selected.length} selected`;
      if (btn) btn.textContent = `Request Quote for ${selected.length} Item${selected.length !== 1 ? 's' : ''}`;
      const tb = document.getElementById('requestQuoteBtnTop');
      if (tb) tb.firstChild.textContent = `Request Quote for ${selected.length} Item${selected.length !== 1 ? 's' : ''} `;
    } else {
      selBar?.classList.add('hidden');
      if (btn) btn.textContent = 'Request a Quote';
      const tb = document.getElementById('requestQuoteBtnTop');
      if (tb) tb.firstChild.textContent = 'Request a Quote ';
    }
  };

  // Remove handler
  window._fpRemoveCart = async (id) => {
    if (!confirm('Remove this design from your cart?')) return;
    try {
      await fetch(`${API_BASE}/cart/${id}`, { method: 'DELETE', credentials: 'include' });
      document.querySelector(`[data-id="${id}"]`)?.remove();
      _refreshCartBadge();
      const remaining = document.querySelectorAll('#cartGrid [data-id]').length;
      if (remaining === 0) {
        document.getElementById('cartList').classList.add('hidden');
        document.getElementById('cartEmpty').classList.remove('hidden');
      } else {
        document.getElementById('cartCount').textContent =
          `${remaining} design${remaining !== 1 ? 's' : ''}`;
        window._fpSelectionChanged();
      }
    } catch {
      alert('Failed to remove item. Please try again.');
    }
  };

  // Select-all handler：部分选中状态下点击 = 取消全部选择
  document.getElementById('selectAllCb')?.addEventListener('change', (e) => {
    const clearAll = e.target.dataset.partial === '1';
    document.querySelectorAll('.cart-checkbox').forEach(cb => {
      cb.checked = clearAll ? false : e.target.checked;
    });
    if (clearAll) e.target.checked = false;
    window._fpSelectionChanged();
  });

  // 明确的"取消全部选择"入口
  document.getElementById('clearSelBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.cart-checkbox').forEach(cb => { cb.checked = false; });
    window._fpSelectionChanged();
  });
}

function _getSelectedIds() {
  return Array.from(document.querySelectorAll('.cart-checkbox:checked')).map(cb => cb.dataset.id);
}

// ── Quote modal ───────────────────────────────────────────────────────────────
function _initQuoteModal(user) {
  document.getElementById('q-name').value    = user.name    || '';
  document.getElementById('q-email').value   = user.email   || '';
  document.getElementById('q-phone').value   = user.phone   || '';
  document.getElementById('q-company').value = user.company || '';

  document.getElementById('requestQuoteBtn').addEventListener('click', _openQuoteModal);
  document.getElementById('requestQuoteBtnTop')?.addEventListener('click', _openQuoteModal);
  document.getElementById('quoteModalClose').addEventListener('click', _closeQuoteModal);
  document.getElementById('quoteSubmitBtn').addEventListener('click', _submitQuote);

  document.getElementById('quoteModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) _closeQuoteModal();
  });
}

function _openQuoteModal() {
  // 只取卡片本身（卡片内的复选框也带 data-id，误入会渲染成裂图空行）
  const allItems = document.querySelectorAll('#cartGrid > [data-id]');
  if (allItems.length === 0) {
    alert('Your cart is empty. Add designs before requesting a quote.');
    return;
  }

  // Determine which items to quote: selected ones, or all if none selected
  const selectedIds = _getSelectedIds();
  const targetItems = selectedIds.length > 0
    ? Array.from(allItems).filter(c => selectedIds.includes(c.dataset.id))
    : Array.from(allItems);

  // Build items summary：第一行产品名，第二行尺寸 · 数量
  const summary = document.getElementById('quoteSummary');
  const rows = targetItems.map(card => {
    const img      = card.querySelector('img');
    const specEl   = card.querySelectorAll('.p-4 p');
    const specText = specEl[0]?.textContent?.trim() || 'Design';
    const qtyText  = specEl[1]?.textContent?.trim() || '';
    const parts    = specText.split(' · ');
    const name     = parts[0] || 'Design';
    const line2    = [parts.slice(1).join(' · '), qtyText].filter(Boolean).join(' · ');
    let src = img?.src || '';
    if (src.includes('/api/v1/design/files/') && !src.includes('?')) src += '?w=96';
    return `
      <div class="flex items-center gap-3 p-2 bg-white rounded-lg">
        <img src="${src}" alt=""
             style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;flex-shrink:0;">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate">${name}</p>
          ${line2 ? `<p class="text-xs truncate" style="color:#2e7d32">${line2}</p>` : ''}
        </div>
      </div>
    `;
  });
  // 超过 2 个时收起余下的，可展开查看全部
  if (rows.length > 2) {
    summary.innerHTML = rows.slice(0, 2).join('')
      + `<div id="qsMore" class="hidden space-y-2">${rows.slice(2).join('')}</div>`
      + `<button type="button" id="qsToggle"
           class="w-full text-center text-sm font-semibold text-primary-700 hover:text-primary-900 py-1.5">
           Show ${rows.length - 2} more ▾
         </button>`;
    const more = document.getElementById('qsMore');
    const toggle = document.getElementById('qsToggle');
    toggle.addEventListener('click', () => {
      const open = more.classList.toggle('hidden');
      toggle.textContent = open ? `Show ${rows.length - 2} more ▾` : 'Show less ▴';
    });
  } else {
    summary.innerHTML = rows.join('');
  }

  // Store target IDs on modal for submit
  document.getElementById('quoteModal').dataset.itemIds = selectedIds.join(',');

  document.getElementById('quoteError').style.display = 'none';
  document.getElementById('quoteModal').style.display = 'flex';
}

function _closeQuoteModal() {
  document.getElementById('quoteModal').style.display = 'none';
}

async function _submitQuote() {
  const errEl   = document.getElementById('quoteError');
  const phone   = document.getElementById('q-phone').value.trim();
  const name    = document.getElementById('q-name').value.trim();
  const company = document.getElementById('q-company').value.trim();
  const notes   = document.getElementById('q-notes').value.trim();
  const btn     = document.getElementById('quoteSubmitBtn');
  const itemIds = document.getElementById('quoteModal').dataset.itemIds || '';

  errEl.style.display = 'none';

  if (!phone) {
    errEl.textContent = 'Phone number is required so we can reach you.';
    errEl.style.display = 'block';
    document.getElementById('q-phone').focus();
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Submitting...';

  try {
    const body = {
      contactName:  name    || undefined,
      contactPhone: phone,
      businessName: company || undefined,
      notes:        notes   || undefined,
    };
    if (itemIds) body.cartItemIds = itemIds.split(',').filter(Boolean);

    const res = await fetch(`${API_BASE}/quotes`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.status === 401) {
      loginWithGoogle();
      return;
    }
    if (!res.ok) {
      errEl.textContent = res.status === 400
        ? 'Please check your cart and try again.'
        : 'Server error. Please try again later.';
      errEl.style.display = 'block';
      return;
    }

    _closeQuoteModal();

    // Remove quoted items from DOM
    const quotedIds = itemIds ? itemIds.split(',').filter(Boolean)
                              : Array.from(document.querySelectorAll('#cartGrid [data-id]')).map(c => c.dataset.id);
    quotedIds.forEach(id => document.querySelector(`[data-id="${id}"]`)?.remove());
    window._fpSelectionChanged?.();
    _refreshCartBadge();

    const remaining = document.querySelectorAll('#cartGrid [data-id]').length;
    if (remaining === 0) {
      document.getElementById('cartList').classList.add('hidden');
      document.getElementById('cartEmpty').classList.remove('hidden');
    } else {
      document.getElementById('cartCount').textContent =
        `${remaining} design${remaining !== 1 ? 's' : ''}`;
    }

    document.getElementById('quoteSuccess').style.display = 'flex';

  } catch {
    errEl.textContent = 'Network error. Please check your connection and try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Submit Quote Request';
  }
}
