// Regression: typed names are display-only; persistent roster owners remain Sean and Amber.
import assert from 'node:assert/strict';
import {open} from './lib.mjs';
import {m} from './sim.mjs';
import {req} from './load.mjs';

const {newPlayer,newRun}=m.state;
const {validRun}=req('src/persistence.js');
assert.equal(newPlayer('   ', 'sean', 0).name, 'Sean');
assert.equal(newPlayer('\n\t', 'amber', 1).name, 'Amber');
assert.equal(newPlayer("  O'Neil  ", 'sean', 0).name, "O'Neil");
assert.equal(newPlayer('x'.repeat(50), 'amber', 1).name.length, 28);
const fixture=newRun(m.board.generateBoard(121, 12, 'mixed'),
  ["O'Neil", '<b id=x>Riley</b>'], ['sean', 'amber'], 12);
assert.deepEqual(fixture.players.map(p=>p.name), ["O'Neil", '<b id=x>Riley</b>']);
assert.deepEqual(fixture.players.map(p=>p.owner), ['Sean', 'Amber']);
assert.equal(validRun(JSON.parse(JSON.stringify(fixture))), true, 'named save remains valid');

const {browser,page,errors}=await open({viewport:{width:390,height:780}});
try {
  await page.evaluate(()=>{
    const p=window.ShambConkins.store.profile;
    p.rosters.Sean.push('charlie');
    p.rosters.Amber.push('dee');
    p.settings.reducedMotion=true;
  });
  await page.click('[data-action="setup"]');
  await page.fill('#player-name-0', '   ');
  await page.click('.cs-panel.p1 .cs-tile[data-id="charlie"]');
  assert.equal(await page.inputValue('#player-name-0'),'Sean','blank name fallback on character change');

  await page.fill('#player-name-0',"O'Neil");
  await page.fill('#player-name-1','<b id=x>Riley</b>');
  await page.click('.cs-panel.p2 .cs-tile[data-id="dee"]');
  assert.deepEqual(await page.locator('#player-name-0, #player-name-1').evaluateAll(
    nodes=>nodes.map(n=>n.value)),["O'Neil",'<b id=x>Riley</b>']);
  assert.equal(await page.locator('#x').count(),0,'setup name must be escaped');
  await page.screenshot({path:'/tmp/claude-0/names-setup-phone.png'});
  await page.setViewportSize({width:1100,height:700});
  await page.screenshot({path:'/tmp/claude-0/names-setup-desktop.png'});
  await page.setViewportSize({width:390,height:780});

  await page.click('[data-action="start-run"]');
  await page.waitForFunction(()=>window.ShambConkins.store.run?.players[1]?.name==='<b id=x>Riley</b>');
  const active=await page.evaluate(()=>{
    const S=window.ShambConkins;
    return {names:S.store.run.players.map(p=>p.name),
      owners:S.store.run.players.map(p=>p.owner),
      selected:S.store.run.players.map(p=>p.character),
      htmlInjected:!!document.getElementById('x'),
      panels:document.getElementById('player-panels')?.textContent||''};
  });
  assert.deepEqual(active.names,["O'Neil",'<b id=x>Riley</b>']);
  assert.deepEqual(active.owners,['Sean','Amber']);
  assert.deepEqual(active.selected,['charlie','dee']);
  assert.equal(active.htmlInjected,false,'board display must escape HTML-like names');
  assert.match(active.panels,/O'Neil/);
  assert.match(active.panels,/<b id=x>Riley<\/b>/);

  await page.evaluate(()=>window.ShambConkins.saveRun());
  await page.reload();
  const saved=await page.evaluate(()=>{
    const S=window.ShambConkins;
    return {names:S.store.run?.players.map(p=>p.name),
      owners:S.store.run?.players.map(p=>p.owner),
      rosterSean:S.store.profile.rosters.Sean.includes('charlie'),
      rosterAmber:S.store.profile.rosters.Amber.includes('dee'),
      crossSean:S.store.profile.rosters.Sean.includes('dee'),
      crossAmber:S.store.profile.rosters.Amber.includes('charlie')};
  });
  assert.deepEqual(saved.names,["O'Neil",'<b id=x>Riley</b>']);
  assert.deepEqual(saved.owners,['Sean','Amber']);
  assert.equal(saved.rosterSean,true);
  assert.equal(saved.rosterAmber,true);
  assert.equal(saved.crossSean,false);
  assert.equal(saved.crossAmber,false);

  // Vault/developer game consumes the same named saved players, including handoff/results.
  await page.evaluate(()=>{
    const S=window.ShambConkins,g=S.gameRegistry.find(g=>g.engine==='yahtzee');
    if(!g)throw new Error('Yahtzee minigame missing');
    void S.requestGame({id:g.id,origin:'dev'});
  });
  await page.locator('#dialog [data-dialog-choice="0"]').click();
  await page.waitForFunction(()=>!!window.ShambConkins.store.session);
  assert.match(await page.locator('#game-scorebar').innerText(),/O'Neil/);
  assert.match(await page.locator('#game-scorebar').innerText(),/<b id=x>Riley<\/b>/);
  assert.equal(await page.locator('#x').count(),0,'minigame labels must be escaped');
  // A direct pass/handoff also draws the current player's display name.
  await page.evaluate(()=>{void window.ShambConkins.store.session.pass(1,'Ready to play?');});
  await page.waitForFunction(()=>document.querySelector('.pass-card h2')?.textContent?.includes('Riley'));
  assert.match(await page.locator('.pass-card h2').innerText(),/<b id=x>Riley<\/b>/);
  await page.evaluate(()=>window.ShambConkins.store.session.finish([3,1],'Name regression'));
  await page.waitForFunction(()=>document.getElementById('dialog-title')?.textContent?.includes("O'Neil"));
  assert.match(await page.locator('#dialog').innerText(),/<b id=x>Riley<\/b>/);
  assert.equal(await page.locator('#x').count(),0,'result labels must be escaped');
  assert.deepEqual(errors,[], 'browser must not log JS errors');
  console.log('Player name setup, character changes, save/reload, handoff, results, ownership and escaping: OK');
} finally {await browser.close();}
