// Super Mario Bros. real-game pieces + pipe fixes (Nov 21): a side pipe only takes you in at its mouth (1-2's exit pipe
// used to grab anyone walking right in the Warp Zone), coin rooms drop you inside (not onto their ceiling), springboards,
// Bill Blasters, Hammer Bros, lava bubbles, fish leaping over bridges, Paratroopas, Buzzy Beetles (fireproof), balance
// and falling lifts, castle mazes that loop you back, and every Worlds 4-8 stage has its style's pieces.
// Screenshots to $OUT (default /tmp/claude-0/sc/smbp-*). Usage: node tests/mario-pieces.mjs
import {chromium,browserLaunchOptions,appURL} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);},pass=m=>console.log('  ok  ',m);
const browser=await chromium.launch(browserLaunchOptions()),page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(await appURL(),{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});await page.waitForTimeout(400);
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'smb-world-1',origin:'arcade'});});await page.waitForTimeout(400);
await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());await page.waitForTimeout(900);
const dbg=(fn,arg)=>page.evaluate(([fn,arg])=>{const d=window.ShambConkins.store.session.debug;return new Function('d','arg',fn)(d,arg);},[fn,arg]);
const shot=n=>page.screenshot({path:`${out}/smbp-${n}.png`});
const until=async(fn,ms=8000)=>{const t0=Date.now();let v;while(Date.now()-t0<ms){v=await dbg(fn);if(v)return v;await page.waitForTimeout(100);}return v;};
const ready=async()=>{for(let i=0;i<40;i++){if(await page.evaluate(()=>!!document.querySelector('.pass-overlay [data-ready]')))break;await page.waitForTimeout(120);}await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());};
await dbg('d.start(0,1);');await ready();await until('if(d.phase==="card")d.skipCard();return d.phase==="play";');
// go to a stage + column; keep (or clear) the enemies; the runner big, safe and with time on the clock
const go=async(stage,col,{keep=false,row=13}={})=>{await dbg(`d.teleport(0,${col}*16+8,${stage});const w=d.worlds[0],p=d.pl[0];if(!${keep})for(const a of Object.values(w.areas))a.enemies.forEach(e=>{e.alive=false;});p.time=400;p.inv=99999;`);
 if(row!==13)await dbg(`const p=d.pl[0];p.y=${row}*16;p.prevY=p.y;p.vy=0;p.grounded=true;`);await page.waitForTimeout(150);};
const find=(stage,fn)=>dbg(`const A=d.STAGES[${stage}].areas.main;return (${fn})(A);`);
const hold=async(k,ms)=>{await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);};

// ---- 1-2: walking right through the Warp Zone no longer drops you into the exit pipe
{await go(1,150);await dbg('const p=d.pl[0];p.inv=99999;');await hold('d',1600);const v=await dbg('const p=d.pl[0];return {a:p.area,x:Math.round(p.x/16),pipe:!!p.pipe};');
 if(v.a!=='main'||v.pipe)fail('1-2 Warp Zone walk ended in '+JSON.stringify(v));else pass('walked the 1-2 Warp Zone to column '+v.x+' without being pulled into the exit pipe');}
// ---- 3-1: down the coin-room pipe you land inside the room, then out through its side pipe
{const pc=await find(8,"A=>A.doors.find(d=>d.to&&d.to.area==='bonus').c");await go(8,pc);await dbg(`const p=d.pl[0];p.x=${pc+1}*16;p.y=(13-2)*16;p.prevY=p.y;p.grounded=true;p.vx=0;`);
 await hold('s',500);await until('return d.pl[0].area==="bonus"&&d.pl[0].grounded;',4000);await shot('coinroom');
 const v=await dbg('const p=d.pl[0];return {a:p.area,y:p.y/16,g:p.grounded};');
 if(v.a!=='bonus'||v.y<4)fail('coin room drop landed at '+JSON.stringify(v));else pass('dropped into the 3-1 coin room, standing at row '+v.y);
 await page.keyboard.down('d');const back=await until('return d.pl[0].area==="main"&&!d.pl[0].pipe;',8000);await page.keyboard.up('d');
 if(!back)fail('could not walk out of the coin room');else pass('walked out through the side pipe');}
// ---- springboard (2-1): hold jump on landing and you're thrown far above the billboard wall
{await go(4,14);await dbg('const p=d.pl[0];p.x=17*16+8;p.y=9*16;p.prevY=p.y;p.grounded=false;p.vy=1;p.vx=0;');await page.keyboard.down('w');
 let minY=999;for(let k=0;k<20;k++){minY=Math.min(minY,await dbg('return d.pl[0].y/16;'));await page.waitForTimeout(60);}await page.keyboard.up('w');
 if(!(minY<4))fail('spring did not throw high: lowest row '+minY.toFixed(1));else pass('springboard bounce up to row '+minY.toFixed(1));}
// ---- Bill Blaster (2-1 at 68) fires
{await go(4,58,{keep:true});const v=await until('return d.worlds[0].areas.main.enemies.some(e=>e.type==="bullet"&&e.alive);',7000);await shot('bullet');
 if(!v)fail('the Bill Blaster never fired');else pass('Bullet Bill fired');}
// ---- fish leap over the 3-1 bridges
{await go(8,40,{keep:true});const v=await until('return d.worlds[0].areas.main.enemies.some(e=>e.type==="leaper"&&e.alive);',6000);await page.waitForTimeout(500);await shot('cheeps');
 if(!v)fail('no fish leapt over the bridge');else pass('fish leap over the 3-1 bridge');}
// ---- every Worlds 4-8 stage has its style's pieces; collect where things are for the next checks
const census=await dbg(`return d.STAGES.slice(12).map(st=>{const A=st.areas.main;const n=t=>A.enemies.filter(e=>e.type===t).length;return {name:st.name,springs:(A.springs||[]).length,cannons:(A.cannons||[]).length,hammer:n('hammerBro'),para:n('para'),buzzy:n('buzzy'),pod:n('podoboo'),cheep:(A.cheepZones||[]).length,bal:A.lifts.filter(l=>l.kind==='bal').length,fall:A.lifts.filter(l=>l.kind==='fall').length,loops:(A.loops||[]).length};});`);
for(const c of census){const tags=Object.entries(c).filter(([k,v])=>k!=='name'&&v>0).map(([k,v])=>k+v).join(' ');if(!tags)fail(c.name+' has none of the new pieces');console.log('       ',c.name,tags);}
// ---- Hammer Bros throw hammers
{const si=census.findIndex(c=>c.hammer>0)+12,hc=await find(si,"A=>A.enemies.find(e=>e.type==='hammerBro').x/16");await go(si,Math.max(4,Math.floor(hc)-7),{keep:true});
 const v=await until('return d.worlds[0].flames.some(f=>f.look==="hammer");',6000);await shot('hammer');if(!v)fail('no Hammer Bro hammer in '+census[si-12].name);else pass('Hammer Bro throws hammers ('+census[si-12].name+')');}
// ---- lava bubbles leap
{const si=census.findIndex(c=>c.pod>2)+12,pc=await find(si,"A=>A.enemies.find(e=>e.type==='podoboo').x/16");await go(si,Math.max(3,Math.floor(pc)-6),{keep:true,row:10});
 const v=await until('return d.worlds[0].areas.main.enemies.some(e=>e.type==="podoboo"&&e.state==="up"&&e.y<e.home);',7000);await shot('podoboo');if(!v)fail('no lava bubble jumped');else pass('lava bubble jumps ('+census[si-12].name+')');}
// ---- balance lifts: weight one down, the other comes up
{const si=census.findIndex(c=>c.bal>0)+12;await go(si,10);const v=await dbg(`const a=d.worlds[0].areas.main,l=a.lifts.find(l=>l.kind==='bal'),m=a.lifts[l.mate],p=d.pl[0];Object.assign(p,{x:l.x,y:l.y-1,prevY:l.y-3,vy:1,grounded:false});d.cams[0].x=Math.max(0,l.x-200);return {ly:l.y,my:m.y};`);
 await page.waitForTimeout(1200);const w=await dbg(`const a=d.worlds[0].areas.main,l=a.lifts.find(l=>l.kind==='bal'),m=a.lifts[l.mate];return {ly:l.y,my:m.y,ride:d.pl[0].ride===l};`);await shot('balance');
 if(!(w.ly>v.ly&&w.my<v.my))fail('balance lift did not move '+JSON.stringify([v,w]));else pass(`balance lifts: ${v.ly}→${w.ly} down, partner ${v.my}→${w.my} up`);}
// ---- falling lifts drop under you
{const si=census.findIndex(c=>c.fall>0)+12;await go(si,10);const v=await dbg(`const a=d.worlds[0].areas.main,l=a.lifts.find(l=>l.kind==='fall'),p=d.pl[0];Object.assign(p,{x:l.x,y:l.y-1,prevY:l.y-3,vy:1,grounded:false});d.cams[0].x=Math.max(0,l.x-200);return l.y;`);
 await page.waitForTimeout(800);const w=await dbg(`return d.worlds[0].areas.main.lifts.find(l=>l.kind==='fall').y;`);if(!(w>v+4))fail('falling lift did not fall '+v+'→'+w);else pass('falling lift drops '+v+'→'+Math.round(w));}
// ---- castle maze: the wrong level loops you back, the right one lets you through
{const si=census.findIndex(c=>c.loops>0)+12,lp=await find(si,"A=>A.loops[0]");const gate=lp.x/16,wrongRow=lp.r0===3?9:5,rightRow=lp.r0===3?5:9;
 const tryRow=async row=>{await go(si,gate-3);await dbg(`const p=d.pl[0];p.x=${gate-2}*16;p.y=${row+1}*16;p.prevY=p.y;p.grounded=true;p.vy=0;d.cams[0].x=Math.max(0,p.x-200);`);await hold('d',1500);return dbg('return d.pl[0].x/16;');};
 const xw=await tryRow(wrongRow);await shot('maze');const xr=await tryRow(rightRow);
 if(!(xw<gate-8))fail(`wrong maze level did not loop back (at ${xw.toFixed(1)}, gate ${gate})`);else pass(`${census[si-12].name} maze: wrong level looped back to ${xw.toFixed(1)}`);
 if(!(xr>gate))fail(`right maze level did not pass the gate (at ${xr.toFixed(1)})`);else pass('right level goes on to '+xr.toFixed(1));}
// ---- Paratroopas bounce; a Buzzy Beetle shrugs off fireballs
{const si=census.findIndex(c=>c.para>0)+12,pc=await find(si,"A=>A.enemies.find(e=>e.type==='para').x/16");await go(si,Math.max(3,Math.floor(pc)-10),{keep:true});
 const v=await until('return d.worlds[0].areas.main.enemies.some(e=>e.type==="para"&&e.active&&e.vy<-1);',6000);if(!v)fail('Paratroopa never hopped');else pass('Paratroopas bounce');}
{const si=census.findIndex(c=>c.buzzy>0)+12,bc=await find(si,"A=>A.enemies.find(e=>e.type==='buzzy').x/16");await go(si,Math.max(3,Math.floor(bc)-5),{keep:true});
 await dbg('const p=d.pl[0];p.big=true;p.fire=true;');for(let k=0;k<6;k++){await page.keyboard.down(' ');await page.waitForTimeout(60);await page.keyboard.up(' ');await page.waitForTimeout(200);}
 const alive=await dbg(`return d.worlds[0].areas.main.enemies.filter(e=>e.type==='buzzy'&&e.alive&&e.state!=='dying').length;`);const tot=census[si-12].buzzy;
 if(alive<tot)fail(`fireballs killed a Buzzy Beetle (${alive}/${tot} left)`);else pass('Buzzy Beetles are fireproof');}
// ---- World 4's beanstalk leads to the ski run: skis on, grind a rail, a trick in the air, then back down into 4-1
{await go(12,20);await dbg(`d.enter(0,d.STAGES[12].areas.main.vineTo);`);await page.waitForTimeout(300);
 const v=await dbg('const p=d.pl[0];return {a:p.area,skis:p.skis,run:!!d.worlds[0].areas.cloud.def.skiRun};');
 if(v.a!=='cloud'||!v.skis||!v.run)fail('ski run entry '+JSON.stringify(v));else pass('beanstalk in 4-1 leads to the ski run, skis on');
 await dbg(`const p=d.pl[0],l=d.worlds[0].areas.cloud.lifts.find(l=>l.kind==='rail');Object.assign(p,{x:l.x-l.w/2+10,y:l.y-2,prevY:l.y-4,vy:1,vx:2,grounded:false,facing:1});d.cams[0].x=Math.max(0,p.x-150);`);
 await page.keyboard.down('d');await page.waitForTimeout(500);const g=await dbg('const p=d.pl[0];return {grind:p.grindT,ride:p.ride?.kind};');await shot('grind');
 if(!(g.grind>5))fail('no grinding on the rail '+JSON.stringify(g));else pass('grinding the rail ('+g.grind+' frames)');
 await dbg('const p=d.pl[0];p.ride=null;p.grounded=false;p.vy=-4;p.y-=20;');await page.keyboard.press(' ');await page.waitForTimeout(80);await page.keyboard.press(' ');
 const tr=await dbg('return d.pl[0].tricks;');await page.waitForTimeout(1500);const sc=await dbg('return d.pl[0].tricks;');
 if(!(tr>=1&&!sc))fail(`trick not paid out (${tr} → ${sc})`);else pass(`trick x${tr} landed`);
 const back=await until('const p=d.pl[0];if(p.area==="cloud"){p.x=Math.max(p.x,143*16);}return p.area==="main";',9000);await page.keyboard.up('d');
 if(!back)fail('the ski run did not drop back into 4-1');else pass('off the bottom of the ski run back into 4-1');}
if(errors.length)fail('page errors: '+errors.slice(0,3).join(' | '));
console.log(ok?'mario pieces OK':'mario pieces FAILED');await browser.close();process.exit(ok?0:1);
