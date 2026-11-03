// Call of Duty: Modern Stick Dot (engines/modernStickDot.js, id office-dots-boxes): title, then a whole match by real taps on
// the map (the CPU or the other player's turns too), kill cams appear on a capture and the result card shows the score.
// Usage: node tests/stickdot.mjs [WxH] [cpu]   (SHAMB_URL=http://localhost:8123/); screenshots: sd-*.png
import {launchBrowser,screenshotPath} from './lib.mjs';
const [w,h]=(process.argv[2]||'390x780').split('x').map(Number),tag=`${w}x${h}`,vsCpu=process.argv[3]==='cpu';
const browser=await launchBrowser(),page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
await page.goto(process.env.SHAMB_URL||'http://localhost:8123/',{timeout:180000});await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
await page.evaluate(v=>{const S=window.ShambConkins;if(v)S.store.profile.settings.solo={on:true,who:0,level:'normal'};S.requestGame({id:'office-dots-boxes',origin:'arcade',solo:v,quick:true});},vsCpu);
await page.waitForSelector('.pass-overlay [data-ready]',{timeout:20000});await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]').click());
await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.phase==='title',null,{timeout:15000});
await page.waitForTimeout(2300);await page.screenshot({path:screenshotPath(`sd-title-${tag}.png`)});
await page.waitForTimeout(3000);await page.screenshot({path:screenshotPath(`sd-card-${tag}.png`)});
await page.evaluate(()=>window.ShambConkins.store.session.debug.skip());await page.waitForFunction(()=>window.ShambConkins.store.session.debug.phase==='play',null,{timeout:8000});
await page.waitForTimeout(1700);await page.screenshot({path:screenshotPath(`sd-board-${tag}.png`)});
const box=await page.evaluate(()=>{const c=document.querySelector('.game-canvas').getBoundingClientRect();return {x:c.left,y:c.top};});
// a tap on an open line's middle, in page pixels
const open=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d||d.phase!=='play'||d.busy||d.cut)return null;const st=d.state,out=[];for(const o of ['h','v'])st[o].forEach((v,i)=>{if(v<0){const e=d.edgeOf(o,i);out.push({o,i,x:(e.ax+e.bx)/2,y:(e.ay+e.by)/2});}});if(!out.length)return null;return {turn:st.turn,pick:out[Math.floor(Math.random()*out.length)]};});
const t0=Date.now();let taps=0,cuts=new Set(),shot=new Set(),first=true,firstOk=null;
while(Date.now()-t0<280000){
 const st=await page.evaluate(()=>{const S=window.ShambConkins.store,d=S.session?.debug;if(!d)return {over:true};return {cut:d.cut?.kind||null,phase:d.phase};});
 if(st.over)break;
 if(st.cut){if(!shot.has(st.cut)){cuts.add(st.cut);await page.waitForTimeout(1000);await page.screenshot({path:screenshotPath(`sd-cut-${st.cut}-${tag}.png`)}).catch(()=>{});shot.add(st.cut);}await page.mouse.click(box.x+20,box.y+200);await page.waitForTimeout(250);continue;}
 const m=await open();
 if(m&&!(vsCpu&&m.turn===1)){const before=await page.evaluate(()=>{const s=window.ShambConkins.store.session.debug.state;return s.h.concat(s.v).filter(v=>v>=0).length;});await page.mouse.click(box.x+m.pick.x,box.y+m.pick.y);taps++;await page.waitForTimeout(120);
  if(first){first=false;firstOk=await page.evaluate(b=>{const s=window.ShambConkins.store.session.debug.state;return s.h.concat(s.v).filter(v=>v>=0).length===b+1;},before);}
  if(taps===14)await page.screenshot({path:screenshotPath(`sd-mid-${tag}.png`)});}
 await page.waitForTimeout(160);
}
check(firstOk===true,'a tap on the map draws that line');
check(cuts.size>=1,'a capture plays a kill cam ('+[...cuts].join(', ')+')');
const end=await page.waitForFunction(()=>document.getElementById('dialog').open,null,{timeout:30000}).then(()=>page.evaluate(()=>document.getElementById('dialog').innerText.replace(/\s+/g,' ').slice(0,140)),()=>'');
check(/outposts|wins|beats|Sean|tie/i.test(end),'the match ends on the result card: '+end);
check(!errors.length,'no page errors '+errors.slice(0,3).join(' | '));
await browser.close();console.log(bad?`${bad} problem(s)`:'STICK DOT OK');process.exit(bad?1:0);
