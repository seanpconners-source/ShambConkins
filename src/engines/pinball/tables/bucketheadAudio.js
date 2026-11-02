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
// Sections [from s, to s, level or [levels]]: 1 chill (game over only), 2 play, 3 crazy (modes, multiball). Measured
// (loudness, brightness, note density every 2 s, smoothed, cut at phrase dips), then sorted by what the songs are. Owner
// (Nov 1): "too chill... should be more crazy and fun! Bucketheadland!": play runs on the shred (Welcome to
// Bucketheadland, Nottingham Lace, Jordan, Soothsayer from its middle on); modes and multiball take their craziest
// stretches; the mellow ones (Padmasana, Big Sur Moon, Colma's Whitewash, Soothsayer's quiet start) only play at game over.
const sections={
 'welcome-to-bucketheadland':[[0,32,2],[32,62,[2,3]],[62,94,2],[94,136,[2,3]],[136,148,2],[148,222,[2,3]]],
 'nottingham-lace':[[0,20,[2,3]],[20,28,2],[28,393,[2,3]]],
 'jordan':[[0,8,[2,3]],[8,235,[2,3]]],
 'soothsayer':[[0,112,1],[112,383,2],[383,541,[2,3]]],
 'padmasana':[[0,695,1]],
 'big-sur-moon':[[0,70,1]],
 'whitewash':[[0,282,1]],
};
// Modes with a song of their own (others take a crazy part). from = where it starts.
const roles={
 jordan:{song:'jordan',from:0},                       // JORDAN MULTIBALL: the build-up into the riff
 soothsayer:{song:'soothsayer',from:383},             // Soothsayer attraction: the closing solo
 coop:{song:'nottingham-lace',from:28},               // Chicken Coop Panic (Enter the Chicken)
 wizard:{song:'welcome-to-bucketheadland',from:94},   // WELCOME TO BUCKETHEADLAND wizard mode: its heaviest stretch
};
// Machine sound → guitar (a list = one picked at random). one = a clip (off/dur = a slice, rate = pitch range),
// lick = a solo from the lick set (gtr-big/mid/short/tiny), grain = tiny random slices. The clip replaces the synth sound
// unless replace:false. Owner (Nov 1): in play only the generic guitar noises (pick scrapes, amp, clicks, sparks...);
// solos only when a ball is lost and for the really big moments (super jackpot, game over), so the songs come through.
// vol: measured on the bus (s.debug.audioMeter) to these loudest-50 ms levels before sfxLevel: big moments -19,
// awards -21, normal hits -23, small fast ones -26 dBFS; sfxLevel then takes everything down together (songs ≈ -17).
const sfx={
 start:{one:'fx-amp-on',vol:.25},                                          // amp switches on for each ball
 plunge:{one:'fx-rev',vol:.28},autoPlunge:{one:'gtr-scrape',vol:.18},
 bumper:{one:'fx-sparks',dur:.24,rate:[.94,1.08],vol:.27},
 sling:{one:'fx-cheap-lead',dur:.32,rate:[.95,1.06],vol:.26},
 drop:{one:'fx-fretted',dur:.42,rate:[.96,1.06],vol:.99},
 standup:{one:'fx-fretted',off:.25,dur:.3,rate:[1.05,1.25],vol:.5},
 rollover:{one:'gtr-scrape',dur:.3,rate:[1.1,1.3],vol:.21},
 spin:{grain:'fx-mice',len:.06,vol:.39},
 hole:{one:'fx-knock',vol:.25},eject:{one:'fx-rev',dur:.55,vol:.38},kick:{one:'fx-rev',dur:.7,vol:.38},
 nudge:{one:'fx-amp-on',dur:.32,vol:.26},
 ramp:{one:'fx-scraper',dur:1.3,rate:[.95,1.08],vol:.21},                  // the ball heads up a ramp
 rail:{one:'fx-cats',dur:.8,rate:[.95,1.08],vol:.2},                      // a ramp / wireform made
 award:{one:'fx-stutter',dur:1,vol:.37},
 lock:{one:'fx-trem',vol:.33},
 skill:{one:'gtr-wail',vol:.25},
 jackpot:{one:'fx-wail',dur:2.2,vol:.39},
 multiball:{one:'gtr-wail',vol:.21},                                        // multiball and every mode start
 knocker:{one:'fx-wail',dur:2.6,vol:.39},                                  // extra ball / replay / high score
 save:{one:'gtr-hold',vol:.42},
 super:{lick:'gtr-big',prio:4,vol:.48},                                    // super jackpot, mode complete, wizard, robot beaten
 drain:{lick:'gtr-mid',prio:3,vol:.49},                                     // ball lost: a solo while the bonus counts
 tiltDrain:{one:'fx-diving',vol:.32},
 danger:{one:'fx-sixty-cop',vol:.97},tilt:{one:'fx-unplug',vol:.28},
 bonus:{one:'fx-cheap-lead',dur:.16,rate:[.9,1.25],vol:.2},
 gameOver:{lick:'gtr-big',prio:4,vol:.55},
};
// The machine's own synth sounds that stay (flippers, gates, walls, the rolling ball): one trim on the bus so the
// flipper clack sits with the small clips (-26); gate/wall ticks keep their place under it.
const synthTrim={all:.62,roll:.62};
// every sound on the bus together (owner: still a little loud next to the songs)
const sfxLevel=.7;
const audio={prefix:'bhpin',artist:'Buckethead',songs,sections,roles,sfx,synthTrim,sfxLevel};
Object.assign(exports,{audio});
