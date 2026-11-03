# Arcade tile art (drop-in)

The Arcade (src/arcadeConsole.js) shows each game as a tile with a character cut out and a glowing outline.
Drop a picture here to choose the art yourself:

- `assets/tiles/<game id>.webp` (or .png / .jpg / .svg) for one game, e.g. `paddys-hole.webp`
- `assets/tiles/<family key>.webp` for a family tile (several versions under one tile), e.g. `trivia.webp`, `casino.webp`
  (family keys are the first item of each row in `FAMILIES` in src/arcadeConsole.js)

A cut-out with a clear (transparent) background looks best: it gets the same glowing outline as the character art.
About 480 px tall is plenty; `python3 tools/optimize-art.py` shrinks big pictures. Games without art show their icon.
