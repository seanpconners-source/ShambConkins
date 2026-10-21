# DOOM in ShambConkins

`src/engines/doom.js` runs DOOM and DOOM II on a JS rebuild of the 1993 engine (this folder). The game data comes from a WAD file:

1. **Your own WAD on the phone (best).** In the game: ☰ menu → Options → *USE MY OWN DOOM WAD...* and pick `DOOM.WAD` (or `DOOMU.WAD`) or `DOOM2.WAD` from the phone's files. The file is kept in the browser's storage on that phone only. It is never put in the HTML or the repo. You get the real maps, art, sounds and music.
2. **Your own WAD baked into a private build.** Put `DOOM.WAD` / `DOOM2.WAD` in `assets/doom/user/` before building. That folder is git-ignored. **Never commit a release built this way**: id Software's WADs are copyrighted, and a build made like this has the WAD inside it.
3. **Freedoom (default).** `assets/doom/freedoom.pack.gz` holds Freedoom Phase 1 + 2 (BSD licence, see `assets/doom/FREEDOOM-COPYING.txt`), packed by `tools/doom-pack.mjs` from the official `freedoom-0.13.0.zip`. Freedoom has its own maps, art and music, and follows Doom's rules.

Files: `wad.js` loads WADs, `info.js` holds the thing/state tables (vanilla numbering, DEHACKED applies on top), `render.js` is the renderer, `play.js` + `actions.js` + `spec.js` + `game.js` are the simulation, `hud.js` / `automap.js` / `screens.js` / `video.js` are the 2D screens, `sound.js` / `music.js` (OPL FM synth) are the audio, `heads.js` does the roster faces, and `savegame.js` handles saves.
