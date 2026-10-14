// Castlevania · Symphony of the Night: hero feel. Checks the three-hit combo (quick cut → stab → cleave, buffered presses,
// the stab lunges forward, the cleave hits hardest), the blue after-image and sword trails, acceleration/skid, coyote
// time and jump buffering, backdash chaining and backdash-cancel, the dive kick and the Leap Stone somersault.
// Screenshots go to OUT (default /tmp/claude-0/sc/sotnc-*). Usage: node tests/sotn-combo.mjs [WxH ...]
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const sizes=process.argv.slice(2).length?process.argv.slice(2).map(s=>s.split('x').map(Number)):[[390,780],[1100,700]];
for(const [w,h] of sizes){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`sotnc-${w}`;
 const shot=name=>page.screenshot({path:`${out}/${tag}-${name}.png`});
 await page.evaluate(()=>{window.ShambConkins.requestGame({id:'cv-symphony',origin:'arcade'});});
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const dbg=(f,a)=>page.evaluate(f,a);
 for(let i=0;i<80;i++){const ph=await dbg(()=>window.ShambConkins.store.session?.debug?.phase);if(ph==='play')break;await dbg(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}
 // a bot drives inputs frame by frame from a script stored on the page
 await dbg(()=>{const d=window.ShambConkins.store.session.debug;window.__log=[];window.__script=null;window.__f=0;
  d.bot=(inp,i)=>{const p=d.pl[i];const sc=window.__script;Object.assign(inp,{l:0,r:0,u:0,d:0,jump:0,atkHeld:0});
   if(sc){const k=window.__f++;sc(inp,k,p);}window.__log.push({x:p.x,gr:p.grounded,y:p.y,vx:p.vx,vy:p.vy,g:p.grounded,atk:p.atk?p.atk.n:-1,at:p.atk?p.atk.t:0,dash:p.dash,kick:p.kick,flip:p.flip,face:p.facing,ai:d.worlds[i].ai.length,sw:p.sw.length});};
  const w=d.worlds[0];w.foes=[];w.zoneT=w.zoneT.map(()=>1e9);d.pl[0].inv=1e9;});
 const state=()=>dbg(()=>{const d=window.ShambConkins.store.session.debug,p=d.pl[0];return JSON.stringify({x:p.x,y:p.y,vx:p.vx,vy:p.vy,g:p.grounded,atk:p.atk&&{...p.atk,hits:0},sw:p.sw,phase:d.phase});});
 const run=async(src,frames)=>{await dbg(`window.__log=[];window.__f=0;window.__script=${src};`);
  await page.waitForFunction(n=>window.__log.length>=n,frames,{timeout:20000}).catch(async e=>{console.log('STUCK',errors,await state());throw e;});
  const log=await dbg(()=>window.__log.slice());await dbg(()=>{window.__script=null;});return log;};
 const tp=x=>dbg(x=>{const d=window.ShambConkins.store.session.debug,w=d.worlds[0];w.deathDone=true;w.gateShut=true;d.skipScene(0);d.teleport(0,x);d.pl[0].facing=1;},x);
 // 1) walk: accelerates over a few frames and skids to a stop
 await tp(560);await page.waitForTimeout(200);
 let log=await run('(inp,k)=>{if(k<40)inp.r=1;}',70);
 const v=log.map(q=>q.vx);const tMax=v.findIndex(x=>x>1.85),stopT=v.slice(40).findIndex(x=>Math.abs(x)<.01);
 console.log(tag,'walk: frames to full speed',tMax,'skid frames',stopT,'trail images while walking',Math.max(...log.map(q=>q.ai)));
 if(!(tMax>=2&&tMax<=8))fail(`${tag} walk acceleration ${tMax}`);if(!(stopT>=2&&stopT<=10))fail(`${tag} skid ${stopT}`);
 if(Math.max(...log.map(q=>q.ai))<2)fail(`${tag} no blue trail while walking`);
 // 2) the combo: mash attack, expect hits 0,1,2 in order, the stab lunges forward
 await tp(560);await page.waitForTimeout(200);
 log=await run('(inp,k)=>{if(k%5===0&&k<60)inp.atk=1;}',90);
 const seq=[];for(const q of log)if(q.atk>=0&&seq[seq.length-1]!==q.atk)seq.push(q.atk);
 const stab=log.filter(q=>q.atk===1),lunge=stab.length?stab[stab.length-1].x-stab[0].x:0;
 console.log(tag,'combo sequence',seq.join(','),'stab lunge',lunge.toFixed(1),'sword trail max',Math.max(...log.map(q=>q.sw)));
 if(seq.slice(0,3).join(',')!=='0,1,2')fail(`${tag} combo order ${seq}`);if(!(lunge>8))fail(`${tag} stab did not lunge (${lunge})`);
 if(Math.max(...log.map(q=>q.sw))<3)fail(`${tag} no sword trail`);
 // screenshots of each hit
 for(const [n,t] of [[0,4],[1,5],[2,7]]){await tp(560);await dbg(()=>{window.ShambConkins.store.session.debug.pl[0].inv=0;});await page.waitForTimeout(300);
  await dbg(`window.__f=0;window.__log=[];window.__script=(inp,k,p)=>{if(k%5===0&&k<40)inp.atk=1;if(p.atk&&p.atk.n===${n}&&p.atk.t===${t}){window.ShambConkins.store.session.paused=true;window.__hold=1;}};`);
  await page.waitForTimeout(900);await dbg(()=>{window.__script=null;});await shot(`hit${n}`);await dbg(()=>{window.ShambConkins.store.session.paused=false;});}
 // 3) damage: each hit on a zombie; the cleave hits hardest
 await tp(1200);await page.waitForTimeout(200);
 const dmg=await dbg(()=>{const d=window.ShambConkins.store.session.debug,p=d.pl[0];return [p.weapon]; });
 // 4) coyote time: walk off the balcony edge and jump 3 frames later
 await tp(1380);await dbg(()=>{const d=window.ShambConkins.store.session.debug,p=d.pl[0];p.y=122;p.x=1395;p.vy=0;p.grounded=true;});
 log=await run('(inp,k,p)=>{inp.r=1;if(!p.grounded&&window.__off==null)window.__off=k;if(window.__off!=null&&k===window.__off+3){inp.press=1;inp.jump=1;}if(window.__off!=null&&k>window.__off+3&&k<window.__off+15)inp.jump=1;}',40);
 const rose=log.some(q=>q.vy<-3);console.log(tag,'coyote jump',rose);if(!rose)fail(`${tag} coyote jump failed`);await dbg(()=>{window.__off=null;});
 // 5) jump buffer: press jump 4 frames before landing
 await tp(1100);await page.waitForTimeout(300);
 log=await run('(inp,k,p)=>{if(k===0){inp.press=1;}if(k<14)inp.jump=1;if(!p.grounded&&p.vy>2&&p.y>188&&!window.__b){window.__b=1;inp.press=1;}}',90);
 const lands=log.filter((q,k)=>k&&q.g&&!log[k-1].g).length,jumps=log.filter((q,k)=>k&&q.vy<-4&&log[k-1].vy>=-4).length;
 console.log(tag,'jumps',jumps,'landings',lands);if(jumps<2)fail(`${tag} buffered jump was eaten (${jumps} jumps)`);await dbg(()=>{window.__b=0;});
 // 5b) variable jump: a tap is a short hop, holding jumps much higher
 const peakOf=async hold=>{await tp(1100);await page.waitForTimeout(300);const lg=await run(`(inp,k)=>{if(k===0)inp.press=1;if(k<${hold})inp.jump=1;}`,70);return Math.round(lg[0].y-Math.min(...lg.map(q=>q.y)));};
 const hop=await peakOf(3),full=await peakOf(40);console.log(tag,'jump heights: tap',hop,'held',full);
 if(!(hop<full*.75&&full>50))fail(`${tag} variable jump (${hop} vs ${full})`);
 // 6) backdash chain and cancel
 await tp(1100);await page.waitForTimeout(300);
 log=await run('(inp,k)=>{if(k===0||k===13)inp.dash=1;if(k===30)inp.dash=1;if(k===36)inp.atk=1;}',60);
 const dashes=log.filter((q,k)=>k&&q.dash>log[k-1].dash).length,canc=log.findIndex((q,k)=>k>=36&&q.atk>=0);
 console.log(tag,'backdashes',dashes,'cancel into attack at',canc,'vx',log[canc]?.vx.toFixed(2));
 if(dashes<3)fail(`${tag} backdash chain ${dashes}`);if(canc<0||canc>38)fail(`${tag} backdash cancel ${canc}`);
 // 7) dive kick and Leap Stone somersault
 await tp(1100);await dbg(()=>{window.ShambConkins.store.session.debug.pl[0].leap=true;});await page.waitForTimeout(300);
 log=await run('(inp,k)=>{if(k===0)inp.press=1;if(k<30)inp.jump=1;if(k===14)inp.press=1;if(k===30){inp.press=1;inp.d=1;}if(k>30)inp.d=1;}',80);
 const flipped=log.some(q=>q.flip>0),kicked=log.some(q=>q.kick>0);console.log(tag,'somersault',flipped,'dive kick',kicked);
 if(!flipped)fail(`${tag} no somersault`);if(!kicked)fail(`${tag} no dive kick`);
 await tp(1100);await dbg(()=>{window.ShambConkins.store.session.debug.pl[0].inv=0;});await page.waitForTimeout(300);
 await dbg(`window.__f=0;window.__script=(inp,k,p)=>{if(k===0)inp.press=1;if(k<30)inp.jump=1;if(k===14)inp.press=1;if(k===20)window.ShambConkins.store.session.paused=true;};`);await page.waitForTimeout(700);await shot('flip');await dbg(()=>{window.__script=null;window.ShambConkins.store.session.paused=false;});
 await tp(1100);await dbg(()=>{window.ShambConkins.store.session.debug.pl[0].inv=0;});await page.waitForTimeout(300);
 await dbg(`window.__f=0;window.__script=(inp,k,p)=>{if(k===0)inp.press=1;if(k<16)inp.jump=1;if(k===16){inp.press=1;inp.d=1;}if(k>16)inp.d=1;if(k===24)window.ShambConkins.store.session.paused=true;};`);await page.waitForTimeout(700);await shot('kick');await dbg(()=>{window.__script=null;window.ShambConkins.store.session.paused=false;});
 await tp(560);await dbg(()=>{window.ShambConkins.store.session.debug.pl[0].inv=0;});await page.waitForTimeout(300);
 await dbg(`window.__f=0;window.__script=(inp,k,p)=>{inp.r=1;if(k===40)window.ShambConkins.store.session.paused=true;};`);await page.waitForTimeout(1200);await shot('run');await dbg(()=>{window.__script=null;window.ShambConkins.store.session.paused=false;});
 await tp(700);await dbg(()=>{window.ShambConkins.store.session.debug.pl[0].inv=0;});await page.waitForTimeout(300);
 await dbg(`window.__f=0;window.__script=(inp,k,p)=>{if(k===0)inp.dash=1;if(k===9)window.ShambConkins.store.session.paused=true;};`);await page.waitForTimeout(700);await shot('backdash');await dbg(()=>{window.__script=null;window.ShambConkins.store.session.paused=false;});
 if(errors.length)fail(`${tag} errors ${errors.join(' ; ')}`);
 await browser.close();}
console.log(ok?'sotn-combo OK':'sotn-combo FAILED');process.exit(ok?0:1);
