// M25 (owner's video, Nov 5: "the animation when swiping between games is really choppy"): records an Arcade swipe frame by
// frame on a phone-size screen with the CPU slowed down (CPU=4): every animation frame's gap, where the text block is and
// how visible both background slots are. Fails when frames stall (more than MAX_LONG frames over 50 ms in N swipes), when the
// text doesn't keep moving after the finger lets go (the old one has to carry on out, the new one come in from the other
// side), or when the next game's picture isn't already fading in under the finger before the release.
// Usage: SHAMB_URL=http://localhost:8123/ node tests/arcade-swipe-smooth.mjs   (N=6 GAP=500 CPU=4 VIEW=390x780 MAX_LONG=2 DUMP=1)
import {launchBrowser} from './lib.mjs';
const URL0=process.env.SHAMB_URL||'http://localhost:8123/',[VW,VH]=(process.env.VIEW||'390x780').split('x').map(Number),CPU=+process.env.CPU||4,GAP=+process.env.GAP||500,N=+process.env.N||6,MAX_LONG=+(process.env.MAX_LONG??2);
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const browser=await launchBrowser();const ctx=await browser.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:2.625,isMobile:true,hasTouch:true});const page=await ctx.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(URL0,{timeout:180000});await page.waitForSelector('.title-screen',{timeout:120000});await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:120000});
await page.addStyleTag({content:'#sc-dl,#sc-ready{display:none!important}'});
await page.click('[data-action="arcade"]');await page.waitForSelector('.arcade-console');await page.waitForTimeout(2500);
const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:CPU});
await page.evaluate(()=>{const L=window.__L=[];let last=performance.now();const f=t=>{const r=document.querySelector('.arcade-console');const info=r.querySelector('.arc-info');
 const slots=[...r.querySelectorAll('.arc-keyart>.arc-layer')].map(s=>({front:s.classList.contains('arc-key-front'),op:+getComputedStyle(s).opacity,has:!!s.querySelector('img')}));
 L.push({gap:t-last,ix:info.getBoundingClientRect().left,title:r.querySelector('.arc-title')?.textContent?.trim(),slots});last=t;window.__raf=requestAnimationFrame(f);};requestAnimationFrame(f);});
const y=VH*.42;
for(let k=0;k<N;k++){await page.evaluate(m=>window.__L.push({mark:m}),'swipe');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:VW*.8,y}]});
 for(let s=1;s<=12;s++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:VW*.8-s*VW*.05,y}]});await page.waitForTimeout(16);}
 await page.evaluate(m=>window.__L.push({mark:m}),'release');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(GAP);}
const L=await page.evaluate(()=>{cancelAnimationFrame(window.__raf);return window.__L;});await browser.close();
// split into swipes: [drag frames, after-release frames]
const swipes=[];let cur=null;for(const e of L){if(e.mark==='swipe'){cur={drag:[],after:[]};swipes.push(cur);}else if(e.mark==='release')cur.rel=true;else if(cur)(cur.rel?cur.after:cur.drag).push(e);}
const frames=L.filter(e=>!e.mark),long=frames.filter(e=>e.gap>50).length,worst=Math.round(Math.max(...frames.map(e=>e.gap)));
check(long<=MAX_LONG,`${long} frames over 50 ms in ${N} swipes (worst ${worst} ms, ${frames.length} frames)`);
swipes.forEach((w,k)=>{const t0=w.drag[0]?.title,t1=w.after.at(-1)?.title;check(t1&&t1!==t0,`swipe ${k+1}: ${t0} → ${t1}`);
 // the prepared picture is already showing under the finger before the release (games with a background picture)
 const back=w.drag.at(-1)?.slots.find(s=>!s.front&&s.has);if(back)check(back.op>.3,`swipe ${k+1}: next picture fading in under the finger (${back.op.toFixed(2)})`);
 // after the release the text is never still for more than ~3 frames until it settles (no freeze, no jump without motion)
 let still=0,maxStill=0;const after=w.after.slice(0,w.after.findIndex((e,i)=>i>3&&Math.abs(e.ix-w.after.at(-1).ix)<1)+1||undefined);
 for(let i=1;i<after.length;i++){if(Math.abs(after[i].ix-after[i-1].ix)<.5)still++;else still=0;maxStill=Math.max(maxStill,still);}
 check(maxStill<=3,`swipe ${k+1}: text keeps moving after the release (longest still run ${maxStill} frames)`);});
check(!errors.length,`no page errors ${errors.slice(0,2).join(' | ')}`);
if(process.env.DUMP)for(const e of L)console.log(e.mark?'-- '+e.mark:`${Math.round(e.gap)} ${Math.round(e.ix)} ${e.title} ${e.slots.map(s=>(s.front?'F':'b')+s.op.toFixed(2)).join(' ')}`);
console.log(bad?`ARCADE SWIPE SMOOTH: ${bad} FAILED`:'ARCADE SWIPE SMOOTH OK');process.exit(bad?1:0);
