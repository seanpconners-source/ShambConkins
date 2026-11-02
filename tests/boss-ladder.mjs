// Boss fights (ROADMAP K5-K7): Boss Select ladder. SHAMB_URL=... node tests/boss-ladder.mjs [outdir]
import {open, screenshotPath} from './lib.mjs';
const out = process.argv[2] || screenshotPath('').replace(/[\\/]$/, '');
const {browser, page, errors} = await open({viewport: {width: 390, height: 780}});
const act = v => page.evaluate(v => { const b = document.createElement('button'); b.dataset.action = v; document.body.append(b); b.click(); b.remove(); }, v);
let bad = 0; const check = (ok, m) => { console.log(ok ? 'PASS' : 'FAIL', m); if (!ok) bad++; };
await page.evaluate(() => { const p = window.ShambConkins.store.profile; p.bossesBeaten = ['king-kandy']; delete p.bossTiers; p.settings.solo = {...(p.settings.solo || {}), on: false}; });
await act('arcade'); await page.waitForTimeout(300);
await page.selectOption('#catalog-filter', 'boss'); await page.waitForTimeout(300);
const lit = () => page.evaluate(() => { const c = [...document.querySelectorAll('.catalog-grid>article')].find(a => /King Kandy/.test(a.querySelector('h3')?.textContent)); return c ? c.querySelectorAll('.boss-medals i.won').length : -1; });
check(await lit() === 1, 'old save: beaten boss shows 1 medal (Easy)');
const card = await page.evaluateHandle(() => [...document.querySelectorAll('.catalog-grid>article')].find(a => /King Kandy/.test(a.querySelector('h3')?.textContent)));
await (await card.asElement().$('button')).scrollIntoViewIfNeeded(); await page.screenshot({path: `${out}/ladder-card.png`});
async function openPicker() { await page.evaluate(() => { const c = [...document.querySelectorAll('.catalog-grid>article')].find(a => /King Kandy/.test(a.querySelector('h3')?.textContent)); c.querySelector('button').click(); }); await page.waitForTimeout(400);
  return page.evaluate(() => [...document.querySelectorAll('#dialog button')].map(b => ({t: b.innerText.replace(/\s+/g, ' ').trim(), dis: b.disabled, pri: b.classList.contains('primary')}))); }
let ch = await openPicker(); console.log(JSON.stringify(ch));
await page.screenshot({path: `${out}/ladder-picker.png`});
check(!ch[1].dis && ch[1].pri && ch[2].dis && ch[3].dis, 'picker: Medium open (primary), Hard/Extreme locked');
// play Medium and win
await page.evaluate(() => document.querySelectorAll('#dialog button')[1].click());
let diff = null;
for (let i = 0; i < 60; i++) { await page.waitForTimeout(300); diff = await page.evaluate(() => { const s = window.ShambConkins.store.session; if (s?.debug?.killBoss && s.debug.mode !== 'intro') { const v = s.debug.difficulty; s.debug.killBoss(); return v; } s?.debug?.skipIntro?.(); const d = document.getElementById('dialog'); if (d.open && !s) d.querySelector('button')?.click(); return null; }); if (diff != null) break; }
check(diff === 1, 'fight launched at Medium (' + diff + ')');
let card2 = null;
for (let i = 0; i < 60; i++) { await page.waitForTimeout(400); card2 = await page.evaluate(() => { const d = document.getElementById('dialog'); return d.open && !window.ShambConkins.store.session ? d.innerText : null; }); if (card2 && /CLEARED|win|Run|team/i.test(card2)) break; }
await page.screenshot({path: `${out}/ladder-result.png`});
check(/MEDIUM CLEARED/.test(card2 || ''), 'result card says MEDIUM CLEARED');
check(await page.evaluate(() => window.ShambConkins.store.profile.bossTiers?.['king-kandy']) === 1, 'profile.bossTiers = 1');
await page.evaluate(() => document.querySelector('#dialog button.primary,#dialog button')?.click()); await page.waitForTimeout(600);
for (let i = 0; i < 5; i++) { if (await page.evaluate(() => document.getElementById('dialog').open)) { await page.evaluate(() => document.querySelector('#dialog button')?.click()); await page.waitForTimeout(300); } }
await page.selectOption('#catalog-filter', 'boss').catch(() => {}); await page.waitForTimeout(300);
check(await lit() === 2, 'card now shows 2 medals');
ch = await openPicker(); check(!ch[2].dis && ch[2].pri && ch[3].dis, 'picker: Hard now open, Extreme locked');
check(errors.length === 0, 'no page errors ' + errors.join(' | '));
await browser.close(); process.exit(bad ? 1 : 0);
