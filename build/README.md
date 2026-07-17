# Tailwind CSS build

`frontend/css/tailwind.css` is compiled statically (the runtime CDN build was removed for performance/SEO).

Rebuild after adding new Tailwind classes to any HTML/JS in `frontend/`:

```bash
cd build
npx -y tailwindcss@3.4.17 -c tailwind.config.js -i input.css -o ../frontend/css/tailwind.css --minify
```

Then bump the `?v=` query string on the `css/tailwind.css` link in the HTML files to bust Cloudflare cache.
