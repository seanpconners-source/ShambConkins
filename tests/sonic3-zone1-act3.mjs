// ZONE 1 ACT 3 in the browser (game id sonic3-zone1-act3): opens it, checks the act song (Angel Island Act 1), screenshots the
// set pieces at phone, open-Fold and landscape sizes (SHAMB_SHOTS_DIR, z3-*.png), then on the phone lets the autopilot fight
// THE BOSS (Robotnik song, 8 hits, pilot freed) and hop on the capsule (tally says ACT 3). Also plays a bit as the echidna
// (glide) and with the CPU fox following. The whole act is bot-tested headless by tests/s3-zone1-act3.mjs.
// SHAMB_URL = a served --pwa build.
import {open} from './lib.mjs';
const SHOTS=process.env.SHAMB_SHOTS_DIR||'/tmp';
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
const ready=(page,pick)=>page.evaluate(pick=>{const d=window.ShambConkins.store.session?.debug;if(d?.intro&&/title|select/.test(d.intro().phase))d.skipIntro(pick);for(const b of document.querySelectorAll('#dialog[open] button, .pass-overlay button, .pass-card button'))if(/ready|start|play/i.test(b.textContent)){b.click();return true;}return false;},pick);
const G=1500,SPOTS=[['start',300,G-19],['downhill',1400,G+20],['loop1',2300,G+141],['tube-hill',4000,G-259],['lake',5300,G-19],['lake-bed',5300,G+241],['cliff',6200,G-19],['treetops',7100,G-439],['pit',7900,G-219],['loop2',9700,G-19],['arena',10900,G-19]];
async function start(w,h,pick=0){const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.evaluate(()=>{const st=window.ShambConkins.store.profile.settings;st.music=true;st.sound=true;});
 await page.evaluate(()=>{void window.ShambConkins.requestGame({id:'sonic3-zone1-act3',origin:'arcade',solo:true,quick:true});});
 let up=false;for(let k=0;k<40&&!up;k++){await page.waitForTimeout(300);await ready(page,pick);up=await page.evaluate(()=>window.ShambConkins.store.session?.debug?.state?.phase==='card');}
 return {browser,page,errors,up};}
for(const [w,h,tag] of [[390,780,'phone'],[752,835,'fold'],[844,390,'land']]){
 const {browser,page,errors,up}=await start(w,h);
 check(up,`${tag}: the act opens on its title card`);await page.waitForTimeout(600);await page.screenshot({path:`${SHOTS}/z3-${tag}-card.png`});
 await page.evaluate(()=>window.ShambConkins.store.session.debug.skipCard());
 if(tag==='phone'){await page.waitForTimeout(1500);const m=await page.evaluate(()=>window.ShambConkins.store.session.debug.music());
  check(JSON.stringify(m).includes('angel-island-1'),`phone: the act song is Angel Island Act 1 (${JSON.stringify(m)})`);}
 for(const [name,x,y] of SPOTS){await page.evaluate(([x,y])=>{const d=window.ShambConkins.store.session.debug;d.rings(5);d.teleport(x,y);},[x,y]);await page.waitForTimeout(650);await page.screenshot({path:`${SHOTS}/z3-${tag}-${name}.png`});}
 const st=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;return {chunks:d.chunks(),phase:d.state.phase,k:d.state.cam.k,vw:d.state.cam.vw};});
 check(st.chunks>4&&st.phase==='play',`${tag}: terrain drawn (${st.chunks} chunks), still playing; camera ${st.k.toFixed(2)} px/world px, ${Math.round(st.vw)} world px wide`);
 if(tag==='phone'){
  await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.rings(30);d.teleport(10420,1481);d.autopilot();});
  let started=false;for(let k=0;k<30&&!started;k++){await page.waitForTimeout(300);started=await page.evaluate(()=>!!window.ShambConkins.store.session.debug.boss?.fight);}
  check(started,'phone: walking into the arena starts the boss');
  const song=await page.evaluate(()=>window.ShambConkins.store.session.debug.music());check(JSON.stringify(song).includes('boss'),`phone: the boss song plays (${JSON.stringify(song)})`);
  let b=null,shots=new Set();for(let k=0;k<200;k++){await page.waitForTimeout(500);b=await page.evaluate(()=>window.ShambConkins.store.session.debug.boss);
   if(b&&['swing','tired'].includes(b.state)&&!shots.has(b.state)){shots.add(b.state);await page.screenshot({path:`${SHOTS}/z3-${tag}-boss-${b.state}.png`});}if(b?.done)break;}
  check(b?.done,`phone: the autopilot beats the boss (${JSON.stringify(b)})`);
  if(b?.pilot)check(b.freed[0].includes(b.pilot),`phone: its pilot ${b.pilot} is freed`);
  let got=false;for(let k=0;k<50&&!got;k++){await page.waitForTimeout(500);got=await page.evaluate(()=>!!window.ShambConkins.store.session?.debug.state.tally);}
  check(got,'phone: hopping on the capsule clears the act (tally)');await page.waitForTimeout(1200);await page.screenshot({path:`${SHOTS}/z3-${tag}-tally.png`});}
 check(!errors.length,`${tag}: no page errors${errors.length?': '+errors[0]:''}`);
 await browser.close();}
// the echidna gliding, and the hedgehog with the CPU fox following
{const {browser,page,errors,up}=await start(390,780,2);check(up,'echidna: the act opens');
 await page.evaluate(()=>window.ShambConkins.store.session.debug.skipCard());
 const body=await page.evaluate(()=>window.ShambConkins.store.session.debug.body);check(body==='knux',`echidna: running as the echidna (${body})`);
 await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(6500,1281);let n=0;d.bot=p=>{n++;return {l:false,r:true,u:false,d:false,jump:true,press:n===40||n===54};};});
 let glided=false;for(let k=0;k<60&&!glided;k++){await page.waitForTimeout(100);glided=await page.evaluate(()=>!!window.ShambConkins.store.session.debug.state.p.glide);}
 check(glided,'echidna: a second jump press glides');await page.waitForTimeout(300);await page.screenshot({path:`${SHOTS}/z3-knux-glide.png`});
 check(!errors.length,`echidna: no page errors${errors.length?': '+errors[0]:''}`);await browser.close();}
{const {browser,page,errors,up}=await start(390,780,4);check(up,'pair: the act opens');
 await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.skipCard();d.autopilot();});
 await page.waitForTimeout(6000);const r=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug,p=d.state.p,b=d.buddy;return b?{px:p.x,bx:b.x,by:b.y,py:p.y,fly:!!b.flyIn}:null;});
 check(r&&Math.hypot(r.px-r.bx,r.py-r.by)<500,`pair: the CPU fox keeps up (${JSON.stringify(r)})`);await page.screenshot({path:`${SHOTS}/z3-pair.png`});
 check(!errors.length,`pair: no page errors${errors.length?': '+errors[0]:''}`);await browser.close();}
console.log(bad?`${bad} FAILED`:'zone 1 act 3 (browser) ok');process.exit(bad?1:0);
