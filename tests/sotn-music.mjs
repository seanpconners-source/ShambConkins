// Symphony of the Night soundtrack: every place plays its song, a song loops past its join without stopping, the music
// keeps playing under a hand-off card (no frames there), the pause card stops it and resume carries on from the same spot,
// and a lost run plays game over. Needs a build with the assets/music/cv-symphony-* files.
// Usage: node tests/sotn-music.mjs   (SHAMB_URL=... for a served build)
import {open} from './lib.mjs';
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.evaluate(()=>{const st=window.ShambConkins.store.profile.settings;st.music=true;st.sound=true;});
await page.mouse.click(195,300); // a real gesture, so the AudioContext may run
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'cv-symphony',origin:'arcade'});});
await page.waitForTimeout(400);await page.evaluate(()=>{[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click();});
const J=f=>page.evaluate(f);
const N=()=>J(()=>window.ShambConkins.store.session?.debug?.audio?.nowPlaying());
const phase=()=>J(()=>window.ShambConkins.store.session?.debug?.phase);
const expectSong=async(name,tag,ms=6000)=>{let n;for(let t=0;t<ms;t+=100){n=await N();if(n?.name===name&&n.pos>0&&n.parts>0){console.log('ok',tag,'->',name,'at',n.pos.toFixed(1));return n;}await page.waitForTimeout(100);}fail(`${tag}: wanted ${name}, got ${JSON.stringify(n)}`);return n;};
const ready=async()=>{for(let i=0;i<60;i++){if(await phase()==='play')return;await J(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(150);}fail('never reached play');};
const tp=x=>page.evaluate(x=>{const d=window.ShambConkins.store.session.debug;d.teleport(d.turn,x);d.pl[d.turn].inv=600;},x);

await expectSong('title','title',4000);
for(let i=0;i<80&&await phase()!=='handoff';i++)await page.waitForTimeout(100);
const card=await expectSong('story','first card',5000);
await page.waitForTimeout(1500);const card2=await N();
if(!(card2.pos>card.pos+1))fail(`music stopped under the card: ${card.pos} -> ${card2.pos}`);
await ready();await expectSong('castle','the approach');
// the loop: jump to just before the join and go past it
await J(()=>window.ShambConkins.store.session.debug.audio.seekSong(104));await page.waitForTimeout(3200);
{const n=await N(),L=await J(()=>window.ShambConkins.store.session.debug.audio.SONGS.castle.loop);
 if(n.name!=='castle'||!(n.pos>L[0]&&n.pos<L[0]+4))fail(`loop did not go back: ${JSON.stringify(n)} loop ${L}`);else console.log('ok loop went back to',n.pos.toFixed(2));}
// pause and resume
const before=await N();await J(()=>window.ShambConkins.store.session.manualPause());await page.waitForTimeout(1000);
const paused=await N();if(!paused.paused)fail('pause card did not stop the song');
await J(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(800);
const back=await N();if(back.paused||back.name!=='castle'||back.pos<paused.pos||back.pos>paused.pos+3)fail(`resume: ${JSON.stringify({paused,back})}`);else console.log('ok resumed',paused.pos.toFixed(1),'->',back.pos.toFixed(1),'from',before.pos.toFixed(1));
// the areas
await J(()=>{const d=window.ShambConkins.store.session.debug,w=d.worlds[d.turn];w.deathDone=true;w.gateShut=true;});
await tp(1400);await page.waitForTimeout(600);{const n=await N();if(n.want!=='castle')fail(`hall wants ${n.want}`);}
await tp(2000);await expectSong('caverns','Underground Caverns');
await tp(1805);await page.waitForTimeout(500);{const n=await N();if(n.want!=='caverns')fail(`on the door line it changed to ${n.want}`);}
await tp(2700);await expectSong('gallery','Marble Gallery');
await J(()=>window.ShambConkins.store.session.debug.toBoss(0));await expectSong('dracula','Dracula speaks');
await J(()=>window.ShambConkins.store.session.debug.skipScene(0));await expectSong('boss','the fight');
const boss=()=>J(()=>{const w=window.ShambConkins.store.session.debug.worlds[0];return {phase:w.boss?.phase,state:w.boss?.state,orb:w.orb};});
await J(()=>{const d=window.ShambConkins.store.session.debug;d.pl[0].inv=99999;d.hurtBoss(0,999);});
for(let i=0;i<60&&(await boss()).phase!==2;i++)await page.waitForTimeout(150);
await page.waitForTimeout(1800);
{const n=await N(),b=await boss();if(b.phase!==2)fail(`no demon form ${JSON.stringify(b)}`);if(n.want!=='boss')fail(`demon form wants ${n.want}`);else console.log('ok demon form keeps the battle song');}
await J(()=>window.ShambConkins.store.session.debug.hurtBoss(0,999));await page.waitForTimeout(800);
{const n=await N();if(n.want!==null)fail(`the kill should be silent, wants ${n.want} ${JSON.stringify(await boss())}`);else console.log('ok silence for the kill');}
for(let i=0;i<80&&!(await boss()).orb;i++)await page.waitForTimeout(150);
for(let i=0;i<40&&!await J(()=>window.ShambConkins.store.session.debug.pl[0].finished);i++){await J(()=>{const s=window.ShambConkins.store.session.debug,o=s.worlds[0].items.find(it=>it.type==='orb');if(o&&o.ground)s.pl[0].x=o.x-16;});await page.keyboard.down('d');await page.waitForTimeout(120);await page.keyboard.up('d');}
await expectSong('keep','after the orb',9000);
// second run: the card is the save screen, and running out of time is game over
for(let i=0;i<120&&await phase()!=='handoff';i++)await page.waitForTimeout(100);
await expectSong('save','second card',4000);
await ready();await expectSong('castle','second run');
await J(()=>window.ShambConkins.store.session.debug.setClock(99999));await expectSong('gameover','time up');
if(errors.length)fail(errors.slice(0,3).join(' | '));
await browser.close();
console.log(ok?'OK':'FAILED');process.exit(ok?0:1);
