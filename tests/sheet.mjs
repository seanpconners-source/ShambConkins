// Contact sheets for art review. Usage: node tests/sheet.mjs logos|items|chars out.png [filter-regex]
import {open} from './lib.mjs';
const [kind='logos', out='/tmp/claude-0/sheet.png', filter=''] = process.argv.slice(2);
const {browser, page} = await open({viewport: {width: 1500, height: 900}});
await page.evaluate(({kind, filter}) => {
  const S = window.ShambConkins, re = filter ? new RegExp(filter, 'i') : null;
  let cells = [];
  if (kind === 'logos') cells = [...new Set(S.gameRegistry.map(g => g.source))].filter(s => !re || re.test(s)).map(s => [S.brandHTML(s), s]);
  if (kind === 'items') { const have = k => window.ShambConkins.itemArtHTML; cells = S.items.filter(i => !re || re.test(i.id + ' ' + i.name + ' ' + i.source)).slice(0, 60).map(i => [S.itemArtHTML(i), i.name + ' · ' + i.kind]); }
  if (kind === 'venues') { const seen = new Set(); cells = S.locations.filter(l => l.venue && !seen.has(l.venue) && seen.add(l.venue)).map(l => [S.locationArtHTML(l), l.venue + ' · ' + l.name]); }
  document.body.style.cssText = 'overflow:auto;height:auto';
  document.getElementById('app').style.cssText = 'height:auto;overflow:visible';
  document.getElementById('app').innerHTML = '<div style="display:grid;grid-template-columns:repeat(5,290px);gap:8px;padding:10px;background:#fff">' + cells.map(([h, l]) => `<div style="border:1px solid #ccc;padding:6px;text-align:center;font:11px sans-serif;color:#000"><div style="min-height:64px;display:flex;align-items:center;justify-content:center;background:#8a8f99">${h}</div>${l}</div>`).join('') + '</div>';
}, {kind, filter});
await page.waitForTimeout(1500);
await page.screenshot({path: out, fullPage: true});
await browser.close();
