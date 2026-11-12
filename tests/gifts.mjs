// Friend gifts (src/gifts.js, owner Nov 12): Lydia's phone (a saved player name "Lydia") gets Lydia + Houston in both rosters
// the next time the game starts, once; Ezra only after she picks Lydia and Houston as players 1 and 2. Other phones get
// nothing. Houston and Ezra exist and unlock normally for everyone else. Node, no DOM.
import {req} from './load.mjs';
const G=req('src/gifts.js'),P=req('src/profile.js'),{character}=req('src/characters.js'),{ACTIVE_CATALOG:CATALOG}=req('src/contentPolicy.js');
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
for(const id of ['houston','ezra','uss-lydia'])check(!!character(id)&&CATALOG.characters.some(c=>c.id===id),`${id} is a character in the catalog`);
check(!character('houston').unlockBy&&!character('ezra').unlockBy,'Houston and Ezra unlock the normal way');
const prof=()=>{const p=JSON.parse(JSON.stringify(P.freshProfile()));p.shared=['sean','amber'];p.rosters={Sean:[],Amber:[]};return p;};
let p=prof();check(!G.startGifts(p,['Sean','Amber']).length&&!p.shared.includes('houston'),'a phone without Lydia gets nothing');
for(const n of ['Lyd','lyd ','Lydia','LYDIA B']){const q=prof();check(G.startGifts(q,['Sean',n]).length===1,`the name "${n}" counts as Lydia`);}
for(const n of ['Lydon','Clyde','Lydian']){const q=prof();check(!G.startGifts(q,[n]).length,`the name "${n}" does not`);}
p=prof();const got=G.startGifts(p,['Sean','lydia ']);
check(got.length===1&&p.shared.includes('uss-lydia')&&p.shared.includes('houston')&&!p.shared.includes('ezra'),'Lydia\'s phone: Lydia + Houston join both rosters, not Ezra');
check(P.availableCharacters(p,'Sean').includes('houston')&&P.availableCharacters(p,'Amber').includes('uss-lydia'),'both player slots can pick them');
check(!G.startGifts(p,['Lydia']).length,'stage 1 happens once');
check(!G.pickGifts(p,['uss-lydia','sean']).length&&!p.shared.includes('ezra'),'Lydia with someone else: no Ezra yet');
const r=G.pickGifts(p,['houston','uss-lydia']);check(r.length===1&&r[0].added.join()==='ezra'&&p.shared.includes('ezra'),'Lydia + Houston picked: Ezra joins');
check(!G.pickGifts(p,['houston','uss-lydia']).length,'stage 2 happens once');
// the gift state survives a save/load
{const m=new Map();globalThis.localStorage??={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
 try{P.saveProfile(p);const q=P.loadProfile();check(q.gifts?.['lydia-crew']==='done'&&q.shared.includes('ezra'),'gift state and Ezra are kept in the save');}catch(e){check(false,'save/load: '+e.message);}}
console.log(bad?`${bad} problem(s)`:'gifts OK');process.exit(bad?1:0);
