# Broforce Mobile — Acceptance and QA Contract (BF-02)

**Status:** DESIGN-ONLY proposed acceptance contract; not evidence of implemented behavior or passing tests.
**Base:** 16770ee301e5a94bda02e375cf0341177b481e3a on feature/broforce-mobile (matched parent HEAD when BF-02 began).
**Applies to:** the planned original, offline Broforce-inspired minigame, its integration with ShambConkins, and Android Fold play.
**Owners:** BF implementation/integration workers implement the contract; PM accepts actual results. BF-02 owns only this spec and docs/broforce/task-logs/BF-02.md.

## Source-grounded interfaces and constraints

- GameSession (src/engines/session.js) exposes seeded `s.random()`, pause-aware `s.frame`/`s.timer`/`s.wait`, `s.pass`, `s.resetOnPause`, `s.finish`, `s.players[i]`, `s.sprite` and an abortable input/cleanup lifecycle. `s.finish` rejects a second call once finished; downstream reward handling must also be idempotent.
- The selected board-game character is `run.players[i].character`, keyed by the permanent player `owner` (Sean for P1, Amber for P2). A *temporary Broforce fighter* is a separate within-stage state; do not overwrite the selected character, its owner, or saved roster.
- `availableCharacters(profile, owner)` (src/profile.js) includes shared plus that owner's roster, canonicalized via `characterIdentity(id)` (src/characters.js). Ownership and identity must both be checked, not just a matching display name or array membership.
- Existing `gameRecruitPool` (src/rewards.js) excludes `SPECIAL_UNLOCKS` from ordinary random recruits, while `settleGame` (src/gameLauncher.js) can separately award a winner a random recruit and can award shared co-op survival recruits. Broforce-specific devil results MUST NOT pass through these generic random-recruit paths.
- `recruitReward(profile,id,owner,reason)` returns the actual awarded ID or null and saves the profile when successful. It handles certain Bond identities specially; exact devil awards must not invoke a generic/replacement candidate. `canRecruit` requires an appropriate unlock reason. The existing catalog ID `satan` is marked `unlockBy: 'horror'` in src/contentPolicy.js; a Broforce devil award therefore needs an **explicitly approved** eligibility/reason mapping rather than pretending ordinary `reason: 'game'` is valid or bypassing the gate. The intended exact devil ID is assumed to be `satan` for this contract; if BF design names a different catalog ID, resolve with PM and update test fixtures before implementation.
- `validRun` (src/persistence.js) checks phases and pending kinds, including allowed event kinds and result payloads. Any new persisted pending state must remain valid or be added by its owning integration worker; BF-02 is not authorized to change saves.
- `tests/games.mjs` starts registered games in **arcade** origin, fuzzes input, and checks runtime errors; it does not assert board-only rewards, survival ownership, terrain determinism, or visual fidelity. `tests/unlocks.mjs` audits character reachability but not Broforce-specific award gates. `tests/lib.mjs` provides headless Chromium + browser console/page-error capture.
- Development validation (`.github/workflows/development-validation.yml`) runs on feature/** pushes. Core runs `npm run test:core`, checks smoke/route log assertions, and four deterministic game-fuzz shards. It does **not** automatically discover or run new standalone `tests/broforce-*.mjs` scripts.
- These are proposed acceptance requirements, not claims that the currently pinned baseline contains a Broforce implementation.

## Global verdict rule and fixtures

**A test passes only when its observable assertions pass; a clean process exit, a screenshot existing, or an N/N fuzz line alone is insufficient.** Automated assertions must capture page errors, console errors (with documented known legacy exceptions only), unhandled promise rejections, state snapshots and the exact player-owner/profile delta. Any missing test, device check or CI evidence is **NOT RUN**, not PASS.

**Deterministic fixtures:** fresh profile; seeded board run with two players and unchanged selected characters; P1-only and P2-only unlocked pools; identity-alias duplicates; exactly one eligible fighter; zero extra fighters beyond selected/starter; devil locked for both, locked for only P1, locked for only P2, and already owned/shared; explicit boss/extraction/survivor results. Compare deep-copied profile and board snapshots before/after, allowing only explicitly enumerated normal gameplay changes. Hold session/game ID, run seed, profile.played length and all setup inputs fixed when comparing procedural generation.

**Reward predicate (required):** for each owner individually, the exact devil award may be attempted **once at most** if and only if: origin is normal `board` (not arcade/dev); devil encounter was eligible for that owner and still locked at award time; the devil boss was actually defeated; extraction successfully completed; that owner's player survived extraction; session finished normally rather than canceled; and the same encounter/reward event has not already been settled. *Boss defeat without live extraction is NOT a win.* Neither the other owner's death/survival nor a selected main-game character can substitute for ownership. If both survive and both independently qualify, each may receive at most one correct owner-specific unlock; if only one qualifies, only that one may receive it. If neither qualifies, no devil award (and no devil-only eligible encounter/reward is to be offered). An owner with `satan` as a shared identity is already unlocked. This per-survivor interpretation is a **PM-review assumption**, not established existing behavior.

**Mutation boundary:** a successful Broforce-specific award changes only the qualifying owner's roster/earned-unlock record and existing recruitment bookkeeping required by the established API; it does not grant a random recruit or unlock a counterpart. Standard board points/turn/result bookkeeping may still occur through normal launcher logic. On arcade/dev/cancel/failed extraction, no **Broforce-specific** recruit, roster, devil-unlock, or game-save mutation may occur. Existing launcher behavior for general arcade stats/XP may need an explicitly scoped integration exception; do not silently promise that arcade never writes anything. Never replace/rename the player's selected board character, overwrite unrelated saves, duplicate an award, or mutate shared roster as a substitute for the correct owner.

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
| BF-R01 | Devil locked and eligible for both owners, board mode | Defeat devil boss; both survive extraction; settle | Award exact `satan` to each qualifying owner once, never shared as a shortcut; confirm two correct owner records | A: success-both fixture |
| BF-R02 | Devil eligible only for Sean, both survive | Defeat boss and extract | Sean only earns exact devil; Amber unchanged | A: one-owner-eligible |
| BF-R03 | Devil eligible only for Amber, both survive | Defeat boss and extract | Amber only earns exact devil; Sean unchanged | A: reverse-owner |
| BF-R04 | Eligible, board mode, boss defeated, **P1 only survives** | Extract | Only living eligible P1 gets devil; dead P2 never gets reward | A: P1 survivor |
| BF-R05 | Eligible, board mode, boss defeated, **P2 only survives** | Extract | Only living eligible P2 gets devil; dead P1 never gets reward | A: P2 survivor |
| BF-R06 | Eligible, board mode, boss defeated, **zero survivors** | Attempt extraction/finish | No award for either owner even if boss flag is true | A: wipe |
| BF-R07 | Eligible; boss never beaten | Reach extraction by skip/cheat or call settle | No devil reward; boss-defeated predicate required | A: boss-gate negative |
| BF-R08 | Eligible; boss beaten, extraction not completed or interrupted | End match | No devil reward; winning an earlier fight alone is insufficient | A: incomplete-extraction |
| BF-R09 | Board match and eligible devil | Exit before/during boss, before extraction, or during handoff | No BF-specific unlock/award; no dangling session, pending reward or late callback | A: cancellation stages |
| BF-R10 | Same eligible game seeded in `dev` and `arcade` | Win boss and extract | No Broforce-specific devil or random recruit, roster/profile unlock or board-state write in either mode | A: origin restriction + profile diff |
| BF-R11 | Successful settlement already committed | Invoke `finish`/result callback again, resume same result, re-open/reload | No duplicate exact unlock, XP from the same BF reward, second toast or second transaction; existing result remains stable | A: double-finish/idempotency |
| BF-R12 | Devil already in Sean/Amber/shared pool (incl. identity alias) | Win qualifying encounter | No duplicate grant for already-owning owner; award only still-eligible owner if any | A: owned/alias/shared fixtures |
| BF-R13 | No owner has an eligible locked devil | Determine devil encounter/candidate and then finish | Devil-only candidate not offered or silently substituted; no recruit or roster changes | A: no-candidate |
| BF-R14 | Eligible target ID is unavailable/mismatched, or unlock reason rejected | Attempt grant | Explicit no-award, no substitute/random character; log/trace explains rejected eligibility | A: canRecruit guard |
| BF-R15 | Outcome wins stage but general `gameRecruitPool` contains eligible random recruits | Settle successful devil encounter | Exactly the intended devil grant(s), **zero unrelated random recruits**, no shared co-op recruit side effect | A: mocked recruitment spy |
| BF-R16 | Boss losses/non-BF game win | Settle via same launcher | No devil unlock; unrelated games retain their pre-existing reward behavior | A: cross-game regression |
| BF-R17 | Board pending phase: launch, pause, result, resume | Persist and reload at supported checkpoints | Existing save passes `validRun`; either safely reconstructs or safely rejects impossible partial state with no reward duplication | A: save serialization/reload |
| BF-R18 | P1/P2 have same display name but distinct owner keys | Settle one survivor | Award uses `owner`, not display name, active index, selected fighter or scoreboard winner | A: owner key fixture |
| BF-R19 | Award success followed by storage failure/retry | Inject write failure, reload/retry | No falsely reported permanent unlock; no double award after replay; safe documented recovery | A: storage fault injection |
| BF-R20 | Ordinary board points, progress and random stream recorded | Play Broforce with and without eligibility | Allowed score/turn bookkeeping intact; no unrelated save, roulette, roster, inventory, selected character or RNG mutations | A: before/after invariants |
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

These are **commands to run after implementation**, not commands executed in BF-02. The new focused spec driver `tests/broforce-acceptance.mjs` is a **proposed future file name**, not present or registered at this base. An implementation worker must create deterministic fixtures covering the IDs above, use Playwright where relevant, and add it to the CI workflow or `package.json` scripts through an authorized integration assignment. A standalone test outside the registered core scripts is otherwise invisible to baseline `npm test`.

From repository root, with Node and existing Playwright/browser fixture paths configured per `tests/lib.mjs`:

    node tools/check-modules.mjs
    npm run build
    npm run test:core
    npm test
    node tests/broforce-acceptance.mjs

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

1. Confirm the boss unlock maps to existing catalog **satan** (Legend, Tim Curry) or specify another exact character ID. Today `satan` is Horror-only, so authorize the *narrow* new boss/extraction unlock route and corresponding `canRecruit` reason policy before any reward worker codes it; never make the character generically random-recruitable.
2. Confirm per-survivor owner-specific awards for both survivors versus a single recipient policy. This contract assumes each independently eligible survivor can earn exactly one; any change requires fixtures R01–R06/R18/R21 updated together.
3. Confirm that arcade/dev must suppress **all** BF-specific reward and save writes while legacy general arcade progression remains an existing launcher behavior unless explicitly changed by an integration owner. Confirm device FPS budget and intended fighter respawn/extraction specifics once implementation rules are finalized.
4. Verify BF implementation actually exports enough stable stage events to assert seeds, boss flag, extraction, player survival, award deduplication and terminal lifecycle; no test may substitute arbitrary scores for those facts.
5. Require focused BF suite, registered core CI hook, screenshots and real folded/unfolded device review before promoting to TESTver or main. BF-02 has no merge authority.

**BF-02 evidence limit:** reviewed documentation and baseline source paths only. No Broforce code, stage art, runtime tests, screenshots, builds, Android device checks or CI results are created or asserted by this documentation assignment.
