// Flappy Disaster stage art. Every picture is optional: assets/flappy/<slot>.webp|png -> USER_PORTRAITS['flappy:<slot>']
// (tools/build.mjs); a missing one is drawn by the game (the stage's own bg()/ground() in src/engines/flappyDisaster.js).
// Per stage <id> (FLAPPY_STAGES):
//   bg-<id>     2048 x 1248: the scenery behind the pipes, from the top of the screen down to the ground line. It REPEATS
//               side to side as the bird flies (the right edge must join the left edge seamlessly) and scrolls slowly
//               (parallax), so one picture fits every screen shape: phones, 16:9 and the Fold see more or less of the strip.
//   bg-<id>-tall 1080 x 1920 / bg-<id>-fold 1504 x 1670: the same scene framed for an upright phone / the open Fold
//               (src/bgShape.js picks the one for the screen, falling back to the nearest shape); repeated mirrored.
//   ground-<id> 512 x 192: the ground strip under the pipes; repeats side to side, scrolls with the pipes.
//   pipe-<id>   192 x 256: the obstacle's BODY, repeated down the column (top and bottom edges join seamlessly). The solid
//               part is the middle 128 px (x 32-160 = the 64 units the bird collides with); x 0-32 / 160-192 are for small
//               overhangs (bolts, leaves, drips), transparent otherwise.
//   pipe-<id>-end 192 x 160: the obstacle's END at the gap, drawn as is on the bottom obstacle (top edge = the gap edge) and
//               flipped upside down on the top one. Same 128 px solid middle; a rim/cap may use the whole 192 px width.
// Brief docs/art-for-gpt/FLAPPY-ART.md, templates + references: python3 tools/flappy-templates.py.
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
// what each stage is (for the brief and the templates); ids match FLAPPY_STAGES
const STAGE_ART={
 classic:{name:'FLAPPY CLASSIC',bg:'a bright cheerful cartoon day: teal sky, puffy clouds, a pale low-rise city skyline and a row of round green bushes along the bottom',ground:'sandy dirt under a strip of bright green grass with a darker stripe pattern'},
 meat:{name:'THE MEAT LOCKER',bg:'the inside of a dark red walk-in freezer: hanging meat carcasses on hooks along rails, frosty breath, blood-red gloom, crates in the back',ground:'grimy grey steel floor tiles with drain grates and blood puddles'},
 fuzzy:{name:'FUZZY WUZZY HELL',bg:'an unbearably cute pink world: candy-pink sky, fluffy white cloud puffs, round pink fuzzy hills, little hearts, sinister under the cuteness',ground:'rainbow stripes of plush carpet'},
 pokemon:{name:'ROUTE 1 (PROBABLY)',bg:'a 90s handheld-RPG countryside route: light blue sky, rounded green hills, chunky round trees, tall grass, a little signpost (no real game characters or logos)',ground:'short green grass with spiky tufts over a sandy path'},
 hell:{name:'THE NINTH CIRCLE',bg:'hell: dark red sky, jagged black rock spires, rivers of lava glow, smoke, distant tortured silhouettes',ground:'bubbling orange lava with glowing yellow blobs'},
 space:{name:'ZERO-G (NOT REALLY)',bg:'deep space: black-blue starfield, a big orange gas planet, nebula haze, a far space station',ground:'grey cratered moon surface'},
 sea:{name:'DAVY JONES’ PIPE LOCKER',bg:'deep underwater: blue light rays from above, kelp forests, coral mounds, a sunken ship in the gloom',ground:'pale sand with coral and starfish'},
 office:{name:'DUNDER MIFFLAP',bg:'a drab mid-size paper company office: grey-blue cubicle walls, filing cabinets, fluorescent ceiling lights, windows to a parking lot (no real logos)',ground:'worn green-grey office carpet tiles'},
 grave:{name:'NIGHT OF THE LIVING FLAP',bg:'a misty graveyard at night: big pale moon, crooked tombstones, dead trees, bats, a creepy chapel far back',ground:'dark mossy earth with a grassy edge'},
 vapor:{name:'A E S T H E T I C',bg:'vaporwave: pink-to-orange sunset gradient, a striped setting sun, a purple neon grid floor running to the horizon, palm silhouettes, a marble bust',ground:'dark purple with cyan neon grid lines in perspective'},
 candy:{name:'SUGAR RUSH',bg:'a candy land: pastel blue sky, gumdrop hills, lollipop trees, frosting clouds, a gingerbread house far back (our own design)',ground:'chocolate cake with a thick white frosting top'},
 upside:{name:'THE UPSIDE DOWN',bg:'a dark mirror-world town: blue-black sky with red lightning, floating ash spores, dead vines over everything, a twisted tree line (no characters)',ground:'black earth with fleshy vines'},
 sewer:{name:'COWABUNGA SEWERS',bg:'a big city sewer tunnel: mossy green brick walls, pipes, dripping water, glowing green ooze, a pizza box floating by (no characters)',ground:'glowing green sewer sludge'},
 vegas:{name:'LOST WAGES',bg:'a Las Vegas strip at night: neon casino towers, marquee lights, a purple sky, searchlights (made-up casino names only)',ground:'red casino carpet with a gold pattern'},
 arctic:{name:'BRAIN FREEZE',bg:'a bright arctic: icy blue sky, snowy mountains, glaciers, icebergs, a little igloo',ground:'packed snow with a blue ice crust'},
 disco:{name:'DISCO INFERNO',bg:'a 70s disco: dark purple club, a giant mirror ball, coloured spotlight beams, a crowd in silhouette',ground:'a lit-up dance floor of coloured glowing squares'}};
// what each stage's obstacle is (pipe-<id> body + pipe-<id>-end at the gap)
const PIPE_ART={
 classic:['a classic green pipe: glossy green tube with a darker edge and a light streak','the same pipe\'s wider green rim lip at the open end'],
 meat:['a frosted grey steel post with a dark edge','the post end with two steel meat hooks and a hanging red cut of meat (the top obstacle shows it upside down: hooks hanging into the gap)'],
 fuzzy:['a pink plush fur column with a darker pink edge','a fluffy pink pom-pom cap with a little heart'],
 pokemon:['a stack of round bushy cartoon trees (one tree per 128 px, each a round green crown)','the last round tree crown of the stack'],
 hell:['a column of dark red rock with bones stacked up it','a horned skull on the end'],
 space:['a grey steel space-station girder with diagonal cross bracing','the girder end with a cap plate and a red beacon light'],
 sea:['a thick twisting stalk of dark green kelp','kelp fronds spreading out at the end'],
 office:['a stack of grey metal filing-cabinet drawers with handles','the top of the cabinet with a desk lamp and loose papers (our own office, no logos)'],
 grave:['stacked grey stone tomb blocks','a weathered tombstone with a cross on top'],
 vapor:['a white marble Greek column with fluting, pastel pink/cyan light','a marble column capital (top piece) with a pastel glow'],
 candy:['a red-and-white diagonal striped candy cane stick','the candy cane\'s rounded end with a shine'],
 upside:['a black column wrapped in red fleshy vines','torn vine ends and floating ash spores at the end'],
 sewer:['a mossy green sewer pipe with rust bands','the pipe\'s open mouth dripping glowing green ooze'],
 vegas:['a dark marquee column lined with gold light bulbs','a neon marquee sign top with bulbs (made-up words or none)'],
 arctic:['a pale blue ice pillar with frost and cracks','the ice pillar end with hanging icicles'],
 disco:['a column of glowing coloured disco-floor squares','a mirror ball cap with sparkles']};
const SLOTS={};
for(const [id,a] of Object.entries(STAGE_ART)){
 SLOTS['bg-'+id]={w:2048,h:1248,stage:id,what:`${a.name}: ${a.bg}. Repeats side to side (seamless left/right edges), bottom edge = the ground line.`};
 SLOTS['bg-'+id+'-tall']={w:1080,h:1920,stage:id,what:`${a.name}: ${a.bg}. Upright phone framing (1080x1920), bottom edge = the ground line.`};
 SLOTS['bg-'+id+'-fold']={w:1504,h:1670,stage:id,what:`${a.name}: ${a.bg}. Galaxy Fold framing (1504x1670), bottom edge = the ground line.`};
 SLOTS['ground-'+id]={w:512,h:192,stage:id,what:`${a.name} ground strip: ${a.ground}. Repeats side to side (seamless).`};
 const pa=PIPE_ART[id];if(pa){SLOTS['pipe-'+id]={w:192,h:256,stage:id,what:`${a.name} obstacle body: ${pa[0]}. Repeats top to bottom (seamless), solid part = the middle 128 px.`};
  SLOTS['pipe-'+id+'-end']={w:192,h:160,stage:id,what:`${a.name} obstacle end at the gap: ${pa[1]}. Top edge = the gap edge.`};}}
const imgs=new Map();let ver=0;
function picture(name){const url=USER['flappy:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['flappy:'+name];
function ready(names=Object.keys(SLOTS),ms=4000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
Object.assign(exports,{STAGE_ART,PIPE_ART,SLOTS,picture,has,ready,version:()=>ver});
