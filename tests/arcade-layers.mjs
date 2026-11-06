// Graphics memory while flicking fast through the Arcade (owner's video, Nov 5: tapping quickly blanked the whole screen for a
// few frames on his phone = Chrome ran out of GPU memory for the stacked full-screen layers). Taps a tile every GAP ms (default
// 150) for N taps and records, from Chrome's layer tree, the peak number of composited layers and the peak total layer area in
// full screens (each full screen at the phone's pixel density is ~5 MB of GPU memory). Fails if the peak passes MAX_SCREENS.
// SWIPE=1 swipes sideways across the game page instead of tapping tiles (each swipe prepares the next game's picture too).
// Usage: SHAMB_URL=http://localhost:8123/ node tests/arcade-layers.mjs   (N=12 GAP=150 VIEW=412x458 DPR=2.625 MAX_SCREENS=16 SWIPE=1)
import {launchBrowser,appURL} from './lib.mjs';
const URL0=(await appURL()),N=+process.env.N||12,GAP=+process.env.GAP||150,[VW,VH]=(process.env.VIEW||'412x458').split('x').map(Number),DPR=+process.env.DPR||2.625,MAX=+process.env.MAX_SCREENS||16;
const browser=await launchBrowser();const page=await (await browser.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:DPR,isMobile:true,hasTouch:true})).newPage();
await page.goto(URL0,{timeout:180000});await page.waitForSelector('.title-screen',{timeout:120000});await page.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:120000});
await page.addStyleTag({content:'#sc-dl,#sc-ready{display:none!important}'});
await page.click('[data-action="arcade"]');await page.waitForSelector('.arcade-console');await page.waitForTimeout(2500);
const cdp=await page.context().newCDPSession(page);await cdp.send('LayerTree.enable');
let peakN=0,peakA=0,last=null;const screen=VW*VH;
cdp.on('LayerTree.layerTreeDidChange',({layers})=>{if(!layers)return;const draws=layers.filter(l=>l.drawsContent);const a=draws.reduce((s,l)=>s+Math.min(l.width*l.height,screen*4),0)/screen;
 if(draws.length>peakN)peakN=draws.length;if(a>peakA){peakA=a;last=draws.filter(l=>l.width*l.height>screen*.5).map(l=>`${l.width}x${l.height}`);}});
const tiles=await page.locator('.arc-tile').count();
if(process.env.SWIPE){const y=VH*.45;for(let k=0;k<N;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:VW*.8,y}]});
 for(let s=1;s<=8;s++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:VW*.8-s*VW*.075,y}]});await page.waitForTimeout(16);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(GAP);}}
else for(let k=0;k<N;k++){await page.locator('.arc-tile').nth((k+1)%tiles).click({force:true,noWaitAfter:true}).catch(()=>{});await page.waitForTimeout(GAP);}
await page.waitForTimeout(1200);
const settled=await cdp.send('LayerTree.compositingReasons',{layerId:'0'}).catch(()=>null);void settled;
const after=await page.evaluate(()=>({keySlots:document.querySelectorAll('.arc-keyart>*').length,keyImgs:document.querySelectorAll('.arc-keyart img').length,heroLayers:document.querySelectorAll('.arc-hero-art>*').length}));
console.log(JSON.stringify({taps:N,gapMs:GAP,peakLayers:peakN,peakScreens:+peakA.toFixed(2),bigLayersAtPeak:last,after}));
await browser.close();process.exit(peakA>MAX?1:0);
