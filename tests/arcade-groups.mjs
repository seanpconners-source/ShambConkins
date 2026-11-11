// Arcade groups (owner, Nov 11): every Arcade game sits in exactly one place in the group tree (src/arcadeConsole.js
// COLLECTIONS + FAMILIES), every id and group in the tree exists, and every franchise sits in exactly one collection.
// Node, no DOM.  node tests/arcade-groups.mjs
import {req} from './load.mjs';
const {GAMES}=req('src/gameRegistry.js'),{isCut}=req('src/data/cutGames.js'),A=req('src/arcadeConsole.js');
let bad=0;const fail=m=>{bad++;console.log('FAIL',m);};
const ids=new Set([...GAMES.map(g=>g.id),'pkmn-wild','pkmn-trainer']);
const arcade=GAMES.filter(g=>!g.arcadeAs&&!isCut(g)&&!g.bossId).map(g=>g.id).concat(['pkmn-wild','pkmn-trainer']);
const where=new Map(),famIn=new Map();
const walk=(key,trail)=>{const gr=A.GROUP.get(key);if(!gr){fail(`group ${key} (in ${trail.join(' › ')}) does not exist`);return;}
 for(const k of gr.kids){if(k.f){famIn.set(k.f,(famIn.get(k.f)||0)+1);walk(k.f,[...trail,k.f]);}
  else{if(!ids.has(k.id))fail(`${k.id} in ${trail.join(' › ')} is not a game`);(where.get(k.id)||where.set(k.id,[]).get(k.id)).push(trail.join(' › '));}}};
for(const k of A.TOP)if(k!=='bosses')walk(k,[k]);
for(const [id,w] of where)if(w.length>1)fail(`${id} is in ${w.length} places: ${w.join(' | ')}`);
for(const id of arcade)if(!where.has(id))fail(`${id} is in no group (it would sit alone on All games)`);
for(const [f,n] of famIn)if(n>1)fail(`group ${f} is listed ${n} times`);
for(const f of A.FAMILIES.map(f=>f[0]))if(f!=='bosses'&&!famIn.has(f)&&!A.TOP.includes(f)&&!A.COLLECTIONS.some(c=>c[0]===f))fail(`franchise ${f} sits in no collection`);
const g=GAMES.find(x=>x.id==='sonic3-zone1-act2');const p=A.pathTo(g).join(' › ');if(p!=='console › sonic')fail('Seanic Act 2 path is '+p);
console.log(`${A.TOP.length} top tiles, ${where.size} games placed of ${arcade.length}`);
console.log(bad?`${bad} problem(s)`:'arcade groups OK');process.exit(bad?1:0);
