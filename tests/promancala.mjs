// Tony Hawk's Pro Mancala (greed-island-mancala): title sequence, a whole 2P game played by tapping bowls, a 1P game vs
// the CPU, the end-of-run tally and the result card, at phone portrait, phone landscape and desktop sizes.
// Screenshots: OUT (default local-test-reports/screenshots/pm-*).  Usage: node tests/promancala.mjs [WxH ...]  (SOLO=0 skips 1P)
import {open,root} from './lib.mjs';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const out=process.env.OUT||path.join(root,'local-test-reports','screenshots');mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const sizes=process.argv.slice(2).length?process.argv.slice(2).map(s=>s.split('x').map(Number)):[[390,780],[844,390],[1100,700]];
const modes=process.env.SOLO==='0'?['2p']:['2p','1p'];
for(const [w,h] of sizes)for(const mode of modes){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`pm-${mode}-${w}x${h}`;
 const shot=name=>page.screenshot({path:`${out}/${tag}-${name}.png`});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;return d?{phase:d.phase,busy:d.busy,turn:d.state.turn,winner:d.state.winner,pits:[...d.state.pits],centers:d.centers,points:d.P.map(p=>p.points),bails:d.P.map(p=>p.bails),combos:d.P.map(p=>p.combos),cut:d.cut}:null;});
 await page.evaluate(([mode])=>{const st=window.ShambConkins.store;if(mode==='1p'){st.profile.settings.solo={...(st.profile.settings.solo||{}),on:true,who:0,level:'normal'};}
  window.ShambConkins.requestGame({id:'greed-island-mancala',origin:'arcade',solo:mode==='1p'});},[mode]);
 await page.waitForTimeout(500);await page.evaluate(()=>{[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click();});
 await page.waitForTimeout(700);await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());
 const lay=await page.evaluate(()=>{const c=document.querySelector('#game-canvas').getBoundingClientRect();return {cw:c.width,ch:c.height,score:getComputedStyle(document.querySelector('#game-scorebar')).display};});
 if(lay.cw<w-4||lay.ch<h-4||lay.score!=='none')fail(`${tag} not full-bleed ${JSON.stringify(lay)}`);
 // title: shots through the sequence in 2P; 1P taps to skip it
 if(mode==='2p'){let t0=Date.now();for(const [at,name] of [[1500,'intro-tony'],[2600,'intro-pro'],[3900,'intro-mancala'],[5200,'intro-extreme'],[7100,'intro-vs']]){const dt=at-(Date.now()-t0);if(dt>0)await page.waitForTimeout(dt);await shot(name);}}
 else{await page.waitForTimeout(600);const b=await page.evaluate(()=>document.querySelector('#game-canvas').getBoundingClientRect().toJSON());await page.mouse.click(b.x+b.width/2,b.y+b.height/2);}
 let s=null;for(let t=0;t<12000;t+=200){s=await D();if(s?.phase==='play')break;await page.waitForTimeout(200);}
 if(s?.phase!=='play'){fail(`${tag} never reached play ${JSON.stringify(s)}`);await browser.close();continue;}
 await page.waitForTimeout(900);await shot('board');
 // play: tap a legal bowl (prefer a store landing, else the biggest) whenever it is a human's turn
 // camera cutaways: one screenshot of each kind (mid-trick), the rest are skipped to keep the run short
 const box=await page.evaluate(()=>document.querySelector('#game-canvas').getBoundingClientRect().toJSON());let moves=0,shots=0,t0=Date.now();const cuts=new Set();
 while(Date.now()-t0<240000){s=await D();if(!s||s.phase!=='play')break;
  if(s.cut){if(!cuts.has(s.cut)){cuts.add(s.cut);await page.waitForTimeout(s.cut==='bail'?1150:900);await shot('cut-'+s.cut);}await page.evaluate(()=>window.ShambConkins.store.session?.debug?.skipCut?.());await page.waitForTimeout(150);continue;}
  if(!s.busy&&!(mode==='1p'&&s.turn===1)){const mine=[0,1,2,3,4,5].map(k=>k+s.turn*7).filter(i=>s.pits[i]>0);const store=s.turn?13:6;
   const land=mine.find(i=>(i+s.pits[i])%14===store&&s.pits[i]<14);const pick=land??mine.sort((a,b)=>s.pits[b]-s.pits[a])[0];const c=s.centers[pick];
   await page.mouse.click(box.x+c.x,box.y+c.y);moves++;if(moves===3||moves===9){await page.waitForTimeout(900);await shot('play'+(++shots));}}
  await page.waitForTimeout(250);}
 s=await D();console.log(tag,'moves',moves,'phase',s?.phase,'stores',s?.pits?.[6],s?.pits?.[13],'points',s?.points?.join('/'),'bails',s?.bails?.join('/'),'combos',s?.combos?.join('/'));
 if(s?.phase!=='end')fail(`${tag} game did not reach the tally ${JSON.stringify(s)}`);
 await page.waitForTimeout(3300);await shot('tally');
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);let res=null;for(let t=0;t<6000&&!res;t+=200){await page.waitForTimeout(200);res=await page.evaluate(()=>document.querySelector('#dialog')?.textContent?.match(/win|tie|lose|draw|beat|takes/i)?.[0]||null);}
 await shot('result');if(!res)fail(`${tag} no result dialog`);
 if(errors.length)fail(`${tag} errors: ${errors.slice(0,5).join(' | ')}`);
 await browser.close();}
console.log(ok?'promancala OK':'promancala FAILED');process.exit(ok?0:1);
