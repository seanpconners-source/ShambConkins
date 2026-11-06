// How much work every move in the Arcade costs, on a phone-sized screen with the CPU slowed down (CPU=4 by default):
// taps through N tiles (and swipes through N more), recording a Chrome trace, then prints per move the paint / raster /
// style / layout milliseconds, the painted area as screens' worth, and the long frames seen in the page (>34 ms and >50 ms).
// The owner's flicker ("every move everything flickers on and off") comes from repainting the whole screen on every move;
// this keeps it measurable. Usage: SHAMB_URL=http://localhost:8123/ node tests/arcade-perf.mjs   (N=10 CPU=4 VIEW=390x780)
import {launchBrowser,appURL} from './lib.mjs';
const URL0=(await appURL()),N=+process.env.N||10,CPU=+process.env.CPU||4,[VW,VH]=(process.env.VIEW||'390x780').split('x').map(Number);
const browser=await launchBrowser();const page=await (await browser.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
await page.goto(URL0,{timeout:180000});await page.waitForSelector('.title-screen',{timeout:120000});await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:120000});
await page.addStyleTag({content:'#sc-dl,#sc-ready{display:none!important}'});
await page.click('[data-action="arcade"]');await page.waitForSelector('.arcade-console');await page.waitForTimeout(2500);
const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:CPU});
// long frames, measured in the page
await page.evaluate(()=>{const w=window.__fr={gaps:[]};let last=performance.now();const f=t=>{w.gaps.push(t-last);last=t;w.raf=requestAnimationFrame(f);};w.raf=requestAnimationFrame(f);});
const events=[];cdp.on('Tracing.dataCollected',d=>events.push(...d.value));
await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame',transferMode:'ReportEvents'});
const tiles=await page.locator('.arc-tile').count();const start=await page.evaluate(()=>performance.now());
for(let k=0;k<N;k++){const i=(k+1)%tiles;await page.locator('.arc-tile').nth(i).tap().catch(()=>page.locator('.arc-tile').nth(i).click());await page.waitForTimeout(700);}
// swipes on the hero (sideways drags)
for(let k=0;k<N;k++){const y=VH*.45;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:VW*.8,y}]});
 for(let s=1;s<=8;s++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:VW*.8-s*VW*.07,y}]});await page.waitForTimeout(12);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(800);}
const gaps=await page.evaluate(()=>{cancelAnimationFrame(window.__fr.raf);return window.__fr.gaps;});
const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;
const sum=name=>events.filter(e=>e.ph==='X'&&e.name===name).reduce((a,e)=>a+(e.dur||0)/1000,0);
let area=0;for(const e of events)if(e.name==='Paint'&&e.args?.data?.clip){const c=e.args.data.clip,xs=[c[0],c[2],c[4],c[6]],ys=[c[1],c[3],c[5],c[7]],w=Math.min(VW*2,Math.max(...xs)-Math.min(...xs)),h=Math.min(VH*2,Math.max(...ys)-Math.min(...ys));if(w>0&&h>0)area+=w*h;}
const moves=N*2,screen=VW*VH*4;area=Math.min(area,1e15);
const out={moves,paintMs:+(sum('Paint')/moves).toFixed(1),rasterMs:+(sum('RasterTask')/moves).toFixed(1),styleMs:+(sum('UpdateLayoutTree')/moves).toFixed(1),layoutMs:+(sum('Layout')/moves).toFixed(1),
 decodeMs:+(sum('Decode Image')/moves+sum('ImageDecodeTask')/moves).toFixed(1),screensPainted:+(area/screen/moves).toFixed(2),
 long34:gaps.filter(g=>g>34).length,long50:gaps.filter(g=>g>50).length,frames:gaps.length,worstMs:Math.round(Math.max(...gaps))};
console.log(JSON.stringify(out));
if(process.env.BREAKDOWN){const by={};for(const e of events)if(e.name==='Paint'&&e.ph==='X'){const d=e.args?.data||{},k=(d.nodeName||'?')+' layer'+(d.layerId??'');by[k]=(by[k]||0)+(e.dur||0)/1000;}
 console.log(Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>`${v.toFixed(0).padStart(6)} ms  ${k}`).join('\n'));}
await browser.close();
