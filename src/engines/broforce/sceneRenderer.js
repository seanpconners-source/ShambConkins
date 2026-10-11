// BF-31 — pure, shared-world Canvas2D scene compositor. All dimensions are canvas
// pixels except world/camera/entity positions, which are BF world pixels (+Y down).
// WorldArt/FxArt already subtract the camera; actorArt accepts world FEET anchors.
const {drawBroforceWorld}=require('src/engines/broforce/worldArt.js');
const {drawBroforceActor}=require('src/engines/broforce/actorArt.js');
const {drawBroforceHud}=require('src/engines/broforce/hudArt.js');
const {drawBroforceFx}=require('src/engines/broforce/fxArt.js');

const COL=['#79c8dd','#f3a178'];
const finite=(n,d=0)=>Number.isFinite(n)?n:d;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rect=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
const list=(v,max=256)=>Array.isArray(v)?v.slice(0,max):[];
const box=b=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)?
  {x:b.x,y:b.y,w:clamp(finite(b.w,12),1,256),h:clamp(finite(b.h,26),1,256)}:null;
const visible=(b,c,v,pad=40)=>b&&b.x+b.w>=c.x-pad&&b.y+b.h>=c.y-pad&&
  b.x<=c.x+v.width+pad&&b.y<=c.y+v.height+pad;
const dead=p=>p?.alive===false||p?.dead===true||p?.down===true||p?.downed===true||
  (Number.isFinite(p?.hp)&&p.hp<=0)||(Number.isFinite(p?.health)&&p.health<=0);
const boarded=p=>p?.boarded===true||p?.extracted===true;

function faceFor(fighterId,portraitFor,drawPortrait){
  let item=null;
  if(typeof portraitFor==='function')try{item=portraitFor(fighterId);}catch(_err){/* offline fallback */}
  const src=item&&typeof item==='object'?(item.image||item.headImage||item.portrait||item):item;
  const paint=typeof item==='function'?item:
    item&&typeof item.drawPortrait==='function'?item.drawPortrait:null;
  const image=src&&typeof src==='object'&&(src.naturalWidth||src.width)&&
    (src.naturalHeight||src.height)&&src.complete!==false?src:null;
  if(!image&&!paint&&typeof drawPortrait!=='function')return {};
  // BF-25 mirrors its BODY for left facing. Counter-mirror the face only, so
  // asymmetrical photographed faces are not reversed with the gun/uniform.
  return {headImage:image,makeHead:(facing=1)=>(g,left,top,size)=>{
    g.save();try{
      if(facing<0){g.translate(2*left+size,0);g.scale(-1,1);}
      if(typeof drawPortrait==='function')drawPortrait(g,fighterId,left,top,size);
      else if(paint){
        if(paint.length>=5)paint(g,fighterId,left,top,size);
        else paint(g,left,top,size);
      }else if(image){
        const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,s=Math.min(w,h);
        g.drawImage(image,(w-s)/2,(h-s)/2,s,s,left,top,size,size);
      }
    }finally{g.restore();}
  }};
}
function stageMap(state){
  const candidates=[state?.terrain?.map,state?.terrain,state?.stage?.map,
    state?.stage?.terrain,state?.stage];
  for(const m of candidates)if(m&&Number.isFinite(m.width)&&Number.isFinite(m.height)&&
    m.tiles&&typeof m.tiles.length==='number')return m;
  return {width:0,height:0,tileSize:16,tiles:[]};
}
function drawGround(g,v,t){
  // Bounded preview only when the real terrain is absent. Not simulation terrain.
  const y=Math.round(v.height*.79);
  rect(g,'#1b3e3a',0,y-5,v.width,6);
  rect(g,'#728564',0,y,v.width,4);
  rect(g,'#423e33',0,y+4,v.width,v.height-y);
  for(let i=0;i<Math.min(130,Math.ceil(v.width/16));i++){
    const x=i*16;
    rect(g,'#806e4f',x+((i*7)%8),y+8+(i%3)*13,4,2);
  }
}
function cage(g,b,prisoner,t){
  const x=Math.round(b.x),y=Math.round(b.y),w=b.w,h=b.h;
  if(prisoner.rescued){
    g.globalAlpha=.35;rect(g,'#b5ac75',x,y+h-4,w,3);g.globalAlpha=1;
    return;
  }
  rect(g,'#081d25',x-2,y-3,w+4,h+5);
  rect(g,'#947956',x-1,y-2,w+2,3);
  rect(g,'#496874',x,y+1,w,h-1);
  rect(g,'#e2b88c',x+w*.29,y+h*.23,w*.45,h*.29);
  rect(g,'#232b30',x+w*.26,y+h*.19,w*.52,3);
  rect(g,'#c5bd96',x+w*.34,y+h*.51,w*.34,h*.33);
  for(let i=1;i<4;i++)rect(g,i===2?'#c5b177':'#273b43',x+w*i/4-1,y,2,h);
  rect(g,'#b6aca0',x-1,y+h-4,w+2,4);
  rect(g,'#e8c875',x+w*.5-1,y+h*.8,3,3);
  if(prisoner.inRange||prisoner.available){
    g.strokeStyle='#fff1ac';g.lineWidth=1.5;
    g.strokeRect(x-4,y-5,w+8,h+11);
  }
}
function enemy(g,e,b,t){
  if(e.dead||e.alive===false||Number.isFinite(e.hp)&&e.hp<=0)return;
  const type=String(e.type||'rifleman');
  const turret=type.includes('turret'),carrier=type.includes('carrier'),
    melee=type.includes('melee');
  const cx=Math.round(b.x+b.w/2),feet=Math.round(b.y+b.h);
  const dir=e.facing<0?-1:1;
  g.save();try{
    g.translate(cx,feet);g.scale(dir,1);
    rect(g,'rgba(3,15,24,.35)',-9,0,18,2);
    if(turret){
      rect(g,'#1d343f',-12,-14,25,13);rect(g,'#9ea7a0',-10,-16,20,4);
      rect(g,'#df8953',-4,-14,7,4);rect(g,'#203039',1,-12,26,5);
      rect(g,'#e9c681',19,-11,7,2);rect(g,'#678587',-9,-2,18,3);
    }else{
      rect(g,'#1b252c',-8,-9,7,9);rect(g,'#1b252c',3,-9,7,9);
      rect(g,'#647775',-7,-21,15,13);
      rect(g,carrier?'#b96d43':melee?'#856c60':'#526f78',-6,-19,13,11);
      rect(g,'#192d35',-7,-29,16,11);rect(g,'#c19c76',-6,-27,12,7);
      rect(g,'#20272c',-9,-30,19,5);rect(g,'#b6ba99',-4,-24,3,2);
      if(carrier){rect(g,'#c4793c',-14,-20,8,13);rect(g,'#ffd272',-14,-21,8,3);}
      else if(melee){rect(g,'#c8b8a0',9,-23,3,17);rect(g,'#e0c48c',7,-25,9,5);}
      else {rect(g,'#233039',6,-17,24,5);rect(g,'#d2ba86',15,-17,7,2);}
    }
    if(finite(e.hitTimer)>0){g.globalAlpha=.65;rect(g,'#fff1c8',-9,-30,19,10);}
  }finally{g.restore();}
  if(finite(e.tellLeft)>0||e.state==='windup'||e.phase==='telegraph'){
    g.save();try{
      const x=cx,y=b.y+8,target=e.aim||e.telegraph?.target||e.target;
      g.strokeStyle='#ffc586';g.lineWidth=1.4;g.setLineDash([5,4]);
      g.beginPath();g.moveTo(x,y);
      if(Number.isFinite(target?.x)&&Number.isFinite(target?.y))g.lineTo(target.x,target.y);
      else g.lineTo(x+(e.facing<0?-54:54),y);
      g.stroke();g.setLineDash([]);
      rect(g,'#e56555',cx-5,b.y-10,10,4);
    }finally{g.restore();}
  }
}
function bullet(g,p){
  if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return;
  const x=p.x,y=p.y,dx=finite(p.vx),dy=finite(p.vy),m=Math.max(1,Math.hypot(dx,dy));
  const hostile=p.hostile||p.enemy||String(p.owner||'').startsWith('enemy')||p.owner==='devil';
  g.strokeStyle=hostile?'#ff8b72':'#ffe8a1';g.lineWidth=p.weapon==='launcher'?3:1.6;
  g.beginPath();g.moveTo(x-dx/m*clamp(m*.018,4,13),y-dy/m*clamp(m*.018,4,13));
  g.lineTo(x,y);g.stroke();rect(g,hostile?'#ffe1b7':'#fff4dc',x-1.5,y-1.5,3,3);
}
function devilFallback(g,d,t){
  if(!d||d.mode==='dead'||d.defeated===true)return;
  const b=box(d.body||d);if(!b)return;
  const x=b.x,y=b.y,w=b.w,h=b.h;
  rect(g,'rgba(5,13,20,.52)',x-9,y+h-3,w+18,6);
  rect(g,'#151e29',x+4,y+11,w-8,h-12);
  rect(g,'#6f3742',x+1,y+8,w-2,h*.67);
  rect(g,'#b56052',x+7,y+14,w-14,6);
  rect(g,'#182c33',x+w*.18,y-5,w*.64,23);
  rect(g,'#dfab6d',x+w*.23,y+2,w*.54,9);
  rect(g,'#eebf7a',x+w*.27,y+6,w*.13,4);
  rect(g,'#eebf7a',x+w*.61,y+6,w*.13,4);
  for(const side of [-1,1]){
    const px=x+w/2+side*w*.31;
    g.fillStyle='#28383e';g.beginPath();g.moveTo(px,y+6);g.lineTo(px+side*17,y-20);
    g.lineTo(px-side*3,y-6);g.fill();
  }
  rect(g,'#ffd28d',x+w*.41,y+12,w*.18,4);
  rect(g,'#293941',x+w*.15,y+h*.78,w*.70,9);
  const tel=d.telegraph;
  if(tel&&Number.isFinite(tel.targetX)&&Number.isFinite(tel.targetY)){
    g.save();try{g.strokeStyle='#ffc4a7';g.lineWidth=2;g.setLineDash([7,5]);
      g.beginPath();g.moveTo(x+w/2,y+h/2);g.lineTo(tel.targetX,tel.targetY);g.stroke();
      g.setLineDash([]);
      g.strokeStyle='#e86d60';g.strokeRect(tel.targetX-9,tel.targetY-9,18,18);
    }finally{g.restore();}
  }
}
function helicopterFallback(g,ex,time){
  if(!ex?.active&&!ex?.helicopter?.visible)return;
  const h=ex.helicopter||{},x=finite(h.x,finite(ex.x)),y=finite(h.y,finite(ex.y)-58);
  rect(g,'rgba(2,14,20,.5)',x-35,y+35,90,8);
  rect(g,'#273c44',x-46,y-13,84,37);
  rect(g,'#587475',x-42,y-16,67,7);
  rect(g,'#d6b67b',x-32,y-10,22,14);
  rect(g,'#162d38',x+37,y-2,41,7);
  rect(g,'#b7bba0',x+74,y-13,3,27);
  rect(g,'#23363c',x-29,y+22,6,13);rect(g,'#23363c',x+24,y+22,6,13);
  rect(g,'#e8c47a',x-44,y+29,82,3);
  const rotor=Math.sin(time*40+finite(h.rotorPhase)*Math.PI*2);
  rect(g,'#d6dfcc',x-35+rotor*8,y-22,94,3);
  rect(g,'#273a43',x+4,y-21,4,7);
  const zone=ex.zone;
  if(zone?.open&&Number.isFinite(zone.x)&&Number.isFinite(zone.y)){
    g.strokeStyle='#a8ecd4';g.lineWidth=2;g.setLineDash([5,4]);
    g.beginPath();g.arc(zone.x,zone.y,finite(zone.radius,44),0,Math.PI*2);g.stroke();g.setLineDash([]);
  }
}
function overlay(g,players,cam,v,zoom,mission){
  g.save();try{
    g.font='bold 11px monospace';g.textAlign='center';g.textBaseline='middle';
    players.slice(0,2).forEach((p,i)=>{
      const b=box(p?.body||p);if(!b||boarded(p))return;
      const sx=(b.x+b.w/2-cam.x)*zoom,sy=(b.y-29-cam.y)*zoom;
      // Fixed-size locator prevents losing a teammate offscreen on small displays.
      const x=clamp(sx,17,v.width-17),y=clamp(sy,54,v.height-28);
      g.fillStyle='rgba(8,22,30,.88)';g.fillRect(x-13,y-9,26,19);
      g.fillStyle=COL[i];g.fillRect(x-13,y-9,26,2);
      g.fillStyle='#f3f6e7';g.fillText('P'+(i+1),x,y+1);
      if(sx!==x||sy!==y){
        g.fillStyle=COL[i];g.fillRect(x+(sx<x?-17:14),y-3,3,6);
      }
    });
    if(mission?.message||mission?.toast){
      const text=String(mission.message||mission.toast).replace(/[\x00-\x1f]/g,' ').slice(0,70);
      g.font='bold 12px monospace';
      const width=Math.min(v.width-20,Math.max(90,text.length*7+18)),cx=v.width/2;
      const y=Math.max(67,v.height*.60);
      rect(g,'rgba(8,20,29,.91)',cx-width/2,y-14,width,28);
      rect(g,'#e8c27b',cx-width/2,y-14,width,2);
      g.fillStyle='#fff1d2';g.fillText(text,cx,y+1,width-14);
    }
  }finally{g.restore();}
}

/**
 * Draws one snapshot without modifying it. Optional environment and cinematic
 * callbacks use screen-local WORLD-unit viewports and camera top-left, identical
 * to BF-24/BF-32; they must not apply their own zoom or viewport CSS transform.
 * The extra optional drawPortrait(ctx,id,left,top,size) is supported for host
 * portrait providers; portraitFor(id) may instead return a CanvasImage or painter.
 */
function drawBroforceScene(ctx,{state,viewport,time=0,quality='high',portraitFor=null,
  environmentDraw=null,cinematicDraw=null,drawPortrait=null}={}){
  const W=clamp(finite(viewport?.width,finite(ctx?.canvas?.width)),0,16384);
  const H=clamp(finite(viewport?.height,finite(ctx?.canvas?.height)),0,16384);
  const result={insets:{top:0,right:0,bottom:0,left:0},controlZones:{}};
  if(!ctx||typeof ctx.save!=='function'||typeof ctx.restore!=='function'||W<1||H<1)return result;
  const scene=state&&typeof state==='object'?state:{};
  const cam0=scene.camera||{},zoom=clamp(finite(cam0.zoom,1)||1,.25,6);
  const cam={x:finite(cam0.x),y:finite(cam0.y)};
  const worldView={width:W/zoom,height:H/zoom};
  const map=stageMap(scene),stageId=scene.stage?.stageId||scene.stageId||'broforce-jungle';
  const shake=quality==='low'||scene.fx?.reducedMotion?{x:0,y:0}:
    {x:clamp(finite(scene.fx?.shakeOffset?.x),-12,12),y:clamp(finite(scene.fx?.shakeOffset?.y),-12,12)};
  const players=list(scene.players,2);
  const portraits=players.map(p=>faceFor(p?.fighterId||p?.character||p?.characterId,portraitFor,drawPortrait));
  const hudPlayers=[0,1].map(i=>{
    const p=players[i]||{},face=portraits[i]||{},fighterId=p.fighterId||p.character;
    const head=face.makeHead?face.makeHead(1):null;
    return {...p,character:fighterId||p.character,name:p.name||`PLAYER ${i+1}`,
      headImage:face.headImage||null,drawHead:head};
  });
  const t=finite(time),low=quality==='low';
  ctx.save();try{
    ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();ctx.imageSmoothingEnabled=false;
    // The world modules already subtract cam.x/y and expect a world-unit
    // viewport; scaling only once avoids zoom-squared and crop errors.
    ctx.save();try{
      ctx.scale(zoom,zoom);ctx.translate(shake.x,shake.y);
      let drawn=false;
      if(typeof environmentDraw==='function')try{
        environmentDraw(ctx,{stageId,map,camera:cam,viewport:worldView,time:t,quality});drawn=true;
      }catch(_err){/* A missing future dependency must not blank the preview. */}
      if(!drawn)drawBroforceWorld(ctx,{map,camera:cam,viewport:worldView,time:t,quality});
      if(!map.width||!map.height)drawGround(ctx,worldView,t);
    }finally{ctx.restore();}
    // FX uses camera-relative screen-local coordinates, unlike actors/cages.
    if(scene.fx){ctx.save();try{
      ctx.scale(zoom,zoom);ctx.translate(shake.x,shake.y);
      drawBroforceFx(ctx,{fx:scene.fx,camera:cam,viewport:worldView,time:t,layer:'back'});
    }finally{ctx.restore();}}
    ctx.save();try{
      ctx.scale(zoom,zoom);ctx.translate(shake.x-cam.x,shake.y-cam.y);
      const worldCam={x:cam.x,y:cam.y};
      for(const p of list(scene.prisoners,64)){
        const b=box(p);if(visible(b,worldCam,worldView))cage(ctx,b,p,t);
      }
      for(const e of list(scene.enemies,80)){
        const b=box(e.body||e);if(visible(b,worldCam,worldView))enemy(ctx,e,b,t);
      }
      for(const p of list(scene.projectiles,256)){
        if(visible(box({x:p?.x,y:p?.y,w:3,h:3}),worldCam,worldView,20))bullet(ctx,p);
      }
      // Actors must be drawn from TOP-LEFT BF-13 bodies using BF-25 FEET anchors.
      players.forEach((p,i)=>{
        const b=box(p?.body||p);if(!visible(b,worldCam,worldView,64)||boarded(p))return;
        const facing=p.facing??p.body?.facing??1;
        const pose=dead(p)?'dead':p.pose||p.anim||
          (p.body?.onGround===false?(finite(p.body?.vy)<0?'jump':'fall'):
          (Math.abs(finite(p.body?.vx))>7?'run':'idle'));
        const weapon=typeof p.weapon==='string'?p.weapon:p.weapon?.name||p.weapon?.id||'rifle';
        const face=portraits[i]||{};
        drawBroforceActor(ctx,{x:b.x+b.w/2,y:b.y+b.h,scale:1,team:i,
          facing,pose,time:t,weapon,headImage:face.headImage||null,
          drawHead:face.makeHead?face.makeHead(facing):null,
          hitFlash:finite(p.hitFlash)>0||finite(p.invulnerability)>0&&Math.sin(t*24)>.6});
      });
    }finally{ctx.restore();}
    // Cinematics consume camera-relative world-unit viewports, BF-32 contract.
    ctx.save();try{
      ctx.scale(zoom,zoom);ctx.translate(shake.x,shake.y);
      const dev=scene.devil,ex=scene.extraction;
      let drawn=false;
      const cinematicPortrait=(g,id,left,top,size)=>{
        const face=faceFor(id,portraitFor,drawPortrait);
        if(face.makeHead)face.makeHead(1)(g,left,top,size);
      };
      if(typeof cinematicDraw==='function')try{
        cinematicDraw(ctx,{devil:dev,extraction:ex,camera:cam,
          viewport:worldView,time:t,drawPortrait:cinematicPortrait,quality,
          reducedMotion:!!scene.fx?.reducedMotion});drawn=true;
      }catch(_err){/* Draw local original placeholders until BF-32 exists. */}
      if(!drawn){ctx.translate(-cam.x,-cam.y);devilFallback(ctx,dev,t);helicopterFallback(ctx,ex,t);}
    }finally{ctx.restore();}
    if(scene.fx){ctx.save();try{
      ctx.scale(zoom,zoom);ctx.translate(shake.x,shake.y);
      drawBroforceFx(ctx,{fx:scene.fx,camera:cam,viewport:worldView,time:t,layer:'front'});
    }finally{ctx.restore();}}
    overlay(ctx,players,cam,{width:W,height:H},zoom,scene.mission);
    const devil=scene.devil?{...scene.devil,active:scene.devil.active!==false&&
      scene.devil.mode!=='dead'&&!scene.devil.defeated,
      health:scene.devil.health??scene.devil.hp,maxHealth:scene.devil.maxHealth??scene.devil.maxHp,
      name:scene.devil.name||'DEVIL'}:null;
    const extraction=scene.extraction?{...scene.extraction,
      countdown:scene.extraction.countdown??scene.extraction.zone?.secondsRemaining,
      active:!!(scene.extraction.active||scene.extraction.helicopter?.visible)}:null;
    const info=drawBroforceHud(ctx,{viewport:{width:W,height:H,safeInsets:viewport?.safeInsets},
      players:hudPlayers,mission:scene.mission,devil,extraction,time:t,
      reducedMotion:!!scene.fx?.reducedMotion||low});
    if(info&&info.insets&&info.controlZones)return info;
  }finally{ctx.restore();}
  return result;
}
Object.assign(exports,{drawBroforceScene});
