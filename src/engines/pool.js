const {clamp}=require("src/utils.js");
const {circle, COLORS}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
const {worldView}=require("src/engines/duelControls.js");
const {isCpu,cpuSkill,cpuHotseat}=require("src/engines/cpuKit.js");
const POOL_TABLE = { left: 40, right: 640, top: 40, bottom: 338, pocketRadius: 18,
 pockets: [{ x: 40, y: 40 }, { x: 340, y: 40 }, { x: 640, y: 40 }, { x: 40, y: 338 }, { x: 340, y: 338 }, { x: 640, y: 338 }] };

function poolRack(table = POOL_TABLE) {
 const midY = (table.top + table.bottom) / 2, radius = 10, balls = [{ id: 0, x: table.left + 135, y: midY, vx: 0, vy: 0, r: radius, pocketed: false }];
 const numbers = [1, 2, 3, 4, 9, 5, 6, 7, 8]; let index = 0;
 for (let column = 0; column < 5; column++) {
  const count = [1, 2, 3, 2, 1][column];
  for (let row = 0; row < count; row++) balls.push({ id: numbers[index++], x: table.right - 190 + column * 17.65, y: midY + (row - (count - 1) / 2) * 20.4, vx: 0, vy: 0, r: radius, pocketed: false });
 }
 return balls;
}

function collidePoolBalls(a, b, restitution = .96) {
 if (a.pocketed || b.pocketed) return false;
 const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), contact = (a.r || 10) + (b.r || 10);
 if (length > contact) return false;
 const nx = length > .000001 ? dx / length : 1, ny = length > .000001 ? dy / length : 0;
 const overlap = Math.max(0, contact - length) / 2 + .00001;
 a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
 const relative = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
 if (relative > 0) {
  const impulse = relative * (1 + restitution) / 2;
  a.vx -= impulse * nx; a.vy -= impulse * ny; b.vx += impulse * nx; b.vy += impulse * ny;
 }
 return true;
}

// Small substeps prevent a fast shot from jumping over a ball or a pocket.
// The function returns only newly pocketed balls, so a settled shot cannot
// award the same ball again on a later frame.
function stepPool(balls, dt, table = POOL_TABLE, events = {}) {
 const pocketed = [], steps = Math.max(1, Math.ceil(Math.max(0, dt) * 240)), step = Math.max(0, dt) / steps;
 for (let sub = 0; sub < steps; sub++) {
  for (const b of balls) {
   if (b.pocketed) continue;
   b.x += b.vx * step; b.y += b.vy * step;
   const pocket = table.pockets.find(p => Math.hypot(b.x - p.x, b.y - p.y) < table.pocketRadius);
   if (pocket) { b.pocketed = true; b.vx = b.vy = 0; pocketed.push(b.id); continue; }
   if (b.x < table.left + b.r || b.x > table.right - b.r) { b.x = clamp(b.x, table.left + b.r, table.right - b.r); b.vx *= -.84; events.rail?.(b.id); }
   if (b.y < table.top + b.r || b.y > table.bottom - b.r) { b.y = clamp(b.y, table.top + b.r, table.bottom - b.r); b.vy *= -.84; events.rail?.(b.id); }
   const speed = Math.hypot(b.vx, b.vy);
   if (speed > 0) {
    const slowed = Math.max(0, speed * Math.pow(.986, step * 60) - 22 * step), factor = slowed < 5 ? 0 : slowed / speed;
    b.vx *= factor; b.vy *= factor;
   }
  }
  for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) { const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,approach=(a.vx-b.vx)*dx+(a.vy-b.vy)*dy; if(collidePoolBalls(a,b)&&approach>0)events.contact?.(a.id,b.id); }
 }
 return pocketed;
}

function poolCueSpot(balls, table = POOL_TABLE) {
 const midY = (table.top + table.bottom) / 2;
 for (let column = 0; column < 8; column++) for (const row of [0, -1, 1, -2, 2, -3, 3]) {
  const point = { x: table.left + 75 + column * 45, y: midY + row * 35 };
  if (point.y < table.top + 12 || point.y > table.bottom - 12) continue;
  if (balls.every(b => b.id === 0 || b.pocketed || Math.hypot(point.x - b.x, point.y - b.y) >= (b.r || 10) + 13)) return point;
 }
 return { x: table.left + 25, y: midY };
}

async function pool(s) {
 const [c, x] = s.canvas(680, 390, { fill: true }), W = 680, H = 390, view = worldView(s, 680, 390), table = POOL_TABLE, balls = poolRack(table), score = [0, 0], shots = [0, 0];
 const cue = balls[0]; let actor = 0, phase = 'handoff', angle = 0, power = 75, aimTime = 20, rolling = 0, scratch = false, drag = null;
 const colors = ['#f3ecce', '#ccad41', '#586ba2', '#af594b', '#715687', '#c68740', '#5a916b', '#a14b58', '#1c211e', '#ccad41'];
 const aimAllowed = () => s.alive && !s.paused && phase === 'aim';
 function fire(direction = angle, force = power) {
  if (!aimAllowed()) return;
  shots[actor]++; phase = 'rolling'; rolling = 0; scratch = false; drag = null;
  cue.vx = Math.cos(direction) * clamp(force, 18, 135) * 4.2; cue.vy = Math.sin(direction) * clamp(force, 18, 135) * 4.2;
  sound('shot');
 }
 async function turn(player, message) {
  phase = 'handoff'; actor = player; angle = 0; power = 75; aimTime = 20; drag = null;
  if (!await s.pass(player, message || 'Five shots each, alternating. Drag backward from the cue ball and release. Every object ball +10; the eight ball +15. A scratch costs 10.')) return;
  phase = 'aim';
 }
 // vs CPU: the shark takes the easiest ghost-ball shot (cue → object ball → pocket, cut under ~70°) with aim error on Easy
 const cpu = isCpu(s);
 if (cpu) cpuHotseat(s, { isTurn: () => actor === 1 && phase === 'aim', delay: 900, think: () => {
  const sk = cpuSkill(s), R = 2 * cue.r; let best = null, bv = -1e9;
  for (const b of balls.slice(1)) { if (b.pocketed) continue; for (const P of table.pockets) { const dx = P.x - b.x, dy = P.y - b.y, d = Math.hypot(dx, dy), gx = b.x - dx / d * R, gy = b.y - dy / d * R, ax = gx - cue.x, ay = gy - cue.y, ad = Math.hypot(ax, ay), cut = Math.acos(clamp((ax * dx + ay * dy) / (ad * d), -1, 1));
   if (cut > 1.2) continue; const v = -d - ad * .6 - cut * 120 + (b.id === 8 ? 25 : 0); if (v > bv) { bv = v; best = { a: Math.atan2(ay, ax), f: clamp((ad + d) * .17 + 30, 40, 125) }; } } }
  if (!best) best = { a: Math.random() * 6.283, f: 90 };
  fire(best.a + (Math.random() - .5) * (1 - sk) * .16, best.f); } });
 async function settled() {
  if (phase !== 'rolling' || !s.alive) return;
  phase = 'handoff';
  for (const b of balls) b.vx = b.vy = 0;
  if (scratch) { score[actor] = Math.max(0, score[actor] - 10); s.setScores(score); }
  if (cue.pocketed) { const spot = poolCueSpot(balls, table); cue.x = spot.x; cue.y = spot.y; cue.pocketed = false; }
  if (shots[0] + shots[1] >= 10 || balls.slice(1).every(b => b.pocketed)) { s.finish(score, 'Paddy’s pub pool · pocket points'); return; }
  await turn(1 - actor, `${scratch ? 'Scratch: −10. The cue ball is back on the table. ' : ''}Your shot ${shots[1 - actor] + 1}/5. Every object ball +10; the eight ball +15. You have 20 seconds to aim.`);
 }
 // Drag back from the cue ball, or from anywhere on the table (the pull is then measured from where you first touched), and release.
 const wp = ev => view.toWorld(s.pointer(ev));
 const aimFrom = (d, point) => { const dx = d.from.x - point.x, dy = d.from.y - point.y; angle = Math.atan2(dy, dx); power = clamp(Math.hypot(dx, dy), 18, 135); return Math.hypot(dx, dy); };
 s.on(c, 'pointerdown', ev => {
  if (!aimAllowed() || drag || cpu && actor === 1) return;
  const point = wp(ev);
  ev.preventDefault(); s.capture(ev); drag = { pointer: ev.pointerId, x: point.x, y: point.y, from: Math.hypot(point.x - cue.x, point.y - cue.y) <= 48 ? cue : { x: point.x, y: point.y } };
 });
 s.on(c, 'pointermove', ev => {
  if (!drag || drag.pointer !== ev.pointerId || !aimAllowed()) return;
  const point = wp(ev); drag.x = point.x; drag.y = point.y; aimFrom(drag, point);
 });
 s.on(c, 'pointerup', ev => {
  if (drag?.pointer === ev.pointerId) {
   const point = wp(ev), d = drag; drag = null;
   const distance = Math.hypot(d.from.x - point.x, d.from.y - point.y);
   if (aimAllowed() && distance >= 12) { aimFrom(d, point); fire(angle, power); }
  }
  s.release(ev);
 });
 s.on(c, 'pointercancel', ev => { drag = null; s.release(ev); });
 s.on(document, 'keydown', ev => {
  if (!aimAllowed()) return; const k = ev.key;
  if (k === ' ' || k === 'Enter') { ev.preventDefault(); fire(); }
  else if (k === 'ArrowLeft' || k === 'a') angle -= .05; else if (k === 'ArrowRight' || k === 'd') angle += .05;
  else if (k === 'ArrowUp' || k === 'w') power = clamp(power + 8, 18, 135); else if (k === 'ArrowDown' || k === 's') power = clamp(power - 8, 18, 135);
 });
 s.hint('Drag back anywhere on the table like a slingshot (or from the white ball) and release: the dotted line shows the shot and a longer pull is more power; drag back to where you started to cancel. Keyboard: arrows aim and set power, Space shoots. Each player gets five shots; a cleared table ends the match. Idle turns take a gentle automatic shot.');
 function draw() {
  view.begin(x, '#171d17');
  x.fillStyle = '#614631'; x.fillRect(table.left - 20, table.top - 20, table.right - table.left + 40, table.bottom - table.top + 40);
  x.fillStyle = '#264d38'; x.fillRect(table.left, table.top, table.right - table.left, table.bottom - table.top);
  x.fillStyle = '#b4b98220'; x.font = 'bold 26px Arial'; x.textAlign = 'center'; x.fillText('PADDY’S PUB', W / 2, (table.top + table.bottom) / 2 + 9);
  for (const pocket of table.pockets) circle(x, pocket.x, pocket.y, table.pocketRadius, '#101814');
  for (const b of balls) {
   if (b.pocketed) continue;
   circle(x, b.x + 2, b.y + 3, b.r, '#00000044'); circle(x, b.x, b.y, b.r, colors[b.id]);
   if (!b.id) view.upright(x, b.x, b.y, () => { s.sprite(x, actor, 0, 0, 19, {exact:true}); s.marker?.(x, actor, 0, 0); });
   if (b.id) { circle(x, b.x, b.y, 5.5, '#e6dfc5'); view.upright(x, b.x, b.y, () => { x.fillStyle = '#242a20'; x.font = 'bold 8px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(b.id), 0, .4); x.textBaseline = 'alphabetic'; }); }
  }
  if (phase === 'aim') {
   x.strokeStyle = COLORS[actor]; x.lineWidth = 2; x.setLineDash([4, 6]); x.beginPath(); x.moveTo(cue.x, cue.y); x.lineTo(cue.x + Math.cos(angle) * (70 + power), cue.y + Math.sin(angle) * (70 + power)); x.stroke(); x.setLineDash([]);
   x.strokeStyle = '#d0b781'; x.lineWidth = 4; x.beginPath(); x.moveTo(cue.x - Math.cos(angle) * 17, cue.y - Math.sin(angle) * 17); x.lineTo(cue.x - Math.cos(angle) * (45 + power), cue.y - Math.sin(angle) * (45 + power)); x.stroke();
  }
  s.status(`${s.players[actor].name} · shot ${Math.min(5, shots[actor] + (phase === 'aim' ? 1 : 0))}/5 · ${phase === 'aim' ? `${Math.ceil(aimTime)}s to aim · ${Math.round(power / 135 * 100)}% power` : phase === 'rolling' ? 'Balls rolling…' : 'Pass the phone'} · ${balls.slice(1).filter(b => !b.pocketed).length} balls left`);
  s.debug = { engine: 'pool', phase, actor, balls, table, shots, scores: score, angle, power, aimTime, scratch };
 }
 s.frame(dt => {
  if (phase === 'aim') { aimTime -= dt; if (aimTime <= 0) fire(angle, Math.min(power, 45)); }
  else if (phase === 'rolling') {
   rolling += dt;
   for (const id of stepPool(balls, dt, table)) {
    if (id === 0) { scratch = true; sound('lose'); }
    else { score[actor] += id === 8 ? 15 : 10; sound('win'); }
   }
   s.setScores(score);
   if (rolling > .45 && (balls.every(b => b.pocketed || Math.hypot(b.vx, b.vy) < 5) || rolling > 8)) void settled();
  }
  draw();
 });
 draw(); await turn(0);
}

Object.assign(exports,{POOL_TABLE,poolRack,collidePoolBalls,stepPool,poolCueSpot,pool});