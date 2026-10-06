// Content pack: tarantinoPack. A Quentin Tarantino minigame set. Each engine lives in src/engines/tarantino*.js.
// Engines are required lazily: loading them while the registry initialises would create a require cycle.
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={tarantinoStandoff:lazy("src/engines/tarantinoStandoff.js","standoff"),tarantinoTwist:lazy("src/engines/tarantinoTwist.js","twist"),tarantinoAdrenaline:lazy("src/engines/tarantinoAdrenaline.js","adrenaline")};
const games=[
 {id:'tarantino-standoff',engine:'tarantinoStandoff',title:'Reservoir Dogs · Mexican Standoff',source:'Reservoir Dogs',icon:'🔫',category:'duel',level:'body',duration:'best of 5',
  rules:'REAL TWO-PLAYER reflex duel. Tap your half the instant DRAW! flashes: tapping early is a flinch and loses the round. Watch for fake-outs (a falling ash, a ringing phone, a "wait…"). In the triangle rounds Mr. Blonde shoots whoever draws first, so draw and then tap again fast to drop him. First to three rounds. P1 Space, P2 Enter.'}
 ,{id:'tarantino-twist',engine:'tarantinoTwist',title:'Pulp Fiction · Twist Contest',source:'Pulp Fiction',icon:'🕺',category:'skill',level:'spirit',duration:'about 65 seconds',
  rules:'REAL TWO-PLAYER dance-off at Jack Rabbit Slim\'s. Glyphs scroll down your half to a surf-rock twist; tap the matching lane when a glyph reaches the ring. Perfect and Good hits build a combo multiplier up to x4, and your hits play the lead guitar. Highest score takes the trophy. P1 A S W D, P2 arrow keys.'}
 ,{id:'tarantino-adrenaline',engine:'tarantinoAdrenaline',title:'Pulp Fiction · Adrenaline Shot',source:'Pulp Fiction',icon:'💉',category:'skill',level:'body',duration:'5 rounds',
  rules:'REAL TWO-PLAYER panic: each Vincent has a giant needle and his own patient. Drag the needle onto the red marker over the pounding heart (it fades as the rounds get shakier), then RELEASE to plunge when the dose meter is in the green. Closer, better-timed and faster scores more. P1 WASD + Space, P2 arrows + Enter.'}
];
const events=[];
Object.assign(exports,{engines,games,events});
