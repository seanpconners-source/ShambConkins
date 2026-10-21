// The Doom automap: lines the player has seen (red walls, brown floor steps, yellow ceiling steps; grey unseen lines
// with the computer map), the white player arrow, follow mode, zoom and pan. Drawn into the 8-bit screen.
const WALL=176,FDWALL=64,CDWALL=231,TSWALL=96,UNSEEN=99,PLAYER=209,THING=112;
const ARROW=[[-7,0,8,0],[8,0,4,2],[8,0,4,-2],[-7,0,-9,2],[-7,0,-9,-2],[-4,0,-6,2],[-4,0,-6,-2]];
class Automap{
 constructor(v){this.v=v;this.on=false;this.follow=true;this.scale=0.2;this.cx=0;this.cy=0;}
 toggle(){this.on=!this.on;if(this.on)this.follow=true;}
 zoom(k){this.scale=Math.max(0.02,Math.min(2,this.scale*k));}
 pan(dx,dy){this.follow=false;this.cx-=dx/this.scale;this.cy+=dy/this.scale;}
 draw(game,pl,viewH){
  const r=this.v.r,scr=r.screen,W=r.W,H=viewH,lv=game.lv,mo=pl.mo;if(this.follow&&mo){this.cx=mo.x;this.cy=mo.y;}
  scr.fill(0,0,W*H);const k=this.scale*r.H/200,ox=W/2,oy=H/2;
  const px=x=>ox+(x-this.cx)*k,py=y=>oy-(y-this.cy)*k;
  const line=(x1,y1,x2,y2,c)=>{let dx=x2-x1,dy=y2-y1;const n=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)));if(n>4000)return;
   for(let i=0;i<=n;i++){const x=Math.round(x1+dx*i/(n||1)),y=Math.round(y1+dy*i/(n||1));if(x>=0&&y>=0&&x<W&&y<H)scr[y*W+x]=c;}};
  const all=pl.powers[4]||pl.cheats&8;
  for(const ln of lv.lines){if(ln.flags&128)continue;let c;
   if(ln.flags&256){if(!ln.backsector||ln.flags&32)c=WALL;else if(ln.special===39||ln.special===97)c=WALL+8;else if(ln.backsector.floorheight!==ln.frontsector.floorheight)c=FDWALL;else if(ln.backsector.ceilingheight!==ln.frontsector.ceilingheight)c=CDWALL;else if(all)c=TSWALL;else continue;}
   else if(all)c=UNSEEN;else continue;
   line(px(ln.v1.x),py(ln.v1.y),px(ln.v2.x),py(ln.v2.y),c);}
  if(pl.cheats&16)for(const m of game.mobjs())if(m!==mo)for(const [a,b,c,d] of [[-6,-6,6,6],[-6,6,6,-6]])line(px(m.x+a),py(m.y+b),px(m.x+c),py(m.y+d),THING);
  if(mo){const ca=Math.cos(mo.angle/4294967296*Math.PI*2),sa=Math.sin(mo.angle/4294967296*Math.PI*2),s=Math.max(16/7,9/(7*k));
   for(const [a,b,c,d] of ARROW){const R=(x,y)=>[mo.x+(x*ca-y*sa)*s,mo.y+(x*sa+y*ca)*s];const [x1,y1]=R(a,b),[x2,y2]=R(c,d);line(px(x1),py(y1),px(x2),py(y2),PLAYER);}}
  const name=game.levelName();this.v.text(name,Math.ceil(-this.v.ox/this.v.s)+2,(H/r.H*200)-9);}
}
Object.assign(exports,{Automap});
