// Playback levels for the Sunset Riders files (assets/music/sunset-*), measured with ffmpeg ebur128. Songs and stings: el.volume that
// brings them to -18 LUFS (Genesis rips ~-11.5, SNES ~-16; the first table had these rounded to 0/1, so every Genesis song was silent). Voices: peak to -3 dBFS, so they sit on top of the music.
const SUNSET_GAIN={
 'song-genesis-03-time-to-set-off':0.43,'song-genesis-04-gunfight-at-the-sunset-corral':0.47,'sting-yippie-genesis':0.46,'sting-wanted-genesis':0.48,
 'song-genesis-07-face-with-courage':0.47,'song-genesis-08-its-time-to-pay':0.52,'song-genesis-09-quick-draw':0.48,'song-genesis-10-butch-cassidy-and-sunset-riders':0.48,
 'song-genesis-11-train-stage-2':0.51,'song-genesis-12-ay-chihuahua':0.6,'song-genesis-13-the-rosy-setting-sun':0.53,'song-genesis-14-mountain-stage-2':0.46,
 'song-genesis-15-me-ready-for-pow-wow':0.43,'song-genesis-17-draw-your-gun':0.5,'song-genesis-18-the-great-petal':0.46,'song-genesis-19-the-magnificent-four':0.45,
 'sting-gameover-genesis':0.53,'song-genesis-22-dance-over-night':0.49,'song-genesis-23-the-big-win':0.46,'song-genesis-24-looking-up-at-the-stars':0.57,
 'song-genesis-25-you-and-he-big-trouble':0.48,'song-genesis-26-adios-amigo':0.46,'song-genesis-27-were-gonna-blow-you-away':0.43,'song-snes-01-the-magnificent-four':0.82,
 'song-snes-02-now-the-time-to-depart-has-come':0.72,'sting-wanted-snes':0.86,'song-snes-04-shoot-out-at-the-sunset-ranch':0.89,'song-snes-05-its-time-to-pay':0.87,
 'song-snes-06-i-will-run-and-face-tomorrow':1,'song-snes-07-draw-pilgrim':0.78,'song-snes-08-fight-bravely':0.83,'song-snes-09-were-gonna-blow-you-away':0.75,
 'song-snes-11-you-in-heap-big-trouble':0.65,'song-snes-12-i-dance-to-the-morning':0.68,'song-snes-13-adios-amigo':0.71,'song-snes-14-the-beautiful-setting-sun':0.67,
 'song-snes-15-get-ready-for-a-pow-wow':0.81,'song-snes-16-aye-chihuaha':0.91,'song-snes-18-splendid-flower-petal':0.71,'sting-yippie-snes':0.8,
 'song-snes-20-quick-draw':0.73,'sting-gameover-snes':0.76,'song-snes-23-great-victory':0.76,'voice-bandit-death-1':1.88,
 'voice-player-death':1.88,'voice-female-death':2.24,'voice-boss-death-1':1.64,'voice-boss-death-2':1.57,
 'voice-please-continue':1.04,'voice-bandit-death-2':1.62,'voice-boss-damage':1.36,'voice-sir-richard-laugh':1.05,
 'voice-bandit-death-short':1.88,'voice-player-taunt-1':1.43,'voice-player-taunt-2':1.64,'voice-bandit-death-3':1.88};
Object.assign(exports,{SUNSET_GAIN});
