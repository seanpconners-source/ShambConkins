// Runs the hole game for a player: moves around, takes screenshots.
import {open} from './lib.mjs';
const {browser, page, errors} = await open({viewport: {width: 1000, height: 720}});
await page.evaluate(() => { window.ShambConkins.requestGame({id: 'paddys-hole', origin: 'arcade'}); });
await page.waitForTimeout(1500);
for (let i = 0; i < 8; i++) { await page.evaluate(() => { const d = document.getElementById('dialog'); const b = d.open ? d.querySelector('button.primary') : [...document.querySelectorAll('#game-layer button')].find(x => /Ready|Start|countdown/i.test(x.innerText)); b?.click(); }); await page.waitForTimeout(700); }
await page.waitForTimeout(3500);
await page.screenshot({path: '/tmp/claude-0/hole1.png'});
await page.keyboard.down('ArrowUp'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(5000);
await page.screenshot({path: '/tmp/claude-0/hole2.png'});
await page.keyboard.up('ArrowUp'); await page.keyboard.up('ArrowRight');
console.log(await page.evaluate(() => { const d = window.ShambConkins.diagnostics(); return d; }));
console.log('errors', errors.slice(0, 4));
await browser.close();
