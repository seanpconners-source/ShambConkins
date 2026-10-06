// Node-side simulation helpers: DOM-free runs for balance audits.
import {req} from './load.mjs';
const mem = {}; globalThis.localStorage = {getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }};
globalThis.window = globalThis; globalThis.document = {getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: {classList: {toggle() {}}}, addEventListener() {}};
export const m = {
  state: req('src/state.js'), board: req('src/board.js'), profile: req('src/profile.js'), items: req('src/items.js'),
  chars: req('src/characters.js'), games: req('src/gameRegistry.js'), cat: req('src/contentPolicy.js'),
};
export function freshRun(seed = 1, turns = 24) {
  const board = m.board.generateBoard(seed, turns, 'mixed');
  const run = m.state.newRun(board, ['Sean', 'Amber'], ['sean', 'amber'], turns);
  const profile = m.profile.freshProfile();
  m.state.store.profile = profile; m.state.store.run = run;
  return {run, profile};
}
