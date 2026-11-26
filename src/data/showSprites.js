// Game-show art slots for The Price Is Right games: PLINKO (plinko-show), THE BIG WHEEL (big-wheel), CLIFF HANGERS (cliff-hangers), THE CLOCK GAME (clock-game), RANGE GAME, SAFE CRACKERS, RACE GAME, PUNCH-A-BUNCH. Every picture is optional:
// assets/gameshow/<slot>.webp|png -> USER_PORTRAITS['show:<slot>'] (tools/build.mjs); a missing one is drawn by the game
// (src/engines/gameshow/stage.js). Templates: node tools/gameshow-templates.mjs -> docs/art-for-gpt/gameshow-templates,
// brief docs/art-for-gpt/GAMESHOW-ART.md. The owner later had GPT paint the classic-era show look (host + two assistants as
// photoreal people, Nov 23 delivery UPLOADS-GPT-2026-11-23-2100); the drawn studio/host stay as the fallback.
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
// people sheets: one row of poses, each frame w x h, feet at the bottom middle
// CONTESTANTS' ROW (contestantsRow.js): the contestant body sheets cr-body-1..4 = one row of 9 poses, each cell 256 x 512, headless
// (the game puts the player's / guest's face on SPOT), feet on FEET; UNIT = the body height in px the game's h maps to. The podium
// picture: the game prints the bid in its BID window (orange LED figures) and the name under it.
const CR_BODY={w:256,h:512,frames:['stand','run1','run2','run3','run4','jump','cheer','clap','sad'],feet:[128,500],spot:[128,85],unit:480,face:[0,.865],faceW:.14};
const CR_PODIUM={w:600,h:500,bid:[110,60,490,170]};
// the studio audience (gameshow/audience.js): cr-fan-1..8 = one headless audience member per sheet, 8 poses of 256 x 512, same feet/
// face spot/unit as the contestant sheets (clap1/clap2 and cheer1/cheer2 alternate to animate)
const CR_FAN={...CR_BODY,frames:['stand','clap1','clap2','cheer1','cheer2','jump','wave','point']};
// GPT's sheets have the 8 standing poses (everyone is on their feet during a call-down); a later sheet with 4 more seated poses
// (sit, sitclap1/2, sitcheer, face lower) is picked up by the frame count
CR_FAN.spots=CR_FAN.frames.map(f=>f.startsWith('sit')?[128,195]:[128,85]);
// one empty theater seat, front view: FLOOR = where it stands (the middle of the seat at the floor); w = one seat pitch
const CR_SEAT={w:256,h:320,floor:[128,316]};
const HOST={w:512,h:1024,frames:['talk','point','cheer'],feet:[256,1004]};
const MODEL={w:512,h:1024,frames:['present','wave','clap'],feet:[256,1004]};
// the Plinko board picture covers the whole board box = 2 px per board unit (board 900 x 1272 units, plinkoShow.js: pegs from
// y 150 every 74, slots from y 1102 to 1252, slot walls every 100); the game draws pegs, prizes, chips over it
const PLINKO_GEOM={w:1800,h:2544,scale:2};
// the Big Wheel cabinet picture: the turning sections are drawn inside WINDOW (x0,y0,x1,y1 in picture px), the pointer at the middle
const WHEEL_GEOM={w:900,h:1500,window:[240,150,660,1350]};
// CLIFF HANGERS: the mountain prop picture (transparent around it). The climber walks a straight path from step 0 (STEP0) to step 25
// (STEP25) in picture px, then the flat ledge to the cliff EDGE and falls off the right side. The game draws the step ticks and the
// numbered markers (0, 5 ... 25) along the path, so the picture has no numbers. CLIMBER: one row of poses, feet at the bottom middle,
// facing right (up the mountain). STAND: the small-prize pedestal, the game prints the guess/price in its PRICE window.
const CLIFF_GEOM={w:1600,h:1000,step0:[250,862],step25:[1240,262],edge:[1330,262]};
// unit = the game's climber size h for 1 picture px (hat top ~295 px above the feet when drawn at h 250)
const CLIMBER={w:256,h:320,frames:['stand','walk1','walk2','walk3','walk4','yodel','teeter','fall'],feet:[128,308],unit:250};
const STAND_GEOM={w:600,h:600,top:[300,250],price:[150,330,450,430]};
// THE CLOCK GAME: the big clock prop (face only; the game turns the sweep hand round CENTER, one turn = 60 s, the game uses 30), the
// sweep hand (pointing up, turned round PIVOT), the price display (the game prints the guess / the price in WINDOW), the prize platform.
const CLOCK_GEOM={w:1000,h:1000,c:[500,500],r:440};
const HAND_GEOM={w:120,h:520,pivot:[60,460],len:440};
const DISPLAY_GEOM={w:900,h:300,window:[90,70,810,230]};
const PLATFORM_GEOM={w:800,h:500,top:[400,340]};
// RANGE GAME: the tall price board (the game prints the $ marks left of the SCALE strip: bottom = low, top = +$6,000), the sliding
// range finder (its see-through WINDOW covers $1,500 = a quarter of the strip), the big stop button.
const RANGE_GEOM={w:600,h:1600,scale:[230,140,410,1460]};
const FINDER_GEOM={w:260,h:400,window:[20,35,240,365]};
const BUTTON_GEOM={w:400,h:400};
// SAFE CRACKERS: the safe front (the game prints the 3 combination digits in the DIAL box, thirds), the open safe (the two prizes stand
// in INSIDE, big one on the top shelf, small one on the bottom), a digit tile (the game prints the digit).
const SAFE_GEOM={w:1000,h:1100,dial:[230,420,770,600],handle:[500,820],inside:[160,160,840,900]};
const TILE_GEOM={w:300,h:360};
// RACE GAME: a prize podium (prize photo on TOP, the price tag hangs at TAG), the blank price tag (game prints $ in TEXT), the lever
// board (4 lights at LIGHTS = x,y,r; the game lights them), the lever (turned round PIVOT when pulled).
const PODIUM_GEOM={w:600,h:700,top:[300,300],tag:[300,500]};
const RTAG_GEOM={w:520,h:240,text:[110,30,500,210]};
const RBOARD_GEOM={w:1000,h:500,lights:[[200,310,70],[400,310,70],[600,310,70],[800,310,70]]};
const LEVER_GEOM={w:200,h:520,pivot:[100,470]};
// PUNCH-A-BUNCH: the punchboard (10 x 5 holes in GRID; the game draws a paper cover on each hole and the torn hole after a punch),
// one paper-covered hole, the unfolded slip (game prints the $ in TEXT).
const PBOARD_GEOM={w:2000,h:1160,grid:[120,220,1880,1100],cols:10,rows:5};
const PAPER_GEOM={w:200,h:200};
const SLIP_GEOM={w:640,h:320,text:[70,50,570,270]};
const SLOTS={
 'stage-plinko':{w:1920,h:1080,what:'the Plinko studio, wide: big colourful 70s/80s game-show set, the board stands in the middle (leave the middle 40% calm)'},
 'stage-plinko-tall':{w:1080,h:1920,what:'the same studio for upright phones'},
 'stage-wheel':{w:1920,h:1080,what:'the Big Wheel studio, wide: set with flashing bulbs, the wheel stands in the middle (leave the middle 40% calm)'},
 'stage-wheel-tall':{w:1080,h:1920,what:'the same studio for upright phones'},
 'stage-plinko-fold':{w:1504,h:1670,what:'the same studio for near-square screens (the open Fold)'},
 'stage-wheel-fold':{w:1504,h:1670,what:'the same studio for near-square screens (the open Fold)'},
 curtain:{w:1920,h:1080,what:'the sparkly studio curtain that rises at the start (fills the screen)'},
 'plinko-board':{w:1800,h:2544,what:'the Plinko board without pegs, chips or prize numbers: frame, backing, top lights, the 9 slot boxes at the bottom (game prints the prizes)'},
 'stage-cliff':{w:1920,h:1080,what:'the Cliff Hangers studio, wide: the mountain stands on the left 60% (keep it calm there), the prize table on the right'},
 'stage-cliff-tall':{w:1080,h:1920,what:'the same studio for upright phones: the mountain stands in the top 45%'},
 'stage-cliff-fold':{w:1504,h:1670,what:'the same studio for near-square screens (the open Fold)'},
 'cliff-mountain':{w:1600,h:1000,what:'the Cliff Hangers mountain prop: a snowy alpine mountain with a climbing path from the bottom left (step 0) up to a flat ledge at the top right that ends in a sheer cliff; NO numbers (the game draws the step markers); transparent around'},
 'cliff-climber':{w:2048,h:320,what:'the little mountain climber (the yodeler) in lederhosen and an alpine hat with a feather, 8 poses facing right: STAND, WALK 1-4, YODEL (arms up), TEETER (arms windmilling on the edge), FALL; transparent'},
 'cliff-stand':{w:600,h:600,what:'a small-prize pedestal seen from the front: the prize sits on top (game draws it), a lit price display window on the front (game prints the price)'},
 'cliff-logo':{w:1400,h:500,what:'CLIFF HANGERS in big lit-up game-show letters, transparent'},
 'stage-clock':{w:1920,h:1080,what:'the Clock Game studio, wide: the big clock stands on the left 45% (keep it calm there), the prize + price display on the right'},
 'stage-clock-tall':{w:1080,h:1920,what:'the same studio for upright phones: the clock stands in the top third'},
 'stage-clock-fold':{w:1504,h:1670,what:'the same studio for near-square screens (the open Fold)'},
 'clock-face':{w:1000,h:1000,what:'the Clock Game clock seen straight on: a big round clock with a bright frame, white face, 60 second ticks and the numbers 5 to 60; NO hand (the game draws it); centre exactly in the middle; transparent around'},
 'clock-hand':{w:120,h:520,what:'the clock sweep hand pointing straight up, red, with a round hub on the pivot dot; transparent'},
 'clock-display':{w:900,h:300,what:'the Clock Game price display: a dark lit board under the prize, the game prints the guess and the price in the window'},
 'clock-platform':{w:800,h:500,what:'a glossy turntable/platform the prize stands on (the game puts the prize photo on the dot)'},
 'clock-logo':{w:1400,h:500,what:'CLOCK GAME (or THE CLOCK GAME) in big lit-up game-show letters, transparent'},
 'plinko-chip':{w:256,h:256,what:'one Plinko chip seen face on (a thick round puck), transparent around'},
 'plinko-logo':{w:1400,h:500,what:'the word PLINKO in big lit-up 70s game-show letters, transparent'},
 'wheel-logo':{w:1400,h:500,what:'THE BIG WHEEL in big lit-up game-show letters, transparent'},
 'wheel-frame':{w:900,h:1500,what:'the tall Big Wheel cabinet: chrome side rails, bulbs, base, with a see-through window where the turning sections show (the game draws them)'},
 host:{w:1536,h:1024,what:'our own game-show host, full body, 3 poses (talk, point, cheer), transparent'},
 model:{w:1536,h:1024,what:'show assistant 1, full body in a sparkly gown, 3 poses (present, wave, clap), transparent'},
 'model-2':{w:1536,h:1024,what:'show assistant 2, a different look, same 3 poses, transparent'},
 'stage-range':{w:1920,h:1080,kind:'range',what:'the Range Game studio, wide, EMPTY: just the set (walls, doors, lights, floor) with NO board, button, turntable or prize: the game draws all of those in the dashed box'},
 'stage-range-tall':{w:1080,h:1920,kind:'range',what:'the same studio for upright phones'},
 'stage-range-fold':{w:1504,h:1670,kind:'range',what:'the same studio for near-square screens (the open Fold)'},
 'range-board':{w:600,h:1600,mod:'src/engines/rangeGame.js',guides:[{r:[230,140,180,1320],t:'SCALE STRIP: bottom = low price, top = high; the game prints the $ marks to its left'}],what:'the Range Game price board: a tall lit frame with a vertical scale strip (green at the bottom to red at the top); NO numbers (the game prints them)'},
 'range-finder':{w:260,h:400,mod:'src/engines/rangeGame.js',guides:[{r:[20,35,220,330],t:'SEE-THROUGH WINDOW'}],what:'the range finder: a lit yellow frame with a see-through window that slides up the board'},
 'range-button':{w:400,h:400,mod:'src/engines/rangeGame.js',guides:[{r:[30,120,340,250],t:'the big button (top half lights up)'}],what:'the big red stop button on a chrome stand, seen from the front'},
 'range-logo':{w:1400,h:500,what:'RANGE GAME in big lit-up game-show letters, transparent'},
 'stage-safe':{w:1920,h:1080,kind:'safe',what:'the Safe Crackers studio, wide, EMPTY: just the set with NO safe, sign or prizes: the game draws them in the dashed box'},
 'stage-safe-tall':{w:1080,h:1920,kind:'safe',what:'the same studio for upright phones'},
 'stage-safe-fold':{w:1504,h:1670,kind:'safe',what:'the same studio for near-square screens (the open Fold)'},
 safe:{w:1000,h:1100,mod:'src/engines/safeCrackers.js',guides:[{r:[230,420,540,180],t:'DIAL: 3 dark digit windows (the game prints the digits)'},{c:[500,820,150],t:'handle'}],what:'the giant game-show safe, door SHUT, seen straight on: steel, rivets, a brass COMBINATION plate with 3 dark digit windows, a spoked handle'},
 'safe-open':{w:1000,h:1100,mod:'src/engines/safeCrackers.js',guides:[{r:[160,160,680,740],t:'INSIDE: lit, two shelves (the game puts the prize photos here)'}],what:'the same safe with the door swung OPEN: a lit empty inside with two shelves'},
 'safe-tile':{w:300,h:360,mod:'src/engines/safeCrackers.js',guides:[{r:[50,50,200,260],t:'blank: the game prints the digit'}],what:'a lit gold number tile (blank) the contestant moves into the dial'},
 'safe-logo':{w:1400,h:500,what:'SAFE CRACKERS in big lit-up game-show letters, transparent'},
 'stage-race':{w:1920,h:1080,kind:'race',what:'the Race Game studio, wide, EMPTY: just the set with NO podiums, lever board or sign: the game draws them in the dashed box'},
 'stage-race-tall':{w:1080,h:1920,kind:'race',what:'the same studio for upright phones'},
 'stage-race-fold':{w:1504,h:1670,kind:'race',what:'the same studio for near-square screens (the open Fold)'},
 'race-podium':{w:600,h:700,mod:'src/engines/raceGame.js',guides:[{r:[90,40,420,260],t:'the prize photo stands here'},{c:[300,500,30],t:'TAG hangs here'}],what:'a blue prize podium seen from the front with a hook where the price tag hangs; transparent around'},
 'race-tag':{w:520,h:240,mod:'src/engines/raceGame.js',guides:[{r:[110,30,390,180],t:'blank: the game prints the price'}],what:'a big blank price tag (hole on the left), transparent around'},
 'race-board':{w:1000,h:500,mod:'src/engines/raceGame.js',guides:[{c:[200,310,70],t:'1'},{c:[400,310,70],t:'2'},{c:[600,310,70],t:'3'},{c:[800,310,70],t:'4'}],what:'the Race Game board: CORRECTLY PRICED written on top, 4 round lamps (off; the game lights them)'},
 'race-lever':{w:200,h:520,mod:'src/engines/raceGame.js',guides:[{c:[100,470,30],t:'PIVOT'}],what:'the big lever (red ball handle on a chrome bar), upright, transparent'},
 'race-logo':{w:1400,h:500,what:'RACE GAME in big lit-up game-show letters, transparent'},
 'stage-punch':{w:1920,h:1080,kind:'punch',what:'the Punch-a-Bunch studio, wide, EMPTY: just the set with NO punchboard, pedestal or prize: the game draws them in the dashed box'},
 'stage-punch-tall':{w:1080,h:1920,kind:'punch',what:'the same studio for upright phones'},
 'stage-punch-fold':{w:1504,h:1670,kind:'punch',what:'the same studio for near-square screens (the open Fold)'},
 'punch-board':{w:2000,h:1160,mod:'src/engines/punchABunch.js',guides:[{r:[120,220,1760,880],t:'GRID: 10 x 5 holes (the game draws a paper-covered hole in every cell)'}],what:'the Punch-a-Bunch punchboard: a big red frame with PUNCH-A-BUNCH on top and a dark backing with 50 hole rims in 5 rows of 10'},
 'punch-paper':{w:200,h:200,mod:'src/engines/punchABunch.js',guides:[{c:[100,100,84],t:'one hole covered in gold foil paper'}],what:'one punchboard hole covered with shiny paper (not punched)'},
 'punch-slip':{w:640,h:320,mod:'src/engines/punchABunch.js',guides:[{r:[70,50,500,220],t:'blank: the game prints the $ amount'}],what:'the unfolded paper slip from inside a hole (blank)'},
 'punch-logo':{w:1400,h:500,what:'PUNCH-A-BUNCH in big lit-up game-show letters, transparent'},
 'stage-row':{w:1920,h:1080,kind:'row',what:'the Price Is Right studio seen from the audience for Contestants\' Row: the big turntable stage with the bright 70s set and doors in the upper half (the prize turntable stands in the middle); the bottom half is the row floor where the four podiums stand (the game draws them)'},
 'stage-row-tall':{w:1080,h:1920,kind:'row',what:'the same studio for upright phones'},
 'stage-row-fold':{w:1504,h:1670,kind:'row',what:'the same studio for near-square screens (the open Fold)'},
 'cr-audience':{w:1920,h:1080,mod:'src/engines/contestantsRow.js',what:'the studio audience seen from the stage, EMPTY of people, exactly like the real show: the big red-carpet aisle with its steps up the middle, rows of gold theater seats on every pink dot left and right of it, chrome rails along the aisle, coloured curtains and studio lights at the top (the game seats its own audience in every seat)'},
 'cr-audience-tall':{w:1080,h:1920,mod:'src/engines/contestantsRow.js',what:'the same audience for upright phones'},
 'cr-audience-fold':{w:1504,h:1670,mod:'src/engines/contestantsRow.js',what:'the same audience for near-square screens (the open Fold)'},
 'cr-podium':{w:600,h:500,mod:'src/engines/contestantsRow.js',guides:[{r:[110,60,380,110],t:'BID WINDOW: dark, the game prints the bid in orange'},{r:[60,280,480,90],t:'the game writes the name here'}],what:'one Contestants\' Row podium seen from the front (the classic show look): a small lit bid display on top, a colourful front panel; the contestant stands behind it; transparent around'},
 'cr-fan-1':{w:2048,h:512,mod:'src/engines/contestantsRow.js',guides:CR_FAN.frames.flatMap((f,j)=>[{c:[j*256+128,CR_FAN.spots[j][1],40],t:j===0?'FACE':j===8?'FACE (seated)':''},{c:[j*256+128,500,8],t:''}]),what:'studio audience member 1 WITHOUT a head (the game adds a face on the circle): a homemade T-shirt that says I \u2665 THE PRICE IS RIGHT, jeans; 8 poses left to right, feet on the dots: STAND, CLAP 1 (hands apart), CLAP 2 (hands together), CHEER 1 (fists up), CHEER 2 (fists higher), JUMP (both arms straight up, off the ground), WAVE (one arm waving high), POINT (pointing at the stage); transparent'},
 'cr-fan-2':{w:2048,h:512,mod:'src/engines/contestantsRow.js',guides:CR_FAN.frames.flatMap((f,j)=>[{c:[j*256+128,CR_FAN.spots[j][1],40],t:j===0?'FACE':j===8?'FACE (seated)':''},{c:[j*256+128,500,8],t:''}]),what:'studio audience member 2 WITHOUT a head (the game adds a face on the circle): a US Navy dress white uniform (sailors are a show classic); 8 poses left to right, feet on the dots: STAND, CLAP 1 (hands apart), CLAP 2 (hands together), CHEER 1 (fists up), CHEER 2 (fists higher), JUMP (both arms straight up, off the ground), WAVE (one arm waving high), POINT (pointing at the stage); transparent'},
 'cr-fan-3':{w:2048,h:512,mod:'src/engines/contestantsRow.js',guides:CR_FAN.frames.flatMap((f,j)=>[{c:[j*256+128,CR_FAN.spots[j][1],40],t:j===0?'FACE':j===8?'FACE (seated)':''},{c:[j*256+128,500,8],t:''}]),what:'studio audience member 3 WITHOUT a head (the game adds a face on the circle): a college sweatshirt and khakis; 8 poses left to right, feet on the dots: STAND, CLAP 1 (hands apart), CLAP 2 (hands together), CHEER 1 (fists up), CHEER 2 (fists higher), JUMP (both arms straight up, off the ground), WAVE (one arm waving high), POINT (pointing at the stage); transparent'},
 'cr-fan-4':{w:2048,h:512,mod:'src/engines/contestantsRow.js',guides:CR_FAN.frames.flatMap((f,j)=>[{c:[j*256+128,CR_FAN.spots[j][1],40],t:j===0?'FACE':j===8?'FACE (seated)':''},{c:[j*256+128,500,8],t:''}]),what:'studio audience member 4 WITHOUT a head (the game adds a face on the circle): a loud Hawaiian shirt and shorts; 8 poses left to right, feet on the dots: STAND, CLAP 1 (hands apart), CLAP 2 (hands together), CHEER 1 (fists up), CHEER 2 (fists higher), JUMP (both arms straight up, off the ground), WAVE (one arm waving high), POINT (pointing at the stage); transparent'},
 'cr-fan-5':{w:2048,h:512,mod:'src/engines/contestantsRow.js',guides:CR_FAN.frames.flatMap((f,j)=>[{c:[j*256+128,CR_FAN.spots[j][1],40],t:j===0?'FACE':j===8?'FACE (seated)':''},{c:[j*256+128,500,8],t:''}]),what:'studio audience member 5 WITHOUT a head (the game adds a face on the circle): a tie-dye T-shirt and cut-offs; 8 poses left to right, feet on the dots: STAND, CLAP 1 (hands apart), CLAP 2 (hands together), CHEER 1 (fists up), CHEER 2 (fists higher), JUMP (both arms straight up, off the ground), WAVE (one arm waving high), POINT (pointing at the stage); transparent'},
 'cr-fan-6':{w:2048,h:512,mod:'src/engines/contestantsRow.js',guides:CR_FAN.frames.flatMap((f,j)=>[{c:[j*256+128,CR_FAN.spots[j][1],40],t:j===0?'FACE':j===8?'FACE (seated)':''},{c:[j*256+128,500,8],t:''}]),what:'studio audience member 6 WITHOUT a head (the game adds a face on the circle): a grandma cardigan over a blouse, slacks; 8 poses left to right, feet on the dots: STAND, CLAP 1 (hands apart), CLAP 2 (hands together), CHEER 1 (fists up), CHEER 2 (fists higher), JUMP (both arms straight up, off the ground), WAVE (one arm waving high), POINT (pointing at the stage); transparent'},
 'cr-fan-7':{w:2048,h:512,mod:'src/engines/contestantsRow.js',guides:CR_FAN.frames.flatMap((f,j)=>[{c:[j*256+128,CR_FAN.spots[j][1],40],t:j===0?'FACE':j===8?'FACE (seated)':''},{c:[j*256+128,500,8],t:''}]),what:'studio audience member 7 WITHOUT a head (the game adds a face on the circle): a sports jersey and track pants; 8 poses left to right, feet on the dots: STAND, CLAP 1 (hands apart), CLAP 2 (hands together), CHEER 1 (fists up), CHEER 2 (fists higher), JUMP (both arms straight up, off the ground), WAVE (one arm waving high), POINT (pointing at the stage); transparent'},
 'cr-fan-8':{w:2048,h:512,mod:'src/engines/contestantsRow.js',guides:CR_FAN.frames.flatMap((f,j)=>[{c:[j*256+128,CR_FAN.spots[j][1],40],t:j===0?'FACE':j===8?'FACE (seated)':''},{c:[j*256+128,500,8],t:''}]),what:'studio audience member 8 WITHOUT a head (the game adds a face on the circle): a matching group T-shirt that says TEAM BOB in big letters; 8 poses left to right, feet on the dots: STAND, CLAP 1 (hands apart), CLAP 2 (hands together), CHEER 1 (fists up), CHEER 2 (fists higher), JUMP (both arms straight up, off the ground), WAVE (one arm waving high), POINT (pointing at the stage); transparent'},
 'cr-comeondown':{w:1400,h:500,mod:'src/engines/contestantsRow.js',what:'the words COME ON DOWN! in big 70s game-show lettering, transparent'},
 'cr-logo':{w:1400,h:500,what:'CONTESTANTS\' ROW in big lit-up game-show letters, transparent'},
 'cr-body-1':{w:2304,h:512,mod:'src/engines/contestantsRow.js',guides:CR_BODY.frames.flatMap((f,i)=>[{c:[i*256+128,85,40],t:i?'':'FACE'},{c:[i*256+128,500,8],t:''}]),what:'contestant 1: a happy game-show contestant WITHOUT a head (the game adds the face on the circle), a T-shirt and jeans, 9 poses left to right: STAND, RUN 1-4 (running down the aisle toward us), JUMP (both arms up), CHEER (fists pumping), CLAP, SAD; feet on the dots, transparent'},
 'cr-body-2':{w:2304,h:512,mod:'src/engines/contestantsRow.js',guides:CR_BODY.frames.flatMap((f,i)=>[{c:[i*256+128,85,40],t:i?'':'FACE'},{c:[i*256+128,500,8],t:''}]),what:'contestant 2: a happy game-show contestant WITHOUT a head (the game adds the face on the circle), a sweater and khakis, 9 poses left to right: STAND, RUN 1-4 (running down the aisle toward us), JUMP (both arms up), CHEER (fists pumping), CLAP, SAD; feet on the dots, transparent'},
 'cr-body-3':{w:2304,h:512,mod:'src/engines/contestantsRow.js',guides:CR_BODY.frames.flatMap((f,i)=>[{c:[i*256+128,85,40],t:i?'':'FACE'},{c:[i*256+128,500,8],t:''}]),what:'contestant 3: a happy game-show contestant WITHOUT a head (the game adds the face on the circle), a bright tracksuit, 9 poses left to right: STAND, RUN 1-4 (running down the aisle toward us), JUMP (both arms up), CHEER (fists pumping), CLAP, SAD; feet on the dots, transparent'},
 'cr-body-4':{w:2304,h:512,mod:'src/engines/contestantsRow.js',guides:CR_BODY.frames.flatMap((f,i)=>[{c:[i*256+128,85,40],t:i?'':'FACE'},{c:[i*256+128,500,8],t:''}]),what:'contestant 4: a happy game-show contestant WITHOUT a head (the game adds the face on the circle), a sundress / blouse and skirt, 9 poses left to right: STAND, RUN 1-4 (running down the aisle toward us), JUMP (both arms up), CHEER (fists pumping), CLAP, SAD; feet on the dots, transparent'},
 nametag:{w:512,h:256,what:'a contestant price-tag name tag (blank: the game writes the name), transparent'}};
const imgs=new Map();let ver=0;
// a name with a ':' is a whole build key (e.g. 'keyart:price-bid-off' = the Arcade background), else a show: slot
const keyOf=name=>name.includes(':')?name:'show:'+name;
function picture(name){const url=USER[keyOf(name)];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER[keyOf(name)];
function ready(names=Object.keys(SLOTS),ms=6000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
Object.assign(exports,{CR_SEAT,CR_FAN,CR_BODY,CR_PODIUM,RANGE_GEOM,FINDER_GEOM,BUTTON_GEOM,SAFE_GEOM,TILE_GEOM,PODIUM_GEOM,RTAG_GEOM,RBOARD_GEOM,LEVER_GEOM,PBOARD_GEOM,PAPER_GEOM,SLIP_GEOM,HOST,MODEL,PLINKO_GEOM,WHEEL_GEOM,CLOCK_GEOM,HAND_GEOM,DISPLAY_GEOM,PLATFORM_GEOM,CLIFF_GEOM,CLIMBER,STAND_GEOM,SLOTS,picture,has,ready,version:()=>ver});
