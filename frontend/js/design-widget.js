/**
 * design-widget.js — "Design Online" entry point on inner pages.
 *
 * Injects the floating "Design Online" button and boots the shared design
 * modal (design-modal.js) so the full design flow opens in place — no
 * redirect to the homepage. The old Packify chat widget has been retired.
 */

import { initDesignModal } from './design-modal.js?v=20260727c';

export function initDesignWidget() {
  initDesignModal();

  if (!document.getElementById('fp-fab')) {
    document.body.insertAdjacentHTML('beforeend', `
      <button id="fp-fab" onclick="fpOpenDesign()"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5
               bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold rounded-2xl
               shadow-lg shadow-accent-500/30 hover:shadow-xl hover:shadow-accent-500/40
               hover:-translate-y-0.5 transition-all duration-200">
        <img src="assets/images/logo-icon-v2.png?v=9" alt="" class="w-5 h-5 shrink-0 rounded-full bg-white/90 object-contain">
        Design Online
      </button>
    `);
  }

  // Any element marked data-open-design also opens the design modal
  document.querySelectorAll('[data-open-design]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); window.fpOpenDesign(); });
  });
}

// Legacy global used by old inline onclick handlers (e.g. index-prev.html)
window.openDesignWidget = () => window.fpOpenDesign?.();
