// Cloudflare Worker: serves the newest GitHub Release of ShambConkins on your own domain.
// Nothing to update per release: it asks GitHub which release is "latest" (cached 5 min),
// downloads that release's .html asset once per Cloudflare data centre, and serves it as a web page.
//   /                 newest release
//   /v0.60.0          a specific release
//   /download         newest release as a file download
//   /version          newest release tag (plain text)
//   /index.html, /manifest.webmanifest, /sw.js, /icons/*.png
//                     the installable-app files of the newest release (each release carries them as small assets
//                     next to the .html; tools/build.mjs --pwa). Without them the game still runs, but Chrome can
//                     only make a badged shortcut instead of a real app, and there is no offline cache.
//   /room/<name>      online play: a WebSocket into the room of that name (two phones; the Room Durable Object below).
//                     Needs the ROOMS binding (wrangler.toml); without it the rest of the site works as before.
import { DurableObject } from 'cloudflare:workers';
const REPO = 'seanpconners-source/ShambConkins';
const TAG_TTL = 300;           // seconds before asking GitHub for a newer release again
const UA = 'shambconkins-worker';
const APP_FILES = {
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json', 'no-cache'],
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8', 'no-cache'],   // browsers re-check it to find updates
};
const ICON = /^\/icons\/([a-z0-9-]+\.png)$/;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    let path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/index.html') path = '/';   // the offline cache (sw.js) asks for the game by this name
    const room = path.match(/^\/room\/([^/]{1,80})$/);
    if (room) return roomSocket(req, env, room[1]);
    try {
      if (path === '/version') return text(await latestTag(env, ctx));
      const icon = path.match(ICON), app = APP_FILES[path] || (icon && [icon[1], 'image/png', 'public, max-age=86400']);
      if (app) return appFile(req, app, await latestTag(env, ctx), env, ctx);
      const pinned = path.match(/^\/(v\d+\.\d+\.\d+[\w.-]*)$/);
      if (path !== '/' && path !== '/download' && !pinned) return text('Not found', 404);
      const tag = pinned ? pinned[1] : await latestTag(env, ctx);
      const etag = `"${tag}"`;
      const headers = {
        'Content-Type': 'text/html; charset=utf-8',
        // Browsers keep their copy but check back each visit; an unchanged release answers 304 (no re-download).
        'Cache-Control': pinned ? 'public, max-age=31536000, immutable' : 'no-cache',
        'ETag': etag,
        'X-ShambConkins-Version': tag,
      };
      if (path === '/download') headers['Content-Disposition'] = `attachment; filename="ShambConkins_${tag}.html"`;
      if ((req.headers.get('If-None-Match') || '').split(/,\s*/).includes(etag)) return new Response(null, { status: 304, headers });
      const body = await releaseHtml(tag, env, ctx);
      return new Response(req.method === 'HEAD' ? null : body, { headers });
    } catch (e) {
      return text(`ShambConkins is unavailable right now: ${e.message}`, 502);
    }
  },
};

const text = (s, status = 200) => new Response(s, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
const cacheKey = name => `https://shambconkins.cache/${name}`;

// Newest release tag. github.com/<repo>/releases/latest redirects to .../tag/<tag>, which (unlike the API)
// isn't subject to the 60-requests-an-hour limit shared by everyone on Cloudflare's IPs.
async function latestTag(env, ctx) {
  const cache = caches.default, key = cacheKey('latest-tag');
  const hit = await cache.match(key);
  if (hit) return hit.text();
  let tag = null;
  const r = await fetch(`https://github.com/${REPO}/releases/latest`, { redirect: 'manual', headers: { 'User-Agent': UA } });
  const m = (r.headers.get('Location') || '').match(/\/releases\/tag\/([^/?#]+)$/);
  if (m) tag = decodeURIComponent(m[1]);
  if (!tag) tag = (await api(`releases/latest`, env)).tag_name;
  ctx.waitUntil(cache.put(key, new Response(tag, { headers: { 'Cache-Control': `max-age=${TAG_TTL}` } })));
  return tag;
}

// The release's .html asset body, from this data centre's cache or downloaded from GitHub once.
async function releaseHtml(tag, env, ctx) {
  const cache = caches.default, key = cacheKey(`release/${tag}`);
  const hit = await cache.match(key);
  if (hit) return hit.body;
  // Releases are named ShambConkins_<tag>.html; anything else is looked up through the API.
  let r = await fetch(`https://github.com/${REPO}/releases/download/${tag}/ShambConkins_${tag}.html`, { headers: { 'User-Agent': UA } });
  if (r.status === 404) {
    const rel = await api(`releases/tags/${encodeURIComponent(tag)}`, env);
    const asset = (rel.assets || []).find(a => /\.html?$/i.test(a.name));
    if (!asset) throw new Error(`release ${tag} has no .html file`);
    r = await fetch(asset.browser_download_url, { headers: { 'User-Agent': UA } });
  }
  if (!r.ok) throw new Error(`GitHub answered ${r.status} for ${tag}`);
  // Store first, then serve from the cache: one stream, no 80 MB held in the Worker's memory.
  await cache.put(key, new Response(r.body, { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'max-age=31536000' } }));
  const stored = await cache.match(key);
  if (stored) return stored.body;
  return (await fetch(`https://github.com/${REPO}/releases/download/${tag}/ShambConkins_${tag}.html`, { headers: { 'User-Agent': UA } })).body;
}

// One of the release's small installable-app files, cached per data centre like the game itself.
async function appFile(req, [name, type, cacheControl], tag, env, ctx) {
  const etag = `"${tag}-${name}"`, headers = { 'Content-Type': type, 'Cache-Control': cacheControl, 'ETag': etag, 'X-ShambConkins-Version': tag };
  if ((req.headers.get('If-None-Match') || '').split(/,\s*/).includes(etag)) return new Response(null, { status: 304, headers });
  const cache = caches.default, key = cacheKey(`app/${tag}/${name}`);
  let body = await cache.match(key);
  if (!body) {
    const r = await fetch(`https://github.com/${REPO}/releases/download/${tag}/${name}`, { headers: { 'User-Agent': UA } });
    if (!r.ok) return text(`Not found (release ${tag} has no ${name})`, 404);
    const bytes = await r.arrayBuffer();
    ctx.waitUntil(cache.put(key, new Response(bytes, { headers: { 'Cache-Control': 'max-age=31536000' } })));
    body = new Response(bytes);
  }
  return new Response(req.method === 'HEAD' ? null : body.body, { headers });
}

// ---- online rooms ----
// Room names are case-insensitive and forgiving: "Pizza Night" and "pizza-night" are the same room.
const roomName = raw => decodeURIComponent(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
function roomSocket(req, env, raw) {
  if (!env.ROOMS) return text('Online rooms are not set up on this site yet.', 503);
  if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return text('Expected a WebSocket', 426);
  let name; try { name = roomName(raw); } catch { name = ''; }
  if (!name) return text('Bad room name', 400);
  return env.ROOMS.get(env.ROOMS.idFromName(name)).fetch(req);
}
const clean = (v, n) => String(v ?? '').slice(0, n);
const pub = a => ({ seat: a.seat, name: a.name, character: a.character, owner: a.owner, v: a.v });
// One room = one Durable Object: two seats, presence, and a relay. The game logic stays on the phones.
// Client → room: {t:'hello', id, name, character, owner, v} first, then {t:'msg', d}. Room → client: {t:'welcome', seat,
// peers}, {t:'join', peer}, {t:'leave', seat}, {t:'msg', from, d}, {t:'full'}. A phone that reconnects with the same id gets
// its seat back. Hibernating WebSockets: the object sleeps between messages, so an idle room costs nothing.
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ seat: null });
    return new Response(null, { status: 101, webSocket: client });
  }
  seated(except) {
    return this.ctx.getWebSockets().map(ws => ({ ws, a: ws.deserializeAttachment() || {} })).filter(p => p.ws !== except && p.a.seat != null);
  }
  send(ws, m) { try { ws.send(JSON.stringify(m)); } catch {} }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 16384) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    const me = ws.deserializeAttachment() || {};
    if (m.t === 'hello') {
      const id = clean(m.id, 64), others = this.seated(ws), old = id && others.find(p => p.a.id === id);
      if (old) { old.ws.serializeAttachment({ seat: null }); try { old.ws.close(4000, 'replaced'); } catch {} }
      let rest = others.filter(p => p !== old);
      // Room full: a seat whose phone has been silent for a minute (no message, no ping) is a ghost — a phone that
      // vanished without closing (tab killed, app swiped away, network gone). Phones ping every 10 s, so free it.
      if (!old && rest.length >= 2) {
        const now = Date.now();
        for (const p of rest) {
          const pinged = this.ctx.getWebSocketAutoResponseTimestamp(p.ws)?.getTime() || 0;
          if (now - Math.max(pinged, p.a.at || 0) > 60000) {
            p.ws.serializeAttachment({ seat: null }); try { p.ws.close(4003, 'stale'); } catch {}
            for (const q of rest) if (q !== p) this.send(q.ws, { t: 'leave', seat: p.a.seat });
            p.gone = true;
          }
        }
        rest = rest.filter(p => !p.gone);
      }
      const taken = new Set(rest.map(p => p.a.seat));
      const seat = old ? old.a.seat : [0, 1].find(s => !taken.has(s));
      if (seat === undefined) { this.send(ws, { t: 'full' }); try { ws.close(4001, 'full'); } catch {} return; }
      const info = { id, seat, name: clean(m.name, 24), character: clean(m.character, 64), owner: m.owner === 'Amber' ? 'Amber' : 'Sean', v: clean(m.v, 16), at: Date.now() };
      ws.serializeAttachment(info);
      this.send(ws, { t: 'welcome', seat, peers: rest.map(p => pub(p.a)) });
      for (const p of rest) this.send(p.ws, { t: 'join', peer: pub(info) });
      return;
    }
    if (me.seat == null || m.t !== 'msg') return;
    if (Date.now() - (me.at || 0) > 20000) { me.at = Date.now(); ws.serializeAttachment(me); }   // last heard (see the ghost check)
    for (const p of this.seated(ws)) this.send(p.ws, { t: 'msg', from: me.seat, d: m.d });
  }
  async webSocketClose(ws, code) {
    const a = ws.deserializeAttachment() || {};
    try { ws.close(code >= 1000 && code < 5000 && code !== 1005 && code !== 1006 ? code : 1000, 'bye'); } catch {}
    if (a.seat != null) for (const p of this.seated(ws)) this.send(p.ws, { t: 'leave', seat: a.seat });
  }
  async webSocketError(ws) { await this.webSocketClose(ws, 1011); }
}

// GitHub REST API (fallback only). Add a GITHUB_TOKEN secret to the Worker to lift the rate limit.
async function api(path, env) {
  const headers = { 'User-Agent': UA, 'Accept': 'application/vnd.github+json' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/repos/${REPO}/${path}`, { headers });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  return r.json();
}
