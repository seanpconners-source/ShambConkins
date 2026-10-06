// Structural checks over many generated boards.
import {m} from './sim.mjs';
let bad = 0; const fail = (seed, msg) => { if (bad++ < 15) console.log('FAIL seed', seed, msg); };
const stats = {minGap: 1e9, bridges: 0, landmarks: 0, boards: 0};
for (let seed = 1; seed <= 300; seed++) {
  const board = m.board.generateBoard('S' + seed, 24, 'Mashup'); stats.boards++;
  const nodes = Object.values(board.nodes);
  // reachability + acyclic forward progress
  const seen = new Set(), stack = ['mind-start'];
  while (stack.length) { const id = stack.pop(); if (seen.has(id)) continue; seen.add(id); for (const n of board.nodes[id].next) { if (!board.nodes[n]) fail(seed, 'dangling ' + id + '->' + n); else stack.push(n); } }
  for (const n of nodes) if (!seen.has(n.id)) fail(seed, 'unreachable ' + n.id);
  for (const n of nodes) { if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) fail(seed, 'nan ' + n.id); if (n.x < 40 || n.x > 1760) fail(seed, 'x out of bounds ' + n.id + ' ' + n.x); if (n.y < 0 || n.y > board.height) fail(seed, 'y out ' + n.id + ' ' + n.y); }
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y); stats.minGap = Math.min(stats.minGap, d); if (d < 38) fail(seed, `nodes too close ${nodes[i].id} ${nodes[j].id} ${d | 0}`); }
  for (const realm of ['mind', 'body', 'spirit']) {
    const r = board.realms[realm];
    if (!r.lanes || r.lanes.length !== 3) fail(seed, realm + ' lanes'); else if (new Set(r.lanes.map(l => l.position)).size !== 3) fail(seed, realm + ' corridor clash');
    for (const lane of r.lanes || []) for (let i = 1; i < lane.ids.length; i++) if (board.nodes[lane.ids[i]].y < board.nodes[lane.ids[i - 1]].y - 1) fail(seed, 'road goes up ' + lane.ids[i]);
  }
  { const warps = nodes.filter(n => n.type === 'warp'); if (warps.length !== 3) fail(seed, 'expected 3 warp pipes, got ' + warps.length); }
  stats.bridges += board.bridges.length; stats.landmarks += nodes.filter(n => n.type === 'location').length;
  if (board.bridges.length < 6) fail(seed, 'few bridges ' + board.bridges.length);
  // landmark boxes must not overlap
  const boxes = nodes.filter(n => n.type === 'location' && n.side).map(n => ({x: n.x + n.side * 240 - 150, y: n.y - 175, w: 300, h: 215, id: n.id}));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) fail(seed, 'landmark overlap ' + a.id + ' ' + b.id); }
}
console.log(stats, bad ? bad + ' failures' : 'all boards ok');
process.exit(bad ? 1 : 0);
