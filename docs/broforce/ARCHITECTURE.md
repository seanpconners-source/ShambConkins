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
2. **Terrain:** semantic unsigned tile IDs from BF-12 are **EMPTY=0, SOIL=1, WOOD=2, STONE=3, STEEL=4, VOLATILE=5**, with row-major cells. Adapter uses exactly **16 world pixels** per tile; both terrain and physics helpers allow custom size for isolated testing, but the Broforce game stage must not. Out-of-bounds tile lookups are solid STEEL.
3. **Time:** the implemented BF-13 physics uses fixed **1/120-second** steps, carrying `_stepRemainder` and clamping input dt to 0.10 s by default. Rendering may be 60 fps, but the adapter must not double-integrate movement. Revive/boarding clocks count active simulation seconds, not paused wall time.
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
4. Resolve revival/continues, boss defeat and extraction after collisions. **Boss defeat triggers helicopter arrival.** Latch each pre-departure live boarding by owner; cancellation > confirmed valid extraction > failure if the craft leaves without any boarders. A valid P1-only or P2-only extraction is never invalidated by an unboarded teammate or a subsequent deadline; ignore late boarding.
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
- **Roster/hero swap:** P1 and P2 each have stable owner/name/selected-board-character and a separate temporary mission fighter. Only that player's fighter/loadout changes on a prisoner rescue; none of these swaps change `run.players[i].character`, main-game selected character, saved roster or persistent unlocks. Deduplicate rescue IDs and `characterIdentity`. Permanent awards are ONLY the exact defeated eligible locked devil, on individual confirmed extraction.
- **Devil identity:** `chooseDevil(profile,owners,random)` / `devilCandidatePool` select an actual eligible currently locked catalog character, excluding special unlocks/Loki and any identity already owned by either participant; candidates must pass `canRecruit(...,'encounter')` for **every** supplied owner. Do not hardcode `satan` (Horror-only catalog unlock). Latch the canonical chosen ID at encounter start; the defeated boss ID is the sole reward candidate, with no random substitute. Any owner-tagged in-stage selection UI must be deduplicated and pause-safe.
- **Helicopter (owner-approved):** **Defeating the locked eligible devil causes the helicopter to arrive** in the shared world. The craft allows each **living** player to physically board before departure, recording separate P1/P2 boarding event IDs and life-at-boarding. An unboarded survivor or dead teammate cannot earn the devil, and cannot cancel another player's valid boarding. Boarded heroes stop fighting/moving. Depart once the boarding window ends or all remaining living heroes have boarded. **P1 alone, P2 alone or both** valid living boarders are successes and each eligible boarder earns the **same exact devil** in their **own roster**; **neither boards → no extraction and no award**. Never require both and never treat boss defeat alone as an unlock.
- **Failure/timeout/cancel:** no award, no generic score/XP/wins or recruitment, no progression; cancellation through `exitGame` disposes without `s.finish`, clears inputs and restores the appropriate board/arcade destination. Dismissed intro dialogs/roulettes must also clean up BF pending attempt state; existing null-choice path currently returns without resolving the board pending game. A failure/timeout can still show a zero-reward result if truly finished; a cancellation does not fabricate a win/result.
- **Background, resize and rotation:** `GameSession.mount` already pauses on visibility hide and `manualPause` uses `s.pass`; when paused, clear held movement/fire and all touch captures. Rotate/reflow without resetting the world or seed. A browser reload reconstructs deterministic entry state from pending metadata. If `run.phase==='result'`, only re-present persisted result, never run the engine or re-grant an award.

## 6. Result metadata: engine → session → launcher → saved result

Do not change existing two-argument `s.finish(scores,label)` or introduce a generic new result kind that other games could accidentally consume. Broforce alone sets `s.teamResult` before finish with `kind:'broforce'`, `won:true/false`, `tied:false`, `humanTotal`, `cpuTotal:0`, `cpuScores:[0,0]`, `duration` (seconds), and a **JSON-only** nested `bf` payload. Proposed envelope fields:

| Field | Meaning |
| --- | --- |
| `schema:1`, `attemptId`, `stageId`, `stageSeed` | Stable exact attempt and deterministic replay identity |
| `outcome:'extracted'/'failed'/'timeout'` | Authoritative terminal reason; cancellation bypasses settle |
| `bossDefeated:boolean`, `devilCharacterId:string`, `boarded:[boolean,boolean]`, `aliveAtBoarding:[boolean,boolean]`, `boardingEventIds:string[]` | Boss defeat and exact identity plus per-player proof of timely live boarding; prisoner rescue IDs are not award proofs |
| `rewardClaims:[{characterId,owner,boardingEventId}]` | Zero/one/two separate eligible owner claims for the same defeated devil; never `owner:null`, display-name based, rescued generic, or random |
| `elapsedSeconds`, `score:[number,number]` | Deterministic telemetry/display only, no implicit host award |

The JSON result is a success (`won===true`, `outcome==='extracted'`) iff the eligible devil boss was defeated and **at least one** pre-departure boarding receipt came from a player alive at boarding. No receipt means failure, regardless of surviving non-boarders. Validate each owner claim separately, requiring normal `board` origin, correct game/attempt, still-eligible locked `devilCharacterId`, and proof of that recipient's valid boarding; a dead or unboarded player has no claim. The engine never directly calls `recruitReward`, `recordGame`, `saveProfile` or `updateProgression`.

The existing launcher closure passes `session.teamResult` into `settleGame(game,scores,label,origin,players,coop,returnToRoll)`; integrate an **early, explicit** `coop?.kind==='broforce'` branch before generic `recordGame`, board point mapping, `winner` bonus, `gameRecruitPool`, survival/boss reward branches, pair/character-win/South Park hooks, dry-streak changes and `updateProgression`. For Broforce, *all* of those ordinary benefits are suppressed across board, arcade and dev. Board success grants only the policy-approved exact recruitment; board failure/timeout, arcade and dev grant **nothing** (including profile XP/played credit if it has an XP side effect). Scores remain display-only. Preserve every other game's current settle path without changed semantics.

Persist Broforce result metadata in the established `run.phase='result'`, `run.pending.kind='result'` record alongside required `gameId`, `scores`, `rewards:[0,0]`, `label`, `origin` and existing return-to-roll fields; add narrow `bf` and claim receipt fields only for this game. `presentResult` and `continueRun` must display the BF-specific outcome/actual grant, rather than treating any `coop.won` as a generic survival/mutation or a two-team score. Old saves without BF fields and other `coop.kind` values still follow their existing paths. Extend `validRun` defensively for present optional BF fields without bumping save version 20 unless PM explicitly approves a migration.

## 7. Exact, idempotent recruitment transaction

**Owner-approved recruitment rule:** In an authorized board-origin encounter, defeat of an **eligible currently locked devil** summons the helicopter. Each eligible living player who **actually boards/extracts** earns exactly that defeated devil character in their **own** roster, at most once per owner per attempt. Thus P1 only, P2 only, or both may earn it; zero boarders earn nothing. No generic/random/substitute minigame recruits, no shared (`owner:null`) award, and no persistent award for ordinary rescued/temporarily swapped fighters. Narrow `canRecruit`/reason and crash-safe persistence implementation remains PM-owned.

1. **Prepare, do not commit in simulation.** Emit immutable `attemptId`, `stageId`, latched `devilCharacterId`, boss-defeat event ID and a separate confirmed boarding receipt per actual living player. Check owner key, life-at-boarding, departure cutoff and exact catalog ID; never trust client-visible score, selected fighter, display name, generic rescued ID or unboarded teammate as award authorization.
2. **Stage recovery intent.** Persist `run.pending` results plus **per-owner** exact intent and separate stable receipt keys (attempt + stage + defeated devil + owner) before reward animations; interruption must not lose or duplicate a qualifying player's intent.
3. **One profile-object transaction.** PM-owned `grantBroforceExactOnce` checks persistent optional `broforceClaims` receipts retained by profile load/save, canonical character identity and narrowly allowed `canRecruit` reason. Apply **only** each qualifying boarder's exact devil to their owner roster and `earnedUnlocks`, with that owner's receipt in the same serialized profile write; when both qualify, preserve separate receipts and recipient entitlements. An already-owned/denied target is a stable no-op; never reroll or call `recruitReward`'s generic Bond-replacement path.
4. **Failure handling.** `writeJSON` can return false when storage is unavailable and currently holds an in-memory fallback; distinguish a durable receipt from a volatile one. Do not claim “saved” or advance the durable reward receipt on write failure. Keep recoverable intent, show a storage warning/export guidance, and safely retry on next available save. Because run/profile are separate localStorage keys, cross-key writes are **not** transactional: replay the staged intent idempotently on recovery; the profile's single-key roster+claim commit is the idempotency authority.
5. **Acknowledge.** After confirmed durable receipt(s), mark each owner's pending grant `claimStatus:'applied'|'no-op'`, persist and show only the actual awards once. Reopened results/duplicate finish events cannot append new characters, award generic XP or rerun unlock fanfares. Retry creates a new attempt ID; cross-attempt uniqueness/eligibility still applies.

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
2. Mechanics: simultaneous touch/player control separation, damage/revive, boss defeat → helicopter, independent living P1/P2 boarding receipts, **one OR both board = valid extraction**, **zero board = no reward**, no late boarding, and temporary fighter swaps never change main-game selected characters.
3. Session: pause/resume/visibility/blur/rotation/controller release, early quit and modal cancel, build once per attempt, replay seeded entry on reload, finish once, errors don't leave `store.busy` or stale pending state, result recovery doesn't relaunch.
4. Rewards: zero/one/two independently authorized owner-specific claims for the same defeated eligible devil (at most one per owner on a successful board attempt); duplicate event/finish/reload safe; none for arcade/dev/failure/no boarding/cancel, nor generic XP/win/board-points/recruits; stable owner keys, existing-identity no-op and storage failure/retry.
5. Integration: `node tools/check-modules.mjs`, dedicated Broforce tests, `npm run build`, `npm test`, minigame fuzz through `tests/games.mjs`, Playwright screenshots at **390×780**, **780×390**, **1100×700** and real Samsung foldable testing. Record exact commit hashes, results and unavailable checks; passing old CI at the pinned base is not proof of Broforce validation.

## 11. PM review decisions and explicit unknowns

- **BLOCKING:** reconcile the six implementation task prompts' exact file ownership, initial exports, terrain-ID meanings, stage data, hero/recruit/devil selection and art interfaces. Introduce conversion adapters at the PM-owned boundary instead of changing worker-owned public shapes.
- **BLOCKING implementation:** owner policy is **settled**: the locked eligible defeated devil ID (not necessarily `satan`) is the only exact award, separately to every qualifying living actual boarder (P1/P2/both). PM must implement safe catalog/reason gating, per-owner receipt persistence and generic-progression exclusion; an unboarded/dead player receives none. Across-attempt repeat cap and save/recovery details require review.
- **DESIGN:** confirm revive credits/window, checkpoint-continue policy, extraction flight/boarding window length and game distribution. **Boarding is not in question:** P1, P2 or both can extract; zero boarders fail; a nonboarder cannot negate a valid boarder's success.
- **TEST/PERFORMANCE:** no browser build, visual screenshot, phone profile, gameplay or CI run was performed for BF-00; it is documentation only.

**Review action:** PM reconciles BF-00 with BF-01, BF-02 and the six implementation briefs, signs off unresolved policies, then produces a separate integration assignment. No existing source file was modified by BF-00.
