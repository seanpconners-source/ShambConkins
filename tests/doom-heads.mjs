// DOOM monster heads: spawns each monster type in front of the player (frozen, god mode) at a few rotations and
// screenshots it, to check the roster head sits on the sprite's head and turns with it. Also the status-bar faces.
// Output: OUT (default /tmp/claude-0/sc/doomhead-*). Usage: node tests/doom-heads.mjs [doom|doom-2]
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const id=process.argv[2]||'doom-2';
const {browser,page,errors}=await open({viewport:{width:900,height:420}});
await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
await page.waitForTimeout(400);await page.evaluate(()=>{[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click();});
for(let i=0;i<60;i++){await page.waitForTimeout(250);if(await page.evaluate(()=>!!window.ShambConkins.store.session?.debug?.app))break;}
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.app.game.nomonsters=true;void d.start(2,1,1);});
for(let i=0;i<20;i++){await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());if(await page.evaluate(()=>window.ShambConkins.store.session.debug.state==='level'))break;}
await page.evaluate(()=>window.ShambConkins.store.session.debug.cheat('iddqd'));
const types=(process.env.TYPES||'POSSESSED SHOTGUY CHAINGUY TROOP SERGEANT HEAD SKULL BRUISER KNIGHT UNDEAD FATSO BABY PAIN VILE SPIDER CYBORG WOLFSS').split(' ');
for(const t of types){
 for(const ang of [0,45,90,180]){
  const mid=await page.evaluate(([t,ang])=>{const d=window.ShambConkins.store.session.debug;for(const m of [...d.game.mobjs()])if(m!==d.game.players[0].mo)d.game.removeMobj(m);const id=d.spawn(t,['SPIDER','CYBORG'].includes(t)?260:t==='FATSO'||t==='BABY'?170:110,ang);d.freeze();return id;},[t,ang]);
  await page.waitForTimeout(450);await page.screenshot({path:`${out}/doomhead-${t}-${ang}.png`,clip:{x:200,y:20,width:500,height:320}});}
}
// attack / pain / death poses for the imp
for(const st of ['TROO_ATK2','TROO_PAIN','TROO_DIE3','TROO_DIE5']){await page.evaluate(st=>{const d=window.ShambConkins.store.session.debug;for(const m of [...d.game.mobjs()])if(m!==d.game.players[0].mo)d.game.removeMobj(m);const id=d.spawn('TROOP',110,0);d.setState(id,st);d.freeze();},st);
 await page.waitForTimeout(450);await page.screenshot({path:`${out}/doomhead-imp-${st}.png`,clip:{x:200,y:20,width:500,height:320}});}
// all 42 status-bar faces of player 1's character
await page.waitForTimeout(1500);
const url=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug,app=d.app,id=window.ShambConkins.store.session.players[0].character;
 const c=document.createElement('canvas');c.width=8*70;c.height=6*70;const x=c.getContext('2d');x.fillStyle='#333';x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=false;
 for(let i=0;i<42;i++){const f=app.heads.face(id,i);x.drawImage(f,(i%8)*70+3,Math.floor(i/8)*70+3,64,64);}return c.toDataURL();});
const {writeFileSync}=await import('node:fs');writeFileSync(`${out}/doomhead-faces.png`,Buffer.from(url.split(',')[1],'base64'));
console.log(errors.length?'errors: '+errors.join(' | '):'no page errors');await browser.close();
