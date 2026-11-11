// Sonic 3 style level objects and the world that runs them with the runners (physics.js). Pure logic, no drawing:
// every object is a plain record {type,x,y,...}; the world steps physics, then objects, and pushes events
// ({k,...} on w.ev) for the game to turn into sounds, effects and score pop-ups. Values follow the Mega Drive game
// (Sonic Physics Guide): spring strengths, ring-loss circles, badnik bounce, invincibility frames, shield moves.
// Kinds: ring, spring (up/down/left/right/ul/ur/dl/dr, yellow/red), spikes (up/down/left/right), monitor (rings, shoes,
// star, life, fire/bubble/lightning shield, eggman), badniks (charger, thrower, shooter, flyer) + their shots, starpost,
// wall (breakable), platform (still / moving / falling / collapsing ledge), vine (swing), zipline, tube (roll tunnel
// zone), sign (end of act).
const P=require("src/engines/s3/physics.js");
const {C}=P;
const SPRING={yellow:10,red:16};
const CHAIN=[100,200,500,1000];// badniks in one bounce chain; the 16th gives 10000
// the runner's hit box: 8 wide each side, height radius minus 3 (Sonic 3)
const box=p=>{const [,hr]=P.radii(p);const ex=p.insta>0?16:0;return {x:p.x,y:p.y,w:8+ex,h:hr-3+ex};};
const hit=(b,o,w,h)=>Math.abs(b.x-o.x)<b.w+w&&Math.abs(b.y-o.y)<b.h+h;
const attacking=p=>p.rolling||p.jumping||p.spindash||p.star>0||p.insta>0;
const invulnerable=p=>p.inv>0||p.star>0||p.dead;

class World{
 constructor(T,objs=[],opt={}){this.T=T;this.objs=objs;this.switchers=opt.switchers||[];this.loose=[];this.shots=[];this.ev=[];
  this.frame=0;this.bottom=opt.bottom??T.h;this.rings=objs.filter(o=>o.type==='ring');
  for(const o of objs)init(o,this);}
 // one frame for every runner. inputs[i] = {l,r,u,d,jump,jumpPress}
 step(runners,inputs){this.frame++;
  for(let i=0;i<runners.length;i++){const p=runners[i];if(p.dead){deadStep(p,this);continue;}const inp=inputs[i]||{};
   if(p.grab>0)p.grab--;if(p.tubeCool>0)p.tubeCool--;p.py=p.y;
   if(p.tube){p.ev.length=0;tubeStep(p,this);}else if(p.cork){p.ev.length=0;corkStep(p,inp,this,i);}else P.step(p,inp,this.T,{switchers:this.switchers});for(const e of p.ev)this.ev.push({k:e,p:i});
   if(p.ground&&!p.rolling)p.chain=0;// the bounce chain ends back on your feet
   if(p.hang)hangStep(p,inp,this,i);
   for(const o of this.objs)if(!o.gone)touch(o,p,this,i,inp);
   solids(p,this,i);
   edges(p,this);
   if(p.y>this.bottom+64)die(p,this,i,'fall');}
  for(const o of this.objs)if(!o.gone)tick(o,this,runners);
  stepLoose(this,runners);stepShots(this,runners);}
 drain(){const e=this.ev;this.ev=[];return e;}
}
// the ends of the zone are walls (owner: running left at the start, or coasting on past the sign, fell off the map)
function edges(p,w){const L=12,R=w.T.w-12;
 if(p.x<L){p.x=L;if(p.xsp<0)p.xsp=0;if(p.gsp<0)p.gsp=0;}
 else if(p.x>R){p.x=R;if(p.xsp>0)p.xsp=0;if(p.gsp>0)p.gsp=0;}}
function init(o,w){
 if(o.type==='monitor'){o.w=o.w||30;o.h=o.h||32;o.solid=true;}
 if(o.type==='wall'){o.w=o.w||32;o.h=o.h||64;o.solid=true;}
 if(o.type==='platform'){o.w=o.w||64;o.h=o.h||16;o.solid=true;o.top=true;o.x0=o.x;o.y0=o.y;o.t=0;o.dx=0;o.dy=0;}
 if(o.type==='vine'){o.len=o.len||112;o.t=o.phase||0;o.hx=o.x;o.hy=o.y+o.len;}
 if(o.type==='zipline'){o.s=0;o.v=0;o.hx=o.x0;o.hy=o.y0;}
 if(o.type==='badnik'){o.alive=true;o.x0=o.x;o.y0=o.y;o.t=0;o.dir=o.dir||-1;o.cool=0;o.w=o.w||14;o.h=o.h||14;
  // the monkey's tree reaches down to the ground under it (drawing only)
  if(o.kind==='thrower'){let gy=Math.round(o.y0);while(gy<w.T.h&&!w.T.solid(Math.round(o.x+12),gy,'a',true))gy++;o.trunkY=gy+6;}}
 if(o.type==='spring'){o.color=o.color||'yellow';o.dir=o.dir||'up';o.w=o.w||16;o.h=o.h||8;o.pop=0;}
 if(o.type==='spikes'){o.dir=o.dir||'up';o.w=o.w||16;o.h=o.h||16;o.solid=true;}
 if(o.type==='tube'&&o.path)tubePath(o);
 if(o.type==='corkscrew'){o.turn=o.turn||480;o.r=o.r||64;o.x1=o.x0+o.turn*(o.turns||2);o.x=(o.x0+o.x1)/2;o.w=o.x1-o.x0;}
 if(o.type==='seesaw'){o.w=o.w||96;o.tilt=o.tilt||-1;o.h=8;o.gy=o.y;o.ball={side:o.tilt,y:0,vy:0,air:false};o.lift=0;o.top=seesawSurf(o,o.x);o.y=o.top+o.h/2;}
 if(o.type==='platform'&&o.move==='swing'){o.px=o.x;o.py=o.y;o.len=o.len||160;o.t=o.phase||0;swingPos(o);o.x0=o.x;o.y0=o.y;}
 if(o.type==='boss')bossInit(o);
 if(o.type==='spikelog'){o.w=o.w||64;o.h=o.h||22;o.solid=true;o.t=o.phase||0;o.y0=o.y;o.y=o.y0-o.h/2;}
}
// ---------------- warp tubes (owner, Nov 11: "launch you through the whole thing"; the physics roll snagged on the S-bends):
// a tube with a `path` (its centre line) carries a runner who reaches either mouth along the line at warp speed, then
// lets go at the far mouth with that speed in the exit direction. o.ride = the ball centre's line (the centre line moved
// down onto the floor by the tunnel half-height minus the ball radius), with running lengths.
function tubePath(o){const L=o.path,half=o.half??28,off=half-C.hrRoll,pts=[];
 L.forEach(([x,y],i)=>{const a=L[Math.max(0,i-1)],b=L[Math.min(L.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1;pts.push([x-dy/d*off,y+dx/d*off]);});
 const len=[0];for(let i=1;i<pts.length;i++)len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));o.ride=pts;o.rideLen=len;o.total=len[len.length-1];}
function rideAt(o,d){const P_=o.ride,L=o.rideLen;d=Math.max(0,Math.min(o.total,d));let i=1;while(i<L.length-1&&L[i]<d)i++;
 const a=P_[i-1],b=P_[i],seg=(L[i]-L[i-1])||1,k=(d-L[i-1])/seg;return {x:a[0]+(b[0]-a[0])*k,y:a[1]+(b[1]-a[1])*k,dx:(b[0]-a[0])/seg,dy:(b[1]-a[1])/seg};}
function tubeEnter(o,p,w,i){if(p.tube||p.dead||p.hang||p.tubeCool>0)return;const vx=p.ground?p.gsp*Math.cos(p.ang):p.xsp;
 // one way: in at the start mouth only (o.both = either end). Two-way let a runner bounced back off spikes past the exit
 // roll back in and warp the wrong way, again and again
 for(const end of o.both?[0,1]:[0]){const at=rideAt(o,end?o.total:0),out=end?1:-1;// out = which way along x leaves the tube at this mouth
  if(Math.abs(p.x-at.x)<22&&Math.abs(p.y-at.y)<30&&vx*out<-.5){
   const v=Math.max(11,Math.min(16,Math.abs(vx)*1.15));p.tube={o,d:end?o.total:0,dir:end?-1:1,v};
   if(!p.rolling)p.y+=C.hr-C.hrRoll;p.rolling=true;p.ground=false;p.jumping=false;p.spindash=false;p.crouch=false;p.onObj=null;p.fly=0;
   w.ev.push({k:'dash',p:i});return;}}}
function tubeStep(p,w){const T=p.tube,o=T.o;T.d+=T.dir*T.v;
 const done=T.dir>0?T.d>=o.total:T.d<=0,at=rideAt(o,T.d),dx=at.dx*T.dir,dy=at.dy*T.dir;
 p.x=at.x;p.y=at.y;p.xsp=dx*T.v;p.ysp=dy*T.v;p.gsp=p.xsp;p.facing=dx<0?-1:1;p.ground=false;p.rolling=true;
 if(done){p.tube=null;p.tubeCool=24;p.jumping=false;}}
// ---------------- the runner touches an object
function touch(o,p,w,i,inp){const b=box(p);
 switch(o.type){
 case 'ring':if(!o.got&&hit(b,o,6,6)){o.got=true;gain(p,w,i,1);}
  else if(!o.got&&p.shield==='lightning'&&Math.hypot(o.x-p.x,o.y-p.y)<64){o.got=true;w.loose.push({x:o.x,y:o.y,vx:0,vy:0,t:64,life:9999,magnet:true});}
  return;
 case 'spring':return spring(o,p,w,i);
 case 'monitor':return monitor(o,p,w,i);
 case 'corkscrew':return corkEnter(o,p,w,i);
 case 'boss':return bossTouch(o,p,w,i);
 case 'seesaw':return seesawTouch(o,p,w,i);
 case 'spikelog':if(o.spiky&&p.onObj===o&&p.ground)hurt(p,w,i,o.x,'spike');return;
 case 'badnik':if(o.hidden)return;if(o.alive&&hit(b,o,o.w,o.h)){if(attacking(p))popBadnik(o,p,w,i);else hurt(p,w,i,o.x);}return;
 case 'starpost':if(!o.lit&&hit(b,o,8,24)){o.lit=true;o.spin=60;p.check={x:o.x,y:o.y-24,rings:p.rings,time:w.frame};w.ev.push({k:'starpost',p:i,x:o.x,y:o.y});}return;
 case 'vine':if(!p.hang&&!p.dead&&!(p.grab>0)&&Math.hypot(p.x-o.hx,p.y-o.hy-16)<20){p.hang=o;o.who=p;p.ground=false;p.jumping=false;p.rolling=false;p.xsp=p.ysp=0;w.ev.push({k:'grab',p:i});}return;
 case 'zipline':if(!p.hang&&!p.dead&&!(p.grab>0)&&!o.who&&Math.hypot(p.x-o.hx,p.y-o.hy-20)<18){p.hang=o;o.who=p;o.v=Math.max(2,Math.abs(p.xsp||p.gsp));p.ground=false;p.jumping=false;p.rolling=false;w.ev.push({k:'grab',p:i});}return;
 // roll tunnel: inside it the runner curls up and keeps rolling forward (Green Hill style S-tube)
 case 'tube':if(o.path)return tubeEnter(o,p,w,i);if(Math.abs(p.x-o.x)<o.w/2&&Math.abs(p.y-o.y)<o.h/2&&p.ground&&!p.dead){const d=o.dir||1;
   if(!p.rolling){p.rolling=true;p.y+=C.hr-C.hrRoll;p.crouch=false;p.spindash=false;w.ev.push({k:'roll',p:i});}
   if(p.gsp*d<(o.min||6))p.gsp=(o.min||6)*d;p.facing=d;}return;
 case 'sign':if(!o.hit&&p.x>=o.x){o.hit=true;o.by=i;o.spin=150;w.ev.push({k:'sign',p:i,x:o.x,y:o.y});}return;
 case 'goal':if(!o.done&&p.x>=o.x){o.done=true;w.ev.push({k:'goal',p:i});}return;
 }}
function gain(p,w,i,n){const before=p.rings|0;p.rings=before+n;w.ev.push({k:'ring',p:i});
 if(Math.floor(p.rings/100)>Math.floor(before/100)){p.lives=(p.lives|0)+1;w.ev.push({k:'life',p:i});}}
// springs: up/down launch straight, sideways set ground speed and lock control, diagonals both
function spring(o,p,w,i){const b=box(p),v=SPRING[o.color];const d=o.dir;
 if(!hit(b,o,o.w/2,o.h/2+2))return;
 const up=d==='up'||d==='ul'||d==='ur',down=d==='down'||d==='dl'||d==='dr';
 if(d==='left'||d==='right'){const s=d==='left'?-1:1;if(Math.sign(p.x-o.x)!==s&&p.x!==o.x)return;// hit the face
  if(p.ground){p.gsp=v*s;p.lock=16;}else p.xsp=v*s;p.facing=s;o.pop=10;w.ev.push({k:'spring',p:i});return;}
 if(up&&(p.ysp<0&&!p.ground))return;// springs only fire from the top
 if(up&&p.y>o.y)return;if(down&&p.y<o.y)return;
 const vx=d==='ul'?-v:d==='ur'?v:d==='dl'?-v:d==='dr'?v:null;
 P.launch(p,vx,up?-v:v,{roll:false});if(vx)p.facing=Math.sign(vx);p.y=up?o.y-o.h/2-C.hr:o.y+o.h/2+C.hr;
 p.chain=0;o.pop=10;w.ev.push({k:'spring',p:i});}
function monitor(o,p,w,i){}
// monitors break when a curled-up runner lands on them or rolls into their side (checked as solid contact)
function breakMonitor(o,p,w,i){o.broken=true;o.solid=false;o.rise=0;w.ev.push({k:'monitor',p:i,x:o.x,y:o.y});
 if(!p.ground&&p.ysp>0)p.ysp=-p.ysp;// bounce off it
 o.giveTo=p;o.giveIdx=i;o.timer=32;}
function giveItem(o,w){const p=o.giveTo,i=o.giveIdx;if(!p)return;
 switch(o.item){
 case 'rings':gain(p,w,i,10);break;
 case 'shoes':p.shoes=20*60;w.ev.push({k:'shoes',p:i});break;
 case 'star':p.star=20*60;w.ev.push({k:'star',p:i});break;
 case 'life':p.lives=(p.lives|0)+1;w.ev.push({k:'life',p:i});break;
 case 'fire':case 'bubble':case 'lightning':p.shield=o.item;w.ev.push({k:o.item+'-shield',p:i});break;
 case 'eggman':hurt(p,w,i,p.x+p.facing,'eggman');break;
 default:p.shield='plain';w.ev.push({k:'shield',p:i});}}
// destroyed badnik: bounce like the Mega Drive game, chain score, an animal hops out
function popBadnik(o,p,w,i){o.alive=false;o.gone=true;
 if(!p.ground){if(p.y<o.y&&p.ysp>=0)p.ysp=-p.ysp;else if(p.ysp<0)p.ysp+=1;}
 p.chain=(p.chain|0)+1;const pts=p.chain>=16?10000:CHAIN[Math.min(3,p.chain-1)];p.score=(p.score|0)+pts;
 w.ev.push({k:'explode',p:i,x:o.x,y:o.y,pts});w.loose.push({x:o.x,y:o.y,vx:0,vy:-4,t:0,life:200,animal:true});}
// a hit: shields absorb it, rings scatter, no rings = dead
function hurt(p,w,i,fromX,why){if(invulnerable(p)||p.hang&&why!=='spike')return;
 if(p.hang){p.hang.who=null;p.hang=null;}
 if(p.shield){p.shield=null;P.knock(p,fromX);w.ev.push({k:'hurt',p:i,why});return;}
 if((p.rings|0)>0){scatter(p,w,i);P.knock(p,fromX);w.ev.push({k:'ring-loss',p:i,why});return;}
 die(p,w,i,why);}
// Sonic 3 ring loss: up to 32 rings in two circles of 16 (speed 4 then 2), 22.5° apart, mirrored left/right
function scatter(p,w,i){const n=Math.min(32,p.rings|0);p.rings=0;let ang=101.25*Math.PI/180,sp=4,flip=false;
 for(let k=0;k<n;k++){if(k===16){sp=2;ang=101.25*Math.PI/180;}
  let vx=Math.cos(ang)*sp,vy=-Math.sin(ang)*sp;if(flip){vx=-vx;ang+=22.5*Math.PI/180;}flip=!flip;
  w.loose.push({x:p.x,y:p.y,vx,vy,t:0,life:256});}}
function die(p,w,i,why){if(p.dead)return;p.dead=1;p.lives=(p.lives|0)-1;p.ground=false;p.xsp=0;p.ysp=-7;p.hang=null;p.shield=null;p.onObj=null;
 w.ev.push({k:'die',p:i,why});}
function deadStep(p,w){if(p.dead>=1&&p.dead<200){p.dead++;p.y+=p.ysp;p.ysp+=C.grv;}}
// respawn at the last starpost (or the start)
function respawn(p,start){const c=p.check||start;Object.assign(p,{x:c.x,y:c.y,xsp:0,ysp:0,gsp:0,ang:0,ground:false,dead:0,hurt:false,inv:0,
 rings:0,rolling:false,jumping:false,spindash:false,hang:null,onObj:null,cork:null,tube:null,shield:null,shoes:0,star:0,chain:0});}
// ---------------- solid objects (monitors, breakable walls, platforms): push the runner out, stand on tops
function solids(p,w,i){if(p.dead||p.hang)return;const [wr,hr]=P.radii(p);
 for(const o of w.objs){if(o.gone||!o.solid)continue;const hw=o.w/2+wr,hh=o.h/2+hr;
  const dx=p.x-o.x,dy=p.y-o.y;if(Math.abs(dx)>=hw||Math.abs(dy)>=hh)continue;
  if(o.type==='wall'&&breaks(o,p)){breakWall(o,p,w,i);continue;}
  if(o.type==='monitor'&&attacking(p)&&!(p.ysp<0&&!p.ground&&dy>0)){breakMonitor(o,p,w,i);continue;}
  if(o.type==='monitor'&&p.ysp<0&&!p.ground&&dy>0){p.ysp=0;p.y=o.y+o.h/2+hr;o.bump=8;continue;}
  const ox=hw-Math.abs(dx),oy=hh-Math.abs(dy),top=o.y-o.h/2;
  // land on the top: the feet were above it last frame (or already standing on it) and not moving up
  const wasAbove=(p.py??p.y)+hr<=top+4+(o.dy>0?o.dy:0);
  if(p.onObj===o||dy<0&&wasAbove&&(p.ysp>=0||p.ground)){
   if(o.type==='spikes'&&o.dir==='up'){p.y=top-hr;hurt(p,w,i,o.x,'spike');continue;}
   p.y=top-hr;if(!p.ground){const vx=p.xsp;P.land(p,0);p.gsp=vx;}p.onObj=o;p.ang=0;if(o.type==='platform')o.stood=true;continue;}
  if(o.top)continue;
  if(o.type==='spikes'&&(ox<oy?(dx<0?'left':'right'):'down')===o.dir){hurt(p,w,i,o.x,'spike');if(ox<oy)p.x+=dx<0?-ox:ox;else p.y+=oy;continue;}
  if(ox<oy){p.x+=dx<0?-ox:ox;if(p.ground){if(Math.sign(p.gsp)===-Math.sign(dx))p.gsp=0;}else if(Math.sign(p.xsp)===-Math.sign(dx))p.xsp=0;}
  else if(dy>0){p.y+=oy;if(p.ysp<0)p.ysp=0;}}}
// breakable walls: rolling or spin dashing fast enough (or the fire dash, or super/star) smashes them
const breaks=(o,p)=>p.star>0||p.shield==='fire'&&p.ability&&!p.ground||p.rolling&&Math.abs(p.ground?p.gsp:p.xsp)>=4.5||p.spindash;
function breakWall(o,p,w,i){o.gone=true;o.solid=false;w.ev.push({k:'break',p:i,x:o.x,y:o.y});}
// ---------------- object thinking each frame
function tick(o,w,runners){
 switch(o.type){
 case 'monitor':if(o.broken&&o.timer>0){o.timer--;o.rise++;if(o.timer===0)giveItem(o,w);}if(o.bump>0)o.bump--;return;
 case 'spring':if(o.pop>0)o.pop--;return;
 case 'starpost':if(o.spin>0)o.spin--;return;
 case 'sign':if(o.spin>0)o.spin--;return;
 case 'platform':platform(o,w,runners);return;
 case 'seesaw':seesawTick(o,w,runners);return;
 case 'boss':bossTick(o,w,runners);return;
 case 'spikelog':o.t++;o.spin=o.t*2*Math.PI/(o.period||150);o.spiky=Math.cos(o.spin)>.55;return;
 case 'vine':{o.t++;const amp=o.amp??0.9,per=o.period??140;o.ang=amp*Math.sin(o.t*2*Math.PI/per);o.hx=o.x+Math.sin(o.ang)*o.len;o.hy=o.y+Math.cos(o.ang)*o.len;return;}
 case 'zipline':if(o.who){const dx=o.x1-o.x0,dy=o.y1-o.y0,L=Math.hypot(dx,dy);o.v=Math.min(10,o.v+0.21875*dy/L);o.s=Math.min(L,o.s+o.v);
   o.hx=o.x0+dx*o.s/L;o.hy=o.y0+dy*o.s/L;if(o.s>=L){release(o.who,w,0,0);}}
  else if(o.s>0){o.s=Math.max(0,o.s-6);const dx=o.x1-o.x0,dy=o.y1-o.y0,L=Math.hypot(dx,dy);o.hx=o.x0+dx*o.s/L;o.hy=o.y0+dy*o.s/L;}return;
 case 'badnik':if(o.alive&&!o.still)badnik(o,w,runners);return;}}
function platform(o,w,runners){const px=o.x,py=o.y;o.t++;
 if(o.move==='swing')swingPos(o);
 else if(o.move==='h')o.x=o.x0+Math.sin(o.t*2*Math.PI/(o.period||180))*(o.range||64);
 else if(o.move==='v')o.y=o.y0+Math.sin(o.t*2*Math.PI/(o.period||180))*(o.range||64);
 else if(o.move==='fall'||o.move==='collapse'){if(o.stood&&!o.drop)o.drop=o.move==='collapse'?24:30;if(o.drop>0){o.drop--;if(o.drop===0)o.falling=true;}
  if(o.falling){o.vy=(o.vy||0)+0.21875;o.y+=o.vy;if(o.move==='collapse'&&o.vy>1)o.solid=false;if(o.y>w.bottom+200)o.gone=true;}}
 o.dx=o.x-px;o.dy=o.y-py;o.stood=false;
 // carry whoever stands on it
 for(const p of runners)if(p.onObj===o&&p.ground){p.x+=o.dx;p.y+=o.dy;}}
// ---------------- Act 2 set pieces (our own versions of the classic second-zone kinds)
// SWINGING PLATFORM: hangs from (px,py) on a chain `len` long and swings `amp` radians either way; carries riders
function swingPos(o){const a=(o.amp??.55)*Math.sin(o.t*2*Math.PI/(o.period||170));o.ang=a;o.x=o.px+Math.sin(a)*o.len;o.y=o.py+Math.cos(a)*o.len;}
// CORKSCREW: a raised track that twists round once every `turn` px from x0 for `turns` turns; its floor is at y at both
// ends. A runner who reaches the start on its feet at speed (>= ENTER) is carried round it (centre on a circle of r - hr
// round the axis, body turned with it, so it runs upside down over the top like a loop); its ground speed works as on
// flat ground (hold forward to keep top speed). Slower than STAY and it drops off; jump lets go along the body's up.
// There is no floor under it: too slow at the start and you fall to the road below (as in the second zone of Sonic 2).
const CORK_ENTER=4,CORK_STAY=2.5;
function corkPhase(o,x){return (x-o.x0)/o.turn*2*Math.PI;}
function corkEnter(o,p,w,i){if(p.cork||p.tube||p.dead||p.hang||!p.ground)return;const [,hr]=P.radii(p);
 if(Math.abs(p.x-o.x0)<10&&Math.abs(p.y+hr-o.y)<14&&p.gsp>=CORK_ENTER){p.cork={o};p.onObj=null;corkPlace(p,o);}}
function corkPlace(p,o){const [,hr]=P.radii(p),a=corkPhase(o,p.x),axis=o.y-o.r;p.y=axis+Math.cos(a)*(o.r-hr);p.ang=a;p.ground=true;p.cork.a=a;}
function corkStep(p,inp,w,i){const o=p.cork.o;p.frames++;
 const top=p.shoes>0?P.SHOES.top:C.top,acc=p.shoes>0?P.SHOES.acc:C.acc;
 if(inp.jumpPress){const a=corkPhase(o,p.x);p.cork=null;p.ground=false;p.xsp=p.gsp;p.ysp=-C.jmp*Math.cos(a);
  if(!p.rolling)p.y+=C.hr-C.hrRoll;p.jumping=true;p.rolling=true;p.ang=0;p.ev.push('jump');return;}
 if(p.rolling){p.gsp=Math.max(0,p.gsp-C.rollFrc-(inp.l?C.rollDec:0));}
 else if(inp.r){if(p.gsp<top)p.gsp=Math.min(top,p.gsp+acc);}
 else if(inp.l){p.gsp-=C.dec;}
 else p.gsp=Math.max(0,p.gsp-C.frc);
 p.facing=1;p.x+=p.gsp;p.xsp=p.gsp;p.ysp=0;
 if(p.x>=o.x1){const [,hr]=P.radii(p);p.cork=null;p.x=Math.max(p.x,o.x1);p.y=o.y-hr;p.ang=0;p.ground=true;return;}
 if(p.gsp<CORK_STAY){p.cork=null;p.ground=false;p.ang=0;p.xsp=p.gsp;p.ysp=0;return;}
 corkPlace(p,o);}
// SEESAW: a plank on a pivot at (x,y) (y = the ground under it), a heavy ball resting on the low end. Land on the high end
// and your end goes down, flinging the ball up; it comes down on the end that is now high, which slams down and fires
// whoever stands on the other end high into the air (Sonic 2's seesaw). o.tilt = which end is down (-1 left, 1 right).
const SEE_H=24;// the high end stands 24 px above the low end
// the plank's top at x: the low end 6 px above the ground (o.gy), the high end SEE_H above that
function seesawSurf(o,x,tilt=o.tilt){const u=Math.max(-1,Math.min(1,(x-o.x)/(o.w/2)));return o.gy-6-SEE_H*(1-u*tilt)/2;}
function seesawTouch(o,p,w,i){if(p.dead||p.hang||p.tube||p.cork)return;const [wr,hr]=P.radii(p);if(Math.abs(p.x-o.x)>o.w/2+wr*.5)return;
 const s=seesawSurf(o,p.x),feet=p.y+hr;
 if(p.onObj===o)return;
 // land on it from above, or step onto the low end from the ground beside it
 const landing=!p.ground&&p.ysp>=0&&feet>=s-2&&p.py+hr<=s+8,stepping=p.ground&&Math.abs(feet-s)<10;
 if(!landing&&!stepping)return;
 const side=p.x<o.x?-1:1,hard=landing&&p.ysp>=1.5;
 if(!p.ground){const vx=p.xsp;P.land(p,0);p.gsp=vx;}p.onObj=o;p.ang=0;p.y=seesawSurf(o,p.x)-P.radii(p)[1];
 if(hard&&side!==o.tilt){// came down on the high end: it goes down, the ball flies
  o.tilt=side;o.lift=10;const b=o.ball;if(b.side!==side){b.air=true;b.vy=-Math.min(11,6+p.ysp*.6);b.y=0;w.ev.push({k:'seesaw',x:o.x,y:o.y});}}}
function seesawTick(o,w,runners){if(o.lift>0)o.lift--;const b=o.ball;
 if(b.air){b.y+=b.vy;b.vy+=0.21875;
  if(b.y>=0&&b.vy>0){b.y=0;b.air=false;const v=b.vy;// lands on its end: that end slams down, the other end fires its rider
   o.tilt=b.side;o.lift=10;w.ev.push({k:'seesaw',x:o.x,y:o.y});
   // fired like a spring (not a jump: letting go of jump would cut a jump's rise short), curled up
   for(const p of runners)if(p.onObj===o&&!p.dead&&Math.sign(p.x-o.x||1)!==b.side){p.onObj=null;P.launch(p,0,-Math.max(10.5,v*1.15),{roll:true});p.gsp=0;w.ev.push({k:'spring',p:runners.indexOf(p)});}}}
 // keep riders on the plank (it is a slope that changes with the tilt)
 // o.y is what physics reads while someone stands on it (physics.js: y = o.y - o.h/2 - hr): parked so that is the plank
 // under the rider (or under the middle when nobody is on it)
 o.top=seesawSurf(o,o.x);
 for(const p of runners){if(p.onObj!==o)continue;const [,hr]=P.radii(p);if(!p.ground||Math.abs(p.x-o.x)>o.w/2+4){p.onObj=null;continue;}
  o.top=seesawSurf(o,p.x);p.y=o.top-hr;}
 o.y=o.top+o.h/2;}
// ---------------- MINI-BOSS (end of Act 1; our own design, the Sonic 3 first-act mould): a domed pod with a flamethrower
// on each side and a pilot in the dome. A one-screen arena (o.x0..o.x1, floor o.gy): stepping in closes it (event
// 'boss-start': the game locks the camera and plays the boss song). It loops: HOVER high, drifting over the runner (out of
// a jump's reach); SINK low; FLAME: both jets fire sideways at the runner's height (stand clear of its sides; it can be
// hit from above or below); RISE. A rolling/jumping runner hitting it takes one of its HP (bounce off, 40 frames of
// flashing); 0 HP = WRECK (explosions, it falls) then 'boss-down' (the arena opens, the act goes on to the sign).
// Everyone dead or out of the arena = it resets and waits ('boss-reset').
// it sets down LOW (loY) so the jets sweep the floor: jump over them, come down on top of it
const BOSS={hp:6,hiY:-170,loY:-34,cycle:350,jet:78,jetH:12};// jet = how far the flames reach each side (as drawn on the sheet)
// autopilot for the bots (tests, online test bot): keep ~135 px away while it hovers, sinks and fires; when it rises
// again, run in and jump into it. Returns an input or null when no fight is on.
function bossBot(w,p){const o=w.objs.find(o=>o.type==='boss'&&o.active&&!o.done&&o.state!=='wreck');if(!o||p.dead)return null;
 const dx=o.x-p.x,ad=Math.abs(dx),inp={l:false,r:false,u:false,d:false,jump:false,jumpPress:false};
 if(!p.ground&&p.ysp<0)inp.jump=true;
 if(o.state==='cool'||o.state==='rise'&&o.y>o.gy-90){if(dx>0)inp.r=true;else inp.l=true;if(ad<50&&p.ground){inp.jump=inp.jumpPress=true;}return inp;}
 // stand ~120 px to one side of it: the side we're on if there's room there, else run under it (it's high while it
 // hovers) to the other side; while it is low and firing, hold still or jump a jet that reaches us
 const room=s=>s<0?o.x-100>o.x0+18:o.x+100<o.x1-18,side=p.x<o.x?-1:1,want=room(side)?side:-side,tx=o.x+want*100;
 if(o.fire>0&&ad>20&&ad<BOSS.jet+12&&p.ground){inp.jump=inp.jumpPress=true;return inp;}
 if(o.state==='hover'||o.state==='sink'&&o.y<o.gy-110||Math.abs(tx-p.x)>8&&want===side){if(tx>p.x+6)inp.r=true;else if(tx<p.x-6)inp.l=true;}
 return inp;}
// (a reset, when everyone in the arena died, brings it back to full health)
function bossInit(o){o.maxHp=o.maxHp||o.hp||BOSS.hp;o.hp=o.maxHp;o.state='wait';o.t=0;o.inv=0;o.x=o.x||(o.x0+o.x1)/2;o.y=o.gy+BOSS.hiY;o.vx=0;o.fire=0;o.w=52;o.h=40;o.done=false;o.active=false;}
function bossBody(o){return {x:o.x,y:o.y-4};}
function bossTouch(o,p,w,i){if(o.done||!o.active||p.dead||o.state==='wreck')return;const b=box(p),c=bossBody(o);
 // the flame jets: hurt anyone level with them at the sides
 if(o.fire>0){const dx=Math.abs(p.x-o.x),dy=Math.abs(p.y-(o.y+6));if(dx>22&&dx<BOSS.jet+8&&dy<BOSS.jetH+b.h){hurt(p,w,i,o.x,'fire');return;}}
 if(!hit(b,c,24,20))return;
 if(attacking(p)&&o.inv<=0){o.hp--;o.inv=40;w.ev.push({k:'boss-hit',p:i,x:o.x,y:o.y,hp:o.hp});
  // bounce off like the Mega Drive bosses: back the way you came, up if you came down on it
  p.xsp=-(p.xsp||p.gsp||(p.x<o.x?2:-2))*.6-(p.x<o.x?2:-2)*.3;p.gsp=p.xsp;if(!p.ground)p.ysp=p.y<o.y?-4:Math.max(2,p.ysp);
  if(o.hp<=0){o.state='wreck';o.t=0;o.fire=0;p.score=(p.score||0)+1000;w.ev.push({k:'boss-wreck',p:i,x:o.x,y:o.y});}}
 else if(!attacking(p)&&o.inv<=0)hurt(p,w,i,o.x,'boss');}
function bossTick(o,w,runners){if(o.maxHp===undefined)bossInit(o);if(o.done)return;if(o.inv>0)o.inv--;
 const inside=runners.filter(p=>!p.dead&&p.x>o.x0&&p.x<o.x1);
 if(!o.active){if(inside.some(p=>p.x>o.x0+48)){o.active=true;o.state='hover';o.t=0;w.ev.push({k:'boss-start',x0:o.x0,x1:o.x1});}return;}
 // keep the fighters inside the closed arena
 for(const p of runners){if(p.dead)continue;if(p.x<o.x0+12){p.x=o.x0+12;if(p.xsp<0)p.xsp=0;if(p.gsp<0)p.gsp=0;}if(p.x>o.x1-12&&o.state!=='gone'){p.x=o.x1-12;if(p.xsp>0)p.xsp=0;if(p.gsp>0)p.gsp=0;}}
 if(!inside.length&&o.state!=='wreck'){o.active=false;bossInit(o);w.ev.push({k:'boss-reset'});return;}
 o.t++;const p=inside[0]||runners[0],lo=o.gy+BOSS.loY,hi=o.gy+BOSS.hiY,minX=o.x0+70,maxX=o.x1-70;
 if(o.state==='wreck'){o.fire=0;o.y=Math.min(o.gy-20,o.y+Math.min(4,o.t*.05));if(o.t%8===0)w.ev.push({k:'boss-boom',x:o.x+(Math.random()-.5)*50,y:o.y+(Math.random()-.5)*30});
  if(o.t>=150){o.done=true;o.state='down';w.ev.push({k:'boss-down',x:o.x,y:o.y});}return;}
 // the cycle (frames): hover 110 · sink 40 · wind-up 25 (low, about to fire) · FLAME 60 · COOL 80 (low, jets smoking:
 // the opening to jump on it) · rise 35
 const k=o.t%BOSS.cycle;
 if(k<110){o.state='hover';o.fire=0;const goal=Math.max(minX,Math.min(maxX,p.x));o.x+=Math.max(-1.6,Math.min(1.6,(goal-o.x)*.03));o.y+=(hi+Math.sin(o.t*.08)*6-o.y)*.08;}
 else if(k<150){o.state='sink';o.y+=(lo-o.y)*.1;}
 else if(k<175){o.state='windup';o.y=lo+Math.sin(o.t*.9)*1.5;}
 else if(k<235){o.state='flame';o.fire=k-175+1;o.y=lo;if(k===175)w.ev.push({k:'boss-fire',x:o.x,y:o.y});}
 else if(k<315){o.state='cool';o.fire=0;o.y=lo;}
 else{o.state='rise';o.fire=0;o.y+=(hi-o.y)*.08;}}
// held on a vine or zip line: follow the handle; jump lets go with its swing
function hangStep(p,inp,w,i){const o=p.hang;if(!o)return;
 p.x=o.hx;p.y=o.hy+(o.type==='vine'?16:20);p.facing=o.type==='zipline'?Math.sign(o.x1-o.x0)||1:p.facing;
 if(inp.jumpPress){let vx=0,vy=-4;
  if(o.type==='vine'){const per=o.period??140,amp=o.amp??0.9,dang=amp*Math.cos(o.t*2*Math.PI/per)*2*Math.PI/per;vx=Math.cos(o.ang)*o.len*dang;vy=-4-Math.abs(Math.sin(o.ang)*o.len*dang)*.5;}
  else{const dx=o.x1-o.x0,dy=o.y1-o.y0,L=Math.hypot(dx,dy);vx=o.v*dx/L;vy=Math.min(-4,o.v*dy/L-4);}
  release(p,w,vx,vy,true);w.ev.push({k:'jump',p:i});}}
function release(p,w,vx,vy,jumped){const o=p.hang;if(o)o.who=null;p.hang=null;p.grab=24;p.xsp=vx;p.ysp=vy;p.ground=false;
 if(jumped){p.jumping=true;p.rolling=true;p.y+=C.hr-C.hrRoll;}}
// ---------------- badniks (our own designs in the Sonic 3 first-zone mould)
//  charger: patrols the ground, revs when it sees you ahead, then charges
//  thrower: climbs up and down a tree trunk, lobs a coconut when you're near
//  shooter: a plant that spits two spiked seeds up-left and up-right every 2 seconds
//  flyer:   hovers in a figure-eight and dives at a runner below
function nearest(o,runners){let best=null,bd=1e9;for(const p of runners){if(p.dead)continue;const d=Math.abs(p.x-o.x);if(d<bd){bd=d;best=p;}}return best;}
function badnik(o,w,runners){o.t++;const T=w.T,p=nearest(o,runners);
 // fish: waits under the water (o.y0 = the surface) and leaps out in an arc every `period` frames, through the bridge
 // planks above it (only touchable while out of the water)
 if(o.kind==='fish'){const per=o.period||150,u=((o.t+(o.phase||0))%per)/84;
  if(u<1){o.hidden=false;o.y=o.y0-Math.sin(u*Math.PI)*(o.jump||190);o.up=u<.5;}else{o.hidden=true;o.y=o.y0+16;}return;}
 if(o.kind==='charger'){
  if(o.state==='rev'){if(--o.cool<=0){o.state='charge';}return;}
  const sp=o.state==='charge'?4:1;const nx=o.x+o.dir*sp;
  // turn at walls and ledges: probe the ground ahead
  const ahead=P.sense(T,nx+o.dir*14,o.y,0,1,'a',true);
  if(ahead===null||ahead>20||P.sense(T,nx,o.y-8,o.dir,0,'a',false)!==null&&P.sense(T,nx,o.y-8,o.dir,0,'a',false)<14){o.dir=-o.dir;o.state='walk';return;}
  o.x=nx;const g=P.sense(T,o.x,o.y,0,1,'a',true);if(g!==null)o.y+=g-o.h;
  if(o.state!=='charge'&&p&&Math.abs(p.y-o.y)<40&&Math.sign(p.x-o.x)===o.dir&&Math.abs(p.x-o.x)<128){o.state='rev';o.cool=24;w.ev.push({k:'rev-badnik',x:o.x,y:o.y});}
  if(o.state==='charge'&&Math.abs(o.x-o.x0)>320){o.state='walk';}
  return;}
 if(o.kind==='thrower'){o.y=o.y0+Math.sin(o.t/50)*(o.climb??40);if(o.cool>0)o.cool--;
  if(p&&o.cool===0&&Math.abs(p.x-o.x)<160&&p.y>o.y-80){const dx=p.x-o.x;w.shots.push({x:o.x,y:o.y,vx:Math.sign(dx)*Math.min(3,Math.abs(dx)/40),vy:-3,g:0.15,r:6,life:180,kind:'coconut'});o.cool=120;w.ev.push({k:'throw',x:o.x,y:o.y});}
  return;}
 if(o.kind==='shooter'){if(++o.cool>=120&&p&&Math.abs(p.x-o.x)<240){o.cool=0;for(const s of [-1,1])w.shots.push({x:o.x,y:o.y-12,vx:1.5*s,vy:-4,g:0.15,r:5,life:150,kind:'seed'});w.ev.push({k:'shoot',x:o.x,y:o.y});}
  return;}
 if(o.kind==='flyer'){if(o.state==='dive'){o.y+=3;o.x+=o.dir*1.5;if(o.y>o.y0+160||P.sense(T,o.x,o.y+o.h,0,1,'a',true)===0){o.state='up';}return;}
  if(o.state==='up'){o.y-=1.5;if(o.y<=o.y0)o.state=null;return;}
  o.x=o.x0+Math.sin(o.t/60)*64;o.y=o.y0+Math.sin(o.t/30)*12;
  if(p&&o.cool--<=0&&Math.abs(p.x-o.x)<40&&p.y>o.y){o.state='dive';o.dir=Math.sign(p.x-o.x)||1;o.cool=180;}
  return;}}
function stepShots(w,runners){for(let k=w.shots.length-1;k>=0;k--){const s=w.shots[k];s.x+=s.vx;s.y+=s.vy;s.vy+=s.g||0;
 if(--s.life<=0||w.T.solid(s.x,s.y,'a',true)){w.shots.splice(k,1);continue;}
 for(let i=0;i<runners.length;i++){const p=runners[i];if(p.dead||invulnerable(p))continue;const b=box(p);if(!hit(b,s,s.r,s.r))continue;
  // elemental shields bounce shots away (Sonic 3 & Knuckles)
  if(p.shield&&p.shield!=='plain'){s.vx=-s.vx*1.5;s.vy=-3;w.ev.push({k:'deflect',p:i});continue;}
  hurt(p,w,i,s.x,'shot');w.shots.splice(k,1);break;}}}
// scattered rings: fall, bounce off floors losing a quarter of their speed, blink out after 256 frames; can't be
// picked up for the first 64. Lightning shield rings fly to the runner. Animals from badniks hop away.
function stepLoose(w,runners){for(let k=w.loose.length-1;k>=0;k--){const r=w.loose[k];r.t++;
 if(r.magnet){const p=nearest(r,runners);if(!p){w.loose.splice(k,1);continue;}const dx=p.x-r.x,dy=p.y-r.y,d=Math.hypot(dx,dy)||1;r.vx+=dx/d*0.5;r.vy+=dy/d*0.5;r.vx*=.96;r.vy*=.96;r.x+=r.vx;r.y+=r.vy;
  const b=box(p);if(hit(b,r,8,8)){w.loose.splice(k,1);gain(p,w,runners.indexOf(p),1);}continue;}
 if(r.animal){r.vy+=0.21875;r.x+=r.vx;r.y+=r.vy;if(w.T.solid(r.x,r.y+8,'a',true)){r.vy=-4;r.vx=r.vx||(Math.random()<.5?-2:2);}if(r.t>r.life)w.loose.splice(k,1);continue;}
 r.vy+=0.09375;r.x+=r.vx;r.y+=r.vy;
 if(r.vy>0&&w.T.solid(r.x,r.y+8,'a',true)){r.vy=-r.vy*0.75;r.y-=1;}
 if(r.t>r.life){w.loose.splice(k,1);continue;}
 if(r.t<64)continue;
 for(let i=0;i<runners.length;i++){const p=runners[i];if(p.dead||p.hurt)continue;if(hit(box(p),r,6,6)){w.loose.splice(k,1);gain(p,w,i,1);break;}}}}
Object.assign(exports,{bossBot,World,respawn,hurt,die,SPRING,attacking,box});
