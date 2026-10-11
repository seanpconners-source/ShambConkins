# BF-00 — Broforce Mobile architecture and integration contract

**Status:** design-only integration contract; **not an implemented or validated minigame**.  
**Observed source revision:** `16770ee301e5a94bda02e375cf0341177b481e3a` (parent `feature/broforce-mobile` at inspection).  
**Document owner:** BF-00; all runtime work below is future work, subject to review against BF-12/13/17/24/25/26 task contracts. No Broforce source exists at this pinned revision.

## 1. Verified host-system facts and points of contact

- `src/modules.json` enumerates the browser CommonJS-style modules included in the offline HTML by `tools/build.mjs`; `tools/check-modules.mjs` checks the list. Runtime must remain offline and dependency-free. `src/engines/index.js` combines built-in engines with `PACKS.engines`; `src/packs/index.js` concatenates `games` and `events` from pack modules; `src/gameRegistry.js` adds those definitions to lookup and the eligible random pool.
- `src/gameLauncher.js:26-59` selects games, records board pending state, handles roulette/intro and start/cancel, creates a `GameSession`, calls `ENGINES[game.engine](session)` and traps launch errors. `origin` is `board`, `arcade`, or `dev`; `resume` is a launcher flag, not a game simulation snapshot. Board selection uses `runRandom(run)`, while non-board uses `Math.random`.
- `GameSession` (`src/engines/session.js`) owns its canvas, abort/listener cleanup, seeded `s.random`, current players, `s.frame` (dt in **seconds**, capped at 0.04 s), `s.pass`, pause/resume, score/header, and `s.finish(scores,label)`. `s.finish` marks finished, disposes, and invokes a two-argument callback. The launcher callback captures `session.teamResult` *after* disposal, so structured Broforce results can use that existing metadata channel without changing the two-argument finish API.
- `src/engines/horde.js` is the closest simultaneous co-op precedent: one world with two players, `s.shared=true`, `s.cooperative=true`, touch-owner controls, team end conditions, `teamResult.kind='survival'` and `s.finish`. Its many-hit HP, automatic weapons, infinite world, score/revive rules and performance choices are **not** the Broforce specification. `src/engines/marioBros.js` and `castlevania.js` use seeded 16px levels, a fixed 1/60-second step, phase transitions, debug hooks and separate P1/P2 worlds for pass-and-play ghosts; reuse their fixed-step technique, **not** their per-player world duplication.
- `src/engines/duelControls.js` exposes `ownedPointers`, `keyHolds` and `worldView`: pointers retain the owner assigned on pointer-down until release; `resetOnPause` clears input; `worldView` maps input and a landscape logical world to portrait rotation. Coordinate transforms for Broforce must be consistent across display, aim and hit tests.
- `src/state.js:newPlayer` stores a user-editable display `name`, fixed stable `owner` (`Sean` / `Amber`) and selected `character` separately. `src/persistence.js:validRun` requires exactly two players with those fixed owner keys, game/result pending states, and compatible version-20 saves. `src/app.js:116-120` restarts an interrupted game by `requestGame({id:pending.gameId,resume:true})`, and re-presents a persisted result.
- **Reward hazard:** `settleGame` in `src/gameLauncher.js:60-79` unconditionally records a non-dev game, gives board points/wins, performs generic winner/themed recruitment in lines 69-74, survival recruitment in line 75, boss rewards in line 76, and progression updates. It also presents results and saves profile. This pipeline must have an explicit Broforce early dispatch; merely setting `cooperative` or `winner=null` does **not** suppress all generic rewards. `src/rewards.js` supplies themed random pools/guarantees, while `src/profile.js:69-89` immediately saves recruitment and may substitute a movie Bond. Neither behavior is acceptable for an exact Broforce grant.

## 2. Integration placement and proposed source tree (none created in BF-00)

The following is the **proposed target layout, not an assertion of existing files**. Final filenames within the implementation-only cluster must match the other workers' already-fixed contracts; bridge through adapters instead of renaming their exports.

| Future path / area | Responsibility | Integration ownership |
| --- | --- | --- |
| `src/packs/broforcePack.js` | Lightweight, lazy engine registration and game descriptors; unique game ID, stable source, duration/rules; explicitly not random-eligible initially | PM integration only |
| `src/engines/broforce.js` | Single `async broforce(s)` host adapter: initialize scene, coordinate source subsystems, own `s.frame`, consume pause/input, finish exactly once | PM integrator, **unless** a worker's fixed assignment explicitly owns it |
| `src/engines/broforce/**` (subsystem filenames **TBD from actual BF briefs**) | Terrain/stage generation, player movement, combat, NPCs, rescue, visuals and original sound/assets; deterministic simulation contracts below | Respect BF-12/13/17/24/25/26 exclusive files; no speculative cross-worker changes |
| `src/packs/index.js`, `src/modules.json` | Register pack and every new module; preserve lazy-require order | PM integration only |
| `src/gameLauncher.js` | Broforce-specific result dispatch and reward suppression, persisted result presentation | PM integration only |
| `src/profile.js`, `src/persistence.js` | Load/save atomic exact-claim receipts and backward-compatible pending metadata | PM integration only |
| `src/app.js` | If needed, persist/recover attempt and results when resuming or cancelling; no launcher or save changes by workers | PM integration only |
| `src/rewards.js`, `src/gameRegistry.js`, `src/engines/index.js` | **Avoid modifications if pack mechanism suffices**; any eventual edits only with PM integration ownership | PM integration only |
| `tests/broforce*.mjs` | Independent future deterministic, save/reward, touch and browser tests | BF-02 QA plan / PM integration after task contracts confirmed |

Registry proposal: one stable ID (working name `broforce-coop`), `engine:'broforce'`, `family:'broforce'`, `category:'coop'`, `source:'Broforce'` (a media reference), `randomEligible:false` until the owner approves normal board distribution, and an arcade/practice entry if the game catalog shows it. Do **not** assume setting `randomEligible:false` prevents an explicit `requestGame({id,...})` from launching it: authorization/reward eligibility must be checked in the launcher. A lazy wrapper like existing `warpPack.js` avoids `gameRegistry → packs → engines` circular import. Do not place a direct eager engine require in the pack.

## 3. Frozen cross-module invariants (all implementations/adapters must honor)

These are the safe interoperation invariants; **no unverified function/export signatures are imposed on BF-12/13/17/24/25/26**.

1. **Coordinate system:** world distances, positions, velocities/acceleration are in **world pixels**; tiles are exactly **16 world pixels** wide/high; gravity/velocity are converted consistently to pixels per second (not pixels per frame). Rendering may scale/rotate but cannot alter simulation units. Tile coordinates are integer column/row; world Y increases downward.
2. **Terrain:** immutable semantic tile IDs **0..5** (six total), encoded as unsigned integers; **the meanings of all six IDs are reserved for the BF-12 terrain contract**, not guessed by BF-00. Future adapters map another worker's shapes into this agreed ID/unit vocabulary. Never recycle a terrain number for animation, props or entities.
3. **Time:** simulation state advances in seconds, preferably a deterministic fixed **1/60 s** tick with accumulated `dt`, maximum steps per render and a clamp/drop policy for long frames; visual interpolation is read-only. Clocks and revive/boarding timers count *active simulation seconds*, not paused wall time.
4. **World ownership:** exactly **one** stage, terrain mutation layer, destructible state, enemy/projectile set, recruit opportunity set and extraction helicopter exist per active co-op attempt. Players have separate avatar/input/lives/loadout/hero pointers but reference the same world. Never clone or reroll the stage for P2.
5. **RNG:** all gameplay-affecting randomness flows from persisted `stageSeed` via named deterministic streams for terrain, encounter/spawns, recruit identity and loot. Use `seededRandom`/project RNG conventions, stable ordered draws and explicit stream names; never let particles, sound, layout or timing consume gameplay draws. Avoid nondeterministic `Math.random` shuffles/sort comparators for stage/recruits. Cosmetic RNG is isolated. Seed/counters and all stage-critical event IDs must be reproducible.
6. **Events:** one authoritative gameplay event queue per tick, with monotonic tick/sequence, stable tie-breaking and no direct profile writes. Spawn, shoot, hit, break, free-prisoner, swap, select-devil, activate-helicopter, board and finish are simulation events. An entity can be destroyed/freed/boarded only once by ID; simultaneous P1/P2 events deduplicate before side effects.
7. **Presentation and authority:** canvas/HUD/dialogs merely display world snapshots and send owner-tagged intentions. Only the adapter's simulation applies hits, swaps, board-state changes and end conditions. All listeners/timers/resources are owned by the session and removed by `s.on`/`s.cleanup`.

**Dependency direction:** registry/launcher → session → Broforce adapter → simulation subsystems → pure stage data/visual descriptions. Visuals/audio consume snapshots/events but cannot mutate RNG, hit state, spawn state, saves or rewards. Profile and run persistence are launcher-level services only, never imported into the simulation core.

## 4. Update/draw and input/event order

At mount, initialize one persistent attempt identity and seed, construct the stage once, allocate entity pools, then register input and frame callbacks. Per **active** fixed tick, apply this ordering:

1. Capture owner-tagged inputs for P1/P2 from the most recent events; ignore stale/aborted pointers and clear held controls on pause, blur, rotation and death.
2. Advance the single stage/mission clock; run deterministic enemy/director spawn decisions; process queued player intents and explicit hero/devil swaps (subject to cooldown/capacity and liveness).
3. Integrate both players, enemies and projectiles in a consistent stable-ID order; resolve terrain/world collisions, then damage/destruction, then prisoner rescue/recruit events. 1-hit damage cannot be applied twice during one collision event.
4. Resolve co-op revival/continues, helicopter spawn/boarding triggers and terminal conditions **after** collisions and rescues, in a documented deterministic priority: cancellation > failed/team wipe or timeout > successful *confirmed* extraction. A timeout cannot become success because a delayed frame boards afterward.
5. Commit idempotent in-memory event effects, update camera/HUD counters, and enqueue audiovisual events. No profile mutation from this step.
6. Draw background/parallax, visible terrain/destruction, props, enemies/projectiles, heroes/head portraits, helicopter/extraction, effects and finally readable HUD/controls. Draw performs no random gameplay mutations and no gameplay advancement.

The adapter uses `s.frame` only while `s.alive && !s.paused`; fixed-step accumulator is cleared or capped after resume/rotation to prevent a catch-up burst. A phase guard prevents update/draw/input from accessing disposed or terminal state and prevents calling `s.finish` twice. Resize transforms recompute each frame using `s.W/s.H`; world state is not rebuilt.

## 5. Full mission/session state machine

`SELECTED → INTRO → READY/COUNTDOWN → PLAYING → EXTRACTION → RESOLVING → RESULT → EXITED`, with side transitions `PLAYING/EXTRACTION ↔ PAUSED`, `PLAYING/EXTRACTION → FAILED`, `PLAYING/EXTRACTION → TIMED_OUT`, and any nonterminal state → `CANCELLED`.

- **Before launch:** `requestGame` saves `run.pending` for a board-origin game. For Broforce, store an immutable attempt ID (derived from a persisted run-local monotonic sequence), stage ID, seed, origin and return-to-roll intent **before any engine side effect**. On a resumed launch, reuse these fields. Existing `requestGame` recreates `run.pending` even for `resume:true`: PM integration must preserve the BF fields rather than replacing them. The existing `GameSession.seed` includes `profile.played.length` and is not a stable recovery seed; never use it as the sole persistent stage seed.
- **Intro/ready:** optional shared-screen splash; both players confirm readiness (no pass-the-phone P1/P2 worlds), then a countdown. During menus/paused states world clocks do not advance. `s.shared=true`, `s.cooperative=true`; override the generic scorebar label with a co-op label.
- **Playing:** two simultaneous humans share one camera and terrain. Default spawn pair near each other, camera follows both with bounded dynamic zoom/tether; no split world or independent scrolling timelines.
- **1-hit rule / revive:** a direct unprotected enemy/projectile hazard downs a living hero in one hit (no imported Horde-style HP bar). Proposal for owner approval: a living partner may hold within a safe rescue radius for a short timed revive; each player gets one in-stage revive/continue credit, then later lethal damage leaves them down until extraction/failure; a team wipe is a failure. Temporary spawn/revive invulnerability prevents collision-loop deaths. Death drops active control and does not transfer pointer ownership. **Pending decision:** exact grace time/radius and credits (BF-13/BF-17 contracts may already specify them); use an adapter configuration, not duplicate implementations.
- **Continue policy:** no silent checkpoint reload or free retry within the same award-bearing attempt after team wipe; a new explicit retry is a new attempt ID, and an interrupted browser session restarts the *same seeded stage from its entry*, not an inexact frame snapshot. The in-stage revive above is the proposed continue mechanism. A conventional checkpoint continue is **not authorized** until PM settles its eligibility/difficulty tradeoff.
- **Roster/hero swap:** each player has a stable `owner`, display `name`, selected run character and *current in-mission hero* independently. Rescuing a prisoner registers exactly one stage rescue event with a deterministic recruit ID; an allowed swap replaces only the appropriate player's active hero/loadout (unless a future shared-swap mechanic explicitly specifies otherwise). Rescued identities remain mission-local until an eligible extraction is validated; never mutate `run.players[i].character`, profile rosters or the chosen board avatar mid-engine. Deduplicate hero identities by the project's `characterIdentity` policy when granting.
- **Devil selection:** treat devil/branch choice as a deterministic stage-controlled modal choice, tagged by selecting player and stable event ID. Pause simulation while the choice is open; reject duplicate taps and selections by the other owner. The devil's actual art/abilities/selection rules belong to its implementation worker; the adapter must only pass its stable selected ID and resume when valid.
- **Helicopter:** extraction is a terminal objective inside the **single shared** stage. Trigger once when the stage's objective conditions are satisfied; freeze or resolve world hazards according to a documented extraction phase. Each **living** player must enter the helicopter's boarding trigger, with a visible per-player boarding indicator; one player boarding must not end the game. A downed teammate must be revived before boarding or the team fails when the extraction timer expires (unless owner approves a carry/solo exception). While boarded, that player's attacks/movement stop. Only after both valid boarding receipts are latched **before timeout**, emit one success terminal event.
- **Failure/timeout/cancel:** no award, no generic score/XP/wins or recruitment, no progression; cancellation through `exitGame` disposes without `s.finish`, clears inputs and restores the appropriate board/arcade destination. Dismissed intro dialogs/roulettes must also clean up BF pending attempt state; existing null-choice path currently returns without resolving the board pending game. A failure/timeout can still show a zero-reward result if truly finished; a cancellation does not fabricate a win/result.
- **Background, resize and rotation:** `GameSession.mount` already pauses on visibility hide and `manualPause` uses `s.pass`; when paused, clear held movement/fire and all touch captures. Rotate/reflow without resetting the world or seed. A browser reload reconstructs deterministic entry state from pending metadata. If `run.phase==='result'`, only re-present persisted result, never run the engine or re-grant an award.

## 6. Result metadata: engine → session → launcher → saved result

Do not change existing two-argument `s.finish(scores,label)` or introduce a generic new result kind that other games could accidentally consume. Broforce alone sets `s.teamResult` before finish with `kind:'broforce'`, `won:true/false`, `tied:false`, `humanTotal`, `cpuTotal:0`, `cpuScores:[0,0]`, `duration` (seconds), and a **JSON-only** nested `bf` payload. Proposed envelope fields:

| Field | Meaning |
| --- | --- |
| `schema:1`, `attemptId`, `stageId`, `stageSeed` | Stable exact attempt and deterministic replay identity |
| `outcome:'extracted'/'failed'/'timeout'` | Authoritative terminal reason; cancellation bypasses settle |
| `boarded:[boolean,boolean]`, `rescuedEventIds:string[]` | Proof of two-person extraction and deduplicated mission rescues |
| `reward:{characterId,owner}` or `null` | **Exact** intended character and canonical `Sean`/`Amber` owner (or `null` for shared), never a display name |
| `elapsedSeconds`, `score:[number,number]` | Deterministic telemetry/display only, no implicit host award |

The precise reward candidate source/eligibility is unverified pending actor/recruit worker contracts. All metadata must be finite, bounded, plain JSON; never persist functions, canvases, entities, typed arrays or live input objects. Validate `won===true` iff `outcome==='extracted'`, both boarding receipts are true, origin is authorized `board`, game ID matches, and award identity belongs to this attempt's deterministic rescue table. The engine never directly calls `recruitReward`, `recordGame`, `saveProfile` or `updateProgression`.

The existing launcher closure passes `session.teamResult` into `settleGame(game,scores,label,origin,players,coop,returnToRoll)`; integrate an **early, explicit** `coop?.kind==='broforce'` branch before generic `recordGame`, board point mapping, `winner` bonus, `gameRecruitPool`, survival/boss reward branches, pair/character-win/South Park hooks, dry-streak changes and `updateProgression`. For Broforce, *all* of those ordinary benefits are suppressed across board, arcade and dev. Board success grants only the policy-approved exact recruitment; board failure/timeout, arcade and dev grant **nothing** (including profile XP/played credit if it has an XP side effect). Scores remain display-only. Preserve every other game's current settle path without changed semantics.

Persist Broforce result metadata in the established `run.phase='result'`, `run.pending.kind='result'` record alongside required `gameId`, `scores`, `rewards:[0,0]`, `label`, `origin` and existing return-to-roll fields; add narrow `bf` and claim receipt fields only for this game. `presentResult` and `continueRun` must display the BF-specific outcome/actual grant, rather than treating any `coop.won` as a generic survival/mutation or a two-team score. Old saves without BF fields and other `coop.kind` values still follow their existing paths. Extend `validRun` defensively for present optional BF fields without bumping save version 20 unless PM explicitly approves a migration.

## 7. Exact, idempotent recruitment transaction

**Policy proposal (requires PM signoff):** one **exact** rescued character awarded **at most once per successful, board-origin mission attempt**; never reroll, substitute an existing identity or grant a random thematic replacement. Default award target is a canonical owner key supplied by the authorized reward event, not a player name; a shared (`owner:null`) grant is permitted only if the final gameplay spec explicitly chooses team-shared ownership. The number of recruit opportunities, unlock eligibility, and whether the rescued hero itself is the claim candidate must be reconciled against BF-24/25/26 specs before code.

1. **Prepare, do not commit in simulation.** A successful extraction emits immutable `attemptId`, `stageId`, exact `characterId`, owner key, source rescue event ID and both boarding receipts. Verify membership of that character in the deterministic rescued set, a valid catalog ID and reason eligibility; never trust an arbitrary engine string as an award authorization.
2. **Stage recovery intent.** Save the full `run.pending` result and exact grant intent first (with a stable claim key incorporating attempt and stage), before showing reward animations. If the browser closes here, recovery still knows the intended exact award.
3. **One profile-object transaction.** A PM-owned `grantBroforceExactOnce` helper reads a **persisted** profile receipt map (new optional `broforceClaims` field retained by `loadProfile` and `saveProfile`); if claim key already exists, return its recorded identical receipt. Otherwise apply the canonical `canRecruit` check with a specific Broforce unlock reason (new gated `unlockBy` only for approved Broforce characters), update exactly one destination roster/shared list and `earnedUnlocks`, and add the claim receipt in the **same serialized profile write**. If the identity is already owned/denied, record a stable no-op receipt: **do not** pick a substitute. Never call current `recruitReward`, whose auto-save and movie-Bond reroll make this non-atomic.
4. **Failure handling.** `writeJSON` can return false when storage is unavailable and currently holds an in-memory fallback; distinguish a durable receipt from a volatile one. Do not claim “saved” or advance the durable reward receipt on write failure. Keep recoverable intent, show a storage warning/export guidance, and safely retry on next available save. Because run/profile are separate localStorage keys, cross-key writes are **not** transactional: replay the staged intent idempotently on recovery; the profile's single-key roster+claim commit is the idempotency authority.
5. **Acknowledge.** Only after confirming the recorded profile claim, mark pending result `claimStatus:'applied'|'no-op'`, persist it and display the exact actual award once. Reopening result screens cannot append a second character, add XP or replay a fanfare as a new unlock. Claimed reward is never revoked by a later UI cancellation. A mission retry gets a fresh attempt ID, but any per-stage/per-character once-only progression cap is an additional owner policy gate, not silently assumed.

Tests must inject process interruption after intent persistence, immediately before/after profile save, after result persistence, before dialog, during repeated `s.finish`, and on imported old saves. Also test same event ID delivered twice by P1/P2. **Important limitation:** ordinary localStorage cannot make the run and profile writes jointly atomic; the durable single-profile claim + replayable intent is the specified recovery protocol.

## 8. Mobile control, rendering, sound and asset requirements

- Two simultaneous players on one phone, with consistent P1 left / P2 right *physical touch ownership* at pointer-down even when fingers cross the center. Provide movement, jump, shoot and optional special through direct virtual-stick/gesture regions; an owner-specific button must not trigger the other's hero. Desktop fallback: P1 WASD/Space plus mapped action key, P2 arrows/Enter plus mapped action key. Accessibility labels use `players[i].name`, not `owner` keys.
- Treat portrait orientation by mapping screen coordinates through one reversible camera/rotation transform (`worldView` precedent). Keep HUD/controls, names, two life/continue states, rescue counter and helicopter boarding legible in folded/unfolded phone portrait and landscape. World remains shared and stays alive through rotation. Provide large enough targets, safe-area padding, no clipped controls, clear countdown and explicit pause/exit.
- Render original authored pixel-art-inspired environments, explosions, helicopter, devil and heroes; user-supplied portrait heads via `s.sprite`/approved assets can represent roster identity. **No ripped Broforce sprites/maps/music**, no stock-looking placeholders, no runtime image/network dependencies. New art must follow project asset optimization and licensing/credit practices; never alter unrelated portrait optimization.
- Budget for midrange mobile: viewport culling, cached tile/background layers, pooled particles/projectiles, bounded particle count/enemy count, fixed-step cap, offscreen draw skipping and low-cost synthesized original sounds (respect settings/reduced motion). Targets such as stable 60 fps and safe memory are **acceptance goals, not measured results**. Sim correctness must not depend on frame rate.
- Never mutate module globals that survive across separate minigame sessions, and release RAF, sounds, intervals, captures and listeners on `dispose()`. `s.debug` may expose deterministic test helpers but must not appear in the arcade UI; privileged debug transitions must never write rewards.

## 9. Dependency graph and future ownership gates

```text
BF-00 documented contract (this branch; docs ONLY)
             |
             v
BF-12 terrain contract ----+
BF-13 implementation ------+---> PM-owned Broforce adapter & launch pack
BF-17 implementation ------+       |            |
BF-24 implementation ------+       v            v
BF-25 actor-art contract --+   module/pack   launcher result gate
BF-26 implementation ------+    registration       |
             |                  |            profile claim + save recovery
             +------ BF-01 art direction ------+
                             |
                             v
                      BF-02 QA contract
                             |
                             v
                     isolated integration candidate
                     (PM review, CI, then TESTver only by PM)
```

**Verified branch names at inspection, not verified interfaces:** `feature/broforce-bf12-terrain` and `feature/broforce-bf25-actor-art` exist at the pinned base, alongside BF-01/BF-02. The complete BF-12/13/17/24/25/26 prompts were **not supplied to BF-00**, so their exclusive file lists and function signatures are UNKNOWN; the diagram labels **responsibility/dependency**, not permission to edit each other's files. No implementation worker may edit another worker's owned path. **Exact ownership gate:** BF-00 alone may write `docs/broforce/ARCHITECTURE.md` and `docs/broforce/task-logs/BF-00.md`; PM/integrator alone may write the explicitly enumerated shared host paths in §2; the six implementation workers alone may write the *exact* source/assets/tests paths listed in their own verified prompts, to be filled into a PM-maintained ownership map **before their merges**. This document intentionally makes no fabricated assignment of unseen exact paths.

Integration is **not** authorized by finishing this document. PM must first read every sibling prompt, resolve overlap at file/function boundaries and approve concrete adapters for 0..5 terrain semantics, stage/recruit and actor/devil APIs. Integrate simulation+art into a throwaway candidate from current `feature/broforce-mobile` with non-overlapping changes; run deterministic and save/reward tests, full `npm test`, build and phone/desktop screenshots. Advance the parent only through separately approved PM integration workflow. Never advance `TESTver` or `main` from this worker branch.

## 10. Required validation at implementation/integration time (not run in BF-00)

1. Unit: tile IDs exactly 0..5, tile size 16, seconds/world-pixel units, seeded bit-for-bit replay, separate cosmetic stream, stable collision/event ordering, shared tile changes visible to both, spawn and rescue deduplication.
2. Mechanics: two humans moving/shooting simultaneously, no player-control bleed, 1-hit death/revive/continue caps, team wipe/timeout priority, devil-owner selection, roster swaps don't alter saved board characters, prisoner IDs unique, both helicopter receipts mandatory and no post-timeout success.
3. Session: pause/resume/visibility/blur/rotation/controller release, early quit and modal cancel, build once per attempt, replay seeded entry on reload, finish once, errors don't leave `store.busy` or stale pending state, result recovery doesn't relaunch.
4. Rewards: exactly one authorized exact grant on extracted board attempt, duplicate event/finish/reload safe; none for arcade/dev/failure/timeout/cancel; neither generic recruit nor XP/win/board-points/dry streak; stable owner key when custom display names are used; pre-owned character produces deterministic no-op; storage-failure/retry and old-save compatibility.
5. Integration: `node tools/check-modules.mjs`, dedicated Broforce tests, `npm run build`, `npm test`, minigame fuzz through `tests/games.mjs`, Playwright screenshots at **390×780**, **780×390**, **1100×700** and real Samsung foldable testing. Record exact commit hashes, results and unavailable checks; passing old CI at the pinned base is not proof of Broforce validation.

## 11. PM review decisions and explicit unknowns

- **BLOCKING:** reconcile the six implementation task prompts' exact file ownership, initial exports, terrain-ID meanings, stage data, hero/recruit/devil selection and art interfaces. Introduce conversion adapters at the PM-owned boundary instead of changing worker-owned public shapes.
- **BLOCKING:** settle Broforce reward ID source, catalog entry/unlock policy, single-owner vs shared grant, whether the reward is granted once per successful attempt or once per unique rescued identity/stage across attempts, and how old saves and generic progression should count Broforce completions. This draft defaults to **no generic rewards**, **one exact grant at most per successful board attempt**.
- **DESIGN:** confirm allowed revive credits/window, whether a checkpoint continue is desired, helicopter eligibility of a downed/boarded teammate, mission duration/timeouts, and whether the game enters the random board pool. The proposed conservative default requires both living players to board and treats team wipe/timeout as a no-reward failure.
- **TEST/PERFORMANCE:** no browser build, visual screenshot, phone profile, gameplay or CI run was performed for BF-00; it is documentation only.

**Review action:** PM reconciles BF-00 with BF-01, BF-02 and the six implementation briefs, signs off unresolved policies, then produces a separate integration assignment. No existing source file was modified by BF-00.
