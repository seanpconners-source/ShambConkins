// Pinball camera smoothness: the autopilot plays while every frame's camera position is sampled, then reports how
// the view moves on screen: peak / 95th-percentile acceleration (px/s²), "snaps" (frames whose acceleration tops 40,000 px/s²; the speed
// changes by more than 900 px/s in one frame), direction flip-flops per minute, and how often the ball is off screen
// (and how much of that is below it, toward the flippers) or in the outer 8% of the view. Usage: node tests/pinball-camera.mjs [secs=40] [WxH ...]  (default Fold 700x840 + 390x780)
// ZOOM=1 turns the optional auto zoom on.
import {open} from './lib.mjs';
const args=process.argv.slice(2),secs=+(args.find(a=>/^\d+$/.test(a))||40);
const sizes=args.filter(a=>/^\d+x\d+$/.test(a)).map(s=>s.split('x').map(Number));if(!sizes.length)sizes.push([700,840],[390,780]);
for(const [w,h] of sizes){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:40000});
 await page.evaluate(()=>{window.ShambConkins.requestGame({id:'bucketheadland-pinball',origin:'arcade'});});
 const D=()=>page.evaluate(()=>window.ShambConkins.store.session?.debug?.phase);
 for(let i=0;i<60&&!(await D());i++){await page.waitForTimeout(200);await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());}
 await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());
 for(let i=0;i<40&&(await D())!=='ball';i++)await page.waitForTimeout(200);
 // sample every animation frame; endless balls (ball save forever) so the run never stops for hand-offs
 const r=await page.evaluate(async ([secs,zoom])=>{const d=window.ShambConkins.store.session.debug;d.auto=true;if(d.R.cam.speedZoom!==undefined)d.R.cam.speedZoom=zoom;const S=[];
  return await new Promise(res=>{const t0=performance.now();const tick=now=>{const m=d.m;m.saveUntil=m.t+99;
   const v=d.R.view(window.ShambConkins.store.session.W,window.ShambConkins.store.session.H),b=m.w.balls[0];
   if(d.phase==='ball')S.push({t:now/1000,y:v.y*v.s,s:v.s,vh:v.vh,by:b?b.y:null,cy:v.y});
   if(now-t0<secs*1000)requestAnimationFrame(tick);else res(S);};requestAnimationFrame(tick);});},[secs,!!process.env.ZOOM]);
 let snaps=0,flips=0,off=0,offLow=0,edge=0,acc=[],lastDir=0;
 for(let i=2;i<r.length;i++){const a=r[i-2],b=r[i-1],c=r[i],dt1=b.t-a.t,dt2=c.t-b.t;if(dt1<=0||dt2<=0)continue;const v1=(b.y-a.y)/dt1,v2=(c.y-b.y)/dt2,ac=(v2-v1)/((dt1+dt2)/2);acc.push(Math.abs(ac));
  if(Math.abs(ac)>40000)snaps++;const dir=Math.abs(v2)<30?0:Math.sign(v2);if(dir&&lastDir&&dir!==lastDir)flips++;if(dir)lastDir=dir;
  if(c.by!=null){const rel=(c.by-c.cy)/c.vh;if(rel<0||rel>1)off++;if(rel>1)offLow++;else if(rel<.08||rel>.92)edge++;}}
 acc.sort((p,q)=>p-q);const n=r.length,mins=(r[n-1].t-r[0].t)/60;
 console.log(`${w}x${h} view ${Math.round(r[n-1].vh)}mm of 1067 | frames ${n} | jolts>40k ${snaps} | accel p95 ${Math.round(acc[Math.floor(acc.length*.95)]||0)} max ${Math.round(acc[acc.length-1]||0)} px/s² | direction flips ${(flips/mins).toFixed(0)}/min | ball off-screen ${(100*off/n).toFixed(1)}% (below the view ${(100*offLow/n).toFixed(1)}%) edge ${(100*edge/n).toFixed(1)}%`);
 if(errors.length)console.log('ERRORS',errors.slice(0,3).join(' | '));
 await browser.close();
}
