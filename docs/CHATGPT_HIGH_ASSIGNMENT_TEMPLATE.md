# Standalone ChatGPT High development assignment

The PM copies the block below once per task, replaces every `<placeholder>`, and supplies all relevant context inside that prompt. Do not send unresolved placeholders or rely on another chat's memory. Recommend **GPT-6 High** for every external worker; verify availability in that conversation. Include a separate prompt for each independent branch, and state which prompts may run together. This template is not an assignment until filled and handed off.

```text
SHAMBCONKINS DEVELOPMENT ASSIGNMENT — <task ID and short title>

Recommended model: GPT-6 High in regular ChatGPT.
Repository: seanpconners-source/ShambConkins
Starting branch: TESTver
Exact base commit: <verified full TESTver SHA>
Assigned feature branch: <unique feature/... or fix/... branch>
Workflow: ECONOMY MODE — external implementation worker, not integration manager.
Execution order: <independent of task IDs / start only after named dependency and verified SHA>

OBJECTIVE AND REQUIRED BEHAVIOR
<Describe the observed problem or requested feature, expected before/after behavior,
and concrete acceptance criteria. Include relevant screenshot observations in words;
do not assume attachments from another conversation are accessible.>

PROJECT CONTEXT AND SCOPE
ShambConkins is an offline, generated single-file HTML party/board game for two people
sharing a phone. Source uses small CommonJS-style browser modules listed in
src/modules.json; tools/build.mjs bundles source and assets. Runtime dependencies
and network access must not be introduced casually.
Read AGENTS.md, CLAUDE.md, docs/AI_STATE.md, and relevant source before implementation.
Source files/callers to inspect: <specific paths and why they matter>
Owned files/allowed scope: <specific files or systems>
Shared files to avoid or coordinate: <paths, competing tasks, dependency details>
Behavior that must remain: <task-specific preservation requirements>
Out of scope/deferred: <explicit exclusions>
Acceptance criteria: <observable checks covering requested behavior and regressions>

CAPABILITIES AND AUTHORIZATION
Inspect the available GitHub and execution tools. Do not assume this chat has Codex,
a terminal, a checkout, other chats' files, or automatic coordination with Astra.
Verify the configured GPT-6/High option when exposed; report unavailable settings or
account/tool limits. Do not silently recommend Medium merely to save usage.
You are authorized to create the assigned isolated feature branch from the exact
base above, implement this bounded task, and commit/push to that feature branch.
Confirm the base commit exists and inspect current TESTver. Report divergence;
do not silently replace the pinned base. If a dependency is unfinished, do not
implement against an assumed future result; return the blocking fact.
If the assigned branch exists, inspect it first. Reuse only confirmed work for this
same assignment; never overwrite it or duplicate work already done elsewhere.
With only GitHub API tools, preserve the existing tree and untouched binary assets;
use targeted updates or a tree based on the inspected commit. Verify branch heads
before writes and remote results afterwards. Do not fabricate local git status.

SAFETY AND IMPLEMENTATION
Your assignment's feature-branch-only permission takes precedence over the PM's
standing integration workflow. Do not commit, merge, or push to main or TESTver.
Do not force-push, reset, rewrite shared history, or discard unrelated work.
Preserve saves/progression, stable IDs, unlock rules, portrait/mood naming and assets,
board generation, turn order, minigames, warps, bosses, music, mobile controls, and
portrait/landscape behavior. Inspect affected callers and shared state.
Do not change either Android launcher, release HTML, versioning, or release workflows
unless explicitly included in this assignment. Do not publish a production release.
Keep changes focused; avoid unrelated refactoring and unjustified dependencies.
Do not edit docs/DEVELOPMENT_TASKS.md or shared docs/AI_STATE.md unless assigned;
report proposed state updates to the PM instead. Do not spawn Codex workers as a
supposed way to consume regular ChatGPT allowance.
Implement the requested behavior and review the diff for mistakes and regressions.

VALIDATION
Run npm run build and appropriate focused checks; run npm test when supported and
appropriate. Task-specific checks: <commands, scenarios, expected results>.
For UI/game changes, inspect phone 390x780 and desktop 1100x700 screenshots when
browser tools are available. Real Samsung playtesting remains the owner's step.
Inspect logs as well as exit codes. Existing smoke/route tests can log failures;
the development-validation workflow checks their logged results. Existing fuzz
coverage is not exhaustive. Never claim executable tests ran when they did not.
If execution is unavailable, review statically, state the limit, and inspect actual
GitHub CI results for the pushed commit when accessible. Pending/failed/unavailable
validation must be reported distinctly. Keep unfinished or failing work isolated.

DELIVERY
Commit and push focused work to the assigned feature branch when tools permit,
then verify the branch and commit on GitHub. If direct editing is unavailable,
provide a reviewable patch or exact replacement files with paths and the base SHA;
explain what remains unapplied. Do not invent a branch, commit, test pass, or agent.
Report:
- Task completed (or partial/blocked, with remaining scope)
- Files changed and resulting behavior
- Feature branch and GitHub URL, if verified
- Full commit SHA and base SHA, if verified
- Tests actually performed, results, and CI URL/SHA when available
- Tests unavailable or pending
- Known limitations, dependencies, conflicts, and proposed project-state updates
- Ready for integration: yes/no, with evidence (not authorization to merge)
The owner will return the branch name to the integration manager. Do not merge it
into TESTver or main yourself. Automated success is not owner gameplay approval.
```
