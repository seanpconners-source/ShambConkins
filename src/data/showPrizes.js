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
// GRAND PRIZES for the pricing games that play for one big prize (Cliff Hangers): real products, US starting price / list price
// checked Nov 24 2026 (Sea-Doo's US page: 2026 Spark from $6,999; MotoHunt/Autotrader: 2026 Vespa Primavera 50 base MSRP $4,449;
// onepeloton.com: Bike+ $2,695 list). Photo slot = the same prize:<id> (assets/prizes/<id>.webp) when one is added.
const GRAND_PRIZES=[['sea-doo-spark','a Sea-Doo Spark personal watercraft',6999,'🚤'],['vespa-primavera','a Vespa Primavera 50 scooter',4449,'🛵'],['peloton-bike-plus','a Peloton Bike+',2695,'🚴']];
// MID PRIZES ($100-$999, whole dollars like the show's price displays) for the Clock Game: real products, US list price checked
// Nov 24 2026 (Nintendo Switch 2 $499.99 since Sept 1 2026; KitchenAid Artisan 5 qt $499.99 regular; AirPods Pro 3 $249; YETI Tundra 45
// $325 on yeti.com; Vitamix 5200 $549.99 list; GoPro HERO13 Black $429.99 at Best Buy; Weber Spirit E-325 LP $549 list; iPad 11-inch
// A16 128 GB $449 after the June 2026 rise; Ninja CREAMi 7-in-1 NC301 $229.99 list). Left out: PS5 (sources disagree on the price).
const MID_PRIZES=[['switch-2','Nintendo Switch 2',500,'🎮'],['kitchenaid-artisan','KitchenAid Artisan stand mixer',500,'🥣'],['airpods-pro-3','Apple AirPods Pro 3',249,'🎧'],
 ['yeti-tundra-45','YETI Tundra 45 cooler',325,'🧊'],['vitamix-5200','Vitamix 5200 blender',550,'🥤'],['gopro-hero13','GoPro HERO13 Black',430,'📷'],
 ['weber-spirit-e325','Weber Spirit E-325 gas grill',549,'🔥'],['ipad-a16','Apple iPad 11-inch (A16)',449,'📱'],['ninja-creami','Ninja CREAMi ice cream maker',230,'🍦']];
// the big catalog (src/data/showCatalog.js, owner Nov 26: hundreds of real items placed like the show places them) joins the lists
// above; rows there carry a 5th field (kind) the games may ignore
const CAT=require("src/data/showCatalog.js");
PRIZES.push(...CAT.SMALL);MID_PRIZES.push(...CAT.MID);GRAND_PRIZES.push(...CAT.GRAND);
const BID_PRIZES=CAT.BID,CARS=CAT.CARS,TRIPS=CAT.TRIPS,BIG=CAT.BIG,GROCERY=CAT.GROCERY;
const ALL=[...PRIZES,...MID_PRIZES,...BID_PRIZES,...GRAND_PRIZES,...CARS,...TRIPS,...BIG],BY_ID=Object.fromEntries(ALL.map(p=>[p[0],p]));
const SHOWCASES=CAT.SHOWCASES.map(([id,theme,intro,items])=>{const it=items.map(i=>BY_ID[i]).filter(Boolean);return {id,theme,intro,items:it,total:it.reduce((a,p)=>a+p[2],0)};});
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
// the prize's photo once it has loaded (null until then / when missing: draw the emoji)
// a trip listed more than once (-g = grand-prize price, -bid = bid price) borrows its twin's photo when it has none of its own
const photoKey=id=>{if(USER['prize:'+id]||!/^trip-/.test(id))return id;const b=id.replace(/-(g|bid)$/,'');return [b,b+'-g',b+'-bid'].find(k=>USER['prize:'+k])||id;};
function prizePhoto(id){id=photoKey(id);const url=USER['prize:'+id];if(!url||typeof Image==='undefined')return null;let e=imgs.get(id);
 if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(id,e);}return e.ok?e.img:null;}
const hasPhoto=id=>!!USER['prize:'+photoKey(id)];
Object.assign(exports,{MID_PRIZES,GRAND_PRIZES,PRIZES,BID_PRIZES,CARS,TRIPS,BIG,GROCERY,SHOWCASES,ALL,BY_ID,PRICES_AS_OF,prizePhoto,hasPhoto});
