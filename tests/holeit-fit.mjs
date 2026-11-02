// Hole.it size classes (ROADMAP A6): a prop fits when its radius is no bigger than the hole's, and one a little too big
// that has sunk almost all the way in still drops. The fridge must keep wedging at Size 5 and drop at Size 6 (video).
// node tests/holeit-fit.mjs
import {req} from './load.mjs';
const L = req('src/engines/holeIt/levels.js'), S = req('src/engines/holeIt/sim.js');
let bad = 0; const check = (ok, m) => { console.log(ok ? 'ok  ' : 'FAIL', m); if (!ok) bad++; };
function drops(k, sc, size, secs = 4) {
  const base = L.buildLevel(4), def = {...base, items: [{k, sc, x: 0, z: 3, yaw: .3}], goals: [{k, need: 1}], start: {x: 0, z: 0}, islands: []};
  const sim = S.createSim(def), h = sim.hole; h.size = size; h.r = h.rT = L.holeRadius(size); const it = sim.items[0];
  for (let t = 0; t < secs && it.state === 0; t += 1 / 30) { const dx = it.x - h.x, dz = it.z - h.z, d = Math.hypot(dx, dz); S.stepSim(sim, 1 / 30, d > .05 ? {x: dx / d, z: dz / d} : {x: 0, z: 0}); }
  return it.state !== 0;
}
check(!drops('fridge-green', 1, 5), 'fridge wedges in a Size 5 hole');
check(drops('fridge-green', 1, 6), 'fridge drops into a Size 6 hole');
check(drops('watermelon', 1.25, 5), "Level 34's big watermelon drops at Size 5 (it hung 90% inside before)");
check(!drops('watermelon', 1.25, 4), 'but not at Size 4');
check(drops('watermelon', 1, 4), 'a plain watermelon drops at Size 4');
console.log(bad ? `${bad} failures` : 'holeit fit ok'); process.exit(bad ? 1 : 0);
