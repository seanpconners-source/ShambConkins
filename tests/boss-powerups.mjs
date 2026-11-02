// Boss fights (ROADMAP K16/K15): power-ups and the new ships. Pickups spawn and drift down; flying into one gives the
// effect. SHOT=1 also saves a contact screenshot. SHAMB_URL=... node tests/boss-powerups.mjs [WxH]
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
await page.evaluate(`${D}.immortal=true`);
// a pickup appears on its own within ~10 s of fighting
let seen = false;
for (let i = 0; i < 60 && !seen; i++) { seen = await page.evaluate(`${D}.pickups.length>0`); if (!seen) await page.waitForTimeout(250); }
check(seen, 'a pickup drifts in during the fight');
// show every kind, then fly into them
await page.evaluate(`(()=>{const d=${D};d.pickups.length=0;const k=['spread','turbo','missile','shield','bomb','heart'];k.forEach((n,i)=>d.spawnPower(n,40+i*((d.F.W-80)/5)));for(const u of d.pickups)u.y=300;})()`);
await page.waitForTimeout(150);
await page.screenshot({path: screenshotPath(`boss-powerups-${vw}x${vh}.png`)});
const take = async (k) => page.evaluate(`(()=>{const d=${D},p=d.players[0];d.pickups.length=0;d.spawnPower('${k}',p.x);const u=d.pickups[0];u.y=p.y;u.x=p.x;})()`);
await take('spread'); await page.waitForTimeout(300);
check(await page.evaluate(`${D}.players[0].pw?.k`) === 'spread', 'flying into SPREAD arms it');
await page.waitForTimeout(400);
await page.screenshot({path: screenshotPath(`boss-powerups-spread-${vw}x${vh}.png`)});
await take('missile'); await page.waitForTimeout(900);
check(await page.evaluate(`${D}.players[0].pw?.k`) === 'missile', 'MISSILES replace it');
await page.screenshot({path: screenshotPath(`boss-powerups-missile-${vw}x${vh}.png`)});
await take('shield'); await page.waitForTimeout(300);
const blocked = await page.evaluate(`(()=>{const d=${D},p=d.players[0];p.inv=0;const hp=p.hp;d.hurt(p,'test');return p.hp===hp&&!(p.shield>0);})()`);
check(blocked, 'SHIELD soaks one hit');
await page.evaluate(`(()=>{const d=${D};for(let i=0;i<20;i++)d.bullets.push({x:50+i*15,y:200,vx:0,vy:20,r:7,kind:'orb',age:0,life:9})})()`);
const hp0 = await page.evaluate(`${D}.F.boss.hp`);
await take('bomb'); await page.waitForTimeout(300);
check(await page.evaluate(`${D}.bullets.filter(b=>!b.friendly).length`) < 3, 'SMART BOMB clears the bullets');
check(await page.evaluate(`${D}.F.boss.hp`) < hp0, 'SMART BOMB hurts the boss');
await page.evaluate(`(()=>{const p=${D}.players[0];p.hp=1;})()`);
await take('heart'); await page.waitForTimeout(300);
check(await page.evaluate(`${D}.players[0].hp`) === 2, 'HEART gives a heart back');
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await browser.close(); process.exit(fails ? 1 : 0);
