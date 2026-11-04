// SUNDOWN SHOWDOWN controls: arcade stick + two buttons per player, drawn floating on the canvas.
// Touch: each player owns a zone (solo: the whole screen; 2P: their half). In the zone's outer part a finger anywhere
// is a floating stick (move, aim 8 ways, down = duck); the inner part holds FIRE (hold = keep shooting) and JUMP (hold =
// higher). A thumb can roll from one button to the other. Down + JUMP = slide (or drop off a balcony).
// Keys: P1 A/D/W/S + F or J fire + Space or K jump; P2 arrows + . or 0 fire + Enter or / jump (solo: either set).
// Gamepads: pad 1 = P1, pad 2 = P2; stick/D-pad, A = jump, X/B/RB/RT = fire.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const DIRS=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];

function createControls(s,c,{np=2,solo=false,onDown=null}={}){
 const st=[0,1].slice(0,np).map(()=>({stick:null,fire:null,jump:null,jumpN:0,keys:{},padJump:false,bot:null,lastTouch:0}));
 let W=s.W,H=s.H,Z=[],touched=false,R=40;
 const coarse=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;

 function layout(w,h){W=w;H=h;
  const r=clamp(Math.min(W,H)*.085,30,54),m=Math.max(14,r*.45);R=r*1.15;
  if(solo||np===1){Z=[{x0:0,x1:W,stickX1:W*.5,fire:{x:W-m-r*2.45,y:H-m-r,r},jump:{x:W-m-r*.85,y:H-m-r*2.35,r:r*.82},rest:{x:m+R*1.3,y:H-m-R*1.3},side:1}];return;}
  const half=W/2;
  Z=[{x0:0,x1:half,stickX1:half*.56,fire:{x:half-m-r,y:H-m-r,r},jump:{x:half-m-r*.95,y:H-m-r*3.15,r:r*.82},rest:{x:m+R*1.3,y:H-m-R*1.3},side:1},
     {x0:half,x1:W,stickX1:half+half*.44,fire:{x:half+m+r,y:H-m-r,r},jump:{x:half+m+r*.95,y:H-m-r*3.15,r:r*.82},rest:{x:W-m-R*1.3,y:H-m-R*1.3},side:-1}];
 }
 const zoneOf=px=>solo||np===1?0:px<W/2?0:1;
 const near=(b,p,k=1.45)=>Math.hypot(p.x-b.x,p.y-b.y)<=b.r*k;
 const inStickPart=(z,p)=>z.side>0?p.x<z.stickX1:p.x>z.stickX1;
 const owner=new Map();   // pointerId -> {i, kind:'stick'|'fire'|'jump'}

 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);touched=true;
  const i=zoneOf(p.x);if(onDown&&onDown(i,p))return;const q=st[i],z=Z[i];if(!q||!z)return;s.capture?.(ev);q.lastTouch=performance.now();
  let kind=null;
  if(near(z.fire,p))kind='fire';else if(near(z.jump,p))kind='jump';
  else if(inStickPart(z,p)&&!q.stick)kind='stick';
  else kind=!q.stick?'stick':Math.hypot(p.x-z.fire.x,p.y-z.fire.y)<Math.hypot(p.x-z.jump.x,p.y-z.jump.y)?'fire':'jump';
  if(kind==='stick'){const ox=clamp(p.x,z.x0+R*.6,z.x1-R*.6),oy=clamp(p.y,R*.6,H-R*.6);q.stick={id:ev.pointerId,ox,oy,x:p.x,y:p.y};}
  else if(kind==='fire')q.fire=ev.pointerId;
  else{q.jump=ev.pointerId;q.jumpN++;}
  owner.set(ev.pointerId,{i,kind});});
 s.on(c,'pointermove',ev=>{const o=owner.get(ev.pointerId);if(!o)return;ev.preventDefault();const q=st[o.i],z=Z[o.i],p=s.pointer(ev);
  if(o.kind==='stick'&&q.stick){const k=q.stick;k.x=p.x;k.y=p.y;const dx=p.x-k.ox,dy=p.y-k.oy,d=Math.hypot(dx,dy);
   if(d>R*1.3){const f=(d-R*1.3)/d;k.ox+=dx*f;k.oy+=dy*f;}return;}
  // a thumb rolling between the two buttons
  if(o.kind==='fire'&&near(z.jump,p,1.1)&&!near(z.fire,p,1.05)){o.kind='jump';q.fire=null;q.jump=ev.pointerId;q.jumpN++;}
  else if(o.kind==='jump'&&near(z.fire,p,1.1)&&!near(z.jump,p,1.05)){o.kind='fire';q.jump=null;q.fire=ev.pointerId;}});
 const up=ev=>{const o=owner.get(ev.pointerId);if(!o)return;owner.delete(ev.pointerId);s.release?.(ev);const q=st[o.i];
  if(o.kind==='stick'&&q.stick?.id===ev.pointerId)q.stick=null;if(q.fire===ev.pointerId)q.fire=null;if(q.jump===ev.pointerId)q.jump=null;};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);

 const KEYS={a:[0,'l'],d:[0,'r'],w:[0,'u'],s:[0,'d'],f:[0,'f'],j:[0,'f'],' ':[0,'j'],k:[0,'j'],
  arrowleft:[1,'l'],arrowright:[1,'r'],arrowup:[1,'u'],arrowdown:[1,'d'],'.':[1,'f'],'0':[1,'f'],enter:[1,'j'],'/':[1,'j']};
 const keyOwner=pi=>solo||np===1?0:pi;
 s.on(window,'keydown',ev=>{const k=KEYS[ev.key.toLowerCase()];if(!k)return;const i=keyOwner(k[0]),q=st[i];if(!q)return;ev.preventDefault();
  if(onDown&&!ev.repeat&&(k[1]==='j'||k[1]==='f')&&onDown(i,null))return;
  if(k[1]==='j'&&!q.keys.j)q.jumpN++;q.keys[k[1]]=true;});
 s.on(window,'keyup',ev=>{const k=KEYS[ev.key.toLowerCase()];if(!k)return;const q=st[keyOwner(k[0])];if(q)q.keys[k[1]]=false;});

 function pad(i){try{const pads=[...(navigator.getGamepads?.()||[])].filter(Boolean);return pads[solo?0:i]||null;}catch{return null;}}

 // this frame's input for player i: {x,y digital -1/0/1, fire, jump (held), jumps (presses since last read)}
 function read(i){const q=st[i];if(!q)return {x:0,y:0,fire:false,jump:false,jumps:0};
  if(q.bot)return q.bot;
  let x=0,y=0,fire=!!q.fire||!!q.keys.f,jump=!!q.jump||!!q.keys.j;
  if(q.keys.l||q.keys.r||q.keys.u||q.keys.d){x=(q.keys.r?1:0)-(q.keys.l?1:0);y=(q.keys.d?1:0)-(q.keys.u?1:0);}
  else if(q.stick){const k=q.stick,dx=k.x-k.ox,dy=k.y-k.oy,d=Math.hypot(dx,dy);
   if(d>R*.3){const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4));[x,y]=DIRS[(a+8)%8];
    // mostly-sideways pushes stay flat so running doesn't aim the gun up or down by accident
    if(y&&Math.abs(dy)<Math.abs(dx)*.55)y=0;}}
  const g=pad(i);
  if(g){const ax=g.axes[0]||0,ay=g.axes[1]||0,b=n=>!!g.buttons[n]?.pressed;
   const gx=(b(15)?1:0)-(b(14)?1:0)||(Math.abs(ax)>.4?Math.sign(ax):0),gy=(b(13)?1:0)-(b(12)?1:0)||(Math.abs(ay)>.5?Math.sign(ay):0);
   if(gx||gy){x=gx;y=gy;}if(b(2)||b(1)||b(5)||b(7))fire=true;const gj=b(0);if(gj&&!q.padJump)q.jumpN++;q.padJump=gj;if(gj)jump=true;}
  const jumps=q.jumpN;q.jumpN=0;
  return {x,y,fire,jump,jumps};
 }

 // floating controls: a resting stick ring, the stick where it's held, FIRE and JUMP
 function draw(x,{alpha=1,hidden=false}={}){if(hidden||!(touched||coarse))return;
  st.forEach((q,i)=>{const z=Z[i];if(!z)return;const col=np>1?(i?'255,140,200':'110,200,255'):'255,220,140';
   x.save();x.globalAlpha=alpha;
   const k=q.stick,cx=k?k.ox:z.rest.x,cy=k?k.oy:z.rest.y;
   x.lineWidth=3;x.strokeStyle=`rgba(${col},${k?.55:.28})`;x.fillStyle=`rgba(0,0,0,${k?.22:.12})`;x.beginPath();x.arc(cx,cy,R,0,7);x.fill();x.stroke();
   let kx=cx,ky=cy;if(k){const dx=k.x-k.ox,dy=k.y-k.oy,d=Math.hypot(dx,dy)||1,m=Math.min(d,R);kx=cx+dx/d*m;ky=cy+dy/d*m;}
   x.fillStyle=`rgba(${col},${k?.75:.35})`;x.beginPath();x.arc(kx,ky,R*.42,0,7);x.fill();
   for(const [b,label,on] of [[z.fire,'FIRE',!!q.fire],[z.jump,'JUMP',!!q.jump]]){
    x.fillStyle=on?`rgba(${col},.55)`:'rgba(0,0,0,.28)';x.strokeStyle=`rgba(${col},${on?.95:.5})`;x.lineWidth=on?4:3;
    x.beginPath();x.arc(b.x,b.y,b.r*(on?.94:1),0,7);x.fill();x.stroke();
    x.fillStyle=on?'#fff':`rgba(${col},.85)`;x.font=`900 ${Math.round(b.r*.36)}px "SC Nunito",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(label,b.x,b.y);}
   x.restore();});
 }
 const zones=()=>Z;
 // tests and the autopilot: set {x,y,fire,jump,jumps} for player i (null = back to real input)
 const setBot=(i,v)=>{if(st[i])st[i].bot=v;};
 const reset=()=>{for(const q of st){q.stick=null;q.fire=null;q.jump=null;q.jumpN=0;q.keys={};}owner.clear();};
 return {layout,read,draw,zones,setBot,reset,get touched(){return touched||coarse;},get stickR(){return R;}};
}
Object.assign(exports,{createControls});
