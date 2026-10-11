// BF-32: original, stateless world-space devil + "Mothwing Liftern" extraction art.
// CONTRACT: ctx starts in screen/canvas pixels (DPR, if any, is caller-owned),
// WITHOUT an existing world-camera transform. This painter applies exactly one
// translate(-camera.x*zoom,-camera.y*zoom) + scale(zoom,zoom).
// Devil x/y are physics TOP-LEFT; extraction.zone x/y and helicopter x/y are
// world anchors from BF-21. Render layers: ground cues/shadows -> rear rig ->
// body and portrait -> front rig/fx. No draw mutates state or owns gameplay.
// drawPortrait(ctx, characterId, x, y, width, height) should draw a ready LOCAL
// portrait and return true; false/throw selects an offline pixel-face fallback.
const CIN_TAU = Math.PI * 2;
const CIN_GOLD = '#f6d68b';
const CIN_TEAL = '#6dd5c5';
const CIN_DANGER = '#ff946b';
const cinF = (v, alt=0) => Number.isFinite(v) ? v : alt;
const cinClamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));
const cinRect = (g,c,x,y,w,h) => {g.fillStyle=c;g.fillRect(x,y,w,h);};
function cinPoly(g,c,points){
  g.fillStyle=c;g.beginPath();g.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
  g.closePath();g.fill();
}
function cinLine(g,c,w,...p){
  g.strokeStyle=c;g.lineWidth=w;g.lineCap='square';g.beginPath();g.moveTo(p[0],p[1]);
  for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.stroke();
}
function cinOval(g,c,x,y,rx,ry){
  g.fillStyle=c;g.beginPath();g.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,CIN_TAU);g.fill();
}
function cinRing(g,c,x,y,r,w=1){
  g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.arc(x,y,Math.max(0,r),0,CIN_TAU);g.stroke();
}
function cinSpark(g,x,y,index,time,motion,size=1){
  const a=(index*2.399963 + (motion?time*.6:0)),r=8+(index%5)*7;
  const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.7;
  cinRect(g,index%3?'#f4ab61':'#fff0bc',Math.round(px),Math.round(py),size,size);
}
function cinHead(g,characterId,drawPortrait){
  const x=-14,y=-63,size=28;
  cinRect(g,'#101a28',-17,-66,34,35);
  cinRect(g,'#b3a46e',-15,-65,30,31);
  // Pixel-chamfer mask keeps both photographic and fallback heads on the rig.
  let drawn=false;
  if(typeof drawPortrait==='function' && typeof characterId==='string' && characterId){
    g.save();
    try{
      g.beginPath();g.moveTo(-11,y);g.lineTo(11,y);g.lineTo(14,y+4);
      g.lineTo(14,y+24);g.lineTo(10,y+28);g.lineTo(-11,y+28);
      g.lineTo(-14,y+24);g.lineTo(-14,y+4);g.closePath();g.clip();
      drawn=drawPortrait(g,characterId,x,y,size,size)===true;
    }catch(_ignored){drawn=false;}finally{g.restore();}
  }
  if(!drawn){
    // Frame-compatible, expressive offline face (no hardcoded devil identity).
    cinRect(g,'#6a4b53',x,y,size,size);
    cinRect(g,'#dbab85',-12,-60,24,23);
    cinRect(g,'#f4d0a0',-10,-58,7,14);
    cinRect(g,'#463240',-12,-62,24,6);
    cinRect(g,'#eaf4dd',-8,-48,5,3);cinRect(g,'#eaf4dd',3,-48,5,3);
    cinRect(g,'#1c2535',-6,-48,2,3);cinRect(g,'#1c2535',5,-48,2,3);
    cinRect(g,'#8e4d4b',-4,-40,9,2);
    const initials=characterId.split(/[-_\s]+/).filter(Boolean).slice(0,2)
      .map(s=>s[0].toUpperCase()).join('').slice(0,2) || '?';
    g.font='bold 7px monospace';g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#fff2c9';g.fillText(initials,0,-34);
  }
  // Chrome cheek rails never obscure the central facial area.
  cinRect(g,'#101a28',-18,-62,3,22);cinRect(g,'#101a28',15,-62,3,22);
  cinRect(g,CIN_GOLD,-17,-66,34,2);
  cinRect(g,'#d8a768',-17,-40,4,5);cinRect(g,'#d8a768',13,-40,4,5);
}
function cinTelegraph(g,devil,time,reduced){
  const t=devil.telegraph;
  if(!t||!Number.isFinite(t.targetX)||!Number.isFinite(t.targetY))return;
  const remaining=cinClamp(cinF(t.remaining,cinF(t.duration,1)),0,60);
  const duration=Math.max(.01,cinF(t.duration,1));
  const progress=cinClamp(1-remaining/duration,0,1);
  const x=t.targetX,y=t.targetY,kind=t.attack||devil.attack||'fan';
  const flashing=!reduced && Math.floor(time*7)%2===0;
  g.save();
  g.globalAlpha=flashing?.93:.76;
  if(kind==='fan'){
    cinLine(g,'#ffad7a',1.5,devil.x+devil.w/2,devil.y+devil.h*.38,x,y);
    cinRing(g,'#ffe2a3',x,y,5+(1-progress)*13,2);
    cinLine(g,CIN_GOLD,2,x-9,y,x-4,y);cinLine(g,CIN_GOLD,2,x+4,y,x+9,y);
  }else if(kind==='quake'){
    const r=cinClamp(cinF(t.radius,35),10,85);
    cinOval(g,'rgba(255,104,76,.18)',x,y+12,r,8);
    cinOval(g,'rgba(255,223,145,.25)',x,y+12,r*progress,5);
    cinLine(g,'#ffbd85',2,x-r,y+12,x+r,y+12);
    for(let i=-2;i<=2;i++)cinRect(g,CIN_GOLD,x+i*r/3-2,y+8,4,4);
  }else{
    const r=cinClamp(cinF(t.radius,39),10,85);
    cinRing(g,'#ff956d',x,y,r,2);
    cinRing(g,CIN_GOLD,x,y,Math.max(4,r*(1-progress)),2.5);
    cinLine(g,CIN_GOLD,2,x-7,y,x+7,y);cinLine(g,CIN_GOLD,2,x,y-7,x,y+7);
  }
  g.restore();
}
function cinDevil(g,d,time,portrait,quality,reduced){
  if(!d||!Number.isFinite(d.x)||!Number.isFinite(d.y)||d.mode==='dead')return;
  const w=cinClamp(cinF(d.w,58),1,512),h=cinClamp(cinF(d.h,72),1,512);
  const phase=cinClamp(Math.floor(cinF(d.phase,1)),1,3);
  const dying=d.mode==='dying',intro=d.mode==='intro',hit=cinF(d.flash)>0;
  const fan=d.attack==='fan',quake=d.attack==='quake',dive=d.attack==='dive';
  const now=reduced?0:time;
  const core=phase===1?'#8e6e96':phase===2?'#4caba8':'#d87455';
  const glow=phase===1?'#e0b4f8':phase===2?'#94f1e6':'#ffdf86';
  g.save();
  try{
    g.translate(d.x+w/2,d.y+h);g.scale(w/58,h/72);
    const bob=reduced?0:intro?0:Math.sin(now*3.5)*.85;
    cinOval(g,'rgba(5,12,24,.48)',0,1,30,4);
    // BACK LAYER: electrically lit wings, asymmetrical artillery pylons.
    if(intro){
      cinOval(g,'rgba(242,151,89,.18)',0,-38,44,38);
      for(let i=0;i<8;i++){
        const a=i*CIN_TAU/8;
        cinLine(g,'rgba(255,193,116,.42)',2,Math.cos(a)*36, -39+Math.sin(a)*32,
          Math.cos(a)*48,-39+Math.sin(a)*43);
      }
    }
    cinPoly(g,'#111e2c',[-14,-56,-31,-66,-27,-35,-18,-21,-10,-29]);
    cinPoly(g,core,[-17,-52,-29,-61,-26,-42,-17,-30]);
    cinPoly(g,'#111e2c',[14,-56,31,-65,26,-34,16,-21,9,-30]);
    cinPoly(g,core,[18,-52,28,-60,25,-42,17,-31]);
    if(phase>=2){
      cinPoly(g,'#d2b674',[-19,-56,-34,-73,-27,-43]);
      cinPoly(g,'#d2b674',[19,-56,34,-73,27,-43]);
    }
    if(phase===3){
      cinPoly(g,'#ff9156',[-20,-48,-34,-29,-23,-33]);
      cinPoly(g,'#ff9156',[20,-48,34,-29,23,-33]);
    }
    if(dive){
      cinLine(g,'#d7a25d',3,-23,-42,-36,-14);
      cinLine(g,'#d7a25d',3,23,-42,36,-14);
    }
    g.translate(0,bob);
    // REAR MECHANICAL LEGS and swept claw-boots.
    for(const sign of [-1,1]){
      cinPoly(g,'#1b2838',[sign*4,-24,sign*19,-25,sign*23,-10,sign*18,-1,sign*9,-1]);
      cinRect(g,'#67767b',sign===-1?-21:12,-12,9,8);
      cinRect(g,glow,sign===-1?-21:18,-9,3,2);
      cinRect(g,'#111b28',sign===-1?-23:11,-3,13,4);
    }
    // Chest - three explicitly distinct armoured evolution phases.
    cinPoly(g,'#121e2e',[-19,-35,-21,-56,-12,-62,14,-62,22,-55,20,-30,12,-24,-13,-24]);
    cinPoly(g,core,[-17,-35,-18,-54,-12,-58,11,-58,18,-52,17,-34,10,-29,-11,-29]);
    cinPoly(g,'#263848',[-10,-53,10,-53,13,-39,0,-32,-13,-39]);
    cinPoly(g,glow,[0,-51,8,-43,0,-36,-8,-43]);
    cinRect(g,CIN_GOLD,-3,-42,6,2);
    if(phase>=2){
      cinRect(g,'#102634',-17,-50,5,13);cinRect(g,'#102634',12,-50,5,13);
      for(let i=0;i<3;i++){
        cinRect(g,'#9ce9dd',-16,-48+i*4,3,2);
        cinRect(g,'#9ce9dd',13,-48+i*4,3,2);
      }
    }
    if(phase===3){
      cinPoly(g,'#ffd58a',[-4,-52,0,-60,4,-52]);
      cinRect(g,'#ff8c57',-11,-34,22,3);
      cinRect(g,CIN_GOLD,-4,-30,8,2);
    }
    // Forearms/weapon silhouette changes with attack pattern.
    if(quake){
      cinPoly(g,'#132230',[-18,-52,-29,-46,-32,-20,-21,-17,-15,-33]);
      cinPoly(g,'#132230',[18,-52,29,-46,32,-20,21,-17,15,-33]);
      cinRect(g,CIN_GOLD,-31,-24,10,5);cinRect(g,CIN_GOLD,21,-24,10,5);
    }else if(dive){
      cinPoly(g,'#182331',[-20,-54,-37,-34,-34,-19,-18,-37]);
      cinPoly(g,'#182331',[20,-54,37,-34,34,-19,18,-37]);
      cinPoly(g,glow,[-36,-22,-30,-12,-25,-26]);
      cinPoly(g,glow,[36,-22,30,-12,25,-26]);
    }else{
      cinPoly(g,'#1b2835',[-19,-55,-28,-48,-30,-28,-18,-27,-13,-44]);
      cinPoly(g,'#22394a',[19,-55,28,-48,30,-28,18,-27,13,-44]);
      cinRect(g,'#6c8b89',18,-40,21,10);cinRect(g,'#142432',34,-42,8,14);
      cinRect(g,CIN_GOLD,39,-38,4,5);
      if(fan||d.mode==='attack'){
        cinPoly(g,'#ffd48a',[42,-38,49,-43,47,-35,54,-31,45,-29]);
      }
    }
    // Head is a protected FRONT portrait layer; no horn crosses the face.
    cinHead(g,d.characterId,portrait);
    // Helmet brow and horns frame the character instead of replacing it.
    cinPoly(g,'#273446',[-17,-67,-24,-78,-22,-62,-17,-59]);
    cinPoly(g,'#273446',[17,-67,24,-78,22,-62,17,-59]);
    cinRect(g,glow,-19,-67,5,2);cinRect(g,glow,14,-67,5,2);
    if(hit){
      cinRect(g,'#fff4cd',-18,-32,37,3);
      cinRect(g,'#ffffff',-14,-58,3,13);
    }
    // The only label is ID-sourced, never a stand-in character identity.
    if(intro){
      cinRect(g,'rgba(14,26,37,.86)',-27,-97,54,11);
      cinRect(g,CIN_GOLD,-27,-97,54,2);
      g.font='bold 7px monospace';g.textAlign='center';g.textBaseline='middle';
      g.fillStyle='#fff3d8';g.fillText('BOSS INBOUND',0,-90,52);
    }
    if(dying){
      const remain=cinClamp(cinF(d.deathTimer,cinF(d.modeTimer,.6)),0,1.3);
      const spread=7+(1-remain/1.3)*27;
      g.globalAlpha=.88;
      cinOval(g,'rgba(255,164,83,.33)',0,-42,spread,spread*.72);
      for(let i=0;i<(quality==='low'?7:17);i++)cinSpark(g,0,-42,i,now,!reduced,2+(i%2));
      cinPoly(g,'#fff1b6',[-4,-52,4,-59,12,-45,6,-30,-8,-26,-13,-41]);
    }
    if(quality!=='low' && phase>=2 && !reduced){
      for(let i=0;i<4;i++)cinSpark(g,0,-36,i+6,now,true);
    }
  }finally{g.restore();}
  // Telegraph is world-space (target can be outside boss local coordinates).
  if(d.mode==='windup')cinTelegraph(g,d,time,reduced);
  if(Array.isArray(d.projectiles)){
    for(const p of d.projectiles.slice(0,32)){
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
      cinRect(g,'#ffb46d',p.x-3,p.y-3,6,6);
      cinRect(g,'#fff1ae',p.x-1,p.y-1,3,3);
    }
  }
}
function cinFan(g,x,y,phase,reduced){
  g.save();g.translate(x,y);
  cinPoly(g,'#0d2630',[-15,-8,-21,0,-15,9,15,9,21,0,15,-8]);
  cinRect(g,'#a59267',-16,-9,32,3);cinRect(g,'#c2ae78',-17,7,34,3);
  cinOval(g,'#516a65',0,0,12,8);
  // Ducted fan blades, not a copied overhead helicopter rotor.
  const a=reduced?Math.PI/6:phase;
  for(let i=0;i<4;i++){
    g.save();g.rotate(a+i*Math.PI/2);
    cinPoly(g,'#c0bc91',[-2,-1,3,-2,12,-5,12,-1,3,2]);
    g.restore();
  }
  cinRect(g,'#192a32',-3,-3,6,6);cinRect(g,CIN_GOLD,-1,-1,2,2);
  g.restore();
}
function cinZone(g,e,time,reduced){
  const z=e.zone;
  if(!z||!Number.isFinite(z.x)||!Number.isFinite(z.y))return;
  const phase=e.phase;
  if(phase==='dormant'||phase==='failed')return;
  const radius=cinClamp(cinF(z.radius,44),2,140);
  const open=phase==='hover'&&z.open===true;
  const pulse=reduced?1:(.8+.2*Math.sin(time*5));
  g.save();
  cinOval(g,'rgba(9,24,26,.4)',z.x,z.y+3,radius*.96,8);
  cinOval(g,open?'rgba(245,199,91,.22)':'rgba(107,201,185,.09)',z.x,z.y,radius,7);
  g.strokeStyle=open?CIN_GOLD:'#8fbdab';g.lineWidth=2.5;
  g.globalAlpha=open?pulse:.54;
  g.beginPath();g.ellipse(z.x,z.y,radius,9,0,0,CIN_TAU);g.stroke();
  g.globalAlpha=1;
  for(const dir of [-1,1]){
    cinLine(g,open?'#fff0ae':'#84bdb1',2,z.x+dir*(radius-10),z.y-4,
      z.x+dir*(radius-5),z.y-9,z.x+dir*radius,z.y-4);
  }
  if(open){
    cinRect(g,'#223d3f',z.x-22,z.y-15,44,9);
    cinRect(g,CIN_GOLD,z.x-20,z.y-13,40,2);
    g.font='bold 7px monospace';g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#fff7df';g.fillText('BOARD HERE',z.x,z.y-9,43);
  }
  g.restore();
}
function cinHelicopter(g,e,time,quality,reduced){
  if(!e||e.phase==='dormant'||e.phase==='failed'||!e.helicopter ||
     e.helicopter.visible!==true)return;
  const h=e.helicopter;
  if(!Number.isFinite(h.x)||!Number.isFinite(h.y))return;
  const boarded=Array.isArray(e.boarded)?e.boarded:[false,false];
  const open=e.phase==='hover';
  const rotor=reduced?0:cinF(h.rotorAngle,cinF(h.rotorPhase)*CIN_TAU);
  const sink=reduced?0:Math.sin(time*6)*1.2;
  g.save();
  try{
    g.translate(h.x,h.y+sink);
    // REAR LAYER: angled canted wings, twin ducted rotors, landing sling.
    cinPoly(g,'#142b33',[-49,-20,-68,-38,-92,-42,-67,-15,-55,-5]);
    cinPoly(g,'#2a5557',[33,-20,55,-37,81,-42,61,-14,48,-5]);
    cinLine(g,'#b7aa74',5,-67,-15,-75,-29);
    cinLine(g,'#b7aa74',5,54,-14,63,-30);
    cinFan(g,-78,-38,rotor,reduced);cinFan(g,64,-38,-rotor,reduced);
    cinRect(g,'#2c3a3c',-6,6,5,10);
    cinLine(g,'#cdb87c',2,-3,6,-9,19,-6,29);
    cinLine(g,'#cdb87c',2,-9,19,4,20,17,29);
    cinLine(g,'#cdb87c',2,6,29,17,29);
    // MID LAYER: original wedge nose, armor seams, cargo belly, light strips.
    cinPoly(g,'#0f2532',[-69,-7,-58,-25,-35,-32,37,-29,53,-12,40,13,-42,15]);
    cinPoly(g,'#3b6566',[-64,-8,-53,-23,-31,-29,34,-26,48,-10,37,8,-44,9]);
    cinPoly(g,'#29454e',[-64,-8,-31,-24,-18,-23,-18,-1,-49,7]);
    cinPoly(g,'#a8aa81',[-59,-13,-43,-24,-21,-24,-21,-8,-47,2]);
    cinPoly(g,'#152b38',[-57,-12,-41,-21,-25,-21,-25,-10,-45,0]);
    cinRect(g,'#9eb8ab',-48,-20,13,2);
    cinPoly(g,'#be9c4d',[-24,7,33,7,42,12,31,18,-35,18,-44,10]);
    cinRect(g,'#e1c37b',-29,13,62,3);
    for(let i=0;i<5;i++)cinRect(g,'#5d695f',-22+i*11,15,5,2);
    cinLine(g,'#d6d6a1',2,-18,-29,28,-27);
    cinRect(g,'#122936',14,-18,19,17); // exposed boarding door opening
    cinRect(g,'#f3c869',14,-20,19,2);
    cinRect(g,'#b88e52',32,-18,3,19);
    if(open){
      // Ladder + golden boarding aperture are front, never hide the anchor.
      cinRect(g,'rgba(249,199,96,.24)',16,-16,15,15);
      cinLine(g,CIN_GOLD,2,20,3,20,29);
      cinLine(g,CIN_GOLD,2,30,3,30,29);
      for(let j=0;j<5;j++)cinRect(g,'#edcf92',20,6+j*5,11,2);
    }
    cinRect(g,'#27343a',-62,-6,6,5);cinRect(g,'#c3bc81',-61,-5,4,3);
    cinRect(g,'#f8e1a3',-48,13,7,3);cinRect(g,'#f8e1a3',36,11,7,3);
    cinRect(g,'#162633',-5,-30,14,3);cinRect(g,CIN_TEAL,0,-29,3,2);
    cinRect(g,'#5d3537',5,-30,7,4);
    cinRect(g,e.phase==='departure'||e.phase==='completed'?'#ffc16a':'#fd7669',7,-31,3,2);
    // ORIGINAL two-player boarding lights: independent state-driven markers.
    for(let i=0;i<2;i++){
      const x=16+i*10;
      cinRect(g,boarded[i]?(i===0?'#75e3ec':'#ffc48e'):'#536568',x,-15,9,10);
      cinRect(g,'#102632',x+1,-14,7,8);
      g.font='bold 7px monospace';g.textAlign='center';g.textBaseline='middle';
      g.fillStyle=boarded[i]?(i===0?'#8beaf0':'#ffd5a1'):'#aeb7aa';
      g.fillText(String(i+1),x+4.5,-10,8);
      if(boarded[i])cinRect(g,CIN_GOLD,x+2,-4,5,1);
    }
    // FRONT LAYER: rotating silhouettes, fan casing, rescue beacon and wash.
    cinRect(g,'#e3c27b',-78,-47,11,2);cinRect(g,'#e3c27b',58,-47,11,2);
    if(e.phase==='incoming'||open){
      const particles=quality==='low'?5:11;
      for(let i=0;i<particles;i++){
        const px=((i*23)%111)-58;
        const py=31+(i%3)*5+(reduced?0:((time*17+i*13)%13));
        cinLine(g,'rgba(229,199,139,.42)',1,px,py,px+(i%2?7:-7),py+2);
      }
    }
    if(e.phase==='departure'||e.phase==='completed'){
      for(let i=0;i<(quality==='low'?3:6);i++){
        cinLine(g,'rgba(241,220,163,.45)',1,45+i*12,-12+i*5,64+i*15,-12+i*5);
      }
    }
  }finally{g.restore();}
}
function drawBroforceCinematics(ctx,{devil=null,extraction=null,camera={},viewport={},
  time=0,drawPortrait=null,quality='high',reducedMotion=false}={}){
  if(!ctx||typeof ctx.save!=='function'||typeof ctx.restore!=='function'||
     typeof ctx.translate!=='function'||typeof ctx.scale!=='function')return;
  const zoom=cinClamp(cinF(camera&&camera.zoom,1),.01,100);
  const cx=cinF(camera&&camera.x),cy=cinF(camera&&camera.y);
  const t=cinF(time);
  const reduced=!!reducedMotion;
  ctx.save();
  try{
    ctx.translate(-cx*zoom,-cy*zoom);ctx.scale(zoom,zoom);
    // Explicit common-world-space painter order (independent of input order).
    if(extraction)cinZone(ctx,extraction,t,reduced);
    if(devil)cinDevil(ctx,devil,t,drawPortrait,quality,reduced);
    if(extraction)cinHelicopter(ctx,extraction,t,quality,reduced);
  }finally{ctx.restore();}
}
Object.assign(exports,{drawBroforceCinematics});
