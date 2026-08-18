# VPS Deployment

## 1. Build the frontend

```bash
npm install
npm run build          # produces dist/
```

Set `VITE_API_URL` **only** if the API is on a different domain than the frontend.
If you use the nginx config here (API proxied at `/api` on the same domain), leave it
empty — that is the simpler and recommended setup.

## 2. Run the API

```bash
cd backend
npm install --omit=dev
npm i -g pm2
pm2 start src/server.js --name cgs-api
pm2 save && pm2 startup
```

`backend/.env` on the server must have:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=<your Atlas connection string>
JWT_SECRET=<fresh 48-byte random string>
CLIENT_ORIGIN=https://your-domain.com
```

## 3. Serve the frontend

```bash
sudo mkdir -p /var/www/cgs
sudo cp -r dist /var/www/cgs/
sudo cp deploy/nginx.conf /etc/nginx/sites-available/cgs
sudo ln -s /etc/nginx/sites-available/cgs /etc/nginx/sites-enabled/cgs
sudo nginx -t && sudo systemctl reload nginx
```

## 4. HTTPS

```bash
sudo certbot --nginx -d your-domain.com
```

---

## "The app looks zoomed in on the VPS"

This is almost always **the CSS not loading**, not an actual zoom. With no stylesheet
the browser falls back to its defaults — 16px base text, huge headings, full-width
stacked blocks — which reads exactly like the page is zoomed in.

Check in this order:

1. **Open DevTools → Network, reload, filter by CSS.** If `index-*.css` is 404, the
   assets aren't where nginx expects. `root` must point at the folder *containing*
   `index.html`, i.e. `/var/www/cgs/dist`.

2. **Did you deploy `dist/`, or the source folder?** Only `dist/` is servable. Serving
   the project root gives you an `index.html` referencing `/src/main.tsx`, which the
   browser cannot execute.

3. **Deploying into a subfolder** (e.g. `example.com/cgs/`)? Asset URLs are absolute
   from `/` by default. Either serve from the domain root, or set `base: "/cgs/"` in
   `vite.config.ts` and rebuild.

4. **Stale `index.html` cached** by nginx or Cloudflare, pointing at asset hashes that
   no longer exist. The config here sends `no-cache` for `index.html`. Purge the CDN
   cache after each deploy.

5. **Browser zoom** — press `Ctrl + 0` to reset. Worth ruling out before anything else.

The app itself pins `html { font-size: 16px }` and sets `text-size-adjust: 100%`, so
mobile font-boosting can no longer inflate the layout.

---

## Performance notes

Initial load is **~427 KB** (~134 KB gzipped). Everything else is fetched on demand:

| Chunk    | Size    | Loads when                       |
| -------- | ------- | -------------------------------- |
| Recharts | ~422 KB | Dashboard or Reports is opened   |
| jsPDF    | ~425 KB | An export/print button is pressed |

Generated invoice PDFs are around **20–25 KB** thanks to stream compression and a
downscaled logo.
