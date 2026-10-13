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

## Laptop-safe full-game fuzz (updated October 12, 2026)

The old full test launched three copies of the large inlined game at once and printed only `139 games` until the entire test completed. On some laptops that can exhaust memory, slow Windows to a crawl, and leave no final summary if the terminal is closed.

**The default Full test now checks the whole minigame catalog in 12 successive batches with only ONE browser game context at a time**, fuzzing each for one second. Each batch exits its Chromium browser completely before the next starts to release memory. Progress is printed after every game (e.g., `GAME_PROGRESS 3/12 game-id OK`) and in `local-test-reports/<dated-run>-full/*.log`. If Windows reports less than 3 GB of available RAM before a batch, Full exits early with an explicit **incomplete / low-memory** result instead of trying to overwhelm the computer. Each batch is separately recorded in the summary, so a failure can be traced to a specific group.

The runner also writes `local-test-reports/LATEST-PROGRESS.txt` *before each step*; this file and the per-step logs may remain readable even if a run is interrupted. The final `LATEST-SUMMARY.txt` is only updated when a run reaches the normal finish; do not confuse a previous report with the interrupted run. On the first attempt where Windows slowed down, inspect the **newest date-stamped `-full` folder** for completed numbered `.log` files to find how far it got. You can zip/upload the folder for diagnosis without re-running the test.

The single-browser setting is intentional even on faster machines: reliability and laptop responsiveness matter more than saving a few minutes. **Quick** remains the best default for everyday development and never performs the entire 139-game fuzz test. No GitHub Actions usage is involved.

## Low-impact unattended testing (October 12, 2026)

Double-click **`RUN-BACKGROUND-TESTS.cmd`** in the repository folder before leaving. It starts the **Full** QA checks in a separate **minimized, low-CPU-priority Windows process** and returns control immediately. You may close the original launcher window, but do **not** close the minimized PowerShell test process if you want it to finish.

The `Background` mode runs module/build/core tests first, aborts early on a genuine failure, and then checks the registered minigames **one at a time** in 12 successive Chromium processes. It waits **two seconds between games and ten seconds between browser batches**, checking **at least 4 GB of free RAM** before a batch and before starting each game. If memory gets low, it reports an **incomplete** run and stops rather than overwhelming the computer. It refuses to start another background run when one is already active. Temporary Windows keep-awake is requested while the PowerShell process is working; Windows power plans are **not** modified.

**Unattended laptop precautions:** keep the laptop **plugged in**, with its **lid open** and vents clear. Closing the lid, Windows updates, shutdown, or hibernation can still interrupt testing. A low CPU priority and 4 GB memory guard reduce risk; they cannot guarantee zero slowdown during a browser load. It is entirely okay if a resource-constrained laptop stops early. No GitHub Actions or paid minutes are used.

Check `local-test-reports/LATEST-PROGRESS.txt` while the tests run and `local-test-reports/LATEST-SUMMARY.txt` when finished. Use the date-stamped `*-background` folder for per-test logs and screenshots. An interrupted run may only have progress/logs; `LATEST-SUMMARY.txt` may still reflect an earlier run. You do **not** need to watch the test windows or manually play minigames.

## October 12 background run diagnosis: 14 green + game 12 navigation timeout

The first unattended report (`20261012-194030-background`) passed **14 foundation/browser steps** and **11 of 12 games in shard 1**, then failed on `smb-castle-dash` while Playwright loaded the self-contained game HTML (`page.goto: Timeout 30000ms exceeded`, 0 input clicks). This is **not evidence of a gameplay bug in that minigame**. Each earlier game load took around 20–24 seconds on that laptop, so a sporadic 30-second navigation is plausible even without a JS crash. No later game shards ran.

The fuzz harness now waits for `domcontentloaded` rather than the heavier complete page `load` event, and accepts an optional `SHAMB_NAV_TIMEOUT_MS` (10–120 seconds). The unattended Background launcher sets it to **90 seconds** to tolerate occasional slow parsing under deliberately low CPU priority, while ordinary cloud/CLI invocations retain their 30-second default. Existing 4GB free-RAM guard, one-at-a-time browser contexts, 12 process batches and per-game cooldowns remain in place. If a navigation really takes 90 seconds, the runner will still report a clear **incomplete** failure rather than claim a gameplay pass. No actual device run of this change has been confirmed yet.
