# Hosting ShambConkins on a Cloudflare domain

`worker.js` is a Cloudflare Worker that always serves the **newest GitHub Release** of the game.
Publishing a new release on GitHub (with its `ShambConkins_vX.html` asset) is all it takes: the site
switches to it within ~5 minutes. Nothing in Cloudflare needs touching per release.

Why a Worker instead of Cloudflare Pages: Pages refuses files over 25 MB, and the game is ~80 MB.

## One-time setup (dashboard, no tools needed)
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker** → name it `shambconkins` → **Deploy**.
2. **Edit code**, replace everything with the contents of `worker.js`, **Deploy**.
3. Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain** → e.g. `play.yourdomain.com`
   (the domain must be on this Cloudflare account; DNS and HTTPS are set up for you).

Free plan is enough (100,000 requests a day; the file is cached by Cloudflare, GitHub is only hit once per data centre per release).

## Addresses
- `/` newest release · `/download` newest as a file · `/v0.60.0` a specific release · `/version` newest tag
- `/manifest.webmanifest`, `/sw.js`, `/icons/*.png`, `/index.html`: the installable-app files of the newest release
  (from v0.63.1 every release carries them as small assets). They make Chrome install a real app (no Chrome badge on
  the icon) that opens full screen, works offline and updates itself.

## Updating the Worker code (when `worker.js` changes)
Cloudflare dashboard → **Workers & Pages** → `shambconkins` → **Edit code** → select all, paste the new `worker.js`
→ **Deploy**. Use Chrome on Android (Samsung Internet blocks pasting there).

## Notes
- Browsers keep the 80 MB page and only re-check the version on each visit (a 304 if unchanged).
- Saves live in the browser per address: the website has its own saves, separate from a downloaded copy.
- Release files must keep the name `ShambConkins_<tag>.html` (any other `.html` asset is found through the
  GitHub API; add a `GITHUB_TOKEN` secret to the Worker if that ever hits GitHub's rate limit).
- Online character photos work better here than from a downloaded file (no file:// CORS blocks).
