// Game Boy controls pulse once per press and honor the shared reduced-motion helper.
import assert from 'node:assert/strict';
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
try{
 await page.evaluate(()=>{
  window.__pulses=[];
  Object.defineProperty(navigator,'vibrate',{configurable:true,value:ms=>{window.__pulses.push(ms);return true;}});
  window.ShambConkins.store.profile.settings.reducedMotion=false;
  window.__message=window.ShambConkins.pkmn.messages(['HAPTIC TEST'],{keepOpen:true});
 });
 await page.locator('.gb-overlay [data-btn="up"]').waitFor();
 for(const btn of ['up','down','left','right','a','b','start','select']){
  const target=page.locator('.gb-overlay [data-btn="'+btn+'"]');
  await target.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});
  await target.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});
  await target.dispatchEvent('pointerup',{pointerId:1,pointerType:'touch'});
  await target.dispatchEvent('click');
 }
 assert.deepEqual(await page.evaluate(()=>window.__pulses),Array(8).fill(10),'On-screen controls must pulse once');
 await page.keyboard.down('ArrowRight');
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',repeat:true,bubbles:true})));
 await page.keyboard.up('ArrowRight');
 assert.deepEqual(await page.evaluate(()=>window.__pulses),Array(9).fill(10),'Held keyboard repeat must not pulse');
 await page.evaluate(()=>{window.ShambConkins.store.profile.settings.reducedMotion=true;});
 await page.locator('[data-btn="a"]').dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch'});
 await page.locator('[data-btn="a"]').dispatchEvent('pointerup',{pointerId:2,pointerType:'touch'});
 assert.equal((await page.evaluate(()=>window.__pulses)).at(-1),0,'Reduced motion must disable vibration');
 await page.evaluate(()=>{Object.defineProperty(navigator,'vibrate',{configurable:true,value:undefined});window.ShambConkins.store.profile.settings.reducedMotion=false;});
 await page.locator('[data-btn="b"]').dispatchEvent('pointerdown',{pointerId:3,pointerType:'touch'});
 await page.locator('[data-btn="b"]').dispatchEvent('pointerup',{pointerId:3,pointerType:'touch'});
 assert.deepEqual(errors,[],'Unsupported vibration should not throw');
 console.log('POKÉMON HAPTICS OK: pointer, keyboard, reduced motion, unsupported devices');
}finally{await browser.close();}
