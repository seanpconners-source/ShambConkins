/**
 * BF-59 — real offline-HTML browser visual acceptance capture (read-only production).
 * node tests/bf59-broforce-viewport-capture.mjs --file dist/ShambConkins.html --out /tmp/bf59-shots
 * Optional --encounter-seconds 90: keyboard-drive a real session on the Fold viewport,
 * capturing devil/heli frames ONLY IF those genuine phases are observed.
 * This is Chromium emulation, NEVER a claim of physical Samsung Fold testing.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const IDS=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];
const SIZES=[['portrait',390,780],['landscape',780,390],['fold',840,700],['desktop',1100,700]];
const argv=process.argv.slice(2),opt={file:process.env.SHAMB_FILE||'dist/ShambConkins.html',out:process.env.OUT||'/tmp/bf59-broforce',encounterSeconds:0};
function usage(){console.log('Usage: node tests/bf59-broforce-viewport-capture.mjs [--file PATH] [--out DIR] [--encounter-seconds N] [--help]');}
for(let i=0;i<argv.length;i++){
 const a=argv[i];if(a==='--help'){usage();process.exit(0);}
 if(!['--file','--out','--encounter-seconds'].includes(a)||i+1>=argv.length)throw Error('Unknown/missing option: '+a);
 opt[a.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=argv[++i];
}
opt.encounterSeconds=Number(opt.encounterSeconds);
if(!Number.isFinite(opt.encounterSeconds)||opt.encounterSeconds<0||opt.encounterSeconds>300)throw Error('Encounter seconds must be 0..300');
const html=path.resolve(root,opt.file),out=path.resolve(opt.out);
if(!fs.existsSync(html)||!fs.statSync(html).isFile()||fs.statSync(html).size<32768){
 console.error('UNAVAILABLE: actual built offline HTML is missing/suspiciously small: '+html);
 process.exit(2);
}
let chromium;
try{const req=createRequire('/node-tools/node_modules/');chromium=req('playwright').chromium;}
catch {try{chromium=(await import('playwright')).chromium;}catch(e){console.error('UNAVAILABLE: Playwright not installed: '+e.message);process.exit(2);}}
const exe=[process.env.CHROMIUM_PATH,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','/usr/bin/chromium'].find(p=>p&&fs.existsSync(p));
const browser=await chromium.launch({headless:true,...(exe?{executablePath:exe}:{})});
fs.mkdirSync(out,{recursive:true});
const results=[],issues=[],saved=[];
const report=(tag,ok,details)=>{results.push({tag,ok,details});if(!ok)issues.push({tag,details});console.log((ok?'PASS ':'FAIL ')+tag+(details?' — '+JSON.stringify(details).slice(0,500):''));};
function requireTrue(v,msg){if(!v)throw Error(msg);}
const url='file://'+html;
async function capture(page,id,size,phase){
 const name=`${id}__${size}__${phase}.png`,file=path.join(out,name);
 await page.screenshot({path:file,fullPage:false,animations:'disabled'});
 requireTrue(fs.existsSync(file)&&fs.statSync(file).size>1500,'missing/empty capture '+name);
 saved.push(name);
}
async function status(page){return page.evaluate(()=>{
 const game=window.ShambConkins?.store?.session;
 const s=game?.debug?.state;const c=document.querySelector('#game-layer canvas');
 const d=c?.getBoundingClientRect(),getRect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
 const actions=[...document.querySelectorAll('.game-shell .game-actions button')].map(el=>{
  const r=getRect(el),x=r.x+r.w/2,y=r.y+r.h/2,top=document.elementFromPoint(x,y);
  return {label:el.textContent.trim(),...r,visible:!!el.getClientRects().length,hit:el===top||el.contains(top),disabled:el.disabled};
 });
 const zones=[...document.querySelectorAll('.bf18-side')].map(el=>({label:el.getAttribute('aria-label'),rect:getRect(el),stick:el.querySelector('.bf18-stick')&&getRect(el.querySelector('.bf18-stick')),buttons:[...el.querySelectorAll('.bf18-action')].map(b=>({kind:b.title,rect:getRect(b),pressed:b.getAttribute('aria-pressed')}))}));
 const probe=document.createElement('div');probe.style.cssText='position:fixed;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);visibility:hidden';document.body.appendChild(probe);const css=getComputedStyle(probe);const safe=[css.paddingTop,css.paddingRight,css.paddingBottom,css.paddingLeft].map(v=>parseFloat(v)||0);probe.remove();
 let paint=null;if(c){try{const g=c.getContext('2d',{willReadFrequently:true});const pts=[[.2,.25],[.5,.5],[.8,.7],[.35,.8]].map(([x,y])=>Array.from(g.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data));paint={samples:pts,distinct:new Set(pts.map(p=>p.join(','))).size};}catch(e){paint={error:String(e)};}}
 return {game:game?.game?.id||null,debugEngine:game?.debug?.engine||null,phase:game?.debug?.phase||null,paused:!!game?.paused,canvas:c?{attrW:c.width,attrH:c.height,rect:getRect(c)}:null,paint,actions,zones,viewport:{w:innerWidth,h:innerHeight,visualW:visualViewport?.width??innerWidth,visualH:visualViewport?.height??innerHeight,safe},focus:document.activeElement?.tagName,dialogOpen:!!document.querySelector('#dialog[open]'),bossVisible:!!s?.devil?.active,bossDefeated:s?.bossDefeated===true,heliPresent:!!s?.extraction&&JSON.stringify(s.extraction).length>5};
 });}
async function clickNamed(page,name){const b=page.locator('.game-shell .game-actions button').filter({hasText:name});await b.first().click({timeout:3000});}
async function startGame(page,id){
 await page.evaluate(id=>{void window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.getByRole('button',{name:'Start game',exact:true}).click({timeout:7000});
 await page.locator('#game-canvas').waitFor({state:'visible',timeout:10000});
 await page.locator('.pass-overlay [data-ready]').waitFor({timeout:8000});
 await page.locator('.pass-overlay [data-ready]').click();
 await page.locator('.pass-overlay').waitFor({state:'detached',timeout:9000});
 await page.waitForTimeout(250);
}
async function measure(page){return page.evaluate(()=>new Promise(resolve=>{
 const stamps=[];let end=performance.now()+1400;function tick(t){stamps.push(t);if(t<end)requestAnimationFrame(tick);else{
 const diffs=stamps.slice(1).map((v,i)=>v-stamps[i]).sort((a,b)=>a-b),p95=diffs[Math.min(diffs.length-1,Math.floor(diffs.length*.95))]||null;
 resolve({frames:stamps.length,approxFPS:Math.round((stamps.length-1)*1000/(stamps.at(-1)-stamps[0])),p95FrameMs:p95,over50ms:diffs.filter(d=>d>50).length,maxFrameMs:diffs.at(-1)||null});}}
 requestAnimationFrame(tick);
}));}
async function encounter(page,id,size,seconds){
 const seen=new Set(),end=Date.now()+seconds*1000;
 while(Date.now()<end){
  const s=await status(page);
  for(const [label,flag] of [['devil',s.bossVisible],['helicopter',s.heliPresent&&s.bossDefeated]]){
   if(flag&&!seen.has(label)){await capture(page,id,size,label);seen.add(label);}
  }
  if(!s.game||s.phase!=='playing')break;
  // Drives the *real* registered engine, with no state injection and no fake boss trigger.
  await page.keyboard.down('d');await page.keyboard.down('ArrowRight');await page.keyboard.down('Space');await page.keyboard.down('Enter');
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');await page.keyboard.up('Enter');await page.keyboard.up('d');await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(150);
 }
 report(`${id}/${size}/boss+heli observational coverage`,seen.has('devil')&&seen.has('helicopter'),{observed:[...seen],note:'No state injection; absence is NOT a silhouette pass'});
}
try{
 const probe=await browser.newPage();await probe.goto(url,{waitUntil:'load',timeout:30000});
 await probe.waitForFunction(()=>Array.isArray(window.ShambConkins?.gameRegistry),{timeout:15000});
 const registered=await probe.evaluate(()=>window.ShambConkins.gameRegistry.filter(g=>g.engine==='broforce').map(g=>({id:g.id,stageId:g.stageId,title:g.title})));
 requireTrue(registered.length===4&&IDS.every(id=>registered.some(g=>g.id===id&&g.stageId===id)),'Four distinct registered matching stages required: '+JSON.stringify(registered));
 report('registry/four independent stages',true,registered);
 await probe.close();
 for(const [size,w,h] of SIZES){
  for(const id of IDS){
   const tag=id+'/'+size,context=await browser.newContext({viewport:{width:w,height:h},hasTouch:size!=='desktop',isMobile:size!=='desktop',deviceScaleFactor:1});
   const page=await context.newPage(),runtimeErrors=[];
   page.on('pageerror',e=>runtimeErrors.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&!/ERR_INTERNET|ERR_NAME_NOT_RESOLVED|ERR_FILE_NOT_FOUND|wikipedia\.org|wikimedia\.org|Failed to load resource/i.test(m.text()))runtimeErrors.push('console: '+m.text());});
   try{
    await page.goto(url,{waitUntil:'load',timeout:30000});
    await page.waitForFunction(()=>Array.isArray(window.ShambConkins?.gameRegistry),{timeout:15000});
    await startGame(page,id);
    let s=await status(page);
    requireTrue(s.game===id&&s.debugEngine==='broforce'&&s.phase==='playing','real Broforce mission not playing: '+JSON.stringify({game:s.game,engine:s.debugEngine,phase:s.phase}));
    requireTrue(s.canvas&&s.canvas.attrW>100&&s.canvas.attrH>100&&s.canvas.rect.w>100&&s.canvas.rect.h>100,'no sizeable real canvas');
    requireTrue(s.paint?.distinct>=2,'canvas samples appear blank/unvarying: '+JSON.stringify(s.paint));
    requireTrue(s.zones.length===2&&s.zones.every(z=>z.buttons.length===3),'both owners need stick + three actions');
    requireTrue(s.zones[0].rect.x<s.zones[1].rect.x,'player zones must have distinct left/right ownership');
    requireTrue(s.actions.length>=3&&['Pause','Exit','Help'].every(n=>s.actions.some(a=>a.label===n&&a.visible&&a.hit&&a.w>=44&&a.h>=44)),'Pause/Exit/Help unreachable or below 44 CSS px: '+JSON.stringify(s.actions));
    const bb=s.zones.flatMap(z=>z.buttons.map(b=>b.rect));
    requireTrue(bb.every(b=>b.w>=44&&b.h>=44&&b.x>=0&&b.y>=0&&b.x+b.w<=w+1&&b.y+b.h<=h+1),'touch action too small/clipped: '+JSON.stringify(bb));
    await capture(page,id,size,'playing');
    const perf=await measure(page);
    await clickNamed(page,'Pause');await page.locator('.pass-overlay [data-ready]').waitFor({timeout:4000});
    requireTrue((await status(page)).paused,'Pause did not pause session');
    await capture(page,id,size,'pause');
    await page.locator('.pass-overlay [data-ready]').click();await page.locator('.pass-overlay').waitFor({state:'detached',timeout:4000});
    await clickNamed(page,'Help');await page.locator('.pass-overlay [data-ready]').waitFor({timeout:4000});
    requireTrue((await page.locator('.pass-overlay').innerText()).includes('helicopter'),'Help did not present extraction instructions');
    await capture(page,id,size,'help');await page.locator('.pass-overlay [data-ready]').click();await page.locator('.pass-overlay').waitFor({state:'detached',timeout:4000});
    if(size==='fold'){
     // Actual viewport reflow of the running session (not a new stage or a screenshot mock).
     await page.setViewportSize({width:780,height:390});await page.waitForTimeout(200);
     const rotate=await status(page);
     requireTrue(rotate.game===id&&rotate.canvas?.attrW>=100&&rotate.canvas.rect.w<=780+1,'rotate/reflow dropped mission or canvas');
     await capture(page,id,size,'rotated-landscape');
     await page.setViewportSize({width:840,height:700});await page.waitForTimeout(200);
     requireTrue((await status(page)).game===id,'re-entry to Fold viewport dropped mission');
     await capture(page,id,size,'rotated-back');
    }
    if(size==='fold'&&opt.encounterSeconds)await encounter(page,id,size,opt.encounterSeconds);
    const beforeExit=await status(page);
    if(beforeExit.game){
     await clickNamed(page,'Exit');await page.getByRole('button',{name:'End challenge',exact:true}).waitFor({timeout:5000});
     await capture(page,id,size,'exit-confirm');
     await page.getByRole('button',{name:'End challenge',exact:true}).click();
     await page.waitForFunction(()=>!document.querySelector('#game-layer canvas'),{timeout:6000});
     requireTrue(!(await status(page)).game,'exit did not dispose session');
    }
    // Relaunch without modifying profile directly: stale canvas or controls must not survive.
    await startGame(page,id);
    requireTrue((await page.locator('.bf18-side').count())===2,'reentry has duplicated/missing controls');
    await capture(page,id,size,'reentry');
    report(tag,true,{canvas:s.canvas,actions:s.actions,zones:s.zones,safe:s.viewport.safe,paint:s.paint,perf,focus:s.focus,visualViewport:[s.viewport.visualW,s.viewport.visualH],runtimeErrors});
    if(runtimeErrors.length)report(tag+'/console',false,runtimeErrors);
   }catch(e){report(tag,false,{error:String(e?.stack||e).slice(0,1000),runtimeErrors});
    await page.screenshot({path:path.join(out,`${id}__${size}__failure.png`)}).catch(()=>{});
   }finally{await context.close();}
  }
 }
} catch(e){report('setup/fatal',false,String(e?.stack||e));}
finally{
 await browser.close();
 const summary={sourceHtml:html,generatedAt:new Date().toISOString(),headlessChromium:true,physicalAndroidTested:false,results,issues,captures:saved};
 fs.writeFileSync(path.join(out,'bf59-report.json'),JSON.stringify(summary,null,2)+'\n');
 console.log('Screenshots verified on disk: '+saved.length+'; report '+path.join(out,'bf59-report.json'));
}
process.exitCode=issues.length?1:0;
