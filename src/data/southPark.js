// The South Park warp zone (src/warpBoards.js 'south-park'): its cast.
// Arriving in town recruits one South Park character per player; every game won on the South Park board recruits
// another for the winner (pickSouthPark). The new kids below only join there (unlockBy:'southpark').
// Beating Mecha-Streisand at Stark's Pond unlocks plain Barbra Streisand (src/data/bosses.js).
const {PERKS}=require("src/data/legendsPack.js");

// [id, name, icon, actor/Wikipedia page (photo lookup), perk, line]
const SOUTH_PARK_ROWS=[
 ['sp-stan','Stan Marsh','🧢','Stan Marsh','explorer','Dude, this is pretty messed up right here.'],
 ['sp-kyle','Kyle Broflovski','🟢','Kyle Broflovski','competitor','You know, I learned something today.'],
 ['sp-kenny','Kenny McCormick','🧡','Kenny McCormick','survivor','Mmph mmph mmph! (He’ll be back next week.)'],
 ['sp-chef','Chef','🍳','Chef (South Park)','scavenger','Hello there, children!'],
 ['sp-mr-garrison','Mr. Garrison','🍎','Mr. Garrison','competitor','Mr. Hat says there will be a pop quiz.'],
 ['sp-mr-mackey','Mr. Mackey','🎈','Mr. Mackey','explorer','Board games are good, mmkay?'],
 ['sp-wendy','Wendy Testaburger','💜','Wendy Testaburger','competitor','Somebody has to be the smart one.'],
 ['sp-tweek','Tweek Tweak','☕','Tweek Tweak','survivor','Gah! Too much pressure!'],
 ['sp-craig','Craig Tucker','🐹','Craig Tucker','scavenger','Brought Stripe. Not sharing Stripe.'],
 ['sp-jimmy','Jimmy Valmer','🎤','Jimmy Valmer','explorer','Wow, what a terrific audience!'],
 ['sp-timmy','Timmy Burch','♿','Timmy Burch','survivor','Timmy!'],
 ['sp-token','Token Black','💰','Token Black','scavenger','Pays for the whole party. Again.'],
 ['sp-ike','Ike Broflovski','👶','Ike Broflovski','explorer','Kick the baby! (Don’t kick the baby.)'],
 ['sp-mr-hankey','Mr. Hankey','💩','Mr. Hankey, the Christmas Poo','scavenger','Howdy ho!'],
 ['sp-terrance','Terrance','🇨🇦','Terrance and Phillip','competitor','Hey Phillip, pull my finger.'],
 ['sp-phillip','Phillip','🍁','Terrance and Phillip','competitor','Why, Terrance? Why would I do that?'],
 ['sp-barbrady','Officer Barbrady','👮','Officer Barbrady','explorer','Okay, move along. Nothing to see here.'],
 ['sp-big-gay-al','Big Gay Al','🌈','Big Gay Al','scavenger','I’m super! Thanks for asking!'],
 ['sp-sheila','Sheila Broflovski','🗣️','Sheila Broflovski','competitor','What what what?!'],
 ['sp-jimbo','Uncle Jimbo','🎯','Jimbo Kern','scavenger','It’s coming right for us!'],
 ['sp-manbearpig','ManBearPig','🐗','ManBearPig','survivor','Half man, half bear, half pig. I’m super cereal.'],
 ['sp-scott-tenorman','Scott Tenorman','🌶️','Scott Tenorman Must Die','survivor','Still not over the chili.'],
 ['sp-pc-principal','PC Principal','💪','PC Principal','competitor','Totally not cool, bro.'],
 ['sp-pip','Pip','🎩','Pip (South Park)','explorer','Jolly good, a board game!'],
 ['sp-robert-smith','Robert Smith','🦋','Robert Smith (musician)','survivor','Turned into a giant moth to stop Mecha-Streisand. Would do it again.'],
 ['sp-leonard-maltin','Leonard Maltin','🎬','Leonard Maltin','explorer','Two thumbs up for this board. Wait, wrong critic.']
];
const SOUTH_PARK_CHARACTERS=SOUTH_PARK_ROWS.map(([id,name,icon,actor,perk,line])=>({id,name,source:'South Park',icon,actor,assetKey:'char:'+id,unlockAt:999,
 perkType:perk,perk:PERKS[perk],unlockPhrase:line,unlockBy:'southpark',unlockHint:'Only found in the South Park warp zone: arriving in town and winning games there recruits South Park characters.'}));
// Everyone the town can hand out: the South Park characters already in the roster plus the warp-only ones.
const SOUTH_PARK_IDS=['cartman','butters','randy','towlie',...SOUTH_PARK_ROWS.map(r=>r[0])];
// A South Park character this player does not own yet, or null when they have the whole town.
// owned: character ids the player can already pick; canRecruit: (id)=>bool from src/profile.js.
function pickSouthPark(owned,canRecruit,random=Math.random){
 const {characterIdentity}=require("src/characters.js");// lazy: characters.js loads the catalog, which loads this file
 const have=new Set(owned.map(characterIdentity));
 const pool=SOUTH_PARK_IDS.filter(id=>!have.has(characterIdentity(id))&&canRecruit(id));
 return pool.length?pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]:null;
}
Object.assign(exports,{SOUTH_PARK_ROWS,SOUTH_PARK_CHARACTERS,SOUTH_PARK_IDS,pickSouthPark});
