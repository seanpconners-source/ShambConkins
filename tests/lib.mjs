import {createRequire} from 'node:module';
import {existsSync, mkdirSync} from 'node:fs';
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
 await page.goto(pathToFileURL(path.resolve(root, opts.file || process.env.SHAMB_FILE || 'dist/ShambConkins.html')).href);
 await page.waitForTimeout(800);
 return {browser, page, errors};
}
