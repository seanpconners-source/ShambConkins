PHOTO HUNT PICTURES (Megatouch Photo Hunt replica, game id megatouch-photohunt)

Each round is a pair: <id>.a.webp + <id>.b.webp + <id>.json (the answer circles).
tools/build.mjs embeds every pair in the game; src/data/photoHuntPairs.js is generated from the .json files.

Adding photos (upload to GitHub, then ask Claude in a session):
  1. Put photos in assets/photohunt/inbox/
       - one plain photo (beach.jpg)          -> 5 differences get made for you
       - a finished pair you edited yourself  -> name them beach.a.jpg + beach.b.jpg
         (same size; the differences are found automatically)
  2. Claude runs the tool, checks each preview, picks good spots by hand, and moves the
     raw uploads to assets/originals/photohunt/.

Tool (python3, needs Pillow + numpy):
  python3 tools/photohunt.py inbox                       # process everything in inbox/ (automatic spots)
  python3 tools/photohunt.py make photo.jpg --id beach --spots "remove@.3,.4,.06;color@.6,.5,.07#d4a017;flip@.8,.7,.05;grow@.4,.3,.05;add@.2,.8,.05<.5,.8"
  python3 tools/photohunt.py import a.jpg b.jpg --id beach
  python3 tools/photohunt.py preview beach               # side-by-side with the answer circles
  python3 tools/photohunt.py index                       # rebuild src/data/photoHuntPairs.js
Spots are x,y,radius in 0..1 of the cropped photo. Photos are cropped to the cabinet's 37:32 window
(--focus x,y picks the crop centre, default .5,.45) and saved at up to 740x640.

Each player gets their own half of the pairs first, then the other half mirrored, then the set repeats
(flipped the other way), so more pairs = fewer repeats (a long game runs 10-15 rounds per player).
The old drawn scenes only appear if there are no photos at all.
Raw uploads are kept in assets/originals/photohunt/ (AI-tool watermarks were painted out before cropping).
Hand-edited pairs (precise edits, screenshot cleanup) come from tools/photohunt_handmade/make.py instead; same output format.
