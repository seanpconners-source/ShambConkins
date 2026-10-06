# Writing a ShambConkins minigame

Everything is plain browser JS, bundled by `tools/build.mjs` into one offline HTML file.
Modules are CommonJS-style (`require("src/x.js")`, `Object.assign(exports,{...})`) and must be
listed in `src/modules.json` (`node tools/check-modules.mjs` verifies this). No ES modules, no npm
packages at runtime. Anything you vendor must be MIT/BSD/CC0 and credited in `docs/CREDITS.md`.

## Registering a game (packs)
Put new games in a pack module under `src/packs/` (`partyPack`, `arenaPack`, `tarantinoPack`, `rushPack`,
`bossPack` already exist as stubs and are already wired into the registry and `ENGINES`):

```js
const engines={myGame};                      // engine name -> async function(s)
const games=[{id:'standoff',engine:'myGame',title:'Pulp Fiction · Mexican Standoff',
  source:'Pulp Fiction',                       // every game must reference a real movie/show/game
  icon:'🔫',category:'duel',                   // arcade sports strategy skill puzzle duel casino trivia coop
  duration:'best of 5',rules:'One or two sentences a new player can follow.'}];
Object.assign(exports,{engines,games,events:[]});
```
`games` join the random pool (`family` defaults to the engine name; `reward` defaults to 8).
`events` are encounter-only variants. Extra source files for your pack go in `src/engines/` or
`src/data/`; add every new file to `src/modules.json` (before `src/app.js` is not required, order is lazy).

## The session object `s` (src/engines/session.js)
* `const [c,x]=s.canvas(W,H,{fill:true})`: canvas + 2d context. With `fill:true` the canvas resizes to the
  available area and `s.W`/`s.H` always hold the current logical size (handle resizes: read `s.W`/`s.H` every frame).
  Add `s.body.classList.add('drag-arena-body')` for edge-to-edge touch arenas (see `horde.js`).
* `s.frame((dt,t)=>{...})` the animation loop (dt seconds, already clamped and paused-aware). `s.timer(sec,tick,end)`,
  `await s.wait(ms)` (pause-aware), `await s.delay(ms)`.
* `s.players[i]` = `{name,character,...}`; `s.sprite(x,i,cx,cy,size)` draws that player's head portrait on a canvas
  (uses their current character photo, falls back to an emoji). Use heads wherever a "character" is needed.
* `s.random()` is a seeded RNG that gives both players the same sequence per game: use it for anything that must be
  fair (spawn patterns, boards, questions). `seededRandom(seed)` from `src/utils.js` makes extra streams.
* `s.setScores([a,b])` live scores in the header; `s.finish([a,b],'result text')` ends the game (higher score wins,
  equal is a tie). Rewards/unlocks are handled by the launcher.
* `s.pass(player,'text','Ready',{countdown:3})` shows a hand-off screen for turn-based / hidden-information play.
  Return value is false if the game was aborted: always `if(!await s.pass(...))return;`.
* `s.shared=true` for real-time games where both humans play at once on one screen. `s.updateScores()` after changing it.
* Co-op survival: `s.cooperative=true` and set `s.teamResult={kind:'survival',won,tied:false,humanTotal,cpuTotal:0,cpuScores:[0,0],duration}` before `s.finish`.
* `s.on(el,event,fn)` registers a listener that is removed automatically. Use it (never `addEventListener` directly).
* `s.hint('how to play')` fills the collapsible controls help. `s.status('text')` sets the status line.
* `s.react(player,'happy'|'sad')` triggers the head animation in the score bar.
* Sound: `sound('tap'|'pickup'|'win'|'lose'|'shot'|'card'|'rare'|...)`, `tone(freq,sec,vol,'sine'|'square'...)`, `vibrate(ms)` from `src/audio.js`.

## Controls: touch first
Phones are the main device; two people share one screen. **Prefer direct touch over on-screen button bars**, because buttons
steal the game area:
* `ownedPointers(s,(i,p,id)=>{...},(i,id)=>{...})` from `src/engines/duelControls.js`: each finger belongs to the player
  whose half of the screen it first touched (left/right by default; pass a `chooseOwner` for top/bottom). Use it for drag-to-move,
  tap-to-act, swipe-to-throw, drag-back-and-release aiming, hold-to-charge.
* Keyboard support for desktop: P1 `WASD` + `Space`, P2 arrows + `Enter`.
* `duelInputs(...)` and `s.controls(...)` render the old on-screen pads. Use them only where a game truly needs discrete buttons,
  and keep them to one slim row.
* Turn-based games: tap/drag directly on the canvas. Never require typing.

## Look and feel
Games should feel finished: title/countdown, readable HUD, juicy feedback (screen shake, particles, sounds), clear win/lose state,
and a 45-90 second playtime unless the design needs more. Draw everything procedurally on the canvas (no external images; heads come
from `s.sprite`). The page background is light; the canvas should supply its own dark/colorful backdrop.

## Testing
* `node tools/build.mjs --out /tmp/yourname.html` builds to a private path (never overwrite `dist/` from a parallel task).
* `SHAMB_FILE=/tmp/yourname.html node tests/games.mjs 6 3 <id-regex>` launches each game and fuzzes input for 6 s; it must print `N/N games ran clean`.
* Take screenshots with Playwright (see `tests/lib.mjs` `open({file})`, module at `/node-tools/node_modules/`) and look at them:
  `await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'})},'my-id')` (do NOT await the returned promise),
  then click the "Start game" button in `#dialog`, then drive the canvas with `page.mouse`.
* Test at desktop (1100x700) and phone portrait (390x780) sizes.
