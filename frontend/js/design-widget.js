/**
 * Backward-compatibility shim.
 * products.html / about.html / contact.html still import initDesignWidget from here.
 * We just forward to the new Packify integration so every page gets the
 * full FAB + Packify SDK without touching each page's script block.
 */
export { initPackify as initDesignWidget } from './packify.js';
