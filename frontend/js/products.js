/**
 * products.js — Local product data.
 *
 * This file is a TEMPORARY data layer. Once the Spring Boot backend
 * is ready, api.js will call GET /api/v1/products instead and this
 * file can be deleted or kept as a fallback/seed reference.
 *
 * Data shape mirrors the backend Product entity so the swap is seamless.
 */

const PRODUCTS = [
  // ── Takeout Boxes ──────────────────────────────────────────
  { id: 'box-kraft',   category: 'boxes',   name: 'Kraft Takeout Box',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '1,000',
    image: 'assets/images/prod-box-kraft.jpg?v=2',
    description: 'Classic kraft paperboard box. Grease-resistant liner, microwave-safe. Perfect for burgers, rice bowls, and more.' },

  { id: 'box-hinged',  category: 'boxes',   name: 'Hinged-Lid Clamshell',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-box-hinged.jpg?v=2',
    description: 'One-piece fold-over design. No assembly needed. Great for sandwiches, salads, and hot entrées.' },

  { id: 'box-noodle',  category: 'boxes',   name: 'Noodle & Rice Box',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-box-noodle.jpg?v=2',
    description: 'Tall, sturdy paperboard box designed for noodles, fried rice, and deep-filled dishes. Leak-resistant.' },

  { id: 'box-window',  category: 'boxes',   name: 'Window Pastry Box',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-box-window.jpg?v=2',
    description: 'Kraft box with a clear PLA window. Ideal for pastries, cakes, and baked goods. Showcases your product.' },

  // ── Cups & Lids ────────────────────────────────────────────
  { id: 'cup-hot',     category: 'cups',    name: 'Hot Drink Cup (8/12/16 oz)',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-cup-hot.jpg?v=2',
    description: 'Single-wall paper cup for coffee, tea, and hot drinks. Compatible with standard lids. Full-wrap print.' },

  { id: 'cup-cold',    category: 'cups',    name: 'Cold Drink Cup (16/22 oz)',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-cup-cold.jpg?v=2',
    description: 'Clear PLA cold cup — 100% compostable. Dome or flat lid options. Great for iced drinks and smoothies.' },

  { id: 'cup-sleeve',  category: 'cups',    name: 'Cup Sleeve',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '2,000',
    image: 'assets/images/prod-cup-sleeve.jpg?v=2',
    description: 'Corrugated kraft sleeve for hot cups. Keeps hands cool while showing off your brand.' },

  { id: 'cup-lid',     category: 'cups',    name: 'Compostable Lids',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '2,000',
    image: 'assets/images/prod-cup-lid.jpg?v=2',
    description: 'PLA flat and dome lids to pair with our hot and cold cups. Fully compostable.' },

  // ── Paper Bags ─────────────────────────────────────────────
  { id: 'bag-sm',      category: 'bags',    name: 'Kraft Paper Bag (Small)',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-bag-sm.jpg?v=2',
    description: 'Flat-bottom kraft bag for light takeout and pastries. Twisted paper handles. Printed with your logo.' },

  { id: 'bag-lg',      category: 'bags',    name: 'Kraft Paper Bag (Large)',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-bag-lg.jpg?v=2',
    description: 'Larger flat-bottom bag for full meal orders. Strong twisted handles support up to 3 kg. Fully recyclable.' },

  { id: 'bag-foil',    category: 'bags',    name: 'Foil-Lined Insulated Bag',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-bag-foil.jpg?v=2',
    description: 'Keeps food warm during delivery. Foil interior with kraft exterior. Ideal for delivery platforms.' },

  // ── Bowls ──────────────────────────────────────────────────
  { id: 'bowl-salad',  category: 'bowls',   name: 'Salad & Grain Bowl',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '1,000',
    image: 'assets/images/prod-bowl-salad.jpg?v=2',
    description: 'Wide, shallow bowl for salads, grain bowls, and poke. Kraft exterior, PLA-lined interior. Leak-proof.' },

  { id: 'bowl-soup',   category: 'bowls',   name: 'Soup & Ramen Bowl',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-bowl-soup.jpg?v=2',
    description: 'Deep bowl with vented lid designed for soups, ramen, and hot broths. Double-wall for heat retention.' },

  { id: 'bowl-lid',    category: 'bowls',   name: 'Bowl Lids (Flat & Vented)',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-bowl-lid.jpg?v=2',
    description: 'Compostable PLA lids in flat and vented styles to fit our full bowl range.' },

  // ── Wrapping Paper ─────────────────────────────────────────
  { id: 'wrap-deli',   category: 'wraps',   name: 'Deli Wrap Paper',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '2,000',
    image: 'assets/images/prod-wrap-deli.jpg?v=2',
    description: 'Greaseproof kraft deli paper in sheets or rolls. Perfect for wrapping burgers, sandwiches, and fish & chips.' },

  { id: 'wrap-tissue', category: 'wraps',   name: 'Custom Tissue Paper',
    tag: 'New',         tagStyle: 'blue',   moq: '2,000',
    image: 'assets/images/prod-wrap-tissue.jpg?v=2',
    description: 'Lightweight tissue paper printed with your logo or pattern. Great for lining bags and food trays.' },

  // ── Cutlery ────────────────────────────────────────────────
  { id: 'cut-set',     category: 'cutlery', name: 'Compostable Cutlery Set',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '1,000',
    image: 'assets/images/prod-cut-set.jpg?v=2',
    description: 'Fork, knife, and spoon made from CPLA (cornstarch). Wrapped individually. Heat-resistant up to 85°C.' },

  { id: 'cut-set4',    category: 'cutlery', name: 'Cutlery Set (Fork, Knife, Spoon, Napkin)',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-cut-set4.jpg',
    description: '4-in-1 sealed packet: CPLA fork, knife, spoon and a napkin in one custom-printed sleeve. One packet per order — faster for staff.' },

  { id: 'cut-set-asian', category: 'cutlery', name: 'Cutlery Set (Chopsticks, Spoon, Napkin)',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-cut-set-asian.jpg',
    description: 'Bamboo chopsticks, CPLA spoon and napkin in a sealed kraft sleeve. Ideal for noodle, rice and sushi restaurants.' },

  { id: 'cut-chopsticks', category: 'cutlery', name: 'Chopsticks w/ Paper Wrapping',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-cut-chopsticks.jpg',
    description: 'Hygienic bamboo chopsticks in a custom-printed paper sleeve. Smooth finish, no splinters.' },

  { id: 'cut-napkin',  category: 'cutlery', name: '2-Ply Beverage Napkin',
    tag: '',            tagStyle: '',       moq: '5,000',
    image: 'assets/images/prod-cut-napkin.jpg',
    description: 'Soft 2-ply napkins printed with your logo. The lowest-cost branding touchpoint on every table and tray.' },

  { id: 'cut-wipe',    category: 'cutlery', name: 'Wet Wipe Pack',
    tag: 'New',         tagStyle: 'blue',   moq: '2,000',
    image: 'assets/images/prod-cut-wipe.jpg',
    description: 'Individually sealed refreshing wet wipes with custom printing. A thoughtful finish for BBQ, seafood and fried chicken.' },

  { id: 'cut-fork',    category: 'cutlery', name: 'CPLA Fork',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-cut-fork.jpg?v=2',
    description: 'Sturdy CPLA fork — compostable and stronger than standard PLA. Sold individually or in bulk.' },

  { id: 'cut-spoon',   category: 'cutlery', name: 'CPLA Spoon',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-cut-spoon.jpg?v=2',
    description: 'Deep-bowl CPLA spoon, ideal for soups, desserts, and rice dishes.' },

  { id: 'cut-straw',   category: 'cutlery', name: 'Paper Straws',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '2,000',
    image: 'assets/images/prod-straw.jpg?v=2',
    description: 'Food-grade paper straws. Stays firm for 2+ hours. Available in plain kraft or custom-printed.' },
];

/**
 * Returns products filtered by category.
 * @param {string} [category] — 'all' or a specific category key
 * @returns {Array}
 */
export function getProducts(category) {
  if (!category || category === 'all') return PRODUCTS;
  return PRODUCTS.filter(p => p.category === category);
}

export const CATEGORIES = [
  { key: 'all',     label: 'All Products' },
  { key: 'boxes',   label: 'Takeout Boxes' },
  { key: 'cups',    label: 'Cups & Lids' },
  { key: 'bags',    label: 'Paper Bags' },
  { key: 'bowls',   label: 'Bowls' },
  { key: 'wraps',   label: 'Wrapping Paper' },
  { key: 'cutlery', label: 'Cutlery' },
];
