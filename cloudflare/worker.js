// Cloudflare Worker: serves the newest GitHub Release of ShambConkins on your own domain.
// Nothing to update per release: it asks GitHub which release is "latest" (cached 5 min),
// downloads that release's .html asset once per Cloudflare data centre, and serves it as a web page.
//   /                 newest release
//   /v0.60.0          a specific release
//   /download         newest release as a file download
//   /version          newest release tag (plain text)
const REPO = 'seanpconners-source/ShambConkins';
const TAG_TTL = 300;           // seconds before asking GitHub for a newer release again
const UA = 'shambconkins-worker';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path === '/version') return text(await latestTag(env, ctx));
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

// GitHub REST API (fallback only). Add a GITHUB_TOKEN secret to the Worker to lift the rate limit.
async function api(path, env) {
  const headers = { 'User-Agent': UA, 'Accept': 'application/vnd.github+json' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/repos/${REPO}/${path}`, { headers });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  return r.json();
}
