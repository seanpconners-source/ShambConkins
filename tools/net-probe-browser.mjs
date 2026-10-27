// Joins the live online rooms from real browsers (Playwright Chromium and Firefox): opens the site, then connects to a
// room several times in a row from the page, the way the game does (the second try reuses the browser's connection to
// the site, which may be HTTP/2 or HTTP/3). Prints the protocol the page came over and what each join did.
//   node tools/net-probe-browser.mjs [https://shambconkins.loki-mylo.work] [chromium,firefox]
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let pw;try{pw=require('playwright');}catch{pw=require('/node-tools/node_modules/playwright');}
const BASE=(process.argv[2]||'https://shambconkins.loki-mylo.work').replace(/\/+$/,'');
const KINDS=(process.argv[3]||'chromium,firefox').split(',');
let failed=0;
for(const kind of KINDS){
 let browser;try{browser=await pw[kind].launch();}catch(e){console.log(`skip ${kind}: ${e.message.split('\n')[0]}`);continue;}
 const page=await browser.newPage();
 await page.goto(BASE+'/version');
 const res=await page.evaluate(async base=>{
  const proto=performance.getEntriesByType('navigation')[0]?.nextHopProtocol||'?';
  const plain=await fetch('/room/probe').then(async r=>`${r.status} ${(await r.text()).slice(0,60)}`,e=>'fetch failed '+e.message);
  const join=room=>new Promise(res=>{const t0=performance.now(),ws=new WebSocket(base.replace(/^http/,'ws')+'/room/'+room);let opened=false;
   const done=r=>{res(r+` (${Math.round(performance.now()-t0)} ms)`);try{ws.close();}catch{}};
   const timer=setTimeout(()=>done('timeout'),12000);
   ws.onopen=()=>{opened=true;ws.send(JSON.stringify({t:'hello',id:'probe'+Math.random(),name:'probe',character:'sean',owner:'Sean',v:'probe'}));};
   ws.onmessage=e=>{if(e.data==='pong')return;const m=JSON.parse(e.data);if(m.t==='welcome'){clearTimeout(timer);done('welcome seat '+m.seat);}};
   ws.onclose=e=>{clearTimeout(timer);done(`closed ${e.code} ${opened?'after open':'before open'}`);};});
  const out=[];for(let i=0;i<5;i++){out.push(await join('probe-browser-'+Math.random().toString(36).slice(2,7)));await new Promise(r=>setTimeout(r,400));}
  return {proto,plain,out,ua:navigator.userAgent};},BASE);
 console.log(`${kind}: page over ${res.proto}; plain GET /room/probe → ${res.plain}`);console.log(`  ${res.ua}`);
 res.out.forEach((r,i)=>{const ok=r.startsWith('welcome');if(!ok)failed++;console.log(`${ok?'ok  ':'FAIL'} join ${i+1}: ${r}`);});
 await browser.close();
}
console.log(failed?`${failed} browser join(s) failed`:'BROWSER JOINS OK');process.exit(failed?1:0);
