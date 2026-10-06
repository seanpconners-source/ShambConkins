// Starts one game, plays it with scripted input, screenshots at intervals. Usage: node tests/play.mjs <game-id> [seconds]
import {open} from './lib.mjs';
const id = process.argv[2], secs = +process.argv[3] || 12;
const {browser, page, errors} = await open({viewport: {width: 1000, height: 720}});
await page.evaluate(id => { window.ShambConkins.requestGame({id, origin: 'arcade'}); }, id);
await page.waitForTimeout(1200);
for (let i = 0; i < 8; i++) { await page.evaluate(() => { const d = document.getElementById('dialog'); const b = d.open ? d.querySelector('button.primary') : [...document.querySelectorAll('#game-layer button')].find(x => /Ready|Start|countdown|Both ready/i.test(x.innerText)); b?.click(); }); await page.waitForTimeout(600); }
await page.waitForTimeout(3600);
const canvas = await page.$('#game-layer canvas'); const box = await canvas.boundingBox();
const keysFor = {
  'block-battle': ['a', 'd', 'w', ' ', 's', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Enter', 'ArrowDown'],
  'shred-hero': ['a', 's', 'd', 'f', 'h', 'j', 'k', 'l'],
  'underdog-dodgeball': ['w', 'a', 's', 'd', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'],
  'fight-night': ['a', 'd', 'w', 's', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter']
};
const end = Date.now() + secs * 1000; let shots = 0, next = Date.now() + 3500;
while (Date.now() < end) {
  if (keysFor[id]) { const k = keysFor[id][Math.floor(Math.random() * keysFor[id].length)]; await page.keyboard.down(k); await page.waitForTimeout(40 + Math.random() * 90); await page.keyboard.up(k); }
  else if (id === 'gopher-hunt') { await page.mouse.click(box.x + box.width * [.22, .5, .78][Math.floor(Math.random() * 3)], box.y + box.height * [.3, .55, .82][Math.floor(Math.random() * 3)] - 20); await page.waitForTimeout(120); }
  else if (id === 'wind-archery') { const sx = box.x + box.width * .4, sy = box.y + box.height * .6; await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(sx - 90 - Math.random() * 60, sy + 20 + Math.random() * 40, {steps: 6}); await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(1600); }
  if (Date.now() > next && shots < 2) { await page.screenshot({path: `/tmp/claude-0/play-${id}-${shots++}.png`}); next += Math.max(2500, secs * 400); }
}
await page.screenshot({path: `/tmp/claude-0/play-${id}-end.png`});
console.log('status:', await page.evaluate(() => document.querySelector('#game-layer .game-status')?.innerText), '| errors', errors.slice(0, 3));
await browser.close();
