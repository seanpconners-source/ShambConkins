# Third-party credits

- **Freedoom** (Phase 1 and Phase 2, v0.13.0), © 2001–2024 Contributors to the Freedoom project, BSD-3-Clause.
  Bundled as `assets/doom/freedoom.pack.gz` (made with `tools/doom-pack.mjs`) for the DOOM / DOOM II minigames;
  licence text in `assets/doom/FREEDOOM-COPYING.txt`. https://freedoom.github.io
- **cannon-es** 0.20.0 (Hole.it physics), MIT. `src/vendor/cannon.js`.

The Doom engine in `src/engines/doom/` is a JS rebuild modelled closely on the original engine's published source
(id Software, GPL-2.0), so treat that folder as GPL-2.0 if it is ever distributed. DOOM and DOOM II are id Software's; their WADs are never stored in this repo (see `src/engines/doom/README.md`).
