// BF-22: standalone, paint-only Broforce mission HUD. Canvas coordinates are device
// canvas pixels (not CSS pixels); the adapter owns DPR, layout and pointer mapping.
// No DOM, session, font files, state changes, fetches or module imports.
const HUD_EDGE = '#526b71';
const HUD_GOLD = '#f1ca72';
const HUD_TEXT = '#e8f0e7';
const HUD_MUTED = '#aec1ba';
const HUD_TEAM = ['#79c8dd', '#f3a178'];
const HUD_DANGER = '#e56555';
const HUD_MAX = 100000;
const hudFinite = (v, alt=0) => typeof v==='number' && Number.isFinite(v) ? v : alt;
const hudClamp = (v,min,max) => Math.max(min,Math.min(max,hudFinite(v,min)));
const hudCount = v => Math.max(0,Math.floor(hudClamp(v,0,HUD_MAX)));
const hudStr = (v, fallback='') => typeof v==='string' ? v.replace(/[\x00-\x1f\x7f]/g,' ').trim() : fallback;
const hudRect = (g,c,x,y,w,h) => { if(w>0 && h>0) { g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); } };
function hudFrame(g,x,y,w,h,tint){
  hudRect(g,'rgba(8,21,30,0.90)',x,y,w,h);
  hudRect(g,'rgba(100,145,147,0.62)',x,y,w,1);
  hudRect(g,'rgba(100,145,147,0.42)',x,y+1,1,h-1);
  hudRect(g,'rgba(3,13,20,0.9)',x+1,y+h-1,w-1,1);
  hudRect(g,tint,x+4,y,Math.min(18,w-8),2);
  hudRect(g,tint,x+1,y+4,2,4);
  hudRect(g,'rgba(235,217,156,0.18)',x+w-8,y+3,4,1);
}
function hudWidth(g,t){
  try{ const w=g.measureText(t).width;return Number.isFinite(w)&&w>=0?w:t.length*8; }
  catch {return t.length*8;}
}
function hudText(g,value,x,y,maxW,size=12,color=HUD_TEXT,weight=700,align='left'){
  if(maxW<3)return;
  const str=hudStr(value,'--');
  g.font=`${weight} ${size}px monospace`;
  g.textBaseline='middle';g.textAlign=align;g.fillStyle=color;
  let show=str;
  if(hudWidth(g,show)>maxW){
    const dot='…';let lo=0,hi=str.length;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);
      if(hudWidth(g,str.slice(0,mid)+dot)<=maxW)lo=mid;else hi=mid-1;}
    show=lo ? str.slice(0,lo)+dot : (hudWidth(g,dot)<=maxW?dot:'');
  }
  if(!show)return;
  // Hard clip as a second line of defence for unusual fonts and canvas backends.
  g.save();try{
    g.beginPath();
    const left=align==='center'?x-maxW/2:align==='right'?x-maxW:x;
    g.rect(left,y-size*.72,maxW,size*1.45);g.clip();
    g.fillText(show,x,y);
  }finally{g.restore();}
}
function hudInitials(p){
  const v=hudStr(p?.initials)||hudStr(p?.name)||hudStr(p?.character)||'P';
  const parts=v.split(/\s+/).filter(Boolean);
  return (parts.length>1?parts.slice(0,2).map(s=>s[0]).join(''):v.slice(0,2)).toUpperCase();
}
function hudPortrait(g,p,x,y,size,tint){
  hudRect(g,'#07151d',x-2,y-2,size+4,size+4);
  hudRect(g,tint,x-2,y-2,size+4,2);
  hudRect(g,tint,x-2,y,2,size);
  hudRect(g,'#31555a',x,y,size,size);
  let drawn=false;
  g.save();try{
    g.beginPath();g.moveTo(x+3,y);g.lineTo(x+size-3,y);
    g.lineTo(x+size,y+3);g.lineTo(x+size,y+size-3);
    g.lineTo(x+size-3,y+size);g.lineTo(x+3,y+size);
    g.lineTo(x,y+size-3);g.lineTo(x,y+3);g.closePath();g.clip();
    const cb=p?.drawHead||p?.headCallback;
    if(typeof cb==='function'){
      // The callback uses this module's top-left, width convention, like actorArt.
      try{cb(g,x,y,size);drawn=true;}catch{drawn=false;}
    }else{
      const img=p?.headImage||p?.portrait||p?.image;
      const iw=img?.naturalWidth||img?.width,ih=img?.naturalHeight||img?.height;
      if(img && img.complete!==false && Number.isFinite(iw)&&Number.isFinite(ih) && iw>0 && ih>0){
        const crop=Math.min(iw,ih);
        try{g.imageSmoothingEnabled=true;
          g.drawImage(img,(iw-crop)/2,(ih-crop)/2,crop,crop,x,y,size,size);drawn=true;
        }catch{drawn=false;}
      }
    }
  }finally{g.restore();}
  if(!drawn){
    hudRect(g,'#1c333e',x+2,y+2,size-4,size-4);
    hudRect(g,'#d2ae79',x+4,y+4,size-8,2);
    hudText(g,hudInitials(p),x+size/2,y+size*.57,size-5,size>=25?12:10,'#fff0cf',800,'center');
    hudRect(g,'#79a29c',x+size-7,y+size-6,4,2);
  }
}
function hudState(p){
  if(p?.boarded || p?.extracted)return {text:'BOARD',c:HUD_GOLD,mark:'='};
  if(p?.down || p?.dead || p?.alive===false)return {text:'DOWN',c:HUD_DANGER,mark:'!'};
  return {text:'UP',c:'#a4d9b4',mark:'+'};
}
function hudWeapon(p){
  const w=p?.weapon;
  return hudStr(typeof w==='string'?w:w?.name||w?.id,'RIFLE').toUpperCase()||'RIFLE';
}
function hudAmmo(p){
  const w=p?.weapon;
  const v=p?.ammo ?? w?.ammo;
  const reserve=p?.reserveAmmo ?? w?.reserveAmmo ?? w?.reserve;
  const chamber=(v===Infinity || v==='∞')?'∞':v==null?'--':String(hudCount(v));
  return chamber+(reserve==null?'':`/${reserve===Infinity||reserve==='∞'?'∞':hudCount(reserve)}`);
}
function hudPlayer(g,p,i,r,compact){
  const accent=HUD_TEAM[i];
  const {x,y,width:w,height:h}=r;
  hudFrame(g,x,y,w,h,accent);
  const photo=compact?Math.max(18,Math.min(24,h-10)):Math.max(24,Math.min(29,h-10));
  hudPortrait(g,p,x+7,y+(h-photo)/2,photo,accent);
  const state=hudState(p);
  const left=x+photo+15,right=x+w-5;
  const small=compact?10:11;
  // Player number is stamped over the portrait frame to preserve a full name line.
  hudRect(g,'#0b1b27',x+5,y+h-16,14,12);
  hudText(g,String(i+1),x+12,y+h-10,12,10,accent,900,'center');
  const badgeW=45,badgeX=right-badgeW;
  hudRect(g,state.c,badgeX,y+6,badgeW,14);
  hudRect(g,'#10232d',badgeX+1,y+7,badgeW-2,12);
  hudText(g,state.mark, badgeX+3,y+13,8,10,state.c,900);
  hudText(g,state.text,badgeX+11,y+13,badgeW-13,9,HUD_TEXT,800);
  const name=hudStr(p?.name)||hudStr(p?.character)||`PLAYER ${i+1}`;
  hudText(g,name.toUpperCase(),left,y+10,Math.max(5,badgeX-left-4),small+1,HUD_TEXT,800);
  const line2=y+h-11;
  // Amplitude ticks communicate rescues without requiring color alone.
  const rescues=hudCount(p?.rescues ?? p?.rescueCount);
  hudRect(g,accent,left,line2-4,3,6);
  hudRect(g,accent,left+4,line2-2,3,4);
  hudText(g,`R${rescues}`,left+10,line2,compact?29:34,10,HUD_GOLD);
  const narrow=w<190;
  const x2=left+(narrow?29:compact?41:47);
  const ammo=narrow?hudAmmo(p).split('/')[0]:hudAmmo(p);
  const wpn=hudWeapon(p);
  const remaining=right-x2;
  if(remaining>36){
    const amtW=narrow?Math.min(24,Math.max(15,remaining*.30)):Math.min(58,Math.max(35,remaining*.43));
    hudText(g,ammo,right,line2,amtW,10,HUD_TEXT,800,'right');
    hudText(g,wpn,x2,line2,Math.max(4,remaining-amtW-5),10,HUD_MUTED,700);
  }else{hudText(g,ammo,right,line2,remaining,10,HUD_TEXT,800,'right');}
}
function hudPause(g,r){
  const {x,y,width:w,height:h}=r;
  hudRect(g,'rgba(8,21,30,.82)',x+4,y+4,w-8,h-8);
  hudRect(g,HUD_EDGE,x+7,y+7,w-14,1);
  hudRect(g,HUD_EDGE,x+7,y+h-8,w-14,1);
  const cx=x+w/2;
  hudRect(g,HUD_GOLD,cx-5,y+14,3,12);
  hudRect(g,HUD_GOLD,cx+2,y+14,3,12);
  hudText(g,'II',cx,y+h-10,w-12,8,HUD_MUTED,700,'center');
}
function hudObjective(g,mission,r,small){
  const {x,y,width:w,height:h}=r;
  hudFrame(g,x,y,w,h,HUD_GOLD);
  const objective=hudStr(mission?.objective||mission?.title||mission?.label,'CLEAR THE OUTPOST').toUpperCase();
  const stage=hudStr(mission?.stage||mission?.stageName,'');
  const rescued=mission?.rescues ?? mission?.rescued;
  const target=mission?.rescueTarget ?? mission?.rescuesRequired;
  // A long objective must not erase the separately reserved rescue total.
  const rescueText=Number.isFinite(rescued)?
    hudCount(rescued)+(Number.isFinite(target)?'/'+hudCount(target):'')+' SAVED':'';
  const rescueW=rescueText?Math.min(85,Math.max(46,Math.floor(w*.34))):0;
  const badgeX=x+w-6-rescueW;
  const textRight=rescueText?badgeX-5:x+w-7;
  const textLeft=x+7;
  const contentW=Math.max(0,textRight-textLeft);
  const stageW=stage&&w>=185&&contentW>82?Math.min(100,Math.max(45,Math.floor(w*.2))):0;
  if(stageW)hudText(g,stage.toUpperCase(),textLeft,y+h/2,stageW-5,small?9:10,HUD_GOLD,800);
  const objectiveX=textLeft+(stageW?stageW+2:0);
  hudText(g,objective,objectiveX,y+h/2,Math.max(0,textRight-objectiveX),small?10:11,HUD_TEXT,800);
  if(rescueText){
    hudRect(g,'rgba(241,202,114,0.16)',badgeX,y+3,rescueW,h-6);
    hudText(g,rescueText,badgeX+4,y+h/2,rescueW-8,small?9:10,HUD_GOLD,800);
  }
}
function hudProgress(g,r,phase,value,max,label,alert=false){
  const {x,y,width:w,height:h}=r;
  hudFrame(g,x,y,w,h,alert?HUD_DANGER:HUD_GOLD);
  const pad=6,barW=Math.max(0,w-12);
  const pct=max>0?hudClamp(value/max,0,1):0;
  hudRect(g,'#20353c',x+pad,y+h-6,barW,3);
  hudRect(g,alert?HUD_DANGER:HUD_GOLD,x+pad,y+h-6,Math.floor(barW*pct),3);
  hudText(g,`${phase}  ${label}`,x+pad,y+Math.max(7,(h-5)/2),w-12,10,HUD_TEXT,800);
}
function hudClock(v){
  const n=hudCount(Math.ceil(hudFinite(v,0)));
  return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
}
function hudInsets(viewport,W,H){
  const source=viewport?.safeInsets||viewport?.insets||viewport?.safeArea||{};
  const top=hudClamp(source.top,0,H*.3),bottom=hudClamp(source.bottom,0,H*.3);
  const left=hudClamp(source.left,0,W*.3),right=hudClamp(source.right,0,W*.3);
  return {top,right,bottom,left};
}
/**
 * Draw from a single immutable snapshot. Expected inputs:
 * viewport:{width,height,safeInsets:{top,right,bottom,left}} in canvas pixels;
 * players:[{name,headImage|drawHead,alive,down,boarded,weapon,ammo,reserveAmmo,rescues},...];
 * mission:{objective,stage,rescues,rescueTarget};
 * devil:{active,health,maxHealth,name,defeated}; extraction:{active,countdown};
 * layout:'auto'|'portrait'|'landscape'. No click behavior or pointer captures:
 * controlZones.pause is a suggested 44px target for adapter hit-testing only.
 * insets are HUD keep-clear margins, not modifications to safe-area CSS.
 */
function drawBroforceHud(ctx,options={}){
  const {viewport,players,mission,devil,extraction,time=0,layout='auto',reducedMotion=false,showPause=true}=
    options && typeof options==='object'?options:{};
  const W=hudClamp(viewport?.width||ctx?.canvas?.width,0,16384);
  const H=hudClamp(viewport?.height||ctx?.canvas?.height,0,16384);
  const safe=hudInsets(viewport,W,H);
  const empty={insets:{top:safe.top,right:safe.right,bottom:safe.bottom,left:safe.left},controlZones:{}};
  if(!ctx||typeof ctx.save!=='function'||typeof ctx.restore!=='function'||W<160||H<120)return empty;
  const margin=W<480?9:12;
  const left=safe.left+margin, right=W-safe.right-margin;
  const top=safe.top+Math.max(4,Math.min(12,H*.012));
  const avail=right-left;
  if(avail<155||top>=H-safe.bottom-55)return empty;
  const portrait=layout==='portrait'||(layout!=='landscape'&&W/H<.80);
  const compact=!portrait&&H<500;
  const chipH=compact?36:44;
  const pause={x:right-44,y:Math.max(safe.top,top-4),width:44,height:44};
  const gap=compact?8:6;
  let r1,r2,objectiveRect,detailRect;
  const extraVisible=!!extraction?.active;
  const bossVisible=!extraVisible&&!!devil?.active&&!devil?.defeated;
  if(portrait){
    // Stack readable full-width player cards rather than squeeze six HUD fields into 158px.
    // The first row reserves a 44px Pause target only when that control is enabled.
    const firstWidth=avail-(showPause?44+gap:0);
    r1={x:left,y:top,width:firstWidth,height:chipH};
    r2={x:left,y:top+chipH+5,width:avail,height:chipH};
    objectiveRect={x:left,y:r2.y+chipH+5,width:avail,height:23};
    if(extraVisible||bossVisible)detailRect={x:left+Math.max(12,avail*.13),y:objectiveRect.y+26,width:avail-Math.max(24,avail*.26),height:20};
  }else{
    const usable=avail-44-gap*3;
    const side=Math.floor(Math.min(compact?214:255,Math.max(140,usable*.325)));
    r1={x:left,y:top,width:side,height:chipH};
    r2={x:right-44-gap-side,y:top,width:side,height:chipH};
    const centerX=r1.x+side+gap,centerW=r2.x-gap-centerX;
    if(centerW>=90){
      objectiveRect={x:centerX,y:top,width:centerW,height:compact?20:23};
      if(extraVisible||bossVisible)detailRect={x:centerX,y:top+(compact?22:25),width:centerW,height:compact?19:19};
    }else{
      objectiveRect={x:left,y:top+chipH+3,width:avail-44-gap,height:19};
      if(extraVisible||bossVisible)detailRect={x:left,y:objectiveRect.y+21,width:objectiveRect.width,height:16};
    }
  }
  const hudBottom=Math.max(r1.y+r1.height,r2.y+r2.height,objectiveRect?.y+objectiveRect?.height||0,detailRect?.y+detailRect?.height||0,showPause?pause.y+pause.height:0);
  const reservedTop=Math.min(H-safe.bottom,Math.ceil(hudBottom+6));
  // Bottom control islands are placement guidance; controls worker decides drawing and input.
  const islandH=Math.max(60,Math.min(166,H*.215));
  const islandY=Math.max(reservedTop+18,H-safe.bottom-islandH-8);
  const islands={
    left:{x:left,y:islandY,width:Math.min(W*.34,Math.max(40,avail*.43)),height:Math.max(0,H-safe.bottom-islandY-8)},
    right:{x:right-Math.min(W*.34,Math.max(40,avail*.43)),y:islandY,width:Math.min(W*.34,Math.max(40,avail*.43)),height:Math.max(0,H-safe.bottom-islandY-8)}
  };
  const metadata={insets:{top:reservedTop,right:safe.right+margin,bottom:safe.bottom,left:safe.left+margin},controlZones:{...(showPause?{pause}:{}),player1:islands.left,player2:islands.right,gameplay:{x:left,y:reservedTop,width:avail,height:Math.max(0,islandY-reservedTop)}}};
  ctx.save();
  try{
    ctx.imageSmoothingEnabled=false;
    hudPlayer(ctx,Array.isArray(players)?players[0]:null,0,r1,compact);
    hudPlayer(ctx,Array.isArray(players)?players[1]:null,1,r2,compact);
    if(showPause)hudPause(ctx,pause);
    if(objectiveRect)hudObjective(ctx,mission,objectiveRect,compact);
    if(detailRect){
      if(extraVisible){
        const remaining=extraction?.countdown ?? extraction?.remaining ?? extraction?.timeLeft;
        const clock=remaining==null?'--:--':hudClock(remaining);
        const urgent=remaining!=null&&hudFinite(remaining,Infinity)<=10;
        const boarded=(Array.isArray(players)?players:[]).slice(0,2).filter(p=>p?.boarded||p?.extracted).length;
        hudProgress(ctx,detailRect,'LIFT',remaining==null?0:remaining,Math.max(1,hudFinite(extraction?.duration,60)),`${clock}  ${boarded}/2 ABOARD`,urgent);
      }else if(bossVisible){
        const health=hudFinite(devil?.health,0),max=Math.max(1,hudFinite(devil?.maxHealth,100));
        const label=(Math.round(hudClamp(health/max,0,1)*100)+'%  '+hudStr(devil?.name,'DEVIL').toUpperCase());
        hudProgress(ctx,detailRect,'BOSS',health,max,label,false);
      }
    }
    // Motion stays decorative; no flash, UI shake, runtime random or simulation write.
    if(!reducedMotion&&Number.isFinite(time)&&objectiveRect&&objectiveRect.width>80){
      const stride=8+(Math.floor(Math.max(0,time)*2)%3)*4;
      // Paint animation on the upper rail, away from the dedicated rescue text.
      hudRect(ctx,'rgba(241,202,114,0.65)',objectiveRect.x+objectiveRect.width-28,objectiveRect.y+1,stride,2);
    }
    if(mission?.paused){
      const cx=left+avail/2,cy=Math.min(H-safe.bottom-22,reservedTop+21);
      hudRect(ctx,'rgba(8,21,30,.9)',cx-39,cy-10,78,20);
      hudText(ctx,'PAUSED',cx,cy,72,12,HUD_GOLD,800,'center');
    }
  }catch(_err){/* Failed callbacks / hostile snapshots must not crash gameplay. */}
  finally{ctx.restore();}
  return metadata;
}
Object.assign(exports,{drawBroforceHud});
