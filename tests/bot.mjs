// Plays full games with a random-ish bot and reports JS errors / stuck states.
import {open} from './lib.mjs';
const turns = +process.argv[2] || 60;
const {browser, page, errors} = await open();
await page.click('text=NEW GAME'); await page.waitForTimeout(400);
await page.click('[data-action=start-run]'); await page.waitForTimeout(1500);
let stuck = 0, last = '', games = new Set(), steps = 0;
for (; steps < turns * 25; steps++) {
  const snap = await page.evaluate(() => {
    const dlg = document.getElementById('dialog');
    const dialogOpen = dlg && dlg.open;
    return {
      dialogOpen,
      dialogTitle: dialogOpen ? dlg.querySelector('#dialog-title')?.innerText : null,
      dialogBtns: dialogOpen ? [...dlg.querySelectorAll('button')].map(b => b.innerText.trim()) : [],
      view: document.body.dataset.view,
      acts: [...document.querySelectorAll('[data-action]')].filter(b => b.offsetParent && !b.disabled).map(b => b.dataset.action),
      finished: /final|winner|play again/i.test(document.body.innerText.slice(0, 4000)) && !!document.querySelector('.finish-shell'),
    };
  });
  const key = JSON.stringify([snap.dialogTitle, snap.view, snap.acts.join()]);
  stuck = key === last ? stuck + 1 : 0; last = key;
  if (stuck > 150) { console.log('STUCK', snap); await page.screenshot({path: '/tmp/claude-0/stuck.png'}); break; }
  if (snap.finished) { console.log('finished after', steps); break; }
  if (snap.dialogOpen) {
    if (snap.dialogTitle) games.add(snap.dialogTitle);
    const i = Math.floor(Math.random() * snap.dialogBtns.length);
    await page.evaluate(i => document.getElementById('dialog').querySelectorAll('button')[i]?.click(), i);
  } else if (snap.view === 'game') {
    await page.mouse.click(550, 350); await page.mouse.move(400 + Math.random() * 300, 300 + Math.random() * 200);
    if (snap.acts.includes('exit-game') && stuck > 10) await page.evaluate(() => document.querySelector('[data-action=exit-game]')?.click());
  } else {
    const pri = ['route-go', 'roll', 'space', 'reroll', 'end-turn'].find(a => snap.acts.includes(a));
    const a = pri || snap.acts.find(x => !['home', 'settings', 'roster', 'arcade', 'bag'].includes(x));
    if (a) await page.evaluate(a => { const els = [...document.querySelectorAll(`[data-action="${a}"]`)].filter(e => e.offsetParent || e.ownerSVGElement); els[Math.floor(Math.random() * els.length)]?.dispatchEvent(new MouseEvent('click', {bubbles: true})); }, a);
  }
  await page.waitForTimeout(120);
}
console.log('steps', steps, 'dialogs seen', games.size);
console.log('errors', [...new Set(errors)]);
await page.screenshot({path: '/tmp/claude-0/bot-end.png'});
await browser.close();
