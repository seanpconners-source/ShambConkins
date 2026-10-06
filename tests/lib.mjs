import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require = createRequire('/node-tools/node_modules/');
export const {chromium} = require('playwright');
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function open(opts = {}) {
  const browser = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport: opts.viewport || {width: 1100, height: 700}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_INTERNET|ERR_NAME|Failed to load resource|attribute viewBox: A negative/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => {
    const o = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (n, v) {
      if (n === 'viewBox') { const p = String(v).split(' ').map(Number); if (p[2] < 0 || p[3] < 0 || p.some(x => !Number.isFinite(x))) console.error('BAD viewBox ' + v + ' :: ' + new Error().stack.split('\n').slice(2, 6).join(' <- ')); }
      return o.call(this, n, v);
    };
  });
  await page.goto('file://' + path.resolve(root, opts.file || process.env.SHAMB_FILE || 'dist/ShambConkins.html'));
  await page.waitForTimeout(800);
  return {browser, page, errors};
}
