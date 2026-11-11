// ZONE 1 ACT 1 in the browser (game id sonic3-zone1): opens it, looks at the set pieces (start, roll tunnel 1, lake 1 with
// its waterfalls, the high ledges, the cave, the gorge, roll tunnel 2, lake 2) with screenshots at phone and landscape
// sizes (SHAMB_SHOTS_DIR, z1-*.png), then lets a bot run the last stretch to the sign and checks the tally. The whole act
// is bot-tested headless by tests/s3-zone1.mjs. SHAMB_URL = a served --pwa build.
import {open} from './lib.mjs';
const SHOTS=process.env.SHAMB_SHOTS_DIR||'/tmp';
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
const ready=page=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(d?.intro&&/title|select/.test(d.intro().phase))d.skipIntro(0);for(const b of document.querySelectorAll('#dialog[open] button, .pass-overlay button, .pass-card button'))if(/ready|start|play/i.test(b.textContent)){b.click();return true;}return false;});
const G=1500,SPOTS=[['start',300,G-19],['tunnel1',2700,G+180],['lake1',4100,G-219],['ledges',3200,G-439],['cave',5300,G+161],['gorge',8300,G-19],['tunnel2',9900,G+20],['loop3',12300,G-19],['lake2',13150,G-19],['stairs',560,G-179],['secret',4420,G-40],['chasm',15700,G+41],['loop4',17050,G+81]];
for(const [w,h,tag] of [[390,780,'phone'],[844,390,'land']]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.evaluate(()=>{void window.ShambConkins.requestGame({id:'sonic3-zone1',origin:'arcade',solo:true,quick:true});});
 let up=false;for(let k=0;k<40&&!up;k++){await page.waitForTimeout(300);await ready(page);up=await page.evaluate(()=>window.ShambConkins.store.session?.debug?.state?.phase==='card');}
 check(up,`${tag}: the act opens on its title card`);
 await page.waitForTimeout(600);await page.screenshot({path:`${SHOTS}/z1-${tag}-card.png`});
 await page.evaluate(()=>window.ShambConkins.store.session.debug.skipCard());
 for(const [name,x,y] of SPOTS){await page.evaluate(([x,y])=>{const d=window.ShambConkins.store.session.debug;d.rings(5);d.teleport(x,y);},[x,y]);await page.waitForTimeout(650);await page.screenshot({path:`${SHOTS}/z1-${tag}-${name}.png`});}
 const st=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;return {chunks:d.chunks(),phase:d.state.phase};});
 check(st.chunks>4&&st.phase==='play',`${tag}: terrain drawn (${st.chunks} chunks), still playing`);
 if(tag==='phone'){
  await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(17900,1481);d.bot=p=>({l:false,r:true,u:false,d:false,jump:false,press:false});});
  let got=false;for(let k=0;k<40&&!got;k++){await page.waitForTimeout(500);got=await page.evaluate(()=>!!window.ShambConkins.store.session?.debug.state.tally);}
  check(got,'phone: reaching the sign starts the tally');await page.waitForTimeout(1200);await page.screenshot({path:`${SHOTS}/z1-${tag}-tally.png`});}
 check(!errors.length,`${tag}: no page errors${errors.length?': '+errors[0]:''}`);
 await browser.close();}
console.log(bad?`${bad} FAILED`:'zone 1 act 1 (browser) ok');process.exit(bad?1:0);
