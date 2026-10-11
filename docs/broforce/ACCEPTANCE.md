# Broforce Mobile — Acceptance and QA Contract (BF-02)

**Status:** BF-03 contract corrected to the **owner-approved** exact-devil / individual-live-boarding rule. This is not evidence of executed end-to-end acceptance or an integrated game.
**Base:** 16770ee301e5a94bda02e375cf0341177b481e3a on feature/broforce-mobile (matched parent HEAD when BF-02 began).
**Applies to:** the planned original, offline Broforce-inspired minigame, its integration with ShambConkins, and Android Fold play.
**Owners:** BF implementation/integration workers implement the contract; PM accepts actual results. BF-02 owns only this spec and docs/broforce/task-logs/BF-02.md.

## Source-grounded interfaces and constraints

- GameSession (src/engines/session.js) exposes seeded `s.random()`, pause-aware `s.frame`/`s.timer`/`s.wait`, `s.pass`, `s.resetOnPause`, `s.finish`, `s.players[i]`, `s.sprite` and an abortable input/cleanup lifecycle. `s.finish` rejects a second call once finished; downstream reward handling must also be idempotent.
- The selected board-game character is `run.players[i].character`, keyed by the permanent player `owner` (Sean for P1, Amber for P2). A *temporary Broforce fighter* is a separate within-stage state; do not overwrite the selected character, its owner, or saved roster.
- `availableCharacters(profile, owner)` (src/profile.js) includes shared plus that owner's roster, canonicalized via `characterIdentity(id)` (src/characters.js). Ownership and identity must both be checked, not just a matching display name or array membership.
- Existing `gameRecruitPool` (src/rewards.js) excludes `SPECIAL_UNLOCKS` from ordinary random recruits, while `settleGame` (src/gameLauncher.js) can separately award a winner a random recruit and can award shared co-op survival recruits. Broforce-specific devil results MUST NOT pass through these generic random-recruit paths.
- `recruitReward(profile,id,owner,reason)` saves immediately and may reroll special Bond recruits; it is **not** the exact-grant API. `canRecruit` must recognize a narrow approved Broforce reward reason. The **exact devil boss** is the character currently eligible and locked as selected by BF-17 `chooseDevil`; **not necessarily** existing catalog `satan` (Horror-only, excluded by BF-17 special-lock policy). Never bypass eligibility, substitute an unrelated recruit, or give a generic minigame unlock.
- `validRun` (src/persistence.js) checks phases and pending kinds, including allowed event kinds and result payloads. Any new persisted pending state must remain valid or be added by its owning integration worker; BF-02 is not authorized to change saves.
- `tests/games.mjs` starts registered games in **arcade** origin, fuzzes input, and checks runtime errors; it does not assert board-only rewards, survival ownership, terrain determinism, or visual fidelity. `tests/unlocks.mjs` audits character reachability but not Broforce-specific award gates. `tests/lib.mjs` provides headless Chromium + browser console/page-error capture.
- Development validation (`.github/workflows/development-validation.yml`) runs core and game fuzz, but does **not** automatically execute new Broforce component suites. The BF-03 `broforce-foundation-validation.yml` independently runs all six dedicated Node tests, module check, build and npm test on Broforce feature pushes and PRs to `feature/broforce-mobile` (while source modules are unregistered, module check is expected to fail).
- These are proposed acceptance requirements, not claims that the currently pinned baseline contains a Broforce implementation.

## Global verdict rule and fixtures

**A test passes only when its observable assertions pass; a clean process exit, a screenshot existing, or an N/N fuzz line alone is insufficient.** Automated assertions must capture page errors, console errors (with documented known legacy exceptions only), unhandled promise rejections, state snapshots and the exact player-owner/profile delta. Any missing test, device check or CI evidence is **NOT RUN**, not PASS.

**one** selected devil character initially locked and eligible for **both** owners (BF-17 requires `canRecruit` for all owners at selection), ownership/eligibility changing for one owner before settlement, already-owned/shared identity, actual P1-only/P2-only/both/zero boarding, living-but-unboarded P1/P2, and boss-defeated/no-boarding cases. Confirm main-game selected characters remain unchanged before and after in-mission swaps.

**Reward predicate (owner-approved):** the actual eligible currently locked devil boss must be defeated **before the helicopter arrives**. For each canonical owner independently, grant **only** the exact defeated devil ID, at most once per attempt, iff origin is normal `board` (not arcade/dev), the player **physically boarded/extracted alive before departure**, the character is still award-eligible/locked for that owner, and settlement was not canceled or already applied. **P1 only, P2 only, or both boarders** are valid successful outcomes; a dead, unboarded or late-boarded player earns nothing; **neither boards** means no extraction and no award. Boss defeat or a score win alone is insufficient. The other owner's boarding is not required. No generic random recruit, no unrelated minigame unlock, and temporary fighter swaps must never change the main-game selected player character.

**Mutation boundary:** Broforce-specific permanent changes are limited to per-owner exact-devil recruitment plus durable idempotency receipts for each eligible actual boarder; never a shared or counterpart roster substitute. Preserve normal board turn/result closure, but bypass generic XP/points/wins/progression and all random recruiting for Broforce as specified by BF-00 architecture. Arcade/dev/cancel/failure or zero boarders cannot grant the devil. Do not replace/rename `run.players[i].character`, mutate a main-game selection during physical fighter swaps, duplicate grants or alter unrelated saves.

## Acceptance matrix

Columns: **ID | Preconditions | Action | Expected observable result | Proposed check**. A = proposed automated test, M = manual visual/audio/device check. Names after A describe a test to create later, NOT an existing executed test.

### Deterministic generation, terrain and physics

| ID | Preconditions | Action | Expected observable result | Test |
|---|---|---|---|---|
| BF-G01 | Fixed seed, same game/player setup and initial profile state | Generate and play twice with scripted inputs | Identical stage layout, terrain, enemy waves and authoritative outcome snapshots; no frame-rate-driven gameplay randomness | A: seeded-stage replay + hash |
| BF-G02 | Same seed; changed seed | Generate many stages | Same seed reproduces; changed seeds yield legitimate variations with valid spawn/extraction reachability | A: seed matrix, route/reachability |
| BF-G03 | Fixed seed, different frame rates/pauses | Run equivalent simulation and inputs | No divergent terrain/spawn rules from visual RNG, blur/pause or device speed | A: fixed-step/delta replay |
| BF-G04 | Undamaged breakable cover | Hit once with correct damage type | Health changes once, damage feedback visible and collision state consistent | A: terrain hit assertions; M: effects |
| BF-G05 | Adjacent chain-reactive terrain near ordinary cover | Trigger chain damage | Deterministic bounded propagation to eligible neighbors only, once per event; no infinite loop or unintended distant damage | A: chain/cycle fixture |
| BF-G06 | Two explosions overlap and player/enemy near edge | Trigger same-frame impact | Each damage target obeys defined hit/debounce rule; no double-kill, collision tunneling or invalid indices | A: overlap/edge fixture |
| BF-G07 | Unbreakable and protected stage bounds | Shoot/explode at bounds | Bounds and extraction route remain valid; no softlock from destructible terrain | A: boundary/reachability |
| BF-G08 | Ground, moving/jumping fighter, ramps/ledges | Move, jump, land and reverse | Stable gravity/collision, no wall phasing, hover or floor fall-through; input feels controllable | A: physics traces; M: play |
| BF-G09 | Projectile and enemy at hitbox edges | Fire, collide, dodge | Predictable hit registration/occlusion, projectile lifetime and object cleanup | A: collision fixture |
| BF-G10 | Controlled fighter takes hits | Receive damage, defeat, revive/respawn as designed | Health/lives/iframes and HUD agree; damage not repeated each frame; dead fighter cannot attack/earn survival | A: health lifecycle; M: feedback |
| BF-G11 | Enemy spawn, AI update, lethal hit | Run scripted encounter | Enemy targets appropriate players, damages once per valid hit, dies once, cannot fire postmortem; count/score reconcile | A: enemy-state fixture |
| BF-G12 | Last enemy, boss and extraction unlocked sequentially | Complete objectives out of order then correctly | No premature boss defeat or extraction; objective indicator and transition conditions explicit | A: progression gates; M: play |
| BF-G13 | Two active human participants | Concurrent multi-touch, simultaneous movement/fire | Touch IDs remain bound to correct fighter; no controls crossing sides, stuck fire, or unintended player swap | A: multi-pointer; M: two-human |

### Fighter ownership and temporary swapping

| ID | Preconditions | Action | Expected observable result | Test |
|---|---|---|---|---|
| BF-F01 | Sean-only and Amber-only unlocked fighters, no shared extra | Build P1/P2 pools | Each pool contains only shared plus its owner's unlocked canonical identities; never borrowed from other roster | A: roster isolation |
| BF-F02 | Same identity under two IDs/aliases | Generate pools and roll repeated swaps | One fighter per `characterIdentity`, not double-weighted or unlockable twice | A: alias dedupe |
| BF-F03 | One available candidate for owner | Trigger swaps repeatedly | Same legal fighter is used safely, with readable feedback; no infinite reroll/undefined fighter | A: singleton |
| BF-F04 | Zero extras beyond selected/starting identity | Trigger swap/pickup | Safe fallback to current legal fighter, no newly invented/default locked fighter, no hang | A: zero-extra |
| BF-F05 | All candidates locked for a given owner | Request random fighter | No illegal character appears; clear no-eligible fallback state | A: empty eligible set |
| BF-F06 | P1 and P2 selected different board characters | Swap temporary fighters and finish/exit/resume | Fighter identity may change in-stage but selected `run.players[i].character`, player names and owners never change or persist from fighter choice | A: deep snapshot; M: board HUD |
| BF-F07 | Two owners with asymmetric rosters | Swap both simultaneously/alternately | P1 uses Sean entitlement; P2 uses Amber entitlement across all swaps | A: owner-specific replay |
| BF-F08 | Save/load fresh profile with roster aliases | Begin another match | Pools rederive from persisted eligible identities; no swap-specific roster write, duplicate or leak | A: reload pool |

### Boss, extraction, reward and save safety

| ID | Preconditions | Action | Expected observable result | Test |
|---|---|---|---|---|
| BF-R01 | Candidate devil locked and eligible for both owners | Defeat exact devil; helicopter arrives; **both board alive** before departure | Both owners earn the **same exact defeated devil character ID** in their own rosters, once each; no shared or unrelated grant | A: success-both-boarded fixture |
| BF-R02 | Both eligible at selection; only Sean still eligible at settlement | Defeat exact boss; both board alive | Sean earns exact devil; Amber is a no-op without substitute | A: owner-eligibility-after-selection |
| BF-R03 | Both eligible at selection; only Amber still eligible at settlement | Defeat exact boss; both board alive | Amber earns exact devil; Sean is a no-op without substitute | A: reverse-eligibility-after-selection |
| BF-R04 | Board mode, eligible devil defeated | **P1 boards alive**, P2 is dead **or alive but unboarded** when helicopter departs | Valid P1-only extraction; only eligible P1 earns exact devil; P2 gets nothing | A: P1-only-boarded |
| BF-R05 | Board mode, eligible devil defeated | **P2 boards alive**, P1 is dead **or alive but unboarded** when helicopter departs | Valid P2-only extraction; only eligible P2 earns exact devil; P1 gets nothing | A: P2-only-boarded |
| BF-R06 | Eligible boss defeated, helicopter arrives | **Neither player physically boards** before departure, even if still alive | No successful extraction and no devil award for either owner | A: zero-boarders |
| BF-R07 | Devil boss not defeated | Try helicopter spawn/board or fake successful settle | No helicopter objective success or devil award without an actual boss-defeat event | A: boss-gate negative |
| BF-R08 | Eligible devil defeated, helicopter arrives | Cancel/finish before any boarding or fake a **post-departure** boarding | No devil unlock; boss defeat alone and late boarding never qualify | A: no-board-or-late |
| BF-R09 | Board match and eligible devil | Exit before/during boss, before extraction, or during handoff | No BF-specific unlock/award; no dangling session, pending reward or late callback | A: cancellation stages |
| BF-R10 | Same eligible game seeded in `dev` and `arcade` | Win boss and extract | No Broforce-specific devil or random recruit, roster/profile unlock or board-state write in either mode | A: origin restriction + profile diff |
| BF-R11 | Successful settlement already committed | Invoke `finish`/result callback again, resume same result, re-open/reload | No duplicate exact unlock, XP from the same BF reward, second toast or second transaction; existing result remains stable | A: double-finish/idempotency |
| BF-R12 | Selected devil identity becomes owned by one owner/shared/alias before settlement | Finish with valid live boarding | No duplicate identity for already-owning owner; still-eligible other actual boarder may earn it | A: owned/alias/shared-at-settlement |
| BF-R13 | No owner has an eligible locked devil | Determine devil encounter/candidate and then finish | Devil-only candidate not offered or silently substituted; no recruit or roster changes | A: no-candidate |
| BF-R14 | Eligible target ID is unavailable/mismatched, or unlock reason rejected | Attempt grant | Explicit no-award, no substitute/random character; log/trace explains rejected eligibility | A: canRecruit guard |
| BF-R15 | Broforce extraction has a generic random-recruit pool available | Settle P1 only, P2 only and both actual boarders | Exactly the intended devil claim(s) and **zero unrelated random recruits**, generic co-op survival recruits or mismatched owner awards | A: generic-recruit-spy |
| BF-R16 | Boss losses/non-BF game win | Settle via same launcher | No devil unlock; unrelated games retain their pre-existing reward behavior | A: cross-game regression |
| BF-R17 | Board pending phase: launch, pause, result, resume | Persist and reload at supported checkpoints | Existing save passes `validRun`; either safely reconstructs or safely rejects impossible partial state with no reward duplication | A: save serialization/reload |
| BF-R18 | P1/P2 have same display name but distinct owner keys | Settle one survivor | Award uses `owner`, not display name, active index, selected fighter or scoreboard winner | A: owner key fixture |
| BF-R19 | Award success followed by storage failure/retry | Inject write failure, reload/retry | No falsely reported permanent unlock; no double award after replay; safe documented recovery | A: storage fault injection |
| BF-R20 | Existing board points, turns, progress, selection and random streams | Play Broforce with and without eligibility; finish and return | Board turn/result closure is safe, but **no generic XP/points/wins/progression or random recruits**; no unwanted save, inventory, character-selection or seeded-RNG mutation | A: before/after invariants |
| BF-R21 | Co-op result includes stage survival flags but equal scores | Settle | Survival and extraction flags, not `winner` or score tie, decide eligible individual devil owners | A: coop/tie fixture |

### User experience, accessibility, offline and performance

| ID | Preconditions | Action | Expected observable result | Test |
|---|---|---|---|---|
| BF-U01 | Original sprites, tiles, effects and UI at 390×780 portrait | Enter, shoot, swap, fight, extract | Distinguishable players/enemies/projectiles, legible text and HP, visible boss/extraction; no clipped controls | A: screenshot/geometry; M: inspect |
| BF-U02 | 844×390 landscape | Repeat full flow | Gameplay fits width/height, two-player controls reachable, HUD and exit not hidden by browser UI | A + M |
| BF-U03 | 840×700 unfolded/flex view | Repeat full flow and live resize | Canvas and HUD reflow without stale pointer scaling, cutoffs or black gaps | A + M |
| BF-U04 | 1100×700 desktop | Mouse and P1 WASD/Space, P2 arrows/Enter | Correct mappings, fit and readable state; keyboard does not double-trigger on hold/repeat | A + M |
| BF-U05 | Portrait ↔ landscape while two fingers held | Rotate/resize/release and continue | Coordinate scaling recomputed, held controls cleared/rebound; no acceleration spike, input lock, lost player or duplicated settlement | A: viewport/resize; M: Fold |
| BF-U06 | Window blur, hidden tab, Android interruption | Blur/hide while holding fire/move, resume | Game safely pauses/resets held controls; timers/progress frozen during pause; on resume no latent pressed input | A: visibility/blur; M: Android |
| BF-U07 | Settings: sound off/music off/on | Shoot, explode, boss, extract, exit | Distinct, non-clipping feedback; mute respected; audio contexts/loops cleaned up on end/pause, no stolen focus | A: API spy; M: listen |
| BF-U08 | Settings: reduced motion enabled | Play effects-heavy scene | Screen shake/flashes/particle overload reduced without losing critical warnings or gameplay information | A: settings/frames; M |
| BF-U09 | No network, prebuilt `file://` HTML with requests blocked | Launch, complete stage with art/audio and reload | Stage fully playable offline; no mandatory BF fetch, CDN, audio stream or font; self-contained original assets only | A: offline browser request audit; M: airplane mode |
| BF-U10 | Simulated slow Android CPU with 2 players and dense combat | Run 60s stress + explosions; examine traces | Proposed review budget: ≥30 effective FPS at steady play, 95th frame ≤50ms, no >500ms game-thread stall or growing orphan timers; thresholds require PM/device confirmation | A: throttled trace + M |
| BF-U11 | Repeated start/cancel/restart, ten cycles | Monitor listeners, canvases, sprites, timers, memory | No unbounded memory growth or active callbacks from prior sessions; reliable return to board/arcade | A: resource lifecycle |
| BF-U12 | Real Samsung Fold device, folded/unfolded, touch and audio | Owner tests two-human play, rotation, background/foreground, heat | Comfortable controls and visible UI; issues recorded with OS/browser/model; **cannot claim real-device pass from desktop CI** | M: mandatory pre-release |
| BF-U13 | Content provenance review | Inspect all new BF visuals, music and references | Professional original art and original/licensed-safe sound; no borrowed Broforce sprites, maps, music, stock-looking placeholders or network dependency | M: asset/license audit |

## Proposed automation and exact commands

These commands identify the **actual six existing dedicated Node tests** at pinned Wave-1 commit `6c7361fc`; they exercise components, **not** the complete boss/boarding/save-game award contract. The broader `tests/broforce-acceptance.mjs` remains **proposed and absent**, and must not be claimed as a passing test. Only the PM integration worker can register six new modules in `src/modules.json` (all six currently absent) and add end-to-end integration tests. At this pinned commit `node tools/check-modules.mjs` fails on those six unregistered files; `npm test` cannot pass until this PM-owned registration is done.

From repository root, with Node and existing Playwright/browser fixture paths configured per `tests/lib.mjs`:

    node tests/broforce-terrain.mjs
    node tests/broforce-physics.mjs
    node tests/broforce-roster.mjs
    node tests/broforce-world-art.mjs
    node tests/broforce-actor-art.mjs
    node tests/broforce-audio.mjs
    node tools/check-modules.mjs
    npm run build
    npm run test:core
    npm test
    # Future driver only: node tests/broforce-acceptance.mjs (does not exist yet)

For targeted browser fuzz **only once a registered game ID contains "broforce"**, run:

    SHAMB_FILE=dist/ShambConkins.html node tests/games.mjs 6 3 'broforce'

Assert the filter selected ≥1 game; unsharded `tests/games.mjs` can otherwise print a misleading **0/0 games ran clean** without failing. The fuzz command is an engine-crash screen, NOT evidence that this acceptance matrix passed. If the finalized game ID does not contain "broforce", replace the filter with its exact escaped ID and document it.

For the implementation integration CI, exact current source workflow checks (workflow itself not modified by BF-02):

    npm run test:core
    node tests/games.mjs 3 6 '.*' 0 4
    node tests/games.mjs 3 6 '.*' 1 4
    node tests/games.mjs 3 6 '.*' 2 4
    node tests/games.mjs 3 6 '.*' 3 4

Inspect core log for exact smoke/route assertions `errors: []`, `errors []`, `fork reached: true` and `panel closed: true`, and all 4 shard logs for positive N/N completion with no FAIL. For visual evidence, use a `tests/lib.mjs`-based Playwright driver with four explicit viewport sizes: **390×780**, **844×390**, **840×700**, **1100×700**; save named screenshots for human inspection. Fuzz uses 900×700 only and does not substitute for those viewports.

**SHA verification:** record the new full pushed worker or integration SHA from GitHub; open the GitHub Actions **Development validation** run matching that **exact head SHA** and verify core-regressions plus all four game-fuzz-shards succeeded. Example with authenticated GitHub CLI (not assumed available in this chat):

    gh run list --repo seanpconners-source/ShambConkins --branch feature/broforce-bf02-qa-contract --workflow 'Development validation' --limit 10 --json databaseId,headSha,status,conclusion,url
    gh run view RUN_ID --repo seanpconners-source/ShambConkins --json headSha,status,conclusion,jobs,url

Replace branch with the actual implementation candidate under review; require `headSha == reviewed full SHA` and each job `conclusion == success`. A green moving-branch badge, status for an ancestor, canceled/pending run, or missing focused BF test is insufficient. If CI only runs baseline scripts, report **baseline CI passed; BF acceptance not exercised**.

## PM review gates and outstanding decisions

1. **Settled identity policy:** the final devil is the **eligible, locked catalog character actually selected and defeated**, not automatically `satan`. The current BF-17 pool excludes special unlocks and requires both owners encounter-eligible at selection; the integration owner must implement narrowly authorized reward-reason gating for that exact ID and each actual boarder's still-locked eligibility, without opening generic recruitment.
2. **Settled boarding policy:** defeating the devil summons the helicopter; each eligible **living physical boarder** receives the exact devil in their own roster. P1 alone, P2 alone and both are successes; no boarders earn nothing. R01–R08/R18/R21 must test boarding receipts, including an alive-but-unboarded negative case, and ensure temporary fighter swaps never modify selected main-game characters.
3. Confirm that arcade/dev must suppress **all** BF-specific reward and save writes while legacy general arcade progression remains an existing launcher behavior unless explicitly changed by an integration owner. Confirm device FPS budget and intended fighter respawn/extraction specifics once implementation rules are finalized.
4. Verify BF implementation actually exports enough stable stage events to assert seeds, boss flag, extraction, player survival, award deduplication and terminal lifecycle; no test may substitute arbitrary scores for those facts.
5. Require focused BF suite, registered core CI hook, screenshots and real folded/unfolded device review before promoting to TESTver or main. BF-02 has no merge authority.

**BF-02 evidence limit:** reviewed documentation and baseline source paths only. No Broforce code, stage art, runtime tests, screenshots, builds, Android device checks or CI results are created or asserted by this documentation assignment.
