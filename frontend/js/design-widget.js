/**
 * design-widget.js — "Design Online" entry point on inner pages.
 *
 * Injects the floating "Design Online" button and boots the shared design
 * modal (design-modal.js) so the full design flow opens in place — no
 * redirect to the homepage. The old Packify chat widget has been retired.
 */

import { initDesignModal } from './design-modal.js?v=20260728b';

export function initDesignWidget() {
  // 悬浮入口由 design-modal 统一提供（0 设计 = Design Online；有设计 = + New | My Designs）
  initDesignModal();

  // Any element marked data-open-design also opens the design modal
  document.querySelectorAll('[data-open-design]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); window.fpOpenDesign(); });
  });
}

// Legacy global used by old inline onclick handlers (e.g. index-prev.html)
window.openDesignWidget = () => window.fpOpenDesign?.();
