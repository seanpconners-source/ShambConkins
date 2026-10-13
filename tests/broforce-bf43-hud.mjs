// BF-43: node tests/broforce-bf43-hud.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/engines/broforce/hudArt.js',import.meta.url),'utf8');
const box={exports:{}};
vm.runInNewContext(source,box,{filename:'hudArt.js',timeout:2000});
const {drawBroforceHud}=box.exports;
assert.equal(typeof drawBroforceHud,'function');
assert.deepEqual(Object.keys(box.exports),['drawBroforceHud']);
assert.doesNotMatch(source,/\bMath\.random\s*\(/);

class Canvas {
  constructor(w,h){this.canvas={width:w,height:h};this.calls=[];this.stack=[];this.depth=0;this.font='original';this.fillStyle='original';this.imageSmoothingEnabled=true;}
  save(){this.stack.push([this.font,this.fillStyle,this.imageSmoothingEnabled]);this.depth++;}
  restore(){assert(this.depth>0);this.depth--;[this.font,this.fillStyle,this.imageSmoothingEnabled]=this.stack.pop();}
  fillRect(x,y,width,height){for(const n of [x,y,width,height])assert(Number.isFinite(n));assert(width>=0&&height>=0);this.calls.push({kind:'rect',color:this.fillStyle,x,y,width,height});}
  fillText(v,x,y){assert(Number.isFinite(x)&&Number.isFinite(y));this.calls.push({kind:'text',value:String(v)});}
  beginPath(){}closePath(){}clip(){}rect(){}moveTo(){}lineTo(){}drawImage(){}
  measureText(t){return {width:String(t).length*(Number(this.font.match(/\d+(?=px)/)?.[0])||12)*.64};}
}
function collides(a,b){return Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y);}
const dimensions=[
 [390,780,{top:24,right:0,bottom:24,left:0}],
 [390,780,{top:38,right:22,bottom:34,left:12}],
 [780,390,{top:8,right:16,bottom:12,left:36}],
 [780,390,{top:16,right:36,bottom:20,left:48}],
 [840,700,{top:12,right:32,bottom:20,left:25}],
 [1100,700,{top:0,right:0,bottom:0,left:0}]
];
const players=[{name:'Sean The Destroyer',weapon:'Heavy Carbine',ammo:32,reserveAmmo:136,rescues:3},{name:'Amber The Apocalypse',weapon:'Rocket Launcher',ammo:7,reserveAmmo:12,rescues:2}];
const mission={stage:'Jungle Relay',objective:'Destroy all generators before extraction',rescues:5,rescueTarget:6};
let checked=0;
for(const [W,H,safeInsets] of dimensions)for(const showPause of [true,false])for(const extractionActive of [false,true]){
 const g=new Canvas(W,H);
 const snapshot={viewport:{width:W,height:H,safeInsets},players,mission,showPause,
   devil:{active:true,name:'Devil the Reckoning',health:75,maxHealth:100},
   extraction:{active:extractionActive,countdown:14,duration:45}};
 const before=JSON.stringify(snapshot),meta=drawBroforceHud(g,snapshot);
 assert.equal(JSON.stringify(snapshot),before,'immutable snapshot');
 assert.equal(g.depth,0,'balanced Canvas state');
 assert.equal(g.fillStyle,'original');
 assert.equal(g.imageSmoothingEnabled,true);
 const text=g.calls.filter(c=>c.kind==='text').map(c=>c.value);
 const frames=g.calls.filter(c=>c.kind==='rect'&&c.color==='rgba(8,21,30,0.90)');
 assert.equal(frames.length,4,'two player cards, objective, and progress');
 for(let i=0;i<frames.length;i++){
   const r=frames[i];
   assert(r.x>=safeInsets.left&&r.x+r.width<=W-safeInsets.right,'horizontal safe inset');
   assert(r.y>=safeInsets.top&&r.y+r.height<=H-safeInsets.bottom,'vertical safe inset');
   assert(r.y+r.height<meta.insets.top,'top playfield reservation');
   for(let j=0;j<i;j++)assert(!collides(r,frames[j]),'HUD islands overlap');
   for(const zone of [meta.controlZones.player1,meta.controlZones.player2,meta.controlZones.gameplay]){
     assert(!collides(r,zone),'HUD overlaps gameplay/controls');
   }
 }
 for(const label of ['SEAN','AMBER','HEAVY','ROCKET','DESTROY','5/6 SAVED',extractionActive?'LIFT':'BOSS']){
   assert(text.some(t=>t.startsWith(label)),'missing '+label+' at '+W+'x'+H);
 }
 assert(text.some(t=>t.startsWith('32'))&&text.some(t=>t.startsWith('7')),'both ammo displays');
 assert.equal(text.filter(t=>t==='UP').length,2);
 if(extractionActive)assert(text.some(t=>t.includes('00:14')&&t.includes('0/2 ABOARD')),'countdown and boarding');
 else assert(text.some(t=>t.includes('75%')),'devil health');
 if(showPause){
   assert.equal(meta.controlZones.pause.width,44);
   assert(text.includes('II'));
   for(const r of frames)assert(!collides(r,meta.controlZones.pause),'Pause collision');
 }else{
   assert(!('pause' in meta.controlZones),'DOM Pause should have no canvas target');
   assert(!text.includes('II'),'fake Pause forbidden');
 }
 if(W===390){
   assert(frames[0].width>=270,'portrait name/weapon card width');
   assert(frames[1].y>=frames[0].y+frames[0].height,'stack player cards in portrait');
 }
 assert(meta.controlZones.player1.x+meta.controlZones.player1.width<meta.controlZones.player2.x,'independent control islands');
 assert(meta.controlZones.gameplay.height>H*.34,'usable gameplay corridor');
 checked++;
}
const resultCanvas=new Canvas(390,780);
drawBroforceHud(resultCanvas,{viewport:{width:390,height:780},showPause:false,players:[{...players[0],down:true},{...players[1],boarded:true}],mission,extraction:{active:true,countdown:2}});
const states=resultCanvas.calls.filter(c=>c.kind==='text').map(c=>c.value);
assert(states.includes('DOWN')&&states.includes('BOARD'),'individual down/boarded status');
assert(states.some(t=>t.includes('1/2 ABOARD')),'count only boarded player');
assert.equal(resultCanvas.depth,0);
const hostile=new Canvas(390,780);
drawBroforceHud(hostile,{viewport:{width:390,height:780,safeInsets:{top:42,right:16,bottom:28,left:24}},showPause:false,
  players:[{name:'Broken photograph',drawHead(){throw Error('photo unavailable');}},{}],
  mission:{objective:'X'.repeat(4000),rescues:2,rescueTarget:9}});
const hostileLabels=hostile.calls.filter(c=>c.kind==='text').map(c=>c.value);
assert(hostileLabels.includes('BP'),'failed portrait falls back to initials');
assert(hostileLabels.includes('2/9 SAVED'),'rescue progress never loses to long objective');
assert.equal(hostile.depth,0);
assert.doesNotThrow(()=>drawBroforceHud(null,{}));
for(const [w,h] of [[0,0],[159,119],[1,1000]]){
 const c=new Canvas(w,h);
 assert.doesNotThrow(()=>drawBroforceHud(c,{viewport:{width:w,height:h},players:[],mission:null}));
 assert.equal(c.depth,0);
}
assert.doesNotThrow(()=>drawBroforceHud(new Canvas(0,0),{viewport:{width:NaN,height:Infinity}}));
console.log('PASS BF-43: '+checked+' geometry/pause/rescue scenarios plus hostile snapshots');
