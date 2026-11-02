// Boss fights (ROADMAP K1): parry on touch-down, tap revive, hold revive. SHAMB_URL=... node tests/boss-parry.mjs
import {open, screenshotPath} from './lib.mjs';
const {browser, page, errors} = await open({viewport: {width: 390, height: 780}});
await page.evaluate(() => { window.ShambConkins.requestGame({id: 'boss-hal-9000', origin: 'arcade'}); });
console.log('launched');
for (let i = 0; i < 80; i++) {
  const m = await page.evaluate(() => { const S = window.ShambConkins.store.session; if (S?.debug?.mode) return S.debug.mode; const d = document.getElementById('dialog'); if (d?.open) (d.querySelector('button.primary') || d.querySelector('button'))?.click(); return null; });
  if (m === 'fight') break; await page.waitForTimeout(250);
}
const box = await page.evaluate(() => { const r = window.ShambConkins.store.session.c.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; });
const tapLeft = async (hold = 80) => { await page.mouse.move(box.x + box.w * .2, box.y + box.h * .8); await page.mouse.down(); await page.waitForTimeout(hold); await page.mouse.up(); };
const D = () => 'window.ShambConkins.store.session.debug';
let fails = 0; const check = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) fails++; };
await page.evaluate(`${D()}.immortal=true`);
// A: pink bullet 70 px above P1 flying at it; tap (down 80 ms up). Old code judged on release: bullet already past.
for (let k = 0; k < 3; k++) {
  const before = await page.evaluate(`(()=>{const d=${D()},p=d.players[0];p.inv=0;d.bullets.length=0;d.bullets.push({x:p.x,y:p.y-70,vx:0,vy:300,r:7,pink:true,kind:'orb',age:0,life:5,col:'#ff9ae0'});return {par:p.parries,hits:0}})()`);
  await tapLeft(80); await page.waitForTimeout(200);
  const after = await page.evaluate(`${D()}.players[0].parries`);
  check(after > before.par, `tap parries an incoming pink bullet (try ${k + 1})`);
}
// A2: a press with no bullet, then one arrives 0.5 s later: window expired, no parry (no free shield)
{ const before = await page.evaluate(`${D()}.players[0].parries`);
  await page.evaluate(`${D()}.bullets.length=0`); await tapLeft(40); await page.waitForTimeout(500);
  await page.evaluate(`(()=>{const d=${D()},p=d.players[0];p.inv=0;d.bullets.push({x:p.x,y:p.y-20,vx:0,vy:300,r:7,pink:true,kind:'orb',age:0,life:5,col:'#ff9ae0'})})()`);
  await page.waitForTimeout(300);
  check(await page.evaluate(`${D()}.players[0].parries`) === before, 'no parry from an old press'); }
// B: partner down as a bubble 30 px away; staying near revives within ~0.6 s
await page.evaluate(`(()=>{const d=${D()},a=d.players[0],b=d.players[1];b.hp=0;b.ghost=5;b.out=false;b.gx=a.x+30;b.gy=a.y})()`);
await page.waitForTimeout(1100);
check(await page.evaluate(`${D()}.players[1].hp`) > 0, 'hold near the bubble revives');
// C: bubble 60 px away; a tap revives at once
await page.evaluate(`(()=>{const d=${D()},a=d.players[0],b=d.players[1];b.hp=0;b.ghost=5;b.out=false;b.gx=a.x+60;b.gy=a.y;a.revT=0})()`);
await page.waitForTimeout(100); await tapLeft(60); await page.waitForTimeout(80);
check(await page.evaluate(`${D()}.players[1].hp`) > 0, 'tap near the bubble revives');
await page.evaluate(`(()=>{const d=${D()},a=d.players[0],b=d.players[1];b.hp=0;b.ghost=5;b.out=false;b.gx=Math.min(a.x+70,360);b.gy=a.y-40;a.revT=0})()`);
await page.waitForTimeout(250);
await page.screenshot({path: process.env.SHOT || screenshotPath('boss-parry.png')});
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await browser.close(); process.exit(fails ? 1 : 0);
