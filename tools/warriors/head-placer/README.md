# Warriors Head Placer

Owner, Nov 24: heads kept landing behind the neck, so the owner now places them himself.

- **Page:** https://claude.ai/artifact/8xWvhr9jMKG5Y6ZkQdxFbp (made from the other account). This account's copy (Nov 24, packed with pack.py, so every pose starts at the spot the game used in v0.99.61): https://claude.ai/artifact/4adgsc6HA8CAQcQcjdSmW2 (db `heads`). Apply locks from whichever copy the owner used. The source is `index.html` plus `data.json`, with the sheets copied as lossy WebP previews into `sheets/`.
- **What the owner does:** drags each pose's head (and can turn or resize it). He can also set "Head behind body", which defaults to on for `win` and `up` because of the raised arm. Lock in saves the pose.
- **Where it's stored:** the page's db collection `heads`, one doc per pose with id `<sheet>--<pose>`:
  `{x, y, a, s, b, locked, at}`
  - `x`, `y`: face middle in cell px.
  - `a`: turn in degrees.
  - `s`: size, where 1 = a 30 px wide face.
  - `b`: drawn behind the body.
- **Default spots:** `data.json` holds the automatic starting spots.
  - `gen.py` makes them: the neck stump from `stump.py`, else the measured neck in `src/data/ddNecks.js`.
  - Hand fixes were then made in `data.json` itself for `win`, `up` and `throw2`. Re-running `gen.py` loses them.

## Apply

1. Run `ArtifactData` `list` on collection `heads` with `query.limit` 1000 and `out_dir` set to `<dump>`.
2. Run `python3 -I tools/warriors/head-placer/apply.py <dump>`. This writes `src/data/ddHeads.js`; every pose gets the owner's spot or the default.
3. Build and check in the game. `drawFighter` in `src/engines/warriorsDD.js` uses `HEADS`.

## Another account (or a fresh copy)
`python3 -I tools/warriors/head-placer/pack.py <out>` packs the page with every pose starting at the spot the game uses now
(src/data/ddHeads.js), so nothing placed is lost. Publish `<out>/index.html` as an artifact with `root` = `<out>`, `files` =
data.json, faces/p1.png, faces/p2.png and every sheets/*.webp, `capabilities` = {"db": {}}. Its db starts empty; locks made
there are applied with apply.py exactly as above (it fills untouched poses from the published data.json = the game's spots).

## New sheet art

1. Run `gen.py <pub>`.
2. Merge `data.json` with care, keeping the hand fixes.
3. Republish the page with the new `sheets/`.
