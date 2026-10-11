# Development assignments

PM-owned lightweight ledger for Economy Mode and Codex work. No external ChatGPT assignments have been prepared or launched as part of workflow configuration. The setup itself remains on `codex/multi-agent-setup`, pending separate owner integration approval.

| ID / task | Workflow / reasoning | Feature branch | Base SHA | Status | Dependencies / shared files | Verified completed SHA | Integration / playtest status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FB01 Trivia | Regular GPT-6 High | `fix/trivia-crashes-and-feedback` | `560a475` | integrated | Shared app.js with names, package test script | `afea728` | TESTver `469ff177`; owner-approved playtest; full CI green |
| FB02 Player names | Regular GPT-6 High | `fix/player-entered-names` | `560a475` | integrated | Shared app.js with trivia, package test script | `e3398b0` | TESTver `469ff177`; owner-approved playtest; full CI green |
| FB03 Pokémon Bond/haptics | Regular GPT-6 High | `fix/pokemon-bond-identity-and-haptics` | `560a475` | integrated | package test script | `0fdaaf8` | TESTver `469ff177`; owner-approved playtest; full CI green |
| FB04 Gopher moods | Regular GPT-6 High | `fix/gopher-popup-moods` | `560a475` | integrated | Gopher newGames.js | `7c1166e` | TESTver `469ff177`; owner-approved playtest; full CI green |
| FB05 Fruit Ninja combos | Regular GPT-6 High | `fix/fruit-ninja-swipe-combos` | `560a475` | integrated | package test script | `196eec8` | TESTver `469ff177`; owner-approved playtest; full CI green |
| FB06 Taskmaster relay | Regular GPT-6 High | `feature/taskmaster-frantic-relay` | `560a475` | integrated | package test script | `c80e872` | TESTver `469ff177`; owner-approved playtest; full CI green |

Add one short row when preparing real work; do not create speculative branches or mark a prompt as completed work. Use regular ChatGPT / High, Codex Sol / Medium or High, or Astra / appropriate effort. Retain the exact base and verified completed SHA, not a moving branch name alone.

Statuses: `prepared` (prompt only), `in progress` (owner/worker reported), `reported complete` (not yet verified), `blocked`, `verified` (remote diff reviewed; record test limits), `integrated` (verified TESTver SHA). Track phone feedback as `awaiting playtest`, `owner approved`, or `needs fixes`; automation cannot grant owner approval. A verified branch with pending or failed tests is not ready to integrate.

The PM inspects actual GitHub branches/commits when the owner returns and can register work started directly in ChatGPT then. Workers do not concurrently update this shared ledger or AI_STATE unless their assignment expressly includes it. Record current facts and dependencies, not transcripts; archive/remove closed rows when they no longer help coordination. Actual GitHub history and CI remain the evidence for commits and validation.
