# Portrait pipeline — preserve the existing user upload workflow

**Owner-facing workflow is unchanged:** add or replace an image in `assets/portraits/` on `main` using the existing GitHub/GitHub Desktop method. Use `<character-id>.png` and `<character-id>.<mood>.png` (existing moods: win, silly, angry, sad, think, walk, normal; old `.mad` is supported as an `angry` alias). Do not require the owner to rename files, convert to WebP, or work in a different directory.

## What the branches mean

- **main:** user-supplied drop-in image originals. Do not delete/replace/optimize them in place.
- **TESTver:** runtime build source. Identical/new originals are synchronized from main, while already processed images remain `assets/portraits/*.webp` with exact PNG source archived under `assets/originals/portraits/`.
- **Broforce candidate:** kept separate; syncing portraits never merges gameplay or alters saved profiles.

On 2026-10-11, 123 new portrait PNGs were copied **bit-identically** from main to TESTver using PR #65. The 77 previously optimized WebP files and their exact original archives were retained. Directory verification counted 415 user image filenames on main with 0 missing from TESTver (338 identical active image files and 77 original/optimized WebP pairs). The current TESTver build embeds all these images; the 123 newly added PNGs remain uncompressed until a successful optimizer run.

## Automated sync and optimization

A narrowly scoped workflow exists on the main branch: `.github/workflows/portrait-main-to-testver.yml`. It reacts **only** to pushes changing `assets/portraits/**` on main (or explicit manual dispatch), checks out TESTver, fetches the latest main image blobs, runs `tools/sync-main-portraits-to-test.py`, and then the existing protected wrapper `tools/run-claude-optimizer-safe.py`. That wrapper runs Claude's original unchanged `tools/optimize-art.py` using **Pillow LANCZOS, 480px longest edge, WebP quality 88, method 6**, archiving originals and preserving existing WebP collisions. The workflow builds the offline HTML and pushes the portrait-only commit to TESTver **without force-push**.

The pipeline never retrieves assets from the internet at game runtime. Each offline build uses the exact portrait files committed on the branch; GitHub-based sync happens **before** a TESTver build, not within the browser.

**Current limitation:** GitHub Actions jobs failed *before runner assignment* in October 2026 (possible account usage/billing restriction; exact reason unverified). The new portrait-only workflow has been installed but not successfully executed. It must not be reported as proven/green until an Actions runner actually executes the job. Newly copied PNGs are available to TESTver builds now even while optimization is pending.

## Safety / recovery

- No broad CI is re-enabled. The generic Development validation/Broforce validation workflows remain manual-only.
- Replacing already-optimized art on main only refreshes TESTver when the source bytes differ from its archived original. If a destination WebP lacks a verifiable archived original, sync fails rather than overwriting it.
- Never merge all of main into TESTver merely to synchronize pictures; that also merges unrelated work.
- Never remove TESTver archived originals unless deliberately replacing the *same* portrait from main. Previous versions remain in Git history.
- If Actions is blocked, continue uploading portraits to main normally. An owner may do a bounded, manual asset-only sync as in PR #65, then run the same local optimizer; do not change the upload process.
