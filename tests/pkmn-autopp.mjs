// Soak Nov 4 (v0.83): Pokémon battles on autopilot (the CPU's battles in 1P board runs, test bots) never ended when
// the move the autopilot picks ran out of PP: "No PP left" sent it back to the menu, it picked the same move again,
// forever (solo-board, vault trainer battles and online-board all stuck behind the Game Boy). Since PK1 the first
// move is often a 10-PP signature move, so long battles hit it. Here the first move is emptied on the first menu and
// the autopilot keeps asking for it: the battle must still end, using other moves. Exits 1 on failure.
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.evaluate(()=>{
 const S=window.ShambConkins;S.pkmn.speed(12);window.__used=[];window.__empty=null;
 S.pkmn.auto(menu=>{
  if(menu.kind==='fight'){const mon=menu.battler.mon;if(!window.__empty){window.__empty=menu.moves[0];mon.pp={...(mon.pp||{}),[menu.moves[0]]:0};}return 0;}
  return menu.kind==='party'?menu.list.findIndex(m=>m.hp>0):menu.kind==='yesno'?1:0;});
 const mk=(id,lvl)=>({id,lvl,exp:0,hp:999,status:null,pp:{}});
 S.pkmn.battle({mode:'trainer',player:{team:[mk('dennis',40)],bag:{},character:'sean',name:'Sean'},foe:{label:'Frank',character:'frank',team:[mk('frank',30),mk('charlie',30)],lose:'Aw.'}}).then(r=>window.__out=r?.outcome||'done',e=>window.__out='error '+e.message);
});
let out=null;for(let i=0;i<90&&!out;i++){await page.waitForTimeout(1000);out=await page.evaluate(()=>window.__out);}
const st=await page.evaluate(()=>({empty:window.__empty}));
console.log('emptied',st.empty,'outcome',out,'errors',errors);
const bad=!st.empty||!out||/^error/.test(out)||errors.length;
await browser.close();console.log(bad?'FAIL':'OK');process.exit(bad?1:0);
