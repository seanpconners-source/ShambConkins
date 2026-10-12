# Windows: Run ShambConkins automated tests without GitHub Actions

**Cost:** $0 GitHub Actions minutes. The entire test suite runs on your computer. It does not upload, push, edit user portraits, or change saves.

## How to use (double-click)

1. Open your ShambConkins repository folder in **GitHub Desktop** (Repository > Show in Explorer). Use **Fetch origin / Pull origin** first to get the latest testing tools.
2. Double-click **`RUN-LOCAL-TESTS.cmd`** at the repository root. The black window stays open and shows each test PASS or FAIL.
3. For everyday changes, double-click **`RUN-QUICK-TESTS.cmd`** instead. It runs the build, gameplay logic tests and essential Chromium browser checks, without fuzzing the entire minigame catalog.
4. At the end, read **`local-test-reports/<date>-full/SUMMARY.txt`** or the matching `-quick` folder. That folder also contains step-by-step `.log` files and screenshots. These are ignored by Git and never pushed to GitHub.

**First-time setup:** Node.js 20 or later is required. Install the official Node.js LTS package (with npm) from https://nodejs.org if the launcher says Node or npm is missing. It automatically installs Playwright into this repository's ignored `node_modules` and downloads its compatible Chromium browser into your normal user cache **once**, using your computer's internet connection. Neither installation requires GitHub Actions. Subsequent runs reuse them.

**What Full checks:** offline single-file HTML build, module registry and asset references, portrait-sensitive and other logic regressions, 300 generated board structures, save/unlock rules, browser smoke and handoff/route checks, Pokémon control interactions, launch/crash fuzzing every registered minigame, and all `tests/broforce-*.mjs` if the branch contains them. On Broforce candidate branches, Full additionally launches the true four-stage browser script (BF-41) and captures Fold/portrait/landscape screenshots using BF-59.

**What Quick checks:** same build, core logic/board/unlock regressions, and browser smoke/name/haptics; does not perform all-game fuzzing or complete Broforce scenario coverage. Quick PASS is not full QA acceptance.

**Actual Samsung Fold touch testing:** browser tests emulate screen sizes, not your exact hardware. You and Amber should still perform a real two-person device check before a release.

## Why local tests differ from the old cloud setup

Older scripts hard-coded Linux `/node-tools`, `/opt/pw-browsers`, and `/tmp/claude-0`. Portable browser-test utilities now prefer local `node_modules/playwright` and installed Chromium on Windows, while preserving the original Linux CI paths. Screenshots are written to `local-test-reports/` instead of Linux-only directories. `tools/check-modules.mjs` uses Windows-safe `fileURLToPath` resolution.

No `.github/workflows` triggers were added or enabled. This doesn't repair GitHub's blocked runners; it bypasses them completely. You can continue working while the cloud usage allotment resets.

## Troubleshooting

- **Node not found:** install the LTS Node installer with npm and reopen the Explorer folder. If you installed only a portable `node.exe`, npm isn't included; obtain the official Node distribution with npm.
- **Playwright install/download fails:** confirm internet access for the initial download; check the installer step log. Retry the double-click. Future runs are offline once Playwright/Chromium are present.
- **One test fails:** the runner continues collecting other test results, records the failing step, and returns an error exit code. Send the `SUMMARY.txt` and relevant `.log` from `local-test-reports/` for a specific code fix. Do not treat screenshot creation alone as proof of gameplay correctness.
- **Need to save the results:** keep a copy of the corresponding report folder. The repo's `.gitignore` keeps these large screenshots and logs out of your commits.
- **GitHub Desktop shows a different branch:** the test runner uses the files from the branch currently checked out. For final Broforce QA, switch to `feature/broforce-wave4-candidate` and pull before running Full. For stable game QA use `TESTver` or `main`.
- **PowerShell script policy:** launch through either included `.cmd` shortcut. It uses PowerShell's `-ExecutionPolicy Bypass` for that one process only, not a system-wide policy change.

Avoid running two launchers in the *same checkout* simultaneously because both build `dist/ShambConkins.html`. No user data is read or written by these test scripts beyond the synthetic browser test profiles.
