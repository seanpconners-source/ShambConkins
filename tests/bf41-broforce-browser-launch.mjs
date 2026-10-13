// BF-41: real Chromium/offline-HTML mission launch, render loop and cancellation smoke.
// Run only after npm run build: node tests/bf41-broforce-browser-launch.mjs
// SHAMB_FILE and SHAMB_CHROMIUM optionally override the built file/browser executable.
// Deliberately NOT a tests/broforce-*.mjs Node-only fixture.
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium, root} from './lib.mjs';

const STAGES = new Map([
 ['broforce-jungle', 'Broforce: Jungle'],
 ['broforce-factory', 'Broforce: Factory'],
 ['broforce-city', 'Broforce: City Siege'],
 ['broforce-desert', 'Broforce: Desert Assault']
]);
const VIEWPORTS = [
 {name:'portrait', width:390, height:780},
 {name:'landscape', width:844, height:390},
 {name:'fold-unfolded', width:840, height:700}
];
const html=path.resolve(root, process.env.SHAMB_FILE || 'dist/ShambConkins.html');
const executablePath=process.env.SHAMB_CHROMIUM ||
 '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const failures=[];
let successes=0;

function isExpectedOfflineNoise(text) {
 // Existing host portrait fallbacks may probe Wikipedia from a file:// page.
 // Suppress only this specific CORS diagnostic and its generic network companion,
 // never engine errors, missing local files, or arbitrary console.error().
 return /Access to fetch at 'https:\/\/(?:en\.wikipedia\.org|commons\.wikimedia\.org)\/w\/api\.php[^']*' from origin 'null' has been blocked by CORS policy/.test(text) ||
  /^Failed to load resource: net::ERR_(?:FAILED|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|TUNNEL_CONNECTION_FAILED)$/.test(text);
}
async function snapshot(page) {
 return page.evaluate(() => {
  const game=window.ShambConkins;
  const session=game?.store?.session;
  const debug=session?.debug;
  const state=debug?.state;
  const canvas=document.querySelector('#game-layer canvas');
  const rect=canvas?.getBoundingClientRect();
  const layer=document.getElementById('game-layer');
  const display=canvas&&getComputedStyle(canvas);
  return {
   game:session?.game?.id||null,
   engine:debug?.engine||null,
   phase:debug?.phase||null,
   missionPhase:state?.phase||null,
   stageId:state?.stageId||null,
   stageTitle:state?.stage?.title||null,
   players:state?.players?.map(p=>p.owner)||null,
   tick:state?.tick??null,
   draws:canvas?window.__bf41DrawCount?.(canvas)??0:0,
   canvasVisible:!!canvas&&!layer.hidden&&display?.display!=='none'&&
    display?.visibility!=='hidden'&&!!rect&&rect.width>0&&rect.height>0 &&
    rect.right>0&&rect.bottom>0&&rect.left<innerWidth&&rect.top<innerHeight,
   canvasSize:canvas?{width:canvas.width,height:canvas.height}:null,
   rect:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,
   dialog:document.querySelector('#dialog[open] #dialog-title')?.textContent?.trim()||null,
   overlay:document.querySelector('.pass-overlay [data-ready]')?.textContent?.trim()||null,
   view:game?.store?.view||null
  };
 });
}
function assertClean(errors, where) {
 assert.deepEqual(errors, [], where+' emitted unexpected browser errors');
}
async function runAttempt(page,id,label,attempt,errors) {
 const tag=label+'/'+id+'/attempt-'+attempt;
 const previous=errors.length;
 // Important: do NOT await requestGame; it awaits real dialog and intro input.
 await page.evaluate(stageId => {
  void window.ShambConkins.requestGame({id:stageId,origin:'arcade'});
 }, id);
 const dialog=page.locator('#dialog[open]');
 await dialog.locator('button[data-dialog-choice="0"]').waitFor({timeout:10000});
 assert.equal((await dialog.locator('#dialog-title').innerText()).trim(),STAGES.get(id),
  tag+' opened the wrong game');
 const start=dialog.getByRole('button',{name:/Start game/i});
 await start.click();
 const ready=page.locator('#game-layer .pass-overlay [data-ready]');
 await ready.waitFor({timeout:12000});
 assert.match(await ready.innerText(),/Both ready.*begin/i,tag+' intro not shown');
 await ready.click(); // Actual user click; the built-in countdown takes three seconds.
 await page.waitForFunction(() => {
  const s=window.ShambConkins?.store?.session;
  const c=document.querySelector('#game-layer canvas');
  return s?.debug?.engine==='broforce' && s.debug.phase==='playing' &&
   s.debug.state?.tick>2 && c && window.__bf41DrawCount?.(c)>0;
 }, null, {timeout:12000});
 const a=await snapshot(page);
 assert.equal(a.game,id,tag+' wrong active GameSession');
 assert.equal(a.engine,'broforce',tag+' did not activate the actual engine');
 assert.equal(a.phase,'playing',tag+' is stuck at an intro/pass dialog');
 assert.equal(a.missionPhase,'active',tag+' mission is not active');
 assert.equal(a.stageId,id,tag+' wrong mission variant');
 assert.equal(a.stageTitle,STAGES.get(id),tag+' wrong stage scene');
 assert.deepEqual(a.players,['Sean','Amber'],tag+' owner identities changed');
 assert.ok(a.canvasVisible,tag+' has no visible live canvas');
 assert.ok(a.canvasSize?.width>100&&a.canvasSize?.height>100 &&
  a.rect.width>100&&a.rect.height>80,tag+' canvas is too small: '+JSON.stringify(a));
 await page.waitForTimeout(550);
 const b=await snapshot(page);
 assert.equal(b.phase,'playing',tag+' stopped before another active frame');
 assert.ok(b.tick>a.tick,tag+' simulation did not advance: '+JSON.stringify({a,b}));
 assert.ok(b.draws>a.draws,tag+' live scene was not rendered again: '+JSON.stringify({a,b}));
 assert.ok(b.canvasVisible,tag+' canvas became invisible');
 assertClean(errors.slice(previous),tag+' during launch/active play');

 // Exit through the REAL app's Exit button and confirmation, never by clearing DOM
 // or directly calling session.dispose(). A second launch must be independent.
 await page.locator('#game-layer .game-actions [data-action="exit-game"]').click();
 const confirm=page.locator('#dialog[open]');
 await confirm.getByRole('button',{name:/End challenge/i}).waitFor({timeout:5000});
 assert.match(await confirm.locator('#dialog-title').innerText(),/End this challenge/i,tag);
 await confirm.getByRole('button',{name:/End challenge/i}).click();
 await page.waitForFunction(() => {
  const s=window.ShambConkins?.store;
  return !s?.session && !s?.busy && s?.view==='arcade' &&
   document.getElementById('game-layer')?.hidden &&
   !document.getElementById('dialog')?.open;
 }, null, {timeout:7000});
 assertClean(errors.slice(previous),tag+' after cancellation/return');
 return {stageId:id,tickFrom:a.tick,tickTo:b.tick,drawsFrom:a.draws,drawsTo:b.draws};
}

async function runOne(browser,viewport,id) {
 const context=await browser.newContext({
  viewport:{width:viewport.width,height:viewport.height},
  hasTouch:true,isMobile:true
 });
 const errors=[], ignored=[];
 let page;
 try {
  // Instrument actual Canvas2D drawing without drawing anything or substituting
  // a fake engine/scene. Counters are per real DOM canvas and reset on reentry.
  await context.addInitScript(() => {
   const counts=new WeakMap();
   window.__bf41DrawCount=c=>counts.get(c)||0;
   for(const method of ['fillRect','drawImage']) {
    const original=CanvasRenderingContext2D.prototype[method];
    CanvasRenderingContext2D.prototype[method]=function(...args) {
     if(this.canvas?.id==='game-canvas')counts.set(this.canvas,(counts.get(this.canvas)||0)+1);
     return Reflect.apply(original,this,args);
    };
   }
  });
  page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{
   if(m.type()!=='error')return;
   const message=m.text();
   if(isExpectedOfflineNoise(message))ignored.push(message);
   else errors.push('console: '+message);
  });
  await page.goto(pathToFileURL(html).href,{waitUntil:'load',timeout:90000});
  await page.waitForFunction(() => Array.isArray(window.ShambConkins?.gameRegistry));
  const registered=await page.evaluate(id=>{
   const matches=window.ShambConkins.gameRegistry.filter(g=>g.id===id);
   return matches.map(g=>({title:g.title,engine:g.engine,stageId:g.stageId}));
  },id);
  assert.deepEqual(registered,[{title:STAGES.get(id),engine:'broforce',stageId:id}],
   viewport.name+'/'+id+' must be exactly one registered stage');
  assertClean(errors,viewport.name+'/'+id+' on initial page load');
  for(let attempt=1;attempt<=2;attempt++){
   const result=await runAttempt(page,id,viewport.name,attempt,errors);
   console.log('PASS '+viewport.name+' '+id+' attempt '+attempt+
    ' tick '+result.tickFrom+'->'+result.tickTo+
    ' draw '+result.drawsFrom+'->'+result.drawsTo+' returned-to-arcade');
   successes++;
  }
  if(ignored.length)console.log('INFO '+viewport.name+' '+id+
   ' known offline portrait-network noise '+ignored.length+' messages');
 } catch(error) {
  let detail=null;
  if(page&&!page.isClosed())try{detail=await snapshot(page);}catch{}
  const failure=viewport.name+' '+id+': '+String(error?.stack||error)+
   '\n  observed='+JSON.stringify(detail)+'\n  browserErrors='+JSON.stringify(errors);
  console.error('FAIL '+failure);
  failures.push(failure);
 } finally {
  await context.close();
 }
}

async function main(){
 await stat(html); // A missing/offline build is a failure, not a skipped PASS.
 await stat(executablePath); // Do not pretend to run browser tests without Chromium.
 const browser=await chromium.launch({executablePath,headless:true});
 try{
  for(const viewport of VIEWPORTS)
   for(const id of STAGES.keys())
    await runOne(browser,viewport,id);
 }finally{await browser.close();}
 console.log('BF-41 completed '+successes+'/24 live launch/reentry checks ('+
  VIEWPORTS.length+' viewports, '+STAGES.size+' distinct stages).');
 if(failures.length)throw new Error('BF-41: '+failures.length+' stage/viewport failures; see FAIL lines.');
 assert.equal(successes,24,'Every variant must launch twice in every viewport.');
}
await main().catch(error=>{console.error('BF-41 FAIL: '+String(error?.stack||error));process.exitCode=1;});
