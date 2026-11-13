# Background Picker (roadmap M20)

**Rule (owner, Nov 4): every new or replaced Arcade background goes through this picker before it ships.** Tell the owner
the picker link when new key art is in, wait for them to lock every screen, then apply and release.
All 34 backgrounds are locked on the first 8 screens; the owner's Fold closed and Amber's Samsung (added Nov 3) still need locking.

The owner chooses exactly how every Arcade background (`assets/keyart/<slot>.webp`) is shown on 10 screens
(see the list below): drag to move,
pinch/scroll to zoom, **Lock in**, plus a verdict (perfect / small tweak / needs an edit / remake) and a note.

- Picker page: **https://claude.ai/artifact/DhpZSVr98T1sEwzjux7AJ9** on the owner's main account; sessions on the other account publish to **https://claude.ai/artifact/N1zQ42EPkUqJf8AzpmdmPT** (Nov 13: batch 02 + 4 never-shelved pictures, old files cleared with `null` first) (since Nov 3; the first
  picker, https://claude.ai/artifact/N1zQ42EPkUqJf8AzpmdmPT, belongs to the owner's other account and can't be republished from this one; its locks
  are all in keyPlacements.js already). A publish takes at most 255 files: send the files list in two or three publishes.
  A version holds at most 511 files, so assemble.py leaves out the logo when every screen has the game's captured text
  (which shows the real logo) and skips pictures no Arcade shelf shows (nothing to measure); key art and logos go in as
  lossy previews at the same pixel size (the game's own are lossless, ~1.5 MB each). Files dropped from the set are
  removed in the publish with `null` in the `files` map.
- Its database: collection `bg`, one doc per slot: `{screens:{<screen id>:{z,fx,fy}}, verdict, note, at}`.
  `z` = zoom (1 = the picture just fills the screen), `fx`/`fy` = the point of the picture (fractions) at the screen's centre.
- The game reads `src/data/keyPlacements.js` (`KEY_PLACE`, written by `apply.py`): `lockedPlace()` in `src/arcadeConsole.js`
  uses the locked setting of the nearest of the picker screens (shape first, then size), else its automatic placement.
  A locked picture also gets the picker's shade (clear from the controls down to the tiles / text).
  On a screen that isn't exactly one of the picker's, `mapLock()` moves the nearest locked setting by the LAYOUT, not by the
  screen's centre (Nov 3: on Amber's 360x780 Samsung the faces slid under the text): the faces box keeps its share of the
  width and its gap above the text; less height uses up the room above the faces first, then shrinks them (never below 55%
  of the width ratio); more height is shared out like the room above/below them was. On the locked screen itself it gives
  exactly the locked placement. Screens with the other layout (text beside vs under the picture) are only used as a last resort.
- Screens (12): the owner's Fold open 752x835 and Fold closed 360x840 (+ sideways each, from Add this screen), Amber's
  Samsung 360x780 (+ sideways, read off her screenshot), the guessed Fold closed 344x882, Phone, Phone sideways, Tablet (+
  sideways), Desktop. The game only uses a screen for a picture once it is locked there.
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
   (leaves out pictures already locked on every screen; `--all` keeps them, `--check` adds locked ones whose text covers
   the faces, `--only a,b` picks slots). It also prints which locked pictures have text on the faces. It writes `<scratch>/bgp/picker-files.json`.
4. Read the live picker first (`Artifact` action `read`, url above), then publish `<scratch>/bgp/pub/index.html` with
   `url` = the picker URL, `root` = `<scratch>/bgp/pub` and `files` = the list in `picker-files.json`. It keeps its
   `db` capability (don't pass `capabilities`), so the owner's saved choices stay.
5. When the owner says they've locked some in: `ArtifactData` `list` of collection `bg` with `out_dir` = `<scratch>/bgdump`,
   then `python3 -I tools/bg-picker/apply.py <scratch>/bgdump`, build, spot-check one picture in the game against the
   picker (same screen size), commit, release if asked, and republish the picker (steps 3-4) so finished ones drop out.
   Verdicts and notes ("remake", "needs an edit") are the art to-do list: tell the owner which ones they marked.
6. The owner's own screens: the picker's "Add this screen" button saves the viewer's real screen size (`screen.width x
   screen.height`) to collection `devices` (doc id `<w>x<h>`). To add one: `ArtifactData` `list` of `devices`, add both
   orientations to `screens.json` (an id like `fold7-open` / `fold7-open-land`), copy each picture's setting from the
   nearest old screen into the new screen in KEY_PLACE (so nothing changes until the owner moves it), re-run steps 2-4,
   and tell the owner to check that screen. The game picks the nearest screen, so an exact one wins on that phone.
