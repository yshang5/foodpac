/**
 * design-widget.js — "Design Online" entry point on inner pages.
 *
 * Injects the floating "Design Online" button and routes every design
 * entry point to the homepage AI design modal (index.html?design=1).
 * The old Packify chat widget has been retired — see git history if it
 * ever needs to be resurrected.
 */

const DESIGN_URL = 'index.html?design=1';

export function initDesignWidget() {
  if (!document.getElementById('fp-fab')) {
    document.body.insertAdjacentHTML('beforeend', `
      <a id="fp-fab" href="${DESIGN_URL}"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5
               bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold rounded-2xl
               shadow-lg shadow-accent-500/30 hover:shadow-xl hover:shadow-accent-500/40
               hover:-translate-y-0.5 transition-all duration-200">
        <img src="assets/images/logo-icon-v2.png?v=9" alt="" class="w-5 h-5 shrink-0 rounded-full bg-white/90 object-contain">
        Design Online
      </a>
    `);
  }

  // Any element marked data-open-design also routes to the design modal
  document.querySelectorAll('[data-open-design]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); window.location.href = DESIGN_URL; });
  });
}

// Legacy global used by old inline onclick handlers
window.openDesignWidget = () => { window.location.href = DESIGN_URL; };
