# Installed app: download only what changed (design, Nov 1 2026)

Status: **built (Nov 1 2026, branch `claude/pwa-split` from TESTver), owner chose "everything at install".** Not released
yet; real phones untested. Measured on the build of TESTver `e5faf6a` (one-file game 200.1 MB):
- app folder: index.html 8.2 MB, a/ 2,430 files 149.8 MB (of which the built-in art script 25.3 MB).
- a code-only update downloads **8.4 MB** (index.html + sw.js 80 KB + manifest/icons), measured by `tests/pwa-update.mjs`;
  a new picture adds just that file. First install ~158 MB (page + every a/ file), once.
- a download stopped at file 400 carried on with the remaining files on the next start (also in `tests/pwa-update.mjs`).
- the one-file `dist/ShambConkins.html` is byte-identical to the old build script's.
- After the first release with this, the website needs nothing new by hand: the release workflow deploys the Worker with
  the files (existing Cloudflare secrets). The first update on a phone from v0.70 is one full download (resumable).

The proposal as approved follows; "Files" below is what was built.

## The problem
The installed app (shambconkins.loki-mylo.work) downloads the whole game as one file on every release: 190.6 MB today
(measured on TESTver `bb85f86`). A release that only changes code still costs 190 MB, and if the app is closed part-way
the download starts again from 0.

What is in that file (measured from the build):

| Part | In the build | Raw files | Changes how often |
|---|---|---|---|
| Character portraits (2,027) | 66.9 MB | ~51 MB | with owner uploads |
| Pro Mancala songs (15) | 60.0 MB | ~45 MB | rarely |
| DOOM (Freedoom pack) | 19.4 MB | 14.5 MB | almost never |
| Pinball + Photo Hunt art, THPS sounds | 11.0 MB | ~8 MB | rarely |
| Built-in art in `art.js` + `faceArt.js` (logos, Sean/Amber faces...) | 25.5 MB | ~19 MB | rarely |
| **Code** (JS, CSS, small SVG art) | **7.9 MB** (≈2.4 MB gzipped) | | **every release** |

So 96% of every update is pictures and sounds that did not change. The extra ~25% is base64 (text encoding of the
files inside the HTML), not quality.

## The idea
Only the installed app (the `--pwa` build) changes. The one-file `ShambConkins_<tag>.html` stays exactly as it is
today (offline, everything inside, same release asset name).

The app build becomes:

```
index.html          ~8 MB   code + CSS + small SVG art (no big pictures or sounds inside)
sw.js               ~150 KB offline cache; lists every file below with its size
a/<hash>.webp|png|jpg|mp3|wav|bin    one file per portrait / song / sound / DOOM pack / pinball / photo hunt picture
a/<hash>.js         ~25 MB  the built-in art of art.js + faceArt.js as one script, loaded before the game's code
manifest.webmanifest, icons/
```

- `<hash>` comes from the file's bytes. The files are **copied byte for byte** from `assets/`: no re-encoding, no
  resizing, nothing changes in quality. Same picture = same name, in every release.
- The service worker keeps these files in a cache shared by all versions. When a new release comes out, it downloads
  the new `index.html` + `sw.js` and only the `a/` files it doesn't have yet.
- A code-only release costs **~8 MB** (index.html; ≈2.4 MB if Cloudflare compresses it, which it normally does).
  A new portrait costs the code + that one picture. New songs cost the code + those songs.
- Downloads **resume**: every file that arrived is kept, so closing the app mid-update loses at most one file.
- Bonus: no base64 for the per-file assets, so a first install is ~145 MB instead of 190 MB.

### Why the built-in art is one script, not separate files
`faceArt.js` holds the starter faces (16 MB) and they are shown inside small SVG frames. A picture inside an SVG that is
shown as an image can't load another file (browsers block it), so these must stay as data URIs. Putting them in one
content-hashed script that runs before the game keeps every piece of code that reads them unchanged. It only
re-downloads when the owner changes built-in art.

## Where the files are served from
Recommended: **Cloudflare Workers static assets**, on the Worker that already runs the site.
- Free: up to 20,000 files per deploy, 25 MB per file (biggest here: DOOM pack, 14.5 MB), and requests for these files
  don't count against the Worker's daily limit.
- Each deploy only uploads files Cloudflare doesn't have yet (it also compares by content).
- Uses the Cloudflare secrets the repository already has (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).

How it is wired:
1. `release-build.yml` (version bump on main): builds as today, then deploys the Worker with the new release's `a/`
   files **plus the previous release's** (from its `_pwa.zip`), so a phone still on the old version keeps working,
   and only then creates the GitHub Release. If the deploy fails, the release isn't published.
2. The release gets one more small asset, the app page (`index.html`, ~8 MB), next to `sw.js` and the manifest it
   already carries. The Worker serves it at `/` and `/index.html`; `/download` and `/v0.x.y` still give the full
   one-file game. Releases without that asset (all older ones) are served as today.
3. `deploy-worker.yml` (Worker code changes) rebuilds the same `a/` set from the latest two releases' zips before it
   deploys, so a Worker-only change never drops the files.

Considered and not chosen:
- Files as GitHub Release assets: GitHub allows 1,000 assets per release (we have ~2,200 files), and the Worker would
  have to fetch each one from GitHub.
- Files fetched straight from the git repo (raw.githubusercontent.com): GitHub rate-limits that hard for Cloudflare's
  shared addresses; a first install is ~2,200 requests.
- Cloudflare R2 storage: works, but needs a payment card on the Cloudflare account even for the free tier.

## Code changes (so every picture/sound still loads)
Portraits, songs, sounds, DOOM, pinball and Photo Hunt values in `USER_PORTRAITS` become short URLs (`a/<hash>.webp`)
in the app build; the one-file build keeps data URIs. Readers checked:

| Reader | Today | Change |
|---|---|---|
| `portraitURL`, `portraitHTML`, board pieces, Pokémon sprites, `s.sprite`, Broforce `headCanvas` | `<img>` / canvas from the value | none: a same-site URL works the same (canvas pixel reads are allowed) |
| `ownMoodURL` (assets.js), Broforce roster (`broforce/roster.js`), `headCutouts.js` | test `^data:image/...` to mean "real raster art" | also accept `a/<hash>.webp|png|jpg` (one small helper) |
| DOOM `wad.js` | decodes the data URI with `atob` | `fetch(url)` when it isn't a data URI |
| Pro Mancala audio (`dropURLs` → `fetch`, songs → `new Audio`), SotN music | fetch / `<audio>` | none; the service worker answers range requests from its cache (iPhone/iPad Safari needs that for songs) |
| `pinball/dropins.js`, `photohunt.js` | `Image` / urls | none |
| `proMancala.js` guest pool | reads the keys only | none |
| Online board `netBoard.js` | turns big data URIs into `sc-art:<key>` | also turn `a/<hash>` URLs into `sc-art:<key>`, so a phone on the app and a phone on the one-file game still see each other's pictures |
| `photo:item:*` / `photo:location:*` (3 tiny files) | data URIs | stay inline |

Also to check while building: nothing saves an asset URL into a save file or run (they save ids), and nothing reads the
built-in art before the art script has run.

## Service worker (sw.js)
- Two caches: `shambconkins-<build>` for index.html / manifest / icons (as today), and `sc-assets` for the `a/` files,
  shared across versions (a name without the `shambconkins-` prefix, so no older sw.js ever deletes it).
- Install: fetch index.html, then every listed `a/` file that isn't cached yet (6 at a time). The existing download bar
  shows bytes still to fetch ("Downloading update · 40%"); a code-only update is just index.html.
- Activate: drop old version caches and `a/` files the new version no longer lists.
- Requests: `a/` from the cache (with byte ranges for audio), else the network (and cache it).
- First update from v0.70 to this: a one-time full download (~145 MB, but resumable). After that, only changes.

## Owner's choice (Nov 1)
Everything is downloaded at install, so the whole game works offline (songs and DOOM included).

## Files
- `tools/build.mjs`: `--pwa` writes index.html (USER_PORTRAITS values `a/<sha256-16>.<ext>`; `"@@asset:...webp|png|jpg@@"`
  strings in the modules (art.js, faceArt.js) become `(globalThis.__SC_ART||[])[n]`, filled by `a/<hash>.js`, a script tag
  before the game's), a/, sw.js (`ASSETS` = [name, bytes] list). The one-file build is unchanged.
- `src/data/userPortraits.js`: `APP_FILE`, `isRasterArt(url)`, `assetBytes(url)` (used by assets.js `ownMoodURL`,
  broforce/roster.js `devilHasArt`, doom/wad.js); `headCutouts.js` `floatingHead` skips `.png` files like PNG data URIs;
  `netBoard.js` packs `a/` names as `sc-art:` refs.
- `cloudflare/worker.js` (`/` = release asset `index.html` when the release has one), `wrangler.toml` `[assets]`,
  `cloudflare/public/_headers`, `tools/worker-assets.sh`, `release-build.yml`, `deploy-worker.yml`.
- Tests: `tests/pwa.mjs`, `tests/pwa-update.mjs` (counts what an update downloads; resume after a failed file);
  `SHAMB_URL=http://localhost:<port>/` makes `tests/lib.mjs` `open()` (and broforce-heads) use a served app folder.
