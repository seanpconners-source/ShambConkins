// Seanic's title screen and 1P character select (src/engines/s3/intro.js): the title opens first with its song, a tap
// goes to the select (1P) with the Data Select song, the arrows / a swipe change the runner, a tap on the monitor starts
// the act with that runner (the fox can fly); 2P goes from the title straight to the hand-off card, P1 the hedgehog.
// Screenshots (SHAMB_SHOTS_DIR) intro-<size>-title/select-hog/select-fox.png. SHAMB_URL = a served --pwa build.
import {open} from './lib.mjs';
const SHOTS=process.env.SHAMB_SHOTS_DIR||'/tmp';
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
for(const [w,h] of [[390,780],[844,390],[1100,700]]){const tag=`${w}x${h}`;
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 const J=(f,a)=>page.evaluate(f,a),D=()=>J(()=>{const d=window.ShambConkins.store.session?.debug;return d?.intro?{...d.intro(),music:d.music(),body:d.body,phase2:d.state.phase}:null;});
 await J(()=>{const st=window.ShambConkins.store.profile.settings;st.music=true;st.sound=true;});await page.mouse.click(w/2,h/2);
 await J(()=>{void window.ShambConkins.requestGame({id:'sonic3-zone1',origin:'arcade',solo:true,quick:true});});
 let st=null;for(let k=0;k<40;k++){await page.waitForTimeout(250);st=await D();if(st?.phase==='title')break;}
 check(st?.phase==='title',`${tag}: the game opens on the title screen`);
 await page.waitForTimeout(2200);st=await D();check(st.music.jingle==='title',`${tag}: title song plays (${st.music.jingle})`);
 await page.screenshot({path:`${SHOTS}/intro-${tag}-title.png`});
 await page.mouse.click(w/2,h*.6);await page.waitForTimeout(900);st=await D();
 check(st.phase==='select',`${tag}: a tap opens the character select (${st.phase})`);
 check(st.music.want==='data-select',`${tag}: Data Select song (${st.music.want})`);
 await page.screenshot({path:`${SHOTS}/intro-${tag}-select-hog.png`});
 // the right arrow: tap it (only the arrows change the runner; anywhere else picks it)
 {const a=await J(()=>window.ShambConkins.store.session.debug.arrows());await page.mouse.click(a.right[0],a.right[1]);}await page.waitForTimeout(700);st=await D();
 check(st.pick===1,`${tag}: the right arrow picks the fox (${st.pick})`);
 await page.screenshot({path:`${SHOTS}/intro-${tag}-select-fox.png`});
 // a swipe changes it back and forth
 await page.mouse.move(w*.6,h*.4);await page.mouse.down();await page.mouse.move(w*.3,h*.4,{steps:6});await page.mouse.up();await page.waitForTimeout(500);
 st=await D();check(st.pick===0,`${tag}: swiping changes the runner (${st.pick})`);
 await J(()=>window.ShambConkins.store.session.debug.choose(1));await page.waitForTimeout(450);
 await page.mouse.click(w/2,h*.42);let ok=false;for(let k=0;k<20&&!ok;k++){await page.waitForTimeout(250);st=await D();ok=st?.phase==='idle'&&st.phase2==='card'||st?.phase2==='card';}
 check(ok&&st.body==='fox',`${tag}: tapping the monitor starts the act as the fox (${st?.phase2}, ${st?.body})`);
 const fly=await J(()=>window.ShambConkins.store.session.debug.state.p.canFly);check(fly,`${tag}: the fox can fly`);
 check(!errors.length,`${tag}: no page errors${errors.length?': '+errors[0]:''}`);
 await browser.close();}
// 2P: title, then the hand-off card, P1 = the hedgehog
{const {browser,page,errors}=await open({viewport:{width:390,height:780}});const J=f=>page.evaluate(f);
 await J(()=>{void window.ShambConkins.requestGame({id:'sonic3-zone1',origin:'arcade',quick:true});});
 let ph=null;for(let k=0;k<40;k++){await page.waitForTimeout(250);ph=await J(()=>window.ShambConkins.store.session?.debug?.intro?.().phase);if(ph==='title')break;}
 check(ph==='title','2P: title screen first');await page.waitForTimeout(600);await page.mouse.click(195,500);await page.waitForTimeout(800);
 const card=await J(()=>!!document.querySelector('.pass-overlay, .pass-card'));check(card,'2P: a tap goes to the hand-off card (no select)');
 await J(()=>{for(const b of document.querySelectorAll('.pass-overlay button, .pass-card button'))if(/ready/i.test(b.textContent))b.click();});await page.waitForTimeout(800);
 const body=await J(()=>window.ShambConkins.store.session.debug.body);check(body==='hog','2P: player 1 runs as the hedgehog');
 check(!errors.length,`2P: no page errors${errors.length?': '+errors[0]:''}`);await browser.close();}
console.log(bad?`${bad} FAILED`:'seanic intro ok');process.exit(bad?1:0);
