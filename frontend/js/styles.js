/**
 * styles.js — the packaging style-template library.
 *
 * Each restaurant type ships 5-6 curated style groups; every group has a
 * "family" hero shot (box + cup + bag together, styled scene) plus the three
 * single-product shots. Images live at assets/styles/<type>/<style>-<part>.jpg.
 *
 * Shared selection state: the homepage hero and the design modal both read /
 * write the current style via getStyle()/setStyle(), which also persists to
 * localStorage and broadcasts a 'fp:style' event so the two stay in sync.
 */

export const STYLE_LIBRARY = [
  {
    id: 'chinese',
    label: 'Chinese Cuisine',
    styles: [
      { id: 's1-imperial',  label: 'Imperial Red & Gold' },
      { id: 's2-pagoda',    label: 'Retro Pagoda' },
      { id: 's3-minimal',   label: 'Modern Minimal' },
      { id: 's5-ink',       label: 'Ink & Brush' },
      { id: 's6-pop',       label: 'Pop Chinatown' },
      { id: 's7-porcelain', label: 'Blue & White Porcelain' },
    ],
  },
  {
    id: 'fastfood',
    label: 'Burgers / Fast Food',
    styles: [
      { id: 's1-diner',   label: 'Retro Diner' },
      { id: 's2-classic', label: 'Bold & Happy' },
      { id: 's3-kraft',   label: 'Craft Smash' },
      { id: 's4-mono',    label: 'Premium Mono' },
      { id: 's5-soda',    label: "'50s Soda Shop" },
      { id: 's6-comic',   label: 'Comic Pop' },
    ],
  },
];

/** parts: 'family' | 'box' | 'cup' | 'bag' */
export function styleImg(typeId, styleId, part) {
  return `assets/styles/${typeId}/${styleId}-${part}.jpg`;
}

export function findStyle(typeId, styleId) {
  const type = STYLE_LIBRARY.find(t => t.id === typeId);
  const style = type?.styles.find(s => s.id === styleId);
  return type && style ? { type, style } : null;
}

/** Random style across all types, optionally different from the current one. */
export function randomStyle(excludeTypeId, excludeStyleId) {
  const all = STYLE_LIBRARY.flatMap(t => t.styles.map(s => ({ type: t, style: s })));
  const pool = all.filter(x => !(x.type.id === excludeTypeId && x.style.id === excludeStyleId));
  return pool[Math.floor(Math.random() * pool.length)];
}

const LS_KEY = 'fp_style';
let _current = null;

export function getStyle() {
  if (_current) return _current;
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved) {
      const found = findStyle(saved.type, saved.style);
      if (found) { _current = found; return _current; }
    }
  } catch {}
  _current = randomStyle();
  return _current;
}

export function setStyle(typeId, styleId) {
  const found = findStyle(typeId, styleId);
  if (!found) return null;
  _current = found;
  try { localStorage.setItem(LS_KEY, JSON.stringify({ type: typeId, style: styleId })); } catch {}
  window.dispatchEvent(new CustomEvent('fp:style', { detail: _current }));
  return _current;
}

export function shuffleStyle() {
  const cur = getStyle();
  const next = randomStyle(cur.type.id, cur.style.id);
  return setStyle(next.type.id, next.style.id);
}
