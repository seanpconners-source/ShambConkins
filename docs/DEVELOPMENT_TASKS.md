# Development assignments

PM-owned lightweight ledger for Economy Mode and Codex work. Workflow setup was owner-approved and integrated into TESTver at `560a4751a46e74fc8bfd9201af6ab27d359dec6f`. The first feedback batch below is prepared only; no external worker has been launched. Full standalone prompts and concurrency boundaries: [Android feedback batch](assignments/2026-10-10-android-feedback.md). This planning branch will be included in a validated integration; inspect remote TESTver for current status.

| ID / task | Workflow / reasoning | Feature branch | Base SHA | Status | Dependencies / shared files | Verified completed SHA | Integration / playtest status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FB01 Trivia crashes and answer feedback | Regular ChatGPT / High | `fix/trivia-crashes-and-feedback` (suggested; not created) | `560a4751a46e74fc8bfd9201af6ab27d359dec6f` | prepared | app.js trivia section; reuse audio APIs | — | not integrated; awaiting implementation |
| FB02 Player names follow setup input | Regular ChatGPT / High | `fix/player-entered-names` (suggested; not created) | `560a4751a46e74fc8bfd9201af6ab27d359dec6f` | prepared | app.js setup/name section; preserve owner keys | — | not integrated; awaiting implementation |
| FB03 Pokémon Bond identity and Game Boy haptics | Regular ChatGPT / High | `fix/pokemon-bond-identity-and-haptics` (suggested; not created) | `560a4751a46e74fc8bfd9201af6ab27d359dec6f` | prepared | Pokémon identity; reuse audio APIs | — | not integrated; awaiting implementation |
| FB04 Gopher popup mood variety | Regular ChatGPT / High | `fix/gopher-popup-moods` (suggested; not created) | `560a4751a46e74fc8bfd9201af6ab27d359dec6f` | prepared | gophers section; read-only portrait helpers | — | not integrated; awaiting implementation |
| FB05 Fruit Ninja finite swipe combos | Regular ChatGPT / High | `fix/fruit-ninja-swipe-combos` (suggested; not created) | `560a4751a46e74fc8bfd9201af6ab27d359dec6f` | prepared | fruitSlice only; independent of relay | — | not integrated; awaiting implementation |
| FB06 Taskmaster frantic timed tasks | Regular ChatGPT / High | `feature/taskmaster-frantic-relay` (suggested; not created) | `560a4751a46e74fc8bfd9201af6ab27d359dec6f` | prepared | microRelay and its registry entries | — | not integrated; awaiting implementation |
| FB07 Monopoly auction proposal | Discussion only | — | `560a4751a46e74fc8bfd9201af6ab27d359dec6f` | decision pending | src/engines/monopoly.js; no implementation assigned | — | not integrated |

Add one short row when preparing real work; do not create speculative branches or mark a prompt as completed work. Use regular ChatGPT / High, Codex Sol / Medium or High, or Astra / appropriate effort. Retain the exact base and verified completed SHA, not a moving branch name alone.

Statuses: `prepared` (prompt only), `in progress` (owner/worker reported), `reported complete` (not yet verified), `blocked`, `verified` (remote diff reviewed; record test limits), `integrated` (verified TESTver SHA). Track phone feedback as `awaiting playtest`, `owner approved`, or `needs fixes`; automation cannot grant owner approval. A verified branch with pending or failed tests is not ready to integrate.

The PM inspects actual GitHub branches/commits when the owner returns and can register work started directly in ChatGPT then. Workers do not concurrently update this shared ledger or AI_STATE unless their assignment expressly includes it. Record current facts and dependencies, not transcripts; archive/remove closed rows when they no longer help coordination. Actual GitHub history and CI remain the evidence for commits and validation.
