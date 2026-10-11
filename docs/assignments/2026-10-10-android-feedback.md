# Android feedback batch — 2026-10-10

Status: six assignments prepared; none launched or completed. Copy one complete text block into each regular ChatGPT GPT-6 High conversation. Starting code is verified TESTver commit `560a4751a46e74fc8bfd9201af6ab27d359dec6f`. Setup is already integrated; main remains `3ad8cafaa446c1d988309eee6298fc0d4531b67b`.

Suggested first wave: FB01 trivia, FB02 names, FB03 Pokémon. They own distinct systems/sections; FB01 and FB02 both inspect app.js, and FB01/FB03 reuse audio.js. Do not let workers replace whole shared files or independently redesign common helpers. Second wave: FB04 gophers, FB05 slicing, FB06 relay; these are independent of the first wave and may start without waiting if manageable. Six separate chats are optional, not a demand to run all simultaneously.

The manager reviews actual returned branches, combines verified changes on an integration candidate from the then-current TESTver, validates that exact candidate and only then advances TESTver non-force. No gameplay change is implemented by preparing these prompts.

## Monopoly proposal — decision pending

Current src/engines/monopoly.js auction uses eight sealed-bid deeds, starting cash of $1500 and cash + list values + $300 completed-pair scoring. Recommend making set collection and denial obvious: large color-set progress, property value and set-completion preview, quick bid presets, fewer phone handoffs and a dramatic reveal showing the change in standings. Preserve hidden bids. Start with a short guided auction and clearly explain ties and winning worth. Keep scope to a compact auction rather than adding a full Monopoly board. Before redesign, investigate seal()/nextLot(): nextLot alternates first bidder, but seal appears to assume player 0 always bids first; this may skip a bidder on alternating lots. This is a static lead, not a reproduced bug. No Monopoly implementation is authorized by this planning entry; owner asked for recommendations.

## FB01 — Trivia crashes and answer feedback

```text
SHAMBCONKINS FB01 — Trivia crashes and answer feedback

Recommended model: GPT-6 High in regular ChatGPT.
Repository: seanpconners-source/ShambConkins
Starting branch: TESTver
Exact base: 560a4751a46e74fc8bfd9201af6ab27d359dec6f
Assigned feature branch: fix/trivia-crashes-and-feedback
Workflow: ECONOMY MODE; isolated implementation worker.
Execution: independent branch from this pinned base; do not merge another worker's unfinished work. Coordinate any newly discovered overlapping function before editing it.

ShambConkins is an offline, generated single-file HTML party/board game for two people sharing a phone, with CommonJS-style browser modules listed in src/modules.json. Read AGENTS.md, CLAUDE.md, docs/AI_STATE.md, relevant source and docs/ENGINE_GUIDE.md for engine work. Inspect these files first: src/data/trivia3.js, src/triviaCatalog.js, src/engines/trivia.js, src/engines/triviaModes.js, src/app.js (only trivia event feedback), src/audio.js, and relevant trivia tests.
Complexity/risk: Medium; shared trivia and board-event UI.

TASK AND ACCEPTANCE
Fix immediate crashes reported for “Fat Guy in a Little Coat · Chris Farley” (tag farley) and “Make My Day · Clint Eastwood” (tag eastwood). Both titles are in src/data/trivia3.js. Reproduce through the actual launch path and capture the exception before changing code. Inspect question-pool counts, difficulty selection and initialization: selectTrivia throws for undersized pools and difficulty rendering expects a defined difficulty. These are leads, not a confirmed root cause. Preserve topic relevance, question quality, difficulty/score rules, steals and recent-question tracking; do not hide failures with generic catches or silently substitute unrelated trivia.
Add a clearly stronger but brief correct-answer celebration and a distinct wrong-answer buzzer. Incorrect submitted answers must include the exact text “this does not represent me”. Preserve the hidden correct answer until any steal resolves. Keep timeout wording distinct. Cover normal trivia, supported trivia modes and board trivia events; use existing audio/effects settings and respect reduced motion. Avoid blocking the next question or double scoring.
Acceptance: both reported topics launch and complete repeatedly, correct/wrong/steal/timeout paths work, answer feedback respects mute/reduced motion, and existing topics still work. Add meaningful regression checks for the actual crash. Review lightning round counts too. Coordinate any necessary broad app.js/audio.js changes; name and Pokémon workers also inspect these modules.

TOOLS, AUTHORIZATION AND SAFETY
Verify available GPT-6 High, GitHub permissions and executable/browser tools; report limitations rather than assume access. You are authorized to implement and commit/push ONLY to the assigned feature branch. Confirm the base exists, inspect current TESTver and any existing assigned branch, and preserve unrelated changes. Report divergence; never silently change the pinned base or overwrite an existing branch. With GitHub-only tools, preserve the full existing tree and binary assets and verify remote branch/commit results.
Do not modify or merge into main or TESTver. No force-push, resets, destructive history rewriting, unrelated refactoring or unnecessary dependencies. Preserve saves/progression, roster ownership, stable IDs, asset paths, board/turn behavior, other games, audio settings and mobile layouts. Do not alter Android launchers, version numbers, release HTML or release workflows. Do not edit the shared task ledger or AI_STATE. External chats do not share context or communicate automatically; do not launch Codex agents as a substitute for regular ChatGPT allowance.

VALIDATION AND DELIVERY
Review the actual diff. Run npm run build and appropriate focused checks; npm test when supported/appropriate. Inspect logs for errors, not just exit codes. For UI changes inspect 390x780 and 1100x700 screenshots when browser tools exist. Add meaningful regressions for behavioral bugs. Never claim a test passed unless run; exact-commit GitHub CI may supply execution evidence, but pending/failed CI is not success. Samsung playtesting remains pending.
Commit/push and verify the assigned branch when supported; otherwise return a reviewable patch or exact replacement files with paths and base SHA, identifying what is unapplied. Report task completion/remaining work, files changed, verified branch URL/full commit SHA/base, actual tests/results, unavailable or pending checks, limitations/conflicts, and whether ready for integration with evidence. Never invent a branch, SHA, test result or completed agent. Return control to the owner/PM; do not merge into TESTver or main.
```

## FB02 — Player names follow setup input

```text
SHAMBCONKINS FB02 — Player names follow setup input

Recommended model: GPT-6 High in regular ChatGPT.
Repository: seanpconners-source/ShambConkins
Starting branch: TESTver
Exact base: 560a4751a46e74fc8bfd9201af6ab27d359dec6f
Assigned feature branch: fix/player-entered-names
Workflow: ECONOMY MODE; isolated implementation worker.
Execution: independent branch from this pinned base; do not merge another worker's unfinished work. Coordinate any newly discovered overlapping function before editing it.

ShambConkins is an offline, generated single-file HTML party/board game for two people sharing a phone, with CommonJS-style browser modules listed in src/modules.json. Read AGENTS.md, CLAUDE.md, docs/AI_STATE.md, relevant source and docs/ENGINE_GUIDE.md for engine work. Inspect these files first: src/app.js (captureSetup/startRun/setup actions only), src/ui.js, src/state.js, src/engines/session.js, src/gameLauncher.js, and persistence/profile callers.
Complexity/risk: Medium; preserve saved roster ownership.

TASK AND ACCEPTANCE
The owner reports that regardless of entered names, player 1 remains Sean and player 2 Amber. Trace setup input through character selection, new-run creation, minigame sessions, results and save/reload, including the vault/practice route if implicated. Current newPlayer already accepts a display name; do not assume that function is the root cause.
Make the actual entered names appear consistently in active player-facing labels. Preserve input when choosing/changing characters and starting the run. Define sensible blank-name fallback and retain the existing length limit and escaping. Crucially, internal owner values Sean/Amber identify persistent roster ownership; do not rename those keys or migrate/erase unlocks merely to fix labels.
Acceptance: two distinct custom names survive character changes, new game, board turns, minigame handoff/results and reload. Existing saves and separate player unlocks remain intact. Test blank/whitespace, apostrophes and HTML-like input safely. Change only setup/name-related sections of app.js; FB01 owns trivia-event feedback. If fixes require editing the same shared function as another task, report the dependency rather than making competing changes.

TOOLS, AUTHORIZATION AND SAFETY
Verify available GPT-6 High, GitHub permissions and executable/browser tools; report limitations rather than assume access. You are authorized to implement and commit/push ONLY to the assigned feature branch. Confirm the base exists, inspect current TESTver and any existing assigned branch, and preserve unrelated changes. Report divergence; never silently change the pinned base or overwrite an existing branch. With GitHub-only tools, preserve the full existing tree and binary assets and verify remote branch/commit results.
Do not modify or merge into main or TESTver. No force-push, resets, destructive history rewriting, unrelated refactoring or unnecessary dependencies. Preserve saves/progression, roster ownership, stable IDs, asset paths, board/turn behavior, other games, audio settings and mobile layouts. Do not alter Android launchers, version numbers, release HTML or release workflows. Do not edit the shared task ledger or AI_STATE. External chats do not share context or communicate automatically; do not launch Codex agents as a substitute for regular ChatGPT allowance.

VALIDATION AND DELIVERY
Review the actual diff. Run npm run build and appropriate focused checks; npm test when supported/appropriate. Inspect logs for errors, not just exit codes. For UI changes inspect 390x780 and 1100x700 screenshots when browser tools exist. Add meaningful regressions for behavioral bugs. Never claim a test passed unless run; exact-commit GitHub CI may supply execution evidence, but pending/failed CI is not success. Samsung playtesting remains pending.
Commit/push and verify the assigned branch when supported; otherwise return a reviewable patch or exact replacement files with paths and base SHA, identifying what is unapplied. Report task completion/remaining work, files changed, verified branch URL/full commit SHA/base, actual tests/results, unavailable or pending checks, limitations/conflicts, and whether ready for integration with evidence. Never invent a branch, SHA, test result or completed agent. Return control to the owner/PM; do not merge into TESTver or main.
```

## FB03 — Pokémon Bond identity and Game Boy haptics

```text
SHAMBCONKINS FB03 — Pokémon Bond identity and Game Boy haptics

Recommended model: GPT-6 High in regular ChatGPT.
Repository: seanpconners-source/ShambConkins
Starting branch: TESTver
Exact base: 560a4751a46e74fc8bfd9201af6ab27d359dec6f
Assigned feature branch: fix/pokemon-bond-identity-and-haptics
Workflow: ECONOMY MODE; isolated implementation worker.
Execution: independent branch from this pinned base; do not merge another worker's unfinished work. Coordinate any newly discovered overlapping function before editing it.

ShambConkins is an offline, generated single-file HTML party/board game for two people sharing a phone, with CommonJS-style browser modules listed in src/modules.json. Read AGENTS.md, CLAUDE.md, docs/AI_STATE.md, relevant source and docs/ENGINE_GUIDE.md for engine work. Inspect these files first: src/pkmn/pkmnRun.js, src/pkmn/pkmnBattle.js, src/pkmn/pkmnSprites.js, src/pkmn/pkmnData.js, src/data/movieBonds.js, src/characters.js, src/suppliedPortraits.js, src/data/facePack.js, src/assets.js and src/audio.js.
Complexity/risk: Medium-high; identity and unlock consistency.

TASK AND ACCEPTANCE
Investigate the reported wild encounter that displayed George Lazenby’s face but unlocked Timothy Dalton. Follow the same encounter character ID through selection, battle sprite/moods/cache, result, recruitment and unlock dialog. Verify actual portrait mappings/images, not just filenames. Preserve the distinct bond-dalton and bond-lazenby identities and the legacy bond ID. Fix the evidenced mismatch at its source; do not broadly collapse Bond variants or alter existing earned characters. If the supplied art itself is misidentified, document evidence and use verified existing matching art; do not invent replacement portraits.
Add subtle tactile feedback to Game Boy D-pad, A/B and Start/Select button presses through the existing vibrate helper (it respects reduced motion). Prefer a brief roughly 8–12ms pulse once per real press; no duplicate touch/click pulses or buzzing on every held-key repeat. Unsupported/disabled vibration must be harmless.
Acceptance: deterministic Dalton and Lazenby encounters show and recruit the same actor, including alternate moods and cached consecutive encounters; other characters and saves remain correct. Button actions still fire once and haptics settings are respected. Run relevant tests/pokemon.mjs, tests/pkmnmoods.mjs and tests/pkmnmoodbattle.mjs when supported, plus a focused identity regression. Physical vibration requires owner Samsung verification. Reuse audio.js APIs; coordinate any unavoidable shared helper change with trivia work.

TOOLS, AUTHORIZATION AND SAFETY
Verify available GPT-6 High, GitHub permissions and executable/browser tools; report limitations rather than assume access. You are authorized to implement and commit/push ONLY to the assigned feature branch. Confirm the base exists, inspect current TESTver and any existing assigned branch, and preserve unrelated changes. Report divergence; never silently change the pinned base or overwrite an existing branch. With GitHub-only tools, preserve the full existing tree and binary assets and verify remote branch/commit results.
Do not modify or merge into main or TESTver. No force-push, resets, destructive history rewriting, unrelated refactoring or unnecessary dependencies. Preserve saves/progression, roster ownership, stable IDs, asset paths, board/turn behavior, other games, audio settings and mobile layouts. Do not alter Android launchers, version numbers, release HTML or release workflows. Do not edit the shared task ledger or AI_STATE. External chats do not share context or communicate automatically; do not launch Codex agents as a substitute for regular ChatGPT allowance.

VALIDATION AND DELIVERY
Review the actual diff. Run npm run build and appropriate focused checks; npm test when supported/appropriate. Inspect logs for errors, not just exit codes. For UI changes inspect 390x780 and 1100x700 screenshots when browser tools exist. Add meaningful regressions for behavioral bugs. Never claim a test passed unless run; exact-commit GitHub CI may supply execution evidence, but pending/failed CI is not success. Samsung playtesting remains pending.
Commit/push and verify the assigned branch when supported; otherwise return a reviewable patch or exact replacement files with paths and base SHA, identifying what is unapplied. Report task completion/remaining work, files changed, verified branch URL/full commit SHA/base, actual tests/results, unavailable or pending checks, limitations/conflicts, and whether ready for integration with evidence. Never invent a branch, SHA, test result or completed agent. Return control to the owner/PM; do not merge into TESTver or main.
```

## FB04 — Gopher popup mood variety

```text
SHAMBCONKINS FB04 — Gopher popup mood variety

Recommended model: GPT-6 High in regular ChatGPT.
Repository: seanpconners-source/ShambConkins
Starting branch: TESTver
Exact base: 560a4751a46e74fc8bfd9201af6ab27d359dec6f
Assigned feature branch: fix/gopher-popup-moods
Workflow: ECONOMY MODE; isolated implementation worker.
Execution: independent branch from this pinned base; do not merge another worker's unfinished work. Coordinate any newly discovered overlapping function before editing it.

ShambConkins is an offline, generated single-file HTML party/board game for two people sharing a phone, with CommonJS-style browser modules listed in src/modules.json. Read AGENTS.md, CLAUDE.md, docs/AI_STATE.md, relevant source and docs/ENGINE_GUIDE.md for engine work. Inspect these files first: src/engines/newGames.js (gophers only), src/assets.js portraitMoods/portraitURL and src/engines/session.js sprite behavior.
Complexity/risk: Low; isolated cosmetic change.

TASK AND ACCEPTANCE
Gopher Hunt should show a randomly chosen available mood image for each popup, rather than the same face repeatedly. The current gophers renderer in src/engines/newGames.js hard-codes normal for ordinary heads and happy for crowned ones. Choose and store a mood at spawn, stable throughout that popup; avoid immediate repeats when more than one distinct image is available. Always use the current rival’s own portraits, with a safe fallback for characters lacking mood variants.
Preserve hit reactions, crowns, non-target decoys, hit boxes, scoring, timing and the matched pop sequence for both players. Cosmetic random choices must not perturb the seeded gameplay random stream. Prefer consuming existing portrait helpers rather than changing shared asset resolution.
Acceptance: repeated popups visibly vary without frame-by-frame flicker; no cross-character faces; one-image characters work; crowned/ordinary heads and decoys remain distinguishable; both players still receive identical gameplay patterns. Scope changes to the gophers engine section and focused tests. Inspect phone and landscape screenshots.

TOOLS, AUTHORIZATION AND SAFETY
Verify available GPT-6 High, GitHub permissions and executable/browser tools; report limitations rather than assume access. You are authorized to implement and commit/push ONLY to the assigned feature branch. Confirm the base exists, inspect current TESTver and any existing assigned branch, and preserve unrelated changes. Report divergence; never silently change the pinned base or overwrite an existing branch. With GitHub-only tools, preserve the full existing tree and binary assets and verify remote branch/commit results.
Do not modify or merge into main or TESTver. No force-push, resets, destructive history rewriting, unrelated refactoring or unnecessary dependencies. Preserve saves/progression, roster ownership, stable IDs, asset paths, board/turn behavior, other games, audio settings and mobile layouts. Do not alter Android launchers, version numbers, release HTML or release workflows. Do not edit the shared task ledger or AI_STATE. External chats do not share context or communicate automatically; do not launch Codex agents as a substitute for regular ChatGPT allowance.

VALIDATION AND DELIVERY
Review the actual diff. Run npm run build and appropriate focused checks; npm test when supported/appropriate. Inspect logs for errors, not just exit codes. For UI changes inspect 390x780 and 1100x700 screenshots when browser tools exist. Add meaningful regressions for behavioral bugs. Never claim a test passed unless run; exact-commit GitHub CI may supply execution evidence, but pending/failed CI is not success. Samsung playtesting remains pending.
Commit/push and verify the assigned branch when supported; otherwise return a reviewable patch or exact replacement files with paths and base SHA, identifying what is unapplied. Report task completion/remaining work, files changed, verified branch URL/full commit SHA/base, actual tests/results, unavailable or pending checks, limitations/conflicts, and whether ready for integration with evidence. Never invent a branch, SHA, test result or completed agent. Return control to the owner/PM; do not merge into TESTver or main.
```

## FB05 — Fruit Ninja finite swipe combos

```text
SHAMBCONKINS FB05 — Fruit Ninja finite swipe combos

Recommended model: GPT-6 High in regular ChatGPT.
Repository: seanpconners-source/ShambConkins
Starting branch: TESTver
Exact base: 560a4751a46e74fc8bfd9201af6ab27d359dec6f
Assigned feature branch: fix/fruit-ninja-swipe-combos
Workflow: ECONOMY MODE; isolated implementation worker.
Execution: independent branch from this pinned base; do not merge another worker's unfinished work. Coordinate any newly discovered overlapping function before editing it.

ShambConkins is an offline, generated single-file HTML party/board game for two people sharing a phone, with CommonJS-style browser modules listed in src/modules.json. Read AGENTS.md, CLAUDE.md, docs/AI_STATE.md, relevant source and docs/ENGINE_GUIDE.md for engine work. Inspect these files first: src/engines/fruitSlice.js, src/engines/session.js and relevant touch/input tests; read src/gameRegistry.js for current rules.
Complexity/risk: Medium; input and scoring edge cases.

TASK AND ACCEPTANCE
Fix the exploit where leaving a finger down keeps one combo across the entire round. Current combo state resets mainly on pointer release/cancel; pointer moves keep adding hits. A combo must represent one brief, active slicing stroke, not one arbitrarily long pointer capture.
Segment strokes using reasonable elapsed-time and movement/pause thresholds in logical coordinates. A stationary held finger must not cut fruit, tiny jitter must not prolong a combo, and a new purposeful swipe while still touching may start a new stroke after the old one expires. Preserve satisfying fast multi-head swipes and existing base points, three-hit combo rewards, bombs, identical opponent waves and turn duration. Make keyboard slicing obey finite combo boundaries too.
Acceptance: hold still for several seconds, hold and intermittently drag, scribble continuously, perform a genuine fast three-head swipe, cancel/blur/pause/resize and switch turns. Old combos never leak across those boundaries and the legitimate short swipe still earns its bonus. Test touch/pointer input and keyboard behavior. Document chosen thresholds for review. Avoid changing shared input helpers or gameRegistry unless necessary; FB06 owns the Taskmaster registry entries.

TOOLS, AUTHORIZATION AND SAFETY
Verify available GPT-6 High, GitHub permissions and executable/browser tools; report limitations rather than assume access. You are authorized to implement and commit/push ONLY to the assigned feature branch. Confirm the base exists, inspect current TESTver and any existing assigned branch, and preserve unrelated changes. Report divergence; never silently change the pinned base or overwrite an existing branch. With GitHub-only tools, preserve the full existing tree and binary assets and verify remote branch/commit results.
Do not modify or merge into main or TESTver. No force-push, resets, destructive history rewriting, unrelated refactoring or unnecessary dependencies. Preserve saves/progression, roster ownership, stable IDs, asset paths, board/turn behavior, other games, audio settings and mobile layouts. Do not alter Android launchers, version numbers, release HTML or release workflows. Do not edit the shared task ledger or AI_STATE. External chats do not share context or communicate automatically; do not launch Codex agents as a substitute for regular ChatGPT allowance.

VALIDATION AND DELIVERY
Review the actual diff. Run npm run build and appropriate focused checks; npm test when supported/appropriate. Inspect logs for errors, not just exit codes. For UI changes inspect 390x780 and 1100x700 screenshots when browser tools exist. Add meaningful regressions for behavioral bugs. Never claim a test passed unless run; exact-commit GitHub CI may supply execution evidence, but pending/failed CI is not success. Samsung playtesting remains pending.
Commit/push and verify the assigned branch when supported; otherwise return a reviewable patch or exact replacement files with paths and base SHA, identifying what is unapplied. Report task completion/remaining work, files changed, verified branch URL/full commit SHA/base, actual tests/results, unavailable or pending checks, limitations/conflicts, and whether ready for integration with evidence. Never invent a branch, SHA, test result or completed agent. Return control to the owner/PM; do not merge into TESTver or main.
```

## FB06 — Taskmaster frantic timed tasks

```text
SHAMBCONKINS FB06 — Taskmaster frantic timed tasks

Recommended model: GPT-6 High in regular ChatGPT.
Repository: seanpconners-source/ShambConkins
Starting branch: TESTver
Exact base: 560a4751a46e74fc8bfd9201af6ab27d359dec6f
Assigned feature branch: feature/taskmaster-frantic-relay
Workflow: ECONOMY MODE; isolated implementation worker.
Execution: independent branch from this pinned base; do not merge another worker's unfinished work. Coordinate any newly discovered overlapping function before editing it.

ShambConkins is an offline, generated single-file HTML party/board game for two people sharing a phone, with CommonJS-style browser modules listed in src/modules.json. Read AGENTS.md, CLAUDE.md, docs/AI_STATE.md, relevant source and docs/ENGINE_GUIDE.md for engine work. Inspect these files first: src/engines/microRelay.js, src/gameRegistry.js (taskmaster-micro-relay definition/title/touch rules only), docs/ENGINE_GUIDE.md and relevant engine tests.
Complexity/risk: Medium-high; bounded gameplay redesign.

TASK AND ACCEPTANCE
Improve taskmaster-micro-relay, currently “Taskmaster × WarioWare · Microtask Relay”. It explicitly includes Metal Gear, Fight Milk, Final Fantasy, Speed and other franchise tasks. The owner wants a coherent Taskmaster game that feels frantic and fun with small timed goals.
Keep the stable game ID and session integration. Rework its microtasks into clear Taskmaster-style physical/object challenges: put an object in a marked box, stack/place objects, stop precisely, balance, dodge or sort. Use envelope/task-card presentation, “Your time starts now”, a prominent countdown and immediate unmistakable success/failure feedback. Use short one-line instructions with a visual cue; provide an initial unscored practice example, then brief readable task cards and quick transitions rather than lengthy pass screens between every microtask. Target a compact roughly 45–60 second scored run per player, with modest pacing escalation and several different gestures. Use the same seeded tasks, hazards and scoring opportunities for both players. Explain final rules/choices in the report.
Acceptance: players can tell what to do immediately, objectives are achievable with large phone targets, failures recover into the next task, scores/remaining time are readable, pause/cancel/rotation clean up correctly, and no unrelated franchise theme remains in this relay. Preserve unrelated real-world Taskmaster tasks and Fruit Ninja. Review existing geometry and generated task parameters rather than merely reskinning broken controls. Run focused completion/timeout/input checks and matched-player fairness checks. Avoid unrelated registry edits. Owner phone playtesting decides whether it is fun.

TOOLS, AUTHORIZATION AND SAFETY
Verify available GPT-6 High, GitHub permissions and executable/browser tools; report limitations rather than assume access. You are authorized to implement and commit/push ONLY to the assigned feature branch. Confirm the base exists, inspect current TESTver and any existing assigned branch, and preserve unrelated changes. Report divergence; never silently change the pinned base or overwrite an existing branch. With GitHub-only tools, preserve the full existing tree and binary assets and verify remote branch/commit results.
Do not modify or merge into main or TESTver. No force-push, resets, destructive history rewriting, unrelated refactoring or unnecessary dependencies. Preserve saves/progression, roster ownership, stable IDs, asset paths, board/turn behavior, other games, audio settings and mobile layouts. Do not alter Android launchers, version numbers, release HTML or release workflows. Do not edit the shared task ledger or AI_STATE. External chats do not share context or communicate automatically; do not launch Codex agents as a substitute for regular ChatGPT allowance.

VALIDATION AND DELIVERY
Review the actual diff. Run npm run build and appropriate focused checks; npm test when supported/appropriate. Inspect logs for errors, not just exit codes. For UI changes inspect 390x780 and 1100x700 screenshots when browser tools exist. Add meaningful regressions for behavioral bugs. Never claim a test passed unless run; exact-commit GitHub CI may supply execution evidence, but pending/failed CI is not success. Samsung playtesting remains pending.
Commit/push and verify the assigned branch when supported; otherwise return a reviewable patch or exact replacement files with paths and base SHA, identifying what is unapplied. Report task completion/remaining work, files changed, verified branch URL/full commit SHA/base, actual tests/results, unavailable or pending checks, limitations/conflicts, and whether ready for integration with evidence. Never invent a branch, SHA, test result or completed agent. Return control to the owner/PM; do not merge into TESTver or main.
```

