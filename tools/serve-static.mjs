// Tiny static file server for browser tests of the installable build (Windows-friendly):
//   node tools/build.mjs --pwa <dir>; node tools/serve-static.mjs <dir> 8123; then SHAMB_URL=http://localhost:8123/ node tests/...
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [dir, port = 8123] = process.argv.slice(2);
const T = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.gz': 'application/gzip', '.wad': 'application/octet-stream', '.svg': 'image/svg+xml', '.css': 'text/css'};
http.createServer((q, r) => {
  let f = path.join(dir, decodeURIComponent(q.url.split('?')[0]));
  if (f.endsWith(path.sep) || f === path.resolve(dir)) f = path.join(f, 'index.html');
  fs.stat(f, (e, st) => { if (e || !st.isFile()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, {'content-type': T[path.extname(f)] || 'application/octet-stream', 'content-length': st.size}); fs.createReadStream(f).pipe(r); });
}).listen(+port, () => console.log('serving', dir, 'on', port));
