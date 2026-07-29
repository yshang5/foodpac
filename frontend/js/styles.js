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
  {
    id: 'japanese',
    label: 'Japanese / Sushi',
    styles: [
      { id: 's1-zen',    label: 'Zen Minimal' },
      { id: 's2-edo',    label: 'Edo Wave' },
      { id: 's3-noren',  label: 'Ramen Noren' },
      { id: 's4-sakura', label: 'Sakura' },
      { id: 's5-washi',  label: 'Washi Craft' },
      { id: 's6-neo',    label: 'Neo Tokyo' },
    ],
  },
  {
    id: 'korean',
    label: 'Korean',
    styles: [
      { id: 's1-kbbq',     label: 'Charcoal KBBQ' },
      { id: 's2-hanji',    label: 'Hanji Minimal' },
      { id: 's3-seoulpop', label: 'Seoul Pop' },
      { id: 's4-hanbok',   label: 'Hanbok Pastel' },
      { id: 's5-market',   label: 'Gwangjang Market' },
      { id: 's6-chic',     label: 'Gangnam Chic' },
    ],
  },
  {
    id: 'seasian',
    label: 'Thai / Vietnamese',
    styles: [
      { id: 's1-bangkok',  label: 'Golden Siam' },
      { id: 's2-phofresh', label: 'Pho Fresh' },
      { id: 's3-hawker',   label: 'Street Hawker' },
      { id: 's4-lotus',    label: 'Lotus Pastel' },
      { id: 's5-rattan',   label: 'Rattan Craft' },
      { id: 's6-saigon',   label: 'Saigon Modern' },
    ],
  },
  {
    id: 'indian',
    label: 'Indian',
    styles: [
      { id: 's1-jaipur',   label: 'Jaipur Jewel' },
      { id: 's2-spice',    label: 'Spice Route' },
      { id: 's3-mandala',  label: 'Mandala Line' },
      { id: 's4-marigold', label: 'Marigold Minimal' },
      { id: 's5-peacock',  label: 'Peacock Royal' },
      { id: 's6-dhaba',    label: 'Dhaba Kraft' },
    ],
  },
  {
    id: 'mideast',
    label: 'Middle Eastern / Greek',
    styles: [
      { id: 's1-santorini', label: 'Santorini' },
      { id: 's2-arabesque', label: 'Arabesque Gold' },
      { id: 's3-olive',     label: 'Olive Minimal' },
      { id: 's4-souk',      label: 'Souk Kraft' },
      { id: 's5-mosaic',    label: 'Mosaic Tiles' },
      { id: 's6-shawarma',  label: 'Shawarma Bold' },
    ],
  },
  {
    id: 'mexican',
    label: 'Mexican',
    styles: [
      { id: 's1-talavera', label: 'Talavera' },
      { id: 's2-baja',     label: 'Baja Fresh' },
      { id: 's3-folk',     label: 'Folk Art' },
      { id: 's4-cantina',  label: 'Cantina Kraft' },
      { id: 's5-moderna',  label: 'Taqueria Moderna' },
      { id: 's6-lucha',    label: 'Lucha Pop' },
    ],
  },
  {
    id: 'italian',
    label: 'Italian / Pizza',
    styles: [
      { id: 's1-trattoria', label: 'Trattoria' },
      { id: 's2-napoli',    label: 'Napoli Box' },
      { id: 's3-marble',    label: 'Marmo Elegante' },
      { id: 's4-rustico',   label: 'Rustico' },
      { id: 's5-retrodeli', label: 'Retro Deli' },
      { id: 's6-moderna',   label: 'Milano Minimal' },
    ],
  },
  {
    id: 'grill',
    label: 'BBQ / Grill',
    styles: [
      { id: 's1-smokehouse',  label: 'Smokehouse' },
      { id: 's2-texas',       label: 'Texas Kraft' },
      { id: 's3-butcher',     label: 'Butcher Stripe' },
      { id: 's4-ember',       label: 'Premium Ember' },
      { id: 's5-roadhouse',   label: 'Retro Roadhouse' },
      { id: 's6-charcoalmin', label: 'Charcoal Minimal' },
    ],
  },
  {
    id: 'seafood',
    label: 'Seafood / Fish & Chips',
    styles: [
      { id: 's1-harbor',      label: 'Harbor Stripe' },
      { id: 's2-chippy',      label: 'British Chippy' },
      { id: 's3-coastal',     label: 'Coastal Pastel' },
      { id: 's4-crest',       label: 'Nautical Crest' },
      { id: 's5-wave',        label: 'Wave Minimal' },
      { id: 's6-marketstall', label: 'Fish Market' },
    ],
  },
  {
    id: 'cafe',
    label: 'Cafe / Brunch',
    styles: [
      { id: 's1-artisan',  label: 'Artisan Kraft' },
      { id: 's2-scandi',   label: 'Scandi Morning' },
      { id: 's3-espresso', label: 'Vintage Espresso' },
      { id: 's4-terrazzo', label: 'Terrazzo Play' },
      { id: 's5-sunny',    label: 'Sunny Side' },
      { id: 's6-mono',     label: 'Mono Brew' },
    ],
  },
  {
    id: 'bakery',
    label: 'Bakery / Desserts',
    styles: [
      { id: 's1-patisserie',  label: 'Patisserie' },
      { id: 's2-buttercream', label: 'Buttercream' },
      { id: 's3-frenchlabel', label: 'Vintage Label' },
      { id: 's4-breadkraft',  label: 'Daily Bread' },
      { id: 's5-gelato',      label: 'Gelato Stripe' },
      { id: 's6-cocoa',       label: 'Dark Cocoa' },
    ],
  },
  {
    id: 'healthy',
    label: 'Salad / Poke',
    styles: [
      { id: 's1-leaf',       label: 'Leaf Fresh' },
      { id: 's2-earthbowl',  label: 'Earth Bowl' },
      { id: 's3-clinicclean', label: 'Clean Slate' },
      { id: 's4-poke',       label: 'Poke Tropical' },
      { id: 's5-farmers',    label: 'Farmers Market' },
      { id: 's6-active',     label: 'Active Fuel' },
    ],
  },
];

/** Bump when template images are replaced in place — busts the CDN cache.
 *  Keep in sync with the inline hero script in index.html. */
export const STYLE_VER = 'v3';

/** parts: 'family' | 'box' | 'cup' | 'bag' */
export function styleImg(typeId, styleId, part) {
  return `assets/styles/${typeId}/${styleId}-${part}.jpg?${STYLE_VER}`;
}

/** 480px family thumbnail — use in grids/pickers; full-size for hero/reference. */
export function styleThumb(typeId, styleId) {
  return `assets/styles/${typeId}/${styleId}-family-thumb.jpg?${STYLE_VER}`;
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

/** Random style WITHIN one library type (falls back to global random). */
export function randomStyleIn(typeId) {
  const t = STYLE_LIBRARY.find(x => x.id === typeId);
  if (!t) return randomStyle();
  const s = t.styles[Math.floor(Math.random() * t.styles.length)];
  return { type: t, style: s };
}

/**
 * Form "Restaurant type" value → style library type id (null = no match yet).
 * Extend the matchers as more cuisine style sets ship.
 */
const RESTAURANT_MATCHERS = [
  { re: /chinese|cantonese|dim sum|sichuan|hunan|hot pot/i, type: 'chinese' },
  { re: /burger|fast food|fried chicken|food truck/i, type: 'fastfood' },
  { re: /japanese|sushi|ramen/i, type: 'japanese' },
  { re: /korean/i, type: 'korean' },
  { re: /thai|vietnamese|pho/i, type: 'seasian' },
  { re: /indian/i, type: 'indian' },
  { re: /middle eastern|mediterranean|greek/i, type: 'mideast' },
  { re: /mexican/i, type: 'mexican' },
  { re: /italian|pizza/i, type: 'italian' },
  { re: /bbq|grill/i, type: 'grill' },
  { re: /seafood|fish/i, type: 'seafood' },
  { re: /cafe|coffee|brunch|breakfast/i, type: 'cafe' },
  { re: /bakery|dessert|ice cream/i, type: 'bakery' },
  { re: /salad|healthy|poke/i, type: 'healthy' },
];
export function styleTypeForRestaurant(rt) {
  if (!rt) return null;
  const m = RESTAURANT_MATCHERS.find(x => x.re.test(rt));
  return m && STYLE_LIBRARY.some(t => t.id === m.type) ? m.type : null;
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
