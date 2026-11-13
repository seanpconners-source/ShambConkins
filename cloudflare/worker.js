// Cloudflare Worker: serves the newest GitHub Release of ShambConkins on your own domain.
// Nothing to update per release: it asks GitHub which release is "latest" (cached 5 min),
// downloads that release's .html asset once per Cloudflare data centre, and serves it as a web page.
//   /, /index.html    newest release: its app page (release asset "index.html", ~8 MB: the code, with the pictures and
//                     sounds as /a/ files) when the release has one, else the one-file game (releases before the split)
//   /v0.60.0          a specific release (the one-file game; releases from v0.88.0 are the app only and answer a note)
//   /download         newest release as a file download (the one-file game); from v0.88.0 it sends you to / instead
//   /version          newest release tag (plain text)
//   /manifest.webmanifest, /sw.js, /icons/*.png
//                     the installable-app files of the newest release (each release carries them as small assets
//                     next to the .html; tools/build.mjs --pwa). Without them the game still runs, but Chrome can
//                     only make a badged shortcut instead of a real app, and there is no offline cache.
//   /a/<hash>.<ext>   the app's pictures and sounds, named by their contents. Not handled here: they are this Worker's
//                     static assets (wrangler.toml [assets], folder public/, filled by tools/worker-assets.sh from the
//                     newest releases' _pwa.zip), served by Cloudflare straight from its edge. See docs/PWA_SPLIT_DELIVERY.md.
//   /room/<name>      online play: a WebSocket into the room of that name (two phones; the Room Durable Object below).
//                     Needs the ROOMS binding (wrangler.toml); without it the rest of the site works as before.
//   /lobby            friends online (ROADMAP N1): one WebSocket per open game into the Lobby Durable Object below, for
//                     presence (free / playing / on the board) and invites between friend codes.
//   /scores/<game>    shared high-score tables (class Scores below).
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
    if (req.method !== 'GET' && req.method !== 'HEAD' && !(url.pathname.startsWith('/scores/') && (req.method === 'POST' || req.method === 'OPTIONS'))) return new Response('Method not allowed', { status: 405 });
    let path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/index.html') path = '/';   // the offline cache (sw.js) asks for the game by this name
    const room = path.match(/^\/room\/([^/]{1,80})$/);
    if (room) return roomSocket(req, env, room[1]);
    if (path === '/lobby') return lobbySocket(req, env);
    const board = path.match(/^\/scores\/([a-z0-9-]{1,64})$/);
    if (board) return scoresRequest(req, env, board[1]);
    try {
      if (path === '/version') return text(await latestTag(env, ctx));
      const icon = path.match(ICON), app = APP_FILES[path] || (icon && [icon[1], 'image/png', 'public, max-age=86400']);
      if (app) return appFile(req, app, await latestTag(env, ctx), env, ctx);
      const pinned = path.match(/^\/(v\d+\.\d+\.\d+[\w.-]*)$/);
      if (path !== '/' && path !== '/download' && !pinned) return text('Not found', 404);
      const tag = pinned ? pinned[1] : await latestTag(env, ctx);
      if (path === '/') {
        const page = await appFile(req, ['index.html', 'text/html; charset=utf-8', 'no-cache'], tag, env, ctx, true);
        if (page) return page;
      }
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
      // v0.88.0 on: no one-file game in the release (owner: install only), so a download link opens the site instead
      if (e.noFile) return path === '/download' ? Response.redirect(new URL('/', url).href, 302)
        : text(`ShambConkins ${e.noFile} is an app only: open ${url.origin}/ and install it from your browser's menu.`, 404);
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
  // the last tag this data centre saw, kept a day: answered when GitHub is slow or down, so the site never hangs on it
  const kept = cacheKey('latest-tag-kept');
  let tag = null;
  try {
    const r = await fetch(`https://github.com/${REPO}/releases/latest`, { redirect: 'manual', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) });
    const m = (r.headers.get('Location') || '').match(/\/releases\/tag\/([^/?#]+)$/);
    if (m) tag = decodeURIComponent(m[1]);
    if (!tag) tag = (await api(`releases/latest`, env)).tag_name;
  } catch (e) {
    const old = await cache.match(kept);
    if (old) return old.text();
    throw e;
  }
  ctx.waitUntil(cache.put(key, new Response(tag, { headers: { 'Cache-Control': `max-age=${TAG_TTL}` } })));
  ctx.waitUntil(cache.put(kept, new Response(tag, { headers: { 'Cache-Control': 'max-age=86400' } })));
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
    if (!asset) throw Object.assign(new Error(`release ${tag} has no .html file`), { noFile: tag });
    r = await fetch(asset.browser_download_url, { headers: { 'User-Agent': UA } });
  }
  if (!r.ok) throw new Error(`GitHub answered ${r.status} for ${tag}`);
  // Store first, then serve from the cache: one stream, no 80 MB held in the Worker's memory.
  await cache.put(key, new Response(r.body, { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'max-age=31536000' } }));
  const stored = await cache.match(key);
  if (stored) return stored.body;
  return (await fetch(`https://github.com/${REPO}/releases/download/${tag}/ShambConkins_${tag}.html`, { headers: { 'User-Agent': UA } })).body;
}

// One of the release's installable-app files, cached per data centre like the game itself. optional: answer null (and
// remember that for the tag) when the release doesn't have it, so older releases fall back without asking GitHub each time.
async function appFile(req, [name, type, cacheControl], tag, env, ctx, optional = false) {
  const etag = `"${tag}-${name}"`, headers = { 'Content-Type': type, 'Cache-Control': cacheControl, 'ETag': etag, 'X-ShambConkins-Version': tag };
  const cache = caches.default, key = cacheKey(`app/${tag}/${name}`), none = cacheKey(`app/${tag}/${name}.none`);
  if (optional && await cache.match(none)) return null;
  if ((req.headers.get('If-None-Match') || '').split(/,\s*/).includes(etag)) return new Response(null, { status: 304, headers });
  let body = await cache.match(key);
  if (!body) {
    const r = await fetch(`https://github.com/${REPO}/releases/download/${tag}/${name}`, { headers: { 'User-Agent': UA } });
    if (r.status === 404 && optional) { ctx.waitUntil(cache.put(none, new Response('', { headers: { 'Cache-Control': 'max-age=31536000' } }))); return null; }
    if (!r.ok) return text(`Not found (release ${tag} has no ${name})`, 404);
    // stream it on to the phone while it is stored (the first phone in a data centre after a release used to wait for
    // the whole 10 MB page to arrive from GitHub before getting its first byte)
    const [a, b] = r.body.tee();
    ctx.waitUntil(cache.put(key, new Response(b, { headers: { 'Cache-Control': 'max-age=31536000' } })));
    body = new Response(a);
    const len = r.headers.get('Content-Length');
    if (len) headers['Content-Length'] = len;
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
const pub = a => ({ seat: a.seat, name: a.name, character: a.character, owner: a.owner, v: a.v, code: a.code || '' });
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;   // friend codes: 6 letters/digits without 0/O/1/I
const friendCode = v => { const c = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return CODE.test(c) ? c : ''; };
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
      const info = { id, seat, name: clean(m.name, 24), character: clean(m.character, 64), owner: m.owner === 'Amber' ? 'Amber' : 'Sean', v: clean(m.v, 16), code: friendCode(m.code), at: Date.now() };
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

// ---- friends online (ROADMAP N1) ----
// One Durable Object ("all") holds every open game's lobby socket. A phone says hello with its friend code, name and the
// friend codes it knows; it then hears the status of those friends while they have the game open, and can invite one
// into a room. Client → lobby: {t:'hello', code, name, character, owner, v, friends:[codes], st, what}, {t:'status', st,
// what}, {t:'friends', list}, {t:'add', code}, {t:'invite', to, id, room}, {t:'reply', to, id, ok}, {t:'cancel', to, id}.
// Lobby → client: {t:'hi', presence:[entry]}, {t:'p', code, entry|null} (null = closed the game), {t:'added', by:entry}
// (someone added this code: add them back), {t:'invite', id, room, from:entry}, {t:'reply', id, ok, from}, {t:'cancel',
// id, from}, {t:'sent', id, ok} (ok false = that friend isn't online). entry = {code, name, character, owner, st, what, v}.
// Seeing someone needs their code; adds for a phone that is offline wait in SQLite (a week) until it says hello.
function lobbySocket(req, env) {
  if (!env.LOBBY) return text('Friends online are not set up on this site yet.', 503);
  if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return text('Expected a WebSocket', 426);
  return env.LOBBY.get(env.LOBBY.idFromName('all')).fetch(req);
}
const STATES = ['free', 'board', 'game', 'online'];
const entryOf = a => ({ code: a.code, name: a.name, character: a.character, owner: a.owner, st: a.st, what: a.what, v: a.v });
export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS adds (to_code TEXT, from_code TEXT, entry TEXT, at INTEGER, PRIMARY KEY (to_code, from_code))');
    // messages to a friend whose game was closed: kept a week, handed over the next time their game connects (owner, Nov 12)
    this.sql.exec('CREATE TABLE IF NOT EXISTS mail (to_code TEXT, id TEXT, entry TEXT, text TEXT, at INTEGER, PRIMARY KEY (to_code, id))');
    this.rate = new Map();
  }
  async fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({});
    return new Response(null, { status: 101, webSocket: client });
  }
  send(ws, m) { try { ws.send(JSON.stringify(m)); } catch {} }
  // open games; one silent for 75 s (no ping, no message: the phone vanished without closing) doesn't count
  all(except) {
    const now = Date.now();
    return this.ctx.getWebSockets().map(ws => ({ ws, a: ws.deserializeAttachment() || {} })).filter(p => p.ws !== except && p.a.code
      && now - Math.max(this.ctx.getWebSocketAutoResponseTimestamp(p.ws)?.getTime() || 0, p.a.heard || 0) < 75000);
  }
  // what a code looks like right now (the newest of its open games), or null when none is open
  entry(code, except) { const ps = this.all(except).filter(p => p.a.code === code).sort((x, y) => (y.a.at || 0) - (x.a.at || 0)); return ps.length ? entryOf(ps[0].a) : null; }
  // tell every phone that knows this code how it looks now
  announce(code, except) { const e = this.entry(code, except); for (const p of this.all(except)) if (p.a.code !== code && (p.a.friends || []).includes(code)) this.send(p.ws, { t: 'p', code, entry: e }); }
  presence(a) { return (a.friends || []).map(c => this.entry(c)).filter(Boolean); }
  to(code, m) { let n = 0; for (const p of this.all()) if (p.a.code === code) { this.send(p.ws, m); n++; } return n; }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 4096) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    const a = ws.deserializeAttachment() || {}, list = v => [...new Set((Array.isArray(v) ? v : []).map(friendCode).filter(c => c && c !== a.code))].slice(0, 60);
    const state = (st, what) => { a.st = STATES.includes(st) ? st : 'free'; a.what = clean(what, 40); };
    if (m.t === 'hello') {
      const code = friendCode(m.code); if (!code) { try { ws.close(4004, 'bad code'); } catch {} return; }
      Object.assign(a, { code, name: clean(m.name, 24), character: clean(m.character, 64), owner: m.owner === 'Amber' ? 'Amber' : 'Sean', v: clean(m.v, 16), at: Date.now(), heard: Date.now() });
      a.friends = list(m.friends); state(m.st, m.what);
      ws.serializeAttachment(a);
      const week = Date.now() - 7 * 864e5, adds = this.sql.exec('SELECT entry FROM adds WHERE to_code = ? AND at > ?', code, week).toArray();
      this.sql.exec('DELETE FROM adds WHERE to_code = ? OR at <= ?', code, week);
      this.send(ws, { t: 'hi', presence: this.presence(a) });
      for (const r of adds) { try { this.send(ws, { t: 'added', by: JSON.parse(r.entry) }); } catch {} }
      const mail = this.sql.exec('SELECT id, entry, text, at FROM mail WHERE to_code = ? AND at > ? ORDER BY at', code, week).toArray();
      this.sql.exec('DELETE FROM mail WHERE to_code = ? OR at <= ?', code, week);
      for (const r of mail) { try { this.send(ws, { t: 'chat', id: r.id, text: r.text, from: JSON.parse(r.entry), at: r.at, held: true }); } catch {} }
      this.announce(code);
      return;
    }
    if (!a.code) return;
    if (Date.now() - (a.heard || 0) > 20000) { a.heard = Date.now(); ws.serializeAttachment(a); }
    if (m.t === 'status') { state(m.st, m.what); a.at = Date.now(); ws.serializeAttachment(a); this.announce(a.code); return; }
    if (m.t === 'friends') { a.friends = list(m.list); ws.serializeAttachment(a); this.send(ws, { t: 'hi', presence: this.presence(a) }); return; }
    // invites, replies and adds: a few a minute is plenty for two people
    const now = Date.now(), hits = (this.rate.get(a.code) || []).filter(t => now - t < 60000);
    if (hits.length >= 20) return; hits.push(now); this.rate.set(a.code, hits);
    const target = friendCode(m.to ?? m.code); if (!target || target === a.code) return;
    if (m.t === 'add') {
      if (!this.to(target, { t: 'added', by: entryOf(a) })) this.sql.exec('INSERT OR REPLACE INTO adds (to_code, from_code, entry, at) VALUES (?, ?, ?, ?)', target, a.code, JSON.stringify(entryOf(a)), now);
      if (!(a.friends || []).includes(target)) { a.friends = [...(a.friends || []), target].slice(-60); ws.serializeAttachment(a); }
      const e = this.entry(target); if (e) this.send(ws, { t: 'p', code: target, entry: e });
      return;
    }
    const id = clean(m.id, 24);
    if (m.t === 'invite') { const room = clean(m.room, 40); const n = this.to(target, { t: 'invite', id, room, from: entryOf(a) }); this.send(ws, { t: 'sent', id, ok: n > 0 }); return; }
    // a message to a friend (src/chat.js): text only, short; tells the sender whether it reached an open game
    // their game closed: the message waits on the site (up to 40 per friend) and arrives when they next open the game
    if (m.t === 'chat') {
      const text = clean(m.text, 160).trim(); if (!text) return;
      if (this.to(target, { t: 'chat', id, text, from: entryOf(a) })) { this.send(ws, { t: 'chat-sent', id, ok: true }); return; }
      this.sql.exec('INSERT OR REPLACE INTO mail (to_code, id, entry, text, at) VALUES (?, ?, ?, ?, ?)', target, id, JSON.stringify(entryOf(a)), text, now);
      this.sql.exec('DELETE FROM mail WHERE to_code = ? AND id NOT IN (SELECT id FROM mail WHERE to_code = ? ORDER BY at DESC LIMIT 40)', target, target);
      this.send(ws, { t: 'chat-sent', id, ok: true, held: true }); return;
    }
    if (m.t === 'reply') { this.to(target, { t: 'reply', id, ok: !!m.ok, from: entryOf(a) }); return; }
    if (m.t === 'cancel') { this.to(target, { t: 'cancel', id, from: entryOf(a) }); return; }
  }
  async webSocketClose(ws, code) {
    const a = ws.deserializeAttachment() || {};
    try { ws.close(code >= 1000 && code < 5000 && code !== 1005 && code !== 1006 ? code : 1000, 'bye'); } catch {}
    if (a.code) this.announce(a.code, ws);
  }
  async webSocketError(ws) { await this.webSocketClose(ws, 1011); }
}

// ---- high-score tables (ROADMAP I13) ----
// GET /scores/<game id> → {top: [{name, score, character, at, v}...]}; POST the same path with a text/plain JSON body
// {name, score, character, v, install} → keeps that name's best for the game, answers {top, rank}. One table per game,
// all in one Durable Object (SQLite). Anti-junk: whole numbers 0..1e10, short clean names, one entry per name per game,
// 40 submissions an hour per install id. Open to any origin (a downloaded copy of the game posts from file://);
// text/plain keeps the browser from sending a preflight.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
async function scoresRequest(req, env, game) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (!env.SCORES) return new Response(JSON.stringify({ error: 'no scores here' }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } });
  const stub = env.SCORES.get(env.SCORES.idFromName('all'));
  const r = await stub.fetch(new Request(`https://scores/${game}`, { method: req.method === 'POST' ? 'POST' : 'GET', body: req.method === 'POST' ? await req.text() : undefined }));
  return new Response(r.body, { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
export class Scores extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS scores (game TEXT, name TEXT, score INTEGER, character TEXT, at INTEGER, v TEXT, PRIMARY KEY (game, name))');
    this.rate = new Map();
  }
  top(game) { return this.sql.exec('SELECT name, score, character, at, v FROM scores WHERE game = ? ORDER BY score DESC, at ASC LIMIT 10', game).toArray(); }
  async fetch(req) {
    const game = new URL(req.url).pathname.slice(1), json = (o, status = 200) => new Response(JSON.stringify(o), { status });
    if (req.method !== 'POST') return json({ top: this.top(game) });
    if (req.headers.get('content-length') > 2000) return json({ error: 'too big' }, 413);
    let m; try { m = JSON.parse(await req.text()); } catch { return json({ error: 'bad json' }, 400); }
    const name = String((m && m.name) ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16), install = clean(m && m.install, 64) || 'anon', score = Number(m && m.score);
    if (!name || !Number.isInteger(score) || score < 0 || score > 1e10) return json({ error: 'bad score' }, 400);
    const now = Date.now(), hits = (this.rate.get(install) || []).filter(t => now - t < 3600000);
    if (hits.length >= 40) return json({ error: 'slow down' }, 429);
    hits.push(now); this.rate.set(install, hits);
    const old = this.sql.exec('SELECT score FROM scores WHERE game = ? AND name = ?', game, name).toArray()[0];
    if (!old || score > old.score) this.sql.exec('INSERT OR REPLACE INTO scores (game, name, score, character, at, v) VALUES (?, ?, ?, ?, ?, ?)', game, name, score, clean(m.character, 64), now, clean(m.v, 16));
    const best = Math.max(score, old ? old.score : 0), rank = 1 + this.sql.exec('SELECT COUNT(*) AS n FROM scores WHERE game = ? AND score > ?', game, best).toArray()[0].n;
    return json({ top: this.top(game), rank, best });
  }
}

// GitHub REST API (fallback only). Add a GITHUB_TOKEN secret to the Worker to lift the rate limit.
async function api(path, env) {
  const headers = { 'User-Agent': UA, 'Accept': 'application/vnd.github+json' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/repos/${REPO}/${path}`, { headers });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  return r.json();
}
