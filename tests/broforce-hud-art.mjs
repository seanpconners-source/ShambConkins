// BF-22 canvas geometry and contract checks. Run: node tests/broforce-hud-art.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const filename=new URL('../src/engines/broforce/hudArt.js',import.meta.url);
const source=fs.readFileSync(filename,'utf8');
const sandbox={exports:{},require(){throw Error('HUD must not import modules');},fetch(){throw Error('HUD must not fetch');}};
vm.runInNewContext(source,sandbox,{filename:'hudArt.js',timeout:2000});
const {drawBroforceHud}=sandbox.exports;
assert.equal(typeof drawBroforceHud,'function');
assert.deepEqual(Object.keys(sandbox.exports),['drawBroforceHud']);
assert.doesNotMatch(source,/\bMath\.random\s*\(/,'render must be deterministic');

class FakeCanvas {
  constructor(width,height,{badPhoto=false}={}) {
    this.canvas={width,height};this.calls=[];this.frames=[];this.depth=0;
    this.fillStyle='original';this.font='original';this.textAlign='left';
    this.textBaseline='alphabetic';this.imageSmoothingEnabled=true;this.badPhoto=badPhoto;
  }
  save(){this.frames.push([this.fillStyle,this.font,this.textAlign,this.textBaseline,this.imageSmoothingEnabled]);this.depth++;}
  restore(){assert(this.depth>0);this.depth--;[this.fillStyle,this.font,this.textAlign,this.textBaseline,this.imageSmoothingEnabled]=this.frames.pop();}
  valid(...args){for(const x of args)assert(Number.isFinite(x),'finite Canvas2D coordinates');}
  fillRect(x,y,w,h){this.valid(x,y,w,h);assert(w>=0&&h>=0);this.calls.push(['rect',this.fillStyle,x,y,w,h]);}
  beginPath(){}closePath(){}clip(){}
  rect(...args){this.valid(...args);this.calls.push(['clip',...args]);}
  moveTo(...args){this.valid(...args);}lineTo(...args){this.valid(...args);}
  measureText(v){return {width:String(v).length*(Number(this.font.match(/\d+(?=px)/)?.[0])||12)*.64};}
  fillText(v,x,y){this.valid(x,y);const size=Number(this.font.match(/\d+(?=px)/)?.[0])||12;
    const width=this.measureText(v).width;
    const start=this.textAlign==='center'?x-width/2:this.textAlign==='right'?x-width:x;
    this.calls.push(['text',String(v),start,y,width,size]);
  }
  drawImage(...args){if(this.badPhoto)throw Error('image unavailable');this.calls.push(['image',...args.slice(1)]);}
}
const viewports=[
  {width:390,height:780,safeInsets:{top:24,right:0,bottom:24,left:0}},
  {width:780,height:390,safeInsets:{top:8,right:16,bottom:12,left:36}},
  {width:844,height:390,safeInsets:{top:8,right:16,bottom:12,left:36}},
  {width:840,height:700,safeInsets:{top:0,right:0,bottom:0,left:0}},
  {width:1100,height:700,safeInsets:{top:0,right:0,bottom:0,left:0}}
];
const players=[
  {name:'Sean The Destroyer',character:'sean',alive:true,weapon:'heavy scrap carbine',ammo:32,reserveAmmo:136,rescues:3},
  {name:'Amber the Apocalypse',character:'amber',alive:true,weapon:{name:'rocket launcher',ammo:7,reserve:12},rescues:2}
];
const mission={stage:'JUNGLE RELAY',objective:'DESTROY ALL GENERATORS BEFORE EXTRACTION',rescues:5,rescueTarget:6};
const devil={active:true,name:'DEVIL - THE RECKONING',health:164,maxHealth:220};
const extraction={active:true,countdown:14,duration:45};
const render=(viewport,options={})=>{
  const ctx=new FakeCanvas(viewport.width,viewport.height,options);
  const snapshot={viewport,players,mission,devil,extraction,...options};
  const before=JSON.stringify(snapshot);
  const meta=drawBroforceHud(ctx,snapshot);
  assert.equal(JSON.stringify(snapshot),before,'renderer never mutates any input');
  assert.equal(ctx.depth,0,'save/restore canvas stack balanced');
  assert.equal(ctx.fillStyle,'original','fill style restored');
  assert.equal(ctx.font,'original','font restored');
  assert.equal(ctx.imageSmoothingEnabled,true,'image smoothing restored');
  assert(ctx.calls.some(c=>c[0]==='text'&&c[1].includes('P')===false));
  const {width:W,height:H}=viewport;
  const safe=viewport.safeInsets;
  for(const c of ctx.calls){
    if(c[0]==='text'){
      const [,text,x,y,w,size]=c;
      assert(x>=safe.left-1 && x+w<=W-safe.right+1,`text ${text} horizontal bound at ${W}x${H}`);
      assert(y-size*.75>=safe.top-1 && y+size*.75<=H-safe.bottom+1,`text ${text} vertical bound`);
    }
    if(c[0]==='clip'){
      const [,x,y,w,h]=c;
      assert(x>=safe.left-1 && x+w<=W-safe.right+1,'text clip within safe width');
      assert(y>=safe.top-1 && y+h<=H-safe.bottom+1,'text clip within safe height');
    }
  }
  const zones=meta.controlZones;
  assert(zones.pause.width>=44&&zones.pause.height>=44,'accessible 44px pause hit target');
  assert(zones.pause.x>=safe.left && zones.pause.x+zones.pause.width<=W-safe.right);
  assert(zones.pause.y>=safe.top && zones.pause.y+zones.pause.height<=H-safe.bottom);
  assert(meta.insets.top>=safe.top && meta.insets.top<H*.31,'small top reserved area');
  assert(zones.gameplay.height>H*.34,'usable center playfield');
  assert(zones.player1.x+zones.player1.width<zones.player2.x,'nonoverlapping touch islands');
  return {ctx,meta};
};
for(const viewport of viewports){
  const {ctx}=render(viewport,{extraction:{active:false},time:12.25});
  assert(ctx.calls.some(c=>c[0]==='text'&&c[1].includes('BOSS')),'boss meter must be visible');
  const ext=render(viewport,{players:[players[0],{...players[1],boarded:true,alive:true}],time:12.25});
  assert(ext.ctx.calls.some(c=>c[0]==='text'&&c[1].includes('BOARD')),'boarding shown');
  assert(ext.ctx.calls.some(c=>c[0]==='text'&&c[1].includes('LIFT')),'extraction timer shown');
  assert(ext.ctx.calls.some(c=>c[0]==='text'&&c[1].includes('ABOARD')),'per-player boarded count');
  const down=render(viewport,{players:[{...players[0],down:true}, {...players[1],alive:false}],extraction:{active:false},devil:{active:false},reducedMotion:true});
  assert(down.ctx.calls.some(c=>c[0]==='text'&&c[1]==='DOWN'));
}
const p={width:390,height:780,safeInsets:{top:24,right:0,bottom:24,left:0}};
const noMotion=render(p,{time:0,reducedMotion:true});
const noMotion2=render(p,{time:17.5,reducedMotion:true});
assert.deepEqual(noMotion.ctx.calls,noMotion2.ctx.calls,'reduced motion independent of time');
const animated=render(p,{time:13,reducedMotion:false});
assert.notDeepEqual(noMotion.ctx.calls,animated.ctx.calls,'nonessential animated signal active');
const graceful=render(p,{players:[{name:'Broken callback',drawHead(){throw Error('asset unavailable');}},{name:'No photo',headImage:{complete:false,width:20,height:20}}],mission:{},devil:{active:false},extraction:{active:false}});
assert(graceful.ctx.calls.some(c=>c[0]==='text'&&c[1].includes('BR')),'callback falls back to initials');
const image={complete:true,naturalWidth:100,naturalHeight:180};
let portraits=0;
const loaded=render(p,{players:[{name:'Sean',headImage:image}, {name:'Amber',drawHead(_g,x,y,w){portraits++;assert(w>18&&x>0&&y>0);}}],extraction:{active:false},devil:{active:false}});
assert(loaded.ctx.calls.some(c=>c[0]==='image'),'offline portrait drawn');assert.equal(portraits,1);
assert.doesNotThrow(()=>drawBroforceHud(null,{}),'null context harmless');
assert.doesNotThrow(()=>drawBroforceHud(new FakeCanvas(0,0),{viewport:{width:NaN,height:NaN}}));
assert.doesNotThrow(()=>drawBroforceHud(new FakeCanvas(390,780),{players:[],mission:null,devil:null,extraction:null}));
console.log(`PASS BF-22 HUD: ${viewports.length} viewport geometries, boss, extraction, photos, callback, state, safe margins, pure snapshots, reduced motion`);
