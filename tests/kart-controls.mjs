// 3D Mario Kart touch controls (Mario Kart Tour style) driven with real pointer events in headless Chromium:
// drag steers, pushing all the way drifts and charges sparks, letting go fires the mini-turbo, a tap uses the item,
// a swipe down drops it behind, and each half of the side-by-side screen (P1 left, P2 right) belongs to one player.
import {open} from './lib.mjs';
import assert from 'node:assert/strict';
const {browser,page,errors}=await open({viewport:{width:844,height:390}});
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'rainbow-road-kart',origin:'arcade'});});await page.waitForTimeout(400);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
await page.waitForTimeout(2000);
await page.evaluate(()=>window.ShambConkins.store.session.debug.pick('rainbow-road'));await page.waitForTimeout(1500);
const has=await page.evaluate(()=>!!window.ShambConkins.store.session?.debug?.course);assert.ok(has,'3D kart session (no WebGL fallback)');
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.skip();d.teleport(0,200,0);d.teleport(1,150,-20);});
const bb=await (await page.$('#game-layer canvas')).boundingBox();
const K=()=>page.evaluate(()=>window.ShambConkins.store.session.debug.K.map(k=>({s:k.s,d:k.d,psi:k.psi,v:k.v,drift:k.drift,spark:k.spark,driftT:k.driftT,boostT:k.boostT,items:k.items.map(i=>i.id+i.n).join(','),steer:k.steer})));
const wait=async(fn,ms=8000)=>{const t=Date.now();while(Date.now()-t<ms){const v=await fn();if(v)return v;await page.waitForTimeout(100);}return null;};
// let P2 (right half) get up to speed
await wait(async()=>(await K())[1].v>200);
const y2=bb.y+bb.height*.6,x0=bb.x+bb.width*.68;
// 1) gentle drag right steers without drifting
await page.mouse.move(x0,y2);await page.mouse.down();await page.mouse.move(x0+22,y2,{steps:4});
const st=await wait(async()=>{const k=(await K())[1];return k.steer>.2&&k;},3000);assert.ok(st,'drag steers');assert.equal(st.drift,0,'small drag does not drift');
// 2) push all the way → drift, hold → sparks (in the first right-hand corner)
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(1,1300,-50);});
await page.mouse.move(x0+110,y2,{steps:5});
const dr=await wait(async()=>{const k=(await K())[1];return k.drift===1&&k;},3000);assert.ok(dr,'full push starts a right drift');
// hold the drift like a player: ease the thumb between neutral and the inside to keep the kart on the road
const R=Math.min(90,Math.max(42,bb.width/2*.17)),ox=x0+110-R;
let sp=null;for(let n=0;n<160&&!sp;n++){const k=(await K())[1];if(k.spark>=2&&k.drift===1){sp=k;break;}
 const want=k.psi>.12?-.25:k.psi<-.02?.7:.2;await page.mouse.move(ox+want*R,y2);await page.waitForTimeout(80);}
assert.ok(sp,'holding the drift charges orange sparks');
// 3) let go → mini-turbo
await page.mouse.up();
const bo=await wait(async()=>{const k=(await K())[1];return k.drift===0&&k.boostT>0&&k;},3000);assert.ok(bo,'releasing fires a mini-turbo');
console.log('drift ok: sparks',sp.spark,'boost',bo.boostT.toFixed(2));
// 4) tap uses the item (P2), swipe down drops a banana behind
await page.evaluate(()=>window.ShambConkins.store.session.debug.teleport(1,150,0));await page.waitForTimeout(300);
await page.evaluate(()=>window.ShambConkins.store.session.debug.give(1,'mushroom'));
await page.mouse.click(x0,y2);
const used=await wait(async()=>{const k=(await K())[1];return !k.items&&k;},2000);assert.ok(used,'tap used the mushroom');
await page.evaluate(()=>window.ShambConkins.store.session.debug.give(1,'banana'));
await page.mouse.move(x0,y2);await page.mouse.down();await page.mouse.move(x0,y2+70,{steps:2});await page.mouse.up();
const peel=await wait(()=>page.evaluate(()=>{const u=window.ShambConkins.store.session.debug.lastUse[1];return u&&u.id==='banana'&&u.dir===-1;}),2000);assert.ok(peel,'swipe down dropped the banana behind');
// 5) P1's half (left) does not steer P2
const before=(await K())[1].steer;const x1=bb.x+bb.width*.3;await page.mouse.move(x1,y2);await page.mouse.down();await page.mouse.move(x1-100,y2,{steps:4});
const p1=await wait(async()=>{const k=await K();return k[0].steer<-.3&&k;},3000);assert.ok(p1,'left half steers P1');assert.ok(Math.abs(p1[1].steer)<.3,'P2 unaffected');await page.mouse.up();
assert.deepEqual(errors,[],'no JS errors');
console.log('kart controls OK');await browser.close();
