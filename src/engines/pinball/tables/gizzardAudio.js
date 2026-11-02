// King Gizzard's recorded audio (owner's files, Nov 1): eight King Gizzard & the Lizard Wizard songs as the soundtrack
// (assets/music/kgpin-<slug>.mp3, README there), played by the music director in src/engines/pinball/tableAudio.js the
// same way as Bucketheadland's: the fuzz and the heavy songs from the title on, the craziest stretches for modes and
// multiball, the calmer bits only at game over. The table keeps its own synth sounds (no guitar set). Without the files
// it keeps its synth songs (gizzardMusic.js).
const songs={
 'robot-stop':{title:'Robot Stop',album:'Nonagon Infinity'},
 'people-vultures':{title:'People-Vultures',album:'Nonagon Infinity'},
 'rattlesnake':{title:'Rattlesnake',album:'Flying Microtonal Banana'},
 'nuclear-fusion':{title:'Nuclear Fusion',album:'Flying Microtonal Banana'},
 'mars-for-the-rich':{title:'Mars for the Rich',album:'Infest the Rats\' Nest'},
 'crumbling-castle':{title:'Crumbling Castle',album:'Polygondwanaland'},
 'im-in-your-mind':{title:'I\'m in Your Mind',album:'I\'m in Your Mind Fuzz'},
 'im-not-in-your-mind':{title:'I\'m Not in Your Mind',album:'I\'m in Your Mind Fuzz'},
};
// gain (dB), measured as the game hears them (loudest 50 ms in every 1.6 s, median about -17.7 dBFS): the two Fuzz songs
// sit ~2 dB under the rest (raised as far as the player allows), Mars for the Rich ~1 dB over.
for(const [k,g] of Object.entries({'im-in-your-mind':.7,'im-not-in-your-mind':.7,'mars-for-the-rich':-1}))songs[k].gain=g;
// Sections [from s, to s, level or [levels]]: 1 chill (game over only), 2 play, 3 crazy (modes, multiball). Measured
// (loudness, brightness, note density every 2 s, smoothed, cut at phrase dips) against these songs only, so "chill"
// means their calmer stretches (Nuclear Fusion's intro and outro, the Fuzz B-side, Crumbling Castle's breather).
const sections={
 'robot-stop':[[0,12,[2,3]],[12,322,[2,3]]],
 'people-vultures':[[0,30,2],[30,260,[2,3]],[260,286,2]],
 'mars-for-the-rich':[[0,168,[2,3]],[168,214,2],[214,252,[2,3]]],
 'rattlesnake':[[0,18,2],[18,467,[2,3]]],
 'crumbling-castle':[[0,16,2],[16,196,[2,3]],[196,208,2],[208,286,[2,3]],[286,333,2],[333,379,[2,3]],[379,425,2],[425,457,[2,3]],[457,485,1],[485,643,[2,3]]],
 'im-in-your-mind':[[0,214,2]],
 'im-not-in-your-mind':[[0,178,[1,2]]],
 'nuclear-fusion':[[0,32,[1,2]],[32,86,2],[86,112,[2,3]],[112,152,2],[152,180,[2,3]],[180,242,2],[242,256,1]],
};
// Modes with a song of their own (rules.music names; the rest take a crazy part). from = where it starts.
const roles={
 rattlesnake:{song:'rattlesnake',from:18},           // RATTLESNAKE MULTIBALL
 nonagon:{song:'robot-stop',from:12},                 // NONAGON INFINITY: the album's opener (and the loop it never leaves)
 rats:{song:'mars-for-the-rich',from:0},              // INFEST THE RATS' NEST attraction
 banana:{song:'nuclear-fusion',from:86},              // FLYING MICROTONAL BANANA attraction: its heaviest stretch
 omnium:{song:'crumbling-castle',from:485},           // OMNIUM GATHERUM wizard: Crumbling Castle's closing onslaught
};
const audio={prefix:'kgpin',artist:'King Gizzard & the Lizard Wizard',songs,sections,roles};
Object.assign(exports,{audio});
