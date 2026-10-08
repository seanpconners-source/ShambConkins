// A wild battle Forrest vs Taskmaster on autopilot: each side's sprite must switch to its own mood art
// (think while choosing, win when landing a hit, angry when hit, sad on faint). Exits 1 on failure.
import {open} from './lib.mjs';
const {browser, page, errors} = await open({viewport: {width: 390, height: 780}});
const res = {}; await page.evaluate(async () => {
  const S = window.ShambConkins, SP = S.pkmn.sprites, seen = {}, orig = SP.moodSprite;
  SP.moodSprite = (sp, mood) => { const r = orig(sp, mood); if (mood) { const k = (sp.w === 28 ? 'back' : 'front') + ':' + mood; seen[k] = seen[k] || r !== sp; } return r; };
  S.pkmn.speed(8); S.pkmn.auto(menu => menu.kind === 'main' ? 0 : menu.kind === 'fight' ? 0 : menu.kind === 'yesno' ? 1 : 0);
  const mk = (id, lvl) => ({id, lvl, exp: 0, hp: 120, status: null, pp: {}});
  window.__seen = seen;
  S.pkmn.battle({mode: 'wild', player: {team: [mk('forrest', 30)], bag: {}, character: 'sean', name: 'Sean'}, foe: {team: [mk('taskmaster', 30)]}}).then(r => window.__out = r.outcome);
  return true;
});
let seen = {};
for (let i = 0; i < 60; i++) { await page.waitForTimeout(1000); seen = await page.evaluate(() => window.__seen); if (['back:think', 'back:win', 'front:angry', 'front:win', 'back:angry'].every(k => seen[k])) break; }
await page.screenshot({path: '/tmp/claude-0/sc/pkmn-moodbattle.png'});
res.seen = seen = {...seen};
console.log(JSON.stringify(res), 'errors', errors);
const need = ['back:think', 'back:win', 'front:angry', 'front:win', 'back:angry'];
const miss = need.filter(k => !res.seen[k]);
await browser.close();
if (miss.length || errors.length) { console.log('FAILED missing', miss); process.exit(1); }
console.log('OK');
