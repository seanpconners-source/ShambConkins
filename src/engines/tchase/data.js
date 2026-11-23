// JUDGMENT DAY CHASE (Terminator 2) data: stages, vehicles, enemies, weapons, upgrade cards.
// Our own game in the spirit of Spy Hunter, Chase H.Q., Burnout and Need for Speed Hot Pursuit, set in the T2 chases
// (motorcycle in the storm drain, the tow truck, the T-1000 on foot, the police bike + helicopter, the liquid nitrogen
// tanker). Units: 1 unit = 1 drawn px at zoom 1; a car is ~36 x 64, a lane ~56.

// player vehicles: w/h = hit box, hp, lateral speed (sx) and acceleration (ax), mass for rams, gun mount
const VEHICLES={
 bike:  {name:'HARLEY FAT BOY',w:20,h:46,hp:100,sx:560,ax:3600,mass:.7,gun:'shotgun',rider:true},
 wagon: {name:'STATION WAGON',w:38,h:70,hp:130,sx:430,ax:2600,mass:1.2,gun:'shotgun'},
 van:   {name:'SWAT VAN',w:44,h:82,hp:170,sx:360,ax:2100,mass:1.8,gun:'minigun'},
 pickup:{name:'PICKUP TRUCK',w:40,h:76,hp:150,sx:400,ax:2400,mass:1.5,gun:'rifle'}};

// guns the T-800 fires automatically at the nearest threat (rate per second, damage per bullet, spread, range)
const GUNS={
 shotgun:{name:'SPIN-COCK SHOTGUN',rate:1.5,dmg:1.5,pellets:5,spread:.2,range:420,speed:1500,sound:'shotgun'},
 uzi:    {name:'TWIN UZIS',rate:10,dmg:.6,pellets:1,spread:.09,range:460,speed:1500,sound:'uzi'},
 rifle:  {name:'M16 RIFLE',rate:4,dmg:2.1,pellets:1,spread:.03,range:640,speed:1900,sound:'rifle'},
 minigun:{name:'M134 MINIGUN',rate:22,dmg:.55,pellets:1,spread:.07,range:560,speed:1700,sound:'minigun',spin:.35}};
const GUN_ORDER=['shotgun','uzi','rifle','minigun'];

// stages: road look, length to the boss (units), vehicle, base speed, heat (enemy budget) curve, spawn mix, boss
const STAGES=[
 {id:'galleria',title:'THE GALLERIA',sub:'Sherman Oaks · 1995',vehicle:'bike',speed:470,len:30000,time:'sunset',
  look:'street',canalAt:.62,mix:{civ:5,cruiser:3,moto:3,spikes:1,roadblock:1},heat:[1,2.8],boss:'towtruck',
  intro:['Come with me if you want to live.','The T-1000 is in the tow truck. Into the storm drain!'],
  tip:'Drag anywhere to drive. The T-800 shoots on his own. Tap M79 for a grenade, hold NITRO to boost.'},
 {id:'drain',title:'LIQUID METAL',sub:'The storm drain',vehicle:'bike',speed:500,len:16000,time:'sunset',
  look:'canal',mix:{moto:2,cruiser:1},heat:[1,2],boss:'t1000foot',
  intro:['He walked out of the fire.','He is still coming. On foot.'],
  tip:'Bullets only slow him. Grenades knock him flat: three knockdowns and he loses you.'},
 {id:'pescadero',title:'PESCADERO',sub:'Night escape',vehicle:'wagon',speed:520,len:34000,time:'night',
  look:'highway',mix:{civ:5,cruiser:4,moto:3,spikes:2,roadblock:2,heli:1},heat:[2,4.6],boss:'t1000bike',
  intro:['We have to get out of here. Now.','A police bike is closing in. Guess who is riding it.'],
  tip:'Ram cruisers into walls and traffic for TAKEDOWNS. Takedowns fill your nitro.'},
 {id:'cyberdyne',title:'CYBERDYNE',sub:'Every cop in the city',vehicle:'van',speed:540,len:36000,time:'night',
  look:'city',mix:{civ:4,cruiser:5,moto:3,swat:3,roadblock:2,spikes:1,heli:2},heat:[2.6,6],boss:'heli',
  intro:['The SWAT van. And a minigun.','He took a police helicopter.'],
  tip:'The minigun spins up and shreds. Keep moving: the helicopter shows its strafing line first.'},
 {id:'nitrogen',title:'JUDGMENT DAY',sub:'Liquid nitrogen',vehicle:'pickup',speed:560,len:34000,time:'night',
  look:'freeway',mix:{civ:5,cruiser:5,moto:4,swat:2,roadblock:2,spikes:2,heli:2},heat:[3,6.6],boss:'tanker',
  intro:['That truck is full of liquid nitrogen.','Shoot the valves. Then finish it with the M79.'],
  tip:'Break all three valves on the tanker, then fire the grenade launcher.'}];

// enemies: hp, hit box, ram damage (to you), score, how they arrive
const FOES={
 civ:     {hp:4,w:34,h:60,ram:6,pts:-150,from:'ahead'},
 cruiser: {hp:7,w:36,h:66,ram:11,pts:200,from:'behind'},
 moto:    {hp:2.5,w:18,h:42,ram:6,pts:150,from:'behind'},
 swat:    {hp:26,w:44,h:84,ram:16,pts:600,from:'ahead'},
 roadcar: {hp:7,w:64,h:34,ram:12,pts:150,from:'static'},
 spikes:  {hp:99,w:110,h:12,ram:0,pts:0,from:'static'},
 heli:    {hp:46,w:70,h:90,ram:0,pts:1000,from:'air'},
 truck:   {hp:16,w:46,h:104,ram:18,pts:500,from:'ahead'},
 // bosses
 towtruck: {hp:230,w:58,h:128,ram:14,pts:5000,from:'behind',boss:true,name:'T-1000 · TOW TRUCK'},
 t1000foot:{hp:9e9,w:22,h:30,ram:16,pts:0,from:'behind',boss:true,name:'T-1000 · ON FOOT'},
 t1000bike:{hp:150,w:20,h:46,ram:12,pts:5000,from:'behind',boss:true,name:'T-1000 · POLICE BIKE'},
 heliboss: {hp:460,w:84,h:104,ram:0,pts:8000,from:'air',boss:true,name:'T-1000 · POLICE HELICOPTER'},
 tanker:   {hp:9e9,w:62,h:190,ram:15,pts:0,from:'behind',boss:true,name:'T-1000 · LN2 TANKER'}};

// upgrade cards (Sarah's stash between stages, the weapons rig mid-stage)
const CARDS=[
 {id:'rate',icon:'⚡',name:'Rapid fire',text:'Your gun fires 25% faster.',max:4},
 {id:'dmg',icon:'💥',name:'Hollow points',text:'Every bullet hits 25% harder.',max:4},
 {id:'armor',icon:'🛡️',name:'Armor plating',text:'+30 max health and a full repair.',max:4},
 {id:'m79',icon:'💣',name:'Bandolier',text:'Carry 2 more grenades and get 3 now.',max:3},
 {id:'nitro',icon:'🔥',name:'Bigger tank',text:'Nitro lasts 40% longer and refills faster.',max:3},
 {id:'magnet',icon:'🧲',name:'Scrounger',text:'Pickups fly to you from much further away.',max:1},
 {id:'ram',icon:'🐂',name:'Push bar',text:'Rams hit twice as hard and hurt you half as much.',max:2},
 {id:'regen',icon:'🔧',name:'Field repairs',text:'Slowly repair damage while you drive.',max:2},
 {id:'mines',icon:'🛢️',name:'Oil slick',text:'Drop oil behind you every few seconds: chasers spin out.',max:2},
 {id:'side',icon:'🔫',name:'Side guns',text:'Two extra guns shoot at anything beside you.',max:2},
 {id:'homing',icon:'🚀',name:'Homing rockets',text:'A homing rocket every few seconds.',max:3},
 {id:'shield',icon:'🤖',name:'Endoskeleton',text:'Every 20 seconds a shield blocks the next big hit.',max:1}];

// pickups on the road
const PICKUPS={
 repair:{icon:'🔧',col:'#5dff7a',what:'+25 health'},
 grenade:{icon:'💣',col:'#ffb347',what:'+1 grenade'},
 nitro:{icon:'🔥',col:'#4fc3ff',what:'nitro'},
 weapon:{icon:'🔫',col:'#ffd23f',what:'new gun'},
 shield:{icon:'🛡️',col:'#c58bff',what:'shield'},
 cash:{icon:'$',col:'#ffe066',what:'+250'}};

Object.assign(exports,{VEHICLES,GUNS,GUN_ORDER,STAGES,FOES,CARDS,PICKUPS});
