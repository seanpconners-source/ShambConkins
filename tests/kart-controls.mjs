// 3D Mario Kart touch controls (Mario Kart Tour style) driven with real pointer events in headless Chromium:
// drag steers, pushing all the way drifts and charges sparks, letting go fires the mini-turbo, a tap uses the item,
// a swipe down drops it behind, and each half of the screen belongs to one player.
import {open} from './lib.mjs';
import assert from 'node:assert/strict';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'rainbow-road-kart',origin:'arcade'});});await page.waitForTimeout(400);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
await page.waitForTimeout(2500);
const has=await page.evaluate(()=>!!window.ShambConkins.store.session?.debug?.course);assert.ok(has,'3D kart session (no WebGL fallback)');
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.skip();d.teleport(0,200,0);d.teleport(1,150,-20);});
const bb=await (await page.$('#game-layer canvas')).boundingBox();
const K=()=>page.evaluate(()=>window.ShambConkins.store.session.debug.K.map(k=>({s:k.s,d:k.d,psi:k.psi,v:k.v,drift:k.drift,spark:k.spark,driftT:k.driftT,boostT:k.boostT,items:k.items.map(i=>i.id+i.n).join(','),steer:k.steer})));
const wait=async(fn,ms=8000)=>{const t=Date.now();while(Date.now()-t<ms){const v=await fn();if(v)return v;await page.waitForTimeout(100);}return null;};
// let P2 (bottom half) get up to speed
await wait(async()=>(await K())[1].v>200);
const y2=bb.y+bb.height*.75,x0=bb.x+bb.width*.4;
// 1) gentle drag right steers without drifting
await page.mouse.move(x0,y2);await page.mouse.down();await page.mouse.move(x0+25,y2,{steps:4});
const st=await wait(async()=>{const k=(await K())[1];return k.steer>.2&&k;},3000);assert.ok(st,'drag steers');assert.equal(st.drift,0,'small drag does not drift');
// 2) push all the way → drift, hold → sparks (in the first right-hand corner)
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(1,1340,-30);});
await page.mouse.move(x0+140,y2,{steps:5});
const dr=await wait(async()=>{const k=(await K())[1];return k.drift===1&&k;},3000);assert.ok(dr,'full push starts a right drift');
const sp=await wait(async()=>{const k=(await K())[1];return k.spark>=2&&k;},12000);assert.ok(sp,'holding the drift charges orange sparks');
// 3) let go → mini-turbo
await page.mouse.up();
const bo=await wait(async()=>{const k=(await K())[1];return k.drift===0&&k.boostT>0&&k;},3000);assert.ok(bo,'releasing fires a mini-turbo');
console.log('drift ok: sparks',sp.spark,'boost',bo.boostT.toFixed(2));
// 4) tap uses the item (P2), swipe down drops a banana behind
await page.evaluate(()=>window.ShambConkins.store.session.debug.give(1,'mushroom'));
await page.mouse.click(x0,y2);
const used=await wait(async()=>{const k=(await K())[1];return !k.items&&k;},2000);assert.ok(used,'tap used the mushroom');
await page.evaluate(()=>window.ShambConkins.store.session.debug.give(1,'banana'));
await page.mouse.move(x0,y2);await page.mouse.down();await page.mouse.move(x0,y2+70,{steps:2});await page.mouse.up();
const peel=await wait(()=>page.evaluate(()=>window.ShambConkins.store.session.debug.bananas.length>0),2000);assert.ok(peel,'swipe down dropped the banana');
// 5) P1's half (top) does not steer P2
const before=(await K())[1].steer;await page.mouse.move(x0,bb.y+bb.height*.25);await page.mouse.down();await page.mouse.move(x0-120,bb.y+bb.height*.25,{steps:4});
const p1=await wait(async()=>{const k=await K();return k[0].steer<-.3&&k;},3000);assert.ok(p1,'top half steers P1');assert.ok(Math.abs(p1[1].steer)<.3,'P2 unaffected');await page.mouse.up();
assert.deepEqual(errors,[],'no JS errors');
console.log('kart controls OK');await browser.close();
