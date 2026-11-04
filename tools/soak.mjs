// SOAK TEST (ROADMAP Q00): runs the long tests over and over until you stop it (Ctrl+C / close the window) or the hours
// run out, and keeps a rolling report a Claude session can read later. No GitHub Actions minutes, nothing uploaded.
//   node tools/soak.mjs [--hours 8] [--no-online] [--no-build] [--port 8123]
// Windows one-click: SOAK-TEST.cmd (finds Node, installs Playwright + Chromium once, then runs this).
// Report folder soak-reports/ (git-ignored; share LATEST.md and fails/ by uploading them to the Claude chat):
//   LATEST.md      summary: every test's runs / passes / fails, the newest failures with the end of their log
//   history.jsonl  one line per test run {at, round, test, ok, secs, code, args}
//   fails/         the full log of every failed or hung run
//   shots/, app/   screenshots and the game build
import {spawn, execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i < 0 ? def : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const HOURS = +arg('hours', 0) || 0, ONLINE = !arg('no-online', false), BUILD = !arg('no-build', false), PORT = +arg('port', 8123), WPORT = 8787;
const OUT = path.join(root, 'soak-reports'), FAILS = path.join(OUT, 'fails'), SHOTS = path.join(OUT, 'shots'), APP = path.join(OUT, 'app');
for (const d of [OUT, FAILS, SHOTS]) fs.mkdirSync(d, {recursive: true});
const isWin = process.platform === 'win32', NODE = process.execPath;
const started = Date.now(), until = HOURS ? started + HOURS * 3600e3 : Infinity;
const stamp = (t = Date.now()) => new Date(t).toISOString().replace('T', ' ').slice(0, 19);
const fileStamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const rnd = n => Math.floor(Math.random() * n), pick = a => a[rnd(a.length)];
let stopping = false, round = 0, current = null;
const kids = new Set();
function say(...a) { console.log(`[${stamp()}]`, ...a); }

// ---- process helpers (kill whole trees: a hung test leaves Chromium behind otherwise) ----
function killTree(child) {
  if (!child || child.exitCode !== null) return;
  try { if (isWin) execSync(`taskkill /pid ${child.pid} /T /F`, {stdio: 'ignore'}); else process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
}
function run(cmd, args, {env = {}, timeout = 600, cwd = root, shell = false} = {}) {
  return new Promise(resolve => {
    const t0 = Date.now(); let out = '';
    const child = spawn(cmd, args, {cwd, env: {...process.env, ...env}, shell, detached: !isWin, windowsHide: true});
    kids.add(child); current = child;
    const add = b => { out += b; if (out.length > 400e3) out = out.slice(-300e3); };
    child.stdout.on('data', add); child.stderr.on('data', add);
    let hung = false; const timer = setTimeout(() => { hung = true; killTree(child); }, timeout * 1000);
    child.on('close', code => { clearTimeout(timer); kids.delete(child); if (current === child) current = null;
      resolve({ok: code === 0 && !hung, code: hung ? 'TIMEOUT' : code, hung, secs: Math.round((Date.now() - t0) / 100) / 10, out}); });
    child.on('error', e => { clearTimeout(timer); kids.delete(child); resolve({ok: false, code: 'SPAWN', secs: 0, out: String(e)}); });
  });
}
function background(cmd, args, opts = {}) {
  const child = spawn(cmd, args, {cwd: opts.cwd || root, env: {...process.env, ...(opts.env || {})}, shell: !!opts.shell, detached: !isWin, windowsHide: true});
  let log = ''; child.stdout?.on('data', b => { log = (log + b).slice(-20e3); }); child.stderr?.on('data', b => { log = (log + b).slice(-20e3); });
  kids.add(child); child.on('close', () => kids.delete(child)); child.log = () => log; return child;
}
const portOpen = port => new Promise(res => { const s = net.connect(port, '127.0.0.1'); s.on('connect', () => { s.end(); res(true); }); s.on('error', () => res(false)); });
async function waitPort(port, secs) { for (let i = 0; i < secs * 2; i++) { if (await portOpen(port)) return true; await new Promise(r => setTimeout(r, 500)); } return false; }

// ---- report ----
const stats = new Map(), recent = [];
let version = '?', commit = '?', notes = [];
try { version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version; } catch {}
try { commit = execSync('git rev-parse --short HEAD', {cwd: root, stdio: ['ignore', 'pipe', 'ignore']}).toString().trim() + ' ' + execSync('git rev-parse --abbrev-ref HEAD', {cwd: root, stdio: ['ignore', 'pipe', 'ignore']}).toString().trim(); } catch {}
function record(name, args, r) {
  const s = stats.get(name) || {runs: 0, pass: 0, fail: 0, hung: 0, secs: 0, last: '', lastFail: ''}; stats.set(name, s);
  s.runs++; s.secs += r.secs; if (r.ok) s.pass++; else { s.fail++; if (r.hung) s.hung++; s.lastFail = stamp(); }
  s.last = r.ok ? 'pass' : r.hung ? 'HUNG' : 'FAIL';
  fs.appendFileSync(path.join(OUT, 'history.jsonl'), JSON.stringify({at: stamp(), round, test: name, ok: r.ok, secs: r.secs, code: r.code, args, version, commit}) + '\n');
  if (!r.ok) {
    const file = path.join(FAILS, `${fileStamp()}-${name.replace(/[^a-z0-9-]+/gi, '_')}.log`);
    fs.writeFileSync(file, `${name} ${JSON.stringify(args)}\nround ${round} · exit ${r.code} · ${r.secs}s · ${stamp()} · v${version} ${commit}\n\n${r.out}`);
    recent.unshift({name, args, at: stamp(), code: r.code, tail: r.out.trim().split(/\r?\n/).slice(-30).join('\n'), file: path.relative(OUT, file)});
    recent.length = Math.min(recent.length, 12);
  }
  writeReport();
}
function writeReport(final = false) {
  const mins = Math.round((Date.now() - started) / 60000), rows = [...stats.entries()].sort((a, b) => b[1].fail - a[1].fail || a[0].localeCompare(b[0]));
  const totalFail = rows.reduce((n, [, s]) => n + s.fail, 0), totalRuns = rows.reduce((n, [, s]) => n + s.runs, 0);
  const md = [`# Soak test report`, '',
    `- Game: v${version} (${commit})  ·  machine: ${os.hostname()} (${os.platform()}, ${Math.round(os.totalmem() / 2 ** 30)} GB RAM)`,
    `- Started ${stamp(started)}  ·  ${final ? 'stopped' : 'still running'} at ${stamp()}  ·  ${Math.floor(mins / 60)} h ${mins % 60} min  ·  round ${round}`,
    `- ${totalRuns} test runs, **${totalFail} failed**${ONLINE ? '' : '  ·  online tests OFF'}`, ...notes.map(n => `- ${n}`), '',
    '| test | runs | passed | failed | hung | avg secs | last | last failure |', '|---|---:|---:|---:|---:|---:|---|---|',
    ...rows.map(([n, s]) => `| ${n} | ${s.runs} | ${s.pass} | ${s.fail} | ${s.hung} | ${Math.round(s.secs / s.runs)} | ${s.last} | ${s.lastFail || '–'} |`),
    '', '## Newest failures', '', ...(recent.length ? recent.flatMap(f => [`### ${f.name} · ${f.at} · exit ${f.code}`, `args ${JSON.stringify(f.args)} · full log: \`${f.file}\``, '```', f.tail, '```', '']) : ['None yet.']),
    '', 'For Claude: read this file, then `history.jsonl` and the logs in `fails/`. Fix what failed, add a regression test.'];
  fs.writeFileSync(path.join(OUT, 'LATEST.md'), md.join('\n'));
}

// ---- what to run ----
let bossIds = [], netIds = [];
try {
  const {req} = await import(new URL('../tests/load.mjs', import.meta.url));
  bossIds = req('src/data/bosses.js').BOSSES.map(b => b.id);
  const solo = req('src/solo.js'), reg = req('src/gameRegistry.js');
  netIds = [...reg.GAMES, ...reg.EVENT_GAMES].filter(g => solo.netNative?.(g) && !g.bossId).map(g => g.id);
} catch (e) { notes.push('could not list bosses / online games: ' + e.message); }
const SHARDS = 12;
// [name, script, args, env, timeout secs, needs online]
function jobs() {
  const shard = round % SHARDS, who = rnd(2), drop = pick([0, 0, 3, 6]), boss = pick(bossIds.length ? bossIds : ['king-kandy']);
  const list = [
    ['arcade-console', 'tests/arcade-console.mjs', [], {}, 600],
    ['route', 'tests/route.mjs', [pick(['390x780', '1100x700', '740x820'])], {}, 400],
    ['solo-board', 'tests/solo-board.mjs', [], {TURNS: String(20 + rnd(20)), WHO: String(who), LIMIT_S: '900'}, 1100],
    ['frank', 'tests/frank.mjs', [], {}, 500], ['endings', 'tests/endings.mjs', [], {}, 500], ['checkpoint', 'tests/checkpoint.mjs', [], {}, 500],
    ['vault', 'tests/vault.mjs', [], {}, 500], ['pkmn-autopp', 'tests/pkmn-autopp.mjs', [], {}, 300], ['boss-ladder', 'tests/boss-ladder.mjs', [], {}, 500],
    ['boss-fight', 'tests/bossdiff.mjs', [boss], {DIFF: String(rnd(4)), PH: '20', C: '1', L: pick(['phone:390x780', 'wide:1100x700'])}, 900],
    [`minigames-${shard + 1}-of-${SHARDS}`, 'tests/games.mjs', ['4', '1', '.*', String(shard), String(SHARDS)], {SHAMB_GAME_COOLDOWN_MS: '800'}, 1800],
  ];
  if (round % 3 === 0) list.push(['levelflow', 'tests/levelflow.mjs', [], {}, 600], ['board-300', 'tests/board.mjs', [], {}, 900], ['unlocks', 'tests/unlocks.mjs', [], {}, 600], ['pinball-sim', 'tests/pinball-sim.mjs', ['6'], {}, 900], ['doom-sim', 'tests/doom-sim.mjs', ['100'], {}, 900], ['holeit-layouts', 'tests/holeit.mjs', ['--node'], {}, 600]);
  if (ONLINE && wranglerUp) {
    list.push(['online-board', 'tests/online-board.mjs', [], {TURNS: String(12 + rnd(12)), ...(drop ? {DROP: String(drop)} : {}), LIMIT_S: '900', ROOM: 'soak-' + rnd(1e6)}, 1100]);
    if (netIds.length) list.push(['online-games', 'tests/online-native.mjs', [], {GAMES: [pick(netIds), pick(netIds)].join(','), ...(rnd(2) ? {LAG: '80-150'} : {}), ROOM: 'soak-' + rnd(1e6)}, 1200]);
  }
  return list;
}

// ---- setup: build, serve, online rooms ----
let wranglerUp = false;
async function setup() {
  if (BUILD) {
    say('Building the game (installable copy) …');
    const b = await run(NODE, ['tools/build.mjs', '--pwa', APP], {timeout: 1800});
    if (!b.ok) { fs.writeFileSync(path.join(FAILS, `${fileStamp()}-BUILD.log`), b.out); notes.push('BUILD FAILED, see fails/'); writeReport(true); say('Build failed:\n' + b.out.slice(-2000)); process.exit(1); }
  } else if (!fs.existsSync(path.join(APP, 'index.html'))) { say('No build in soak-reports/app: run without --no-build first.'); process.exit(1); }
  if (await portOpen(PORT)) say(`Port ${PORT} is already serving something; using it.`);
  else { background(NODE, ['tools/serve-static.mjs', APP, String(PORT)]); if (!await waitPort(PORT, 20)) { say('Could not start the local web server on port ' + PORT); process.exit(1); } }
  if (ONLINE) {
    if (await portOpen(WPORT)) wranglerUp = true;
    else {
      say('Starting the local online-rooms server (wrangler, needs internet the first time) …');
      const w = background(isWin ? 'npx.cmd' : 'npx', ['--yes', 'wrangler@3', 'dev', '--local', '--port', String(WPORT)], {cwd: path.join(root, 'cloudflare'), shell: isWin});
      wranglerUp = await waitPort(WPORT, 120);
      if (!wranglerUp) { notes.push('online tests skipped: wrangler did not start (' + w.log().trim().split('\n').slice(-1)[0] + ')'); killTree(w); }
    }
  }
}
async function stop(why) {
  if (stopping) return; stopping = true; say('Stopping:', why);
  for (const k of [...kids]) killTree(k);
  writeReport(true); say('Report:', path.join(OUT, 'LATEST.md')); process.exit(0);
}
process.on('SIGINT', () => stop('Ctrl+C')); process.on('SIGTERM', () => stop('closed')); process.on('SIGHUP', () => stop('window closed'));

await setup();
say(`Soak test running${HOURS ? ` for ${HOURS} h` : ' until you close this window'}. Report: ${path.join(OUT, 'LATEST.md')}`);
const env = {SHAMB_URL: `http://localhost:${PORT}/`, SHAMB_SHOTS_DIR: SHOTS, OUT: SHOTS, SC_NET_HOST: `ws://127.0.0.1:${WPORT}`, SHAMB_NAV_TIMEOUT_MS: '120000'};
while (!stopping && Date.now() < until) {
  round++;
  for (const [name, script, args, extra, timeout] of jobs()) {
    if (stopping || Date.now() >= until) break;
    if (os.freemem() < 1.5 * 2 ** 30) { say('Low memory, pausing 60 s'); await new Promise(r => setTimeout(r, 60e3)); }
    say(`round ${round} · ${name} ${args.join(' ')} ${Object.entries(extra).map(([k, v]) => k + '=' + v).join(' ')}`);
    const r = await run(NODE, [script, ...args], {env: {...env, ...extra}, timeout});
    say(`  ${r.ok ? 'pass' : r.hung ? 'HUNG (killed)' : 'FAIL'} in ${r.secs}s`);
    record(name, {args, env: extra}, r);
  }
}
await stop(HOURS ? `${HOURS} h done` : 'done');
