// Broforce · a three-stage run-and-gun mission, played in turns like the Sonic and Mario games: P1 runs the whole
// mission (Stage 1 → Stage 2 → Stage 3 with the Devil and the chopper), then P2 runs the same seeded mission, and the
// higher score wins. Fully destructible tile terrain several layers deep (tunnels, bunkers, two-storey barracks,
// watchtowers, cliffs with hidden caves, pits under rope bridges), Broforce movement (run, generous jump, climb any
// wall you push into, ladders, mantle over ledges), one bro per life with its own weapon, grenades, exploding barrels,
// lots of enemies with sight, alarms and reaction time (mooks, suicide bombers, bruisers with miniguns, attack dogs,
// grenadiers), checkpoint flags, caged prisoners and the extraction helicopter.
// Prisoners: every cage you open is a new bro (you switch to them, +1 life). The GOLD cage on each stage holds a
// character you have not unlocked; free it and they join your roster after the game (session.broforceRecruits).
// Each owner keeps their own roster; nothing unlocks unless a gold cage was opened. Ids/game ids are unchanged.
// Online (s.online) the mission is CO-OP: both bros run the same mission at once, each phone following its own bro (the
// partner drawn from snapshots, an edge arrow when off screen). Player 1's phone ("host") runs the enemies, the Devil and
// the cage line-up and streams them; the other phone draws them, sends its hits ({fh} foes, {bh} the Devil) and judges
// only what hits its own bro (enemy shots {fb}/{fw} replayed there, blasts {ex}). Each phone damages terrain for what it
// fires and sends the broken tiles {tb}; cages {cg} and flags {fl} are shared, a GOLD cage frees its character for both.
// A dead bro respawns next to the partner; out of bros you watch until the next stage (or until the partner frees a
// prisoner, which brings you back); the chopper waits 10 s for the partner, then pulls them along; both start the next
// stage together. Own score as usual, higher wins; the mission ends when the chopper leaves stage 3 or both are out.
const {clamp,hash}=require('src/utils.js');
const {soloFinish,soloProgress}=require('src/solo.js');
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,PCOL,Countdown,settle}=require('src/engines/arenaKit.js');
const {netField}=require('src/engines/netField.js');
const {partnerArrow}=require('src/engines/partnerArrow.js');
const NET_GRACE=10,FOE_STATES=['patrol','alert','attack','search'],FOE_TYPES=['mook','bomber','bruiser','dog','grenadier'];

const STEP=1/60,T=16,ROWS=34,MAXW=260,G=19; // tile px, map rows, map stride, surface row
const E=0,DIRT=1,BRICK=2,STEEL=3,WOOD=4,LADDER=5,BARREL=6,BAGS=7,PLAT=8,CRATE=9,ROCK=10;
const HP=[0,3,7,1e9,2,1,1,3,2,2,10];
const SOLID=[0,1,1,1,1,0,1,1,0,1,1];
const TURN_TIME=300,PAR=[80,95,120];
const WEAPONS={
 rifle:{name:'ASSAULT RIFLE',rate:.1,dmg:1,speed:520,life:.55,tile:1},
 shotgun:{name:'SHOTGUN',rate:.48,dmg:1.4,speed:460,life:.26,tile:1,pellets:6,spread:.32},
 rocket:{name:'ROCKET LAUNCHER',rate:.62,dmg:3,speed:300,life:1.4,tile:0,rocket:true},
 flame:{name:'FLAMETHROWER',rate:.045,dmg:.4,speed:190,life:.36,tile:.25,flame:true},
 pistols:{name:'TWIN PISTOLS',rate:.13,dmg:1.6,speed:600,life:.5,tile:1.4}
};
const WEAPON_IDS=Object.keys(WEAPONS);
const FOES={
 mook:{hp:1,w:5,h:20,speed:28,sight:175,score:100},
 bomber:{hp:1,w:5,h:20,speed:30,sight:160,score:150},
 bruiser:{hp:8,w:8,h:28,speed:18,sight:190,score:400},
 dog:{hp:1.5,w:7,h:11,speed:34,sight:150,score:150},
 grenadier:{hp:1,w:5,h:20,speed:26,sight:200,score:150}
};
const THEMES={
 'broforce-jungle':{name:'JUNGLE',op:'OPERATION GREEN HELL',stages:['VILLAGE INSERTION','PRISON CAMP','TEMPLE OF THE DEVIL'],
  sky:['#3f8fc4','#a8d8c8'],far:'#4c7f72',mid:'#2d5a3e',haze:'#bfe3cf',dirt:['#7b4b25','#6c3f1d','#8a5a2e'],top:'#58b334',topDark:'#2f7d1f',
  brick:['#8f8a74','#6d6957'],wood:'#9a6634',rock:['#7d7a72','#5b5952'],cave:'#26170c',interior:'#3b2f22',decor:'jungle'},
 'broforce-factory':{name:'FACTORY',op:'OPERATION IRON SHIFT',stages:['LOADING DOCKS','FOUNDRY FLOOR','HELLFIRE REACTOR'],
  sky:['#5b4a4a','#d29a62'],far:'#5e4a44',mid:'#3a2f2e',haze:'#e8b884',dirt:['#5a4a42','#4c3e37','#66544a'],top:'#8d8f93',topDark:'#56585c',
  brick:['#9a5a3e','#74402c'],wood:'#8a6a3c',rock:['#6e6e72','#4f4f54'],cave:'#1c1512',interior:'#2e2624',decor:'factory'},
 'broforce-city':{name:'CITY',op:'OPERATION ROOFTOP RUN',stages:['DOWNTOWN BLOCK','SUBWAY SIEGE','TOWER OF SATAN'],
  sky:['#2c3e6b','#e48a62'],far:'#3d4466',mid:'#262b45',haze:'#f0a07a',dirt:['#6b6158','#5c534b','#776c62'],top:'#3c3c40',topDark:'#232326',
  brick:['#a24a36','#7a3426'],wood:'#8b5e34',rock:['#80807c','#5e5e5a'],cave:'#1d1916',interior:'#3a2a26',decor:'city'},
 'broforce-desert':{name:'DESERT',op:'OPERATION DUST STORM',stages:['DUNE OUTPOST','BUNKER LINE','PIT OF HELL'],
  sky:['#4a9ad8','#f6dca0'],far:'#c99a5e',mid:'#a2733f',haze:'#fbe2b0',dirt:['#c99a58','#b5864a','#d6a966'],top:'#e8c27a',topDark:'#b98d4c',
  brick:['#b49064','#8e6c46'],wood:'#8a5c2e',rock:['#a08a6c','#7b6a52'],cave:'#3a2614',interior:'#4a3622',decor:'desert'}
};

// ------------------------------------------------------------------ seeded stage generation (shared by both turns)
function mulberry(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5>>>0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
function buildStage(seed,si){
 const rand=mulberry(seed),ri=(a,b)=>a+Math.floor(rand()*(b-a+1)),chance=p=>rand()<p;
 const tiles=new Uint8Array(MAXW*ROWS),back=new Uint8Array(MAXW*ROWS);
 const foes=[],slots=[],decor=[],crates=[];let cx=0,boss=null,arena=null,exit=null;
 const set=(c,r,t)=>{if(c>=0&&c<MAXW&&r>=0&&r<ROWS)tiles[r*MAXW+c]=t;};
 const get=(c,r)=>c<0||c>=MAXW||r<0||r>=ROWS?STEEL:tiles[r*MAXW+c];
 const setB=(c,r,b)=>{if(c>=0&&c<MAXW&&r>=0&&r<ROWS)back[r*MAXW+c]=b;};
 const fill=(c0,c1,r0,r1,t)=>{for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)set(c,r,t);};
 const fillB=(c0,c1,r0,r1,b)=>{for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)setB(c,r,b);};
 const ground=(c,top)=>{for(let r=top;r<ROWS-1;r++){set(c,r,r>=top+4&&chance(.16)||r>=ROWS-4&&chance(.5)?ROCK:DIRT);setB(c,r,1);}set(c,ROWS-1,STEEL);};
 const foe=(type,c,row,extra={})=>foes.push({type,x:(c+.5)*T,y:row*T,...extra});
 const slot=(c,row,depth)=>slots.push({x:(c+.5)*T,y:row*T,depth,c});
 const level=si+1;
 const SEG={
  start(){const L=9;for(let c=cx;c<cx+L;c++)ground(c,G);decor.push({k:'sign',x:(cx+6)*T,y:G*T});return L;},
  hills(){const L=ri(13,17);let top=G;for(let c=cx;c<cx+L;c++){if((c-cx)%3===2&&c<cx+L-2)top=clamp(top+ri(-1,1),G-3,G+2);ground(c,top);}
   const b=ri(cx+2,cx+L-4);for(let c=b;c<b+2;c++)set(c,surf(c)-1,BAGS);
   const a=ri(cx+3,cx+L-3);foe(chance(.3+si*.15)?'bomber':'mook',a,surf(a));foe('mook',cx+L-2,surf(cx+L-2));if(level>1)foe(chance(.5)?'dog':'grenadier',cx+5,surf(cx+5));
   decor.push({k:'tree',x:(cx+2)*T,y:surf(cx+2)*T},{k:'tree',x:(cx+L-5)*T,y:surf(cx+L-5)*T});
   const v=ri(cx+4,cx+L-4);if(v<b||v>b+1)set(v,surf(v)-1,BARREL);const sc=v===cx+L-4?cx+L-5:cx+L-4;slot(sc,surf(sc),0);return L;},
  tower(){const L=11;for(let c=cx;c<cx+L;c++)ground(c,G);
   fill(cx+2,cx+7,G-4,G-4,PLAT);fill(cx+2,cx+7,G-8,G-8,PLAT);fill(cx+1,cx+8,G-12,G-12,WOOD);
   for(let r=G-8;r<G;r++)set(cx+4,r,LADDER);decor.push({k:'tower',x:(cx+2)*T,x2:(cx+8)*T,y:G*T,top:(G-12)*T});
   set(cx+2,G-9,BAGS);set(cx+7,G-9,BAGS);foe('mook',cx+5,G-8);foe(level>1?'grenadier':'mook',cx+6,G-4);set(cx+9,G-1,BARREL);
   slot(cx+6,G-8,2);return L;},
  bunker(){const L=15;for(let c=cx;c<cx+L;c++)ground(c,G);const a=cx+1,b=cx+13;
   fill(a,b,G-7,G-6,BRICK);fill(a,a,G-6,G-3,BRICK);fill(b,b,G-6,G-3,BRICK);set(a,G-4,E);set(b,G-4,E);fillB(a+1,b-1,G-5,G-1,2);fillB(a,b,G-7,G-1,2);
   foe('mook',cx+4,G);foe(level>1?'bruiser':'mook',cx+9,G);foe('mook',cx+7,G-7);set(cx+11,G-1,BARREL);set(cx+3,G-1,CRATE);crates.push(1);
   decor.push({k:'banner',x:(cx+7)*T,y:(G-7)*T});slot(cx+6,G,2);return L;},
  tunnel(){const L=19;for(let c=cx;c<cx+L;c++)ground(c,G);const r0=G+4,r1=G+7;
   fill(cx+2,cx+16,r0,r1,E);fill(cx+2,cx+3,G,r0,E);fill(cx+15,cx+16,G,r0,E);
   for(let r=G;r<=r1;r++){set(cx+2,r,LADDER);set(cx+16,r,LADDER);}set(cx+3,G,PLAT);set(cx+15,G,PLAT);
   fill(cx+7,cx+11,r1+1,r1+3,E);for(let c=cx+7;c<=cx+11;c++)set(c,r1+3,ROCK);
   foe('mook',cx+6,r1+1);foe(level>1?'dog':'mook',cx+12,r1+1);foe('mook',cx+9,r1+3);set(cx+13,r1,BARREL);set(cx+5,r1,CRATE);set(cx+5,r1-1,CRATE);crates.push(1);
   foe(chance(.5)?'bomber':'mook',cx+9,G);decor.push({k:'lamp',x:(cx+5)*T,y:r0*T},{k:'lamp',x:(cx+13)*T,y:r0*T});
   slot(cx+9,r1+3,4);return L;},
  cliff(){const L=17;for(let c=cx;c<cx+L;c++)ground(c,c>=cx+3&&c<=cx+12?G-5:G);
   fill(cx+6,cx+9,G-3,G-1,E);decor.push({k:'tree',x:(cx+10)*T,y:(G-5)*T});
   foe('mook',cx+5,G-5);foe(level>1?'bruiser':'bomber',cx+10,G-5);foe('dog',cx+14,G);if(chance(.5))for(let r=G-5;r<G;r++)set(cx+2,r,LADDER);
   set(cx+6,G-1,CRATE);slot(cx+8,G,3);return L;},
  pit(){const L=13;for(let c=cx;c<cx+L;c++)ground(c,c>=cx+3&&c<=cx+9?G+7:G);
   fill(cx+3,cx+9,G,G,WOOD);fillB(cx+3,cx+9,G+1,G+6,1);decor.push({k:'posts',x:(cx+3)*T,x2:(cx+10)*T,y:G*T});
   foe('mook',cx+1,G);foe('mook',cx+11,G);foe(level>1?'dog':'mook',cx+6,G+7);set(cx+4,G+6,CRATE);set(cx+8,G+6,BARREL);
   slot(cx+6,G+7,2);return L;},
  barracks(){const L=15;for(let c=cx;c<cx+L;c++)ground(c,G);const a=cx+1,b=cx+13;
   fill(a,b,G-11,G-11,BRICK);fill(a,a,G-11,G-3,BRICK);fill(b,b,G-11,G-3,BRICK);set(a,G-8,E);set(b,G-8,E);fillB(a,b,G-11,G-1,2);
   fill(a+1,b-1,G-6,G-6,PLAT);for(let r=G-6;r<G;r++)set(cx+3,r,LADDER);for(let r=G-11;r<G-6;r++)set(b-1,r,LADDER);
   foe('mook',cx+6,G);foe('mook',cx+10,G);foe(level>1?'bruiser':'mook',cx+8,G-6);foe('grenadier',cx+11,G-6);foe('mook',cx+5,G-11);
   set(cx+9,G-1,BARREL);set(cx+5,G-7,CRATE);crates.push(1);decor.push({k:'banner',x:(cx+7)*T,y:(G-11)*T});slot(cx+5,G-6,2);return L;},
  compound(){const L=16;for(let c=cx;c<cx+L;c++)ground(c,G);
   for(let c=cx+2;c<=cx+13;c+=4){set(c,G-1,BAGS);}fill(cx+1,cx+14,G-6,G-6,WOOD);fill(cx+1,cx+1,G-6,G-1,WOOD);fillB(cx+1,cx+14,G-6,G-1,3);
   foe('mook',cx+4,G);foe('mook',cx+12,G);foe(level>1?'bruiser':'mook',cx+8,G);foe('grenadier',cx+7,G-6);set(cx+14,G-1,BARREL);
   decor.push({k:'wire',x:(cx)*T,x2:(cx+16)*T,y:G*T},{k:'spot',x:(cx+15)*T,y:G*T});
   slot(cx+4,G,1);slot(cx+12,G,1);return L;},
  arena(){const L=30;for(let c=cx;c<cx+L;c++){ground(c,G);set(c,G,ROCK);}
   arena={c0:cx+1,c1:cx+L-1,x0:(cx+1)*T,x1:(cx+L-1)*T,triggered:false};boss={x:(cx+22)*T,y:G*T};
   for(const k of [4,11,18,25])decor.push({k:'brazier',x:(cx+k)*T,y:G*T});return L;},
  chopper(){const L=13;for(let c=cx;c<cx+L;c++)ground(c,G);exit={x:(cx+7)*T,y:G*T};decor.push({k:'pad',x:(cx+7)*T,y:G*T});return L;}
 };
 function surf(c){for(let r=0;r<ROWS;r++){const t=get(c,r);if(SOLID[t]||t===PLAT)return r;}return ROWS-1;}
 const pools=[['hills','tower','tunnel','bunker','cliff','pit','hills'],['bunker','compound','tunnel','barracks','pit','cliff','tower'],['hills','barracks','tunnel','tower','cliff','bunker','compound']];
 const mid=pools[si].slice();for(let i=mid.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[mid[i],mid[j]]=[mid[j],mid[i]];}
 // the tunnel never opens a stage, so the first fight always happens in daylight
 if(mid[0]==='tunnel'){mid.push(mid.shift());}
 const order=['start',...mid,...(si===2?['arena']:[]),'chopper'];
 for(const k of order)cx+=SEG[k]();
 const W=cx+1;for(let r=0;r<ROWS;r++){set(0,r,STEEL);set(W-1,r,STEEL);}
 // patrols: any quiet stretch of open ground gets a soldier (or a dog / bomber later on)
 const end=arena?arena.c0-2:W-15;
 for(let c=13;c<end;c+=3){const row=surf(c);if(back[(row-1)*MAXW+c]||get(c,row-1)!==E||foes.some(f=>Math.abs(f.x/T-c)<3&&Math.abs(f.y/T-row)<3))continue;
  if(chance(.68+si*.1))foe(chance(.12+si*.08)?'bomber':chance(.1*si)?'dog':chance(.15)?'grenadier':'mook',c,row);}
 // the deepest slot holds the GOLD cage (a locked character); two more cages hold reinforcements
 slots.sort((a,b)=>b.depth-a.depth||a.x-b.x);const cages=[];const vip=slots.find(sl=>sl.depth>=2)||slots[0];
 if(vip)cages.push({...vip,vip:true});const rest=slots.filter(sl=>sl!==vip);for(let k=0;k<2&&rest.length;k++)cages.push({...rest.splice(Math.floor(rand()*rest.length),1)[0],vip:false});
 const flags=[.34,.67].map(f=>{const c=Math.round(W*f);return {x:(c+.5)*T,y:surf(c)*T,up:false};});
 const spawn={x:3.5*T,y:surf(3)*T};
 return {W,tiles,back,foes,cages,decor,flags,spawn,boss,arena,exit,si,surfAt:surf};
}

// ------------------------------------------------------------------ portrait heads (oval photos or outlined cut-outs)
const HEADS=new Map();
function headCanvas(id,mood='normal'){
 const key=id+':'+mood,ready=()=>mood!=='normal'&&HEADS.get(id+':normal')?.c||placeholderHead(id);let h=HEADS.get(key);if(h)return h.c||ready();
 h={c:null};HEADS.set(key,h);
 try{
  const {portraitURL,portraitFallbackURL}=require('src/assets.js'),{headDisplayURL}=require('src/headCutouts.js');
  // generated SVG cards (initials on a square) look like a box: use the head-shaped stand-in for those
  let src=portraitURL(id,mood);if(!src||/^data:image\/svg/.test(src)&&id!=='mars-attacker')src=portraitFallbackURL(id);
  // online photos (Wikimedia) are requested with CORS so their pixels can be read and the backdrop cut away;
  // if that request is refused, load them plainly (oval), then fall back to the stand-in head
  const url=headDisplayURL(src),remote=/^https:/.test(url);let step=0;
  const load=()=>{const img=new Image();if(remote&&step===0)img.crossOrigin='anonymous';
   img.onload=()=>{h.c=renderHead(img)||placeholderHead(id);};
   img.onerror=()=>{step++;if(remote&&step===1)load();else if(step<=2&&img.src!==portraitFallbackURL(id)){const fb=new Image();fb.onload=()=>{h.c=renderHead(fb)||placeholderHead(id);};fb.onerror=()=>{h.c=placeholderHead(id);};fb.src=portraitFallbackURL(id);}else h.c=placeholderHead(id);};
   img.src=url;};
  load();
 }catch{h.c=placeholderHead(id);}
 return h.c||ready();
}
const PLACE=new Map();
function placeholderHead(id){
 let c=PLACE.get(id);if(c)return c;c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
 let icon='🙂';try{icon=require('src/characters.js').character(id)?.icon||icon;}catch{}
 const hue=hash(id)%360;x.fillStyle=`hsl(${hue} 45% 62%)`;x.strokeStyle='#1a120c';x.lineWidth=4;x.beginPath();x.ellipse(32,32,26,29,0,0,7);x.fill();x.stroke();
 x.font='34px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(icon,32,34);PLACE.set(id,c);return c;
}
// Every head ends up as the face's own silhouette with a dark cartoon outline (like the owner's drop-in cut-outs):
// transparent cut-outs keep their shape; a photo with a plain backdrop gets the backdrop flood-filled away from the
// edges; only a busy photo we cannot separate (or a cross-origin one we cannot read) falls back to an outlined oval.
function renderHead(img){
 const w=img.naturalWidth,h=img.naturalHeight;if(!w||!h)return null;
 const k=Math.min(1,160/Math.max(w,h)),cw=Math.max(1,Math.round(w*k)),ch=Math.max(1,Math.round(h*k));
 const work=document.createElement('canvas');work.width=cw;work.height=ch;const wx=work.getContext('2d',{willReadFrequently:true});wx.drawImage(img,0,0,cw,ch);
 let data=null;try{data=wx.getImageData(0,0,cw,ch);}catch{}
 let kind='oval';
 if(data){
  const px=data.data,n=cw*ch;let clear=0;for(let i=0;i<n;i++)if(px[i*4+3]<40)clear++;
  if(clear/n>.05)kind='cutout';
  else if(removeBackdrop(px,cw,ch,30,95)||removeBackdrop(px,cw,ch,46,150)){kind='removed';wx.putImageData(data,0,0);}
 }
 const c=document.createElement('canvas');c.width=c.height=72;const x=c.getContext('2d');c.headKind=kind;
 if(kind==='oval'){
  // the face sits in the upper middle of a portrait photo: crop there into a head (egg) shape, outlined
  const side=Math.min(w*.72,h*.62),sx=(w-side)/2,sy=Math.max(0,h*.06);
  const egg=()=>{x.beginPath();x.moveTo(36,4);x.bezierCurveTo(56,4,63,20,62,36);x.bezierCurveTo(61,55,50,69,36,69);x.bezierCurveTo(22,69,11,55,10,36);x.bezierCurveTo(9,20,16,4,36,4);x.closePath();};
  x.save();egg();x.clip();x.drawImage(img,sx,sy,side,side*65/52,10,4,52,65);x.restore();
  x.strokeStyle='#140c08';x.lineWidth=3.5;x.lineJoin='round';egg();x.stroke();return c;
 }
 // trim to the visible pixels so every head fills its box the same way, keeping at most a little neck
 const px=wx.getImageData(0,0,cw,ch).data;let x0=cw,y0=ch,x1=-1,y1=-1;
 for(let yy=0;yy<ch;yy++)for(let xx=0;xx<cw;xx++)if(px[(yy*cw+xx)*4+3]>60){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy;}
 if(x1<0)return null;
 const bw=x1-x0+1,bh=Math.min(y1-y0+1,Math.round(bw*1.35)),fit=Math.min(64/bw,64/bh),dw=bw*fit,dh=bh*fit,ox=(72-dw)/2,oy=(72-dh)/2;
 const sil=document.createElement('canvas');sil.width=sil.height=72;const sx2=sil.getContext('2d');sx2.drawImage(work,x0,y0,bw,bh,ox,oy,dw,dh);
 sx2.globalCompositeOperation='source-in';sx2.fillStyle='#140c08';sx2.fillRect(0,0,72,72);
 for(let a=0;a<16;a++){const r=2.6;x.drawImage(sil,Math.cos(a*Math.PI/8)*r,Math.sin(a*Math.PI/8)*r);}
 x.drawImage(work,x0,y0,bw,bh,ox,oy,dw,dh);
 return c;
}
// Flood-fill the backdrop in from the image border: a neighbour joins when it is close to the pixel it came from
// (smooth gradients) and to the border colour it started at. Accept only a sensible split: some backdrop gone, the
// middle of the face kept. Writes alpha into px and returns true on success.
function removeBackdrop(px,w,h,step=30,span=95){
 const n=w*h,seen=new Uint8Array(n),seed=new Int32Array(n),queue=new Int32Array(n);let head=0,tail=0;
 const dist=(a,b)=>{const i=a*4,j=b*4;return Math.abs(px[i]-px[j])+Math.abs(px[i+1]-px[j+1])+Math.abs(px[i+2]-px[j+2]);};
 const push=(q,from,origin)=>{if(seen[q])return;if(from>=0&&(dist(q,from)>step||dist(q,origin)>span))return;seen[q]=1;seed[q]=origin;queue[tail++]=q;};
 // seed from the top and the sides; the bottom edge is usually shoulders/clothes, not backdrop
 for(let x=0;x<w;x++)push(x,-1,x);for(let y=0;y<h*.8;y++){push(y*w,-1,y*w);push(y*w+w-1,-1,y*w+w-1);}
 while(head<tail){const q=queue[head++],x=q%w,o=seed[q];if(x)push(q-1,q,o);if(x<w-1)push(q+1,q,o);if(q>=w)push(q-w,q,o);if(q<n-w)push(q+w,q,o);}
 const removed=tail/n,mid=Math.floor(h*.42)*w+Math.floor(w/2);
 if(removed<.12||removed>.8||seen[mid])return false;
 for(let q=0;q<n;q++)if(seen[q])px[q*4+3]=0;
 // feather one pixel so the outline hugs the face, not a jagged halo
 for(let q=0;q<n;q++){if(seen[q])continue;const x=q%w;if(x&&seen[q-1]||x<w-1&&seen[q+1]||q>=w&&seen[q-w]||q<n-w&&seen[q+w])px[q*4+3]=150;}
 return true;
}
const weaponFor=id=>WEAPON_IDS[hash('bro:'+id)%WEAPON_IDS.length];

// ------------------------------------------------------------------ the engine
async function broforce(s){
 const theme=THEMES[s.game.stageId||s.game.id]||THEMES['broforce-jungle'];
 const [c,g]=s.canvas(900,500,{fill:true});s.body.classList.add('drag-arena-body');s.updateScores();
 // full-bleed: the mission gets the whole screen; Pause/Exit float in the top-right corner
 const shell=s.body.closest('.game-shell'),layer=shell?.parentElement;
 if(shell){shell.classList.add('bf-shell');layer?.classList.add('bf-layer');const css=document.createElement('style');
  css.textContent=`#game-layer.bf-layer{padding:0;height:100dvh;max-height:none}
   .game-shell.bf-shell{position:relative;max-width:none;width:100%;height:100%;border:0;border-radius:0;grid-template-rows:minmax(0,1fr);overflow:hidden;background:#0c0a08}
   .bf-shell>.game-header{position:absolute;right:max(6px,env(safe-area-inset-right));top:max(4px,env(safe-area-inset-top));z-index:12;border:0;background:transparent;padding:0;min-height:0}
   .bf-shell>.game-header>:not(.game-actions){display:none}
   .bf-shell .game-actions{gap:4px;display:flex}
   .bf-shell .game-actions button{min-height:40px;min-width:40px;padding:4px 9px;font-size:12px;background:#0c0a08cc;color:#fff;border-color:#ffffff40}
   .bf-shell>#game-scorebar{display:none}
   .bf-shell>.game-body{padding:0;display:flex;gap:0;overflow:hidden;min-height:0}
   .bf-shell .canvas-frame{border:0;border-radius:0;flex:1;min-height:0;width:100%;height:100%}
   .bf-shell .game-canvas{display:block;border:0;border-radius:0;max-width:none;max-height:none}
   .bf-shell #game-status,.bf-shell #game-hint,.bf-shell #game-controls{display:none}
   .bf-shell .pass-overlay{z-index:30}`;
  shell.appendChild(css);s.cleanup(()=>{css.remove();shell.classList.remove('bf-shell');layer?.classList.remove('bf-layer');});}
 if(!await settle(s))return;
 const {store}=require('src/state.js');
 const {availableCharacters}=require('src/profile.js');
 const {gameRecruitPool}=require('src/rewards.js');
 const {character}=require('src/characters.js');
 const nameOf=id=>{try{return character(id)?.name||id;}catch{return id;}};
 const seed=Math.floor(s.random()*4294967296);
 let STAGES=[0,1,2].map(si=>buildStage(seed+si*7919,si));
 // Solo: mission after mission (a fresh 3-stage map each time) until a mission fails or the player banks the run.
 let soloTotal=0,soloCleared=0;
 // per player: their own roster for respawns, and the locked characters that can wait in the GOLD cages
 const rosters=s.players.map(p=>{try{return availableCharacters(store.profile,p.owner).filter(Boolean);}catch{return [];}});
 const vipPools=s.players.map(p=>{try{return gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}});
 const touchUI=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
 s.broforceRecruits=[[],[]];
 const net=s.online||null,me=net?net.me:0,them=1-me,host=!net||me===0;
 let phase='title',titleT=0,cd=new Countdown(3),acc=0,endT=0,turn=net?me:0,clock=0,frames=0,simT=0,winner=-1;
 let R=null,netCages=null,setupMsg=null,setupWait=null,netStarted=false,nf=null;   // online: the partner's bro, the host's cage line-up
 let W=null,P=null,fx=new Fx(),banner=null,cam={x:0,y:0},Z=2,stageT=0,stageIdx=0,shake=0;
 const results=[null,null];
 for(const id of [...s.players.map(p=>p.character)])headCanvas(id);

 // ---------------------------------------------------------------- input: the whole screen belongs to whoever's turn it is
 const kb=arenaKeys(s);const inp={l:0,r:0,u:0,d:0,fire:0,jumpPress:0,jumpHeld:0,gren:0,downPress:0};
 kb.onDown((i,k)=>{if(k==='u')inp.jumpPress=1;if(k==='d')inp.downPress=1;});
 s.on(document,'keydown',ev=>{const k=String(ev.key).toLowerCase();if(['g','e','shift','q','/'].includes(k)&&!ev.repeat){inp.gren=1;ev.preventDefault?.();}});
 const pad={stick:null,fire:new Set(),jumpF:null};
 const split=()=>s.W*.42;
 arenaTouch(s,{owner:()=>phase==='play'||phase==='count'?0:-1,maxFingers:3,
  onDown:f=>{if(f.x<split()&&!pad.stick){f.data.role='stick';pad.stick=f;}else{f.data.role='fire';pad.fire.add(f);if(pad.fire.size>1){inp.jumpPress=1;f.data.tapJump=true;}}},
  onMove:f=>{
   if(f.data.role==='stick'){const dx=f.x-f.sx,dy=f.y-f.sy,lim=56,d=Math.hypot(dx,dy);if(d>lim){f.sx=f.x-dx*lim/d;f.sy=f.y-dy*lim/d;}
    if(dy<-24&&!f.data.up){f.data.up=true;inp.jumpPress=1;}if(dy>-14)f.data.up=false;if(dy>22&&!f.data.down){f.data.down=true;inp.downPress=1;}if(dy<12)f.data.down=false;}
   else if(f.data.role==='fire'){const dy=f.y-f.sy;
    if(dy<-26&&!f.data.up){f.data.up=true;inp.jumpPress=1;}
    if(dy>30&&!f.data.gren){f.data.gren=true;inp.gren=1;}
    if(f.data.up&&dy>-8){f.data.up=false;f.sy=f.y;}if(f.data.gren&&dy<10){f.data.gren=false;f.sy=f.y;}}},
  onUp:f=>{if(pad.stick===f)pad.stick=null;pad.fire.delete(f);}});
 function readInput(){
  const [k0,k1]=kb.state,st=pad.stick;let l=k0.l||k1.l,r=k0.r||k1.r,u=k0.u||k1.u,d=k0.d||k1.d,fire=k0.fire||k1.fire;
  if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(dx>11)r=1;if(dx<-11)l=1;if(dy<-20)u=1;if(dy>20&&Math.abs(dx)<dy*1.3)d=1;}
  let jumpHeld=u;for(const f of pad.fire){if(f.data.up||f.data.tapJump)jumpHeld=1;else fire=1;}
  if(pad.fire.size)fire=1;
  if(bot&&P){bot.t++;r=1;l=0;fire=1;if(P.grounded&&Math.abs(P.vx)<15)bot.stuck++;else bot.stuck=0;
   if(bot.stuck>12||bot.t%95===0){inp.jumpPress=1;bot.stuck=0;bot.hold=22;}jumpHeld=(bot.hold=(bot.hold||0)-1)>0?1:0;if(bot.t%400===0)inp.gren=1;
   // at the chopper: climb in
   const H=W?.heli;if(H&&H.state==='hover'&&Math.abs(P.x-(H.x-8))<160&&(stageIdx<2||!W.boss?.alive)){r=P.x<H.x-8?1:0;l=P.x>H.x-8?1:0;u=1;}}
  Object.assign(inp,{l,r,u,d,fire,jumpHeld});
 }
 const clearInput=()=>{Object.assign(inp,{l:0,r:0,u:0,d:0,fire:0,jumpPress:0,jumpHeld:0,gren:0,downPress:0});pad.stick=null;pad.fire.clear();};

 // ---------------------------------------------------------------- sound
 const sfx={
  rifle:()=>{noise(.05,{vol:.035,freq:2400});snd(170,.04,{type:'square',vol:.02,to:90});},
  shotgun:()=>{noise(.2,{vol:.09,freq:900,q:.6});snd(110,.12,{type:'square',vol:.03,to:50});},
  rocket:()=>{noise(.3,{vol:.05,freq:600});snd(220,.3,{type:'sawtooth',vol:.025,to:70});},
  flame:()=>noise(.07,{vol:.025,freq:500,q:.4}),
  pistols:()=>{noise(.04,{vol:.04,freq:3000});snd(300,.03,{type:'square',vol:.02,to:150});},
  enemy:()=>noise(.05,{vol:.022,freq:1500}),
  boom:big=>{noise(big?.7:.45,{vol:big?.16:.12,freq:260,q:.45});snd(85,big?.6:.4,{type:'triangle',vol:.12,to:28});},
  alert:()=>snd(990,.07,{type:'square',vol:.025,to:1300}),
  jump:()=>snd(260,.08,{type:'square',vol:.018,to:480}),
  hit:()=>snd(160,.1,{type:'square',vol:.04,to:60}),
  die:()=>{snd(420,.55,{type:'sawtooth',vol:.04,to:50});noise(.2,{vol:.06,freq:700});},
  splat:()=>noise(.09,{vol:.05,freq:420}),
  rescue:()=>jingle([523,659,784,1047,1319],{type:'square',vol:.035,step:.07,dur:.1}),
  gold:()=>jingle([784,988,1175,1568,1976,2349],{type:'triangle',vol:.05,step:.08,dur:.16}),
  flag:()=>jingle([392,523,659,784],{type:'square',vol:.03,step:.09}),
  clink:()=>snd(1500,.04,{type:'triangle',vol:.02}),
  chop:()=>noise(.07,{vol:.03,freq:140,q:1.2}),
  roar:()=>{snd(90,.8,{type:'sawtooth',vol:.06,to:40});noise(.6,{vol:.07,freq:200})},
  clear:()=>jingle([523,659,784,1047,784,1047,1319,1568],{step:.09,type:'square',vol:.035,dur:.12})
 };

 // ---------------------------------------------------------------- music: an original action loop (drums, bass riff,
 // power-chord stabs), scheduled ahead on the audio clock; the board score is held quiet while a turn is on
 const audio=require('src/audio.js');let mNext=0,mStep=0,mBus=null,mNoise=null;
 const BASS=[0,0,null,0,3,null,0,null,-2,null,0,0,-5,null,-2,null],ROOTS=[40,36,38,40];
 function music(){
  if(!store.profile?.settings?.music||document.hidden||s.paused)return;let a;try{a=audio.audioContext();}catch{return;}if(!a||a.state!=='running')return;
  audio.holdMusic?.(1.2);
  if(!mBus){mBus=a.createGain();mBus.gain.value=.55;mBus.connect(a.destination);s.cleanup(()=>{try{mBus.gain.setTargetAtTime(0,a.currentTime,.05);setTimeout(()=>mBus?.disconnect(),400);}catch{}});
   mNoise=a.createBuffer(1,a.sampleRate*.3,a.sampleRate);const d=mNoise.getChannelData(0);for(let k=0;k<d.length;k++)d[k]=Math.random()*2-1;}
  const sd=60/(stageIdx===2?150:136)/4;if(mNext<a.currentTime)mNext=a.currentTime+.06;
  while(mNext<a.currentTime+.16){mStepAt(a,mStep,mNext,sd);mNext+=sd;mStep++;}
 }
 function mStepAt(a,step,t,sd){
  const st=step%16,bar=Math.floor(step/16)%4,root=ROOTS[bar],hz=m=>440*2**((m-69)/12);
  const tone=(type,f,len,vol,f2=null,lp=null)=>{const o=a.createOscillator(),gn=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+len);
   gn.gain.setValueAtTime(vol,t);gn.gain.exponentialRampToValueAtTime(.0001,t+len);let node=o;if(lp){const fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=lp;o.connect(fl);node=fl;}node.connect(gn);gn.connect(mBus);o.start(t);o.stop(t+len+.02);};
  const hit=(freq,len,vol,type='bandpass')=>{const n=a.createBufferSource(),fl=a.createBiquadFilter(),gn=a.createGain();n.buffer=mNoise;fl.type=type;fl.frequency.value=freq;gn.gain.setValueAtTime(vol,t);gn.gain.exponentialRampToValueAtTime(.0001,t+len);n.connect(fl);fl.connect(gn);gn.connect(mBus);n.start(t);n.stop(t+len+.02);};
  if(st===0||st===8||st===10)tone('sine',130,.16,.16,38);
  if(st===4||st===12){hit(1700,.12,.09);tone('triangle',190,.06,.05,120);}
  if(st%2===0)hit(8000,.03,st%4===2?.03:.018,'highpass');
  const b=BASS[st];if(b!==null)tone('sawtooth',hz(root+b),sd*1.7,.05,null,520);
  if(st===0||st===6&&bar%2){for(const iv of [12,19,24])tone('sawtooth',hz(root+iv),sd*(st?2:5),.016,null,1600);}
 }

 // ---------------------------------------------------------------- world (a fresh copy of the stage for each run)
 function loadStage(si,keepPlayer){
  const S=STAGES[si];stageIdx=si;stageT=0;
  W={S,W:S.W,tiles:S.tiles.slice(),back:S.back,hp:new Float32Array(MAXW*ROWS),flags:S.flags.map(f=>({...f})),
   foes:S.foes.map((f,k)=>makeFoe(f,k)),cages:[],bullets:[],shots:[],nades:[],booms:[],pickups:[],corpses:[],flames:[],waves:[],
   boss:S.boss?makeBoss(S.boss):null,arena:S.arena?{...S.arena}:null,exit:S.exit?{...S.exit}:null,
   heli:{x:S.exit?S.exit.x:0,y:-120,state:si===2?'away':'hover',t:0},checkpoint:{x:S.spawn.x,y:S.spawn.y},cleared:false,lock:null};
  for(let k=0;k<W.tiles.length;k++)W.hp[k]=HP[W.tiles[k]];
  if(W.heli.state==='hover')W.heli.y=S.exit.y-6.5*T;
  // cages: the GOLD one holds a character this player has not unlocked yet (if any are left)
  const pool=vipPools[turn],used=new Set(s.broforceRecruits[turn]);
  const free=pool.filter(id=>!used.has(id)),rng=mulberry(seed+turn*101+si*13);
  const others=rosters[turn].length?rosters[turn]:s.players.map(p=>p.character);
  S.cages.forEach((cg,k)=>{
   let id=null,vip=cg.vip&&free.length>0;
   // online both phones use player 1's line-up (a GOLD cage holds someone locked for both, if there is anyone)
   if(netCages){const nc=netCages[si]?.[k];id=nc?.[0]||others[0];vip=!!(cg.vip&&nc?.[1]);}
   else if(vip){id=free.splice(Math.floor(rng()*free.length),1)[0];}
   else id=others[Math.floor(rng()*others.length)];
   W.cages.push({x:cg.x,y:cg.y,vip,id,hp:3,open:false,t:rng()*3});headCanvas(id);
  });
  if(keepPlayer){Object.assign(P,{x:S.spawn.x,y:S.spawn.y,vx:0,vy:0,grenades:3,inv:1.5,board:0,boarded:false});}
  cam.x=clamp(S.spawn.x-viewW()*.35,0,W.W*T-viewW());cam.y=clamp(S.spawn.y-viewH()*.62,0,ROWS*T-viewH());
  banner={big:`STAGE ${si+1}`,small:theme.stages[si],t:2.6};
 }
 const T_AT=(c,r)=>c<0||c>=W.W||r<0?(r<0?E:STEEL):r>=ROWS?STEEL:W.tiles[r*MAXW+c];
 const tileAt=(px,py)=>T_AT(Math.floor(px/T),Math.floor(py/T));
 const solidAt=(px,py)=>SOLID[tileAt(px,py)]===1;
 const viewW=()=>s.W/Z,viewH=()=>s.H/Z;
 function makeFoe(f,k){const st=FOES[f.type];return {...f,k,hp:st.hp,w:st.w,h:st.h,vx:0,vy:0,dir:k%2?1:-1,state:'patrol',t:Math.random()*2,cool:0,burst:0,lost:0,seenX:0,grounded:false,alive:true,active:false,anim:0,flash:0,bubble:null,fuse:0,lunge:0};}
 function makeBoss(b){return {x:b.x,y:b.y,vx:0,vy:0,hp:200,max:200,dir:-1,state:'wait',t:0,flash:0,anim:0,grounded:true,w:16,h:52,alive:true,dead:0,move:0,summons:0};}

 // ---------------------------------------------------------------- player
 function newPlayer(i){return {i,x:0,y:0,vx:0,vy:0,w:5,h:20,grounded:false,facing:1,climb:false,ladder:false,anim:0,hp:2,inv:0,dead:0,lives:3,grenades:3,
  bro:s.players[i].character,weapon:weaponFor(s.players[i].character),fireCD:0,jumpBuf:0,coyote:0,score:0,kills:0,rescues:0,gold:0,stageTimes:[],combo:0,comboT:0,
  muzzle:0,recoil:0,board:0,boarded:false,stagesCleared:0,deaths:0,mood:'normal',moodT:0,lastHurt:0,walled:0};}
 function setBro(id){P.bro=id;P.weapon=weaponFor(id);for(const m of MOODS)headCanvas(id,m);}
 // the bro's face follows what they are doing: angry firing (or hit), sad when dead, win after a rescue or stage clear,
 // think in the air, walk when running, silly after standing still a while, normal otherwise
 const MOODS=['normal','angry','sad','win','think','walk','silly'];
 function broMood(p){
  if(p.dead||p.hp<=0)return 'sad';
  if(p.moodT>0&&(p.mood==='win'||p.mood==='angry'))return p.mood;
  if(p.fireT<.35)return 'angry';
  if(!p.grounded&&!p.ladder)return 'think';
  if(p.ladder||Math.abs(p.vx)>20)return 'walk';
  if(p.idleT>2.2)return 'silly';
  return 'normal';
 }
 function addScore(n,x,y,col='#ffe23a'){P.score+=n;if(x!==undefined)fx.pop(x,y,`+${n}`,{color:col,stroke:'#000',size:9,rise:22,life:.8});}
 function hurtPlayer(dmg,fromX){
  if(P.dead||P.inv>0||P.boarded)return;P.hp-=dmg;P.inv=1.1;P.lastHurt=.3;sfx.hit();fx.shake(5);
  fx.burst(P.x,P.y-12,{n:8,colors:['#c00','#900','#e33'],speed:120,life:.5,size:1.6,gravity:500});
  P.vx=(P.x<fromX?-1:1)*120;P.vy=-150;
  if(P.hp<=0)killPlayer();else{P.mood='angry';P.moodT=.8;}
 }
 function killPlayer(){
  P.dead=1.8;P.deaths++;P.hp=0;sfx.die();fx.shake(9);P.mood='sad';
  fx.burst(P.x,P.y-12,{n:26,colors:['#b00','#800','#e22','#f55'],speed:220,life:.9,size:2,gravity:600});
  W.corpses.push({x:P.x,y:P.y,vx:P.vx*.5+(Math.random()-.5)*60,vy:-220,rot:0,vr:(Math.random()-.5)*12,t:6,kind:'bro',id:P.bro,i:P.i});
  banner={big:P.lives>0?'BRO DOWN!':'OUT OF BROS',small:P.lives>0?`${P.lives} ${P.lives===1?'BRO':'BROS'} LEFT`:'MISSION OVER',t:1.7};
 }
 function respawn(){
  P.lives--;const pool=rosters[P.i].filter(id=>id!==P.bro);const id=pool.length?pool[Math.floor(Math.random()*pool.length)]:P.bro;
  // online: drop in next to the partner (if they are up and on this stage), else at the checkpoint
  const near=net&&partnerHere()&&!R.dead&&!R.boarded,sx=near?R.x:W.checkpoint.x,sy=near?R.y-10:W.checkpoint.y-2;
  setBro(id);Object.assign(P,{x:sx,y:sy,vx:0,vy:-60,hp:2,inv:2.2,dead:0,grenades:3,mood:'normal',climb:false,ladder:false});
  banner={big:nameOf(id).toUpperCase(),small:`${WEAPONS[P.weapon].name} · ${P.lives+1} ${P.lives+1===1?'BRO':'BROS'}`,t:1.8};
  fx.ring(P.x,P.y-10,{color:'#fff',r0:4,r1:28,life:.4,width:2});
 }

 // generic body vs tiles. b: {x(center),y(feet),w(half),h,vx,vy}. Returns {wall:-1|0|1, landed, bonk}
 function moveBody(b,dt,{grav=900,maxFall=480,drop=false,step=false}={}){
  const out={wall:0,landed:false,bonk:false,stepped:false};
  b.vy=Math.min(maxFall,b.vy+grav*dt);
  // horizontal
  let nx=b.x+b.vx*dt;const dir=Math.sign(b.vx);
  if(dir){const edge=nx+dir*b.w,top=b.y-b.h+1,bot=b.y-1;let hit=false;
   for(let yy=top;;yy+=7){const y2=Math.min(yy,bot);if(solidAt(edge,y2)){hit=true;break;}if(y2>=bot)break;}
   if(hit){
    // step assist: a one-tile ledge at the feet with room above it is climbed automatically
    const rowFeet=Math.floor(bot/T),stepTop=rowFeet*T;
    if(step&&b.grounded&&solidAt(edge,bot)&&!solidAt(edge,bot-T)&&!solidAt(edge,stepTop-b.h+2)&&!solidAt(b.x,stepTop-b.h+2)&&b.y-stepTop<=T+.5){b.y=stepTop;out.stepped=true;b.x=nx;}
    else{b.x=dir>0?Math.floor(edge/T)*T-b.w-.01:Math.floor(edge/T+1)*T+b.w+.01;b.vx=0;out.wall=dir;}}
   else b.x=nx;}
  // vertical
  const ny=b.y+b.vy*dt;
  if(b.vy>=0){const r0=Math.floor((b.y)/T),r1=Math.floor(ny/T);let landed=false;
   for(let r=r0;r<=r1&&!landed;r++){for(const xx of [b.x-b.w+1,b.x,b.x+b.w-1]){const t=T_AT(Math.floor(xx/T),r);
     const plat=(t===PLAT||t===LADDER&&T_AT(Math.floor(xx/T),r-1)!==LADDER)&&!drop&&b.y<=r*T+.5;
     if(SOLID[t]&&r*T>=b.y-.5||plat){b.y=r*T;b.vy=0;landed=true;break;}}}
   if(!landed)b.y=ny;out.landed=landed;}
  else{const r=Math.floor((ny-b.h)/T);let bonk=false;for(const xx of [b.x-b.w+1,b.x+b.w-1])if(SOLID[T_AT(Math.floor(xx/T),r)])bonk=true;
   if(bonk){b.y=(r+1)*T+b.h;b.vy=0;out.bonk=true;}else b.y=ny;}
  b.grounded=out.landed;return out;
 }
 function onLadder(b){const t=tileAt(b.x,b.y-6);const t2=tileAt(b.x,b.y+2);return t===LADDER||t2===LADDER&&inp.d;}
 function updatePlayer(dt){
  const p=P;if(p.boarded||p.out){return;}
  if(p.dead){p.dead-=dt;if(p.dead<=0){if(p.lives>0)respawn();else if(net)netOut();else endTurn('lives');}return;}
  p.inv=Math.max(0,p.inv-dt);p.fireCD-=dt;p.muzzle=Math.max(0,p.muzzle-dt);p.recoil=Math.max(0,p.recoil-dt*8);p.lastHurt=Math.max(0,p.lastHurt-dt);
  if(p.moodT>0){p.moodT-=dt;if(p.moodT<=0)p.mood='normal';}
  p.fireT=(p.fireT??9)+dt;p.idleT=p.grounded&&!p.ladder&&Math.abs(p.vx)<20&&!inp.fire?(p.idleT||0)+dt:0;
  if(inp.jumpPress){p.jumpBuf=.14;inp.jumpPress=0;}else p.jumpBuf=Math.max(0,p.jumpBuf-dt);
  const want=(inp.r?1:0)-(inp.l?1:0);if(want)p.facing=want;
  // ladders
  const lad=tileAt(p.x,p.y-6)===LADDER||tileAt(p.x,p.y-1)===LADDER||(inp.d&&tileAt(p.x,p.y+2)===LADDER);
  if(lad&&(inp.u||inp.d)&&!p.ladder&&!(p.grounded&&inp.u&&tileAt(p.x,p.y-6)!==LADDER)){p.ladder=true;p.x+=(Math.floor(p.x/T)*T+T/2-p.x)*.6;}
  if(p.ladder){
   if(!lad||p.jumpBuf>0&&!inp.u){p.ladder=false;if(p.jumpBuf>0){p.vy=-260;p.jumpBuf=0;}}
   else{p.vx=want*45;p.vy=(inp.d?95:0)-(inp.u?95:0);p.y+=p.vy*dt;p.x+=p.vx*dt;p.anim+=Math.abs(p.vy)*dt*.08;
    if(inp.u&&tileAt(p.x,p.y-6)!==LADDER&&tileAt(p.x,p.y-1)!==LADDER){p.ladder=false;p.vy=0;}
    if(p.vy>0&&solidAt(p.x,p.y)){p.y=Math.floor(p.y/T)*T;p.ladder=false;p.vy=0;}
   }
  }
  if(!p.ladder){
   const target=want*118,a=p.grounded?1400:900;
   if(p.lastHurt<=0)p.vx+=clamp(target-p.vx,-a*dt,a*dt);
   if(p.grounded)p.coyote=.1;else p.coyote=Math.max(0,p.coyote-dt);
   // Broforce wall climb: push into a wall in the air and you scale it; at the top you vault over
   const wallDir=want&&!p.grounded&&solidAt(p.x+want*(p.w+2),p.y-10)?want:0;
   if(wallDir){p.walled=.12;p.climb=true;p.vy=Math.min(p.vy,-104);
    if(!solidAt(p.x+want*(p.w+2),p.y-p.h-6)&&!solidAt(p.x+want*(p.w+2),p.y-16)){p.vy=-215;p.vx=want*80;}}
   else{p.walled=Math.max(0,p.walled-dt);if(p.walled<=0)p.climb=false;}
   if(p.jumpBuf>0&&(p.coyote>0||p.climb)){p.vy=p.climb&&!p.grounded?-250:-330;p.jumpBuf=0;p.coyote=0;p.grounded=false;sfx.jump();
    fx.burst(p.x,p.y,{n:5,color:'#d8c8a8',speed:50,life:.3,size:1.4});}
   if(!inp.jumpHeld&&!inp.u&&p.vy<-120&&!p.climb)p.vy+=(-120-p.vy)*.25;
   const drop=inp.d&&p.grounded&&[PLAT,LADDER].includes(tileAt(p.x,p.y+2));
   if(drop){p.y+=2;}
   const fall=p.vy,res=moveBody(p,dt,{grav:p.climb?600:900,maxFall:420,drop,step:true});
   if(res.landed&&fall>300)fx.burst(p.x,p.y,{n:6,color:'#bba98a',speed:60,life:.3,size:1.4});
   p.anim+=p.grounded?Math.abs(p.vx)*dt*.09:dt*4;
  }
  // fire
  const wpn=WEAPONS[p.weapon];
  if(inp.fire&&p.fireCD<=0){p.fireCD=wpn.rate;fireWeapon(p,wpn);}
  if(inp.gren){inp.gren=0;if(p.grenades>0){p.grenades--;const nv=[p.x+p.facing*6,p.y-16,p.facing*190+p.vx*.3,-230];throwNade(...nv,'p');if(net)outbox.gr.push(nv.map(Math.round));}}
  inp.downPress=0;
  // fell into the abyss? (bedrock makes this rare) — or squashed inside rebuilt rock
  if(p.y>ROWS*T+40)killPlayer();
  // never climb out over the map's steel edges (a wall-climb could vault a bro onto the roof outside the map)
  p.x=clamp(p.x,T+p.w,(W.W-1)*T-p.w);
 }
 function fireWeapon(p,w){
  p.shotsFired=(p.shotsFired||0)+1;p.fireT=0;const mx=p.x+p.facing*12,my=p.y-11+(p.ladder?0:0);p.muzzle=.06;p.recoil=1;
  if(net)outbox.sh.push([Math.round(mx),Math.round(my),p.facing,p.weapon]);   // the partner's phone shows the shot
  if(w.rocket){W.shots.push({x:mx,y:my,vx:p.facing*w.speed,vy:0,life:w.life,owner:'p',kind:'rocket',trail:0});sfx.rocket();p.vx-=p.facing*40;return;}
  if(w.flame){for(let k=0;k<2;k++)W.flames.push({x:mx,y:my+(Math.random()-.5)*3,vx:p.facing*w.speed*(0.8+Math.random()*.4)+p.vx*.5,vy:(Math.random()-.5)*50-20,life:w.life*(0.8+Math.random()*.4),max:w.life,dmg:w.dmg});if(frames%6===0)sfx.flame();return;}
  const n=w.pellets||1;
  for(let k=0;k<n;k++){const sp=n>1?(k/(n-1)-.5)*w.spread+(Math.random()-.5)*.06:(Math.random()-.5)*.05;
   W.bullets.push({x:mx,y:my+(p.weapon==='pistols'?(frames%2?-2:1):0),vx:Math.cos(sp)*p.facing*w.speed,vy:Math.sin(sp)*w.speed,life:w.life,owner:'p',dmg:w.dmg,tile:w.tile});}
  fx.burst(mx,my+1,{n:1,color:'#d8b040',speed:60,life:.6,size:1,gravity:500,angle:-Math.PI/2-p.facing*.6,spread:.6,shape:'square'});
  sfx[p.weapon]?.();if(p.weapon==='shotgun'){p.vx-=p.facing*60;fx.shake(2);}
  if(frames%12===0)for(const e of W.foes)if(e.alive&&e.active&&e.state==='patrol'&&Math.abs(e.x-p.x)<120&&Math.abs(e.y-p.y)<64){e.state='search';e.seenX=p.x;e.t=3;e.bubble={ch:'?',t:1};}
 }
 function throwNade(x,y,vx,vy,owner){W.nades.push({x,y,vx,vy,t:owner==='p'?1.3:1.6,owner,w:2,h:4,grounded:false,spin:0});if(net&&host&&owner==='e')outbox.fn.push([x,y,vx,vy].map(Math.round));}

 // ---------------------------------------------------------------- terrain damage & explosions
 function damageTile(c,r,dmg){
  const t=T_AT(c,r);if(t===E||t===STEEL||r<0||c<=0||c>=W.W-1||r>=ROWS-1)return false;
  const k=r*MAXW+c;W.hp[k]-=dmg;
  if(W.hp[k]<=0){breakTile(c,r,t);return true;}
  if(Math.random()<.5)fx.burst((c+.5)*T,(r+.5)*T,{n:2,colors:tileColors(t),speed:70,life:.35,size:1.3,gravity:500,shape:'square'});
  return false;
 }
 function breakTile(c,r,t){
  W.tiles[r*MAXW+c]=E;if(net)outbox.tb.push(r*MAXW+c);
  fx.burst((c+.5)*T,(r+.5)*T,{n:t===BARREL?2:6,colors:tileColors(t),speed:110,life:.6,size:2,gravity:600,shape:'square'});
  if(t===BARREL)queueBoom((c+.5)*T,(r+.5)*T,44,4,'env',.06);
  else if(t===CRATE){if(Math.random()<.55)W.pickups.push({x:(c+.5)*T,y:(r+1)*T,vy:-120,vx:0,w:4,h:7,kind:'nade',t:12});addScore(25);}
  else if(t===WOOD||t===BAGS)addScore(10);
 }
 const tileColors=t=>t===DIRT?theme.dirt:t===BRICK?theme.brick:t===ROCK?theme.rock:t===WOOD||t===CRATE||t===PLAT||t===LADDER?[theme.wood,'#5a3a1a']:t===BAGS?['#b8a77a','#8f8058']:t===BARREL?['#c33','#f80','#222']:['#888'];
 function queueBoom(x,y,r,dmg,owner,delay=0){W.booms.push({x,y,r,dmg,owner,delay});}
 function explode(b){
  const {x,y,r,dmg,owner}=b;blastFx(x,y,r);
  if(net)ev({ex:[stageIdx,Math.round(x),Math.round(y),r,owner]});
  const c0=Math.floor((x-r)/T),c1=Math.floor((x+r)/T),r0=Math.floor((y-r)/T),r1=Math.floor((y+r)/T);
  for(let cc=c0;cc<=c1;cc++)for(let rr=r0;rr<=r1;rr++){const d=Math.hypot((cc+.5)*T-x,(rr+.5)*T-y);if(d<r)damageTile(cc,rr,d<r*.7?99:2.5);}
  for(const e of W.foes)if(e.alive){const d=Math.hypot(e.x-x,e.y-e.h/2-y);if(d<r+e.w)hitF(e,dmg*(d<r*.6?1.6:1),x,true);}
  for(const cg of W.cages)if(!cg.open&&Math.hypot(cg.x-x,cg.y-10-y)<r+8)openCage(cg);
  if(W.boss&&W.boss.alive){const B=W.boss,d=Math.hypot(B.x-x,B.y-30-y);if(d<r+24)hitB(dmg*3,x);}
  if(owner!=='p'&&!P.dead&&Math.hypot(P.x-x,P.y-10-y)<r*.95)hurtPlayer(2,x);
 }
 function blastFx(x,y,r){sfx.boom(r>40);fx.shake(r>40?12:8);
  fx.burst(x,y,{n:20,colors:['#fff6b0','#ffd23a','#ff8a1a','#ff4a10'],speed:r*5,life:.45,size:r*.12,drag:3});
  fx.burst(x,y,{n:12,colors:['#3a3330','#5a524c','#2a2624'],speed:r*2.4,life:1.3,size:r*.14,drag:2.4,gravity:-60,grow:6});
  fx.ring(x,y,{color:'#fff3c4',r0:4,r1:r*1.25,life:.3,width:4});
  for(const cp of W.corpses){const d=Math.hypot(cp.x-x,cp.y-y);if(d<r*1.5){cp.vx+=(cp.x-x)/(d+1)*260;cp.vy-=200;cp.vr+=(Math.random()-.5)*20;}}}
 // online, the other phone's blast: the bang, and this phone's bro takes it unless the partner set it off (the partner's
 // phone deals with terrain, enemies, cages and the Devil and sends what changed)
 function remoteBlast(x,y,r,owner){blastFx(x,y,r);if(owner!=='p'&&!P.dead&&Math.hypot(P.x-x,P.y-10-y)<r*.95)hurtPlayer(2,x);
  for(const n of W.nades)if(n.owner!=='p'&&Math.hypot(n.x-x,n.y-y)<12)n.t=0;for(const sh of W.shots)if(sh.owner!=='p'&&Math.hypot(sh.x-x,sh.y-y)<18)sh.life=-1;}

 // ---------------------------------------------------------------- enemies
 function los(x0,y0,x1,y1){const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/7);for(let k=1;k<n;k++){const t=k/n;if(solidAt(x0+(x1-x0)*t,y0+(y1-y0)*t))return false;}return true;}
 // by: 'p' = this phone's bro, 'r' = the partner (online, host phone) — kills score for whoever made them
 function hitFoe(e,dmg,fromX,blast=false,by='p'){
  if(!e.alive)return;e.hp-=dmg;e.flash=.08;
  if(e.state==='patrol'||e.state==='search'){e.state='alert';e.t=.25;e.dir=fromX>e.x?1:-1;e.bubble={ch:'!',t:.8};}
  fx.burst(e.x,e.y-e.h*.6,{n:3,colors:['#b00','#e22'],speed:90,life:.4,size:1.4,gravity:500});
  if(e.hp<=0)killFoe(e,fromX,blast,by);
 }
 // online the other phone only reports its hits (batched, see netFlush); the foe flashes at once
 function hitF(e,dmg,fromX,blast=false){if(net&&!host){if(!e.alive)return;e.flash=.08;fx.burst(e.x,e.y-e.h*.6,{n:3,colors:['#b00','#e22'],speed:90,life:.4,size:1.4,gravity:500});const h=outbox.fh.get(e.k)||[e.k,0,Math.round(fromX),blast?1:0];h[1]+=dmg;if(blast)h[3]=1;outbox.fh.set(e.k,h);return;}hitFoe(e,dmg,fromX,blast,'p');}
 function hitB(dmg,fromX){if(net&&!host){const B=W.boss;if(!B?.alive||B.state==='wait')return;B.flash=.07;outbox.bh+=dmg;outbox.bx=fromX;return;}hitBoss(dmg,fromX);}
 function killFoe(e,fromX,blast,by='p'){
  e.alive=false;if(net&&host)ev({fk:[stageIdx,e.k,Math.round(fromX),blast?1:0,by==='p'?me:them]});
  if(by==='p')foeScore(e);
  sfx.splat();fx.burst(e.x,e.y-e.h*.5,{n:blast?22:12,colors:['#a00','#d11','#700','#f44'],speed:blast?220:140,life:.8,size:1.8,gravity:600});
  if(blast)fx.burst(e.x,e.y-e.h*.5,{n:5,colors:['#7a1010','#e8c0a0','#5a5a2a'],speed:200,life:1,size:2.4,gravity:700,shape:'square'});
  const dir=Math.sign(e.x-fromX)||1;W.corpses.push({x:e.x,y:e.y,vx:dir*(blast?220:90),vy:blast?-260:-110,rot:0,vr:dir*(blast?14:6),t:5,kind:e.type,flip:e.dir});
  if(e.type==='bomber'&&host)queueBoom(e.x,e.y-10,40,4,'env',.25);
  if(e.type==='grenadier'&&Math.random()<.5)W.pickups.push({x:e.x,y:e.y-6,vy:-140,vx:0,w:4,h:7,kind:'nade',t:12});
 }
 function foeScore(e){P.kills++;const st=FOES[e.type];
  P.combo=P.comboT>0?P.combo+1:1;P.comboT=.9;
  const bonus=P.combo>1?50*(P.combo-1):0;addScore(st.score+bonus,e.x,e.y-e.h-6,P.combo>1?'#ff8a3a':'#ffe23a');
  if(P.combo>=3)fx.pop(e.x,e.y-e.h-18,`${P.combo}× BROMBO!`,{color:'#ff5a2a',stroke:'#000',size:10,rise:26,life:1});}
 function alertNear(e,tx=P.x){for(const o of W.foes)if(o!==e&&o.alive&&o.active&&(o.state==='patrol'||o.state==='search')&&Math.abs(o.x-e.x)<150&&Math.abs(o.y-e.y)<80){o.state='alert';o.t=.55+Math.random()*.4;o.dir=tx>o.x?1:-1;o.bubble={ch:'!',t:.9};}}
 // online (host) a foe goes after the nearer bro that is up; only this phone's bro is hurt here (the other phone judges its own)
 const upBro=b=>!!b&&!b.dead&&!b.boarded&&!b.out;
 function foeTarget(e){if(!net||!R?.net||!partnerHere()||!upBro(R))return P;if(!upBro(P))return R;return Math.hypot(R.x-e.x,R.y-e.y)<Math.hypot(P.x-e.x,P.y-e.y)?R:P;}
 function updateFoe(e,dt){
  const st=FOES[e.type];e.flash=Math.max(0,e.flash-dt);if(e.bubble){e.bubble.t-=dt;if(e.bubble.t<=0)e.bubble=null;}
  const tg=foeTarget(e),mine=tg===P,px=tg.x,py=tg.y-12,dx=px-e.x,dy=py-(e.y-e.h*.6),alive=upBro(tg);
  const sight=Math.min(st.sight,viewW()*.5+28);
  const sees=alive&&Math.abs(dx)<sight&&Math.abs(dy)<70&&(Math.sign(dx)===e.dir||Math.abs(dx)<46||e.state!=='patrol')&&tg.inv<2&&los(e.x,e.y-e.h*.7,px,py);
  e.t-=dt;e.cool-=dt;e.anim+=Math.abs(e.vx)*dt*.1;
  let speed=0;
  if(e.state==='patrol'){
   if(sees){e.state='alert';e.t=e.type==='dog'?.2:.36+Math.random()*.22;e.dir=Math.sign(dx)||e.dir;e.bubble={ch:'!',t:.9};sfx.alert();alertNear(e,px);}
   else{if(e.t<0){e.t=1.5+Math.random()*2.5;if(Math.random()<.35)e.idle=1+Math.random()*1.5;}
    if(e.idle>0){e.idle-=dt;}else speed=st.speed;
    const ahead=e.x+e.dir*(e.w+3);if(solidAt(ahead,e.y-6)||!solidAt(ahead,e.y+3)&&![PLAT,LADDER].includes(tileAt(ahead,e.y+3)))e.dir*=-1;}
  }else if(e.state==='alert'){e.dir=Math.sign(dx)||e.dir;if(e.t<=0){e.state='attack';e.cool=0;e.burst=e.type==='bruiser'?5:3;}}
  else if(e.state==='attack'||e.state==='search'){
   if(sees){e.lost=0;e.seenX=px;e.dir=Math.sign(dx)||e.dir;if(e.state==='search'){e.state='attack';e.bubble={ch:'!',t:.6};}}else{e.lost+=dt;if(e.lost>2.6&&e.state==='attack'){e.state='search';e.bubble={ch:'?',t:1.2};e.t=4;}}
   if(e.state==='search'){speed=st.speed;e.dir=Math.sign(e.seenX-e.x)||e.dir;if(Math.abs(e.seenX-e.x)<6||e.t<0){e.state='patrol';e.t=2;}}
   else if(e.type==='bomber'){speed=98;e.fuse+=dt;if(Math.abs(dx)<14&&Math.abs(dy)<22||e.fuse>5){e.alive=false;queueBoom(e.x,e.y-10,42,4,'env');}
    if(frames%40===0)fx.pop(e.x,e.y-e.h-10,'AAAH!',{color:'#fff',stroke:'#900',size:7,rise:10,life:.5});}
   else if(e.type==='dog'){speed=135;if(e.grounded&&Math.abs(dx)<56&&e.lunge<=0&&sees){e.vy=-210;e.lunge=1;speed=170;}e.lunge-=dt;
    if(mine&&Math.abs(dx)<10&&Math.abs(dy)<16)hurtPlayer(1,e.x);}
   else if(e.type==='grenadier'){if(sees&&e.cool<=0){e.cool=2.3+Math.random();const tt=.9,vx=clamp(dx/tt,-220,220),vy=clamp((dy-.5*900*.25*tt*tt)/tt,-330,-120);throwNade(e.x+e.dir*5,e.y-e.h+2,vx,vy,'e');}
    else if(Math.abs(dx)<60)speed=-st.speed;}
   else{ // mook / bruiser shoot in bursts with a short gap between shots
    if(sees&&e.cool<=0){if(e.burst>0){e.burst--;e.cool=e.type==='bruiser'?.09:.2;shootFoe(e,dx,dy);}else{e.cool=e.type==='bruiser'?1.6:1.1+Math.random()*.9;e.burst=e.type==='bruiser'?6:2+Math.floor(Math.random()*2);e.cool*=level3();}}
    else if(!sees&&e.lost>.6)speed=st.speed*1.4,e.dir=Math.sign(e.seenX-e.x)||e.dir;}
  }
  if(speed){const ahead=e.x+e.dir*(e.w+3);const cliff=!solidAt(ahead,e.y+3)&&![PLAT,LADDER].includes(tileAt(ahead,e.y+3));if(cliff&&e.type!=='bomber'&&e.type!=='dog')speed=0;}
  e.vx=speed*e.dir;
  const res=moveBody(e,dt,{grav:900,maxFall:420});if(res.wall&&e.state==='patrol')e.dir*=-1;
  if(mine&&e.type!=='dog'&&e.type!=='bomber'&&e.alive&&!P.dead&&!P.boarded&&Math.abs(dx)<8&&Math.abs(dy)<14&&P.inv<=0)hurtPlayer(1,e.x);
  if(e.y>ROWS*T)e.alive=false;
 }
 function shootFoe(e,dx,dy){const a=Math.atan2(clamp(dy,-Math.abs(dx)*.5,Math.abs(dx)*.5),Math.abs(dx))+(Math.random()-.5)*.08;
  const b={x:e.x+e.dir*10,y:e.y-e.h*.55,vx:Math.cos(a)*e.dir*215,vy:Math.sin(a)*215,life:1.5,owner:'e',dmg:1,tile:.35};W.bullets.push(b);e.muzzle=.06;sfx.enemy();
  if(net)outbox.fb.push([Math.round(b.x),Math.round(b.y),Math.round(b.vx),Math.round(b.vy)]);}

 // ---------------------------------------------------------------- boss: the Devil (stage 3)
 function hitBoss(dmg,fromX){const B=W.boss;if(!B.alive||B.state==='wait')return;B.hp-=dmg;B.flash=.07;if(B.hp<=0){B.alive=false;B.dead=3;devilDown();
  for(let k=0;k<6;k++)queueBoom(B.x+(Math.random()-.5)*40,B.y-10-Math.random()*50,30,0,'p',k*.22);
  for(const e of W.foes)if(e.alive&&e.summoned)killFoe(e,B.x,true);}}
 // the Devil falls (online: on both phones, both bros get the 5000)
 function devilDown(){const B=W.boss;addScore(5000,B.x,B.y-60,'#ff5a2a');sfx.roar();
  banner={big:'THE DEVIL IS DEAD',small:'GET TO THE CHOPPER!',t:3};W.heli.state='arrive';W.heli.y=W.exit.y-15*T;
  if(W.lock){for(const [cc,rr] of W.lock.cells)if(T_AT(cc,rr)===STEEL)W.tiles[rr*MAXW+cc]=E;}}
 // the fight starts: the arena locks behind the bros; online a bro still outside is pulled in
 function devilWakes(){const A=W.arena;sfx.roar();fx.shake(10);banner={big:'THE DEVIL',small:'PRINCE OF DARKNESS · BOSS',t:2.2};
  const cells=[];const c=A.c0;for(let r=G-12;r<G;r++){if(T_AT(c,r)===E){W.tiles[r*MAXW+c]=STEEL;cells.push([c,r]);}}
  const c2=A.c1;for(let r=G-12;r<G;r++){if(T_AT(c2,r)===E){W.tiles[r*MAXW+c2]=STEEL;cells.push([c2,r]);}}W.lock={cells};W.checkpoint={x:A.x0+3*T,y:G*T};
  if(net&&!P.out&&(P.x<A.x0+T||P.x>A.x1-T)){Object.assign(P,{x:A.x0+3*T,y:G*T-2,vx:0,vy:0,ladder:false,climb:false,inv:Math.max(P.inv,1.5)});fx.pop(P.x,P.y-30,'PULLED IN!',{color:'#ffe23a',stroke:'#000',size:9,rise:18,life:1.2});}}
 function updateBoss(dt){
  const B=W.boss;if(!B)return;B.flash=Math.max(0,B.flash-dt);B.anim+=dt;
  if(!B.alive){B.dead-=dt;return;}
  if(net&&!host){if(B.tx!=null){B.x+=(B.tx-B.x)*Math.min(1,dt*12);B.y+=(B.ty-B.y)*Math.min(1,dt*12);}
   if(B.state!=='wait'&&!P.dead&&!P.out&&Math.abs(P.x-B.x)<20&&P.y>B.y-52&&P.y-P.h<B.y)hurtPlayer(B.state==='charge'?2:1,B.x);return;}
  const A=W.arena;
  if(B.state==='wait'){if(P.x>A.x0+3*T&&!P.dead||net&&upBro(R)&&partnerHere()&&R.x>A.x0+3*T){B.state='intro';B.t=1.6;devilWakes();}return;}
  const tg=foeTarget(B);B.t-=dt;const dx=tg.x-B.x;B.dir=Math.sign(dx)||B.dir;
  if(B.state==='intro'){if(B.t<=0){B.state='walk';B.t=1.2;}}
  else if(B.state==='walk'){B.vx=B.dir*40;if(B.t<=0){const r=Math.random(),rage=B.hp<B.max*.45;B.state=r<.35?'volley':r<.6?'leap':r<.8&&B.summons<6?'summon':'charge';B.t=B.state==='charge'?.7:B.state==='volley'?1.1:.6;B.vx=0;B.shots=0;if(rage)B.t*=.75;}}
  else if(B.state==='volley'){B.vx=0;if(B.t<.8&&B.shots<(B.hp<B.max*.45?7:5)&&(B.t*10|0)%2===0&&B.lastShot!==(B.t*10|0)){B.lastShot=B.t*10|0;B.shots++;const a=-.9+B.shots*.22;
    const fb={x:B.x+B.dir*14,y:B.y-46,vx:B.dir*Math.cos(a)*190+dx*.15,vy:Math.sin(a)*190-60,life:3,owner:'e',kind:'fireball',g:420};W.shots.push(fb);snd(200,.15,{type:'sawtooth',vol:.03,to:500});
    if(net)outbox.fs.push([fb.x,fb.y,fb.vx,fb.vy].map(Math.round));}
   if(B.t<=0){B.state='walk';B.t=1+Math.random()*.8;}}
  else if(B.state==='leap'){if(B.grounded&&!B.jumped){B.vy=-420;B.vx=clamp(dx*1.1,-200,200);B.jumped=true;B.grounded=false;}
   if(B.jumped&&B.grounded){B.jumped=false;B.state='walk';B.t=1;fx.shake(12);sfx.boom(true);for(const d of [-1,1]){W.waves.push({x:B.x+d*18,y:B.y,dir:d,t:1.6});if(net)outbox.fw.push([Math.round(B.x+d*18),Math.round(B.y),d]);}B.vx=0;}}
  else if(B.state==='summon'){B.vx=0;if(B.t<=0){B.summons+=2;for(const d of [-1,1]){const x=clamp(B.x+d*70,A.x0+2*T,A.x1-2*T);const e=makeFoe({type:Math.random()<.5?'bomber':'mook',x,y:B.y-120},900+W.foes.length);e.summoned=true;e.active=true;e.state='alert';e.t=.8;W.foes.push(e);fx.burst(x,B.y-110,{n:14,colors:['#f30','#900','#ff0'],speed:120,life:.6,size:2});}
    B.state='walk';B.t=1.4;}}
  else if(B.state==='charge'){if(B.t>0){B.vx=0;}else{B.vx=B.dir*230;if(B.t<-1.1||Math.abs(B.vx)<1){B.state='walk';B.t=1.2;B.vx=0;}}}
  const res=moveBody(B,dt,{grav:900,maxFall:600});if(res.wall&&B.state==='charge'){B.state='walk';B.t=1;fx.shake(10);sfx.boom(false);}
  B.x=clamp(B.x,A.x0+2*T,A.x1-2*T);
  if(!P.dead&&!P.out&&Math.abs(P.x-B.x)<20&&P.y>B.y-52&&P.y-P.h<B.y)hurtPlayer(B.state==='charge'?2:1,B.x);
 }

 // ---------------------------------------------------------------- cages & rescue
 function openCage(cg){
  if(cg.open||P.out)return;cg.open=true;cg.freeT=1.2;P.rescues++;sfx.clink();
  fx.burst(cg.x,cg.y-12,{n:14,colors:cg.vip?['#ffd84a','#fff1a0','#c9902a']:[theme.wood,'#5a3a1a'],speed:130,life:.7,size:1.8,gravity:600,shape:'square'});
  const nm=nameOf(cg.id).toUpperCase();
  if(cg.vip){P.gold++;if(!s.broforceRecruits[P.i].includes(cg.id))s.broforceRecruits[P.i].push(cg.id);}
  // online: a partner who is out of bros comes back as this prisoner instead of the extra life
  const revive=net&&R?.net&&R.out;if(net)ev({cg:[stageIdx,W.cages.indexOf(cg),revive?1:0]});
  if(!revive)P.lives++;addScore(cg.vip?1000:500,cg.x,cg.y-30,cg.vip?'#ffd84a':'#9cf');
  if(P.dead)return;
  if(cg.vip){sfx.gold();banner={big:'NEW RECRUIT!',small:net?`${nm} JOINS BOTH ROSTERS`:`${nm} JOINS ${s.players[P.i].name.toUpperCase()}’S ROSTER`,t:2.6,gold:true,id:cg.id};}
  else{sfx.rescue();banner={big:'BRO IN!',small:`${nm} · ${WEAPONS[weaponFor(cg.id)].name}`,t:1.8};}
  setBro(cg.id);P.hp=2;P.inv=Math.max(P.inv,.8);P.mood='win';P.moodT=1.2;
  fx.ring(P.x,P.y-10,{color:cg.vip?'#ffd84a':'#9cf',r0:4,r1:34,life:.5,width:3});
 }

 // ---------------------------------------------------------------- projectiles
 function stepBullets(dt){
  for(const b of W.bullets){
   const sub=2;for(let k=0;k<sub&&b.life>0;k++){b.x+=b.vx*dt/sub;b.y+=b.vy*dt/sub;
    const c=Math.floor(b.x/T),r=Math.floor(b.y/T),t=T_AT(c,r);
    // only the phone that owns a shot damages terrain with it (online: own shots; enemy shots on player 1's phone)
    if(SOLID[t]){if(ownsShot(b.owner))damageTile(c,r,b.tile);b.life=0;fx.burst(b.x,b.y,{n:2,colors:['#fff6b0','#ffd23a'],speed:80,life:.15,size:1});break;}
    if(b.owner==='p'){
     for(const e of W.foes)if(e.alive&&e.active&&Math.abs(b.x-e.x)<e.w+2&&b.y>e.y-e.h&&b.y<e.y+1){hitF(e,b.dmg,b.x-b.vx*.05);b.life=0;break;}
     if(b.life>0)for(const cg of W.cages)if(!cg.open&&Math.abs(b.x-cg.x)<9&&b.y>cg.y-24&&b.y<cg.y){cg.hp-=b.dmg;b.life=0;if(cg.hp<=0)openCage(cg);break;}
     const B=W.boss;if(b.life>0&&B&&B.alive&&Math.abs(b.x-B.x)<18&&b.y>B.y-56&&b.y<B.y){hitB(b.dmg,b.x);b.life=0;}
    }else if(b.owner==='r'){for(const e of W.foes)if(e.alive&&e.active&&Math.abs(b.x-e.x)<e.w+2&&b.y>e.y-e.h&&b.y<e.y+1){b.life=0;break;}}
    else if(!P.dead&&!P.boarded&&!P.out&&Math.abs(b.x-P.x)<P.w+1&&b.y>P.y-P.h&&b.y<P.y){hurtPlayer(b.dmg,b.x-b.vx);b.life=0;}
   }
   b.life-=dt;
  }
  W.bullets=W.bullets.filter(b=>b.life>0&&b.x>0&&b.x<W.W*T);
  for(const sh of W.shots){
   sh.vy+=(sh.g||0)*dt;sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;sh.life-=dt;
   if(sh.kind==='rocket'){sh.trail-=dt;if(sh.trail<=0){sh.trail=.02;fx.burst(sh.x-Math.sign(sh.vx)*6,sh.y,{n:1,colors:['#bbb','#888'],speed:20,life:.5,size:2,grow:6});}}
   else fx.burst(sh.x,sh.y,{n:1,colors:['#ff4a10','#ffd23a'],speed:20,life:.25,size:2});
   let hit=solidAt(sh.x,sh.y)||sh.life<=0;
   if(sh.owner==='p'||sh.owner==='r'){for(const e of W.foes)if(e.alive&&e.active&&Math.abs(sh.x-e.x)<e.w+3&&sh.y>e.y-e.h&&sh.y<e.y+2)hit=true;
    for(const cg of W.cages)if(!cg.open&&Math.abs(sh.x-cg.x)<9&&sh.y>cg.y-24&&sh.y<cg.y)hit=true;
    const B=W.boss;if(B&&B.alive&&Math.abs(sh.x-B.x)<18&&sh.y>B.y-56&&sh.y<B.y)hit=true;}
   else if(!P.dead&&!P.out&&Math.abs(sh.x-P.x)<P.w+3&&sh.y>P.y-P.h&&sh.y<P.y)hit=true;
   // online a shot this phone doesn't own just vanishes: its blast comes from the owner's phone ({ex})
   if(hit){sh.life=-1;if(ownsShot(sh.owner))queueBoom(sh.x-Math.sign(sh.vx)*2,sh.y,sh.kind==='rocket'?34:26,sh.kind==='rocket'?3:2,sh.owner);}
  }
  W.shots=W.shots.filter(sh=>sh.life>0);
  for(const f of W.flames){f.life-=dt;f.vx*=Math.exp(-2.5*dt);f.vy-=60*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;
   const c=Math.floor(f.x/T),r=Math.floor(f.y/T),t=T_AT(c,r);if(SOLID[t]){if(!f.r&&(t===WOOD||t===CRATE||t===BAGS||t===BARREL))damageTile(c,r,.25);f.life=Math.min(f.life,.05);f.vx=0;}
   if(f.r)continue;   // the partner's flames (online) are only for show here
   for(const e of W.foes)if(e.alive&&e.active&&Math.abs(f.x-e.x)<e.w+4&&f.y>e.y-e.h-2&&f.y<e.y+2){hitF(e,f.dmg*dt*20,f.x-f.vx);e.burning=1.5;}
   for(const cg of W.cages)if(!cg.open&&Math.abs(f.x-cg.x)<10&&f.y>cg.y-24&&f.y<cg.y){cg.hp-=dt*6;if(cg.hp<=0)openCage(cg);}
   const B=W.boss;if(B&&B.alive&&Math.abs(f.x-B.x)<20&&f.y>B.y-56&&f.y<B.y)hitB(f.dmg*dt*3,f.x);}
  W.flames=W.flames.filter(f=>f.life>0);
  for(const n of W.nades){n.t-=dt;n.spin+=n.vx*dt*.2;const vx=n.vx;const res=moveBody(n,dt,{grav:700,maxFall:500});
   if(res.wall)n.vx=-vx*.45;if(res.landed){n.vx*=.6;if(Math.abs(n.vy)<1&&n.bounced!==true){n.vy=-80;n.bounced=true;}}if(res.bonk)n.vy=40;
   if(n.owner==='p')for(const e of W.foes)if(e.alive&&e.active&&Math.abs(n.x-e.x)<e.w+3&&n.y>e.y-e.h&&n.y<e.y+3)n.t=Math.min(n.t,0);
   if(n.t<=0&&ownsShot(n.owner)){queueBoom(n.x,n.y-3,40,4,n.owner);}}
  W.nades=W.nades.filter(n=>n.t>0);
  for(const w of W.waves){w.t-=dt;w.x+=w.dir*170*dt;if(solidAt(w.x,w.y-4))w.t=0;if(frames%3===0)fx.burst(w.x,w.y,{n:2,colors:['#ff6a1a','#ffd23a','#7a2a10'],speed:60,life:.35,size:2.2,angle:-Math.PI/2,spread:.8});
   if(!P.dead&&!P.out&&Math.abs(P.x-w.x)<8&&P.y>w.y-12&&P.y<=w.y+1)hurtPlayer(1,w.x-w.dir*5);}
  W.waves=W.waves.filter(w=>w.t>0);
  for(const b of W.booms)b.delay-=dt;const go=W.booms.filter(b=>b.delay<=0);W.booms=W.booms.filter(b=>b.delay>0);for(const b of go)explode(b);
  for(const pk of W.pickups){pk.t-=dt;moveBody(pk,dt,{grav:700});if(!P.dead&&!P.out&&Math.abs(pk.x-P.x)<10&&Math.abs(pk.y-P.y)<16){pk.t=0;P.grenades=Math.min(6,P.grenades+1);fx.pop(pk.x,pk.y-14,'+1 GRENADE',{color:'#bdf06a',stroke:'#000',size:8,rise:18,life:.8});sfx.clink();}}
  W.pickups=W.pickups.filter(pk=>pk.t>0);
  for(const cp of W.corpses){cp.t-=dt;cp.vy+=900*dt;const nx=cp.x+cp.vx*dt,ny=cp.y+cp.vy*dt;if(solidAt(nx,cp.y-2)){cp.vx*=-.3;}else cp.x=nx;if(solidAt(cp.x,ny)){cp.vy=0;cp.vx*=.8;cp.vr*=.7;cp.y=Math.floor(ny/T)*T;}else cp.y=ny;cp.rot+=cp.vr*dt;}
  W.corpses=W.corpses.filter(cp=>cp.t>0).slice(-40);
 }

 // ---------------------------------------------------------------- stage flow: flags, chopper, timers
 function updateStage(dt){
  for(const f of W.flags)if(!f.up&&!P.dead&&!P.out&&Math.abs(P.x-f.x)<14&&Math.abs(P.y-f.y)<40){f.up=true;W.checkpoint={x:f.x,y:f.y};addScore(250,f.x,f.y-40,'#9cf');sfx.flag();fx.pop(f.x,f.y-56,'CHECKPOINT',{color:'#fff',stroke:'#036',size:9,rise:16,life:1.2});if(net)ev({fl:[stageIdx,W.flags.indexOf(f)]});}
  const H=W.heli;H.t+=dt;
  if(H.state==='arrive'){H.y+=(W.exit.y-6.5*T-H.y)*Math.min(1,dt*1.6);if(Math.abs(H.y-(W.exit.y-6.5*T))<2)H.state='hover';}
  if(H.state==='hover'||H.state==='arrive'){if(frames%9===0&&Math.abs(H.x-P.x)<360)sfx.chop();
   const ladderX=H.x-8,ladderBot=H.y+5.5*T;if(H.state==='hover'&&!P.dead&&!P.out&&!P.boarded&&Math.abs(P.x-ladderX)<12&&P.y>H.y+2*T&&P.y-P.h<ladderBot){P.boarded=true;stageClear();if(!net){H.state='leave';H.t=0;}else W.boardT=clock;}
   // online the chopper waits for the partner: it leaves once both are aboard (or the other is out of bros), or
   // NET_GRACE seconds after the first one climbed in; a bro left behind is pulled along
   if(net&&H.state==='hover'){const rIn=R?.net&&R.si===stageIdx&&R.boarded;if(rIn&&W.rBoardT==null)W.rBoardT=clock;
    const first=Math.min(P.boarded?W.boardT:Infinity,W.rBoardT??Infinity),rDone=rIn||R?.out||!R?.net||nf?.gone;
    if(P.boarded&&rDone||P.out&&rIn||clock>first+NET_GRACE){if(!P.boarded&&!P.out){P.boarded=true;banner={big:'PULLED ALONG',small:'THE CHOPPER WOULDN’T WAIT',t:2};}H.state='leave';H.t=0;}}}
  if(H.state==='leave'){H.y-=dt*(40+H.t*90);H.x+=dt*(30+H.t*120);if(frames%9===0)sfx.chop();}
  if((P.boarded||P.out)&&H.state==='leave'&&H.t>2.6&&!W.cleared){W.cleared=true;nextStage();}
 }
 function stageClear(){
  const par=PAR[stageIdx],bonus=1500+Math.max(0,Math.round((par-stageT)*20));P.stagesCleared++;P.stageTimes.push(stageT);
  addScore(bonus);sfx.clear();P.mood='win';P.moodT=3;
  banner={big:stageIdx===2?'MISSION ACCOMPLISHED':`STAGE ${stageIdx+1} CLEAR`,small:`+${bonus} · ${fmt(stageT)}`,t:2.6};
  if(stageIdx===2){const lifeBonus=(P.lives)*300;if(lifeBonus)addScore(lifeBonus);}
 }
 async function nextStage(){
  // online both phones start the next stage together (a bro who was out of bros comes back with one)
  if(net){if(stageIdx>=2){endTurn('done');return;}phase='net-wait';await nf.sync('stage'+stageIdx);if(!s.alive||phase!=='net-wait')return;phase='play';
   if(P.out){P.out=false;P.dead=0;P.hp=2;P.lives=0;}}
  if(stageIdx<2){loadStage(stageIdx+1,true);P.boarded=false;P.mood='normal';}else endTurn('done');}
 function endTurn(why){
  if(net){netEnd(why);return;}
  if(phase!=='play')return;phase=turn===0||s.solo?'turn-end':'end';endT=0;P.why=why;
  results[turn]={score:P.score,kills:P.kills,rescues:P.rescues,gold:P.gold,stages:P.stagesCleared,why,recruits:s.broforceRecruits[turn].slice()};
  if(phase==='end'){const a=results[0].score,b=results[1].score;winner=a===b?-2:a>b?0:1;if(winner>=0)s.react(winner,'win');jingle([523,659,784,1047,1319],{type:'square',vol:.035,step:.1});}
  else jingle([392,523,659,784],{type:'square',vol:.03,step:.09});
 }
 const level3=()=>stageIdx===2?.8:stageIdx===1?.9:1;
 const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

 // ---------------------------------------------------------------- camera
 function computeZoom(){Z=Math.max(1,Math.min(s.H/220,s.W/215));}
 function updateCamera(dt,snap=false){
  // online, out of bros: the camera follows the partner
  const vw=viewW(),vh=viewH();const H=W.heli,F=net&&P.out&&R?.net&&!P.boarded?R:P;const tx=(P.boarded?H.x:F.x)+F.facing*vw*.12-vw/2,ty=(P.boarded?H.y+40:F.y)-vh*.58;
  const k=snap?1:Math.min(1,dt*5);cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*Math.min(1,dt*(snap?99:4));
  cam.x=clamp(cam.x,0,Math.max(0,W.W*T-vw));cam.y=clamp(cam.y,-40,Math.max(0,ROWS*T-vh));
 }

 // ---------------------------------------------------------------- online co-op (see the top of the file)
 const outbox={sh:[],gr:[],tb:[],fb:[],fn:[],fs:[],fw:[],fh:new Map(),bh:0,bx:0};
 function ev(e){nf?.event(e);}
 const ownsShot=o=>o==='p'||o!=='r'&&host;
 const partnerHere=()=>!!R?.net&&R.si===stageIdx;
 const foeByK=k=>k<900?W.foes[k]:W.foes.find(f=>f.k===k);
 const r1=v=>Math.round(v*10)/10;
 // what this phone did since the last flush goes out in one event (~20 a second, with the snapshots)
 function netFlush(){const o=outbox,e={};
  if(o.sh.length)e.sh=o.sh.splice(0);if(o.gr.length)e.gr=o.gr.splice(0);if(o.tb.length)e.tb=o.tb.splice(0);
  if(o.fb.length)e.fb=o.fb.splice(0);if(o.fn.length)e.fn=o.fn.splice(0);if(o.fs.length)e.fs=o.fs.splice(0);if(o.fw.length)e.fw=o.fw.splice(0);
  if(o.fh.size){e.fh=[...o.fh.values()].map(h=>[h[0],+h[1].toFixed(2),h[2],h[3]]);o.fh.clear();}
  if(o.bh>0){e.bh=[+o.bh.toFixed(2),Math.round(o.bx)];o.bh=0;}
  if(Object.keys(e).length){e.si=stageIdx;ev(e);}}
 const BF=['dead','boarded','ladder','climb','grounded','out'];
 const packBro=p=>{let fl=0;BF.forEach((k,j)=>{if(p[k])fl|=1<<j;});return [r1(p.x),r1(p.y),Math.round(p.vx),Math.round(p.vy),p.facing,fl,p.hp,p.lives,p.grenades,p.score,p.bro,p.inv>0?1:0,p.muzzle>0?1:0,p.kills,p.stagesCleared,stageIdx];};
 function unpackBro(a){if(!Array.isArray(a)||a.length<16||!R)return;const first=!R.net||R.si!==a[15];R.net={a,at:performance.now()};
  R.vx=a[2];R.vy=a[3];R.facing=a[4]||1;BF.forEach((k,j)=>{R[k]=!!(a[5]&1<<j);});R.dead=R.dead?1:0;R.hp=a[6];R.lives=a[7];R.grenades=a[8];R.score=a[9];
  if(R.bro!==a[10]){R.bro=a[10];R.weapon=weaponFor(R.bro);for(const m of MOODS)headCanvas(R.bro,m);}R.inv=a[11]?1:0;if(a[12]){R.muzzle=.06;R.fireT=0;}R.kills=a[13];R.stagesCleared=a[14];R.si=a[15];
  if(first){R.x=a[0];R.y=a[1];}if(R.out&&P?.out)netEnd('lives');}
 function stepRemote(dt){if(!R?.net)return;const a=R.net.a,age=clamp((performance.now()-R.net.at)/1000,0,.25),tx=a[0]+R.vx*age,ty=a[1]+(R.grounded?0:R.vy*age),k=1-Math.exp(-dt*16);
  if(Math.abs(tx-R.x)>80||Math.abs(ty-R.y)>80){R.x=tx;R.y=ty;}else{R.x+=(tx-R.x)*k;R.y+=(ty-R.y)*k;}
  R.anim+=R.grounded?Math.abs(R.vx)*dt*.09:dt*4;R.muzzle=Math.max(0,(R.muzzle||0)-dt);R.recoil=R.muzzle>0?1:0;R.fireT=(R.fireT??9)+dt;
  R.idleT=R.grounded&&Math.abs(R.vx)<20?(R.idleT||0)+dt:0;}
 // host: the enemies near the other bro and the Devil; the other phone shows them as they come
 const FT={};FOE_TYPES.forEach((t,j)=>FT[t]=j);
 function packWorld(){if(!host||!W)return null;const out=[],near=R?.net&&R.si===stageIdx?R.x:P.x,vw=viewW();
  for(const e of W.foes)if(e.alive&&e.active&&Math.abs(e.x-near)<vw*.6+160)out.push([e.k,r1(e.x),r1(e.y),e.dir,FOE_STATES.indexOf(e.state),FT[e.type],e.muzzle>0?1:0,e.bubble?e.bubble.ch:'',Math.round(e.vx)]);
  const B=W.boss;return {fo:out,b:B?[r1(B.x),r1(B.y),B.dir,B.state,Math.round(B.hp),B.alive?1:0,Math.round(B.vx),B.flash>0?1:0]:null};}
 function unpackWorld(d){if(host||!W||d.si!==stageIdx)return;const now=performance.now();
  for(const f of d.fo||[]){const [k,x,y,dir,st,ty,mz,bub,vx]=f;let e=foeByK(k);
   if(!e){e=makeFoe({type:FOE_TYPES[ty]||'mook',x,y},k);e.summoned=k>=900;W.foes.push(e);}
   if(!e.alive)continue;if(!e.active){e.active=true;e.x=x;e.y=y;}e.tx=x;e.ty=y;e.dir=dir;e.state=FOE_STATES[st]||'patrol';e.vx=vx;if(mz)e.muzzle=.06;
   e.bubble=bub?{ch:bub,t:.3}:null;e.seen=now;}
  const B=W.boss;if(B&&d.b){const [x,y,dir,st,hp,alive,vx,fl]=d.b;const prev=B.state;B.tx=x;B.ty=y;B.dir=dir;B.hp=hp;B.vx=vx;if(fl)B.flash=.07;
   if(prev==='wait'&&st!=='wait'){B.x=x;B.y=y;devilWakes();}B.state=st;
   if(!alive&&B.alive){B.alive=false;B.dead=3;devilDown();for(let k=0;k<6;k++)setTimeout(()=>{if(s.alive&&W)blastFx(B.x+(Math.random()-.5)*40,B.y-10-Math.random()*50,30);},k*220);}}}
 // the other phone's enemies: eased toward the host's positions; one missing near this bro for a while is gone
 function stepNetFoes(dt){const now=performance.now(),k=1-Math.exp(-dt*12);
  for(const e of W.foes){if(!e.alive||!e.active)continue;e.flash=Math.max(0,e.flash-dt);
   if(e.tx!=null){e.x+=(e.tx-e.x)*k;e.y+=(e.ty-e.y)*k;}e.anim+=Math.abs(e.vx)*dt*.1;
   if(e.seen&&now-e.seen>1500&&Math.abs(e.x-P.x)<viewW()*.5){e.alive=false;continue;}
   // what touches this bro is judged here
   if(!P.dead&&!P.out&&!P.boarded&&P.inv<=0&&e.state==='attack'&&e.type!=='bomber'){const dx=P.x-e.x,dy=P.y-12-(e.y-e.h*.6);if(Math.abs(dx)<(e.type==='dog'?10:8)&&Math.abs(dy)<(e.type==='dog'?16:14))hurtPlayer(1,e.x);}}}
 function onNetEvent(e){
  if(e.setup){setupMsg=e.setup;setupWait?.();return;}
  if(!W||e.si!=null&&e.si!==stageIdx)return;
  if(e.sh)for(const [x,y,f,wp] of e.sh){const w=WEAPONS[wp];if(!w)continue;
   if(w.rocket)W.shots.push({x,y,vx:f*w.speed,vy:0,life:w.life,owner:'r',kind:'rocket',trail:0});
   else if(w.flame){for(let k=0;k<2;k++)W.flames.push({x,y,vx:f*w.speed*(0.8+Math.random()*.4),vy:(Math.random()-.5)*50-20,life:w.life,max:w.life,dmg:0,r:true});}
   else{const n=w.pellets||1;for(let k=0;k<n;k++){const sp=n>1?(k/(n-1)-.5)*w.spread:0;W.bullets.push({x,y,vx:Math.cos(sp)*f*w.speed,vy:Math.sin(sp)*w.speed,life:w.life,owner:'r',dmg:0,tile:0});}}
   if(R&&Math.abs(x-P.x)<viewW())sfx[wp]?.();}
  if(e.gr)for(const [x,y,vx,vy] of e.gr)W.nades.push({x,y,vx,vy,t:1.3,owner:'r',w:2,h:4,grounded:false,spin:0});
  if(e.tb)for(const k of e.tb){const t=W.tiles[k];if(t!==E&&t!==STEEL){W.tiles[k]=E;const c=k%MAXW,r=Math.floor(k/MAXW);fx.burst((c+.5)*T,(r+.5)*T,{n:t===BARREL?2:5,colors:tileColors(t),speed:100,life:.5,size:2,gravity:600,shape:'square'});}}
  if(e.fb)for(const [x,y,vx,vy] of e.fb)W.bullets.push({x,y,vx,vy,life:1.5,owner:'e',dmg:1,tile:.35});
  if(e.fn)for(const [x,y,vx,vy] of e.fn)W.nades.push({x,y,vx,vy,t:1.6,owner:'e',w:2,h:4,grounded:false,spin:0});
  if(e.fs)for(const [x,y,vx,vy] of e.fs)W.shots.push({x,y,vx,vy,life:3,owner:'e',kind:'fireball',g:420});
  if(e.fw)for(const [x,y,d] of e.fw)W.waves.push({x,y,dir:d,t:1.6});
  if(e.fh&&host)for(const [k,dmg,fx0,bl] of e.fh){const f=foeByK(k);if(f)hitFoe(f,dmg,fx0,!!bl,'r');}
  if(e.bh&&host){const B=W.boss;if(B?.alive)hitBoss(e.bh[0],e.bh[1]);}
  if(e.ex){const [si,x,y,r,owner]=e.ex;if(si===stageIdx)remoteBlast(x,y,r,owner);}
  if(e.fk&&!host){const [si,k,fx0,bl,by]=e.fk,f=si===stageIdx&&foeByK(k);if(f&&f.alive){f.alive=false;if(by===me)foeScore(f);sfx.splat();
   fx.burst(f.x,f.y-f.h*.5,{n:bl?22:12,colors:['#a00','#d11','#700','#f44'],speed:bl?220:140,life:.8,size:1.8,gravity:600});
   const dir=Math.sign(f.x-fx0)||1;W.corpses.push({x:f.x,y:f.y,vx:dir*(bl?220:90),vy:bl?-260:-110,rot:0,vr:dir*(bl?14:6),t:5,kind:f.type,flip:f.dir});}}
  if(e.cg){const [si,k,rv]=e.cg,cg=si===stageIdx&&W.cages[k];if(cg&&!cg.open){cg.open=true;cg.freeT=1.2;sfx.clink();
   if(cg.vip&&!s.broforceRecruits[me].includes(cg.id)){s.broforceRecruits[me].push(cg.id);sfx.gold();banner={big:'NEW RECRUIT!',small:`${nameOf(cg.id).toUpperCase()} JOINS BOTH ROSTERS`,t:2.6,gold:true,id:cg.id};}
   // the partner freed a prisoner while this bro was out: back in as that bro
   if(rv&&P.out){P.out=false;P.dead=0;P.hp=2;P.lives=0;P.inv=2;setBro(cg.id);Object.assign(P,{x:cg.x,y:cg.y-2,vx:0,vy:-120});banner={big:'BACK IN!',small:`${nameOf(cg.id).toUpperCase()} · FREED BY ${s.players[them].name.toUpperCase()}`,t:2};}}}
  if(e.fl){const [si,k]=e.fl,f=si===stageIdx&&W.flags[k];if(f&&!f.up){f.up=true;W.checkpoint={x:f.x,y:f.y};}}}
 function netOut(){P.out=true;P.dead=0;banner={big:'OUT OF BROS',small:R?.net&&!R.out?`WATCHING ${s.players[them].name.toUpperCase()} · A FREED PRISONER BRINGS YOU BACK`:'MISSION OVER',t:2.6};
  if(!R?.net||R.out||nf?.gone)netEnd('lives');}
 // the mission is over on this phone: swap finals, then both score the same
 async function netEnd(why){if(phase==='net-end'||phase==='end')return;phase='net-end';endT=0;P.why=why;
  const mine={score:P.score,kills:P.kills,rescues:P.rescues,gold:P.gold,stages:P.stagesCleared,why,recruits:s.broforceRecruits[me].slice()};results[me]=mine;nf.finish(mine);
  const o=await nf.remoteDone();if(!s.alive)return;results[them]=o||{score:R?.score||0,kills:R?.kills||0,rescues:0,gold:0,stages:R?.stagesCleared||0,why:'left',recruits:[]};
  const a=results[0].score,b=results[1].score;winner=a===b?-2:a>b?0:1;phase='end';endT=0;if(winner>=0)s.react(winner,'win');jingle([523,659,784,1047,1319],{type:'square',vol:.035,step:.1});}
 // player 1's phone picks the cages for all three stages: a GOLD cage holds someone locked for both players if possible
 function pickNetCages(){const used=new Set(),both=vipPools[0].filter(id=>vipPools[1].includes(id)),any=[...new Set([...vipPools[0],...vipPools[1]])];
  const others=[...new Set([...rosters[0],...rosters[1]])].filter(Boolean);if(!others.length)others.push(...s.players.map(p=>p.character));
  return STAGES.map((S,si)=>{const rng=mulberry(seed+si*13+7);return S.cages.map(cg=>{if(cg.vip){const pool=(both.some(id=>!used.has(id))?both:any).filter(id=>!used.has(id));if(pool.length){const id=pool[Math.floor(rng()*pool.length)];used.add(id);return [id,1];}}return [others[Math.floor(rng()*others.length)],0];});});}
 let bot=null;
 if(net){nf=netField(s,{hz:20,pack:()=>P&&W?{p:packBro(P),w:packWorld(),si:stageIdx}:{},unpack:(i,d)=>{if(!d?.p)return;unpackBro(d.p);if(d.w){d.w.si=d.si;unpackWorld(d.w);}},onEvent:onNetEvent});}
 // ---------------------------------------------------------------- turns
 async function beginTurn(i){
  // online: no hand-off; player 1's phone sends the cage line-up, then both start together
  if(net){phase='handoff';clearInput();if(host){netCages=pickNetCages();ev({setup:{cages:netCages}});}
   await nf.start('go');if(!s.alive||netStarted)return;netStarted=true;
   if(!host){if(!setupMsg)await new Promise(r=>{setupWait=r;});netCages=setupMsg?.cages||null;}
   clock=0;acc=0;P=newPlayer(me);setBro(P.bro);R=newPlayer(them);R.net=null;R.si=-1;for(const m of MOODS)headCanvas(R.bro,m);
   loadStage(0,false);P.x=W.S.spawn.x+(me?8:-8);P.y=W.S.spawn.y;P.inv=1.5;computeZoom();updateCamera(0,true);cd=new Countdown(3);phase='count';return;}
  phase='handoff';turn=i;clearInput();
  const n0=s.players[0].name;
  const desc=s.solo?`Mission ${soloCleared+1}: blast through all three stages of ${theme.op}. Kills, freed prisoners, checkpoints and fast clears score points; GOLD cages unlock new characters. Complete the mission to get a brand-new one.`:i===0?`You go first: blast through all three stages of ${theme.op}. Kills, freed prisoners, checkpoints and fast stage clears score points. Open the GOLD cage on each stage to unlock a new character. ${s.players[1].name} plays the same mission next.`
   :`Beat ${n0}’s ${results[0].score.toLocaleString()} points on the same mission. GOLD cages unlock new characters for you too.`;
  if(!await s.pass(i,desc,'Ready — lock and load',s.solo?{soloTitle:`Mission ${soloCleared+1}`,summary:soloCleared?`${soloTotal.toLocaleString()} points so far.`:null}:{summary:i?`${n0}: ${results[0].score.toLocaleString()} points, ${results[0].kills} kills, ${results[0].rescues} ${results[0].rescues===1?'prisoner':'prisoners'} freed. ${s.players[1].name}, take the phone.`:null}))return;
  clock=0;acc=0;P=newPlayer(i);setBro(P.bro);loadStage(0,false);P.x=W.S.spawn.x;P.y=W.S.spawn.y;P.inv=1.5;computeZoom();updateCamera(0,true);
  cd=new Countdown(3);phase='count';
 }
 function soloAfter(){const r=results[0];soloTotal+=r.score;
  if(r.why!=='done')return soloFinish(s,soloTotal,soloCleared,`Broforce ${theme.name} solo: ${soloCleared} mission${soloCleared===1?'':'s'} accomplished; the last ended at ${r.stages}/3 stages (${r.why==='time'?'time up':'out of bros'}).`);
  soloCleared++;soloProgress(s,soloTotal,soloCleared,`Broforce ${theme.name} solo: ${soloCleared} mission${soloCleared===1?'':'s'} accomplished.`);
  const next=Math.floor(s.random()*4294967296);STAGES=[0,1,2].map(si=>buildStage(next+si*7919,si));beginTurn(0);}
 s.hint(`BROFORCE · turns: each player runs the same 3-stage mission and the higher score wins. Touch: drag on the left to run (push up to jump or climb a ladder, down to drop or climb down); hold anywhere on the right to fire, swipe up there to jump, swipe down to throw a grenade. Push into any wall in mid-air to climb it. Free caged prisoners to switch bros (+1 life); the GOLD cage unlocks a new character. Keys: A/D or arrows run, W/Up jump, S/Down ladders, Space/Enter fire, G/E/Shift grenade.`);

 // ---------------------------------------------------------------- drawing: tiles (pre-rendered per theme)
 const TILEART=makeTileArt(theme);
 function drawWorld(time){
  const vw=viewW(),vh=viewH();
  // sky & parallax
  const sky=g.createLinearGradient(0,0,0,s.H);const hell=stageIdx===2;
  sky.addColorStop(0,hell?'#3a0d0d':theme.sky[0]);sky.addColorStop(1,hell?'#c2461c':theme.sky[1]);g.fillStyle=sky;g.fillRect(0,0,s.W,s.H);
  drawParallax(time,hell);
  g.save();const sk=fx.shakeAmt>.2?fx.shakeAmt:0,ox=sk?(Math.random()-.5)*sk:0,oy=sk?(Math.random()-.5)*sk:0;
  const sx=Math.round(cam.x*Z-ox),sy=Math.round(cam.y*Z-oy);g.imageSmoothingEnabled=false;
  // back walls (dug-out caves, building interiors)
  const c0=Math.max(0,Math.floor(cam.x/T)),c1=Math.min(W.W-1,Math.ceil((cam.x+vw)/T)),r0=Math.max(0,Math.floor(cam.y/T)),r1=Math.min(ROWS-1,Math.ceil((cam.y+vh)/T));
  const px=c=>Math.round(c*T*Z)-sx,py=r=>Math.round(r*T*Z)-sy;
  for(let r=r0;r<=r1;r++){const y=py(r),h=py(r+1)-y;for(let cc=c0;cc<=c1;cc++){const k=r*MAXW+cc,t=W.tiles[k];if(SOLID[t])continue;const b=W.back[k];if(!b)continue;const x=px(cc),w=px(cc+1)-x;g.drawImage(TILEART.back[b][(cc*7+r*3)%3],x,y,w,h);}}
  // decorations behind the action
  g.setTransform(Z,0,0,Z,-sx,-sy);
  for(const d of W.S.decor)drawDecor(d,time);
  g.setTransform(1,0,0,1,0,0);
  // tiles
  for(let r=r0;r<=r1;r++){const y=py(r),h=py(r+1)-y;for(let cc=c0;cc<=c1;cc++){const k=r*MAXW+cc,t=W.tiles[k];if(t===E)continue;const x=px(cc),w=px(cc+1)-x;
   const art=TILEART.t[t];g.drawImage(art[(cc*13+r*7)%art.length],x,y,w,h);
   if(t===DIRT&&r>0&&!SOLID[W.tiles[k-MAXW]]&&W.tiles[k-MAXW]!==LADDER&&!W.back[k-MAXW])g.drawImage(TILEART.top[(cc+r)%3],x,y-Math.round(3*Z),w,Math.round(9*Z));
   if(SOLID[t]&&t!==BARREL){if(cc>0&&!SOLID[W.tiles[k-1]]){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x,y,Math.max(1,Z),h);}if(cc<W.W-1&&!SOLID[W.tiles[k+1]]){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x+w-Math.max(1,Z),y,Math.max(1,Z),h);}
    if(r<ROWS-1&&!SOLID[W.tiles[k+MAXW]]){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,y+h-Math.max(1,Z*1.5),w,Math.max(1,Z*1.5));}}
   const hp=W.hp[k],max=HP[t];if(hp<max&&max<100){const d=hp/max;g.drawImage(TILEART.crack[d<.4?1:0],x,y,w,h);}}}
  g.setTransform(Z,0,0,Z,-sx,-sy);
  // actors
  g.imageSmoothingEnabled=true;
  for(const f of W.flags)drawFlag(f,time);
  for(const cg of W.cages)drawCage(cg,time);
  for(const pk of W.pickups)drawPickup(pk,time);
  for(const cp of W.corpses)drawCorpse(cp);
  for(const e of W.foes)if(e.alive&&e.active)drawFoe(e,time);
  if(W.boss)drawBoss(W.boss,time);
  if(net&&partnerHere()&&!R.dead&&!R.boarded&&!R.out)drawBro(R,time);
  if(!P.dead&&!P.boarded&&!P.out)drawBro(P,time);
  drawHeli(W.heli,time);
  for(const n of W.nades)drawNade(n);
  for(const sh of W.shots)drawShot(sh);
  for(const b of W.bullets){g.strokeStyle=b.owner==='p'?'#fff3a0':'#ff8a3a';g.lineWidth=b.owner==='p'?1.6:2;g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x-b.vx*.018,b.y-b.vy*.018);g.stroke();}
  for(const f of W.flames){const k=f.life/f.max;g.fillStyle=k>.6?'#fff3a0':k>.35?'#ffb02a':'#e8401a';g.globalAlpha=Math.min(1,k*1.8);g.beginPath();g.arc(f.x,f.y,2+(1-k)*5,0,7);g.fill();}g.globalAlpha=1;
  for(const w of W.waves){g.fillStyle='#ff6a1a';g.beginPath();g.moveTo(w.x-7,w.y);g.lineTo(w.x,w.y-12-Math.sin(time*30)*2);g.lineTo(w.x+7,w.y);g.fill();}
  fx.draw(g);
  g.setTransform(1,0,0,1,0,0);g.restore();
 }
 const PAR_LAYERS=(()=>{const r=mulberry(seed^0xbeef),far=[],mid=[];for(let k=0;k<48;k++)far.push(.35+r()*.55);for(let k=0;k<64;k++)mid.push(r());return {far,mid};})();
 function drawParallax(time,hell){
  const H=s.H;g.save();
  // far mountains / skyline
  g.fillStyle=hell?'#5a1a14':theme.far;g.globalAlpha=.85;const fx0=cam.x*Z*.15,step=90;g.beginPath();g.moveTo(0,H);
  for(let k=-1;k<s.W/step+2;k++){const idx=((Math.floor(fx0/step)+k)%48+48)%48,x=k*step-fx0%step,h=PAR_LAYERS.far[idx]*H*.42;
   if(theme.decor==='city'||theme.decor==='factory'){g.lineTo(x,H*.78-h*.7);g.lineTo(x+step*.7,H*.78-h*.7);g.lineTo(x+step*.7,H*.78-h*.45);g.lineTo(x+step,H*.78-h*.45);}else{g.lineTo(x+step*.5,H*.8-h);g.lineTo(x+step,H*.8-h*.6);}}
  g.lineTo(s.W,H);g.fill();
  // haze
  const hz=g.createLinearGradient(0,H*.45,0,H);hz.addColorStop(0,'rgba(0,0,0,0)');hz.addColorStop(1,hell?'rgba(255,90,30,.35)':theme.haze+'66');g.globalAlpha=1;g.fillStyle=hz;g.fillRect(0,H*.45,s.W,H*.55);
  // mid silhouettes (trees, chimneys, towers, cacti)
  g.fillStyle=hell?'#2a0a08':theme.mid;const m0=cam.x*Z*.4,ms=70;const base=H*.92-(cam.y-(G*T-viewH()*.58))*Z*.3;
  for(let k=-1;k<s.W/ms+2;k++){const idx=((Math.floor(m0/ms)+k)%64+64)%64,x=k*ms-m0%ms,v=PAR_LAYERS.mid[idx],h=(40+v*90)*Z*.5;
   if(theme.decor==='jungle'){g.fillRect(x+ms*.45,base-h,4*Z*.5,h);g.beginPath();g.ellipse(x+ms*.47,base-h,24*Z*.5,12*Z*.5,0,0,7);g.fill();g.beginPath();g.ellipse(x+ms*.2,base-h*.4,30*Z*.5,20*Z*.5,0,0,7);g.fill();}
   else if(theme.decor==='desert'){if(v>.5){g.fillRect(x+ms*.4,base-h*.7,6*Z*.5,h*.7);g.fillRect(x+ms*.4-8*Z*.5,base-h*.5,8*Z*.5,3*Z*.5);g.fillRect(x+ms*.4-8*Z*.5,base-h*.65,3*Z*.5,h*.18);}g.beginPath();g.ellipse(x+ms*.5,base,ms*.7,h*.25,0,Math.PI,0);g.fill();}
   else{g.fillRect(x+ms*.1,base-h,ms*.55,h);if(theme.decor==='factory'&&v>.6){g.fillRect(x+ms*.2,base-h-h*.6,6*Z*.5,h*.6);g.globalAlpha=.3;g.beginPath();g.arc(x+ms*.22,base-h*1.7-Math.sin(time+k)*6,10*Z*.5,0,7);g.fill();g.globalAlpha=1;}
    else if(theme.decor==='city'){g.fillStyle='rgba(255,220,140,.35)';for(let wy=base-h+6;wy<base-6;wy+=10)for(let wx=x+ms*.15;wx<x+ms*.6;wx+=9)if((wx*7+wy*3|0)%5===0)g.fillRect(wx,wy,3,4);g.fillStyle=hell?'#2a0a08':theme.mid;}}}
  g.fillRect(0,base,s.W,H-base+2);
  g.restore();
 }
 function drawDecor(d,time){
  const vw=viewW();if(d.x+200<cam.x||d.x-200>cam.x+vw)return;g.save();
  if(d.k==='tree'){const tt=theme.decor;
   if(tt==='jungle'){g.fillStyle='#5a3a1e';g.fillRect(d.x-2,d.y-46,4,46);g.fillStyle='#2f7d1f';for(let k=0;k<5;k++){const a=k*1.25+Math.sin(time*1.5+d.x)*.06;g.beginPath();g.ellipse(d.x+Math.cos(a)*12,d.y-46+Math.sin(a)*4,15,4,a,0,7);g.fill();}g.fillStyle='#58b334';g.beginPath();g.arc(d.x,d.y-47,5,0,7);g.fill();}
   else if(tt==='desert'){g.fillStyle='#3e8a3a';g.fillRect(d.x-3,d.y-30,6,30);g.fillRect(d.x-11,d.y-22,8,4);g.fillRect(d.x-11,d.y-30,4,10);g.fillRect(d.x+3,d.y-16,8,4);g.fillRect(d.x+7,d.y-24,4,10);}
   else if(tt==='city'){g.fillStyle='#2a2a30';g.fillRect(d.x-1,d.y-44,2,44);g.fillRect(d.x-1,d.y-44,10,2);g.fillStyle='#ffe9a0';g.globalAlpha=.8+Math.sin(time*3+d.x)*.1;g.beginPath();g.arc(d.x+9,d.y-41,2.5,0,7);g.fill();g.globalAlpha=.12;g.beginPath();g.moveTo(d.x+9,d.y-41);g.lineTo(d.x,d.y);g.lineTo(d.x+20,d.y);g.fill();}
   else{g.fillStyle='#4a4a50';g.fillRect(d.x-4,d.y-40,8,40);g.fillStyle='#6a6a70';g.fillRect(d.x-6,d.y-42,12,4);g.globalAlpha=.25;g.fillStyle='#ccc';g.beginPath();g.arc(d.x+Math.sin(time)*3,d.y-52-(time*10%20),5,0,7);g.fill();}}
  else if(d.k==='tower'){g.strokeStyle='#5a3a1a';g.lineWidth=2.5;g.beginPath();g.moveTo(d.x+2,d.y);g.lineTo(d.x+4,d.top+T);g.moveTo(d.x2-2,d.y);g.lineTo(d.x2-4,d.top+T);g.moveTo(d.x+3,d.y-2);g.lineTo(d.x2-3,d.y-4*T);g.moveTo(d.x2-3,d.y-2);g.lineTo(d.x+3,d.y-4*T);g.moveTo(d.x+3,d.y-4*T-2);g.lineTo(d.x2-3,d.y-8*T);g.moveTo(d.x2-3,d.y-4*T-2);g.lineTo(d.x+3,d.y-8*T);g.stroke();}
  else if(d.k==='banner'){g.fillStyle='#2a2a2a';g.fillRect(d.x,d.y-26,1.5,26);g.fillStyle='#b01818';const wv=Math.sin(time*4+d.x)*1.5;g.beginPath();g.moveTo(d.x+1.5,d.y-26);g.lineTo(d.x+18,d.y-25+wv);g.lineTo(d.x+18,d.y-15+wv);g.lineTo(d.x+1.5,d.y-16);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(d.x+9,d.y-21,2.5,0,7);g.fill();g.fillStyle='#000';g.fillRect(d.x+8,d.y-21,1,1);g.fillRect(d.x+9.5,d.y-21,1,1);}
  else if(d.k==='lamp'){g.fillStyle='#222';g.fillRect(d.x,d.y,1,5);g.fillStyle='#ffd27a';g.globalAlpha=.85;g.beginPath();g.arc(d.x+.5,d.y+6,2,0,7);g.fill();const gr=g.createRadialGradient(d.x,d.y+8,1,d.x,d.y+8,42);gr.addColorStop(0,'rgba(255,200,120,.35)');gr.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=gr;g.globalAlpha=.8+Math.sin(time*7+d.x)*.1;g.fillRect(d.x-42,d.y-34,84,84);}
  else if(d.k==='posts'){g.fillStyle='#5a3a1a';for(const x of [d.x,d.x2]){g.fillRect(x-2,d.y-12,3,12);}g.strokeStyle='#c8b080';g.lineWidth=1;g.beginPath();g.moveTo(d.x,d.y-11);g.quadraticCurveTo((d.x+d.x2)/2,d.y-4,d.x2,d.y-11);g.stroke();}
  else if(d.k==='wire'){g.strokeStyle='#777';g.lineWidth=.8;for(let x=d.x;x<d.x2;x+=12){g.beginPath();g.arc(x+6,d.y-4,4,0,7);g.stroke();}}
  else if(d.k==='spot'){g.fillStyle='#333';g.fillRect(d.x-1,d.y-40,2,40);g.fillStyle='#ddd';g.fillRect(d.x-4,d.y-44,8,5);const a=Math.sin(time*.8)*.5-1.9;g.globalAlpha=.13;g.fillStyle='#fff8c0';g.beginPath();g.moveTo(d.x,d.y-42);g.lineTo(d.x+Math.cos(a-.15)*160,d.y-42-Math.sin(a-.15)*-160);g.lineTo(d.x+Math.cos(a+.15)*160,d.y-42-Math.sin(a+.15)*-160);g.fill();}
  else if(d.k==='brazier'){g.fillStyle='#3a3030';g.fillRect(d.x-5,d.y-10,10,10);g.fillStyle='#2a2020';g.fillRect(d.x-7,d.y-12,14,3);for(let k=0;k<3;k++){g.fillStyle=['#ff4a10','#ffb02a','#fff3a0'][k];const f=Math.sin(time*12+k*2+d.x)*2;g.beginPath();g.moveTo(d.x-6+k*2,d.y-12);g.quadraticCurveTo(d.x,d.y-26+k*4+f,d.x+6-k*2,d.y-12);g.fill();}}
  else if(d.k==='pad'){g.fillStyle='#4a4a4a';g.fillRect(d.x-26,d.y-2,52,2);g.fillStyle='#ffd23a';g.font='bold 8px Arial';g.textAlign='center';g.fillText('H',d.x,d.y-3);}
  else if(d.k==='sign'){g.fillStyle='#5a3a1a';g.fillRect(d.x-1,d.y-18,2,18);g.fillStyle='#c8a060';g.fillRect(d.x-12,d.y-22,24,9);g.fillStyle='#3a2010';g.font='bold 5px Arial';g.textAlign='center';g.fillText('BRO ZONE',d.x,d.y-15.5);}
  g.restore();
 }
 function drawFlag(f,time){const top=f.y-44;g.fillStyle='#ccc';g.fillRect(f.x-.75,top,1.5,44);g.fillStyle='#ffd23a';g.beginPath();g.arc(f.x,top,1.6,0,7);g.fill();
  const wv=Math.sin(time*5+f.x)*1.2;
  if(f.up){const y=top+2;g.fillStyle='#fff';g.fillRect(f.x+1,y,18,11);g.fillStyle='#c22';for(let k=0;k<6;k+=2)g.fillRect(f.x+1,y+k*1.85,18,1.85);g.fillStyle='#22c';g.fillRect(f.x+1,y,8,6);g.fillStyle='#fff';g.fillRect(f.x+3,y+2,1,1);g.fillRect(f.x+6,y+3,1,1);}
  else{const y=f.y-16;g.fillStyle='#8a1010';g.beginPath();g.moveTo(f.x+1,y);g.lineTo(f.x+15,y+3+wv);g.lineTo(f.x+1,y+9);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(f.x+6,y+4.5,1.8,0,7);g.fill();}}
 function drawHead(id,mood,x,y,size,flip=1){const img=headCanvas(id,mood);g.save();g.translate(x,y);if(flip<0)g.scale(-1,1);g.drawImage(img,-size/2,-size/2,size,size);g.restore();}
 function drawBro(p,time){
  if(p.inv>0&&(frames>>2)%2&&p.inv<2)g.globalAlpha=.45;
  const f=p.facing,run=p.grounded&&Math.abs(p.vx)>10,ph=p.anim,air=!p.grounded&&!p.ladder;
  g.save();g.translate(p.x,p.y);g.scale(f,1);
  const col=PCOL[p.i],dark=p.i?'#7a2a52':'#1f3a7a';
  // legs
  const L=run?Math.sin(ph*1.6)*4:air?2:0;
  const leg=(off,a)=>{g.fillStyle='#3d4a2a';g.fillRect(-2+off+a*.6,-9,3.4,7);g.fillStyle='#1d1a16';g.fillRect(-2.5+off+a,-2.5,4.6,2.5);};
  if(p.ladder){leg(-1,Math.sin(ph*3)*2);leg(2,-Math.sin(ph*3)*2);}else{leg(-1,L);leg(1.5,-L);}
  // torso: vest in player colour, bandolier, belt
  g.fillStyle=col;g.fillRect(-4,-17,8,9);g.fillStyle=dark;g.fillRect(-4,-9,8,1.6);
  g.fillStyle='#6a4a22';g.save();g.translate(0,-13);g.rotate(-.7);g.fillRect(-6,-1,12,2);g.fillStyle='#e8c040';for(let k=-5;k<6;k+=2.5)g.fillRect(k,-1.4,1,1);g.restore();
  // arms + weapon
  const rc=p.recoil*1.5;
  g.fillStyle='#d9a070';
  if(p.ladder){g.fillRect(-5,-21,2,6);g.fillRect(3,-21,2,6);}else{g.fillRect(1-rc,-15,6,2.4);g.fillRect(-3-rc,-14,5,2.4);drawGun(p.weapon,6-rc,-14);}
  if(p.muzzle>0&&!p.ladder&&p.weapon!=='flame'){g.fillStyle='#fff3a0';g.beginPath();const mx=WEAPON_LEN[p.weapon]+6-rc;g.moveTo(mx,-14.5);g.lineTo(mx+7,-17);g.lineTo(mx+5,-14);g.lineTo(mx+8,-11.5);g.closePath();g.fill();}
  if(p.weapon==='flame'&&p.muzzle>0){g.fillStyle='#ffb02a';g.beginPath();g.arc(WEAPON_LEN.flame+7,-13.5,2.4,0,7);g.fill();}
  g.restore();
  // head: the character's own face, big-head style
  const bob=run?Math.abs(Math.sin(ph*1.6))*-1:0;
  drawHead(p.bro,broMood(p),p.x+f*.5,p.y-25+bob,17,1);
  g.globalAlpha=1;
  if(p.climb&&!p.grounded){g.fillStyle='rgba(255,255,255,.6)';for(let k=0;k<2;k++)g.fillRect(p.x+f*(p.w+1),p.y-8-k*7-(time*40%7),1,3);}
 }
 const WEAPON_LEN={rifle:10,shotgun:9,rocket:11,flame:9,pistols:5};
 function drawGun(w,x,y){
  if(w==='rifle'){g.fillStyle='#2a2a2a';g.fillRect(x-3,y-1.5,12,2.6);g.fillStyle='#6a4022';g.fillRect(x-6,y-1,4,3);g.fillStyle='#2a2a2a';g.fillRect(x+2,y+1,2,3);}
  else if(w==='shotgun'){g.fillStyle='#3a3a3a';g.fillRect(x-2,y-1.6,11,2);g.fillStyle='#7a4a24';g.fillRect(x-6,y-1,5,3);g.fillRect(x+2,y+.4,4,1.8);}
  else if(w==='rocket'){g.fillStyle='#4a5a2a';g.fillRect(x-8,y-3.5,19,4.6);g.fillStyle='#2a2a1a';g.fillRect(x+10,y-4,2,5.6);g.fillRect(x-1,y+1,2,3);}
  else if(w==='flame'){g.fillStyle='#8a1a1a';g.fillRect(x-12,y-6,4,9);g.fillStyle='#555';g.fillRect(x-3,y-1.5,12,2.6);g.fillStyle='#ffb02a';g.fillRect(x+8,y-1,1.5,1.5);}
  else{g.fillStyle='#bbb';g.fillRect(x-1,y-1.5,6,2);g.fillRect(x-1,y+1.5,6,2);g.fillStyle='#333';g.fillRect(x-1,y-.5,2,3);}
 }
 function drawFoe(e,time){
  const run=Math.abs(e.vx)>3,ph=e.anim;g.save();g.translate(e.x,e.y);g.scale(e.dir,1);
  if(e.flash>0)g.filter='brightness(3)';
  if(e.type==='dog'){const L=run?Math.sin(ph*2.2)*2.5:0;g.fillStyle='#1a1410';g.fillRect(-7,-9,12,5);g.fillRect(-6+L,-5,1.8,5);g.fillRect(-3-L,-5,1.8,5);g.fillRect(2+L,-5,1.8,5);g.fillRect(4-L,-5,1.8,5);
   g.fillStyle='#8a5a2a';g.fillRect(-5,-6,8,2);g.fillStyle='#1a1410';g.fillRect(4,-12,5,5);g.fillRect(8,-10,3,2.5);g.fillRect(4,-14,1.6,3);g.fillRect(-9,-10,3,1.5);g.fillStyle='#c33';g.fillRect(4,-8,4,1.2);g.fillStyle='#fd4';g.fillRect(7,-11.5,1,1);
   if(e.state==='attack'){g.fillStyle='#fff';g.fillRect(9,-8,1,1.5);}}
  else if(e.type==='bruiser'){const L=run?Math.sin(ph*1.4)*3:0;
   g.fillStyle='#2a2a2a';g.fillRect(-5+L,-11,4.5,11);g.fillRect(.5-L,-11,4.5,11);g.fillStyle='#111';g.fillRect(-6+L,-2.5,6,2.5);g.fillRect(-L,-2.5,6,2.5);
   g.fillStyle='#4a4a3a';g.fillRect(-7,-24,14,14);g.fillStyle='#2a2a22';g.fillRect(-7,-14,14,2);g.fillStyle='#c79070';g.fillRect(-9,-22,3,9);
   g.fillStyle='#c79070';g.fillRect(-4,-31,9,8);g.fillStyle='#111';g.fillRect(-1,-28.5,7,2);g.fillStyle='#8a1a1a';g.fillRect(-5,-33,10,3);g.fillRect(-6,-32,3,2);g.fillStyle='#5a3a22';g.fillRect(-1,-24.5,6,1.3);
   const spin=(time*40|0)%3;g.fillStyle='#555';g.fillRect(2,-19,8,6);g.fillStyle='#333';for(let k=0;k<3;k++)g.fillRect(10,-19+k*2+(spin===k?.5:0),9,1.3);g.fillStyle='#c79070';g.fillRect(1,-17,4,3);
   if(e.muzzle>0){g.fillStyle='#fff3a0';g.beginPath();g.arc(21,-17,3,0,7);g.fill();}}
  else{const L=run?Math.sin(ph*1.7)*3:0,bomber=e.type==='bomber',gren=e.type==='grenadier';
   g.fillStyle='#2a2418';g.fillRect(-3+L*.6,-9,3,7);g.fillRect(.5-L*.6,-9,3,7);g.fillStyle='#111';g.fillRect(-3.5+L,-2.5,4.2,2.5);g.fillRect(-L,-2.5,4.2,2.5);
   g.fillStyle=bomber?'#e8e2d0':gren?'#4a5a32':'#8a7a4a';g.fillRect(-4,-17,8,9);g.fillStyle='#3a2e1a';g.fillRect(-4,-9.5,8,1.5);
   if(bomber){g.fillStyle='#c22';for(let k=-3;k<4;k+=2)g.fillRect(k-.6,-16,1.4,6);g.fillStyle='#444';g.fillRect(-4,-14,8,1);
    if(e.state==='attack'){g.fillStyle='#ffd23a';g.beginPath();g.arc(1,-19+Math.sin(time*40),1.3,0,7);g.fill();}}
   // balaclava head
   g.fillStyle='#1a1a1a';g.beginPath();g.ellipse(.5,-21.5,4.2,4.8,0,0,7);g.fill();g.fillStyle='#c99a74';g.fillRect(-1.5,-23,5.5,2.2);g.fillStyle=e.state==='attack'||e.state==='alert'?'#c00':'#000';g.fillRect(1,-22.6,1,1.2);g.fillRect(3,-22.6,1,1.2);
   // arms & weapon
   g.fillStyle=bomber?'#c99a74':'#7a6a3a';
   if(bomber&&e.state==='attack'){g.fillRect(-4,-25,2,8);g.fillRect(2,-25,2,8);}
   else if(gren){g.fillRect(0,-16,5,2.2);g.fillStyle='#3a4a2a';g.beginPath();g.arc(6,-15,1.8,0,7);g.fill();}
   else if(!bomber){g.fillRect(0,-15.5,5,2.2);g.fillStyle='#5a3418';g.fillRect(-2,-15,4,2.4);g.fillStyle='#222';g.fillRect(2,-15.8,9,2);g.beginPath();g.moveTo(5,-14);g.quadraticCurveTo(6,-11,4,-10.5);g.lineTo(5.5,-10.5);g.quadraticCurveTo(7.5,-12,7,-14);g.fill();
    if(e.muzzle>0){g.fillStyle='#ffb02a';g.beginPath();g.arc(12.5,-15,2.4,0,7);g.fill();}}}
  g.restore();g.filter='none';
  if(e.muzzle>0)e.muzzle-=1/60;
  if(e.bubble){const y=e.y-e.h-12+Math.sin(time*12)*.8;g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.roundRect?.(e.x-4,y-6,8,9,2);g.fill();g.stroke();
   g.fillStyle=e.bubble.ch==='!'?'#d00':'#c90';g.font='bold 8px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(e.bubble.ch,e.x,y-1.3);}
 }
 function drawCorpse(cp){g.save();g.translate(cp.x,cp.y-4);g.rotate(cp.rot+(cp.vy===0?Math.PI/2*(cp.vx>=0?1:-1):0));g.globalAlpha=Math.min(1,cp.t);
  if(cp.kind==='bro'){g.fillStyle=PCOL[cp.i];g.fillRect(-4,-8,8,9);g.restore();drawHead(cp.id,'sad',cp.x,cp.y-12,14);return;}
  if(cp.kind==='dog'){g.fillStyle='#1a1410';g.fillRect(-6,-4,12,5);}else{g.fillStyle=cp.kind==='bomber'?'#e8e2d0':cp.kind==='bruiser'?'#4a4a3a':'#8a7a4a';g.fillRect(-4,-9,8,10);g.fillStyle='#1a1a1a';g.beginPath();g.arc(0,-11,3.6,0,7);g.fill();g.fillStyle='#a00';g.fillRect(-2,-4,4,2);}
  g.restore();}
 function drawCage(cg,time){
  const x=cg.x,y=cg.y;
  if(cg.open){if(cg.freeT>0){cg.freeT-=1/60;g.globalAlpha=Math.max(0,cg.freeT);g.fillStyle=cg.vip?'#ffd84a':'#fff';outlined(g,cg.vip?'★ FREE! ★':'FREE!',x,y-30-(1.2-cg.freeT)*16,{size:7,fill:cg.vip?'#ffd84a':'#fff',stroke:'#000'});g.globalAlpha=1;}
   g.strokeStyle=cg.vip?'#a07a20':'#5a3a1a';g.lineWidth=1.5;g.beginPath();g.moveTo(x-9,y);g.lineTo(x-12,y-4);g.moveTo(x+9,y);g.lineTo(x+12,y-3);g.stroke();return;}
  cg.t+=1/60;const shake=Math.sin(cg.t*20)*(Math.sin(cg.t*1.3)>.6?.8:0);
  if(cg.vip){const gr=g.createRadialGradient(x,y-12,2,x,y-12,26);gr.addColorStop(0,'rgba(255,220,90,.5)');gr.addColorStop(1,'rgba(255,220,90,0)');g.fillStyle=gr;g.fillRect(x-26,y-38,52,52);}
  // prisoner (white vest, chained) with their own face
  g.fillStyle='#ece6d8';g.fillRect(x-3.5+shake,y-14,7,8);g.fillStyle='#3a3a3a';g.fillRect(x-3+shake,y-6,6,6);
  g.fillStyle='#d9a070';const wave=Math.sin(cg.t*9)>0;g.fillRect(x-6+shake,wave?y-20:y-16,2,6);g.fillRect(x+4+shake,!wave?y-20:y-16,2,6);
  drawHead(cg.id,'sad',x+shake,y-18.5,13);
  // cage
  const frame=cg.vip?'#e0b030':'#6a4220',bar=cg.vip?'#f8dc6a':'#4a2e14';
  g.fillStyle=frame;g.fillRect(x-9,y-26,18,2.4);g.fillRect(x-9,y-1.6,18,1.6);g.fillRect(x-9,y-26,2,26);g.fillRect(x+7,y-26,2,26);
  g.fillStyle=bar;for(let k=-5;k<=5;k+=3.4)g.fillRect(x+k-.5,y-24,1.2,22.5);
  if(cg.hp<3){g.strokeStyle='#000';g.lineWidth=.6;g.beginPath();g.moveTo(x-6,y-20);g.lineTo(x-2,y-14);g.lineTo(x-4,y-8);g.stroke();}
  if(cg.vip){const by=y-36+Math.sin(cg.t*3)*1.5;outlined(g,'★ NEW BRO ★',x,by,{size:6,fill:'#ffd84a',stroke:'#3a2400'});}
  else if(Math.sin(cg.t*1.7)>.5)outlined(g,'HELP!',x,y-32,{size:6,fill:'#fff',stroke:'#000'});
 }
 function drawPickup(pk,time){g.save();g.translate(pk.x,pk.y-4+Math.sin(time*5)*.6);g.fillStyle='#3a4a2a';g.beginPath();g.ellipse(0,0,3,3.6,0,0,7);g.fill();g.fillStyle='#888';g.fillRect(-1,-5,2,2);g.fillStyle='#bdf06a';g.globalAlpha=.5+Math.sin(time*8)*.3;g.beginPath();g.arc(0,0,6,0,7);g.strokeStyle='#bdf06a';g.lineWidth=.8;g.stroke();g.restore();}
 function drawNade(n){g.save();g.translate(n.x,n.y-2);g.rotate(n.spin);g.fillStyle=n.owner==='p'?'#3a4a2a':'#2a2a2a';g.beginPath();g.ellipse(0,0,2.4,3,0,0,7);g.fill();g.fillStyle='#999';g.fillRect(-.8,-4,1.6,1.5);g.restore();
  if((n.t*8|0)%2){g.fillStyle='#f33';g.beginPath();g.arc(n.x,n.y-6,1,0,7);g.fill();}}
 function drawShot(sh){if(sh.kind==='rocket'){g.save();g.translate(sh.x,sh.y);g.scale(Math.sign(sh.vx)||1,1);g.fillStyle='#5a6a3a';g.fillRect(-5,-1.5,8,3);g.fillStyle='#c22';g.beginPath();g.moveTo(3,-1.5);g.lineTo(6,0);g.lineTo(3,1.5);g.fill();g.fillStyle='#ffb02a';g.fillRect(-7,-1,2,2);g.restore();}
  else{g.fillStyle='#ff4a10';g.beginPath();g.arc(sh.x,sh.y,3.4,0,7);g.fill();g.fillStyle='#fff3a0';g.beginPath();g.arc(sh.x,sh.y,1.6,0,7);g.fill();}}
 function drawBoss(B,time){
  if(!B.alive&&B.dead<=0)return;g.save();g.translate(B.x,B.y);g.scale(B.dir,1);
  if(!B.alive){g.globalAlpha=Math.max(0,B.dead/3);g.translate((Math.random()-.5)*3,0);}
  if(B.flash>0)g.filter='brightness(2.6)';
  const br=Math.sin(B.anim*3)*1.2,walk=Math.abs(B.vx)>5?Math.sin(B.anim*8)*4:0;
  // wings
  g.fillStyle='#4a0a0a';for(const s2 of [-1,1]){g.save();g.scale(s2*.9,1);g.beginPath();g.moveTo(-4,-44);g.lineTo(-30,-62-br*2);g.lineTo(-26,-48);g.lineTo(-34,-44);g.lineTo(-24,-38);g.lineTo(-28,-30);g.lineTo(-6,-34);g.fill();g.restore();}
  // legs (goat hooves)
  g.fillStyle='#7a1010';g.fillRect(-9+walk,-20,7,14);g.fillRect(2-walk,-20,7,14);g.fillStyle='#1a0a0a';g.fillRect(-10+walk,-6,9,6);g.fillRect(1-walk,-6,9,6);
  // torso
  g.fillStyle='#b81c1c';g.beginPath();g.moveTo(-13,-46);g.lineTo(13,-46);g.lineTo(9,-20);g.lineTo(-9,-20);g.fill();
  g.fillStyle='#8a1010';g.fillRect(-1,-44,2,22);g.fillRect(-9,-36,18,1.5);g.fillRect(-8,-30,16,1.5);
  // tail
  g.strokeStyle='#8a1010';g.lineWidth=2.5;g.beginPath();g.moveTo(-8,-22);g.quadraticCurveTo(-26,-14+br*3,-22,-34);g.stroke();g.fillStyle='#8a1010';g.beginPath();g.moveTo(-22,-38);g.lineTo(-19,-33);g.lineTo(-25,-33);g.fill();
  // arms + pitchfork
  g.fillStyle='#b81c1c';g.fillRect(-17,-44,5,16);g.fillRect(11,-44,5,14);g.fillStyle='#3a2a2a';g.fillRect(14,-60,2.2,46);g.fillStyle='#888';g.fillRect(9,-62,12,2);g.fillRect(9,-68,2,6);g.fillRect(14,-70,2,8);g.fillRect(19,-68,2,6);
  // head: horns, glowing eyes, grin
  g.fillStyle='#b81c1c';g.beginPath();g.ellipse(1,-54,9,9,0,0,7);g.fill();g.fillStyle='#e8d8b0';g.beginPath();g.moveTo(-6,-60);g.quadraticCurveTo(-14,-66,-10,-76);g.quadraticCurveTo(-8,-66,-2,-62);g.fill();g.beginPath();g.moveTo(6,-61);g.quadraticCurveTo(12,-68,9,-77);g.quadraticCurveTo(14,-67,8,-58);g.fill();
  g.fillStyle='#ffe23a';g.shadowColor='#ff0';g.shadowBlur=6;g.fillRect(-2,-57,4,2.2);g.fillRect(4,-57,4,2.2);g.shadowBlur=0;g.fillStyle='#200';g.fillRect(-1,-50,9,2);g.fillStyle='#fff';g.fillRect(0,-50,1,1.4);g.fillRect(6,-50,1,1.4);
  g.fillStyle='#3a0606';g.beginPath();g.moveTo(-1,-47);g.lineTo(3,-41);g.lineTo(7,-47);g.fill();
  g.restore();g.filter='none';
 }
 function drawHeli(H,time){
  if(H.state==='away')return;g.save();g.translate(H.x,H.y);const tilt=H.state==='leave'?-.12:Math.sin(time*1.5)*.03;g.rotate(tilt);
  // rope ladder
  if(H.state!=='leave'||H.t<.6){g.strokeStyle='#c8b080';g.lineWidth=1;g.beginPath();g.moveTo(-12,10);g.lineTo(-12,5.5*T);g.moveTo(-4,10);g.lineTo(-4,5.5*T);g.stroke();for(let y=16;y<5.5*T;y+=7){g.beginPath();g.moveTo(-12,y);g.lineTo(-4,y);g.stroke();}}
  if(P.boarded&&(H.state==='leave'||net)){drawHead(P.bro,'win',-8,2,13);}
  if(net&&partnerHere()&&R.boarded)drawHead(R.bro,'win',P.boarded?4:-8,2,13);
  g.fillStyle='#3e4e2a';g.beginPath();g.ellipse(0,0,22,11,0,0,7);g.fill();g.fillRect(14,-5,34,6);g.fillStyle='#2e3a1e';g.fillRect(44,-12,4,14);
  g.fillStyle='#9fd0e8';g.beginPath();g.ellipse(-12,-2,9,7,0,Math.PI*.9,Math.PI*1.95);g.fill();g.fillStyle='#2a2a1a';g.fillRect(-16,9,30,2);g.fillRect(-12,7,2,4);g.fillRect(8,7,2,4);
  g.fillStyle='#fff';g.font='bold 5px Arial';g.textAlign='center';g.fillText('★',4,2);
  g.fillStyle='#222';g.fillRect(-1,-14,2,4);const rw=40*Math.abs(Math.cos(time*30));g.fillStyle='rgba(30,30,30,.7)';g.fillRect(-rw,-15,rw*2,1.6);g.fillRect(46-6*Math.abs(Math.sin(time*40)),-10,12*Math.abs(Math.sin(time*40)),1.4);
  g.restore();
  if(H.state==='hover'&&!P.boarded&&(stageIdx<2||!W.boss?.alive)&&(frames>>4)%2)outlined(g,'▼ GRAB THE LADDER',H.x-8,H.y+5.5*T+12,{size:6,fill:'#ffe23a',stroke:'#000'});
 }

 // ---------------------------------------------------------------- HUD
 function drawHUD(time){
  const u=clamp(Math.min(s.W/700,s.H/390),.62,1.5),size=Math.round(14*u),m=8*u;
  // top-left: player head, name, score, lives, grenades (online: below the duel chip)
  g.save();if(net)g.translate(0,38);g.fillStyle='rgba(10,12,8,.55)';g.beginPath();g.roundRect?.(m,m,214*u,52*u,10*u);g.fill();
  drawHeadScreen(P.bro,P.boarded?'win':broMood(P),m+24*u,m+26*u,40*u);
  outlined(g,s.players[P.i].name.toUpperCase().slice(0,10),m+50*u,m+14*u,{size:Math.round(11*u),fill:PCOL[P.i],stroke:'#000',align:'left'});
  outlined(g,P.score.toLocaleString(),m+50*u,m+31*u,{size:Math.round(17*u),fill:'#fff',stroke:'#000',align:'left'});
  outlined(g,`BROS ×${P.lives+(P.dead?0:1)}  💣${P.grenades}  ${'♥'.repeat(Math.max(0,P.hp))}`,m+50*u,m+46*u,{size:Math.round(9.5*u),fill:'#ffd0a0',stroke:'#000',align:'left'});
  // top-centre: stage + clock
  const left=Math.max(0,TURN_TIME-clock);
  outlined(g,`STAGE ${stageIdx+1}/3 · ${theme.stages[stageIdx]}`,s.W/2,m+10*u,{size:Math.round(10*u),fill:'#fff',stroke:'#000'});
  outlined(g,fmt(left),s.W/2,m+27*u,{size:Math.round(15*u),fill:left<30&&(frames>>4)%2?'#ff5a3a':'#ffe23a',stroke:'#000'});
  // progress strip
  const bw=Math.min(s.W*.3,180*u),bx=s.W/2-bw/2,by=m+42*u;g.fillStyle='rgba(0,0,0,.45)';g.fillRect(bx,by,bw,4*u);
  g.fillStyle=PCOL[P.i];g.fillRect(bx,by,bw*clamp(P.x/(W.W*T),0,1),4*u);
  for(const cg of W.cages){g.fillStyle=cg.open?'#555':cg.vip?'#ffd84a':'#9cf';g.fillRect(bx+bw*cg.x/(W.W*T)-1.5*u,by-2*u,3*u,8*u);}
  // online: the partner's line, the edge arrow, the chopper countdown and what this bro is waiting for
  const rt=52;
  if(net&&R){outlined(g,`${s.players[them].name.toUpperCase().slice(0,9)}: ${R.score.toLocaleString()}${R.out?' · OUT':` · BROS ×${R.lives+(R.dead?0:1)}`}`,s.W-m,rt+12*u,{size:Math.round(10*u),fill:PCOL[them],stroke:'#000',align:'right'});
   if(partnerHere()&&!R.boarded&&!R.out&&!P.out){const sx=(R.x-cam.x)*Z,sy=(R.y-12-cam.y)*Z;partnerArrow(s,g,{x:0,y:-38,w:s.W,h:s.H},sx,sy-38,{player:them,color:PCOL[them],label:`${Math.round(Math.abs(R.x-P.x)/T)} m`,size:Math.round(16*u),top:62*u});}
   const H=W.heli,first=Math.min(P.boarded&&W.boardT!=null?W.boardT:Infinity,W.rBoardT??Infinity);
   if(phase==='play'&&H.state==='hover'&&first<Infinity){const left=Math.max(0,Math.ceil(first+NET_GRACE-clock));outlined(g,P.boarded?`WAITING FOR ${s.players[them].name.toUpperCase()} · ${left}`:`${s.players[them].name.toUpperCase()} IS AT THE CHOPPER · ${left}`,s.W/2,s.H*.24,{size:Math.round(13*u),fill:left<=3?'#ff5a3a':'#ffe23a',stroke:'#000'});}
   if(phase==='net-wait'||phase==='net-end')outlined(g,`WAITING FOR ${s.players[them].name.toUpperCase()}…`,s.W/2,s.H*.24,{size:Math.round(14*u),fill:'#ffe23a',stroke:'#000'});
   else if(P.out&&phase==='play')outlined(g,`OUT OF BROS · WATCHING ${s.players[them].name.toUpperCase()}`,s.W/2,s.H*.24,{size:Math.round(12*u),fill:'#fff',stroke:'#000'});}
  if(turn===1&&results[0]&&!net)outlined(g,`BEAT ${s.players[0].name.toUpperCase().slice(0,9)}: ${results[0].score.toLocaleString()}`,s.W-m,rt+12*u,{size:Math.round(10*u),fill:PCOL[0],stroke:'#000',align:'right'});
  if(s.broforceRecruits[P.i].length)outlined(g,`★ ${s.broforceRecruits[P.i].length} NEW RECRUIT${s.broforceRecruits[P.i].length>1?'S':''}`,s.W-m,rt+(turn===1||net?28:12)*u,{size:Math.round(10*u),fill:'#ffd84a',stroke:'#3a2400',align:'right'});
  // boss bar
  const B=W.boss;if(B&&B.alive&&B.state!=='wait'){const w=Math.min(s.W*.6,420*u),x=s.W/2-w/2,y=s.H-(touchUI?118:40)*u;g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x-3,y-3,w+6,14*u+6);g.fillStyle='#4a0a0a';g.fillRect(x,y,w,14*u);g.fillStyle='#e8281a';g.fillRect(x,y,w*B.hp/B.max,14*u);outlined(g,'THE DEVIL',s.W/2,y+7*u,{size:Math.round(9*u),fill:'#fff',stroke:'#000'});}
  // banners
  if(banner&&banner.t>0){const a=Math.min(1,banner.t*2.5),sz=Math.min(s.W*.075,s.H*.1,48);g.globalAlpha=a;g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,s.H*.33,s.W,sz*2.2);
   if(banner.gold&&banner.id)drawHeadScreen(banner.id,'win',s.W/2,s.H*.33-sz*.7,sz*1.6);
   outlined(g,banner.big,s.W/2,s.H*.33+sz*.72,{size:sz,fill:banner.gold?'#ffd84a':'#fff',stroke:'#000'});outlined(g,banner.small,s.W/2,s.H*.33+sz*1.6,{size:Math.round(sz*.38),fill:'#ffe23a',stroke:'#000'});g.globalAlpha=1;}
  // touch guides
  if(touchUI||clock<7){const a=touchUI?1:clamp(1-clock/7,0,1);g.globalAlpha=a;
   if(pad.stick){const f=pad.stick;g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.beginPath();g.arc(f.sx,f.sy,44,0,7);g.stroke();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(clamp(f.x,f.sx-48,f.sx+48),clamp(f.y,f.sy-48,f.sy+48),17,0,7);g.fill();}
   else{const sx=s.W*.15,sy=s.H*.8,r=Math.min(s.H*.12,44);g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=2;g.beginPath();g.arc(sx,sy,r,0,7);g.stroke();outlined(g,'◀ RUN ▶',sx,sy,{size:Math.round(10*u),fill:'rgba(255,255,255,.75)',stroke:'#000'});outlined(g,'↑ JUMP',sx,sy-r-8*u,{size:Math.round(8*u),fill:'rgba(255,255,255,.6)',stroke:'#000'});}
   const fx2=s.W*.82,fy=s.H*.78,fr=Math.min(s.H*.13,50);g.fillStyle=pad.fire.size?'rgba(255,90,40,.35)':'rgba(255,255,255,.12)';g.beginPath();g.arc(fx2,fy,fr,0,7);g.fill();
   outlined(g,'HOLD · FIRE',fx2,fy,{size:Math.round(10*u),fill:'rgba(255,255,255,.85)',stroke:'#000'});outlined(g,'↑ jump',fx2,fy-fr-7*u,{size:Math.round(8*u),fill:'rgba(255,255,255,.6)',stroke:'#000'});outlined(g,'↓ grenade',fx2,fy+fr+7*u,{size:Math.round(8*u),fill:'rgba(255,255,255,.6)',stroke:'#000'});
   g.globalAlpha=1;}
  g.restore();
 }
 function drawHeadScreen(id,mood,x,y,size){const img=headCanvas(id,mood);g.drawImage(img,x-size/2,y-size/2,size,size);}
 function drawTitle(t){
  const a=t>2.3?Math.max(0,1-(t-2.3)/.45):1,sz=Math.min(s.W*.11,s.H*.13,72);g.save();g.globalAlpha=a;
  const bg=g.createLinearGradient(0,0,0,s.H);bg.addColorStop(0,'#1a0d06');bg.addColorStop(1,'#5a1a0a');g.fillStyle=bg;g.fillRect(0,0,s.W,s.H);
  g.fillStyle='rgba(255,140,40,.12)';for(let k=0;k<12;k++){g.beginPath();g.moveTo(s.W/2,s.H*.32);g.lineTo(s.W/2+Math.cos(k*.52+t*.2)*s.W,s.H*.32+Math.sin(k*.52+t*.2)*s.W);g.lineTo(s.W/2+Math.cos(k*.52+.2+t*.2)*s.W,s.H*.32+Math.sin(k*.52+.2+t*.2)*s.W);g.fill();}
  outlined(g,'BROFORCE',s.W/2,s.H*.27,{size:sz,fill:'#fff',stroke:'#8a0a0a',lw:sz*.16});
  outlined(g,theme.op,s.W/2,s.H*.27+sz*.75,{size:Math.round(sz*.3),fill:'#ffd23a',stroke:'#000'});
  for(let i=0;i<2;i++){const cx=s.W/2+(i?1:-1)*Math.min(s.W*.2,150),cy=s.H*.6;drawHeadScreen(s.players[i].character,'win',cx,cy,sz*1.3);outlined(g,s.players[i].name.toUpperCase().slice(0,12),cx,cy+sz*.9,{size:Math.round(sz*.3),fill:PCOL[i],stroke:'#000'});}
  outlined(g,net?'&':'VS',s.W/2,s.H*.6,{size:Math.round(sz*.45),fill:'#fff',stroke:'#000'});
  outlined(g,net?'3 STAGES · CO-OP · HIGHEST SCORE WINS':'3 STAGES · TAKE TURNS · HIGHEST SCORE WINS',s.W/2,s.H*.82,{size:Math.round(Math.min(sz*.26,s.W*.032)),fill:'#fff',stroke:'#000'});
  outlined(g,'★ FREE THE GOLD CAGES TO UNLOCK NEW CHARACTERS ★',s.W/2,s.H*.82+sz*.4,{size:Math.round(Math.min(sz*.24,s.W*.03)),fill:'#ffd84a',stroke:'#000'});
  if(s.H>s.W)outlined(g,'↻ turn the phone sideways for a wider view',s.W/2,s.H*.93,{size:Math.round(s.W*.035),fill:'#9cf',stroke:'#000'});
  g.restore();
 }

 // ---------------------------------------------------------------- debug hooks for tests
 s.debug={engine:'broforce',get phase(){return phase;},get turn(){return turn;},get stage(){return stageIdx;},get P(){return P;},get W(){return W;},STAGES,results,get clock(){return clock;},
  setClock(v){clock=v;},teleport(x,y){if(!P)return;P.x=x;P.y=y??W.S.surfAt(Math.floor(x/T))*T;P.vx=P.vy=0;updateCamera(0,true);},
  killAll(){for(const e of W.foes)if(e.alive)killFoe(e,P.x,false);},killBoss(){if(W.boss){W.boss.state='walk';hitBoss(999,P.x);}},
  freeCage(k){const cg=W.cages[k];if(cg)openCage(cg);},board(){W.heli.state='hover';W.heli.y=W.exit.y-6.5*T;Object.assign(P,{x:W.heli.x-8,y:W.exit.y,dead:0,hp:2,inv:2});},
  hurt(){hurtPlayer(2,P.x+1);},mood(){return broMood(P);},head(id){return headCanvas(id);},renderFrom(url){return new Promise(r=>{const i=new Image();i.onload=()=>r(renderHead(i));i.onerror=()=>r(null);i.src=url;});},ids(){return require('src/characters.js').CHARACTERS.map(ch=>ch.id);},portrait(id){const u=require('src/assets.js').portraitURL(id,'normal');return String(u).slice(0,300);},get recruits(){return s.broforceRecruits;}};

 // ---------------------------------------------------------------- main loop
 let flushT=0;
 // online test bot: runs right firing, jumps when blocked, a grenade now and then
 if(net)s.debug.bot=()=>{if(!bot){bot={t:0,stuck:0};return 'drive';}return '';};
 computeZoom();
 s.frame((dt,time)=>{
  if(!s.alive)return;computeZoom();
  if(phase==='title'){titleT+=dt;g.fillStyle='#000';g.fillRect(0,0,s.W,s.H);drawTitle(titleT);if(titleT>2.75&&phase==='title')beginTurn(net?me:0);return;}
  if(!P||!W){g.fillStyle='#000';g.fillRect(0,0,s.W,s.H);return;}
  if(net&&netStarted){stepRemote(dt);flushT-=dt;if(flushT<=0){flushT=.05;netFlush();}nf.tick(dt);}
  if(phase==='count'||phase==='play')music();
  if(phase==='count'){updateCamera(dt);if(!cd.update(dt)){phase='play';clearInput();}}
  else if(['play','turn-end','end','net-wait','net-end'].includes(phase)){
   if(!cd.done)cd.update(dt);acc+=dt;let steps=0;
   while(acc>=STEP&&steps<4){acc-=STEP;steps++;frames++;simT+=STEP;
    if(phase==='play'){clock+=STEP;stageT+=STEP;readInput();updatePlayer(STEP);P.comboT=Math.max(0,P.comboT-STEP);if(P.comboT<=0)P.combo=0;
     // online the enemies live on player 1's phone (woken near either bro); the other phone shows them
     const vw=viewW();if(net&&!host)stepNetFoes(STEP);
     else for(const e of W.foes){if(!e.alive)continue;if(!e.active&&(Math.abs(e.x-(cam.x+vw/2))<vw*.5+90||partnerHere()&&Math.abs(e.x-R.x)<vw*.5+90))e.active=true;if(e.active)updateFoe(e,STEP);}
     updateBoss(STEP);stepBullets(STEP);updateStage(STEP);
     if(clock>=TURN_TIME&&phase==='play'){banner={big:'TIME UP',small:'',t:2};endTurn('time');}}
    else{stepBullets(STEP);const H=W.heli;if(H.state==='leave'){H.t+=STEP;H.y-=STEP*(40+H.t*90);H.x+=STEP*(30+H.t*120);}}
    updateCamera(STEP);
   }
   if(steps===4)acc=0;
   s.setScores(s.solo?[soloTotal+(phase==='turn-end'||phase==='play'?P.score:0),0]:net?[me?R.score:P.score,me?P.score:R.score]:[turn===0?P.score:results[0]?.score||0,turn===1?P.score:0]);
   if(phase==='turn-end'){endT+=dt;if(endT>3){if(s.solo){phase='handoff';soloAfter();return;}beginTurn(1);}}
   else if(phase==='end'){endT+=dt;if(endT>3.6){
    const a=results[0],b=results[1],n=s.players.map(p=>p.name);
    const recruited=[a,b].map((r,i)=>r.recruits.length?` ${n[i]} freed ${r.recruits.map(nameOf).join(', ')}.`:'').join('');
    s.finish([a.score,b.score],`Broforce ${theme.name}: ${n[0]} ${a.score.toLocaleString()} (${a.kills} kills, ${a.stages}/3 stages) vs ${n[1]} ${b.score.toLocaleString()} (${b.kills} kills, ${b.stages}/3 stages).${recruited}`);return;}}
  }
  fx.update(dt);if(banner)banner.t-=dt;
  // draw
  drawWorld(time);
  drawHUD(time);
  if(phase==='count'||!cd.done&&phase==='play')cd.draw(g,s.W,s.H);
  if(phase==='turn-end'||phase==='end'){const a=Math.min(1,endT*2.5),sz=Math.min(s.W*.07,s.H*.08,44);g.save();g.globalAlpha=a;g.fillStyle='rgba(0,0,0,.7)';g.fillRect(0,s.H*.3,s.W,s.H*.4);
   if(phase==='turn-end'){const r=results[0];outlined(g,r.why==='done'?'MISSION ACCOMPLISHED':r.why==='time'?'TIME UP':'OUT OF BROS',s.W/2,s.H*.4,{size:sz,fill:'#ffe23a',stroke:'#000'});
    outlined(g,`${s.players[0].name.toUpperCase()}: ${r.score.toLocaleString()} POINTS`,s.W/2,s.H*.5,{size:Math.round(sz*.55),fill:'#fff',stroke:'#000'});
    outlined(g,`${r.kills} KILLS · ${r.rescues} FREED · ${r.stages}/3 STAGES${r.recruits.length?` · ★ ${r.recruits.length} NEW`:''}`,s.W/2,s.H*.58,{size:Math.round(sz*.38),fill:'#ffd0a0',stroke:'#000'});}
   else{const t2=winner===-2?'DEAD HEAT!':`${s.players[winner].name.toUpperCase()} WINS!`;outlined(g,t2,s.W/2,s.H*.42,{size:sz,fill:'#ffe23a',stroke:'#000'});
    outlined(g,`${results[0].score.toLocaleString()}  ·  ${results[1].score.toLocaleString()}`,s.W/2,s.H*.55,{size:Math.round(sz*.6),fill:'#fff',stroke:'#000'});}
   g.restore();}
 });
}

// ------------------------------------------------------------------ tile art (16×16 canvases per theme)
function makeTileArt(th){
 const mk=(fn)=>{const c=document.createElement('canvas');c.width=c.height=T;const x=c.getContext('2d');fn(x);return c;};
 const r=mulberry(hash(th.name));
 const speck=(x,cols,n,sz=1)=>{for(let k=0;k<n;k++){x.fillStyle=cols[Math.floor(r()*cols.length)];x.fillRect(Math.floor(r()*T),Math.floor(r()*T),sz,sz);}};
 const t=[];
 t[DIRT]=[0,1,2].map(v=>mk(x=>{x.fillStyle=th.dirt[0];x.fillRect(0,0,T,T);speck(x,th.dirt,26,2);speck(x,['rgba(0,0,0,.25)'],6,1);if(v===1){x.fillStyle=th.rock[1];x.fillRect(4,6,4,3);x.fillStyle=th.rock[0];x.fillRect(4,6,3,2);}if(v===2){x.fillStyle='rgba(255,255,255,.12)';x.fillRect(9,3,3,2);}}));
 t[ROCK]=[0,1].map(()=>mk(x=>{x.fillStyle=th.rock[1];x.fillRect(0,0,T,T);x.fillStyle=th.rock[0];x.fillRect(1,1,7,6);x.fillRect(9,2,6,5);x.fillRect(2,9,5,6);x.fillRect(8,8,7,7);speck(x,['rgba(0,0,0,.2)','rgba(255,255,255,.12)'],10);}));
 t[BRICK]=[0,1].map(v=>mk(x=>{x.fillStyle=th.brick[1];x.fillRect(0,0,T,T);x.fillStyle=th.brick[0];for(let row=0;row<4;row++){const off=row%2?4:0;for(let k=-1;k<3;k++)x.fillRect(k*8+off+.5,row*4+.5,7,3);}speck(x,['rgba(0,0,0,.18)'],8);if(v)x.fillStyle='rgba(0,0,0,.08)',x.fillRect(0,0,T,T);}));
 t[STEEL]=[mk(x=>{x.fillStyle='#5a5e66';x.fillRect(0,0,T,T);x.fillStyle='#767b84';x.fillRect(1,1,14,14);x.fillStyle='#4a4e56';x.fillRect(1,14,14,1);x.fillRect(14,1,1,14);x.fillStyle='#9aa0a8';for(const [a,b] of [[3,3],[12,3],[3,12],[12,12]])x.fillRect(a,b,1.5,1.5);})];
 t[WOOD]=[0,1].map(()=>mk(x=>{x.fillStyle='#5a3a1a';x.fillRect(0,0,T,T);x.fillStyle=th.wood;for(let k=0;k<4;k++)x.fillRect(0,k*4+.5,T,3);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(Math.floor(r()*12),1,4,1);x.fillStyle='#ccc';x.fillRect(2,2,1,1);x.fillRect(13,6,1,1);}));
 t[CRATE]=[mk(x=>{x.fillStyle='#7a5226';x.fillRect(0,0,T,T);x.fillStyle='#b0803e';x.fillRect(1,1,14,14);x.strokeStyle='#7a5226';x.lineWidth=2;x.beginPath();x.moveTo(2,2);x.lineTo(14,14);x.moveTo(14,2);x.lineTo(2,14);x.stroke();x.strokeStyle='#5a3a16';x.lineWidth=1;x.strokeRect(1.5,1.5,13,13);})];
 t[BAGS]=[mk(x=>{x.fillStyle='rgba(0,0,0,0)';for(const [a,b] of [[0,9],[8,9],[4,3]]){x.fillStyle='#8f8058';x.beginPath();x.ellipse(a+4,b+3.5,4.2,3.4,0,0,7);x.fill();x.fillStyle='#b8a77a';x.beginPath();x.ellipse(a+4,b+2.8,3.6,2.6,0,0,7);x.fill();}})];
 t[BARREL]=[mk(x=>{x.fillStyle='#8a1a12';x.fillRect(2,0,12,T);x.fillStyle='#c8281c';x.fillRect(3,0,10,T);x.fillStyle='#e8584a';x.fillRect(4,1,2,14);x.fillStyle='#2a2a2a';x.fillRect(2,3,12,1.5);x.fillRect(2,11,12,1.5);x.fillStyle='#ffd23a';x.beginPath();x.moveTo(8,5);x.lineTo(11,10);x.lineTo(5,10);x.fill();x.fillStyle='#000';x.fillRect(7.5,6.5,1,2);})];
 t[LADDER]=[mk(x=>{x.fillStyle='#6a4a22';x.fillRect(3,0,2,T);x.fillRect(11,0,2,T);x.fillStyle='#9a6a34';for(let k=2;k<T;k+=5)x.fillRect(3,k,10,1.6);})];
 t[PLAT]=[mk(x=>{x.fillStyle='#5a3a1a';x.fillRect(0,0,T,5);x.fillStyle=th.wood;x.fillRect(0,0,T,3.5);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(7,0,1,3.5);x.fillStyle='#4a2e14';x.fillRect(2,5,1.5,4);x.fillRect(12,5,1.5,4);})];
 const top=[0,1,2].map(v=>{const c=document.createElement('canvas');c.width=T;c.height=9;const x=c.getContext('2d');x.fillStyle=th.topDark;x.fillRect(0,3,T,4);x.fillStyle=th.top;x.fillRect(0,2,T,3);
  for(let k=0;k<6;k++){const bx=Math.floor(r()*T);x.fillRect(bx,th.decor==='jungle'?0:1,1,3);}if(th.decor!=='jungle'){x.fillStyle='rgba(255,255,255,.15)';x.fillRect(0,2,T,1);}return c;});
 const back=[null,[0,1,2].map(()=>mk(x=>{x.fillStyle=th.cave;x.fillRect(0,0,T,T);speck(x,['rgba(255,255,255,.05)','rgba(0,0,0,.3)'],12,2);})),
  [0,1,2].map(v=>mk(x=>{x.fillStyle=th.interior;x.fillRect(0,0,T,T);x.fillStyle='rgba(0,0,0,.25)';for(let row=0;row<4;row++){const off=row%2?4:0;for(let k=-1;k<3;k++)x.fillRect(k*8+off,row*4,1,4);x.fillRect(0,row*4,T,1);}if(v===2){x.fillStyle='rgba(255,220,140,.08)';x.fillRect(0,0,T,T);}})),
  [0,1,2].map(()=>mk(x=>{x.fillStyle='#3a2a18';x.fillRect(0,0,T,T);x.fillStyle='#4a3620';x.fillRect(0,0,7,T);x.fillRect(8,0,7,T);x.fillStyle='rgba(0,0,0,.3)';x.fillRect(7,0,1,T);}))];
 const crack=[.5,1].map(k=>mk(x=>{x.strokeStyle=`rgba(0,0,0,${.35+k*.25})`;x.lineWidth=1;x.beginPath();x.moveTo(3,2);x.lineTo(7,7);x.lineTo(5,12);if(k>.6){x.moveTo(7,7);x.lineTo(13,9);x.lineTo(12,14);x.moveTo(10,2);x.lineTo(8,6);}x.stroke();}));
 return {t,top,back,crack};
}

Object.assign(exports,{broforce,buildStage,weaponFor,headCanvas});
