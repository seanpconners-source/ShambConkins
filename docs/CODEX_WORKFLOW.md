# Codex workflow for ShambConkins

This guide describes the owner's standing workflow once the initial setup is approved. `AGENTS.md` is the operational instruction; `CLAUDE.md` and `docs/AI_STATE.md` remain the game reference and compact project state. The initial setup itself needs owner approval after a committed diff review. Normal validated work may then move into `TESTver`; `main` release always needs explicit approval.

## Configuration and scope

The checked-in `.codex/config.toml` selects Astra at medium reasoning for the PM, enables native agents, and sets Sol at medium with a limit of three concurrent agent threads. Medium is the default; use high for architecture, save or game-state changes, multiplayer flow, complex merges, or release preparation. Open a trusted local checkout at the project root so the Codex CLI can read project configuration. `AGENTS.md` is discoverable only on branches containing it: verify which instructions loaded at startup. A hosted chat may not load the TOML or change its running model; inspect the active environment rather than assuming it did. Native delegation depends on the current tool schema. If that schema requires `fork_turns=none` for a model override, provide a self-contained, bounded assignment because history will be absent. If unavailable, do the work directly and report that honestly. This setup does not add scripts, custom roles, or sandbox and permission bypass settings.

During setup, one bounded assignment ran successfully on native Sol Medium. Runtime Codex CLI project-config discovery remained unverified because the runtime home was read-only; verify it in a trusted local checkout before claiming it works there.

The owner can send rough notes. The PM turns them into actionable tasks, investigations, decisions, future ideas, and deferred or rejected items. Treat actionable notes as implementation requests unless he asks for planning or research only; speculative ideas do not authorize implementation. Inspect callers, dependencies, acceptance criteria, and risks, then batch independent tasks so difficult work does not delay easy work. Avoid unrelated refactoring and new dependencies. Ask only when gameplay intent is materially ambiguous, an architecture choice has a meaningful tradeoff, an action is destructive or high risk, or a production release is ready for approval. The PM remains responsible for every delegated result.

## Branch flow

1. Read `CLAUDE.md`, `docs/AI_STATE.md`, `AGENTS.md`, and the relevant code. Inspect status, recent commits, `main`, `TESTver`, remote movement, and owner changes. The setup baseline was `3ad8cafaa446c1d988309eee6298fc0d4531b67b` on `main` and `TESTver`; treat it as history, not as a perpetual branch tip.
2. Create a feature or fix branch/worktree from current `TESTver`. Assign independent files to parallel workers; use separate worktrees when work may overlap. Keep owner art and uncommitted edits intact. Do not force-push, reset, rewrite history, or discard owner work. Rebase only a private feature branch where appropriate; use ordinary merges on shared `TESTver`.
3. Implement and review the bounded change. Run focused checks, `npm run build`, and `npm test` as appropriate. Read logs for errors even when commands exit zero. For UI/game changes, inspect Playwright screenshots at 390×780 and 1100×700. Record what was not tested, including real-phone feel.
4. Commit the feature. Make a candidate against the latest `TESTver`, review the combined diff, and validate that candidate before advancing the remote branch. If `TESTver` moved, merge the new tip into the candidate and revalidate. If local checks cannot run, leave the branch isolated or verify successful CI for the candidate's exact SHA. Green automation does not mean the owner approved gameplay.
5. Push validated `TESTver` without force, verify its remote SHA, and tell Sean to open the `TESTver` shortcut. If integration or validation fails, preserve the feature branch and leave the remote at its last good commit. Keep the Android `TESTver` endpoint at `http://127.0.0.1:8766`; its browser storage is separate. Preserve both Android launchers, including production. Update `docs/AI_STATE.md` after meaningful game work with current facts and next steps, without a transcript.

## Development validation

`.github/workflows/development-validation.yml` defines push checks for `TESTver`, `codex/**`, `feature/**`, `fix/**`, and `integrate/**`, and pull-request checks targeting `TESTver`. It uses read-only `contents` permission, never releases or pushes, runs module/build/full tests, and sets up Node 22 and Playwright 1.50.1 at the same expected browser paths as the existing Castlevania workflow. It checks smoke and route logged results in addition to command exit codes and retains logs/screenshots for 14 days. `tests/games.mjs` exception accounting is imperfect, so a green run does not establish exhaustive gameplay correctness. Verify CI success on the exact candidate SHA before relying on it; a checked-in workflow alone is not proof it ran. The existing Castlevania workflow is unchanged.

## Production release

Before asking for release approval, compare `main` and `TESTver` with the owner's accepted scope. Exclude rejected changes through separate branches or reversions, preserving public history. Prepare the established release materials: `src/version.js`, `package.json` version and release output path, changelog, and release HTML. Run `npm run release` only for approved production preparation. Show the concrete candidate and validation for approval before advancing `main`. After an approved release, bring `TESTver` forward without losing ongoing work. These are workflow rules, not GitHub branch protection; `main` and `TESTver` were unprotected at setup time.

## Report and session handoff

Report under `COMPLETED`, `TESTVER STATUS`, `TEST RESULTS`, `REMAINING`, `NEXT STEP`, `SESSION RECOMMENDATION`, and `RECOMMENDED MODEL`. Say which SHA was validated and whether work is local, pushed, or merged. Recommend a fresh session when context is confused, the next task enters a substantially different complex system, a major project is complete, or a hard bug needs clean context. Give a compact handoff at that point; routine batches need no new session.

At a handoff, give the next session a compact prompt such as:

> Use Astra medium as PM for ShambConkins. Start on `<branch>` at `<SHA>`. Read `AGENTS.md`, `CLAUDE.md`, and `docs/AI_STATE.md`. Objective: `<approved objective>`. Completed: `<commits and validation>`. Pending: `<specific work>`. Watch for: `<risks or owner decisions>`. Use Sol medium for bounded coding if native delegation is available. Continue through validated `TESTver` integration; ask before a `main` release.
