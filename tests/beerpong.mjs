// Beer pong turn rules: two shots a turn, sink both -> "bring it back" third shot, never a fourth; match runs to a cleared rack.
import {open} from './lib.mjs';
const {browser, page, errors} = await open({viewport: {width: 390, height: 780}});
await page.evaluate(() => { window.ShambConkins.requestGame({id: 'paddys-beer-pong', origin: 'arcade'}); });
const D = () => page.evaluate(() => { const d = window.ShambConkins.store.session?.debug; return d && d.score && 'turnShots' in d && {actor: d.actor, phase: d.phase, turnShots: d.turnShots, bonus: d.bonus, score: d.score.slice(), message: d.message}; });
async function ready() { for (let i = 0; i < 60; i++) { await page.evaluate(() => { const d = document.getElementById('dialog'); if (d?.open) (d.querySelector('button.primary') || d.querySelector('button'))?.click(); document.querySelector('#game-layer [data-ready]')?.click(); }); const st = await D(); if (st?.phase === 'aim') return st; await page.waitForTimeout(150); } return D(); }
async function shot(hit) { await ready(); await page.evaluate(h => { window.ShambConkins.store.session.debug.resolve(h); }, hit); await page.waitForTimeout(250); const mid = await D(); await page.waitForTimeout(1600); console.log('shot', hit, JSON.stringify(mid)); return mid; }
const log = [], fail = m => { log.push('FAIL ' + m); console.log('FAIL', m); };
console.log('start'); let st = await ready(); console.log('ready', JSON.stringify(st)); if (st.actor !== 0) fail('start actor');
let m = await shot(true); m = await shot(true); if (!m.bonus || m.message !== 'BRING IT BACK!') fail('no bring it back ' + JSON.stringify(m));
await page.screenshot({path: '/tmp/claude-0/sc/beerpong-bringitback.png'});
st = await ready(); if (st.actor !== 0) fail('bonus shot went to other player');
await shot(true); st = await ready(); if (st.actor !== 1) fail('fourth shot allowed ' + JSON.stringify(st));
await shot(false); st = await ready(); if (st.actor !== 1) fail('only one shot for p2');
await shot(true); st = await ready(); if (st.actor !== 0) fail('p2 got third shot without two hits');
await shot(true); await shot(false); st = await ready(); if (st.actor !== 1) fail('miss then hit should switch');
// Finish: P2 needs cups; keep sinking until cleared.
for (let i = 0; i < 24; i++) { const s = await D(); if (!s) break; await shot(s.actor === 1); }
const over = await page.evaluate(() => !window.ShambConkins.store.session?.debug || document.getElementById('dialog')?.open);
console.log(log.length ? log.join('\n') : 'beer pong rules ok', '· finished:', over, '· errors', errors);
await browser.close(); process.exit(log.length || errors.length ? 1 : 0);
