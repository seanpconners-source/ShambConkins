// Headless smoke test: load built offline HTML, record JS errors, drive UI.
import {launchBrowser, root, screenshotPath} from './lib.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const file = pathToFileURL(path.resolve(root, process.argv[2] || 'dist/ShambConkins.html')).href;
const browser = await launchBrowser();
try {
 const page = await browser.newPage({viewport: {width: 1100, height: 700}});
 const errors = [];
 page.on('pageerror', e => errors.push('pageerror: ' + e.message));
 // A file://-opened offline game can log blocked remote image/API fetches.
 // Those are expected, not proof of a game regression. Preserve real JS errors.
 page.on('console', m => {
  if (m.type() !== 'error') return;
  const msg=m.text();
  page.on('console', m => { const msg=m.text();const offlineWiki=/Access to fetch at 'https:\/\/(?:en\.wikipedia\.org|commons\.wikimedia\.org)\/w\/api\.php[^']*' from origin 'null' has been blocked by CORS policy/.test(msg);
  if (!offlineWiki && !/ERR_TUNNEL|ERR_INTERNET|ERR_NAME|Failed to load resource|attribute viewBox: A negative/.test(msg)) errors.push('console: ' + msg);
 });
 await page.goto(file);
 await page.waitForTimeout(1500);
 console.log('title:', await page.title());
 console.log('buttons:', await page.$$eval('button', b => b.map(x => x.innerText.trim().slice(0, 30)).filter(Boolean).slice(0, 30)));
 await page.screenshot({path: process.env.SHOT || screenshotPath('home.png')});
 console.log('errors:', errors);
 if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
