# Arcade art to make (Nov 11): pinball background, Castlevania old vs new

Same rules as `START-HERE.md`. Paste the style block first, then one prompt per chat. File name = the slot name.

> Arcade key art for a party game app, in a polished painted video-game-box style. Our own designs: no real game
> company logos, no copied characters or screenshots (references to the bands and games are fine as themes). Two hosts
> appear as the heroes: a bearded man (Sean) and a smiling woman with short brown hair (Amber); keep both faces clearly
> visible, facing the viewer, in the upper middle of the picture, never at the very edge. No words except where a logo
> is asked for.

Sizes: **background** 1600x900 (landscape) · **icon** 512x512 (square, clear background or flat #00FF00) ·
**logo** transparent, about 1100 px wide, letters only plus a small emblem.

Every new or replaced background goes through the **Background Picker** before it ships (you lock its placement on each
of your screens). Icons and logos don't need the picker.

---

## 1. Pinball (the group tile: Bucketheadland, Black Sabbath and King Gizzard tables)

Right now the group shows the Bucketheadland backglass. This gives it its own generic pinball picture.

**pinball.png** (background, 1600x900)
> A dim retro arcade at night, three glowing pinball machines side by side, seen at a slight angle so their lit
> backglasses fill the top half. Left machine: a creepy carnival theme with a giant robot, a roller coaster and a masked
> guitarist in a white bucket hat. Middle machine: a heavy-metal theme with an iron giant, war pigs and a stormy doom
> sky. Right machine: a psychedelic theme with a nine-sided spiral, a rattlesnake and a green planet. Chrome rails,
> flippers and a silver ball mid-flight on the nearest playfield, coloured light spilling on the floor. Sean and Amber
> lean on the middle machine, playing, grinning at the viewer. Neon reds, purples and golds. No words on the backglasses.

**pinball-icon.png** (icon, 512x512) *(only if you want a new one)*
> A chrome pinball and two red-and-white flippers bursting out of a glowing backglass frame, sparks and neon light,
> bold and readable at small size. No words.

## 2. Castlevania, the NES-style games (Vampire Killer Dash, Night of the Candles)

These are the classic 8-bit games; they currently borrow the Symphony of the Night picture.

**cv-vampire-killer.png** (background, 1600x900)
> 8-bit retro style key art, like a classic NES box painting brought to life with chunky pixel edges: a castle gate
> at night under a huge moon, bats, torches on stone walls, candles on stands. Sean as a whip-wielding vampire hunter in
> brown leather armour cracking a chain whip, Amber beside him with a holy-water flask and an axe, both facing the
> viewer. A skeleton and a medusa head in the background. Limited palette: deep navy, blood red, bone white, torch
> orange.

**cv-vampire-killer-logo.png** (logo)
> A gothic logo reading "VAMPIRE KILLER DASH" in chunky 8-bit pixel lettering, blood red with a bone-white outline, a
> small crossed whip-and-dagger emblem. Our own lettering, not any real game's logo. Transparent background.

**cv-vampire-killer-icon.png** (icon)
> A pixel-art chain whip coiled around a lit candle on a stand, a bat behind, on a moonlit stone background. No words.

**cv-candle-hunt.png** (background, 1600x900) *(optional: it can share the Vampire Killer picture)*
> The same 8-bit castle style, inside a long corridor lined with tall candelabras: Sean whips a candle open and a heart
> and a dagger fall out, Amber catches them, both grinning at the viewer.

**cv-candle-hunt-logo.png** (logo) *(optional)*
> "NIGHT OF THE CANDLES" in the same 8-bit gothic lettering as Vampire Killer Dash, with a small candle emblem.

## 3. Castlevania · Symphony of the Night (the new, PS1-style game)

**cv-symphony.png** (background, 1600x900)
> Lush gothic painted key art in the style of a late-90s PlayStation box: the marble gallery of a vampire castle,
> stained glass, a red carpet up a grand staircase, Dracula on a throne far behind. Sean as a pale vampire swordsman in a
> long black coat with a red-lined cape and a glowing sword, Amber in a crimson coat with a chain whip, both facing the
> viewer in the middle. Purples, crimson, gold and moonlight.

**cv-symphony-logo.png** (logo)
> An ornate gothic logo reading "SYMPHONY OF THE NIGHT" in tall elegant serif letters, silver with a crimson glow, a
> small bat-and-moon emblem. Our own lettering, not Konami's logo. Transparent background.

**cv-symphony-icon.png** (icon)
> A glowing silver sword crossed with a red-lined black cape over a full moon and stained glass. No words.

---

## Hand-back (for Claude)

Owner uploads to `art-inbox/arcade/` (or attaches in chat). Import with `python3 tools/import-arcade-art.py <folder>`
(backgrounds 1600 lossless, logos trimmed, icons 512), add a KEY_BOX for each background, then the Background Picker
round (tools/bg-picker/README.md) before release.
