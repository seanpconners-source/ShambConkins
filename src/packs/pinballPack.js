// Content pack: band pinball tables on the pinball engine (src/engines/pinball.js; tables in src/engines/pinball/tables/).
// Bucketheadland (bucketheadland-pinball) is an original pool game in gameRegistry.js; newer tables live here and pick
// their table with `pinballTable`. The engine is already registered, so this pack only adds games.
const T={engine:'pinball',category:'arcade',duration:'3 balls each, taking turns',reward:10,soloKind:'game'};
const games=[
 {...T,id:'black-sabbath-pinball',pinballTable:'black-sabbath',title:'Black Sabbath · Doom Pinball',source:'Black Sabbath',icon:'🦇',
  rules:'A real pinball table in Black Sabbath\'s world. Players take turns ball by ball (3 balls each, no clock). Hold the left or right half of the screen to flip (the left button also works the upper flipper), drag down and release to launch, flick up to nudge. Spell I-R-O-N to wake IRON MAN, drop D-O-O-M and bury 3 balls in the Graveyard for WAR PIGS MULTIBALL, ride the PARANOID and ELECTRIC FUNERAL ramps to light six album modes at Heaven and Hell, spell M-A-S-T-E-R to raise the HAND OF DOOM. A full plunge rides round to the upper flipper: hit Iron Man for the super skill shot. Highest score wins.'},
];
Object.assign(exports,{engines:{},games,events:[]});
