# BF-59 — Samsung Fold two-human Broforce visual acceptance

**Scope:** Real offline ShambConkins HTML, **four separate minigames** (Jungle, Factory, City Siege, Desert Assault); **one shared simultaneous two-player engine**, not a warp zone. This guide is a manual acceptance procedure, **not a report of a completed phone test**.

## Evidence and preparation

1. Record device model, Android/One UI version, browser and version, date, folded/opened posture, screen-resolution/zoom settings, orientation, battery %, power-saving mode, sound/motion preference, offline status and the **tested Git commit/build artifact**. Use two real people and two hands each where possible. Remove personal notifications before screenshots.
2. Back up existing ShambConkins saves. Launch the actual built single-file HTML using the intended Android launcher in Samsung Internet or the supported production browser. Verify airplane mode / network blocked and actual playable art and sound; a desktop Chromium emulation is **not** a physical Android pass.
3. Launch via the normal board game and select two different existing board characters. Confirm edited display names do not change immutable owner keys: **Sean/P1/left** and **Amber/P2/right**. Also run a **separate arcade/practice** check with no roster progression. Keep board progress and save receipts intact.
4. Capture genuine screenshots/video for each stage: introduction, active fight, devil visibly alive and defeated, helicopter arrival, attempted boarding, outcome and result. If an event cannot be reached by real gameplay, record **NOT OBSERVED**; do not stage a fake screenshot, force game state or mark PASS.

## Geometry and tap targets

| CSS viewport reference | Check both people can see and reach | Pass expectation |
| --- | --- | --- |
| 390×780 portrait | P1 lower-left, P2 lower-right; HUD above, control zones below | No overlap, no cutoff, pause/exit/help tappable; >=44 CSS-px minimum action targets; aim for 48–54 px where feasible |
| 780×390 landscape | P1 left island, P2 right island, clear central firefight corridor | No critical enemy/ledge hidden under opaque UI; safe areas and browser bars do not cover controls |
| 840×700 opened Fold-like | Two independent corner controls; extended scene; effective safe/hinge exclusion | No assumed fixed hinge; resize does not recreate stage or corrupt ownership |
| 1100×700 desktop reference | Canvas, status, pause/exit/help and keyboard bindings | No clipping or keyboard focus leakage; equivalent co-op behavior |

The automated capture harness takes these **browser CSS viewports** as references. Samsung hardware may report different `innerWidth`, `visualViewport`, pixel ratio and safe insets. Measure and note the **actual** values. Test browser toolbar shown/hidden, status/navigation bars, display cutout, gesture bar, edge swipes and fold posture. Inspect the global UI during and after exit to confirm non-Broforce screens are unchanged.

## Two-person pass/fail checklist

For every row, record `PASS`, `FAIL`, `NOT OBSERVED` or `NOT APPLICABLE`, with **stage, viewport/posture, timestamp, screenshot/video filename, exact reproduction** and one sentence explaining the result.

| ID | Both humans execute | Pass condition |
| --- | --- | --- |
| F59-01 | Open each of the 4 minigames from catalog/board | Four distinct registered stages; themed scenery and objectives; no warp-zone transition |
| F59-02 | Inspect P1/P2 names, heads, lives, ammo and touch overlay | Identity recognizable and HUD text >=12 CSS px where measurable; important text contrast ~4.5:1; no clipped icon/label |
| F59-03 | Both drag movement independently, then both jump and hold fire simultaneously | No swap/steal of pointer ownership; release stops both correctly; buttons visibly respond on press |
| F59-04 | Cross fingers over centerline while still holding; lift one and then both | Original owner retains control, no ghost hold, other participant remains responsive |
| F59-05 | Tap **Pause**, **Resume**, **Help**, **Exit → Keep playing** | Every control reachable with a thumb; pause freezes actual gameplay; Help explains controls and extraction; cancel preserves run |
| F59-06 | Tap **Exit → End challenge**, then launch the same stage again | Returns to correct caller, all old overlays/listeners/audio gone, re-entry has exactly one set of controls |
| F59-07 | Rotate portrait ↔ landscape **while both are holding buttons**, then release/re-press | Fresh hit regions, zero stuck movement/fire, no score/seed restart or giant catch-up simulation tick |
| F59-08 | Fold/unfold if device supports it; lock/unlock; background app; return | Auto-pause and input release; resumes only after consent; no frozen black canvas or leaked sound |
| F59-09 | Trigger Android soft keyboard in editable player-name/setup field, dismiss and enter minigame | Keyboard neither blocks mandatory mission buttons nor remains open over game; visual viewport reflows correctly |
| F59-10 | Observe full stage terrain, photo heads, projectiles, enemies and explosions | Four distinct environments, readable continuous platforms and threats; portraits not stretched/blank; no borrowed/stale art |
| F59-11 | Fight the **actual eligible locked devil** until defeated | Devil silhouette/health/telegraph readable; helicopter never accepted as reward trigger before boss defeat |
| F59-12 | After boss, board **only living P1**; in a separate new attempt board **only living P2** | Only respective owner receives exact defeated devil, not a generic/random/shared substitute |
| F59-13 | Separate real attempts: **both board alive**; **neither boards** | Both earn once if eligible; zero-boarder attempt earns nothing; no award for failure, time-out, cancel, arcade/dev |
| F59-14 | Force interruption during/after extraction then reload normally | BF-37 durable receipt recovery grants no duplicate, loss or cross-owner award; board characters/names still unchanged |
| F59-15 | Mute/unmute, toggle reduce-motion, replay dense combat | Distinct sound cues when enabled; mute honored; no excessive screen flash/shake or broken actor/heli silhouette |
| F59-16 | Try folded one-hand grip, unfolded two-human simultaneous play for 5–10 min | No repeated missed action due to bezel/cutout or severe ergonomic strain; record finger reach and discomfort |
| F59-17 | After 10 start/cancel cycles, inspect responsiveness, menus and audio | No duplicated pad or app-crash, no persistent sound/held actions, no increasing pause/exit latency |

**Critical failure:** any inaccessible Exit/Pause; P1/P2 command transfer; inability to enter either action zone; missing/cropped player, boss or helicopter; avatar change persisted to board selection; unauthorized/duplicate rewards; broken recovery; app crash. Treat failure of the physical boarding and receipt cases as an integration blocker, irrespective of visual screenshot success.

## Measurements and evidence file format

- Recommended measurements: CSS viewport + visualViewport (width, height, offset, scale), `devicePixelRatio`, browser zoom, safe-area and optional hinge information, action bounding boxes/hit-testing, canvas pixel and CSS dimensions, mean/effective FPS, p95 frame duration, maximum stall, 5-minute sustained CPU/battery/thermal observations and memory before/after 10 re-entries. Name captures `stage__posture__phase__timestamp.png`.
- **Provisional budget, not validated hardware SLA:** >=30 effective FPS during sustained dense co-op, 95th frame <=50 ms, no >500 ms main-thread stall, stable memory/no persistent audio between sessions. Record failures, device thermal throttling and worst-case explosions. Desktop simulated throttling is suggestive only.
- Automated harness (from full repository checkout with built file and Playwright/Chromium): `node tests/bf59-broforce-viewport-capture.mjs --file dist/ShambConkins.html --out /tmp/bf59-captures --encounter-seconds 90`. Default skips long encounter observation. It attempts real offline HTML and captures `playing`, `pause`, `help`, `exit-confirm`, `reentry`, plus Fold reflow frames. Boss/heli frames are captured **only when observed in actual simulation**, never synthesized. Read `/tmp/bf59-captures/bf59-report.json` for individual results and actual capture paths; copy screenshots privately to QA storage, **not Git**.
- A headless `PASS` verifies only specific assertions it actually ran. Canvas screenshot presence does **not** establish silhouette legibility, real two-human touch feasibility, safe-inset notch support, actual keyboard display, Fold hinge support, full extraction or profile reward authority. Human visual and physical tests are mandatory.

## Issue report template

`Stage / device / browser / orientation / build SHA / preconditions / exact taps and timing / expected / actual / screenshot/video / frequency (N trials) / actual CSS viewport / target boxes / error logs / suspected source file:line (if code-backed) / impact / PASS|FAIL|NOT OBSERVED`.

Only the PM/owning feature worker may change production. BF-59 owns **capture test + this guide + BF-59 log**, not gameplay, shell, CI, registry, or reward rules.
