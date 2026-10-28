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

## Online rooms (two-phone play)
`/room/<name>` is a WebSocket into a room: one Durable Object (class `Room` in `worker.js`) per room name, two seats,
a relay between the phones (the game logic stays on the phones, `src/net.js` + `src/duel.js`). Rooms need the `ROOMS`
binding in `wrangler.toml`, which the dashboard paste can't create, so the Worker is deployed by GitHub instead.

### One-time setup: let GitHub deploy the Worker (Chrome on the phone works)
1. Cloudflare dashboard → profile icon → **My Profile** → **API Tokens** → **Create Token** → template
   **Edit Cloudflare Workers** → **Use template** → Account Resources: your account, Zone Resources: All zones →
   **Continue to summary** → **Create Token** → copy the token.
2. Cloudflare dashboard → **Workers & Pages** → the **Account ID** on the right → copy it.
3. GitHub → the repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   `CLOUDFLARE_API_TOKEN` = the token, then another: `CLOUDFLARE_ACCOUNT_ID` = the account id.
4. GitHub → **Actions** → **Deploy the website Worker** → **Run workflow** (main). After that it redeploys by itself
   whenever `cloudflare/` changes on main.
Check: `https://shambconkins.loki-mylo.work/room/test` should answer "Expected a WebSocket" (not "not set up").

Free plan: SQLite Durable Objects are included; an idle room hibernates and costs nothing.
Local test: `cd cloudflare && npx wrangler dev --local --port 8787`, then `node tests/online.mjs`.

## Updating the Worker code (when `worker.js` changes)
With the GitHub deploy set up (above) nothing to do. Without it:
Cloudflare dashboard → **Workers & Pages** → `shambconkins` → **Edit code** → select all, paste the new `worker.js`
→ **Deploy** (the site works that way, online rooms don't). Use Chrome on Android (Samsung Internet blocks pasting there).

## Notes
- Browsers keep the 80 MB page and only re-check the version on each visit (a 304 if unchanged).
- Saves live in the browser per address: the website has its own saves, separate from a downloaded copy.
- Release files must keep the name `ShambConkins_<tag>.html` (any other `.html` asset is found through the
  GitHub API; add a `GITHUB_TOKEN` secret to the Worker if that ever hits GitHub's rate limit).
- Online character photos work better here than from a downloaded file (no file:// CORS blocks).

## Checking the live rooms
GitHub → **Actions** → **Probe the online rooms** → **Run workflow**: joins rooms on the live site from a GitHub
machine (Node + real Chromium and Firefox), streams messages like a real-time game, tails the Worker's logs and prints
Cloudflare's hourly Worker / Durable Object numbers (`tools/net-probe.mjs`, `tools/net-probe-browser.mjs`,
`tools/cf-report.mjs`). Free plan: 100,000 Durable Object requests a day (incoming WebSocket messages count 20 to 1);
a real-time game sends ~15-30 messages a second per phone, far below that.
A seat whose phone has said nothing for 60 s (phones ping every 10 s) is freed when a third phone needs it.
