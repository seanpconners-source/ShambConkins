# The Price Is Right: every sound on the two soundboards

Owner, Nov 25: "log all of these so we know we can always go back to them". Both boards were checked sound by sound against
assets/music on Nov 25 2026. **In game** = the file the game ships (assets/music/tpir-<name>.mp3). **Archived** = a copy kept
in assets/originals/music/... (not shipped) for games we haven't built yet. Levels are set in TPIR_GAIN (src/engines/gameshow/stage.js).

## 1. Realm of Darkness: The Price Is Right soundboard

https://www.realmofdarkness.net/sb/tpir/ (the old address /sb/price-is-right/ now gives 404). Files are
https://www.realmofdarkness.net/audio/sfx/gs/tpir/<id>.mp3 (list in /scripts/sb/sfx/gs/tpir/sounds.js + loopSounds.js).
All 54 buttons are in the game under the same name (imported for v0.99.50).

| Section | Button | File id | In game | Used for |
|---|---|---|---|---|
| None | Losing Horn | losing-horn | yes: tpir-losing-horn.mp3 | losses in every pricing game |
| None | Perfect Bid | perfect-bid | yes: tpir-perfect-bid.mp3 | Contestants' Row perfect bid |
| None | Bell | bell | yes: tpir-bell.mp3 | wins |
| None | Ding | ding | yes: tpir-ding.mp3 | right answers |
| None | Winner | winner | yes: tpir-winner.mp3 | winner cue |
| None | Big Winner | big-winner | yes: tpir-big-winner.mp3 | big wins |
| None | Buzzer Overbid | buzzer-overbid | yes: tpir-buzzer-overbid.mp3 | Contestants' Row everybody over |
| None | Buzzer Overbid 2 | buzzer-overbid-2 | yes: tpir-buzzer-overbid-2.mp3 | Contestants' Row |
| None | Buzzer Wrong | buzzer | yes: tpir-buzzer.mp3 | wrong answers |
| None | Buzzer Wrong 2 | buzzer-wrong | yes: tpir-buzzer-wrong.mp3 | available (not wired to a game yet) |
| None | Buzzer and Horn | buzzer-losing-horn | yes: tpir-buzzer-losing-horn.mp3 | over/wrong (stage sfx.over) |
| None | Buzzer and Horn 2 | buzzer-losing-horn-2 | yes: tpir-buzzer-losing-horn-2.mp3 | available (not wired to a game yet) |
| None | Showdown Wheel | wheel-beep | yes: tpir-wheel-beep.mp3 | Big Wheel clicker |
| None | One Away Car Horn | one-away-horn | yes: tpir-one-away-horn.mp3 | available (not wired to a game yet) |
| None | One Away Horn 2 | one-away-horn-2 | yes: tpir-one-away-horn-2.mp3 | available (not wired to a game yet) |
| None | Pathfinder Bell | pathfinder-bell | yes: tpir-pathfinder-bell.mp3 | available (not wired to a game yet) |
| None | Pathfinder Wrong | pathfinder-wrong | yes: tpir-pathfinder-wrong.mp3 | available (not wired to a game yet) |
| None | Siren | siren | yes: tpir-siren.mp3 | available (not wired to a game yet) |
| None | Train | train | yes: tpir-train.mp3 | available (not wired to a game yet) |
| None | Train 2 | train-2 | yes: tpir-train-2.mp3 | available (not wired to a game yet) |
| None | Train 3 | train-3 | yes: tpir-train-3.mp3 | available (not wired to a game yet) |
| None | Tugboat | tugboat | yes: tpir-tugboat.mp3 | available (not wired to a game yet) |
| None | Tugboat 2 | tugboat-2 | yes: tpir-tugboat-2.mp3 | available (not wired to a game yet) |
| None | Tugboat 3 | tugboat-3 | yes: tpir-tugboat-3.mp3 | available (not wired to a game yet) |
| None | Cliff Hangers Crash | cliff-hangers-crash-2 | yes: tpir-cliff-hangers-crash-2.mp3 | Cliff Hangers fall |
| None | Hurdles Gun | hurdles-gun | yes: tpir-hurdles-gun.mp3 | available (not wired to a game yet) |
| None | Gun 2 | hurdles-gun-2 | yes: tpir-hurdles-gun-2.mp3 | available (not wired to a game yet) |
| None | Penny Ante | penny-ante | yes: tpir-penny-ante.mp3 | available (not wired to a game yet) |
| None | Ineligible | ineligible | yes: tpir-ineligible.mp3 | available (not wired to a game yet) |
| Music | Main Theme | theme | yes: tpir-theme.mp3 | TPIR menu + title of every pricing game |
| Music | Come on Down | come-on-down | yes: tpir-come-on-down.mp3 | Contestants' Row call-downs, Plinko |
| Music | Race Game | race-game | yes: tpir-race-game.mp3 | Race Game music |
| Music | Switcharoo | switcharoo | yes: tpir-switcharoo.mp3 | available (not wired to a game yet) |
| Music | Cliff Hangers | cliff-hangers | yes: tpir-cliff-hangers.mp3 | Cliff Hangers yodel while climbing |
| Music | Cliff Hangers Crash | cliff-hangers-crash | yes: tpir-cliff-hangers-crash.mp3 | available (not wired to a game yet) |
| Music | Safe Crackers | safe-crackers | yes: tpir-safe-crackers.mp3 | Safe Crackers music |
| Music | Hurdles | hurdles | yes: tpir-hurdles.mp3 | available (not wired to a game yet) |
| Music | Showcase Showdown | showcase-showdown | yes: tpir-showcase-showdown.mp3 | Big Wheel music bed |
| Music | Showcase | showcase-1 | yes: tpir-showcase-1.mp3 | available (not wired to a game yet) |
| Music | Showcase 2 | showcase-2 | yes: tpir-showcase-2.mp3 | available (not wired to a game yet) |
| Music | Showcase 3 | showcase-3 | yes: tpir-showcase-3.mp3 | available (not wired to a game yet) |
| Music | Showcase 4 | showcase-4 | yes: tpir-showcase-4.mp3 | available (not wired to a game yet) |
| Music | Consolation Prize | consolation-prize | yes: tpir-consolation-prize.mp3 | available (not wired to a game yet) |
| Music | New Car | new-car | yes: tpir-new-car.mp3 | available (not wired to a game yet) |
| Music | Plinko | plinko | yes: tpir-plinko.mp3 | Plinko music bed |
| Music | Barker&#8217;s Bargain Bar | barkers-bargain-bar | yes: tpir-barkers-bargain-bar.mp3 | available (not wired to a game yet) |
| Music | Grand Game | grand-game | yes: tpir-grand-game.mp3 | available (not wired to a game yet) |
| Music | Phone Home Game | phone-home-game | yes: tpir-phone-home-game.mp3 | available (not wired to a game yet) |
| Music | Bumper | bumper | yes: tpir-bumper.mp3 | available (not wired to a game yet) |
| Music | Main Street | main-street | yes: tpir-main-street.mp3 | available (not wired to a game yet) |
| Music | Range Game / Blank Check | range-game | yes: tpir-range-game.mp3 | Range Game (old short cut, fallback) |
| Music | Check Game | check-game | yes: tpir-check-game.mp3 | available (not wired to a game yet) |
| Music | Credit Card | credit-card | yes: tpir-credit-card.mp3 | available (not wired to a game yet) |
| Music | Super Ball | super-ball | yes: tpir-super-ball.mp3 | available (not wired to a game yet) |

Two more files are on that site without a button: `1-a` (4.2 s, a loud musical sting, unlabelled) archived as
assets/originals/music/tpir-realmofdarkness/1-a.mp3, and `1-st` (0.08 s, empty).

## 2. 101soundboards: The Price is Right SFX

https://www.101soundboards.com/boards/33350-the-price-is-right-sfx (files on tank.101soundboards.com; the page's links
carry a signed ?verify= token that expires, so re-open the board page to get fresh ones). All 28 are archived as
assets/originals/music/tpir-101soundboards/<slug>.mp3.

| Sound | Page | Length | In game | Notes |
|---|---|---|---|---|
| Audience applause | https://www.101soundboards.com/sounds/585482 | 10 s | archived only | same as our applause |
| Beep | https://www.101soundboards.com/sounds/611113 | 1 s | archived only | same as wheel-beep |
| Big wheel beeps | https://www.101soundboards.com/sounds/611112 | 3 s | yes: tpir-wheel-dollar.mp3 | Big Wheel: landing on $1.00 |
| Buzzer | https://www.101soundboards.com/sounds/611109 | 2 s | archived only | same as buzzer |
| Buzzer Horn | https://www.101soundboards.com/sounds/611110 | 2 s | archived only | new: for a future game |
| Clangs and whoops | https://www.101soundboards.com/sounds/584755 | 14 s | archived only | new: for a future game |
| Cliffhangers yodel and crash | https://www.101soundboards.com/sounds/584775 | 34 s | archived only | yodel + crash in one (we have them separate) |
| Come on down/IUFB win | https://www.101soundboards.com/sounds/585483 | 49 s | archived only | Come On Down + the It's in the Bag win cue (49 s; ours is 18 s) |
| Ding | https://www.101soundboards.com/sounds/611111 | 2 s | archived only | same as ding |
| Ding ding ding | https://www.101soundboards.com/sounds/584754 | 6 s | yes: tpir-ding-ding-ding.mp3 | Race Game: all four tags right |
| Freeze Frame shutter | https://www.101soundboards.com/sounds/611104 | 2 s | archived only | new: for Freeze Frame (not built) |
| Losing horns 1 | https://www.101soundboards.com/sounds/584769 | 5 s | archived only | same family as losing-horn / buzzer-losing-horn |
| Losing horns 2 | https://www.101soundboards.com/sounds/584770 | 6 s | archived only | same as losing-horn |
| Old train whistle | https://www.101soundboards.com/sounds/611114 | 4 s | archived only | like train / train-2 |
| One Away horn | https://www.101soundboards.com/sounds/611102 | 2 s | archived only | same as one-away-horn |
| Pathfinder dings | https://www.101soundboards.com/sounds/611101 | 4 s | archived only | same as pathfinder-bell |
| Pathfinder zap | https://www.101soundboards.com/sounds/584766 | 2 s | archived only | same as pathfinder-wrong |
| Penny Ante warble | https://www.101soundboards.com/sounds/611103 | 2 s | archived only | same as penny-ante |
| Perfect bid | https://www.101soundboards.com/sounds/584763 | 6 s | archived only | same as perfect-bid |
| Range Game | https://www.101soundboards.com/sounds/662807 | 56 s | yes: tpir-range-game-full.mp3 | Range Game: the full finder music (ours was a 3.9 s cut) |
| Safecrackers door creek/Squeeze Play squeeze | https://www.101soundboards.com/sounds/611105 | 4 s | yes: tpir-safe-creak.mp3 | Safe Crackers door opening (turn start + a win) |
| Safecrackers door slam | https://www.101soundboards.com/sounds/611106 | 4 s | yes: tpir-safe-slam.mp3 | Safe Crackers door shutting (played from 1.2 s so the slam lands as it shuts) |
| Showcase Showdown win cue | https://www.101soundboards.com/sounds/618611 | 14 s | yes: tpir-showcase-win.mp3 | Big Wheel: the winner goes to the Showcase |
| Split Decision timer | https://www.101soundboards.com/sounds/585047 | 23 s | archived only | new: for Split Decision (not built) |
| Train chugs and steam | https://www.101soundboards.com/sounds/611108 | 7 s | archived only | new: for a train game (not built) |
| Tugboat toots | https://www.101soundboards.com/sounds/611107 | 2 s | archived only | same as tugboat |
| Main theme | https://www.101soundboards.com/sounds/593065 | 112 s | archived only | longer version of theme (112 s) |
| Showcase Showdown win cue 2 | https://www.101soundboards.com/sounds/618612 | 79 s | archived only | long version (79 s) of the win cue |

## 3. Our own: generated voices

Bob Barker (host) and Rich Fields (announcer) lines made with fish.audio: `tpir-v-*`, list in src/data/tpirVoice.js,
maker tools/gameshow/tpir-voice.mjs (see assets/music/TPIR-SOUNDS-WANTED.md).
