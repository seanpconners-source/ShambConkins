// Playback levels for the Sunset Riders files (assets/music/sunset-*), measured with ffmpeg ebur128. Songs and stings: to -18 LUFS, because
// the Genesis rips are ~5 dB louder than the SNES ones. Voices: peak to -3 dBFS, so they sit on top of the music.
const SUNSET_GAIN={
 'song-genesis-03-time-to-set-off':0,'song-genesis-04-gunfight-at-the-sunset-corral':0,'sting-yippie-genesis':0,'sting-wanted-genesis':0,
 'song-genesis-07-face-with-courage':0,'song-genesis-08-its-time-to-pay':1,'song-genesis-09-quick-draw':0,'song-genesis-10-butch-cassidy-and-sunset-riders':0,
 'song-genesis-11-train-stage-2':1,'song-genesis-12-ay-chihuahua':1,'song-genesis-13-the-rosy-setting-sun':1,'song-genesis-14-mountain-stage-2':0,
 'song-genesis-15-me-ready-for-pow-wow':0,'song-genesis-17-draw-your-gun':0,'song-genesis-18-the-great-petal':0,'song-genesis-19-the-magnificent-four':0,
 'sting-gameover-genesis':1,'song-genesis-22-dance-over-night':0,'song-genesis-23-the-big-win':0,'song-genesis-24-looking-up-at-the-stars':1,
 'song-genesis-25-you-and-he-big-trouble':0,'song-genesis-26-adios-amigo':0,'song-genesis-27-were-gonna-blow-you-away':0,'song-snes-01-the-magnificent-four':1,
 'song-snes-02-now-the-time-to-depart-has-come':1,'sting-wanted-snes':1,'song-snes-04-shoot-out-at-the-sunset-ranch':1,'song-snes-05-its-time-to-pay':1,
 'song-snes-06-i-will-run-and-face-tomorrow':1,'song-snes-07-draw-pilgrim':1,'song-snes-08-fight-bravely':1,'song-snes-09-were-gonna-blow-you-away':1,
 'song-snes-11-you-in-heap-big-trouble':1,'song-snes-12-i-dance-to-the-morning':1,'song-snes-13-adios-amigo':1,'song-snes-14-the-beautiful-setting-sun':1,
 'song-snes-15-get-ready-for-a-pow-wow':1,'song-snes-16-aye-chihuaha':1,'song-snes-18-splendid-flower-petal':1,'sting-yippie-snes':1,
 'song-snes-20-quick-draw':1,'sting-gameover-snes':1,'song-snes-23-great-victory':1,'voice-bandit-death-1':1.88,
 'voice-player-death':1.88,'voice-female-death':2.24,'voice-boss-death-1':1.64,'voice-boss-death-2':1.57,
 'voice-please-continue':1.04,'voice-bandit-death-2':1.62,'voice-boss-damage':1.36,'voice-sir-richard-laugh':1.05,
 'voice-bandit-death-short':1.88,'voice-player-taunt-1':1.43,'voice-player-taunt-2':1.64,'voice-bandit-death-3':1.88};
Object.assign(exports,{SUNSET_GAIN});
