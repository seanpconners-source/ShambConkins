# Background Picker (roadmap M20)

**Rule (owner, Nov 4): every new or replaced Arcade background goes through this picker before it ships.** Tell the owner
the picker link when new key art is in, wait for them to lock every screen, then apply and release.
All 34 backgrounds of v0.80.5 are locked; the picker shows an "all done" page until new ones are added.

The owner chooses exactly how every Arcade background (`assets/keyart/<slot>.webp`) is shown on 8 common screens
(Fold closed, Phone, Phone sideways, Fold open, Fold open sideways, Tablet, Tablet sideways, Desktop): drag to move,
pinch/scroll to zoom, **Lock in**, plus a verdict (perfect / small tweak / needs an edit / remake) and a note.

- Picker page (always republish to this same URL): **https://claude.ai/artifact/N1zQ42EPkUqJf8AzpmdmPT**
- Its database: collection `bg`, one doc per slot: `{screens:{<screen id>:{z,fx,fy}}, verdict, note, at}`.
  `z` = zoom (1 = the picture just fills the screen), `fx`/`fy` = the point of the picture (fractions) at the screen's centre.
- The game reads `src/data/keyPlacements.js` (`KEY_PLACE`, written by `apply.py`): `lockedPlace()` in `src/arcadeConsole.js`
  uses the locked setting of the nearest of the 8 screens (shape first, then size), else its automatic placement.
  A locked picture also gets the picker's shade (clear from the controls down to the tiles / text).
- Previews are exact (Nov 4 fix): `measure.mjs` captures the game's REAL hero text block (logo, chips, rules, buttons) for
  every picture on every screen, from the Featured shelf the Arcade opens on and from the All list, as see-through PNGs;
  the picker draws those instead of a stand-in, and tags a screen "Text on faces N%" when that text covers the faces box.
  (The first picker drew a small fake logo, so the real logo covered Amber on Hangman.) Never go back to a mock text block.
- Screens are listed once in `screens.json` (picker, measuring and the game's `KEY_SCREENS` all come from it).

## When the owner adds new backgrounds (or says "picker")

1. New key art needs a faces box first: add `<slot>:[x0,y0,x1,y1]` (fractions, tight round Sean's and Amber's faces)
   to `KEY_BOX` in `src/arcadeConsole.js`. Check it with a contact sheet of the boxes drawn on the pictures.
2. Build and serve the installable app, then measure (about 1-2 minutes per screen; run it in the background):
   ```
   node tools/build.mjs --pwa <scratch>/app
   node tools/serve-static.mjs <scratch>/app 8123 &
   SHAMB_URL=http://localhost:8123/ OUT=<scratch>/bgp node tools/bg-picker/measure.mjs
   ```
   (`measure.mjs phone fold-open` re-measures only those screens.) It writes `measure.json` + `overlay-<screen>.png`.
3. Build the page: `python3 -I tools/bg-picker/assemble.py <scratch>/bgp <scratch>/bgp/pub`
   (leaves out pictures already locked on all 8 screens; `--all` keeps them, `--check` adds locked ones whose text covers
   the faces, `--only a,b` picks slots). It also prints which locked pictures have text on the faces. It writes `<scratch>/bgp/picker-files.json`.
4. Read the live picker first (`Artifact` action `read`, url above), then publish `<scratch>/bgp/pub/index.html` with
   `url` = the picker URL, `root` = `<scratch>/bgp/pub` and `files` = the list in `picker-files.json`. It keeps its
   `db` capability (don't pass `capabilities`), so the owner's saved choices stay.
5. When the owner says they've locked some in: `ArtifactData` `list` of collection `bg` with `out_dir` = `<scratch>/bgdump`,
   then `python3 -I tools/bg-picker/apply.py <scratch>/bgdump`, build, spot-check one picture in the game against the
   picker (same screen size), commit, release if asked, and republish the picker (steps 3-4) so finished ones drop out.
   Verdicts and notes ("remake", "needs an edit") are the art to-do list: tell the owner which ones they marked.
