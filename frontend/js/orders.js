import { API_BASE } from './api.js';
import { getCurrentUser, loginWithGoogle } from './auth.js';

const MATERIAL_LABELS = {
  KRAFT:      'Kraft Paper',
  WHITE_CARD: 'White Cardboard',
  FOIL:       'Foil Lined',
  PLASTIC:    'Plastic',
};

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending Review', cls: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'Processing',     cls: 'bg-blue-100 text-blue-800' },
  QUOTED:     { label: 'Quote Ready',    cls: 'bg-primary-100 text-primary-800' },
  COMPLETED:  { label: 'Completed',      cls: 'bg-gray-100 text-gray-600' },
  CANCELLED:  { label: 'Cancelled',      cls: 'bg-red-100 text-red-700' },
};

export async function initOrders() {
  const user = await getCurrentUser();

  if (!user) {
    document.getElementById('ordersLogin').classList.remove('hidden');
    document.getElementById('ordersLoginBtn')?.addEventListener('click', loginWithGoogle);
    return;
  }

  await _loadOrders();
}

async function _loadOrders() {
  const loading = document.getElementById('ordersLoading');
  const empty   = document.getElementById('ordersEmpty');
  const list    = document.getElementById('ordersList');

  try {
    const res = await fetch(`${API_BASE}/quotes`, { credentials: 'include' });
    if (!res.ok) throw new Error();
    const orders = await res.json();

    loading.classList.add('hidden');

    if (orders.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    list.classList.remove('hidden');
    list.innerHTML = orders.map((order, idx) => _renderOrder(order, idx)).join('');

    // Bind expand/collapse
    list.querySelectorAll('.order-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id      = btn.dataset.orderId;
        const details = document.getElementById(`order-details-${id}`);
        const icon    = btn.querySelector('.chevron-icon');
        const isOpen  = !details.classList.contains('hidden');
        details.classList.toggle('hidden', isOpen);
        icon.style.transform = isOpen ? '' : 'rotate(180deg)';
        btn.querySelector('.toggle-label').textContent = isOpen ? 'View Details' : 'Hide Details';
      });
    });

  } catch {
    loading.innerHTML = '<p class="text-gray-500 text-center py-10">Failed to load orders. Please refresh.</p>';
  }
}

function _renderOrder(order, idx) {
  const status = STATUS_CONFIG[order.status] || { label: order.status, cls: 'bg-gray-100 text-gray-600' };
  const date   = new Date(order.createdAt).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const time   = new Date(order.createdAt).toLocaleTimeString('en-CA', {
    hour: '2-digit', minute: '2-digit',
  });

  // Thumbnails — show up to 4, then "+N more" chip
  const MAX_THUMB = 4;
  const thumbs    = order.items.slice(0, MAX_THUMB).map(item => `
    <img src="${item.imageUrl}" alt="${item.productLabel || 'Design'}"
         title="${[item.productLabel, item.sizeSpec].filter(Boolean).join(' · ')}"
         style="width:40px;height:40px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;flex-shrink:0;"
         onerror="this.style.background='#f3f4f6';this.style.border='1px solid #e5e7eb'">
  `).join('');
  const extra = order.items.length - MAX_THUMB;
  const extraChip = extra > 0
    ? `<span style="width:40px;height:40px;border-radius:8px;background:#f3f4f6;border:1px solid #e5e7eb;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#6b7280;flex-shrink:0;">+${extra}</span>`
    : '';

  // Detail rows
  const itemDetails = order.items.map(item => {
    const mat  = item.material ? (MATERIAL_LABELS[item.material] || item.material) : '';
    const spec = [item.productLabel, item.sizeSpec, mat].filter(Boolean).join(' · ');
    const qty  = item.quantity ? `${item.quantity.toLocaleString()} units` : '';
    return `
      <div class="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
        <img src="${item.imageUrl}" alt="${item.productLabel || 'Design'}"
             style="width:52px;height:52px;object-fit:cover;border-radius:10px;border:1px solid #e5e7eb;flex-shrink:0;"
             onerror="this.style.background='#f3f4f6'">
        <div class="flex-1 min-w-0">
          ${spec ? `<p class="text-sm font-medium text-gray-800">${spec}</p>` : ''}
          ${qty  ? `<p class="text-xs font-semibold mt-0.5" style="color:#2e7d32">${qty}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Order header row -->
      <div class="p-5 flex items-center gap-4">

        <!-- Thumbnails -->
        <div class="flex items-center gap-1.5 flex-shrink-0">
          ${thumbs}${extraChip}
        </div>

        <!-- Order meta -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-semibold text-gray-900">
              ${order.items.length} item${order.items.length !== 1 ? 's' : ''}
            </span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}">
              ${status.label}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">${date} · ${time}</p>
          ${order.businessName ? `<p class="text-xs text-gray-500 mt-0.5">${order.businessName}</p>` : ''}
        </div>

        <!-- Expand button -->
        <button class="order-toggle flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-900 font-medium flex-shrink-0 transition-colors"
                data-order-id="${order.id}">
          <span class="toggle-label">View Details</span>
          <svg class="chevron-icon w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      <!-- Expandable details -->
      <div id="order-details-${order.id}" class="hidden border-t border-gray-100">
        <div class="p-5 grid sm:grid-cols-2 gap-6">

          <!-- Contact info -->
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</p>
            <div class="space-y-1.5 text-sm text-gray-700">
              ${order.contactName  ? `<p><span class="text-gray-400">Name:</span> ${order.contactName}</p>`   : ''}
              ${order.contactEmail ? `<p><span class="text-gray-400">Email:</span> ${order.contactEmail}</p>` : ''}
              ${order.contactPhone ? `<p><span class="text-gray-400">Phone:</span> ${order.contactPhone}</p>` : ''}
              ${order.businessName ? `<p><span class="text-gray-400">Business:</span> ${order.businessName}</p>` : ''}
              ${order.notes        ? `<p class="mt-2"><span class="text-gray-400">Notes:</span><br><span class="text-gray-600">${order.notes}</span></p>` : ''}
            </div>
          </div>

          <!-- Items -->
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</p>
            <div class="space-y-0">
              ${itemDetails}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
