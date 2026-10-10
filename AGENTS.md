# ShambConkins — Codex working instructions

Read `CLAUDE.md` and `docs/AI_STATE.md` at the start of each task. Their game architecture, content, testing, and save-compatibility rules apply here. This file and `docs/CODEX_WORKFLOW.md` govern Codex branch integration and session recommendations where the older Claude guide describes a different single-branch practice. Keep `docs/AI_STATE.md` concise and current after meaningful work; do not turn it into a transcript.

## Owner and task intake

- Sean is the product owner. He may paste informal feedback. Organize it into actionable work, items to investigate, questions requiring a decision, future ideas, and deferred or rejected items. Treat actionable notes as requests to implement unless Sean asks only for planning or research. Speculative ideas do not authorize implementation; do not silently implement deferred or rejected ideas.
- Carry ordinary requested work through implementation, validation, and integration. Ask for a decision only for a significant gameplay ambiguity, architecture choice, destructive or high-risk action, or explicit release approval. Explain a concrete tradeoff and finish independent work while waiting.
- Make a proportionate plan: inspect callers and dependencies, define acceptance criteria and risks, then group independent work into batches so a difficult task does not block easy ones. Avoid unrelated refactoring and new dependencies.
- The PM owns the full outcome, including agent coordination, review, testing, and the final report. Use Astra (`gpt-6-astra`) at medium reasoning for normal PM work and high for complex planning. Use Sol (`gpt-6-sol`) at medium reasoning for routine coding and high for complex coding when native delegation is available and useful. Agent use does not relieve the PM of verification.
- Verify the active Codex tool's agent and model support each session. When its current schema requires `fork_turns=none` for a model override, provide a complete bounded brief because parent history is absent. If delegation or override is unavailable, work directly or describe the limitation accurately; never claim that delegation happened when it did not.

## Starting and dividing work

- Inspect `git status`, recent `git log`, the current branch, `main`, `TESTver`, and relevant uncommitted work before changing files. Check the remote state when available. Do not assume local branches are current.
- Develop each feature or fix on its own branch or worktree from the latest `TESTver`. Give concurrent agents distinct files or isolated worktrees and explicit boundaries; never allow conflicting writers. Inspect and preserve owner art and other commits that arrive while work is underway.
- Never force-push, reset, rewrite shared history, or discard someone else's changes without explicit owner permission. The `CLAUDE.md` suggestion to `git pull --rebase` applies to a private feature branch only. Integrate shared `TESTver` with ordinary merges, never a shared-branch rebase.
- The initial permanent workflow setup requires separate owner approval after the committed diff is ready to review. Ordinary validated integration into `TESTver` is standing authorized after setup. A merge or release to `main` always requires explicit owner approval.

## Implement and verify

- Preserve existing ids, save compatibility, game systems, and asset paths. Follow `CLAUDE.md` before editing modules, engines, portraits, or release files. For minigames, read `docs/ENGINE_GUIDE.md` first. Add new modules to `src/modules.json`.
- Run focused checks for the changed behavior, `npm run build`, and `npm test` as appropriate. Read test output as well as exit status: smoke checks may log errors without failing. Never report a pass for a check that did not run.
- For UI or game changes, inspect Playwright screenshots at phone 390×780 and desktop 1100×700. Report any remaining real-phone testing plainly. Android `TESTver` uses `http://127.0.0.1:8766` with separate storage; preserve both the `TESTver` and production Android launchers. Automated green is not the owner's playtest approval.
- If local checks cannot run, keep work isolated. A proposed GitHub CI check may substitute only when its successful result is verified for the exact candidate SHA. Do not infer success from another commit or a green badge on a moving branch.

## Integrate and release

- Commit the feature, build a candidate integration against the latest `TESTver`, review its combined diff, and validate that exact candidate before advancing remote `TESTver` with a non-force push. If the remote moves, integrate the new commits and validate again. Verify the remote `TESTver` SHA after pushing and tell Sean to open the `TESTver` shortcut. On failure, leave remote `TESTver` at its last good commit and preserve the feature branch. Preserve owner work through normal merges.
- Keep rejected changes out of the release candidate using a separate branch or a revert, without rewriting history. Compare `main` and `TESTver` against the owner's approved scope before proposing a release.
- Production preparation follows `CLAUDE.md`: update `src/version.js`, `package.json` including the release script's output version, the changelog, and the established release file. Run `npm run release` only for approved production preparation. Do not advance `main` without explicit approval. After an approved main release, synchronize `TESTver` while preserving ongoing work.
- Repository branch rules here describe team practice, not enforced GitHub protection. Do not claim that `main` or `TESTver` is protected unless verified.

## Completion report and handoff

Use these short headings in the owner report: `COMPLETED`, `TESTVER STATUS`, `TEST RESULTS`, `REMAINING`, `NEXT STEP`, `SESSION RECOMMENDATION`, and `RECOMMENDED MODEL`. Name actual commits and exact validation; distinguish staged, pushed, merged, and owner-approved states. Recommend medium reasoning by default, high for architecture, save or game-state work, multiplayer flow, complex merges, or release preparation. Recommend a fresh session when context is confused, a substantially different complex system is next, a major project is complete, or a hard bug needs clean context; give a clean handoff, not a blanket instruction to stay while debugging. State model and effort, branch, objective, completed commits, pending work, risks, and an exact next prompt. See `docs/CODEX_WORKFLOW.md`.
