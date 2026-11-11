// Seanic music (sonicAudio.js SONGS, the owner's Sonic 3 soundtrack in assets/music/s3k-song-*.flac): the act song plays
// from the title card, loops past its join, Invincibility while a star lasts (then the act song from the top), the 1-Up
// jingle pauses the song and it comes back where it was, the pause card stops it, Act Complete at the sign with a tally that
// waits for it, the Test Zone's own song, and Game Over. Usage: node tests/sonic3-music.mjs   (SHAMB_URL=... served build)
import {open} from './lib.mjs';
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
const J=(f,a)=>page.evaluate(f,a);
await J(()=>{const st=window.ShambConkins.store.profile.settings;st.music=true;st.sound=true;});
await page.mouse.click(195,300);// a real gesture, so the AudioContext may run
const N=()=>J(()=>window.ShambConkins.store.session?.debug?.music?.());
const D=(f,a)=>J(f,a);
const ready=()=>J(()=>{const d=window.ShambConkins.store.session?.debug;if(d?.intro&&/title|select/.test(d.intro().phase))d.skipIntro(0);for(const b of document.querySelectorAll('#dialog[open] button, .pass-overlay button, .pass-card button'))if(/ready|start|play/i.test(b.textContent)){b.click();return true;}return false;});
const until=async(f,ms=8000)=>{let n;for(let t=0;t<ms;t+=100){n=await N();if(n&&f(n))return n;await page.waitForTimeout(100);}return n;};
async function start(id){await J(id=>{void window.ShambConkins.requestGame({id,origin:'arcade',solo:true,quick:true});},id);
 for(let k=0;k<40;k++){await page.waitForTimeout(250);await ready();if(await J(()=>window.ShambConkins.store.session?.debug?.state?.phase==='card'))return true;}return false;}

check(await start('sonic3-zone1'),'zone 1 opens on its title card');
let n=await until(n=>n.name==='green-hill'&&n.pos>.3&&n.parts>0);
check(n?.name==='green-hill'&&n.pos>.3,`Green Hill Zone plays under the title card (${JSON.stringify(n)})`);
n=await until(n=>n.songs>=9);check(n?.songs>=9,`all songs decoded (${n?.songs})`);
await D(()=>window.ShambConkins.store.session.debug.skipCard());
// the loop join
const L=await D(()=>window.ShambConkins.store.session.debug.SONGS['green-hill'].loop);
await D(t=>window.ShambConkins.store.session.debug.seekSong(t),L[1]-1);await page.waitForTimeout(2200);
n=await N();check(n.name==='green-hill'&&n.pos>L[0]&&n.pos<L[0]+2.5&&!n.paused,`loop went back to the top (${n.pos.toFixed(2)}, loop ${L})`);
// invincibility
await page.waitForTimeout(1500);
await D(()=>{window.ShambConkins.store.session.debug.state.p.star=600;});
n=await until(n=>n.name==='invincible'&&n.pos>.2,4000);check(n?.name==='invincible',`a star plays Invincibility (${n?.name})`);
await D(()=>{window.ShambConkins.store.session.debug.state.p.star=0;});
n=await until(n=>n.name==='green-hill'&&n.parts>0,4000);check(n?.name==='green-hill'&&n.pos<2,`the act song comes back from the top (${n?.name} ${n?.pos?.toFixed(2)})`);
// 1-up: pause, jingle, resume where it was
await page.waitForTimeout(2500);const before=await N();
await D(()=>{const st=window.ShambConkins.store.session.debug.state;st.w.ev.push({k:'life',p:0});});
await page.waitForTimeout(500);n=await N();check(n.jingle==='1up'&&n.paused,`1-up jingle pauses the song (${JSON.stringify(n)})`);
n=await until(n=>!n.jingle&&!n.paused,5000);check(!n.jingle&&!n.paused&&n.pos>=before.pos&&n.pos<before.pos+2,`song resumes after the 1-up (${before.pos.toFixed(2)} -> ${n.pos.toFixed(2)})`);
// the pause card
const p0=await N();await J(()=>window.ShambConkins.store.session.manualPause());await page.waitForTimeout(800);
const pz=await N();check(pz.paused,'the pause card stops the song');
await J(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(700);
n=await N();check(!n.paused&&n.name==='green-hill'&&n.pos>=pz.pos&&n.pos<pz.pos+2,`resumes where it was (${p0.pos.toFixed(1)} / ${pz.pos.toFixed(1)} -> ${n.pos.toFixed(1)})`);
// the sign
await D(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(18230,1481);d.bot=p=>({l:false,r:true,u:false,d:false,jump:false,press:false});});
let t=null;for(let k=0;k<60&&!t;k++){await page.waitForTimeout(300);t=await D(()=>window.ShambConkins.store.session?.debug.state.tally);}
n=await N();check(t&&n.want===null&&!n.name&&n.jingle==='act-clear',`the sign: song stops, Act Complete plays (${JSON.stringify(n)})`);
check(t&&t.len>=4.8*60,`the tally waits for the jingle (${t?.len} frames)`);
for(let k=0;k<40&&await J(()=>!!window.ShambConkins.store.session);k++){await page.waitForTimeout(300);await J(()=>{for(const b of document.querySelectorAll('#dialog[open] button'))if(/back|done|ok|continue|close/i.test(b.textContent)){b.click();return;}});}
// the Test Zone: its own song, then Game Over
check(await start('sonic3-test'),'the Test Zone opens');
n=await until(n=>n.name==='azure-lake'&&n.pos>.3);check(n?.name==='azure-lake','the Test Zone plays Azure Lake');
await D(()=>{const d=window.ShambConkins.store.session.debug;d.skipCard();const st=d.state;st.p.lives=1;st.p.rings=0;d.teleport(st.p.x,(st.w.bottom||4000)+100);});
n=await until(n=>n.jingle==='game-over',8000);check(n?.jingle==='game-over'&&!n.name,`out of lives: Game Over plays (${JSON.stringify(n)})`);
check(!errors.length,`no page errors${errors.length?': '+errors[0]:''}`);
await browser.close();console.log(bad?`${bad} FAILED`:'seanic music ok');process.exit(bad?1:0);
