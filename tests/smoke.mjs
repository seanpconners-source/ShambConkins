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
 page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
 await page.goto(file);
 await page.waitForTimeout(1500);
 console.log('title:', await page.title());
 console.log('buttons:', await page.$$eval('button', b => b.map(x => x.innerText.trim().slice(0, 30)).filter(Boolean).slice(0, 30)));
 await page.screenshot({path: process.env.SHOT || screenshotPath('home.png')});
 console.log('errors:', errors);
} finally { await browser.close(); }
