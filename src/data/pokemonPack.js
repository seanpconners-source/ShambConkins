// Pokémon (the 1997 anime / Red & Blue) cameo cast. They live in the Pokémon warp zone:
// met in its tall grass and as its trainers; Gary Oak is the Gym battle at the end.
// Same row format as legendsPack2.js: [id, name, source, icon, photo page, perk, flavour line].
const PERKS={
 explorer:'Explorer: +1 point at every landmark.',
 competitor:'Competitor: +1 point on every minigame win.',
 scavenger:'Scavenger: a bonus supply at the second and third realm gates.',
 survivor:'Survivor: starts with a penalty shield and earns another at each realm gate if you have none.'
};
const ROWS=[
 ['ash-ketchum','Ash Ketchum','Pokémon','🧢','Ash Ketchum','competitor','Ten years old, one hat, zero doubts. Gotta catch you.'],
 ['pikachu','Pikachu','Pokémon','⚡','Pikachu','competitor','Refuses to ride in the ball. Will ride on your shoulder.'],
 ['misty','Misty','Pokémon','💧','Misty (Pokémon)','survivor','Still waiting on that bike.'],
 ['brock','Brock','Pokémon','🪨','Brock (Pokémon)','explorer','Cooks, cleans, rock-type specialist, falls in love every episode.'],
 ['gary-oak','Gary Oak','Pokémon','😏','Blue (Pokémon)','competitor','Smell ya later, loser.'],
 ['professor-oak','Professor Oak','Pokémon','🔬','Professor Oak','scavenger','Is it a boy or a girl? He has a whole research lab and no idea.'],
 ['jessie-rocket','Jessie','Pokémon','🌹','Team Rocket','survivor','Prepare for trouble.'],
 ['james-rocket','James','Pokémon','🥀','Team Rocket','survivor','Make it double.'],
 ['meowth','Meowth','Pokémon','🪙','Meowth','scavenger','That’s right! The talking cat is here for your Pokédollars.']
];
const POKEMON_CHARACTERS=ROWS.map(([id,name,source,icon,actor,perk,line])=>({id,name,source,icon,actor,assetKey:'char:'+id,unlockAt:999,perkType:perk,perk:PERKS[perk],unlockPhrase:line,
 unlockHint:`Catch ${name} in the tall grass of the Pokémon warp zone, or beat them in a trainer battle.`}));
Object.assign(exports,{POKEMON_CHARACTERS});
