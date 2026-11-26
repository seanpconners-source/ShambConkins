# Making voice lines for free with fish.audio

How every generated voice line in The Price Is Right games was made (Nov 25, 2026): 127 clips, `assets/music/tpir-v-<key>-<n>.mp3`.
They cost nothing because they use fish.audio's **free model**, `s2.1-pro-free`. This page has everything a new Claude account,
session or person needs to make more.

## What you need

1. **A fish.audio account** (free): sign up at https://fish.audio.
2. **An API key**: fish.audio → your profile → **API Keys** (https://fish.audio/app/api-keys/) → *Create*. Copy it. It's a long string of
   letters and numbers. **Never put it in the repo, a commit, a file or a chat message.**
3. **A voice model id** for each voice. Open the voice's page and take the id from the address:
   `https://fish.audio/m/ee1f42380e6643059268337f63986907/` → `ee1f42380e6643059268337f63986907`.
   The ones we use (also in `VOICE_MODELS` in `src/data/tpirVoice.js`):
   - `bob` = Bob Barker: `ee1f42380e6643059268337f63986907`
   - `rich` = Rich Fields (TPIR announcer 2007-2010): `936d41f63e424e08bd4bcd1ff8523da4`
4. **ffmpeg** on the PATH (the script trims and levels every clip). It's already in the cloud container.
5. **Node 22+** (for `fetch`).

## The one request that matters

```
curl https://api.fish.audio/v1/tts \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "model: s2.1-pro-free" \
  -d '{"text":"Come on down!","reference_id":"936d41f63e424e08bd4bcd1ff8523da4","format":"mp3","mp3_bitrate":192,"normalize":true,"latency":"normal","temperature":0.75,"top_p":0.75}' \
  -o test.mp3
```

- The **`model: s2.1-pro-free` header** is what makes it free. Leave it out and fish.audio uses a paid model and bills your credits
  (or answers 402 when you have none).
- `reference_id` = the voice model id.
- The answer is the MP3 itself (`Content-Type: audio/mpeg`). An error comes back as JSON text: 401 = wrong/missing key,
  402 = the request would cost money (check the `model` header), 429 = slow down (the script waits and retries).

## Making the game's lines

All lines live in `src/data/tpirVoice.js`, one row each:

```
[key, voice ('bob'|'rich'), text that is spoken, bubble match (exact bubble text | RegExp | null), game kinds ('*' or list), takes]
```

The script makes every take that isn't there yet:

```
node tools/gameshow/tpir-voice.mjs              # make all missing clips
node tools/gameshow/tpir-voice.mjs --dry        # only list what it would make
node tools/gameshow/tpir-voice.mjs --only=safe- # only keys matching a regex
node tools/gameshow/tpir-voice.mjs --only=^its-vespa --force   # remake these even if they exist
```

It writes `assets/music/tpir-v-<key>-<n>.mp3`, trims silence at both ends, levels to -16 LUFS (ffmpeg loudnorm), mono 44.1 kHz
128 kbps. Product names that the voice reads badly are respelled in `say()` at the top of the script (Bike+ → "Bike Plus",
HERO13 → "Hero thirteen", ...): add to it when a new name comes out wrong. Listen to new clips before committing; remake a bad
take with `--only=<key> --force`. The game picks the clip up with no other step (stage.js `voice()`/`speak()`; a real show
recording `tpir-<key>.mp3` always wins over a generated one).

### Running it on your own computer

```
FISH_API_KEY=your-key node tools/gameshow/tpir-voice.mjs        # mac/linux
set FISH_API_KEY=your-key && node tools\gameshow\tpir-voice.mjs # windows cmd
```

### Running it in a Claude Code cloud session (what Claude did)

A cloud container can't reach fish.audio until its environment allows it, and the key must not be typed into the session.
Each Claude account and each cloud environment needs this once:

1. **Allow the hosts.** Ask the environment tools (Claude: `get_environment`, then `update_environment` with
   `add_allowed_hosts: ["fish.audio","api.fish.audio","docs.fish.audio"]`). The owner approves the prompt.
   Or by hand: claude.ai/code → the environment's settings → Network → add those three hosts.
2. **Save the key as a network secret.** Claude calls `request_credential` with `host: "api.fish.audio"`, `suggested_type: "bearer"`.
   A secure form pops up: paste the key **there** (not in chat). The network proxy then adds `Authorization: Bearer <key>` to every
   request to api.fish.audio by itself. Claude never sees the key. (Settings → the environment → network secrets works too.)
3. **Run the script through the proxy:**
   ```
   NODE_USE_ENV_PROXY=1 node tools/gameshow/tpir-voice.mjs
   ```
   Node's `fetch` ignores the container's proxy without `NODE_USE_ENV_PROXY=1` (you get `ENOTFOUND api.fish.audio`). With no
   `FISH_API_KEY` set the script sends `Bearer proxy-injected`; the proxy replaces it with the saved key.

Things that went wrong the first time, and the fix:
- **401 "Invalid Token"**: the wrong text was saved as the secret. Run `request_credential` again and paste the real key in the form.
  The proxy can take up to a minute to pick up a new key.
- **`ENOTFOUND` / connection refused**: hosts not allowed yet, or `NODE_USE_ENV_PROXY=1` missing.
- **Claude's WebFetch / web-fetch agent can't read fish.audio** even after the hosts are allowed (it runs outside the container).
  Use `curl` inside the container instead.
- **402**: the `model: s2.1-pro-free` header was missing.
- A different Claude account doesn't share the first account's environment: do steps 1-2 again there.

Quick check that the setup works (in the cloud, no key needed in the command):

```
curl -s -o /tmp/t.mp3 -w "%{http_code} %{content_type}\n" https://api.fish.audio/v1/tts \
  -H "Authorization: Bearer proxy-injected" -H "Content-Type: application/json" -H "model: s2.1-pro-free" \
  -d '{"text":"Hello","reference_id":"ee1f42380e6643059268337f63986907","format":"mp3"}'
```

`200 audio/mpeg` = ready.

## Using it for other games

Nothing in the tool is TPIR-only except the line list. For another game: copy `tools/gameshow/tpir-voice.mjs`, point it at a new
line list with the same row shape (or a plain `[key, voiceId, text]` list), and pick the voice on fish.audio (search the site,
open the voice, take the id from the address). Keep the file names as `<game>-v-<key>-<n>.mp3` in `assets/music/` and add the
prefix to the game's `LATER` list in `src/pwa.js` if it should download on first open.
