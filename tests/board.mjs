// Structural checks over many generated grid boards (generation 8).
import {m} from './sim.mjs';
import {req} from './load.mjs';
const {validObstacles} = req('src/obstacles.js');
let bad = 0; const fail = (seed, msg) => { if (bad++ < 15) console.log('FAIL seed', seed, msg); };
const stats = {bridges: 0, shortcuts: 0, landmarks: 0, boards: 0, heights: []};
const overlap = (a, b, pad = 0) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
for (let seed = 1; seed <= 300; seed++) {
  const board = m.board.generateBoard('S' + seed, 24, 'Mashup'); stats.boards++;
  if (seed % 3 === 0) m.board.addHorrorBoard(board);
  if (!board.grid || board.generation !== 8) fail(seed, 'not a grid board');
  const nodes = Object.values(board.nodes);
  // reachability
  const seen = new Set(), stack = ['mind-start'];
  while (stack.length) { const id = stack.pop(); if (seen.has(id)) continue; seen.add(id); for (const n of board.nodes[id].next) { if (!board.nodes[n]) fail(seed, 'dangling ' + id + '->' + n); else stack.push(n); } }
  for (const n of nodes) if (!seen.has(n.id) && n.realm !== 'horror') fail(seed, 'unreachable ' + n.id);
  for (const n of nodes) { if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) fail(seed, 'nan ' + n.id); if (n.x < 40 || n.x > 1760) fail(seed, 'x out of bounds ' + n.id + ' ' + n.x); if (n.y < 0 || n.y > board.height) fail(seed, 'y out ' + n.id + ' ' + n.y); }
  // Tiles sit on the grid; touching tiles are always joined by a step of the road (clean tracks).
  const edge = (a, b) => a.next.includes(b.id) || b.next.includes(a.id);
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 99) fail(seed, `tiles overlap ${a.id} ${b.id}`); else if (d < 101 && a.realm === b.realm && !edge(a, b)) fail(seed, `tiles touch without a step ${a.id} ${b.id}`); }
  for (const realm of ['mind', 'body', 'spirit', ...(board.realms.horror ? ['horror'] : [])]) {
    const r = board.realms[realm], fork = board.nodes[r.fork], gate = board.nodes[r.gate];
    if (realm !== 'horror' && (!r.lanes || r.lanes.length !== 3 || new Set(r.lanes.map(l => l.position)).size !== 3)) fail(seed, realm + ' lanes');
    for (const lane of r.lanes || []) { const pts = [fork, ...lane.ids.map(id => board.nodes[id]), gate]; for (let i = 1; i < pts.length; i++) { if (pts[i].y < pts[i - 1].y - 1) fail(seed, 'road goes up ' + pts[i].id); if (Math.abs(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) - 100) > 1) fail(seed, 'road step not adjacent ' + pts[i - 1].id + '>' + pts[i].id); } }
    const cards = r.ids.map(id => board.nodes[id]).filter(n => n.type === 'location');
    for (const n of cards) if (!n.card) fail(seed, 'landmark without card ' + n.id);
    const boxes = cards.filter(n => n.card).map(n => ({...n.card, id: n.id}));
    for (let i = 0; i < boxes.length; i++) { for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i], boxes[j])) fail(seed, 'landmark overlap ' + boxes[i].id + ' ' + boxes[j].id); for (const t of r.ids.map(id => board.nodes[id])) if (overlap(boxes[i], {x: t.x - 43, y: t.y - 43, w: 86, h: 86})) fail(seed, 'card covers tile ' + boxes[i].id + ' ' + t.id); }
    stats.landmarks += cards.length;
  }
  for (const sc of board.shortcuts) if (!board.obstacles.some(o => o.from === sc.from && o.to === sc.to)) fail(seed, 'unguarded shortcut ' + sc.from);
  if (!validObstacles(board)) fail(seed, 'invalid obstacles');
  { const warps = nodes.filter(n => n.type === 'warp'); if (warps.length !== 3) fail(seed, 'expected 3 warp pipes, got ' + warps.length); }
  stats.bridges += board.bridges.length; stats.shortcuts += board.shortcuts.length; stats.heights.push(board.height);
  if (board.bridges.length < 3) fail(seed, 'few bridges ' + board.bridges.length);
}
console.log({...stats, heights: Math.min(...stats.heights) + '-' + Math.max(...stats.heights)}, bad ? bad + ' failures' : 'all boards ok');
process.exit(bad ? 1 : 0);
