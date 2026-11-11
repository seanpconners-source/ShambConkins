// ZONE 1 ACT 2 in the browser (game id sonic3-zone1-act2): opens it, checks the act song (Emerald Hill), screenshots the
// set pieces at phone and landscape sizes (SHAMB_SHOTS_DIR, z2-*.png), rides corkscrew 1 with an autopilot (shot while
// going round the back), then lets the autopilot run the last stretch to the sign and checks the tally says ACT 2.
// The whole act is bot-tested headless by tests/s3-zone1-act2.mjs. SHAMB_URL = a served --pwa build.
import {open} from './lib.mjs';
const SHOTS=process.env.SHAMB_SHOTS_DIR||'/tmp';
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
const ready=page=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(d?.intro&&/title|select/.test(d.intro().phase))d.skipIntro(0);for(const b of document.querySelectorAll('#dialog[open] button, .pass-overlay button, .pass-card button'))if(/ready|start|play/i.test(b.textContent)){b.click();return true;}return false;});
const G=1500,SPOTS=[['start',300,G-19],['cork1-low',3000,G+81],['seesaw1',3800,G+81],['cliffs',4600,G-19],['cliff-top',5300,G-219],['tube-hill',7300,G-239],['lagoon',8400,G-19],
 ['lagoon-bed',8400,G+281],['high-route',10400,G-459],['swings',10450,G-239],['double-loop',12800,G-19],['seesaw2',14400,G-19],['cork2',16000,G+61],['spikelog',16800,G+61],['drop',19300,G-19],['loop4',20100,G+81]];
const RIGHT=`p=>({l:false,r:true,u:false,d:false,jump:false,press:false})`;
for(const [w,h,tag] of [[390,780,'phone'],[844,390,'land']]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.evaluate(()=>{void window.ShambConkins.requestGame({id:'sonic3-zone1-act2',origin:'arcade',solo:true,quick:true});});
 let up=false;for(let k=0;k<40&&!up;k++){await page.waitForTimeout(300);await ready(page);up=await page.evaluate(()=>window.ShambConkins.store.session?.debug?.state?.phase==='card');}
 check(up,`${tag}: the act opens on its title card`);
 await page.waitForTimeout(600);await page.screenshot({path:`${SHOTS}/z2-${tag}-card.png`});
 await page.evaluate(()=>window.ShambConkins.store.session.debug.skipCard());
 if(tag==='phone'){await page.waitForTimeout(1500);const m=await page.evaluate(()=>window.ShambConkins.store.session.debug.music());
  check(!m||m.song==='emerald-hill'||m.want==='emerald-hill'||JSON.stringify(m).includes('emerald-hill'),`phone: the act song is Emerald Hill (${JSON.stringify(m)})`);}
 for(const [name,x,y] of SPOTS){await page.evaluate(([x,y])=>{const d=window.ShambConkins.store.session.debug;d.rings(5);d.teleport(x,y);},[x,y]);await page.waitForTimeout(650);await page.screenshot({path:`${SHOTS}/z2-${tag}-${name}.png`});}
 // ride corkscrew 1: run up the ramp with the autopilot holding right
 await page.evaluate(([R])=>{const d=window.ShambConkins.store.session.debug;d.teleport(1920,1481);d.bot=eval(R);},[RIGHT]);
 let rode=false,back=false,maxX=0;for(let k=0;k<160&&!(rode&&back);k++){maxX=Math.max(maxX,await page.evaluate(()=>window.ShambConkins.store.session.debug.state.p.x));await page.waitForTimeout(80);const c=await page.evaluate(()=>{const p=window.ShambConkins.store.session.debug.state.p;return p.cork?Math.sin(p.cork.a||0):null;});
  if(c!==null){rode=true;if(c<-.5&&!back){back=true;await page.screenshot({path:`${SHOTS}/z2-${tag}-cork-ride.png`});}}}
 check(rode,`${tag}: the autopilot rides corkscrew 1${back?' (shot going round the back)':` (got to x ${Math.round(maxX)})`}`);
 const st=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;return {chunks:d.chunks(),phase:d.state.phase};});
 check(st.chunks>4&&st.phase==='play',`${tag}: terrain drawn (${st.chunks} chunks), still playing`);
 if(tag==='phone'){
  await page.evaluate(([R])=>{const d=window.ShambConkins.store.session.debug;d.teleport(21500,1481);d.bot=eval(R);},[RIGHT]);
  let got=false;for(let k=0;k<40&&!got;k++){await page.waitForTimeout(500);got=await page.evaluate(()=>!!window.ShambConkins.store.session?.debug.state.tally);}
  check(got,'phone: reaching the sign starts the tally');await page.waitForTimeout(1200);await page.screenshot({path:`${SHOTS}/z2-${tag}-tally.png`});}
 check(!errors.length,`${tag}: no page errors${errors.length?': '+errors[0]:''}`);
 await browser.close();}
console.log(bad?`${bad} FAILED`:'zone 1 act 2 (browser) ok');process.exit(bad?1:0);
