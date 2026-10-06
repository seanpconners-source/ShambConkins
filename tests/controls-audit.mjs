// Measures how much of the screen each minigame spends on on-screen control buttons.
// Usage: node tests/controls-audit.mjs [WxH] [id-regex]   (SHAMB_FILE overrides the build)
import {chromium,root} from './lib.mjs';
import path from 'node:path';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),filter=process.argv[3];
const file='file://'+path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html');
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const probe=await browser.newPage();await probe.goto(file);
let ids=await probe.evaluate(()=>window.ShambConkins.gameRegistry.map(g=>[g.id,g.engine]));await probe.close();
if(filter)ids=ids.filter(([i])=>new RegExp(filter).test(i));
const rows=[];
async function one([id,engine]){
 const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:w<700});const page=await ctx.newPage();await page.goto(file);await page.waitForTimeout(250);
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 for(let i=0;i<10;i++){await page.waitForTimeout(250);const ok=await page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const b=[...d.querySelectorAll('button')].find(b=>/start/i.test(b.innerText))||d.querySelector('button');b?.click();return false;}return !document.getElementById('game-layer').hidden;});if(ok)break;}
 await page.waitForTimeout(500);
 const m=await page.evaluate(()=>{const layer=document.getElementById('game-layer');if(layer.hidden)return null;const r=el=>el?el.getBoundingClientRect():null;const shell=r(layer.querySelector('.game-shell')),ctl=document.getElementById('game-controls');let area=0,buttons=0;if(ctl){for(const b of ctl.querySelectorAll('button')){const q=b.getBoundingClientRect();if(q.width&&q.height&&b.offsetParent){area+=q.width*q.height;buttons++;}}}const box=ctl?r(ctl):null;const cv=r(layer.querySelector('canvas'));return {shell:shell?shell.width*shell.height:0,buttons,btnArea:area,ctlH:box?box.height:0,canvas:cv?cv.width*cv.height:0,hasCanvas:!!cv};});
 rows.push({id,engine,...m});await ctx.close();
}
const q=[...ids];await Promise.all(Array.from({length:4},async()=>{while(q.length)await one(q.shift()).catch(e=>rows.push({id:'?',err:e.message}));}));
rows.sort((a,b)=>(b.ctlH||0)-(a.ctlH||0));
for(const r of rows){if(!r.shell){console.log(r.id,'(no game layer)');continue;}console.log(r.id.padEnd(30),r.engine.padEnd(14),'buttons',String(r.buttons).padStart(2),'ctlH',String(Math.round(r.ctlH)).padStart(3),'canvas%',Math.round(r.canvas/r.shell*100));}
await browser.close();
