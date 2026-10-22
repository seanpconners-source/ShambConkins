// Pinball table builder: tables are plain data in table millimetres (x right, y down toward the flippers),
// written with these helpers so every band table can mix the same parts. A real playfield is about 514 x 1067 mm
// (20.25" x 42"); the ball is 27 mm across. See README.md in this folder for the part list.
const DEG=Math.PI/180;
// Points on a circle arc from angle a0 to a1 (degrees, 0 = +x, 90 = +y/down), n segments.
function arc(cx,cy,r,a0,a1,n=Math.max(4,Math.ceil(Math.abs(a1-a0)/8))){const pts=[];for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*DEG;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return pts;}
// Cubic bezier points (each point [x,y] or [x,y,z]).
function bezier(p0,p1,p2,p3,n=16){const pts=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;pts.push(p0.map((_,k)=>a*p0[k]+b*p1[k]+c*p2[k]+d*p3[k]));}return pts;}
// Smooth path through points (Catmull-Rom), keeps any z column.
function spline(pts,n=8){const out=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];for(let j=0;j<n;j++){const t=j/n,t2=t*t,t3=t2*t;out.push(p1.map((_,k)=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3)));}}out.push(pts[pts.length-1].slice());return out;}

// timeScale < 1 runs the whole table slower than life (ball, flippers, spinners alike) so every shot keeps its line.
function tableBuilder({id,name,W=514,H=1067,gravity=1300,slope=6.5,drainY=1040,timeScale=1}={}){
 const def={id,name,W,H,gravity,slope,drainY,timeScale,segs:[],sensors:[],lines:[],holes:[],rails:[],magnets:[],flippers:[],lamps:[],drops:{},toys:[],captives:[],gi:[],flashers:[],discs:[],plunger:null,parts:{}};
 const part=(id,kind,extra={})=>{if(id){def.parts[id]={id,kind,...extra};}return id;};
 const seg=(a,b,o={})=>{def.segs.push({ax:a[0],ay:a[1],bx:b[0],by:b[1],r:o.r??3,kind:o.kind||'wall',e:o.e,fr:o.fr,id:o.id||null,pass:o.pass||null,look:o.look||null,layer:o.layer||null});};
 const T={def,arc,bezier,spline,
  // Wall along points. look: 'rail' (metal guide), 'wood', 'plastic', 'rubber', 'none' (invisible).
  wall(pts,o={}){for(let i=0;i<pts.length-1;i++)seg(pts[i],pts[i+1],{...o,kind:o.kind||(o.look==='rubber'?'rubber':'wall')});if(o.closed)seg(pts[pts.length-1],pts[0],o);return T;},
  post(x,y,r=6,o={}){seg([x,y],[x,y],{r,kind:'rubber',look:o.look||'post',...o});return T;},
  bumper(id,x,y,o={}){part(id,'bumper',{x,y,r:o.r||26,kick:o.kick||1500,label:o.label||'',color:o.color});seg([x,y],[x,y],{r:o.r||26,kind:'bumper',id,look:'bumper'});return T;},
  // Slingshot: triangle a (top), b (bottom outer), c (bottom inner); the a-c face kicks.
  sling(id,a,b,c,o={}){part(id,'sling',{a,b,c,kick:o.kick||950});seg(a,c,{kind:'sling',id,r:5,look:'rubber'});seg(a,b,{kind:'rubber',r:5,look:'rubber'});seg(b,c,{kind:'rubber',r:5,look:'rubber'});return T;},
  // Drop target bank: targets [[a,b],...] drop on a hit and pop back up when the rules reset the bank.
  drops(bank,targets,o={}){def.drops[bank]=targets.map((t,i)=>{const id=`${bank}${i}`;part(id,'drop',{bank,index:i,a:t[0],b:t[1],label:o.labels?.[i]||''});seg(t[0],t[1],{kind:'drop',id,r:3,e:.25});return id;});part(bank,'dropBank',{ids:def.drops[bank],labels:o.labels||[]});return T;},
  standup(id,a,b,o={}){part(id,'standup',{a,b,label:o.label||'',color:o.color});seg(a,b,{kind:'standup',id,r:3,e:.3});return T;},
  rollover(id,x,y,o={}){part(id,'rollover',{x,y,r:o.r||11,label:o.label||''});def.sensors.push({id,kind:'rollover',x,y,r:o.r||11});return T;},
  kickback(id,x,y,v,o={}){part(id,'kickback',{x,y,v});def.sensors.push({id,kind:'kickback',x,y,r:o.r||12,v});return T;},
  spinner(id,a,b,o={}){part(id,'spinner',{a,b,label:o.label||''});def.lines.push({id,kind:'spinner',a,b});return T;},
  // Line switch (orbit/loop/ramp-made switches): an event each time a ball crosses it.
  trigger(id,a,b,o={}){part(id,'trigger',{a,b});def.lines.push({id,kind:'trigger',a,b});return T;},
  // One-way gate: the ball passes moving along pass=[dx,dy] and is blocked coming back.
  gate(id,a,b,pass,o={}){const l=Math.hypot(...pass);part(id,'gate',{a,b,pass});seg(a,b,{kind:'gate',id,r:2,e:.3,pass:[pass[0]/l,pass[1]/l],look:'gate'});return T;},
  // Diverter / post that the rules can raise or drop (seg.on via the part state).
  // A switch with no geometry (e.g. a ramp diverter: rail exit.next {switch:id}); the rules flip parts[id].on.
  flag(id,o={}){part(id,'flag',{on:!!o.on});return T;},
  // With a === b it is a pop-up post (e.g. between the flippers); it fires a 'post' event when the ball hits it up.
  diverter(id,a,b,o={}){part(id,'diverter',{a,b,up:o.up!==false,r:o.r||4});seg(a,b,{kind:'diverter',id,r:o.r||4,e:.35,look:'diverter'});return T;},
  // Kicker hole / scoop / saucer / lock: catches a ball slower than maxSpeed; the rules eject it with eject=[vx,vy].
  // VUK (vertical up-kicker): a hole with toRail:'<railId>' fires the ball up onto that wireform at railSpeed mm/s.
  hole(id,x,y,o={}){part(id,'hole',{x,y,r:o.r||15,label:o.label||'',vuk:!!o.toRail});def.holes.push({id,x,y,r:o.r||15,maxSpeed:o.maxSpeed??1e9,hold:o.hold??.9,eject:o.eject||[0,1200],toRail:o.toRail||null,railSpeed:o.railSpeed||2200});return T;},
  // Ramp or wireform: the ball rides pts [[x,y,z],...] (z = mm above the playfield); entry is a line at the start,
  // the ball must cross it moving along the path. exit: {hole} to feed a hole, else it drops off the end.
  // noEntry: only a VUK can put the ball on it. carry: a conveyor (the ball moves at this speed whatever the slope,
  // e.g. through a creature's body); hidden: the ball isn't drawn while on it (the table art shows where it is).
  rail(id,pts,o={}){part(id,'rail',{look:o.look||'wire',color:o.color,width:o.width||40,label:o.label||''});def.rails.push({id,pts,look:o.look||'wire',width:o.width||40,entry:o.entry||null,exit:o.exit||{},minSpeed:o.minSpeed||0,noEntry:!!o.noEntry,carry:o.carry||0,hidden:!!o.hidden});return T;},
  // Magnet under the playfield. Rules switch parts[id].on (pull) and parts[id].grab (catch, hold holdT s, throw fling).
  magnet(id,x,y,o={}){part(id,'magnet',{x,y,r:o.r||40,on:false,grab:false,fling:o.fling||[0,400],holdT:o.holdT??1.2});def.magnets.push({id,x,y,r:o.r||40,force:o.force||9000});return T;},
  // Toy: a moving target (capsules [[ax,ay,bx,by,r],...] at rest pose). Rules set parts[id].tx/ty (offset from rest)
  // and it glides there at speed mm/s; a hit fires a 'toy' event. x,y = the drawing centre.
  toy(id,x,y,o={}){part(id,'toy',{x,y,w:o.w||80,h:o.h||70,label:o.label||'',tx:0,ty:0});def.toys.push({id,speed:o.speed||120,segs:(o.segs||[]).map(([ax,ay,bx,by,r])=>({ax,ay,bx,by,r:r??6}))});return T;},
  // Spinning disc set into the playfield: a ball crossing it is dragged round (rules set parts[id].spin, rad/s).
  disc(id,x,y,o={}){part(id,'disc',{x,y,r:o.r||40,spin:o.spin??3,label:o.label||''});def.discs.push({id,x,y,r:o.r||40,grip:o.grip??2.5});return T;},
  // Captive ball: sits in a closed channel (build the channel walls + posts yourself) and is knocked by the real ball.
  captive(id,x,y){part(id,'captive',{x,y});def.captives.push({id,x,y});return T;},
  // Flipper: pivot (x,y), length, rest/up angles in degrees, input 0 = left button, 1 = right button.
  flipper(id,x,y,o={}){part(id,'flipper',{});def.flippers.push({id,x,y,len:o.len||78,r0:o.r0||12,r1:o.r1||6.5,rest:o.rest*DEG,up:o.up*DEG,input:o.input??0,wUp:o.wUp||55,wDown:o.wDown||22,acc:o.acc||3500,e:o.e??.25,color:o.color});return T;},
  plunger(x0,x1,y,o={}){def.plunger={x0,x1,y,travel:o.travel||36,vmin:o.vmin||900,vmax:o.vmax||3300,auto:o.auto||2600};return T;},
  // General illumination bulbs (warm glow pools, dimmed together by m.gi) at each point.
  gi(points,o={}){for(const [x,y] of points)def.gi.push({x,y,color:o.color||'#ffd9a0',r:o.r||34});return T;},
  // Flasher dome: a coloured plastic dome that blasts light when the rules call m.flash(id).
  flasher(id,x,y,o={}){def.flashers.push({id,x,y,r:o.r||9,color:o.color||'#ff3b30',reach:o.reach||120});return T;},
  // Insert lamp drawn under the playfield art; the rules light it by id. shape circle | arrow | tri | rect | star.
  lamp(id,x,y,o={}){def.lamps.push({id,x,y,r:o.r||9,shape:o.shape||'circle',color:o.color||'#ff3b30',label:o.label||'',angle:o.angle||0,w:o.w,h:o.h});return T;},
 };
 return T;
}
// Mirror helpers for symmetric lower playfields: mx(x) reflects across centre line cx.
const mirror=(cx)=>p=>[2*cx-p[0],p[1],...p.slice(2)];

Object.assign(exports,{tableBuilder,arc,bezier,spline,mirror,DEG});
