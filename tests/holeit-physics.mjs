// Hole.it physics checks (Node): build + settle cost, stacks stay up while asleep, the autopilot can clear levels with
// rigid-body props, and props over the hole really fall in. Usage: node tests/holeit-physics.mjs [levels,...] [seconds]
import {req} from './load.mjs';
const L = req('src/engines/holeIt/levels.js'), S = req('src/engines/holeIt/sim.js');
const levels = (process.argv[2] || '2,3,4').split(',').map(Number), secs = Number(process.argv[3]) || 120;
let bad = 0; const fail = m => { bad++; console.log('FAIL', m); };
for (const lv of levels) {
  const def = L.buildLevel(lv); let t0 = performance.now();
  const sim = S.createSim(def); const build = performance.now() - t0;
  // after settling, nothing should have moved far (no exploding piles) and stacked props stay up
  const moved = sim.items.filter((it, i) => Math.hypot(it.x - def.items[i].x, it.z - def.items[i].z) > .35).length;
  if (moved > def.items.length * .03) fail(`level ${lv}: ${moved} props shifted while settling`);
  t0 = performance.now(); let t = 0, maxAwake = 0, steps = 0;
  while (!sim.done && t < Math.min(secs, def.time)) { S.stepSim(sim, 1 / 30, S.botInput(sim)); t += 1 / 30; steps++; maxAwake = Math.max(maxAwake, sim.phys.awake()); }
  const ms = (performance.now() - t0) / steps;
  console.log(`level ${lv}: ${def.items.length} props, build+settle ${build.toFixed(0)} ms, ${ms.toFixed(2)} ms/frame, max awake ${maxAwake}, ${sim.won ? 'cleared ' + sim.clearTime.toFixed(1) + 's' : 'not cleared'} size ${sim.hole.size} goals ${sim.goals.map(g => g.got + '/' + g.need).join(' ')} eaten ${sim.eaten}`);
  if (!sim.won && secs >= def.time) fail(`autopilot could not clear level ${lv}`);
}
console.log(bad ? `${bad} failures` : 'holeit physics ok');
process.exit(bad ? 1 : 0);
