// Content pack: band pinball tables on the pinball engine (src/engines/pinball.js; tables in src/engines/pinball/tables/).
// Bucketheadland (bucketheadland-pinball) is an original pool game in gameRegistry.js; newer tables live here and pick
// their table with `pinballTable`. The engine is already registered, so this pack only adds games.
const T={engine:'pinball',category:'arcade',duration:'3 balls each, taking turns',reward:10,soloKind:'game'};
const games=[
 {...T,id:'black-sabbath-pinball',pinballTable:'black-sabbath',title:'Black Sabbath · Doom Pinball',source:'Black Sabbath',icon:'🦇',
  rules:'A real pinball table in Black Sabbath\'s world. Players take turns ball by ball (3 balls each, no clock). Hold the left or right half of the screen to flip (the left button also works the upper flipper), drag down and release to launch, flick up to nudge. Spell I-R-O-N to wake IRON MAN, drop D-O-O-M and bury 3 balls in the Graveyard for WAR PIGS MULTIBALL, ride the PARANOID and ELECTRIC FUNERAL ramps to light six album modes at Heaven and Hell, spell M-A-S-T-E-R to raise the HAND OF DOOM. A full plunge rides round to the upper flipper: hit Iron Man for the super skill shot. Highest score wins.'},
 {...T,id:'king-gizzard-pinball',pinballTable:'king-gizzard',title:'King Gizzard · Nonagon Infinity Pinball',source:'King Gizzard',icon:'🦎',
  rules:'A real pinball table in King Gizzard & the Lizard Wizard\'s Gizzverse. Players take turns ball by ball (3 balls each, no clock). Hold the left or right half of the screen to flip (each button also works the mini flipper up in the Nest), drag down and release to launch, flick up to nudge. The top of the table is THE RATS\' NEST, its own little playfield with two mini flippers: spell R-A-T-S up there to light PLANET B. Feed the RATTLESNAKE: it swallows the ball and carries it up into the Nest. Loop the orbits to build the NONAGON (nine loops = NONAGON INFINITY), drop G-I-L-A to light snake locks for RATTLESNAKE MULTIBALL, fly the FLIGHT b741 ramp to light album modes at the Gizzverse. Shoot the snake right after the launch for the skill shot. Highest score wins.'}
];
Object.assign(exports,{engines:{},games,events:[]});
