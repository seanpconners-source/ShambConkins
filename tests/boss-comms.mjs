// Boss fights (ROADMAP K21): comm box opener (P1 plays as the boss), phase exchange holds the phase, KO line.
import {open, screenshotPath} from './lib.mjs';
const out = process.argv[2] || screenshotPath('').replace(/[\\/]$/, '');
let bad = 0; const check = (ok, m) => { console.log(ok ? 'PASS' : 'FAIL', m); if (!ok) bad++; };
const {browser, page, errors} = await open({viewport: {width: 390, height: 780}});
await page.evaluate(() => { const S = window.ShambConkins.store; S.setupSelected = ['king-kandy', ...(S.setupSelected || []).slice(1)]; window.ShambConkins.requestGame({id: 'boss-king-kandy', origin: 'arcade'}); });
for (let i = 0; i < 60; i++) { const r = await page.evaluate(() => { const S = window.ShambConkins.store.session; if (S?.debug?.bossId) return true; const d = document.getElementById('dialog'); if (d?.open) (d.querySelector('button.primary') || d.querySelector('button'))?.click(); return false; }); if (r) break; await page.waitForTimeout(250); }
const who = await page.evaluate(() => { const S = window.ShambConkins.store.session; S.debug.skipIntro(); S.debug.immortal = true; S.debug.autopilot[0] = S.debug.autopilot[1] = .25; return S.players.map(p => p.character); });
console.log('players', who);
await page.waitForTimeout(1600); await page.screenshot({path: `${out}/comm-open1.png`});
check(await page.evaluate(() => window.ShambConkins.store.session.debug.comms.busy()), 'opener comm is playing');
await page.waitForTimeout(1900); await page.screenshot({path: `${out}/comm-open2.png`});
for (let i = 0; i < 20 && await page.evaluate(() => window.ShambConkins.store.session.debug.comms.busy()); i++) await page.waitForTimeout(300);
await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; d.setBossHp(d.boss.max * .6); });
await page.waitForTimeout(1300); await page.screenshot({path: `${out}/comm-phase1.png`});
await page.waitForTimeout(1600);
const st = await page.evaluate(() => { const d = window.ShambConkins.store.session.debug; return {mode: d.mode, busy: d.comms.busy()}; });
await page.screenshot({path: `${out}/comm-phase2.png`});
check(st.mode === 'phase' && st.busy, 'phase holds while the exchange plays ' + JSON.stringify(st));
let ended = false; for (let i = 0; i < 25; i++) { await page.waitForTimeout(300); if (await page.evaluate(() => window.ShambConkins.store.session.debug.mode === 'fight')) { ended = true; break; } }
check(ended, 'phase ends after the exchange');
await page.evaluate(() => window.ShambConkins.store.session.debug.killBoss()); await page.waitForTimeout(3000); await page.screenshot({path: `${out}/comm-ko.png`});
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await browser.close(); process.exit(bad ? 1 : 0);
