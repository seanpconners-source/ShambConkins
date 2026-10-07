// Level flow audit (Node, no DOM): nothing but the level boss may move a player into the next level.
// Random walks with Chance events and item-style moves; the boss is simulated when a player steps onto a gate.
import {m, freshRun} from './sim.mjs';
import {req} from './load.mjs';
const ev = req('src/events.js');
const ORDER = ['mind', 'body', 'spirit', 'horror'];
let bad = 0, bosses = 0, skips = 0, frank = 0;
const fail = (seed, msg) => { if (bad++ < 15) console.log('FAIL seed', seed, msg); };
const realmOf = (run, q) => run.board.nodes[q.node]?.realm;
const level = run => ORDER.find(r => run.board.realms[r] && !run.bossesSeen?.[r]) || 'done';
function bossFight(run, realm) {
  bosses++; run.bossesSeen ||= {}; run.bossesSeen[realm] = true;
  const gate = run.board.nodes[run.board.realms[realm].gate];
  const next = realm === 'spirit' && run.horror ? run.board.realms.horror.start : gate.next[0];
  if (run.upsideDown) { run.players[run.upsideDown.owner].node = run.upsideDown.returnNode; run.upsideDown = null; }
  for (const q of run.players) { q.cleared.includes(realm) || q.cleared.push(realm); if (next) { q.visited.push(q.node); q.node = next; } }
  return !next;
}
function check(run, seed, what) {
  const cur = level(run);
  for (const q of run.players) {
    const r = realmOf(run, q);
    if (!r) { fail(seed, `${what}: ${q.name} on missing node ${q.node}`); continue; }
    if (r === 'upside-down') continue;
    if (ORDER.indexOf(r) > ORDER.indexOf(cur)) fail(seed, `${what}: ${q.name} reached ${r} while the ${cur} boss is unbeaten`);
  }
}
// The rare transporter card lands on the doorstep of the Level 1 gate, not in Level 2.
{
  const {run, profile} = freshRun(1); const p = run.players[0];
  ev.applyEvent(run, profile, {effect: 'body'}, () => 0.5);
  const n = run.board.nodes[p.node];
  if (n.realm !== 'mind' || !n.next.includes(run.board.realms.mind.gate)) fail(1, 'body-skip went to ' + p.node);
  m.board.advanceAlong(run, p, 4);
  if (p.node !== n.id) fail(1, 'forward move passed an unbeaten gate: ' + p.node);
  run.bossesSeen = {mind: true}; m.board.advanceAlong(run, p, 2);
  if (realmOf(run, p) !== 'body') fail(1, 'forward move blocked after the boss: ' + p.node);
}
for (let seed = 1; seed <= 150; seed++) {
  const {run, profile} = freshRun(seed, 60);
  let s = seed * 9301; const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let turn = 0; turn < 400; turn++) {
    const p = run.players[run.current = turn % 2]; let done = false;
    for (let left = 1 + Math.floor(rand() * 6); left > 0; left--) {
      const opts = m.board.routeOptions(run, p.node); if (!opts.length) break;
      const to = opts[Math.floor(rand() * opts.length)]; p.visited.push(p.node); p.node = to.id;
      if (to.type === 'gate' && !run.bossesSeen?.[to.realm] && !to.realm.startsWith('upside')) { done = bossFight(run, to.realm); break; }
    }
    if (done) break;
    check(run, seed, 'walk');
    const roll = rand();
    if (roll < .35 && realmOf(run, p) !== 'upside-down') {
      const event = ev.drawEvent(run, profile, rand);
      if (event.effect === 'body') skips++; if (event.e?.[0] === 'horror') frank++;
      if (event.e?.[0] !== 'team') { try { ev.applyEvent(run, profile, event, rand); } catch (err) { fail(seed, 'event threw ' + (event.title || event.id) + ' ' + err.message); } }
      check(run, seed, 'event ' + (event.title || event.id));
    } else if (roll < .5) { m.board.advanceAlong(run, p, Math.floor(rand() * 13) - 4); check(run, seed, 'item move'); }
    if (run.upsideDown && rand() < .25) { run.players[run.upsideDown.owner].node = run.upsideDown.returnNode; run.upsideDown = null; }
    run.turn++;
  }
}
console.log(`level flow: ${bosses} boss gates, ${skips} transporter cards, ${frank} FRANK cards, ${bad} failures`);
process.exit(bad ? 1 : 0);
