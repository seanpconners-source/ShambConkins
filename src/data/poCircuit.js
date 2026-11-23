// Fight Night career (Punch-Out style): circuits of opponents. Every opponent is a character from the game (face = their
// portrait), with a body type (src/engines/po/art.js TYPES / poSprites sheets), colours, and a fighting style:
//  speed  = tell-time multiplier (<1 faster), dmg = damage multiplier, hp, guard = 'high' | 'low' | 'switch' | 'none'
//  moves  = weights of jab / hook / upper / body, combo = chance to chain a second punch, slip = chance to slip your jab,
//  special = signature punch {name, hits, avoid:'dodge'|'duck'|'block', tell}, getup = the count he rises at per knockdown
//  (null = stays down), lines = what he says (our own lines), tip = the trainer's tip between rounds.
const CIRCUITS=['MINOR CIRCUIT','MAJOR CIRCUIT','WORLD CIRCUIT','TITLE FIGHT','DREAM FIGHT'];
const FIGHTERS=[
 {id:'creed',name:'Creed Bratton',circuit:0,type:'lean',trunks:'#6a4bc8',gloves:'#e0e0e0',hp:80,speed:1.45,dmg:.65,guard:'none',moves:{jab:4,hook:3,upper:1,body:0},combo:0,slip:0,
  special:{name:'QUABITY HAYMAKER',hits:1,avoid:'dodge',tell:1.5},getup:[2,5,8],record:'1-99',from:'Scranton',lines:['I\'ve been in worse fights. In a van.','Nobody steals from Creed Bratton.','I sprout mung beans on a damp paper towel.'],tip:'He winds up for ages. Dodge the big one and pound him while he\'s open!'},
 {id:'master-roshi',name:'Master Roshi',circuit:0,type:'lean',trunks:'#f08a1e',gloves:'#c0262e',hp:95,speed:1.2,dmg:.75,guard:'high',moves:{jab:3,hook:2,upper:1,body:2},combo:.1,slip:.15,
  special:{name:'TURTLE RUSH',hits:3,avoid:'dodge',tell:1.2},getup:[3,6,9],record:'15-8',from:'Kame House',lines:['Hoo hoo! Too slow, sonny.','I\'ve trained champions. You\'re not one.','Back in my day we fought on actual turtles.'],tip:'He keeps his gloves high. Go to the body!'},
 {id:'krillin',name:'Krillin',circuit:0,type:'fast',trunks:'#f2a21e',gloves:'#2a63d8',hp:100,speed:1.0,dmg:.7,guard:'switch',moves:{jab:5,hook:2,upper:1,body:2},combo:.25,slip:.1,
  special:{name:'DESTRUCTO UPPERCUT',hits:1,avoid:'dodge',tell:1.1},getup:[4,7,null],record:'22-6',from:'Kame House',lines:['I\'m tougher than I look!','Don\'t make me call Goku.','Short guys hit harder. Science.'],tip:'Fast jabs. Block or dodge them, then hit back right away.'},
 {id:'johnny-cage',name:'Johnny Cage',circuit:1,type:'lean',trunks:'#111111',gloves:'#f2f2f2',hp:110,speed:.95,dmg:.85,guard:'switch',moves:{jab:3,hook:3,upper:2,body:2},combo:.25,slip:.2,taunt:.3,
  special:{name:'SHADOW HAYMAKER',hits:2,avoid:'dodge',tell:1.0},getup:[4,7,null],record:'31-4',from:'Hollywood',lines:['Wait till you see my next movie.','Nice try, but you missed my good side.','I do my own stunts. Watch.'],tip:'When he poses for the crowd, he\'s wide open. Hit him!'},
 {id:'zangief',name:'Zangief',circuit:1,type:'heavy',trunks:'#c0262e',gloves:'#8a2a1a',hp:130,speed:1.1,dmg:1.25,guard:'none',moves:{jab:1,hook:3,upper:3,body:3},combo:.1,slip:0,
  special:{name:'SIBERIAN BEAR CRUSH',hits:1,avoid:'duck',tell:1.25},getup:[5,8,null],record:'40-10',from:'Russia',lines:['I wrestle bears. You are small bear.','Strong like the tractor!','Ha! Mother hits harder.'],tip:'He hits like a truck but he\'s slow. For his bear crush: DUCK!'},
 {id:'bane',name:'Bane',circuit:1,type:'giant',trunks:'#3a3a3a',gloves:'#5a5a5a',hp:140,speed:1.0,dmg:1.15,guard:'high',moves:{jab:2,hook:2,upper:2,body:3},combo:.15,slip:0,
  special:{name:'BACK BREAKER',hits:1,avoid:'dodge',tell:1.15},getup:[5,8,null],record:'36-2',from:'Gotham',lines:['You merely adopted the ring.','Your punishment must be more severe.','Victory has defeated you.'],tip:'His guard never drops from his face. Body shots, then counter his big one.'},
 {id:'rambo',name:'Rambo',circuit:2,type:'champ',trunks:'#3b5a2a',gloves:'#7a5a2a',hp:140,speed:.82,dmg:1.15,guard:'switch',moves:{jab:3,hook:3,upper:2,body:2},combo:.45,slip:.2,
  special:{name:'FIRST BLOOD FLURRY',hits:4,avoid:'dodge',tell:1.0},getup:[5,8,null],record:'48-1',from:'Hope County',lines:['They drew first blood.','Nothing is over!','You\'re the one who\'ll be fighting the war.'],tip:'He throws combos. Keep dodging until he stops, then strike back.'},
 {id:'terminator',name:'T-800',circuit:2,type:'giant',trunks:'#202024',gloves:'#606a74',hp:160,speed:.92,dmg:1.25,guard:'high',moves:{jab:3,hook:2,upper:2,body:2},combo:.3,slip:0,armor:.5,
  special:{name:'JUDGMENT DAY',hits:2,avoid:'dodge',tell:1.05},getup:[6,9,null],record:'52-0',from:'Skynet',lines:['I\'ll be back. You won\'t.','Target acquired.','Your punches: no effect.'],tip:'His head is armored: only counters and star punches really hurt. Body works too.'},
 {id:'goro',name:'Goro',circuit:2,type:'giant',trunks:'#7a1a1a',gloves:'#c89a2a',hp:170,speed:.9,dmg:1.3,guard:'low',moves:{jab:2,hook:3,upper:3,body:1},combo:.35,slip:0,
  special:{name:'FOUR-ARM FURY',hits:4,avoid:'dodge',tell:1.1},getup:[6,9,null],record:'500-0',from:'Outworld',lines:['Four arms. Count them.','I have crushed champions for 500 years.','Kneel before Goro!'],tip:'Four punches in his fury. Dodge every one, then hit his face: he guards low.'},
 {id:'ivan-drago',name:'Ivan Drago',circuit:3,type:'champ',trunks:'#c0262e',gloves:'#c0262e',hp:190,speed:.78,dmg:1.4,guard:'switch',moves:{jab:3,hook:3,upper:3,body:2},combo:.45,slip:.25,
  special:{name:'SIBERIAN EXPRESS',hits:3,avoid:'dodge',tell:.95},getup:[7,9,null],record:'31-0 · CHAMPION',from:'Moscow',lines:['I must break you.','You will lose.','Whatever he hits, he destroys.'],tip:'The champ. Watch the eyes flash before the Express. Counters and stars only.'},
 {id:'jcvd',name:'Jean-Claude Van Damme',circuit:4,type:'lean',trunks:'#1a1a1a',gloves:'#e8c21e',hp:210,speed:.7,dmg:1.5,guard:'switch',moves:{jab:3,hook:3,upper:3,body:3},combo:.55,slip:.3,taunt:.15,
  special:{name:'SPLIT-SECOND SPLITS',hits:2,avoid:'duck',tell:.9},getup:[8,null,null],record:'?-0 · LEGEND',from:'The Kumite',lines:['Bloodsport has no rules.','I am splitting you in two.','Feel the kick. Of a punch.'],tip:'The dream fight. His splits go high: DUCK them!'}];
const TRAINER='rocky-balboa';
Object.assign(exports,{CIRCUITS,FIGHTERS,TRAINER});
