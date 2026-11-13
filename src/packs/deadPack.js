// Content pack: SEAN OF THE DEAD (src/engines/seanOfTheDead.js), a tower defense on Shaun of the Dead (owner, Nov 13):
// hold the Winchester against 10 waves of zombies wearing roster faces. Lazy engine (packs must stay light, see CLAUDE.md).
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={seanOfTheDead:lazy('src/engines/seanOfTheDead.js','seanOfTheDead')};
const games=[{id:'sean-of-the-dead',engine:'seanOfTheDead',title:'Sean of the Dead',source:'Shaun of the Dead',srcLabel:'Tower defense · Shaun of the Dead',icon:'🍺',category:'coop',
 noBleed:true,soloKind:'alone',randomEligible:false,cooperative:true,reward:10,duration:'10 waves, about 8-10 minutes',
 rules:'The dead are coming up the street to the Winchester. Tap a build spot in your colour and pick a tower: Vinyl Toss (fast records), Pool Cue Crew (blocks the dead with pool cues), The Winchester rifle (long range, picks the biggest) or the Jukebox (slows and thumps everything near it). Tap a tower to upgrade it twice or sell it. Drag your hero (your character with a cricket bat) anywhere to fight. Tap the skull on the street to call the next wave early for bonus cash. Each of you has your own money and spots; kills pay whoever got them. Twenty zombies through the door and the Winchester falls. The last wave’s boss is a locked character: kill it to cure them and they join your roster.'}];
Object.assign(exports,{engines,games,events:[]});
