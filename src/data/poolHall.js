// Paddy's Pool Hall (src/engines/paddysPool.js): everything you can buy with the cash you win at pool, and the save in
// profile.poolHall (checked by validHall, called from profile.js). Owner (Nov 14): "the first table can be in Paddy's and
// ratty with ripped felt and spills and cigarette stains. Then the further you progress the better you can upgrade the
// table and the area around it, better fancier bar, add TVs. Lots of things to upgrade!!!"
// Tables change how the table PLAYS (both players play the same table): the Paddy's wreck has dead cushions, a lean that
// drifts slow balls and torn felt that grabs them; good tables are lively and true. Cues: power (top speed), spin (how far off
// centre you can hit) and aim (how long the guide lines are). Everything else is looks (felt, balls, chalk, the room).
const TABLES=[
 {id:'paddys-wreck',name:"Paddy's Original",price:0,desc:'Ripped felt, beer spills, cigarette burns, a wobbly leg and cushions deader than Frank\'s liver.',
  look:{frame:'#3b2516',frame2:'#24160d',rail:'#4a2e1b',metal:'#8a7a5a',wear:3,pockets:'net'},feel:{ecush:.66,slope:[.8,.35],rough:[{x:-14,y:7,r:4.5,k:5},{x:23,y:-11,r:3,k:4}],cloth:.92},tips:['Leans toward the far corner','Torn felt grabs the ball','Dead cushions']},
 {id:'duct-tape',name:'Duct-Tape Special',price:200,desc:'Charlie patched the rips with duct tape. Mostly. It still leans a bit.',
  look:{frame:'#4a2f1c',frame2:'#2d1c10',rail:'#56371f',metal:'#a1916a',wear:2,pockets:'net'},feel:{ecush:.72,slope:[.35,.15],rough:[{x:-14,y:7,r:3.5,k:2.2}],cloth:.96},tips:['Still leans a little','Tape slows the ball']},
 {id:'coin-op',name:'Coin-Op Bar Box',price:550,desc:'Black laminate, chrome corners, a coin slot that eats quarters. Level, clean, honest.',
  look:{frame:'#18181c',frame2:'#0b0b0d',rail:'#222228',metal:'#d8dde6',wear:1,pockets:'drop',coin:true},feel:{ecush:.76,cloth:1},tips:['Level table','Fresh cushions']},
 {id:'oak-tavern',name:'Oak Tavern',price:1300,desc:'Hand-rubbed oak, leather drop pockets, brass sights. The kind of table Dennis pretends he owns.',
  look:{frame:'#7a4a22',frame2:'#4d2c12',rail:'#8c5729',metal:'#d9b25a',wear:0,pockets:'leather'},feel:{ecush:.79,cloth:1.04},tips:['Lively cushions','Quick cloth']},
 {id:'pro-tour',name:'Pro Tour',price:2600,desc:'Tournament table: steel-grey rails, LED sights, cloth so fast the balls run forever.',
  look:{frame:'#2c3139',frame2:'#15181d',rail:'#3a414b',metal:'#c9d4e2',wear:0,pockets:'pro',led:true},feel:{ecush:.82,cloth:1.12},tips:['Pro cushions','Fast cloth']},
 {id:'golden-god',name:'The Golden God',price:4800,desc:'"I am a golden god!" Gold-leaf rails, diamond sights, legs carved like Dennis. Plays perfect.',
  look:{frame:'#b8891d',frame2:'#6e4f0c',rail:'#d4a933',metal:'#fff1b0',wear:0,pockets:'gold',gold:true},feel:{ecush:.84,cloth:1.15},tips:['Perfect cushions','Fastest cloth']},
];
const FELTS=[
 {id:'paddys-green',name:"Paddy's Green",price:0,color:'#2f6b44',desc:'Faded, sticky, smells like Fight Milk.'},
 {id:'tour-green',name:'Tournament Green',price:60,color:'#1f7a4a'},
 {id:'tour-blue',name:'Tournament Blue',price:120,color:'#1f5fa8'},
 {id:'wine',name:'Wine Red',price:150,color:'#7d1e2c'},
 {id:'charcoal',name:'Charcoal',price:150,color:'#33363d'},
 {id:'teal',name:'Teal',price:180,color:'#11807e'},
 {id:'purple',name:'Purple Haze',price:200,color:'#5a2d8c'},
 {id:'wolf-cola',name:'Wolf Cola Orange',price:220,color:'#c45a12',desc:'The drink for closers.'},
 {id:'dee-pink',name:"Dee's Bird Pink",price:250,color:'#c4497c'},
 {id:'midnight',name:'Midnight Black',price:300,color:'#15161b'},
 {id:'mac-camo',name:"Mac's Camo",price:450,color:'#4d5a33',pattern:'camo',desc:'For when you need to blend into the bar.'},
 {id:'kitten-mittens',name:'Kitten Mittens Leopard',price:500,color:'#b8863c',pattern:'leopard',desc:'You know what I\'m sayin\'?'},
 {id:'golden',name:'Golden God Gold',price:700,color:'#b8922a',desc:'Shiny.'},
];
const CUES=[
 {id:'house',name:'House Cue',price:0,stats:{power:.84,spin:.32,aim:1},look:{butt:'#6b4a2c',wrap:'#3b2a1c',band:'#c9b48a',shaft:'#e7d5b0',warp:1},desc:'Warped, chipped, caked in blue chalk and something sticky.'},
 {id:'rat-stick',name:"Charlie's Rat Stick",price:150,stats:{power:.88,spin:.35,aim:1.1},look:{butt:'#5b5146',wrap:'#7a2a1d',band:'#bfbfbf',shaft:'#dcc8a0',nails:true},desc:'Rat-bashing stick. It has a kill count.'},
 {id:'wolf-cola',name:'Wolf Cola Cue',price:320,stats:{power:.9,spin:.38,aim:1.2},look:{butt:'#151515',wrap:'#d1561a',band:'#d1561a',shaft:'#eadbb8'},desc:'For closers.'},
 {id:'karate',name:"Mac's Karate Cue",price:600,stats:{power:.93,spin:.4,aim:1.3},look:{butt:'#e6e1d6',wrap:'#141414',band:'#c91d1d',shaft:'#efe2c2',belt:true},desc:'Occular pat-down not included.'},
 {id:'bird',name:"Dee's Bird Cue",price:850,stats:{power:.95,spin:.42,aim:1.4},look:{butt:'#d86b9e',wrap:'#ffffff',band:'#ffd84a',shaft:'#f0e2c4',feather:true},desc:'Long and gangly. Like its owner.'},
 {id:'magnum',name:"Frank's Magnum",price:1300,stats:{power:1,spin:.44,aim:1.5},look:{butt:'#3a3f45',wrap:'#1b1d20',band:'#b0b7bf',shaft:'#ead9b4',grip:true},desc:'Frank brought a gun to a cue fight. Then made it a cue.'},
 {id:'dennis',name:'The D.E.N.N.I.S. Cue',price:2200,stats:{power:1,spin:.47,aim:1.65},look:{butt:'#120d0d',wrap:'#8c0f17',band:'#e0e0e0',shaft:'#f2e6c8',inlay:true},desc:'Demonstrate value, Engage physically... sink the eight.'},
 {id:'golden',name:'Golden God Cue',price:4200,stats:{power:1.05,spin:.5,aim:1.85},look:{butt:'#d1a22a',wrap:'#5a3c08',band:'#fff1b0',shaft:'#f6ebcf',gold:true},desc:'Perfect in every way. Like Dennis.'},
];
const BALLSETS=[
 {id:'bar',name:"Paddy's Bar Set",price:0,desc:'Yellowed, chipped and one of them is sticky.',age:1},
 {id:'classic',name:'Classic Set',price:180,age:0},
 {id:'pro',name:'Pro Set',price:550,age:0,dots:true,desc:'Red-dot cue ball: you can see the spin.'},
 {id:'glow',name:'Glow Set',price:1100,age:0,glow:true,desc:'Neon balls for the after-hours crowd.'},
];
const CHALKS=[{id:'blue',name:'Blue Chalk',price:0,color:'#3d78c8'},{id:'green',name:'Green Chalk',price:20,color:'#3c9a52'},{id:'red',name:'Red Chalk',price:20,color:'#b83a3a'},{id:'pink',name:'Pink Chalk',price:30,color:'#d667a3'},{id:'gold',name:'Gold Chalk',price:80,color:'#d9b13a'}];
// room upgrades: tiers, bought in order
const ROOM={
 reno:{name:'The Room',tiers:[
  {name:'As Is',price:0,desc:'Sticky floor, nicotine walls, a hole Charlie punched in the drywall.'},
  {name:'Scrubbed',price:300,desc:'Somebody finally mopped. The hole is still there.'},
  {name:'Sports Bar',price:950,desc:'Wood floors, pennants, team colours.'},
  {name:'Lounge',price:2100,desc:'Carpet, leather booths, dim and moody.'},
  {name:'Golden God Palace',price:4200,desc:'Marble, gold and mirrors so Dennis can watch himself.'}]},
 light:{name:'Table Light',tiers:[
  {name:'Bare Bulb',price:0,desc:'One bulb on a wire. It flickers.'},
  {name:'Beer Sign Lamp',price:150,desc:'A plastic beer-sign lamp. Warm and greasy.'},
  {name:'Tiffany Lamp',price:480,desc:'Stained glass. Very classy. Very breakable.'},
  {name:'Pro LED Canopy',price:1150,desc:'Tournament light: even, bright, no shadows.'},
  {name:'Crystal Chandelier',price:2400,desc:'Too much. Perfect.'}]},
 tv:{name:'TVs',tiers:[
  {name:'No TV',price:0,desc:'Just the wall.'},
  {name:'Busted CRT',price:200,desc:'Gets one channel: static.'},
  {name:'Two Flat Screens',price:650,desc:'Sports and Philly local news.'},
  {name:'TV Wall',price:1500,desc:'Six screens. Replays of your best shots.'},
  {name:'Jumbotron',price:3100,desc:'A giant screen with your face on it.'}]},
 bar:{name:'The Bar',tiers:[
  {name:"Paddy's Bar",price:0,desc:'Well whiskey, warm beer, a bowl of mystery nuts.'},
  {name:'Stocked Bar',price:250,desc:'Real bottles. Some of them are even full.'},
  {name:'Craft Taps',price:700,desc:'Twelve taps. Mac insists one is "the shit".'},
  {name:'Top Shelf',price:1450,desc:'Back-lit shelves of fancy bottles.'},
  {name:'Champagne Bar',price:2900,desc:'Champagne tower. Cristal for everyone.'}]},
};
const ROOM_SLOTS=Object.keys(ROOM);
const DECOR=[
 {id:'neon-paddys',name:"Paddy's Pub Neon",price:120,desc:'Green shamrock neon.'},
 {id:'chalkboard',name:'Chalkboard',price:80,desc:'Keeps the match score in chalk.'},
 {id:'dartboard',name:'Dartboard',price:150,desc:'Mostly hit by bottles.'},
 {id:'rum-ham',name:'Rum Ham',price:90,desc:'On the bar. Nobody touch it.'},
 {id:'neon-fight-milk',name:'Fight Milk Neon',price:180,desc:'The first alcoholic protein drink for bodyguards.'},
 {id:'neon-kitten',name:'Kitten Mittens Neon',price:180,desc:'Mew mew. Mew mew mew.'},
 {id:'neon-wolf',name:'Wolf Cola Neon',price:180,desc:'For closers.'},
 {id:'fan',name:'Ceiling Fan',price:120,desc:'Wobbles. Do not look directly at it.'},
 {id:'pepe-board',name:'Pepe Silvia Board',price:220,desc:'Charlie\'s conspiracy wall. Carol in HR.'},
 {id:'dennis-portrait',name:'Portrait of Dennis',price:260,desc:'Five stars. Golden. Watching.'},
 {id:'megatouch',name:'Megatouch Machine',price:350,desc:'A bar-top game machine with Photo Hunt.'},
 {id:'jukebox',name:'Jukebox',price:400,desc:'Plays music while you shoot.'},
 {id:'trophy-case',name:'Trophy Case',price:500,desc:'Shows off every rack you win.'},
 {id:'crowd',name:'The Regulars',price:600,desc:'A crowd round the table that cheers your shots (and boos the misses).'},
];
// ---------------------------------------------------------------- cash
const CASH={pot:10,bank:25,combo:25,kick:20,multi:15,rack:100,runout:150,breakrun:250,golden:200,break8:200,match:150};
const CPU_K={easy:.7,normal:1,hard:1.4};
const START_CASH=100;   // "grand re-opening" money on the first visit
// ---------------------------------------------------------------- the save
const byId=(list,id)=>list.find(q=>q.id===id);
function freshHall(){return {cash:START_CASH,own:[],eq:{table:'paddys-wreck',felt:'paddys-green',cue:'house',balls:'bar',chalk:'blue'},room:{reno:0,light:0,tv:0,bar:0},decor:[],hide:[],stats:{racks:0,matches:0,runs:0,golden:0,best:0,earned:0},set:{assist:'full',clock:false,race:1,game:'eight',seen:false}};}
const LISTS={table:TABLES,felt:FELTS,cue:CUES,balls:BALLSETS,chalk:CHALKS};
function validHall(saved){
 const h=freshHall();if(!saved||typeof saved!=='object'||Array.isArray(saved))return h;
 const int=(v,d,max=1e9)=>Number.isFinite(v)&&v>=0?Math.min(max,Math.floor(v)):d;
 h.cash=int(saved.cash,START_CASH);
 const ids=new Set([...TABLES,...FELTS,...CUES,...BALLSETS,...CHALKS].map(q=>q.id+'@'));
 // owned items are stored as "<kind>:<id>" (ids repeat across kinds)
 if(Array.isArray(saved.own))h.own=[...new Set(saved.own.filter(k=>typeof k==='string'&&/^(table|felt|cue|balls|chalk):/.test(k)&&LISTS[k.split(':')[0]].some(q=>q.id===k.split(':')[1])))];
 if(saved.eq&&typeof saved.eq==='object')for(const k of Object.keys(LISTS)){const v=saved.eq[k];if(typeof v==='string'&&byId(LISTS[k],v)&&(byId(LISTS[k],v).price===0||h.own.includes(k+':'+v)))h.eq[k]=v;}
 if(saved.room&&typeof saved.room==='object')for(const k of ROOM_SLOTS)h.room[k]=int(saved.room[k],0,ROOM[k].tiers.length-1);
 if(Array.isArray(saved.decor))h.decor=[...new Set(saved.decor.filter(d=>DECOR.some(q=>q.id===d)))];
 if(Array.isArray(saved.hide))h.hide=[...new Set(saved.hide.filter(d=>h.decor.includes(d)))];
 if(saved.stats&&typeof saved.stats==='object')for(const k of Object.keys(h.stats))h.stats[k]=int(saved.stats[k],0);
 const st=saved.set;if(st&&typeof st==='object'){if(['full','std','pro'].includes(st.assist))h.set.assist=st.assist;h.set.clock=!!st.clock;if([1,2,3,5].includes(st.race))h.set.race=st.race;if(['eight','nine'].includes(st.game))h.set.game=st.game;h.set.seen=!!st.seen;}
 void ids;return h;
}
const owns=(h,kind,id)=>{const it=byId(LISTS[kind]||[],id);return !!it&&(it.price===0||h.own.includes(kind+':'+id));};
function buy(h,kind,id){const it=byId(LISTS[kind]||[],id);if(!it||owns(h,kind,id)||h.cash<it.price)return false;h.cash-=it.price;h.own.push(kind+':'+id);h.eq[kind]=id;return true;}
function equip(h,kind,id){if(!owns(h,kind,id))return false;h.eq[kind]=id;return true;}
function buyRoom(h,slot){const r=ROOM[slot],n=h.room[slot]+1;if(!r||n>=r.tiers.length||h.cash<r.tiers[n].price)return false;h.cash-=r.tiers[n].price;h.room[slot]=n;return true;}
function buyDecor(h,id){const d=byId(DECOR,id);if(!d||h.decor.includes(id)||h.cash<d.price)return false;h.cash-=d.price;h.decor.push(id);return true;}
const showsDecor=(h,id)=>h.decor.includes(id)&&!h.hide.includes(id);
function loadout(h){return {table:byId(TABLES,h.eq.table)||TABLES[0],felt:byId(FELTS,h.eq.felt)||FELTS[0],cue:byId(CUES,h.eq.cue)||CUES[0],balls:byId(BALLSETS,h.eq.balls)||BALLSETS[0],chalk:byId(CHALKS,h.eq.chalk)||CHALKS[0],room:{...h.room},decor:h.decor.filter(d=>!h.hide.includes(d))};}
// how much of the hall is done (for the menu): spent / total
function progress(h){let tot=0,got=0;for(const k of Object.keys(LISTS))for(const it of LISTS[k]){tot+=it.price;if(owns(h,k,it.id))got+=it.price;}
 for(const k of ROOM_SLOTS)ROOM[k].tiers.forEach((t,i)=>{tot+=t.price;if(i<=h.room[k])got+=t.price;});for(const d of DECOR){tot+=d.price;if(h.decor.includes(d.id))got+=d.price;}return got/tot;}
Object.assign(exports,{TABLES,FELTS,CUES,BALLSETS,CHALKS,ROOM,ROOM_SLOTS,DECOR,CASH,CPU_K,START_CASH,LISTS,byId,freshHall,validHall,owns,buy,equip,buyRoom,buyDecor,showsDecor,loadout,progress});
