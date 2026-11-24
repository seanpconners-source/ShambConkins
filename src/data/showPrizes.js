// REAL PRIZES for PLINKO's four small prizes (owner, Nov 24: "real items that would be on Price Is Right, real prices in
// today's money, real images"). Each is a real product you can buy in the US with its regular retail price as of
// NOVEMBER 2026 (checked against Walmart / Target / Amazon listings that month: the list price, not a sale price; Plinko
// prizes are two-digit prices, so groceries come in a case). Photo = assets/prizes/<id>.webp -> USER_PORTRAITS['prize:<id>']
// (free-licensed photos from Wikimedia Commons, authors + licences in PHOTO_CREDITS and CREDITS.md). Refresh the prices
// when you release: change `price`, bump PRICES_AS_OF.
const PRICES_AS_OF='November 2026';
// [id, name shown on the card, price in whole dollars (10-99), emoji used if the photo is missing]
const PRIZES=[
 ['etch-a-sketch','Etch A Sketch Classic',20,'🖍️'],['magic-8-ball','Magic 8 Ball',15,'🎱'],['rubiks-cube','Rubik\'s Cube',12,'🧊'],
 ['slinky','The Original Slinky',10,'🌀'],['lava-lamp','Lava Lite lava lamp',30,'🪔'],['instant-pot','Instant Pot Duo, 6 quart',99,'🍲'],
 ['crock-pot','Crock-Pot slow cooker',45,'🍲'],['foreman-grill','George Foreman grill',40,'🥩'],['chia-pet','Chia Pet',20,'🌱'],
 ['tamagotchi','Tamagotchi',22,'🥚'],['super-soaker','Super Soaker',25,'💦'],['nerf-blaster','Nerf blaster',30,'🔫'],
 ['instax','Instax instant camera',80,'📷'],['lite-brite','Lite-Brite',25,'💡'],['spirograph','Spirograph set',20,'🌀'],
 ['view-master','View-Master',20,'👓'],['clapper','The Clapper',30,'👏'],['monopoly','Monopoly',25,'🎩'],['scrabble','Scrabble',22,'🔤'],
 ['connect-four','Connect 4',15,'🔴'],['battleship','Battleship',20,'🚢'],['trivial-pursuit','Trivial Pursuit',30,'❓'],
 ['yahtzee','Yahtzee',12,'🎲'],['hippos','Hungry Hungry Hippos',20,'🦛'],['simon','Simon',20,'🟢'],['frisbee','Wham-O Frisbee',12,'🥏'],
 ['hula-hoop','Hula hoop',10,'⭕'],['yo-yo','Yo-yo',10,'🪀'],['thermos','Thermos vacuum bottle',30,'🧴'],['swiss-army','Victorinox Swiss Army knife',32,'🔪'],
 ['maglite','Maglite flashlight',35,'🔦'],['big-wheel','Big Wheel tricycle',75,'🚲'],['razor-scooter','Razor scooter',45,'🛴'],
 ['pogo-stick','Pogo stick',45,'🦘'],['sorry','Sorry!',15,'🎲'],['kerplunk','KerPlunk',18,'🥢'],['boggle','Boggle',20,'🔠'],
 ['game-of-life','The Game of Life',25,'🚗'],['sodastream','SodaStream sparkling water maker',99,'🫧'],['pyrex','Pyrex measuring cup set',25,'🥛'],
 ['fiesta','Fiesta dinnerware place setting',60,'🍽️'],['dustbuster','Black+Decker handheld vacuum',60,'🧹'],['waterpik','Waterpik water flosser',65,'🪥'],
 ['casio-f91w','Casio F-91W watch',20,'⌚'],['chucks','Converse Chuck Taylor All Stars',65,'👟'],['bic','Bic Cristal pens, 50 pack',12,'🖊️'],
 ['magna-doodle','Magna Doodle',20,'✏️'],['slip-n-slide','Slip \'N Slide',30,'💧'],['wiffle','Wiffle ball and bat',12,'⚾'],
 ['leatherman','Leatherman multi-tool',65,'🔧'],['billy-bass','Big Mouth Billy Bass',50,'🐟'],['shake-weight','Shake Weight',25,'🏋️'],
 ['silly-putty','Silly Putty, 6 eggs',12,'🥚'],['koosh','Koosh ball',10,'🔴'],['nintendo-controller','Nintendo Switch Pro Controller',75,'🎮'],
 ['spam','Spam, a case of 12 cans',50,'🥫'],['twinkies','Twinkies, 4 boxes',24,'🧁'],['rice-a-roni','Rice-A-Roni, 12 boxes',25,'🍚'],
 ['heinz','Heinz ketchup, 6 big bottles',30,'🍅'],['camp-stove','Backpacking camp stove',40,'🔥']];
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
// the prize's photo once it has loaded (null until then / when missing: draw the emoji)
function prizePhoto(id){const url=USER['prize:'+id];if(!url||typeof Image==='undefined')return null;let e=imgs.get(id);
 if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(id,e);}return e.ok?e.img:null;}
const hasPhoto=id=>!!USER['prize:'+id];
Object.assign(exports,{PRIZES,PRICES_AS_OF,prizePhoto,hasPhoto});
