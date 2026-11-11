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
 st=await D();check(st.pick===2,`${tag}: swiping changes the runner (${st.pick})`);// (fox -> the echidna)
 await J(()=>window.ShambConkins.store.session.debug.choose(-1));await page.waitForTimeout(450);// back to the fox
 await page.mouse.click(w/2,h*.42);let ok=false;for(let k=0;k<20&&!ok;k++){await page.waitForTimeout(250);st=await D();ok=st?.phase==='idle'&&st.phase2==='card'||st?.phase2==='card';}
 check(ok&&st.body==='fox',`${tag}: tapping the monitor starts the act as the fox (${st?.phase2}, ${st?.body})`);
 const fly=await J(()=>window.ShambConkins.store.session.debug.state.p.canFly);check(fly,`${tag}: the fox can fly`);
 check(!errors.length,`${tag}: no page errors${errors.length?': '+errors[0]:''}`);
 await browser.close();}
// 2P (owner, Nov 11 round 4): title, then player 1 picks, then player 2 picks from what's left (no runner twice on screen):
// player 1 takes the SEANIC & TAILS pair, so player 2's arrows skip the hedgehog and the fox; then the hand-off card
{const {browser,page,errors}=await open({viewport:{width:390,height:780}});const J=f=>page.evaluate(f),D=()=>J(()=>window.ShambConkins.store.session?.debug?.intro?.());
 await J(()=>{const st=window.ShambConkins.store.profile.settings;st.music=true;st.sound=true;});
 await J(()=>{void window.ShambConkins.requestGame({id:'sonic3-zone1',origin:'arcade',quick:true});});
 let st=null;for(let k=0;k<40;k++){await page.waitForTimeout(250);st=await D();if(st?.phase==='title')break;}
 check(st?.phase==='title','2P: title screen first');await page.waitForTimeout(600);await page.mouse.click(195,500);await page.waitForTimeout(800);
 st=await D();check(st.phase==='select'&&st.who===0,`2P: player 1 picks first (${st.phase}, who ${st.who})`);
 // to the pair (the last pick): the left arrow from the hedgehog wraps round to it
 {const a=await J(()=>window.ShambConkins.store.session.debug.arrows());await page.mouse.click(a.left[0],a.left[1]);}await page.waitForTimeout(700);
 st=await D();check(st.pick===4,`2P: the left arrow wraps to SEANIC & TAILS (${st.pick})`);
 await page.mouse.click(195,330);await page.waitForTimeout(900);st=await D();
 check(st.phase==='select'&&st.who===1&&JSON.stringify(st.taken)==='["hog","fox"]',`2P: then player 2 picks, the hedgehog and fox taken (${st.who}, ${JSON.stringify(st.taken)})`);
 check(st.pick===2,`2P: player 2 starts on the first free runner, the echidna (${st.pick})`);
 const seen=new Set([st.pick]);for(let k=0;k<4;k++){const a=await J(()=>window.ShambConkins.store.session.debug.arrows());await page.mouse.click(a.right[0],a.right[1]);await page.waitForTimeout(450);seen.add((await D()).pick);}
 check([...seen].every(k=>k===2||k===3),`2P: player 2's arrows only show the echidna and the dark hedgehog (${[...seen]})`);
 await page.screenshot({path:`${SHOTS}/intro-2p-select-p2.png`});
 await J(()=>window.ShambConkins.store.session.debug.choose(0));await page.waitForTimeout(450);// (on the echidna or the dark one)
 await page.mouse.click(195,330);await page.waitForTimeout(900);
 const card=await J(()=>!!document.querySelector('.pass-overlay, .pass-card'));check(card,'2P: then the hand-off card');
 await J(()=>{for(const b of document.querySelectorAll('.pass-overlay button, .pass-card button'))if(/ready/i.test(b.textContent))b.click();});await page.waitForTimeout(1500);
 const b=await J(()=>{const d=window.ShambConkins.store.session.debug;return {...d.bodies(),body:d.body,buddy:!!d.buddy};});
 check(b.body==='hog'&&b.buddy&&b.pairs[0]&&['knux','dark'].includes(b.bodies[1]),`2P: player 1 runs as the hedgehog with the CPU fox, player 2 will be ${b.bodies[1]} (${JSON.stringify(b)})`);
 check(!errors.length,`2P: no page errors${errors.length?': '+errors[0]:''}`);await browser.close();}
console.log(bad?`${bad} FAILED`:'seanic intro ok');process.exit(bad?1:0);
