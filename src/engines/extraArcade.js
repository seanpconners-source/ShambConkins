const {clamp}=require("src/utils.js");
const {arcadeRounds}=require("src/engines/arcade.js");
const {circle, COLORS}=require("src/engines/session.js");
const {sound, vibrate}=require("src/audio.js");
const {duelInputs, ownedPointers}=require("src/engines/duelControls.js");
// Periodic lanes keep their spacing at the screen edge instead of teleporting
// into an unfair clump. Coordinates are shared by drawing and collision checks.
function crossyLaneObjects(lane, time, width = 680) {
 const offset = lane.offset + lane.speed * time;
 const first = Math.floor((-lane.length - offset) / lane.period);
 const last = Math.ceil((width + lane.length - offset) / lane.period);
 const out = [];
 for (let i = first; i <= last; i++) {
  const x = offset + i * lane.period;
  if (x + lane.length >= 0 && x <= width) out.push({ x, width: lane.length });
 }
 return out;
}
function crossySupported(lane, time, x, radius = 12, width = 680) {
 return crossyLaneObjects(lane, time, width).some(log => x >= log.x + radius * .4 && x <= log.x + log.width - radius * .4);
}
function crossyHit(lane, time, x, radius = 12, width = 680) {
 return crossyLaneObjects(lane, time, width).some(car => x + radius > car.x && x - radius < car.x + car.width);
}

async function crossy(s) {
 const [c, x, W, H] = s.canvas(680, 396), rowH = 34, top = 11;
 const laneDefs = [
  { row: 1, kind: 'river', speed: 42, length: 148, period: 213 },
  { row: 2, kind: 'river', speed: -55, length: 168, period: 238 },
  { row: 4, kind: 'road', speed: 96, length: 78, period: 252 },
  { row: 5, kind: 'road', speed: -125, length: 60, period: 216 },
  { row: 7, kind: 'road', speed: 82, length: 92, period: 284 },
  { row: 8, kind: 'road', speed: -103, length: 62, period: 230 }
 ].map(lane => ({ ...lane, offset: s.random() * lane.period }));
 const homes = Array.from({ length: 5 }, (_, i) => W * (.1 + i * .2));
 const rowY = row => top + (row + .5) * rowH;
 const freshFrog = () => ({ x: W / 2, row: 10, furthest: 10 });
 let api;
 const die = a => {
  if (a.respawn > 0) return;
  a.lives--; a.respawn = .65; a.score = Math.max(0, a.score - 20);
  sound('lose'); vibrate(18);
 };
 const move = (dx, dy) => {
  const a = api?.get();
  if (!a || s.paused || !s.alive || a.respawn > 0 || a.moveDelay > 0) return;
  a.moveDelay = .105;
  a.frog.x = clamp(a.frog.x + dx * 46, 15, W - 15);
  a.frog.row = clamp(a.frog.row + dy, 0, 10);
  if (a.frog.row < a.frog.furthest) {
   a.score += (a.frog.furthest - a.frog.row) * 10;
   a.frog.furthest = a.frog.row;
  }
 };
 return arcadeRounds(s, {
  duration: 40,
  instructions: 'George’s high score is on the line. Cross moving traffic, ride the river logs, and deliver the cabinet to five different homes. Three lives.',
  reset: () => ({ frog: freshFrog(), lives: 3, homes: Array(5).fill(false), respawn: 0, moveDelay: 0 }),
  bind: a => { api = a; s.dpad(move); s.hint('Arrows move one step. Logs carry you sideways. A filled home cannot take another cabinet. Each home +200; collision −20.'); },
  step: (a, dt) => {
   a.moveDelay = Math.max(0, a.moveDelay - dt);
   if (a.respawn > 0) {
    a.respawn -= dt;
    if (a.respawn <= 0) { if (a.lives <= 0) return false; a.frog = freshFrog(); }
    return true;
   }
   const frog = a.frog;
   if (frog.row === 0) {
    const home = homes.findIndex(h => Math.abs(frog.x - h) < 39);
    if (home < 0 || a.homes[home]) die(a);
    else {
     a.homes[home] = true; a.score += 200; frog.x = W / 2; frog.row = frog.furthest = 10;
     sound('win');
     if (a.homes.every(Boolean)) { a.score += 200; return false; }
    }
    return true;
   }
   const lane = laneDefs.find(l => l.row === frog.row);
   if (lane?.kind === 'river') {
    frog.x += lane.speed * dt;
    if (frog.x < 12 || frog.x > W - 12 || !crossySupported(lane, a.elapsed, frog.x, 12, W)) die(a);
   } else if (lane && crossyHit(lane, a.elapsed, frog.x, 12, W)) die(a);
   return true;
  },
  draw: a => {
   x.fillStyle = '#171d17'; x.fillRect(0, 0, W, H);
   for (let row = 0; row <= 10; row++) {
    const lane = laneDefs.find(l => l.row === row), y = top + row * rowH;
    x.fillStyle = lane?.kind === 'river' ? '#183943' : lane?.kind === 'road' ? '#30332f' : '#4b5938';
    x.fillRect(0, y, W, rowH - 1);
    if (lane?.kind === 'road') {
     x.strokeStyle = '#d3c37b66'; x.setLineDash([20, 18]); x.beginPath(); x.moveTo(0, y + rowH - 2); x.lineTo(W, y + rowH - 2); x.stroke(); x.setLineDash([]);
    }
    if (!lane) continue;
    for (const object of crossyLaneObjects(lane, a.elapsed, W)) {
     if (lane.kind === 'river') {
      x.fillStyle = '#8c603d'; x.fillRect(object.x, y + 6, object.width, rowH - 12);
      x.strokeStyle = '#b08854'; x.strokeRect(object.x + 4, y + 10, object.width - 8, rowH - 20);
     } else {
      x.fillStyle = lane.speed > 0 ? '#b46e4f' : '#899899'; x.fillRect(object.x, y + 5, object.width, rowH - 10);
      x.fillStyle = '#c3d1c4'; x.fillRect(object.x + (lane.speed > 0 ? object.width - 21 : 7), y + 9, 14, rowH - 18);
      x.fillStyle = '#171d17'; x.fillRect(object.x + 7, y + 2, 15, 4); x.fillRect(object.x + object.width - 22, y + rowH - 6, 15, 4);
     }
    }
   }
   for (let i = 0; i < homes.length; i++) {
    x.fillStyle = a.homes[i] ? '#b9ad6b' : '#183126'; x.fillRect(homes[i] - 36, top + 2, 72, rowH - 4);
    x.fillStyle = a.homes[i] ? '#24301c' : '#d3cba7'; x.font = '15px Arial'; x.textAlign = 'center'; x.fillText(a.homes[i] ? 'SAVED' : 'HOME', homes[i], top + 23);
   }
   if (a.respawn <= 0) {
    const y = rowY(a.frog.row);
    x.fillStyle = '#443e30'; x.fillRect(a.frog.x - 13, y - 15, 26, 29);
    x.fillStyle = COLORS[a.player]; x.fillRect(a.frog.x - 10, y - 12, 20, 17);
    s.sprite(x, a.player, a.frog.x, y - 3, 21);
    x.fillStyle = '#d5c684'; x.fillRect(a.frog.x - 10, y + 8, 20, 4);
   }
   s.status(`${s.players[a.player].name} · ${Math.ceil(a.time)}s · ${a.lives} lives · ${a.homes.filter(Boolean).length}/5 high scores saved`);
   s.debug = { engine: 'crossy', frog: a.frog, lanes: laneDefs, elapsed: a.elapsed, lives: a.lives, homes: a.homes };
  }
 });
}

// Paddle position changes the exit angle. Speeds increase gradually and have a
// horizontal minimum so neither paddle can trap a ball in a vertical rally.
function pongBounce(vx, vy, impact, maxSpeed = 450) {
 const speed = Math.min(maxSpeed, Math.hypot(vx, vy) * 1.055);
 const angle = clamp(impact, -1, 1) * Math.PI * .35;
 return { vx: -Math.sign(vx || -1) * speed * Math.cos(angle), vy: speed * Math.sin(angle) };
}

// Bounded substeps use the same paddle coordinates for rendering and physics.
// A point belongs to the human opposite the goal the ball crossed.
function pongStep(a, dt, W=680, H=360) {
 const half=46,radius=8,paddleX=[39,W-39],events=[];
 if(a.serve>0){a.serve=Math.max(0,a.serve-dt);return events;}
 const steps=Math.ceil(dt*240),h=dt/steps;
 for(let step=0;step<steps;step++){
  const b=a.ball,oldX=b.x,oldY=b.y;
  b.x+=b.vx*h;b.y+=b.vy*h;
  if(b.y<radius||b.y>H-radius){b.y=clamp(b.y,radius,H-radius);b.vy*=-1;}
  const owner=b.vx<0?0:1,line=paddleX[owner]+(owner?-1:1)*(8+radius);
  const crossed=owner===0?oldX>=line&&b.x<=line:oldX<=line&&b.x>=line;
  if(crossed){const t=clamp((line-oldX)/(b.x-oldX||1),0,1),y=oldY+(b.y-oldY)*t,centre=a.paddles[owner].y;
   if(Math.abs(y-centre)<=half+radius){Object.assign(b,{x:line,y},pongBounce(b.vx,b.vy,(y-centre)/half));a.rally++;a.lastHit=owner;events.push({type:'return',owner});}
  }
  if(b.x<-radius||b.x>W+radius){const scorer=b.x>W?0:1;a.scores[scorer]++;a.lastScorer=scorer;a.rally=0;
   // Alternating serves are independent of who scored; each side gets the same
   // opening velocity and a clear countdown before the next rally.
   a.serves++;a.ball={x:W/2,y:H/2,vx:a.serves%2?260:-260,vy:a.serves%2?-65:65};a.serve=.9;
   events.push({type:'goal',owner:scorer});break;
  }
 }
 return events;
}

async function pong(s) {
 const [c,x]=s.canvas(680,360,{fill:true});let W=680,H=360;const a={paddles:[{y:H/2},{y:H/2}],ball:{x:W/2,y:H/2,vx:-260,vy:65},scores:[0,0],serves:0,serve:1.2,rally:0,lastScorer:null,lastHit:null};
 s.shared=true;s.updateScores();s.controls([]);s.body.classList.add('drag-arena-body');const keys=[{},{}];
 const map={w:[0,'u'],s:[0,'d'],ArrowUp:[1,'u'],ArrowDown:[1,'d']},clearKeys=()=>{for(const k of keys)for(const key of Object.keys(k))k[key]=false;};for(const type of ['keydown','keyup'])s.on(document,type,ev=>{const m=map[ev.key];if(!m)return;ev.preventDefault();if(type==='keydown'&&s.paused)return;keys[m[0]][m[1]]=type==='keydown';});s.on(window,'blur',clearKeys);s.resetOnPause?.(clearKeys);
 const fingers=ownedPointers(s,(i,p)=>{a.paddles[i].y=clamp(p.y,54,H-54);});
 s.hint('Two humans: drag vertically on your own half to place your paddle. Each finger keeps its player across the middle. P1 W/S, P2 ↑/↓ also work. Edge hits angle the ball. First to 7; otherwise most goals in 60s.');
 let left=60,time=0;const trail=[];
 if(!await s.pass(0,`${s.players[0].name} faces ${s.players[1].name}. Each of you controls a paddle at the same time. Put the phone down so you can both reach it.`,'Both ready — serve!'))return;
 s.frame(dt=>{
  if(W!==s.W||H!==s.H){const sx=s.W/W,sy=s.H/H;for(const p of a.paddles)p.y*=sy;a.ball.x*=sx;a.ball.y*=sy;for(const p of trail){p.x*=sx;p.y*=sy;}W=s.W;H=s.H;}
  time+=dt;left-=dt;
  for(let i=0;i<2;i++)a.paddles[i].y=clamp(a.paddles[i].y+((keys[i].d?1:0)-(keys[i].u?1:0))*400*dt,54,H-54);
  for(const event of pongStep(a,dt,W,H)){if(event.type==='goal'){s.react?.(event.owner,'win',1.5);s.react?.(1-event.owner,'sad',1.5);trail.length=0;sound('win');vibrate(15);}else{s.react?.(event.owner,'happy',.5);sound('tap');}}
  trail.push({x:a.ball.x,y:a.ball.y});if(trail.length>12)trail.shift();
  x.fillStyle='#21483f';x.fillRect(0,0,W,H);x.strokeStyle='#c9dfce80';x.lineWidth=2;x.strokeRect(8,8,W-16,H-16);
  x.setLineDash([8,12]);x.beginPath();x.moveTo(W/2,10);x.lineTo(W/2,H-10);x.stroke();x.setLineDash([]);
  x.fillStyle='#ffffff18';x.font='bold 27px Arial';x.textAlign='center';x.fillText('DUNDER MIFFLIN',W/2,H/2-25);x.font='16px Arial';x.fillText('BREAK ROOM OPEN',W/2,H/2+3);
  for(let i=0;i<2;i++){const px=i?W-39:39,y=a.paddles[i].y;x.fillStyle=COLORS[i];x.fillRect(px-8,y-46,16,92);s.sprite(x,i,px,y,44);}
  if(a.serve===0){for(let i=0;i<trail.length;i++)circle(x,trail[i].x,trail[i].y,3+i/4,`rgba(255,238,162,${i/trail.length*.32})`);}
  circle(x,a.ball.x,a.ball.y,8,'#fff1b9');
  x.fillStyle='#f3edd9';x.font='bold 23px Arial';x.fillText(`${a.scores[0]}  –  ${a.scores[1]}`,W/2,34);
  if(a.serve>0){x.font='19px Arial';x.fillText(a.lastScorer===null?'Get ready!':`${s.players[a.lastScorer].name} scores!`,W/2,H/2+55);}
  s.setScores(a.scores);s.status(`${Math.ceil(Math.max(0,left))}s · rally ${a.rally} · ${s.players[0].name} LEFT / ${s.players[1].name} RIGHT`);
  s.debug={engine:'pong',state:a,keys,fingers,left,time,pongStep};
  if(a.scores.some(score=>score>=7)||left<=0)s.finish(a.scores,'Two-player break-room Pong');
 });
}

Object.assign(exports,{crossyLaneObjects,crossySupported,crossyHit,crossy,pongBounce,pongStep,pong});