// One-off gifts for a particular friend's phone (owner, Nov 12). Saves live on each phone, so a gift finds its phone by the
// player names saved there (Characters / New Game names, the saved run): Lydia holds the Hole.it record as "Lydia".
// Stage 1, the next time the game starts on her phone: `give` joins BOTH rosters (so either player slot can pick them).
// Stage 2, when she leaves Characters (or starts a New Game) with every `pair` character picked as players 1 and 2: `then`
// joins too, with its own message. Each stage happens once (profile.gifts[id] = 'given' → 'done'). Everyone else unlocks
// these characters the normal way. Pure data + rules here; app.js shows the dialogs.
const {characterIdentity}=require("src/characters.js");
const GIFTS=[
 {id:'lydia-crew',who:/^\s*lydia\b/i,give:['uss-lydia','houston'],pair:['uss-lydia','houston'],then:['ezra'],
  hello:{title:'Hey Lydia!',body:'A little something for the Hole.it champion: Lydia and Houston just joined your roster. Pick the two of them as players 1 and 2 on Characters and see who turns up…'},
  reveal:{title:'Somebody heard the crew was back together',body:'Lydia and Houston, together again — and look who came along. Ezra joins your roster!'}}
];
const has=(profile,id)=>[...profile.shared,...Object.values(profile.rosters||{}).flat()].some(c=>characterIdentity(c)===characterIdentity(id));
const add=(profile,ids)=>{const out=[];for(const id of ids)if(!profile.shared.some(c=>characterIdentity(c)===characterIdentity(id))){profile.shared.push(id);out.push(id);}return out;};
const matches=(g,names)=>names.some(n=>typeof n==='string'&&g.who.test(n));
// Stage 1 at start-up: gifts for this phone not given yet → [{gift, added:[ids]}] (profile changed; save it)
function startGifts(profile,names){const out=[];profile.gifts||={};
 for(const g of GIFTS){if(profile.gifts[g.id]||!matches(g,names))continue;profile.gifts[g.id]='given';out.push({gift:g,added:add(profile,g.give)});}return out;}
// Stage 2 when the picks are set: picked = the two character ids → [{gift, added}] for gifts whose pair is now picked
function pickGifts(profile,picked){const out=[],ids=picked.map(id=>characterIdentity(id));
 for(const g of GIFTS){if(profile.gifts?.[g.id]!=='given')continue;if(!g.pair.every(id=>ids.includes(characterIdentity(id))))continue;
  profile.gifts[g.id]='done';out.push({gift:g,added:add(profile,g.then)});}return out;}
Object.assign(exports,{GIFTS,startGifts,pickGifts,has});
