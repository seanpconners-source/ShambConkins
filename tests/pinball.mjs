// Pinball (bucketheadland-pinball): launches from the arcade, checks the intro shows the whole table and zooms to
// the plunger, plunges and flips by touch, lets the autopilot play, then drains balls until both players have had
// 3 balls each (hand-off cards between balls) and the result dialog shows. Screenshots → OUT (default the system temp
// dir /pinball). Usage: node tests/pinball.mjs [solo] [WxH ...]
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const out=process.env.OUT||path.join(tmpdir(),'pinball');mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const args=process.argv.slice(2),solo=args.includes('solo');
const sizes=args.filter(a=>/^\d+x\d+$/.test(a)).map(s=>s.split('x').map(Number));if(!sizes.length)sizes.push([390,780],[844,390],[1100,700]);
for(const [w,h] of sizes){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`pb-${solo?'solo-':''}${w}x${h}`;
 const shot=name=>page.screenshot({path:`${out}/${tag}-${name}.png`});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(d?.engine!=='pinball')return null;const m=d.m;return {phase:d.phase,mphase:m.phase,cur:m.cur,ball:m.players[m.cur].ball,scores:d.scores,balls:m.w.balls.length,z:d.R.cam.z,flipA:m.w.flippers.map(f=>+f.a.toFixed(2))};});
 try{await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:40000});}catch{fail(`${tag} app did not boot: ${errors.join(' | ')}`);await browser.close();continue;}
 const ready=()=>page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());
 if(solo)await page.evaluate(()=>{const S=window.ShambConkins;S.store.profile.settings.solo={on:true,who:0,level:'normal'};});
 await page.evaluate(([solo])=>{window.ShambConkins.requestGame({id:'bucketheadland-pinball',origin:'arcade',solo});},[solo]);
 let d=null;for(let i=0;i<60&&!(d=await D());i++){await page.waitForTimeout(200);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});}
 if(!d){await shot('noload');fail(`${tag} engine never loaded: ${errors.join(' | ')} dialog: ${await page.evaluate(()=>document.querySelector('#dialog')?.innerText?.slice(0,200))}`);await browser.close();continue;}
 await page.waitForTimeout(300);await ready();await page.waitForTimeout(1200);await shot('intro');d=await D();if(d.phase!=='intro'||d.z!==0)fail(`${tag} intro: ${JSON.stringify(d)}`);
 for(let i=0;i<30&&(d=await D()).phase!=='ball';i++)await page.waitForTimeout(200);
 await page.waitForTimeout(300);await shot('plunge');if(d.mphase!=='plunge')fail(`${tag} not waiting at the plunger: ${JSON.stringify(d)}`);
 // touch: drag down + release = plunge
 await page.mouse.move(w*.75,h*.5);await page.mouse.down();await page.mouse.move(w*.75,h*.5+h*.15,{steps:6});await page.waitForTimeout(200);await shot('pull');await page.mouse.up();
 await page.waitForTimeout(500);d=await D();if(d.mphase!=='play')fail(`${tag} plunge did not fire: ${JSON.stringify(d)}`);
 await page.waitForTimeout(700);await shot('launched');
 // touch: hold the left half → left flipper up
 const rest=d.flipA;await page.mouse.move(w*.2,h*.8);await page.mouse.down();await page.waitForTimeout(150);d=await D();await page.mouse.up();
 if(!(d.flipA[0]<rest[0]-.5))fail(`${tag} left flipper did not rise: ${rest} -> ${d.flipA}`);
 await page.evaluate(()=>{window.ShambConkins.store.session.debug.auto=true;});
 await page.waitForTimeout(5000);await shot('play');
 // drain every ball until the game ends
 const want=solo?3:6;let seen=new Set(),last='';
 for(let k=0;k<200;k++){
  d=await D();if(!d)break;
  const key=`${d.cur}:${d.ball}`;if(d.phase==='ball'&&!seen.has(key)){seen.add(key);if(seen.size===2)await shot('p2');}
  if(d.phase==='ball'&&d.mphase==='play')await page.evaluate(()=>{const m=window.ShambConkins.store.session.debug.m;m.saveUntil=0;for(const b of m.w.balls){b.state='free';b.x=236;b.y=1100;}});
  if(d.phase==='bonus'&&last!=='bonus')await shot('bonus');
  last=d.phase;await ready();await page.waitForTimeout(250);
 }
 await page.waitForTimeout(3500);
 const result=await page.evaluate(()=>document.querySelector('#dialog')?.innerText||'');
 await shot('result');
 if(seen.size<want)fail(`${tag} only saw ${seen.size} of ${want} balls (${[...seen]})`);
 if(!/arcade|again|takes it|shared|best|run/i.test(result))fail(`${tag} no result dialog: ${result.slice(0,200)}`);
 console.log(tag,'balls',[...seen].join(' '),'| result:',result.replace(/\s+/g,' ').slice(0,140));
 if(errors.length)fail(`${tag} page errors: ${errors.slice(0,5).join(' | ')}`);
 await browser.close();
}
console.log(ok?'pinball OK':'pinball FAILED');process.exit(ok?0:1);
