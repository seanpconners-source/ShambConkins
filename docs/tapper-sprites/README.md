# Banana Stand Tapper art (assets/tapper)

Slots, sizes and anchors live in `src/data/tapperSprites.js` (SHEETS, PICTURES, LEVELS). Templates: `node tools/tapper-templates.mjs`
→ `templates/` (`--only=a,b` for a few). Brief for the image model: `GPT-SPRITE-BRIEF.md`.

Import: save each delivered picture as `assets/tapper/<name>.webp` (lossless; `python3 tools/optimize-art.py` style, or
PIL `save(..., lossless=True)`), originals in `assets/originals/tapper/`. Build → `USER_PORTRAITS['tapper:<name>']`; the game
draws the drawn stand-in for every slot that's missing, so pictures can come one at a time. Pictures may be 1x, 2x or 4x
the template size (the game scales by width/height). The whole set downloads the first time the game opens (pwa.js LATER
'tapper:').

Levels: stand (Bluth's Original Frozen Banana), penthouse (Balboa Towers), modelhome (Sudden Valley). A new level = a new
LEVELS row + its slots; the game cycles through LEVELS in order.

Music/narrator: assets/music/tapper-song-<level>.mp3 / tapper-song[-n].mp3, tapper-narr-<moment>-<n>.mp3 (start, level,
clear, lose, win, end, any). Engine: src/engines/tapperAudio.js.
