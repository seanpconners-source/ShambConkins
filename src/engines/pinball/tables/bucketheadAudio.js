// Bucketheadland's recorded audio (owner's files, Nov 1): Buckethead's own songs as the soundtrack and a rock-guitar
// sound set (MySims Party "Guitar Rockstar") layered on the machine. Files: assets/music/bhpin-<slug>.mp3 and
// bhpin-gtr-<name>[-n].mp3 (README there); format in src/engines/pinball/tableAudio.js. Without the files the table
// keeps its synth songs (bucketheadMusic.js) and synth sounds.
const songs={
 'welcome-to-bucketheadland':{title:'Welcome to Bucketheadland',album:'Bucketheadland'},
 'jordan':{title:'Jordan',album:'Monsters and Robots'},
 'nottingham-lace':{title:'Nottingham Lace',album:'Enter the Chicken'},
 'padmasana':{title:'Padmasana',album:'Electric Tears'},
 'big-sur-moon':{title:'Big Sur Moon',album:'Colma'},
 'whitewash':{title:'Whitewash',album:'Colma'},
 'soothsayer':{title:'Soothsayer',album:'Crime Slunk Scene'},
};
// The playlist runs from the title through every ball (intro, plunger, normal play); modes switch to their own song.
// from = where the mode's song starts (seconds, picked from each song's loudness curve: straight into the heavy part).
const audio={prefix:'bhpin',artist:'Buckethead',songs,
 playlist:['whitewash','nottingham-lace','welcome-to-bucketheadland','padmasana','soothsayer'],
 roles:{
  jordan:{song:'jordan',from:6},                       // JORDAN MULTIBALL
  bigsur:{song:'big-sur-moon',from:0},                 // Big Sur Moon attraction
  soothsayer:{song:'soothsayer',from:195},             // Soothsayer attraction: the solo half
  coop:{song:'nottingham-lace',from:0},                // Chicken Coop Panic (Enter the Chicken)
  coaster:{song:'welcome-to-bucketheadland',from:145}, // Roller Coaster Rush: the park's theme
  nunchuck:{song:'nottingham-lace',from:100},          // Nunchuck Frenzy: the shred
  battle:{song:'jordan',from:120},                     // Giant Robot battle
  wizard:{song:'welcome-to-bucketheadland',from:3},    // WELCOME TO BUCKETHEADLAND wizard mode
 },
 // machine sound → guitar: lick tier (big/mid/short/tiny, by length) for awards, named clips (wail = vibrato wail,
 // hold = held feedback note, scrape = pick scrape, dive = dive bomb), stab = a short guitar hit. replace = the guitar
 // stands in for the synth jingle; otherwise it plays on top of the machine's own clack.
 sfx:{
  plunge:{one:'scrape',vol:.75},
  start:{lick:'tiny',prio:1,vol:.75,replace:true},
  bumper:{stab:.3},sling:{stab:.28},drop:{stab:.42},standup:{stab:.42},rollover:{stab:.38},hole:{stab:.35},
  ramp:{stab:.45,replace:true},
  rail:{lick:'short',prio:1,vol:.7},                   // a ramp/wireform made
  award:{lick:'short',prio:1,replace:true},
  lock:{lick:'mid',prio:2,replace:true},
  skill:{one:'wail',vol:.85,replace:true},
  jackpot:{lick:'mid',prio:3,vol:.85,replace:true},
  super:{lick:'big',prio:4,vol:.9,replace:true},
  multiball:{lick:'big',prio:4,vol:.9,replace:true},  // multiball and every mode start
  knocker:{one:'wail',vol:.8},                         // extra ball / replay / high score
  save:{one:'hold',vol:.6},
  drain:{one:'dive',vol:.8,replace:true},
  tiltDrain:{one:'dive',vol:.8,replace:true},
  danger:{one:'scrape',vol:.6},
  tilt:{one:'scrape',vol:.8},
  gameOver:{one:'dive',vol:.85},
 }};
Object.assign(exports,{audio});
