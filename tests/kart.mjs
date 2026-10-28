// 3D Mario Kart, all four games end to end in headless Chromium: course select, Grand Prix VS (side by side),
// Grand Prix pass & play (two turns vs CPU racers), Time Trials pass & play (P2 races P1's ghost) and Balloon Battle VS.
// Karts drive on autopilot; laps are shortcut with debug.finishLap so each run reaches the result screen.
// Screenshots → OUT (default /tmp/claude-0/sc). Usage: node tests/kart.mjs [id-regex] [course-id] [WxH]
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const re=new RegExp(process.argv[2]||'.'),courseArg=process.argv[3],[VW,VH]=(process.argv[4]||'844x390').split('x').map(Number);
const games=[['rainbow-road-kart','rainbow-road'],['kart-grand-prix-pass','moo-moo-meadows'],['kart-time-trial','cheep-cheep-beach'],['rainbow-balloon-battle',null]].filter(([id])=>re.test(id));
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const [id,course0] of games){
 const course=course0===null?null:(courseArg||course0),tag=`kart-${id}`;
 const {browser,page,errors}=await open({viewport:{width:VW,height:VH}});
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);await page.waitForTimeout(400);
 await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;return {mode:d.mode,phase:d.phase,clock:d.clock,course:d.course?.id,humans:d.humans,ghost:d.ghost,heads:d.headOK,
  K:(d.K||[]).map(k=>({lap:k.lap,s:Math.round(k.s),v:Math.round(k.v),finished:k.finished,place:k.place,balloons:k.balloons,cpu:k.cpu}))};}).catch(()=>null);
 const until=async(test,ms=20000)=>{let d;for(let t=0;t<ms;t+=200){d=await D();if(d&&test(d))return d;await page.waitForTimeout(200);}return d;};
 const pass=async()=>{for(let i=0;i<300;i++){if(await page.evaluate(()=>{const b=document.querySelector('.pass-overlay [data-ready]');b?.click();return !!b;}))return true;await page.waitForTimeout(200);}return false;};
 const dbg=(fn,...a)=>page.evaluate(([fn,a])=>window.ShambConkins.store.session.debug[fn](...a),[fn,a]);
 const result=async()=>{for(let i=0;i<400;i++){const t=await page.evaluate(()=>{const d=document.getElementById('dialog');return d?.open?d.textContent.replace(/\s+/g,' ').trim():null;}).catch(()=>null);if(t&&/wins|takes|tie|draw/i.test(t))return t;await page.waitForTimeout(250);}return null;};
 if(course){let d=await until(d=>d.phase==='select',10000);if(d?.phase!=='select'){fail(`${tag} no course select (${d?.phase})`);await browser.close();continue;}
  await page.waitForTimeout(400);await page.screenshot({path:`${out}/${tag}-select.png`});await dbg('pick',course);}
 const turns=/pass|trial/.test(id)?2:1;
 for(let t=0;t<turns;t++){
  if(turns===2&&!await pass())fail(`${tag} no hand-off for turn ${t}`);
  let d=await until(d=>d.K.length&&(d.phase==='intro'||d.phase==='count'||d.phase==='play'),15000);
  if(!d?.K.length){fail(`${tag} turn ${t} did not start (${JSON.stringify(d)})`);break;}
  if(turns===2&&d.humans?.[0]!==t)fail(`${tag} turn ${t} drives player ${d.humans}`);
  if(/trial/.test(id)&&t===1&&!d.ghost)fail(`${tag} no ghost for P2`);
  if(/trial/.test(id)&&d.K.length!==1)fail(`${tag} time trial has ${d.K.length} karts`);
  if(/pass/.test(id)&&d.K.length!==8)fail(`${tag} grand prix has ${d.K.length} karts`);
  await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${tag}-t${t}-intro.png`});
  await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.skip();d.auto[0]=d.auto[1]=true;});
  await page.waitForTimeout(3500);await page.screenshot({path:`${out}/${tag}-t${t}-race.png`});
  d=await D();console.log(tag,'turn',t,JSON.stringify({phase:d?.phase,clock:d?.clock?.toFixed(1),karts:d?.K.length,heads:d?.heads,cpus:d?.K.filter(k=>k.cpu).map(k=>k.cpu).join(',')}));
  if(/battle/.test(id)){await page.evaluate(()=>{const K=window.ShambConkins.store.session.debug.K;K[1].balloons=0;K[1].out=true;});}
  else for(const p of (d?.humans||[t]))await dbg('finishLap',p);
  d=await until(d=>!d||d.phase==='end',30000);if(d&&d.phase!=='end')fail(`${tag} turn ${t} never ended (${d?.phase})`);
 }
 const r=await result();console.log(tag,'result:',r?.slice(0,200));if(!r)fail(`${tag} no result dialog`);
 if(errors.length)fail(`${tag} errors: ${errors.join(' | ')}`);await browser.close();}
console.log(ok?'kart OK':'kart FAILED');process.exit(ok?0:1);
