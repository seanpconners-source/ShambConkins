DROP-IN CHARACTER HEADS
=======================
Put cropped head images here and run `npm run build` (or `npm run release`).
They are embedded in the game automatically. No code changes needed.

  <character-id>.webp                 default portrait   e.g. chuck-norris.webp
  <character-id>.<mood>.webp          mood portrait      e.g. chuck-norris.win.webp
                                      moods: normal win silly angry sad think walk

Formats: .webp .png .jpg. Use a transparent background and crop tight to the head,
like the heads you supplied. ~300-500 px tall is plenty.

Character ids for the v0.44 roster:
  chuck-norris ranger-red ranger-black ranger-blue ranger-yellow ranger-pink mel-gibson
  mk-kitana mk-mileena mk-jax mk-kano mk-shang-tsung mk-reptile mk-shao-kahn mk-kung-lao
  mk-baraka mk-ermac mk-noob-saibot jesus satan bond-64
  nsync-justin nsync-jc nsync-chris nsync-joey nsync-lance
  bsb-nick bsb-aj bsb-howie bsb-brian bsb-kevin tupac bob-marley stevie-wonder
  beatles-john beatles-paul beatles-george beatles-ringo
Run `node tools/list-characters.mjs` for the full id list (all ~490 characters) and
which ones still have no local portrait.
