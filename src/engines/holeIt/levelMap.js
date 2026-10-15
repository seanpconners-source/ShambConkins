// Hole.it level map: works like Bricks Breaker Quest's stage map (a scrolling snake of numbered tiles, Level 1 at the
// bottom, every cleared level replayable, the next one glowing, the rest padlocked, best stars under each tile, player 1
// picks, then both play that level), drawn in the Hole.it look: goal-card tiles with the level's first goal prop, the
// navy pills and gold accents of the in-game HUD, the HOLE IT logo and a green Play button.
// Everything is laid out in the HUD's 1080-wide units (u = screen width / 1080, like the in-game HUD).
const COLS=5,COL_X=[140,340,540,740,940],ROW_H=270,CARD_W=164,CARD_H=206;
// Stars for a clear, by how much of the clock is left (the real game shows none; Bricks Breaker Quest has them).
const starsFor=(left,time)=>left>=time*2/3?3:left>=time/3?2:1;
function tilePos(n){const j=Math.floor((n-1)/COLS),i=(n-1)%COLS;return {col:j%2?COLS-1-i:i,row:j};}

// h: drawing helpers shared with the game screen {rr,outlined,drawStar,greenButton,lockIcon}
// info(n) -> {thumb:canvas|null, score:bool} (may be slow: the map asks for at most one new level per frame)
function createLevelMap({W:getW,H:getH,top,cur,stars,who,info,h,onPick}){
 let scroll=null,drag=null,picked=0,toast=null,flash=null,t=0;
 const cache=new Map();
 const L=()=>{const W=getW(),H=getH(),u=Math.min(W,H*.95)/1080,hdr=Math.max(top+6,34*u);
  const statsY=hdr+168*u,statsH=Math.max(26,64*u),promptY=statsY+statsH+Math.max(18,40*u),mapTop=promptY+Math.max(16,34*u),playH=Math.max(44,118*u),mapBot=H-playH-Math.max(48,70*u);
  return {W,H,u,ox:(W-1080*u)/2,hdr,statsY,statsH,promptY,mapTop,mapBot,play:{x:W/2-Math.max(130,430*u)/2,y:mapBot+Math.max(14,26*u),w:Math.max(130,430*u),h:playH}};};
 const rowFor=n=>Math.floor((n-1)/COLS);
 const scrollFor=(n,l)=>Math.max(0,(rowFor(n)-1)*ROW_H*l.u);
 const maxScroll=l=>scrollFor(cur+40,l);
 const centre=(n,l)=>{const p=tilePos(n);return {x:l.ox+COL_X[p.col]*l.u,y:l.mapBot-(CARD_H*.62+40)*l.u-p.row*ROW_H*l.u+scroll};};
 function visible(l){const r0=Math.max(0,Math.floor((scroll-ROW_H*l.u)/(ROW_H*l.u))),r1=Math.ceil((scroll+l.mapBot-l.mapTop+ROW_H*l.u)/(ROW_H*l.u));return [r0*COLS+1,r1*COLS+COLS];}
 function infoFor(n,budget){if(cache.has(n))return cache.get(n);if(n>cur||budget.n<=0)return null;budget.n--;let v=null;try{v=info(n);}catch(e){console.warn(e);}cache.set(n,v);return v;}

 function drawBackground(x,l){const g=x.createLinearGradient(0,0,0,l.H);g.addColorStop(0,'#2a3463');g.addColorStop(.45,'#1d2445');g.addColorStop(1,'#141a33');x.fillStyle=g;x.fillRect(0,0,l.W,l.H);
  // the tray's plank floor, very faint
  x.strokeStyle='#ffffff0d';x.lineWidth=1;const ph=Math.max(10,38*l.u);for(let y=(scroll*.5)%ph;y<l.H;y+=ph){x.beginPath();x.moveTo(0,y);x.lineTo(l.W,y);x.stroke();const off=((Math.floor((y-(scroll*.5)%ph)/ph)*137)%260)*l.u;for(let xx=off;xx<l.W;xx+=260*l.u){x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+ph);x.stroke();}}
  const v=x.createRadialGradient(l.W/2,l.H*.45,l.W*.2,l.W/2,l.H*.45,Math.max(l.W,l.H)*.8);v.addColorStop(0,'#00000000');v.addColorStop(1,'#00000066');x.fillStyle=v;x.fillRect(0,0,l.W,l.H);}
 // HOLE IT: gold HOLE with a little hole for the O, sky-blue IT (the loading screen's logo colours)
 function drawLogo(x,l){const u=l.u,cy=l.hdr+82*u,fs=Math.max(30,128*u);x.save();x.font=`900 ${fs}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;x.textBaseline='middle';x.lineJoin='round';
  const parts=[['H','gold'],['O','hole'],['LE','gold'],[' ','gap'],['IT','blue']],wOf=p=>p[1]==='hole'?fs*.78:p[1]==='gap'?fs*.22:x.measureText(p[0]).width;
  const total=parts.reduce((a,p)=>a+wOf(p),0);let px=l.W/2-total/2;x.translate(0,0);
  for(const p of parts){const w=wOf(p);
   if(p[1]==='hole'){const r=fs*.36,cx=px+w/2;x.fillStyle='#7a2a10';x.beginPath();x.ellipse(cx,cy+fs*.04,r+fs*.07,r*.82+fs*.07,0,0,7);x.fill();const rg=x.createLinearGradient(0,cy-r,0,cy+r);rg.addColorStop(0,'#e8ecf2');rg.addColorStop(1,'#9aa0ab');x.fillStyle=rg;x.beginPath();x.ellipse(cx,cy+fs*.04,r,r*.82,0,0,7);x.fill();x.fillStyle='#05060a';x.beginPath();x.ellipse(cx,cy+fs*.06,r*.72,r*.58,0,0,7);x.fill();}
   else if(p[1]!=='gap'){const g=x.createLinearGradient(0,cy-fs*.45,0,cy+fs*.45);if(p[1]==='gold'){g.addColorStop(0,'#fff27a');g.addColorStop(1,'#ff9a1e');}else{g.addColorStop(0,'#bff3ff');g.addColorStop(1,'#3aa8ff');}
    x.lineWidth=fs*.2;x.strokeStyle=p[1]==='gold'?'#7a2a10':'#1a2a6a';x.textAlign='left';x.strokeText(p[0],px,cy);x.fillStyle=g;x.fillText(p[0],px,cy);}
   px+=w;}
  x.restore();}
 function pill(x,l,px,py,w,hh,draw){h.rr(x,px,py,w,hh,hh*.28);x.fillStyle='#2a3170';x.fill();x.strokeStyle='#6f7cdc';x.lineWidth=Math.max(1,3*l.u);x.stroke();draw(px,py,w,hh);}
 function drawStats(x,l){const u=l.u,y=l.statsY,hh=l.statsH,w=Math.max(110,300*u),gap=24*u,total=Object.values(stars).reduce((a,b)=>a+(+b||0),0);
  pill(x,l,l.W/2-w-gap/2,y,w,hh,(px,py,w2,h2)=>{h.drawStar(x,px+h2*.62,py+h2/2,h2*.36);h.outlined(x,`${total} / ${cur*3-3}`,px+w2*.58,py+h2/2+1,Math.max(12,30*u),'#fff','#141a33',undefined,800);});
  pill(x,l,l.W/2+gap/2,y,w,hh,(px,py,w2,h2)=>{h.outlined(x,`Next: Level ${cur}`,px+w2/2,py+h2/2+1,Math.max(12,30*u),'#fff','#141a33',undefined,800);});
  h.outlined(x,picked?`Level ${picked}!`:`${who}, pick a level`,l.W/2,l.promptY,Math.max(13,34*u),'#ffe27a','#141a33',undefined,800);}
 function drawPath(x,l,first,last){const u=l.u;x.fillStyle='#c9d0ff55';
  for(let n=Math.max(1,first-1);n<last;n++){const a=centre(n,l),b=centre(n+1,l),d=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(2,Math.round(d/(26*u)));
   for(let i=1;i<steps;i++){const f=i/steps,px=a.x+(b.x-a.x)*f,py=a.y+(b.y-a.y)*f;if(Math.abs(px-a.x)<CARD_W*.5*u&&Math.abs(py-a.y)<CARD_H*.5*u||Math.abs(px-b.x)<CARD_W*.5*u&&Math.abs(py-b.y)<CARD_H*.5*u)continue;x.beginPath();x.arc(px,py,Math.max(1.6,6*u),0,7);x.fill();}}}
 function drawTile(x,l,n,budget){const u=l.u,c=centre(n,l),w=CARD_W*u,hh=CARD_H*u,X=c.x-w/2,Y=c.y-hh/2,locked=n>cur,isCur=n===cur,sel=picked===n,st=+stars[n]||0;
  const pulse=isCur?1+Math.sin(t*4)*.035:1,sc=(sel?1.08:1)*pulse;x.save();x.translate(c.x,c.y);x.scale(sc,sc);x.translate(-c.x,-c.y);
  if(isCur){x.shadowColor='#ffd23a';x.shadowBlur=24*u+Math.sin(t*4)*8*u;}
  const g=x.createLinearGradient(0,Y,0,Y+hh);if(locked){g.addColorStop(0,'#6a6f8a');g.addColorStop(1,'#454a62');}else{g.addColorStop(0,'#6f80ee');g.addColorStop(1,'#4652c4');}
  h.rr(x,X,Y,w,hh,13*u);x.fillStyle=g;x.fill();x.shadowBlur=0;x.strokeStyle=isCur?'#ffd23a':locked?'#8c92b0':'#b4bdff';x.lineWidth=Math.max(1.2,(isCur?7:4)*u);x.stroke();
  const ix=X+13*u,iy=Y+13*u,iw=w-26*u;h.rr(x,ix,iy,iw,iw,10*u);x.fillStyle=locked?'#7f849e':'#9eabf0';x.fill();x.strokeStyle=locked?'#5d6280':'#5361cf';x.lineWidth=Math.max(1,3*u);x.stroke();
  if(locked)h.lockIcon(x,ix+iw/2,iy+iw/2,iw*.8);
  else{const inf=infoFor(n,budget);if(inf?.score)h.drawStar(x,ix+iw/2,iy+iw/2,iw*.34);else if(inf?.thumb){const ts=iw*1.04;x.drawImage(inf.thumb,ix+iw/2-ts/2,iy+iw/2-ts/2,ts,ts);}}
  h.outlined(x,String(n),c.x,Y+hh-24*u,Math.max(11,(n>999?34:42)*u),locked?'#d8dbe8':'#fff','#141a33',undefined,900);
  x.restore();
  if(!locked)for(let i=0;i<3;i++){const sx=c.x+(i-1)*40*u,sy=Y+hh+12*u+(i===1?6*u:0),r=17*u;if(i<st)h.drawStar(x,sx,sy,r);else{x.save();x.translate(sx,sy);x.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr2=k%2?r*.48:r;x.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}x.closePath();x.fillStyle='#141a40cc';x.fill();x.strokeStyle='#6f7cdc';x.lineWidth=Math.max(1,2.4*u);x.stroke();x.restore();}}
  // a gold arrow bobbing over the level to play next
  if(isCur&&!picked){const ay=Y-26*u+Math.sin(t*5)*7*u,s2=20*u;x.fillStyle='#ffd23a';x.strokeStyle='#7a2a10';x.lineWidth=Math.max(1,4*u);x.beginPath();x.moveTo(c.x-s2,ay-s2);x.lineTo(c.x+s2,ay-s2);x.lineTo(c.x,ay+s2*.6);x.closePath();x.stroke();x.fill();}}
 function draw(x,dt){t+=dt;const l=L();if(scroll===null)scroll=scrollFor(cur,l);if(toast)toast.t-=dt;if(flash)flash.t+=dt;
  drawBackground(x,l);drawLogo(x,l);drawStats(x,l);
  const [first,last]=visible(l),budget={n:1};
  x.save();x.beginPath();x.rect(0,l.mapTop,l.W,l.mapBot-l.mapTop+Math.max(14,26*l.u));x.clip();
  drawPath(x,l,first,last);for(let n=first;n<=last;n++){const c=centre(n,l);if(c.y<l.mapTop-CARD_H*l.u||c.y>l.mapBot+CARD_H*l.u)continue;drawTile(x,l,n,budget);}
  x.restore();
  // soft fade where the tiles scroll under the header
  const f=x.createLinearGradient(0,l.mapTop,0,l.mapTop+40*l.u);f.addColorStop(0,'#1d244599');f.addColorStop(1,'#1d244500');x.fillStyle=f;x.fillRect(0,l.mapTop,l.W,40*l.u);
  h.greenButton(x,l.play.x,l.play.y,l.play.w,l.play.h,`Play Level ${cur}`,t);
  if(flash){const a=Math.max(0,1-flash.t/.3);x.strokeStyle=`rgba(255,255,255,${a})`;x.lineWidth=3;x.beginPath();x.arc(flash.x,flash.y,flash.r*(1+flash.t*1.5),0,7);x.stroke();if(flash.t>.3)flash=null;}
  if(toast&&toast.t>0){x.globalAlpha=Math.min(1,toast.t*2);const tw=Math.min(l.W-30,760*l.u+60),th=Math.max(44,96*l.u),ty=l.H*.46;h.rr(x,l.W/2-tw/2,ty,tw,th,16*l.u);x.fillStyle='#141a33ee';x.fill();x.strokeStyle='#6f7cdc';x.lineWidth=2;x.stroke();
   h.outlined(x,toast.msg,l.W/2,ty+th/2+1,Math.max(12,30*l.u),'#fff','#141a33',undefined,800);x.globalAlpha=1;}}
 function pick(n){if(picked||n<1||n>cur)return false;picked=n;setTimeout(()=>onPick(n),260);return true;}
 function tap(p){const l=L();
  if(p.x>=l.play.x&&p.x<=l.play.x+l.play.w&&p.y>=l.play.y&&p.y<=l.play.y+l.play.h){flash={x:p.x,y:p.y,r:30,t:0};return pick(cur)?'pick':'';}
  if(p.y<l.mapTop||p.y>l.mapBot+20*l.u)return '';
  const [first,last]=visible(l);
  for(let n=first;n<=last;n++){const c=centre(n,l);if(Math.abs(p.x-c.x)<CARD_W*.55*l.u&&Math.abs(p.y-c.y)<CARD_H*.55*l.u){flash={x:c.x,y:c.y,r:CARD_W*.5*l.u,t:0};
   if(n>cur){toast={msg:`Level ${n} is locked: clear Level ${cur} first`,t:2.2};return 'locked';}return pick(n)?'pick':'';}}
  return '';}
 return {draw,
  down(p){drag={y:p.y,start:scroll??0,moved:0};},
  move(p){if(!drag)return;const dy=p.y-drag.y;drag.moved=Math.max(drag.moved,Math.abs(dy));scroll=Math.max(0,Math.min(maxScroll(L()),drag.start+dy));},
  up(p){const d=drag;drag=null;if(d&&d.moved<10)return tap(p);return '';},
  wheel(dy){scroll=Math.max(0,Math.min(maxScroll(L()),(scroll??0)-dy));},
  pick,get picked(){return picked;},get scroll(){return scroll;},centre:n=>centre(n,L())};
}
Object.assign(exports,{createLevelMap,starsFor});
