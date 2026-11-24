// Template pictures for the game-show art (PLINKO, THE BIG WHEEL, CLIFF HANGERS; slots in src/data/showSprites.js; brief docs/art-for-gpt/GAMESHOW-ART.md).
// For every slot: <slot>-template.png at the exact size (pink guides) and <slot>-reference.png (what the game draws today).
// Usage: node tools/gameshow-templates.mjs [outDir] [--only=slot,prefix*]   (default docs/art-for-gpt/gameshow-templates; --only keeps the others untouched)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, browserLaunchOptions} from '../tests/lib.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), only = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const outDir = path.resolve(args.find(a => !a.startsWith('--')) || path.join(root, 'docs/art-for-gpt/gameshow-templates'));
fs.mkdirSync(outDir, {recursive: true});
const mods = {'src/data/userPortraits.js': 'exports.USER_PORTRAITS={};', 'src/audio.js': 'exports.audioContext=()=>null;', 'src/state.js': 'exports.store={profile:{settings:{}}};',
  'src/utils.js': 'exports.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));exports.seededRandom=()=>Math.random;'};
for (const f of ['src/data/showSprites.js', 'src/data/showPrizes.js', 'src/bgShape.js', 'src/engines/gameshow/stage.js', 'src/engines/plinkoShow.js', 'src/engines/cliffHangers.js', 'src/engines/clockGame.js']) mods[f] = fs.readFileSync(path.join(root, f), 'utf8');
mods['src/engines/cpuKit.js'] = 'exports.isCpu=()=>false;exports.cpuSkill=()=>.5;exports.isOnline=()=>false;';mods['src/engines/fullBleed.js'] = 'exports.fullBleed=()=>({});';mods['src/audio.js'] = 'exports.audioContext=()=>null;exports.holdMusic=()=>{};exports.releaseMusic=()=>{};exports.vibrate=()=>{};';
const browser = await chromium.launch(browserLaunchOptions());
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
await page.evaluate(mods => { const cache = {}; window.require = id => { if (cache[id]) return cache[id]; const e = cache[id] = {}; new Function('exports', 'require', mods[id] || '')(e, window.require); return e; }; }, mods);
const save = (name, data) => fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
const render = (slot, mode) => page.evaluate(({slot, mode}) => {
  const SS = require('src/data/showSprites.js'), ST = require('src/engines/gameshow/stage.js'), PL = require('src/engines/plinkoShow.js'), S = SS.SLOTS[slot], W = S.w, H = S.h;
  const c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
  const pink = '#ff2a6a', T = mode === 'template', label = (t, X, Y, size = Math.max(16, W / 45)) => { x.font = `700 ${size}px sans-serif`; x.textBaseline = 'top'; const w = x.measureText(t).width; x.fillStyle = 'rgba(255,255,255,.88)'; x.fillRect(X - 3, Y - 2, w + 6, size + 6); x.fillStyle = pink; x.fillText(t, X, Y); };
  const faded = fn => { x.save(); if (T) x.globalAlpha = .38; fn(); x.restore(); };
  x.strokeStyle = pink; x.lineWidth = 3;
  const CH = require('src/engines/cliffHangers.js'), G = SS.CLIFF_GEOM, CK = require('src/engines/clockGame.js');
  if (slot.startsWith('stage-clock')) { faded(() => ST.drawStage(x, W, H, 'clock', 0));
    if (T) { const tall = H > W * 1.15, fold = !tall && W < H * 1.15; x.setLineDash([14, 10]);
      if (tall) { const d = Math.min(W * .6, H * .3); x.strokeRect((W - d) / 2, H * .1, d, d); label('the clock stands here', (W - d) / 2 + 10, H * .1 + 10); x.strokeRect(W * .03, H * .1 + d + 20, W * .94, H * .15); label('prize + price display, keypad below', W * .04, H * .1 + d + 30); }
      else if (fold) { const d = Math.min(W * .46, H * .36); x.strokeRect(W * .04, H * .12, d, d); label('the clock', W * .05, H * .13); x.strokeRect(W * .52, H * .12, W * .46, d); label('prize + display', W * .53, H * .13); }
      else { x.strokeRect(W * .01, H * .02, W * .45, H * .82); label('the clock stands here (left 46%): keep it calm', W * .02, H * .03); x.strokeRect(W * .48, H * .1, W * .51, H * .85); label('prize, price display, keypad', W * .49, H * .11); }
      x.setLineDash([]); label('the floor / stage line', 20, H * .66); x.beginPath(); x.moveTo(0, H * .66); x.lineTo(W, H * .66); x.stroke(); }
    return c.toDataURL('image/png'); }
  if (slot === 'clock-face') { const C = SS.CLOCK_GEOM; faded(() => CK.drawFace(x, 0));
    if (T) { x.beginPath(); x.arc(C.c[0], C.c[1], C.r, 0, 6.28); x.stroke(); x.beginPath(); x.arc(C.c[0], C.c[1], 10, 0, 6.28); x.stroke(); x.beginPath(); x.moveTo(C.c[0], C.c[1]); x.lineTo(C.c[0], C.c[1] - C.r); x.stroke();
      label('CENTRE: the hand turns round this dot (exact middle)', 20, 20, 22); label('pink circle = how far the hand reaches: ticks + numbers 5..60 around it', 20, 52, 22); label('NO hand in the picture; transparent around the clock', 20, 84, 22); }
    return c.toDataURL('image/png'); }
  if (slot === 'clock-hand') { const Hg = SS.HAND_GEOM; faded(() => CK.drawHand(x));
    if (T) { x.beginPath(); x.arc(Hg.pivot[0], Hg.pivot[1], 8, 0, 6.28); x.stroke(); x.beginPath(); x.moveTo(Hg.pivot[0], Hg.pivot[1]); x.lineTo(Hg.pivot[0], Hg.pivot[1] - Hg.len); x.stroke(); label('PIVOT', 4, Hg.pivot[1] + 14, 14); label('TIP', 4, 4, 14); }
    return c.toDataURL('image/png'); }
  if (slot === 'clock-display') { const Dg = SS.DISPLAY_GEOM, [a, b, cc, d] = Dg.window; faded(() => CK.drawDisplay(x, true));
    if (T) { x.strokeRect(a, b, cc - a, d - b); label('WINDOW: dark, the game prints $ and the price here', a + 6, b + 6, 20); label('transparent around the board', 8, H - 26, 18); }
    return c.toDataURL('image/png'); }
  if (slot === 'clock-platform') { const Pg = SS.PLATFORM_GEOM; faded(() => CK.drawPlatform(x));
    if (T) { x.strokeRect(Pg.top[0] - 210, Pg.top[1] - 320, 420, 300); label('the prize photo stands here (game draws it)', Pg.top[0] - 206, Pg.top[1] - 314, 18); x.beginPath(); x.arc(Pg.top[0], Pg.top[1], 8, 0, 6.28); x.stroke(); label('transparent around the platform', 8, H - 26, 18); }
    return c.toDataURL('image/png'); }
  if (slot.startsWith('stage-cliff')) { faded(() => ST.drawStage(x, W, H, 'cliff', 0));
    if (T) { const tall = H > W * 1.15, fold = !tall && W < H * 1.15; x.setLineDash([14, 10]);
      if (tall || fold) { const mw = Math.min(W * .98, H * .5 * G.w / G.h), mh = mw * G.h / G.w, my = H * .1; x.strokeRect((W - mw) / 2, my, mw, mh); label('the mountain stands here (keep it calm, sky-ish)', (W - mw) / 2 + 10, my + 10); x.strokeRect(W * .02, my + mh + 20, W * .96, H * .2); label('prize stands + keypad', W * .03, my + mh + 30); }
      else { x.strokeRect(W * .01, H * .02, W * .57, H * .82); label('the mountain stands here (left 58%): keep it calm', W * .02, H * .03); x.strokeRect(W * .6, H * .1, W * .39, H * .85); label('prize stands + keypad', W * .61, H * .11); }
      x.setLineDash([]); label('the floor / stage line', 20, H * .66); x.beginPath(); x.moveTo(0, H * .66); x.lineTo(W, H * .66); x.stroke(); }
    return c.toDataURL('image/png'); }
  if (slot === 'cliff-mountain') { faded(() => { CH.drawMountain(x, 0); if (!T) CH.drawSteps(x, -1); });
    if (T) { const [x0, y0] = G.step0, [x1, y1] = G.step25, [ex, ey] = G.edge; x.lineWidth = 5; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.lineTo(ex, ey); x.stroke();
      for (let n = 0; n <= 25; n++) { const [px, py] = CH.stepPos(n); x.fillStyle = n % 5 ? pink : '#ffffff'; x.beginPath(); x.arc(px, py, n % 5 ? 6 : 10, 0, 6.28); x.fill(); x.strokeStyle = pink; x.lineWidth = 3; x.stroke(); }
      x.setLineDash([10, 8]); x.beginPath(); x.moveTo(x0, y0 + 14); x.lineTo(x1, y1 + 14); x.lineTo(x1 + 0, y1 + 110); x.lineTo(x0, y0 + 110); x.closePath(); x.stroke(); x.setLineDash([]);
      x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex, G.h); x.stroke();
      label('STEP 0: the climber starts here (feet on the path line)', x0 - 220, y0 + 120, 24); label('STEP 25 (last safe step)', x1 - 300, y1 - 60, 24); label('CLIFF EDGE: he walks off here', ex - 120, ey - 110, 24); label('sheer cliff face down the right side', ex - 420, ey + 250, 22);
      label('the game draws the 26 step ticks + numbered signs 0,5..25 in the dashed band: NO numbers in the picture', 20, 20, 24); label('pink line = the walking path (a ledge/trail the climber can stand on)', 20, 56, 24); label('transparent around the mountain', 20, 92, 24); }
    return c.toDataURL('image/png'); }
  if (slot === 'cliff-climber') { const D = SS.CLIMBER;
    D.frames.forEach((f, i) => { x.save(); x.translate(i * D.w + D.feet[0], D.feet[1]); faded(() => { const k = f.startsWith('walk') ? (Number(f.slice(4)) - 1) / 4 : f === 'teeter' ? .1 : 0; CH.drawClimber(x, D.unit, f === 'fall' ? 'teeter' : f, f === 'fall' ? .35 : k); }); x.restore();
      if (T) { x.strokeRect(i * D.w + 1, 1, D.w - 2, D.h - 2); x.beginPath(); x.arc(i * D.w + D.feet[0], D.feet[1], 7, 0, 6.28); x.stroke(); label(f.toUpperCase(), i * D.w + 8, 8, 20); if (f === 'fall') label('upright, flailing: the game spins it', i * D.w + 6, 40, 14); } });
    if (T) label('8 poses, 256x320 each, feet on the dot, facing RIGHT (up the mountain), transparent', 8, D.h - 30, 20); return c.toDataURL('image/png'); }
  if (slot === 'cliff-stand') { const S = SS.STAND_GEOM, [a, b, cc, d] = S.price; faded(() => CH.drawStand(x, true));
    if (T) { x.strokeRect(S.top[0] - 160, S.top[1] - 220, 320, 220); label('the prize photo stands here (game draws it)', S.top[0] - 156, S.top[1] - 214, 18); x.beginPath(); x.arc(S.top[0], S.top[1], 8, 0, 6.28); x.stroke();
      x.strokeRect(a, b, cc - a, d - b); label('PRICE WINDOW: dark, game prints the price', a + 4, b + 4, 18); label('transparent around the pedestal', 8, H - 28, 18); }
    return c.toDataURL('image/png'); }
  if (slot.startsWith('stage-')) { faded(() => ST.drawStage(x, W, H, slot.includes('wheel') ? 'wheel' : 'plinko', 0));
    if (T) { const tall = H > W; x.setLineDash([14, 10]); x.strokeRect(W * (tall ? .05 : .3), H * (tall ? .1 : .05), W * (tall ? .9 : .4), H * (tall ? .72 : .9)); x.setLineDash([]); label('the ' + (slot.includes('wheel') ? 'wheel' : 'board') + ' stands here: keep it calm', W * (tall ? .07 : .31), H * (tall ? .11 : .06)); label('floor / stage line', 20, H * .63); x.beginPath(); x.moveTo(0, H * .63); x.lineTo(W, H * .63); x.stroke(); }
    return c.toDataURL('image/png'); }
  if (slot === 'curtain') { faded(() => ST.drawCurtain(x, W, H, 0, 0)); if (T) label('fills the whole screen, rises at the start', 20, 20); return c.toDataURL('image/png'); }
  if (slot === 'plinko-board') { const k = W / 900; x.save(); x.scale(k, k); if (T) x.globalAlpha = .38;
    const bg = x.createLinearGradient(0, 0, 0, 1272); bg.addColorStop(0, '#0e2a8a'); bg.addColorStop(1, '#0b1f66'); x.fillStyle = bg; x.fillRect(0, 0, 900, 1272); x.restore();
    if (T) { for (const [px, py] of PL.PEGS) { x.beginPath(); x.arc(px * k, py * k, 7 * k, 0, 6.28); x.stroke(); } const sy = 1102 * k; for (let i = 0; i <= 9; i++) { x.beginPath(); x.moveTo(i * 100 * k, sy); x.lineTo(i * 100 * k, 1252 * k); x.stroke(); }
      x.strokeRect(0, sy, W, 150 * k); label('pegs (pink circles) are drawn by the game: no pegs here', 30, 120); label('9 slot boxes: the game prints $100 $500 $1,000 $0 $10,000 ... on them', 30, sy - 60); label('the chips are held above here', 30, 30); }
    return c.toDataURL('image/png'); }
  if (slot === 'plinko-chip') { faded(() => { const r = W * .44; x.fillStyle = '#e8ebf0'; x.beginPath(); x.arc(W / 2, H / 2, r, 0, 6.28); x.fill(); x.strokeStyle = '#8a93a3'; x.lineWidth = r * .1; x.beginPath(); x.arc(W / 2, H / 2, r * .72, 0, 6.28); x.stroke(); });
    if (T) { x.strokeStyle = pink; x.beginPath(); x.arc(W / 2, H / 2, W * .45, 0, 6.28); x.stroke(); label('round chip fills the circle', 6, 6, 16); } return c.toDataURL('image/png'); }
  if (slot.endsWith('-logo')) { faded(() => ST.drawLogo(x, '__none', slot === 'plinko-logo' ? 'PLINKO' : slot === 'cliff-logo' ? 'CLIFF HANGERS' : slot === 'clock-logo' ? 'CLOCK GAME' : 'THE BIG WHEEL', W / 2, H / 2, W * .92, 0)); if (T) label('transparent around the sign', 20, 20, 26); return c.toDataURL('image/png'); }
  if (slot === 'wheel-frame') { const G = SS.WHEEL_GEOM, w = G.window; faded(() => { x.fillStyle = '#c9cdd3'; x.beginPath(); x.roundRect(60, 40, W - 120, H - 80, 60); x.fill(); x.clearRect(w[0], w[1], w[2] - w[0], w[3] - w[1]); });
    if (T) { x.strokeRect(w[0], w[1], w[2] - w[0], w[3] - w[1]); label('SEE-THROUGH window: the game draws the turning', w[0] + 10, w[1] + 20, 22); label('sections inside (5 ... 1.00)', w[0] + 10, w[1] + 52, 22); x.beginPath(); x.moveTo(w[0] - 60, (w[1] + w[3]) / 2); x.lineTo(w[0], (w[1] + w[3]) / 2); x.stroke(); label('pointer line (game draws the pointer)', 20, (w[1] + w[3]) / 2 + 10, 20); }
    return c.toDataURL('image/png'); }
  if (slot === 'host' || slot.startsWith('model')) { const def = slot === 'host' ? SS.HOST : SS.MODEL;
    def.frames.forEach((f, i) => { x.save(); x.translate(i * def.w, 0); faded(() => { if (slot === 'host') ST.drawHost(x, def.w / 2, def.feet[1], 940, f, 0); else ST.drawModel(x, def.w / 2, def.feet[1], 940, f, 0, slot === 'model-2' ? 1 : 0); });
      if (T) { x.strokeRect(1, 1, def.w - 2, def.h - 2); x.beginPath(); x.arc(def.feet[0], def.feet[1], 8, 0, 6.28); x.stroke(); label(f.toUpperCase(), 10, 10, 26); } x.restore(); });
    if (T) label('full body, feet on the dot, one pose per box, transparent', 10, H - 40, 26); return c.toDataURL('image/png'); }
  if (slot === 'nametag') { faded(() => ST.nameTag(x, W / 2, H / 2, W * .96, '')); if (T) label('blank: the game writes the name', 10, 10, 20); return c.toDataURL('image/png'); }
  return c.toDataURL('image/png');
}, {slot, mode});
const slots = await page.evaluate(() => Object.keys(require('src/data/showSprites.js').SLOTS));
for (const slot of slots.filter(n => !only.length || only.some(o => o.endsWith('*') ? n.startsWith(o.slice(0, -1)) : n === o))) { save(slot + '-template', await render(slot, 'template')); save(slot + '-reference', await render(slot, 'reference')); }
await browser.close();
console.log('templates ->', outDir, slots.length, 'slots');
