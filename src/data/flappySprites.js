// Flappy Disaster stage art. Every picture is optional: assets/flappy/<slot>.webp|png -> USER_PORTRAITS['flappy:<slot>']
// (tools/build.mjs); a missing one is drawn by the game (the stage's own bg()/ground() in src/engines/flappyDisaster.js).
// Per stage <id> (FLAPPY_STAGES):
//   bg-<id>     2048 x 1248: the scenery behind the pipes, from the top of the screen down to the ground line. It REPEATS
//               side to side as the bird flies (the right edge must join the left edge seamlessly) and scrolls slowly
//               (parallax), so one picture fits every screen shape: phones, 16:9 and the Fold see more or less of the strip.
//   bg-<id>-tall 1080 x 1920 / bg-<id>-fold 1504 x 1670: the same scene framed for an upright phone / the open Fold
//               (src/bgShape.js picks the one for the screen, falling back to the nearest shape); repeated mirrored.
//   ground-<id> 512 x 192: the ground strip under the pipes; repeats side to side, scrolls with the pipes.
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
const SLOTS={};
for(const [id,a] of Object.entries(STAGE_ART)){
 SLOTS['bg-'+id]={w:2048,h:1248,stage:id,what:`${a.name}: ${a.bg}. Repeats side to side (seamless left/right edges), bottom edge = the ground line.`};
 SLOTS['bg-'+id+'-tall']={w:1080,h:1920,stage:id,what:`${a.name}: ${a.bg}. Upright phone framing (1080x1920), bottom edge = the ground line.`};
 SLOTS['bg-'+id+'-fold']={w:1504,h:1670,stage:id,what:`${a.name}: ${a.bg}. Galaxy Fold framing (1504x1670), bottom edge = the ground line.`};
 SLOTS['ground-'+id]={w:512,h:192,stage:id,what:`${a.name} ground strip: ${a.ground}. Repeats side to side (seamless).`};}
const imgs=new Map();let ver=0;
function picture(name){const url=USER['flappy:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['flappy:'+name];
function ready(names=Object.keys(SLOTS),ms=4000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
Object.assign(exports,{STAGE_ART,SLOTS,picture,has,ready,version:()=>ver});
