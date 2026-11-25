// STUDIO GUESTS for the pricing games (owner, Nov 25: "use the real character names from the game instead of the random names" and
// "the same name was used after that player left and a new one came"): a guest is a character from the game (own picture + measured
// face, never one of the players' characters) and goes by that character's name; they come from one shuffled deck per game, so nobody
// is called down twice. Seeded: both phones deal the same guests. guestDeck(seed,exclude,salt)() -> {id,name (full),short,col} | null
const {seededRandom}=require("src/utils.js");
const {headFacts}=require("src/headFacts.js");
const COLS=['#e86a92','#3a86ff','#ff9f1c','#2ec4b6','#9b5de5','#f15bb5','#ff6b6b','#4cc9f0','#f77f00','#80ed99','#c77dff','#ffd166','#ef476f','#06d6a0'];
let pool=null,names=null;
function facePool(){if(pool)return pool;try{const UP=require("src/data/userPortraits.js"),A=require("src/assets.js"),cs=require("src/contentPolicy.js").ACTIVE_CATALOG.characters;
 names=new Map(cs.map(c=>[c.id,c.name]));pool=cs.filter(c=>c.unlockBy!=='dogs'&&c.name&&headFacts(c.id,'normal')&&UP.isRasterArt(A.portraitURL(c.id,'normal'))).map(c=>c.id);}catch{pool=[];names=new Map();}return pool;}
// a title isn't a name to call somebody by ("Officer Michaels" -> MICHAELS on the podium, "Dr. Evil" -> EVIL)
const TITLES=new Set('dr mr mrs ms miss the a officer captain capt sir lord lady professor prof agent general king queen uncle aunt detective det sgt sergeant lt lieutenant father sister brother mother saint st madame coach judge principal doctor private major colonel col admiral president prince princess chief reverend rev emperor big little old young baby mister'.split(' '));
function shortName(name){const n=String(name||'').split(/\s+[·\/]\s+/)[0].replace(/\s*\(.*?\)\s*/g,' ').replace(/[“”",]/g,'').trim(),w=n.split(/\s+/);
 if(n.length<=15||(w.length>2&&n.length<=18))return n;
 const pick=w.find(x=>!TITLES.has(x.toLowerCase().replace(/\.$/,''))&&x.length>1);return pick||w[0];}
function nameOf(id){facePool();return names.get(id)||'';}
function guestDeck(seed,exclude=[],salt='guests'){const R=seededRandom(`${seed}:${salt}`),ex=new Set(exclude),d=facePool().filter(id=>!ex.has(id));
 for(let i=d.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[d[i],d[j]]=[d[j],d[i]];}let k=0;
 return ()=>{if(!d.length)return null;const id=d[k%d.length],name=nameOf(id).split(/\s+[·\/]\s+/)[0].trim();k++;return {id,name,short:shortName(name),col:COLS[(k-1)%COLS.length]};};}
Object.assign(exports,{guestDeck,shortName,nameOf,facePool});
