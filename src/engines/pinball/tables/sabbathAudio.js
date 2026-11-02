// Black Sabbath's recorded audio (owner's files, Nov 1): five Black Sabbath songs as the soundtrack
// (assets/music/bspin-<slug>.mp3, README there), played by the music director in src/engines/pinball/tableAudio.js the
// same way as Bucketheadland's: the riffs from the title on, the heaviest stretches for modes and multiball, the slow
// doom only at game over. The table keeps its own synth sounds. Without the files it keeps its synth songs.
const songs={
 'war-pigs':{title:'War Pigs / Luke\'s Wall',album:'Paranoid'},
 'electric-funeral':{title:'Electric Funeral',album:'Paranoid'},
 'black-sabbath':{title:'Black Sabbath',album:'Black Sabbath'},
 'sweet-leaf':{title:'Sweet Leaf',album:'Master of Reality'},
 'children-of-the-grave':{title:'Children of the Grave',album:'Master of Reality'},
};
// gain (dB), measured as the game hears them (loudest 50 ms in every 1.6 s, median about -17.1 dBFS)
for(const [k,g] of Object.entries({'sweet-leaf':-1.4,'electric-funeral':.7}))songs[k].gain=g;
// Sections [from s, to s, level or [levels]]: 1 chill (game over only), 2 play, 3 crazy (modes, multiball). Measured
// (loudness, brightness, note density every 2 s, smoothed, cut at phrase dips): "chill" is the slow doom (Black Sabbath's
// verses, War Pigs' siren intro, the fade-outs); the heaviest = the gallop at the end of Black Sabbath, War Pigs from its
// verse riff on, Children of the Grave, Sweet Leaf, Electric Funeral's riffs.
const sections={
 'war-pigs':[[0,102,[1,2]],[102,272,[2,3]],[272,310,2],[310,343,[2,3]],[343,361,2],[361,471,[2,3]]],
 'electric-funeral':[[0,98,[2,3]],[98,138,2],[138,248,[2,3]],[248,286,1]],
 'black-sabbath':[[0,32,[1,2]],[32,66,[2,3]],[66,136,1],[136,166,[2,3]],[166,238,2],[238,377,[2,3]]],
 'sweet-leaf':[[0,302,[2,3]]],
 'children-of-the-grave':[[0,276,[2,3]],[276,314,1]],
};
// Modes with a song of their own (rules.music names; the rest take a heavy part). from = where it starts.
const roles={
 warpigs:{song:'war-pigs',from:102},                  // WAR PIGS MULTIBALL: from the verse riff
 master:{song:'sweet-leaf',from:0},                   // MASTER OF REALITY: its opener, cough and all
 bloody:{song:'children-of-the-grave',from:0},        // the Graveyard mode: Children of the Grave
 wizard:{song:'black-sabbath',from:238},              // HEAVEN AND HELL wizard: Black Sabbath's closing gallop
};
const audio={prefix:'bspin',artist:'Black Sabbath',songs,sections,roles};
Object.assign(exports,{audio});
