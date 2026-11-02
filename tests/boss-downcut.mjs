// Boss fights (ROADMAP K24): partner-down cutscene. P2 goes down while P1 flies → slow motion, push-in, NOOOO, then the
// fight speeds back up and the ghost can still be revived. SHAMB_URL=... node tests/boss-downcut.mjs [WxH]
import {open, screenshotPath} from './lib.mjs';
const [vw, vh] = (process.argv[2] || '390x780').split('x').map(Number);
const {browser, page, errors} = await open({viewport: {width: vw, height: vh}});
await page.evaluate(() => { window.ShambConkins.requestGame({id: 'boss-hal-9000', origin: 'arcade'}); });
for (let i = 0; i < 80; i++) {
  const m = await page.evaluate(() => { const S = window.ShambConkins.store.session; if (S?.debug?.mode) return S.debug.mode; const d = document.getElementById('dialog'); if (d?.open) (d.querySelector('button.primary') || d.querySelector('button'))?.click(); return ''; });
  if (m === 'fight') break; await page.waitForTimeout(250);
}
const D = 'window.ShambConkins.store.session.debug';
let fails = 0; const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) fails++; };
const r0 = await page.evaluate(`${D}.time`); await page.waitForTimeout(500); const base = (await page.evaluate(`${D}.time`)) - r0;
console.log('game time per 0.5 s before:', base.toFixed(3));
await page.evaluate(`(()=>{const d=${D};d.F.boss.hp=d.F.boss.hp;d.bullets.length=0;const b=d.players[1];b.inv=0;b.sup=0;b.hp=1;d.hurt(b,'test');})()`);
await page.waitForTimeout(120);
check(await page.evaluate(`!!${D}.downCut`), 'cutscene starts when P2 goes down');
const t0 = await page.evaluate(`${D}.time`); await page.waitForTimeout(500); const t1 = await page.evaluate(`${D}.time`);
console.log('game time over 0.5 s real:', (t1 - t0).toFixed(3));
check(t1 - t0 < base * .5, 'world runs in slow motion');
await page.screenshot({path: screenshotPath(`boss-downcut-${vw}x${vh}.png`)});
// survivor can't be hit during it
const hit = await page.evaluate(`(()=>{const d=${D},a=d.players[0];a.inv=0;return d.hurt(a,'test');})()`);
check(hit === false, 'survivor is safe during the cutscene');
await page.waitForTimeout(400);
await page.screenshot({path: screenshotPath(`boss-downcut2-${vw}x${vh}.png`)});
for (let i = 0; i < 40 && await page.evaluate(`!!${D}.downCut`); i++) await page.waitForTimeout(200);
check(await page.evaluate(`!${D}.downCut`), 'cutscene ends');
const g = await page.evaluate(`${D}.players[1].ghost`);
console.log('ghost seconds left after the cutscene:', g.toFixed(2));
check(g > 3.5, 'revive window is mostly kept');
const t2 = await page.evaluate(`${D}.time`); await page.waitForTimeout(500); const t3 = await page.evaluate(`${D}.time`);
check(t3 - t2 > base * .7, 'full speed again');
check(await page.evaluate(`${D}.mode`) === 'fight', 'still fighting');
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await browser.close(); process.exit(fails ? 1 : 0);
