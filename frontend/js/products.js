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
  { id: 'box-takeout', price: '0.22', category: 'boxes',   name: 'Kraft Take-Out Box',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-box-lunat-takeout.svg',
    description: 'Classic folding kraft box with a grease-resistant liner. The all-purpose choice for rice bowls, mains and combo meals.' },

  { id: 'box-chinese', price: '0.24', category: 'boxes',   name: 'Chinese Take-Out Box',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '1,000',
    image: 'assets/images/prod-box-lunat-chinese.svg',
    description: 'The iconic fold-top pail for noodles, fried rice and stir-fries. Leak-resistant paperboard, no assembly needed.' },

  { id: 'box-burger', price: '0.26',  category: 'boxes',   name: 'Compostable Burger Box',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '1,000',
    image: 'assets/images/prod-box-lunat-burger.svg',
    description: 'Hinged clamshell in compostable fibre. Vented lid keeps buns crisp — fully compliant with Canada\'s plastics rules.' },

  { id: 'box-fry', price: '0.08',     category: 'boxes',   name: 'French Fry Holder',
    tag: 'Economical',  tagStyle: 'gray',   moq: '2,000',
    image: 'assets/images/prod-box-lunat-fry.svg',
    description: 'Open-top scoop for fries and hot sides. Quick to fill during the rush, printed edge-to-edge with your brand.' },

  { id: 'box-hotdog', price: '0.12',  category: 'boxes',   name: 'Hot Dog Box',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-box-lunat-hotdog.svg',
    description: 'Long tray-style box sized for hot dogs, sausages and wraps. Sturdy walls keep toppings in place in transit.' },

  { id: 'box-chicken', price: '0.28', category: 'boxes',   name: 'Fried Chicken Box',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-box-lunat-chicken.svg',
    description: 'Tuck-top box with an auto-locking bottom and steam vents — fried chicken stays crispy, never soggy.' },

  { id: 'box-dessert', price: '0.30', category: 'boxes',   name: 'Dessert Box w/ Clear Lid',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-box-lunat-dessert.svg',
    description: 'White paperboard base with a crystal-clear PLA lid. Showcases cakes, cookies and desserts at the counter.' },

  { id: 'box-donut', price: '0.32',   category: 'boxes',   name: 'Donut Box w/ Window',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-box-lunat-donut.svg',
    description: 'Wide flat box with a clear window for donuts and pastries. Grease-resistant board that prints beautifully.' },

  { id: 'box-pizza', price: '0.45',   category: 'boxes',   name: 'Kraft Corrugated Pizza Box',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-box-lunat-pizza.svg',
    description: 'Greaseproof corrugated kraft keeps pizza hot and crisp on delivery. Available in 10″ to 16″ sizes.' },

  { id: 'box-gable', price: '0.35',   category: 'boxes',   name: 'Paper Gable Box',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-box-lunat-gable.svg',
    description: 'Carry-handle box for combo meals, cupcakes and catering. Ships and stores flat, folds up in seconds.' },

  { id: 'box-tray', price: '0.07',    category: 'boxes',   name: 'Paper Food Tray',
    tag: 'Economical',  tagStyle: 'gray',   moq: '2,000',
    image: 'assets/images/prod-box-lunat-tray.svg',
    description: 'Open boat tray for appetizers, spring rolls and snacks. The lowest-cost way to brand every serving.' },

  { id: 'box-bento', price: '0.30',   category: 'boxes',   name: 'Tuck-Top Bento Box',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-box-lunat-bento.svg',
    description: 'Slim tuck-top box for sushi, bento and lunch sets. Clean lines and a premium unboxing feel.' },

  // ── Cups & Lids ────────────────────────────────────────────
  { id: 'cup-hot', price: '0.14',     category: 'cups',    name: 'Hot Drink Cup (8/12/16 oz)',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-cup-hot.jpg?v=2',
    description: 'Single-wall paper cup for coffee, tea, and hot drinks. Compatible with standard lids. Full-wrap print.' },

  { id: 'cup-cold', price: '0.13',    category: 'cups',    name: 'Cold Drink Cup (16/22 oz)',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-cup-cold.jpg?v=2',
    description: 'Clear PLA cold cup — 100% compostable. Dome or flat lid options. Great for iced drinks and smoothies.' },

  { id: 'cup-sleeve', price: '0.07',  category: 'cups',    name: 'Cup Sleeve',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '2,000',
    image: 'assets/images/prod-cup-sleeve.jpg?v=2',
    description: 'Corrugated kraft sleeve for hot cups. Keeps hands cool while showing off your brand.' },

  { id: 'cup-lid', price: '0.06',     category: 'cups',    name: 'Compostable Lids',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '2,000',
    image: 'assets/images/prod-cup-lid.jpg?v=2',
    description: 'PLA flat and dome lids to pair with our hot and cold cups. Fully compostable.' },

  // ── Paper Bags ─────────────────────────────────────────────
  { id: 'bag-sm', price: '0.18',      category: 'bags',    name: 'Kraft Paper Bag (Small)',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-bag-sm.jpg?v=2',
    description: 'Flat-bottom kraft bag for light takeout and pastries. Twisted paper handles. Printed with your logo.' },

  { id: 'bag-lg', price: '0.24',      category: 'bags',    name: 'Kraft Paper Bag (Large)',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-bag-lg.jpg?v=2',
    description: 'Larger flat-bottom bag for full meal orders. Strong twisted handles support up to 3 kg. Fully recyclable.' },

  { id: 'bag-foil', price: '0.42',    category: 'bags',    name: 'Foil-Lined Insulated Bag',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-bag-foil.jpg?v=2',
    description: 'Keeps food warm during delivery. Foil interior with kraft exterior. Ideal for delivery platforms.' },
  { id: 'bag-white', price: '0.26',   category: 'bags',    name: 'White Paper Bag w/ Handle',
    tag: '',            tagStyle: '',       moq: '1,000',
    image: 'assets/images/prod-bag-white.jpg',
    description: 'Clean white paper bag with twisted handles. A bright canvas that makes brand colors pop.' },

  { id: 'bag-flat', price: '0.10',    category: 'bags',    name: 'Kraft Paper Bag (No Handle)',
    tag: 'Economical',  tagStyle: 'gray',   moq: '2,000',
    image: 'assets/images/prod-bag-flat.jpg',
    description: 'Flat-bottom SOS kraft bag without handles. The budget-friendly choice for counter service and quick takeout.' },

  { id: 'bag-tshirt', price: '0.06',  category: 'bags',    name: 'Compostable T-Shirt Bag',
    tag: 'Economical',  tagStyle: 'gray',   moq: '2,000',
    image: 'assets/images/prod-bag-tshirt.jpg',
    description: 'Loop-handle takeout bag in compostable bio-film — the classic convenience format, made plastics-rules compliant.' },

  { id: 'bag-reusable', price: '0.32', category: 'bags',   name: 'Reusable To-Go Bag',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '1,000',
    image: 'assets/images/prod-bag-reusable.jpg',
    description: 'Sturdy non-woven tote customers keep and reuse — your brand walks around town for months.' },

  { id: 'bag-cup2', price: '0.09',    category: 'bags',    name: 'Drink Carrier Bag (1–2 Cups)',
    tag: 'New',         tagStyle: 'blue',   moq: '2,000',
    image: 'assets/images/prod-bag-cup2.jpg',
    description: 'Kraft carrier that holds one or two cups upright and spill-free. Perfect for delivery platforms and coffee runs.' },

  { id: 'bag-bakery', price: '0.08',  category: 'bags',    name: 'Bakery Bag',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-bag-bakery.jpg',
    description: 'Greaseproof flat bag for croissants, cookies and pastries. Fold-over top keeps baked goods fresh.' },

  { id: 'bag-gift', price: '0.48',    category: 'bags',    name: 'Gift Bag w/ Handle',
    tag: 'New',         tagStyle: 'blue',   moq: '500',
    image: 'assets/images/prod-bag-gift.jpg',
    description: 'Premium thick-stock gift bag with ribbon handles for gift cards, merch and special occasions.' },


  // ── Bowls ──────────────────────────────────────────────────
  { id: 'bowl-salad', price: '0.19',  category: 'bowls',   name: 'Salad & Grain Bowl',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '1,000',
    image: 'assets/images/prod-bowl-salad.jpg?v=2',
    description: 'Wide, shallow bowl for salads, grain bowls, and poke. Kraft exterior, PLA-lined interior. Leak-proof.' },

  { id: 'bowl-soup', price: '0.28',   category: 'bowls',   name: 'Soup & Ramen Bowl',
    tag: 'Best Seller', tagStyle: 'orange', moq: '1,000',
    image: 'assets/images/prod-bowl-soup.jpg?v=2',
    description: 'Deep bowl with vented lid designed for soups, ramen, and hot broths. Double-wall for heat retention.' },

  { id: 'bowl-lid', price: '0.08',    category: 'bowls',   name: 'Bowl Lids (Flat & Vented)',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-bowl-lid.jpg?v=2',
    description: 'Compostable PLA lids in flat and vented styles to fit our full bowl range.' },

  // ── Wrapping Paper ─────────────────────────────────────────
  { id: 'wrap-deli', price: '0.05',   category: 'wraps',   name: 'Deli Wrap Paper',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '2,000',
    image: 'assets/images/prod-wrap-deli.jpg?v=2',
    description: 'Greaseproof kraft deli paper in sheets or rolls. Perfect for wrapping burgers, sandwiches, and fish & chips.' },

  { id: 'wrap-tissue', price: '0.04', category: 'wraps',   name: 'Custom Tissue Paper',
    tag: 'New',         tagStyle: 'blue',   moq: '2,000',
    image: 'assets/images/prod-wrap-tissue.jpg?v=2',
    description: 'Lightweight tissue paper printed with your logo or pattern. Great for lining bags and food trays.' },

  // ── Cutlery ────────────────────────────────────────────────
  { id: 'cut-set', price: '0.09',     category: 'cutlery', name: 'Compostable Cutlery Set',
    tag: 'Eco Pick',    tagStyle: 'green',  moq: '1,000',
    image: 'assets/images/prod-cut-set.jpg?v=2',
    description: 'Fork, knife, and spoon made from CPLA (cornstarch). Wrapped individually. Heat-resistant up to 85°C.' },

  { id: 'cut-set4', price: '0.16',    category: 'cutlery', name: 'Cutlery Set (Fork, Knife, Spoon, Napkin)',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-cut-set4.jpg',
    description: '4-in-1 sealed packet: CPLA fork, knife, spoon and a napkin in one custom-printed sleeve. One packet per order — faster for staff.' },

  { id: 'cut-set-asian', price: '0.15', category: 'cutlery', name: 'Cutlery Set (Chopsticks, Spoon, Napkin)',
    tag: 'New',         tagStyle: 'blue',   moq: '1,000',
    image: 'assets/images/prod-cut-set-asian.jpg',
    description: 'Bamboo chopsticks, CPLA spoon and napkin in a sealed kraft sleeve. Ideal for noodle, rice and sushi restaurants.' },

  { id: 'cut-chopsticks', price: '0.06', category: 'cutlery', name: 'Chopsticks w/ Paper Wrapping',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-cut-chopsticks.jpg',
    description: 'Hygienic bamboo chopsticks in a custom-printed paper sleeve. Smooth finish, no splinters.' },

  { id: 'cut-napkin', price: '0.02',  category: 'cutlery', name: '2-Ply Beverage Napkin',
    tag: '',            tagStyle: '',       moq: '5,000',
    image: 'assets/images/prod-cut-napkin.jpg',
    description: 'Soft 2-ply napkins printed with your logo. The lowest-cost branding touchpoint on every table and tray.' },

  { id: 'cut-wipe', price: '0.08',    category: 'cutlery', name: 'Wet Wipe Pack',
    tag: 'New',         tagStyle: 'blue',   moq: '2,000',
    image: 'assets/images/prod-cut-wipe.jpg',
    description: 'Individually sealed refreshing wet wipes with custom printing. A thoughtful finish for BBQ, seafood and fried chicken.' },

  { id: 'cut-fork', price: '0.04',    category: 'cutlery', name: 'CPLA Fork',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-cut-fork.jpg?v=2',
    description: 'Sturdy CPLA fork — compostable and stronger than standard PLA. Sold individually or in bulk.' },

  { id: 'cut-spoon', price: '0.04',   category: 'cutlery', name: 'CPLA Spoon',
    tag: '',            tagStyle: '',       moq: '2,000',
    image: 'assets/images/prod-cut-spoon.jpg?v=2',
    description: 'Deep-bowl CPLA spoon, ideal for soups, desserts, and rice dishes.' },

  { id: 'cut-straw', price: '0.03',   category: 'cutlery', name: 'Paper Straws',
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
  { key: 'bags',    label: 'Bags' },
  { key: 'bowls',   label: 'Bowls' },
  { key: 'wraps',   label: 'Wrapping Paper' },
  { key: 'cutlery', label: 'Cutlery' },
];
