// Bucketheadland's recorded audio (owner's files, Nov 1): Buckethead's own songs as the soundtrack and two rock-guitar
// sound sets (MySims Party "Guitar Rockstar" = gtr-*, MTV Music Generator 2 guitar FX = fx-*) on the machine. Files:
// assets/music/bhpin-<slug>.mp3, bhpin-gtr-<name>[-n].mp3, bhpin-fx-<name>[-n].mp3 (README there); how they are played:
// src/engines/pinball/tableAudio.js. Without the files the table keeps its synth songs and sounds.
const songs={
 'welcome-to-bucketheadland':{title:'Welcome to Bucketheadland',album:'Bucketheadland'},
 'jordan':{title:'Jordan',album:'Monsters and Robots'},
 'nottingham-lace':{title:'Nottingham Lace',album:'Enter the Chicken'},
 'padmasana':{title:'Padmasana',album:'Electric Tears'},
 'big-sur-moon':{title:'Big Sur Moon',album:'Colma'},
 'whitewash':{title:'Whitewash',album:'Colma'},
 'soothsayer':{title:'Soothsayer',album:'Crime Slunk Scene'},
};
// gain (dB): the songs are loudness-matched files, but measured as the game hears them (loudest 50 ms in every 1.6 s,
// median about -17 dBFS) Whitewash stands out by 4-5 dB and Jordan/Welcome by 1-1.5: evened out here.
for(const [k,g] of Object.entries({'whitewash':-4.6,'jordan':-1.5,'welcome-to-bucketheadland':-1,'nottingham-lace':.7}))songs[k].gain=g;
// Sections [from s, to s, level 1 calm | 2 medium | 3 heavy]: measured (loudness, brightness, note density every 2 s,
// smoothed, cut at phrase dips), then evened out by what the songs are: Colma's Whitewash and Big Sur Moon are mellow
// (mastered loud), Padmasana is the calm bed, Soothsayer climbs from its quiet riff into the long solo half, Jordan,
// Nottingham Lace and Welcome to Bucketheadland are the shred.
const sections={
 'padmasana':[[0,240,1],[240,282,2],[282,409,1],[409,503,2],[503,549,1],[549,613,2],[613,695,1]],
 'big-sur-moon':[[0,28,1],[28,70,2]],
 'whitewash':[[0,270,2],[270,282,1]],
 'soothsayer':[[0,68,1],[68,88,2],[88,112,1],[112,234,2],[234,367,3],[367,383,2],[383,541,3]],
 'welcome-to-bucketheadland':[[0,32,2],[32,62,3],[62,94,2],[94,136,3],[136,148,2],[148,222,3]],
 'nottingham-lace':[[0,20,3],[20,28,2],[28,393,3]],
 'jordan':[[0,8,2],[8,235,3]],
};
// Modes with a song of their own (others just ask for the heavy level). from = where it starts.
const roles={
 jordan:{song:'jordan',from:0},                       // JORDAN MULTIBALL: the build-up into the riff
 bigsur:{song:'big-sur-moon',from:28},                // Big Sur Moon attraction
 soothsayer:{song:'soothsayer',from:234},             // Soothsayer attraction: the solo half
 coop:{song:'nottingham-lace',from:28},               // Chicken Coop Panic (Enter the Chicken)
 wizard:{song:'welcome-to-bucketheadland',from:3},    // WELCOME TO BUCKETHEADLAND wizard mode
};
// Machine sound → guitar (a list = one picked at random). one = a clip (off/dur = a slice, rate = pitch range),
// lick = a lead lick tier (gtr-big/mid/short/tiny), grain = tiny random slices, stab = the opening of a lick.
// The clip replaces the synth sound unless replace:false. vol: measured so every sound peaks around -24 dBFS RMS on the
// bus (licks and big moments -21, small fast ones -27); the songs play at about -18.
const sfx={
 start:{one:'fx-amp-on',vol:.25},                                          // amp switches on for each ball
 plunge:{one:'fx-rev',vol:.28},autoPlunge:{one:'gtr-scrape',vol:.18},
 bumper:[{one:'fx-sparks',dur:.24,rate:[.94,1.08],vol:.27},{stab:.34}],
 sling:{one:'fx-cheap-lead',dur:.32,rate:[.95,1.06],vol:.26},
 drop:{one:'fx-fretted',dur:.42,rate:[.96,1.06],vol:.99},
 standup:{stab:.27},rollover:{stab:.23},
 spin:{grain:'fx-mice',len:.06,vol:.43},
 hole:{one:'fx-knock',vol:.25},eject:{one:'fx-rev',dur:.55,vol:.38},kick:{one:'fx-rev',dur:.7,vol:.38},
 nudge:{one:'fx-amp-on',dur:.32,vol:.26},
 ramp:{one:'fx-scraper',dur:1.3,rate:[.95,1.08],vol:.22},                  // the ball heads up a ramp
 rail:{lick:'gtr-short',prio:1,vol:.41},                                   // a ramp / wireform made
 award:{lick:'gtr-short',prio:1,vol:.38},
 lock:{one:'fx-trem',vol:.33},
 skill:{one:'fx-wail',dur:3.2,vol:.39},
 jackpot:{lick:'gtr-mid',prio:3,vol:.44},
 super:{lick:'gtr-big',prio:4,vol:.54},
 multiball:{lick:'gtr-big',prio:4,vol:.5},                                 // multiball and every mode start
 knocker:{one:'fx-wail',dur:2.6,vol:.39},                                  // extra ball / replay / high score
 save:{one:'gtr-hold',vol:.42},
 drain:[{one:'fx-diving',vol:.32},{one:'gtr-dive',vol:.34}],tiltDrain:{one:'fx-diving',vol:.32},
 danger:{one:'fx-sixty-cop',vol:.97},tilt:{one:'fx-unplug',vol:.28},
 bonus:{one:'fx-cheap-lead',dur:.16,rate:[.9,1.25],vol:.2},
 gameOver:{one:'fx-diving',rate:.85,vol:.28},
};
// The machine's own synth sounds that stay (flippers, gates, walls, the rolling ball): one trim on the bus so the
// flipper clack sits with the small clips (-26); gate/wall ticks keep their place under it.
const synthTrim={all:.62,roll:.62};
const audio={prefix:'bhpin',artist:'Buckethead',songs,sections,roles,sfx,synthTrim};
Object.assign(exports,{audio});
