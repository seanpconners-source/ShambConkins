// Character select screenshots (phone + desktop) and expression-cycle check.
import {open} from './lib.mjs';
import {m} from './sim.mjs';
const many = m.chars.CHARACTERS.map(c => c.id).filter(id => !['sean', 'amber'].includes(id)).slice(0, 40);
const out = process.argv[2] || '/tmp/claude-0/sc';
const errs = [];
for (const [name, viewport] of [['phone', {width: 390, height: 780}], ['desk', {width: 1100, height: 700}], ['tall', {width: 1000, height: 1000}]]) {
  const {browser, page, errors} = await open({viewport});
  await page.evaluate(many => { const p = window.ShambConkins.store.profile; p.shared.push(...['charlie', 'dee', 'dennis', 'frank', 'mac', 'kc', 'mylo', ...many]); }, many);
  await page.click('text=NEW GAME'); await page.waitForTimeout(900);
  await page.screenshot({path: `${out}/setup-${name}.png`});
  const info = await page.evaluate(() => {
    const clip = [...document.querySelectorAll('.cs-tile')].slice(0, 12).filter(t => { const img = t.querySelector('img'); if (!img) return false; const a = img.getBoundingClientRect(), b = t.getBoundingClientRect(); return a.top < b.top - 1 || a.bottom > b.bottom + 1 || a.left < b.left - 1 || a.right > b.right + 1; }).length;
    const grid = document.querySelector('.cs-grid'), panel = document.querySelector('.cs-panel');
    return {clip, tiles: document.querySelectorAll('.cs-tile').length, gridBottom: grid && Math.round(grid.getBoundingClientRect().bottom), panelBottom: panel && Math.round(panel.getBoundingClientRect().bottom), faces: document.querySelectorAll('.cs-hero .cs-face').length, scrollW: document.documentElement.scrollWidth, w: innerWidth};
  });
  console.log(name, JSON.stringify(info));
  await page.waitForTimeout(3200);
  await page.screenshot({path: `${out}/setup-${name}-2.png`});
  errs.push(...errors); await browser.close();
}
console.log('errors', errs);
