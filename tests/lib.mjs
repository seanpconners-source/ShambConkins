import {createRequire} from 'node:module';
import {existsSync, mkdirSync, statSync, createReadStream} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

// CI historically installs Playwright at /node-tools; Windows installs it
// in this checkout's ignored node_modules. Prefer the known CI copy there.
const localRequire = createRequire(import.meta.url);
const legacyRequire = existsSync('/node-tools/node_modules/playwright')
 ? createRequire('/node-tools/node_modules/') : null;
export const {chromium} = legacyRequire ? legacyRequire('playwright') : localRequire('playwright');
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function browserLaunchOptions() {
 if (process.env.SHAMB_CHROMIUM) return {executablePath: process.env.SHAMB_CHROMIUM};
 const ciChromium='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
 return existsSync(ciChromium) ? {executablePath:ciChromium} : {};
}
export function launchBrowser(options={}) {
 return chromium.launch({...browserLaunchOptions(), ...options});
}
// The game the tests open. The game ships only as the installable app (tools/build.mjs writes it to dist/pwa), so by
// default this serves dist/pwa on a free localhost port inside the test process. SHAMB_URL = an already served copy,
// SHAMB_FILE = a one-file build (node tools/build.mjs --single) opened from disk.
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.gz': 'application/gzip', '.css': 'text/css', '.woff2': 'font/woff2'};
let served = null;
export function serveDir(dir, port = 0) {
 return new Promise((res, rej) => {
  const s = http.createServer((q, r) => {
   let f = path.join(dir, decodeURIComponent(q.url.split('?')[0]));
   if (!f.startsWith(dir)) { r.writeHead(403); r.end(); return; }
   try { if (statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch {}
   let st; try { st = statSync(f); } catch { r.writeHead(404); r.end(); return; }
   r.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'content-length': st.size});
   createReadStream(f).pipe(r);
  });
  s.on('error', rej);
  s.listen(port, '127.0.0.1', () => { s.unref(); res(`http://localhost:${s.address().port}/`); });
 });
}
export async function appURL() {
 if (process.env.SHAMB_URL) return process.env.SHAMB_URL;
 if (process.env.SHAMB_FILE) return pathToFileURL(path.resolve(root, process.env.SHAMB_FILE)).href;
 const dir = path.join(root, 'dist/pwa');
 if (!existsSync(path.join(dir, 'index.html'))) throw new Error('no game build in dist/pwa: run node tools/build.mjs first');
 return served ||= serveDir(dir);
}
export function screenshotPath(name) {
 const dir=path.resolve(process.env.SHAMB_SHOTS_DIR||path.join(root,'local-test-reports','screenshots'));
 mkdirSync(dir,{recursive:true});
 return path.join(dir,name);
}
export async function open(opts = {}) {
 const browser = await launchBrowser();
 const page = await browser.newPage({viewport: opts.viewport || {width: 1100, height: 700}});
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_INTERNET|ERR_NAME|Failed to load resource|blocked by CORS policy|attribute viewBox: A negative/.test(m.text())) errors.push('console: ' + m.text()); });
 await page.addInitScript(() => {
   const o = Element.prototype.setAttribute;
   Element.prototype.setAttribute = function (n, v) {
     if (n === 'viewBox') { const p = String(v).split(' ').map(Number); if (p[2] < 0 || p[3] < 0 || p.some(x => !Number.isFinite(x))) console.error('BAD viewBox ' + v + ' :: ' + new Error().stack.split('\n').slice(2, 6).join(' <- ')); }
     return o.call(this, n, v);
   };
 });
  await page.goto(opts.file ? pathToFileURL(path.resolve(root, opts.file)).href : await appURL());
 await page.waitForTimeout(800);
 return {browser, page, errors};
}
