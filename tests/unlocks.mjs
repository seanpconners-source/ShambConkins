// Every character must have at least one working way to unlock.
import {m} from './sim.mjs';
import {req} from './load.mjs';
const P = m.profile, C = m.chars.CHARACTERS, items = m.items.ITEMS, cat = m.cat.ACTIVE_CATALOG;
const {LOCATIONS} = req('src/locations.js'); const pairs = req('src/pairs.js');
const profile = P.freshProfile();
const via = new Map(); const add = (id, how) => { (via.get(id) || via.set(id, new Set()).get(id)).add(how); };
for (const c of C) {
  if (P.canRecruit(profile, c.id, 'Sean', 'game')) add(c.id, 'minigame win');
  if (P.canRecruit(profile, c.id, 'Sean', 'encounter')) add(c.id, 'encounter/landmark');
  if (P.canRecruit(profile, c.id, 'Sean', 'horror')) add(c.id, 'horror landmark');
  if (P.canRecruit(profile, c.id, 'Sean', 'character')) add(c.id, 'character win');
  if (P.canRecruit(profile, c.id, 'Sean', 'item')) add(c.id, 'item');
  if (P.canRecruit(profile, c.id, 'Sean', 'pair')) add(c.id, 'pair');
}
// Which reasons are actually reachable in play?
const horrorHolders = new Set(LOCATIONS.filter(l => l.realm === 'horror').flatMap(l => l.characters));
const itemTargets = new Set(items.filter(i => i.kind === 'transform').map(i => i.value));
const pairTargets = new Set([...(pairs.PAIR_RULES || pairs.PAIRS || []).flatMap(r => [...(r.unlock || []), r.winUnlock?.character].filter(Boolean))]);
const bossUnlocks = new Set(req('src/data/bosses.js').BOSSES.map(b => b.unlockId));
const labIds = new Set(cat.characters.filter(c => c.unlockBy === 'lab').map(c => c.id));
const unreachable = [];
for (const c of C) {
  if (['sean', 'amber'].includes(c.id)) continue; // starters
  const ways = via.get(c.id) || new Set(); let ok = false;
  const rec = cat.characters.find(x => x.id === c.id) || c;
  if (!rec.unlockBy) ok = ways.has('minigame win');
  else if (rec.unlockBy === 'horror') ok = horrorHolders.has(c.id);
  else if (rec.unlockBy === 'item') ok = itemTargets.has(c.id);
  else if (rec.unlockBy === 'lab') ok = labIds.has(c.id);
  else if (rec.unlockBy === 'character-win') ok = C.some(x => x.id === rec.requires);
  else if (rec.unlockBy === 'game-win') ok = true;
  else if (rec.unlockBy === 'boss') ok = bossUnlocks.has(c.id);
  else if (rec.unlockBy === 'dogs') ok = ['kc','mylo'].includes(c.id);
  if (!ok && !pairTargets.has(c.id)) unreachable.push(`${c.id} (${rec.unlockBy || 'random'}) ways=[${[...ways]}]`);
}
console.log(C.length, 'characters;', unreachable.length, 'without a working unlock path');
for (const u of unreachable) console.log('  UNREACHABLE', u);
process.exit(unreachable.length ? 1 : 0);
