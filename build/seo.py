#!/usr/bin/env python3
"""Inject SEO meta blocks into foodpac frontend pages (idempotent: replaces <title> line)."""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'frontend'
BASE = 'https://foodpac.ai'
OG_IMG = f'{BASE}/assets/images/hero-box.jpg'

PAGES = {
    'index.html': {
        'canonical': f'{BASE}/',
        'title': 'Custom Restaurant Takeout Packaging Canada | AI Design in 5 Minutes – foodPac',
        'desc': 'Branded takeout packaging for Canadian restaurants. AI-powered design in 5 minutes, 100% compostable materials, low 1,000-unit minimums, delivered across Canada.',
    },
    'products.html': {
        'canonical': f'{BASE}/products.html',
        'title': 'Custom Takeout Boxes, Cups & Eco Packaging for Restaurants – foodPac Canada',
        'desc': 'Custom-printed takeout boxes, coffee cups, kraft bags, bowls and compostable cutlery. Eco-friendly materials, low minimums from 1,000 units, shipped across Canada.',
    },
    'about.html': {
        'canonical': f'{BASE}/about.html',
        'title': 'About foodPac – Custom Food Packaging for Canadian Restaurants',
        'desc': 'foodPac helps independent Canadian restaurants get professional branded packaging with AI-powered design, compostable materials and flexible small-batch ordering.',
    },
    'contact.html': {
        'canonical': f'{BASE}/contact.html',
        'title': 'Get a Free Quote – Custom Restaurant Packaging Canada | foodPac',
        'desc': 'Request a free quote and AI packaging design mockup for your restaurant. Response within 24 hours. Serving Toronto, Vancouver, Montreal and all of Canada.',
    },
}

NOINDEX = ['cart.html', 'orders.html', 'profile.html', 'design.html', 'packify-test.html']

def block(p):
    return f'''<title>{p['title']}</title>
  <meta name="description" content="{p['desc']}" />
  <link rel="canonical" href="{p['canonical']}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="foodPac" />
  <meta property="og:title" content="{p['title']}" />
  <meta property="og:description" content="{p['desc']}" />
  <meta property="og:url" content="{p['canonical']}" />
  <meta property="og:image" content="{OG_IMG}" />
  <meta property="og:locale" content="en_CA" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{p['title']}" />
  <meta name="twitter:description" content="{p['desc']}" />
  <meta name="twitter:image" content="{OG_IMG}" />'''

for name, p in PAGES.items():
    f = ROOT / name
    html = f.read_text()
    # strip any previously injected block (title through last twitter meta), then re-inject
    html = re.sub(r'<title>.*?</title>(\n\s*<meta name="description".*?<meta name="twitter:image"[^>]*/>)?',
                  block(p), html, count=1, flags=re.S)
    f.write_text(html)
    print(f'ok {name}')

for name in NOINDEX:
    f = ROOT / name
    html = f.read_text()
    if 'name="robots"' not in html:
        html = html.replace('<title>', '<meta name="robots" content="noindex,nofollow" />\n  <title>', 1)
        f.write_text(html)
    print(f'noindex {name}')
