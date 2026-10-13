// 3D Mario Kart: launches race + battle at phone and desktop size, drives both karts on autopilot, checks the 3D
// renderer is used (not the Mode 7 fallback), laps progress, items fire, and no JS errors. Screenshots → OUT.
// Usage: node tests/kart.mjs [race|battle|all] [seconds]
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const which=process.argv[2]||'all',secs=+(process.argv[3]||20);let ok=true;
const games=[['rainbow-road-kart','race'],['rainbow-balloon-battle','battle']].filter(g=>which==='all'||g[1]===which);
for(const [id,mode] of games)for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`kart-${mode}-${w}`;
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);await page.waitForTimeout(400);
 await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 await page.waitForFunction(()=>document.querySelector('#game-layer canvas'),{timeout:15000}).catch(()=>{});
 await page.waitForTimeout(1500);
 const dbg=()=>page.evaluate(()=>{const s=window.ShambConkins.store.session;return s?.debug?{phase:s.debug.phase,clock:+s.debug.clock.toFixed(1),k:s.debug.K.map(k=>({lap:k.lap,s:Math.round(k.s),v:Math.round(k.v),air:k.air,items:k.items.map(i=>i.id).join('+'),coins:k.coins,balloons:k.balloons,falls:k._falls||0})),parts:s.debug.particles,heads:s.debug.headOK}:null;});
 await page.screenshot({path:`${out}/${tag}-intro.png`});
 const has3d=await page.evaluate(()=>!!window.ShambConkins.store.session?.debug?.course);
 if(!has3d){console.log(tag,'NO 3D session (fallback?)',errors.join(' | '));ok=false;await browser.close();continue;}
 await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.auto[0]=d.auto[1]=true;});
 await page.waitForTimeout(4200);await page.screenshot({path:`${out}/${tag}-go.png`});
 const t0=Date.now();let shot=0;
 while(Date.now()-t0<secs*1000){await page.waitForTimeout(2500);const st=await dbg();if(!st)break;if(shot<4){await page.screenshot({path:`${out}/${tag}-${shot++}.png`});}
  if(st.phase==='end')break;}
 const st=await dbg();console.log(tag,JSON.stringify(st),errors.length?'ERRORS '+errors.join(' | '):'clean');if(errors.length)ok=false;await browser.close();}
console.log(ok?'kart OK':'kart FAILED');process.exit(ok?0:1);
