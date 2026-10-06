// Background music for each level: chiptune/MIDI-style arrangements of PUBLIC-DOMAIN
// melodies (classical, traditional, ragtime) plus a few original grooves.
// Notes: "<note><octave>[:<16ths>]" (e.g. "c#5:4"), "r" = rest, "|" is decoration only.
// Default length of a note is `len` sixteenths. Chords cycle every `cs` sixteenths.
// bass/comp/drums name a style in src/music.js (bass can also be a note string).
const TRACKS={
 // ---- Home / menu ----
 'pub-shuffle':{name:'Paddy’s Pub Shuffle',by:'original',bpm:104,swing:.18,bar:16,lead:'square',leadVol:.8,
  notes:'g4:2 bb4:2 c5 c#5 d5:2 r:2 f5:2 d5:2 c5:2 | bb4:2 g4:2 f4:2 g4:6 r:4 | g4:2 bb4:2 c5 c#5 d5:2 r:2 g5:2 f5:2 d5:2 | f5:2 d5:2 c5:2 d5:6 r:4',
  chords:'G7 C7 G7 D7',cs:16,bass:'walk',comp:'stab',drums:'shuffle'},
 'ode-disco':{name:'Ode to Joy (Disco)',by:'Beethoven',bpm:116,bar:16,lead:'pulse',
  notes:'e5 e5 f5 g5 g5 f5 e5 d5 | c5 c5 d5 e5 e5:3 d5:1 d5:4 | e5 e5 f5 g5 g5 f5 e5 d5 | c5 c5 d5 e5 d5:3 c5:1 c5:4',
  len:2,chords:'C G C G C G C G',cs:8,bass:'octave',comp:'stab',drums:'disco'},
 // ---- Level I: Mind (playful, clever) ----
 'entertainer':{name:'The Entertainer',by:'Scott Joplin',bpm:86,bar:16,lead:'square',
  notes:'d5 d#5 e5 c6:2 e5 c6:2 e5 c6:7 | c6 d6 d#6 e6 c6 d6 e6:2 b5 d6:2 c6:5 | d5 d#5 e5 c6:2 e5 c6:2 e5 c6:7 | a5 g5 f#5 a5 c6 e6:2 d6 c6 a5 d6:6 | d5 d#5 e5 c6:2 e5 c6:2 e5 c6:7 | c6 d6 d#6 e6 c6 d6 e6:2 b5 d6:2 c6:5 | c6 d6 e6 c6 d6 e6:2 c6 d6 c6 e6 c6 d6 e6:2 c6 | e5:2 g5:2 c6:8 r:4',
  chords:'C C G7 C C C D7 G7 C C G7 C C F G7 C',cs:8,bass:'oompah',comp:'stab',drums:'rag'},
 'turkish':{name:'Turkish March',by:'Mozart',bpm:122,bar:8,lead:'pulse',
  notes:'b4 a4 g#4 a4 c5:4 | d5 c5 b4 c5 e5:4 | f5 e5 d#5 e5 b5 a5 g#5 a5 | b5 a5 g#5 a5 c6:4 | a5:2 b5:2 c6:2 b5:2 | a5:2 g#5:2 a5:2 e5:2 | f5:2 d5:2 c5:2 b4:2 | a4:6 r:2',
  chords:'Am Am E Am Am E E Am',cs:8,bass:'oompah',comp:'arp',drums:'march'},
 'fur-elise':{name:'Für Elise (Bouncy)',by:'Beethoven',bpm:132,bar:6,lead:'triangle',leadVol:1.2,
  notes:'e5 d#5 e5 b4 d5 c5 | a4:2 r c4 e4 a4 | b4:2 r e4 g#4 b4 | c5:2 r e4 e5 d#5 | e5 d#5 e5 b4 d5 c5 | a4:2 r c4 e4 a4 | b4:2 r e4 c5 b4 | a4:4 e5 d#5',
  chords:'E Am E Am E Am E Am',cs:6,bass:'waltz',comp:'none',drums:'three'},
 // ---- Level II: Body (driving) ----
 'william-tell':{name:'William Tell Overture (Finale)',by:'Rossini',bpm:150,bar:16,lead:'square',
  notes:'g4 g4 g4:2 g4 g4 g4:2 g4 g4 c5:2 d5:2 e5:2 | g4 g4 g4:2 g4 g4 g4:2 g4 g4 d5:2 c5:2 b4:2 | g4 g4 g4:2 g4 g4 g4:2 g4 g4 c5:2 d5:2 e5:2 | c5 c5 e5:2 c5 c5 g5:2 e5:2 c5:2 g4:4',
  chords:'C G C C',cs:16,bass:'gallop',comp:'stab',drums:'galop'},
 'can-can':{name:'Can-Can (Galop Infernal)',by:'Offenbach',bpm:144,bar:8,lead:'pulse',
  notes:'c5:8 | d5:2 f5:2 e5:2 d5:2 | g5:4 g5:4 | g5:2 a5:2 e5:2 f5:2 | d5:4 d5:4 | d5:2 f5:2 e5:2 d5:2 | c5:2 c6:2 b5:2 a5:2 | g5:2 f5:2 e5:2 d5:2',
  chords:'C G7 C C G7 G7 C G7',cs:8,bass:'oompah',comp:'stab',drums:'galop'},
 'mountain-king':{name:'Hall of the Mountain King (Rock Jam)',by:'Grieg',bpm:138,bar:16,lead:'saw',
  notes:'a4:2 b4:2 c5:2 d5:2 e5:2 c5:2 e5:4 | d#5:2 b4:2 d#5:4 d5:2 bb4:2 d5:4 | a4:2 b4:2 c5:2 d5:2 e5:2 c5:2 e5:2 a5:2 | g5:2 e5:2 c5:2 e5:2 g5:8',
  chords:'Am Am B Bb Am Am C C',cs:8,bass:'drive',comp:'power',drums:'rock'},
 // ---- Level III: Spirit (dramatic, silly) ----
 'habanera':{name:'Habanera',by:'Bizet',bpm:96,bar:8,lead:'saw',leadVol:.8,
  notes:'d5:3 c#5:1 c5:2 c5:2 | b4:3 bb4:1 a4:4 | ab4:3 g4:1 f4:2 f4:2 | e4:2 f4:1 g4:1 f4:2 e4:2 | d5:3 c#5:1 c5:2 c5:2 | b4:3 bb4:1 a4:4 | ab4:3 g4:1 f4:2 e4:2 | d4:6 r:2',
  chords:'Dm Dm A7 A7 Dm Dm A7 Dm',cs:8,bass:'habanera',comp:'pad',drums:'habanera'},
 'valkyries':{name:'Ride of the Valkyries',by:'Wagner',bpm:120,bar:12,lead:'brass',
  notes:'b4:3 f#4:1 b4:2 d5:6 | d5:3 b4:1 d5:2 f#5:6 | f#5:3 d5:1 f#5:2 a5:6 | d5:3 a4:1 d5:2 f#5:6',
  chords:'Bm Bm D D',cs:12,bass:'gallop6',comp:'pad',drums:'six'},
 'morning-mood':{name:'Morning Mood (Lounge)',by:'Grieg',bpm:100,bar:12,lead:'triangle',leadVol:1.2,
  notes:'g5:2 e5:2 d5:2 c5:2 d5:2 e5:2 | g5:2 e5:2 d5:2 c5:2 d5 e5 d5 e5 | g5:2 e5:2 g5:2 a5:2 e5:2 a5:2 | g5:2 e5:2 d5:2 c5:6',
  chords:'C C Fmaj7 C',cs:12,bass:'six',comp:'arp',drums:'sixsoft'},
 // ---- Level IV: Horror ----
 'toccata':{name:'Toccata and Fugue in D minor',by:'J.S. Bach',bpm:140,bar:16,lead:'organ',
  notes:'a5 g5 a5:14 r:16 | g5 f5 e5 d5 c#5:8 d5:20 | a4 g4 a4:14 r:16 | e4:2 f4:2 c#4:4 d4:24 | a3 g3 a3:14 r:16 | g3 f3 e3 d3 c#3:8 d3:20 | c#4 e4 g4 bb4 c#5 e5 g5 bb5 c#6:8 d6:16',
  chords:'A A A7 Dm A A A7 Dm A A A7 Dm C#dim Dm',cs:16,bass:'doom',comp:'pad',drums:'doom'},
 'funeral':{name:'Funeral March (Chopin)',by:'Chopin',bpm:100,bar:16,lead:'organ',
  notes:'bb3:4 bb3:3 bb3:1 bb3:8 | db4:3 c4:1 c4:3 bb3:1 bb3:3 a3:1 bb3:4 | bb4:4 bb4:3 bb4:1 bb4:8 | db5:3 c5:1 c5:3 bb4:1 bb4:3 a4:1 bb4:4',
  chords:'Bbm Bbm F7 Bbm Bbm Bbm F7 Bbm',cs:8,bass:'doom',comp:'power',drums:'doom'},
 'dies-irae':{name:'Dies Irae (Night Shift)',by:'medieval chant',bpm:118,bar:16,lead:'saw',leadVol:.8,
  notes:'f4:2 e4:2 f4:2 d4:2 e4:2 c4:2 d4:4 | f4:2 f4:2 g4:2 f4:2 e4:2 d4:2 c4:2 e4:2 | f5:2 e5:2 f5:2 d5:2 e5:2 c5:2 d5:4 | d5:2 c5:2 d5:2 a4:2 d4:8',
  chords:'Dm C F C Dm C Dm Dm',cs:8,bass:'octave',comp:'arp',drums:'disco'},
 // ---- Warp zones (fast) ----
 'bumblebee':{name:'Flight of the Bumblebee',by:'Rimsky-Korsakov',bpm:160,bar:16,lead:'pulse',leadVol:.8,
  notes:'e5 d#5 d5 c#5 d5 c#5 c5 b4 c5 c#5 d5 d#5 e5 d#5 d5 c#5 | d5 c#5 c5 b4 c5 b4 bb4 a4 bb4 b4 c5 c#5 d5 c#5 c5 b4 | e5 d#5 d5 c#5 c5 f5 e5 d#5 e5 d#5 d5 c#5 c5 c#5 d5 d#5 | e5 d#5 d5 c#5 d5 c#5 c5 b4 c5 c#5 d5 d#5 e5:2 a4:2',
  chords:'Am E7 Am Am',cs:16,bass:'drive',comp:'none',drums:'buzz'},
 'pipe-galop':{name:'Pipe Dream Galop',by:'original',bpm:168,bar:16,lead:'square',
  notes:'c5 e5 g5 c6 g5 e5 c5 e5 g5:2 a5:2 g5:2 e5:2 | f5 a5 c6 f6 c6 a5 f5 a5 c6:2 d6:2 c6:2 a5:2 | g5 b5 d6 g6 d6 b5 g5 b5 d6:2 e6:2 d6:2 b5:2 | c6:2 g5:2 e5:2 g5:2 c6:4 r:4',
  chords:'C F G C',cs:16,bass:'gallop',comp:'stab',drums:'galop'},
 // ---- The Upside Down (wrong turn) ----
 'greensleeves':{name:'Greensleeves (Wrong Side)',by:'traditional',bpm:84,bar:12,lead:'glass',
  notes:'c5:4 d5:2 e5:3 f5:1 e5:2 | d5:4 b4:2 g4:3 a4:1 b4:2 | c5:4 a4:2 a4:3 g#4:1 a4:2 | b4:4 g#4:2 e4:4 a4:2 | c5:4 d5:2 e5:3 f5:1 e5:2 | d5:4 b4:2 g4:3 a4:1 b4:2 | c5:3 b4:1 a4:2 g#4:3 f#4:1 g#4:2 | a4:10 a4:2',
  chords:'Am G Am E Am G E Am',cs:12,bass:'six',comp:'arp',drums:'sixsoft'},
 'wrong-side':{name:'Wrong-Side Signal',by:'original',bpm:96,bar:16,lead:'glass',
  notes:'e5:8 d5:4 c5:4 | b4:12 r:4 | c5:8 d5:4 e5:4 | g5:8 f#5:8',
  chords:'Em C Am B',cs:16,bass:'pulse',comp:'arp',drums:'sparse'}
};
const PLAYLISTS={
 home:['pub-shuffle','ode-disco'],
 mind:['entertainer','turkish','fur-elise'],
 body:['william-tell','can-can','mountain-king'],
 spirit:['habanera','valkyries','morning-mood'],
 horror:['toccata','funeral','dies-irae'],
 warp:['bumblebee','pipe-galop'],
 'upside-down':['greensleeves','wrong-side']
};
// Original metal riffs for the level title cards: [semitones above E2, sixteenths] ('x' = muted chug).
const METAL={
 mind:{bpm:190,riff:'0 0 0 0 3 0 0 5 0 0 3 0 7:2 6:2 | 0 0 0 0 3 0 0 5 0 0 10:2 8:2 7:2'},
 body:{bpm:200,riff:'0 0 x 0 0 x 1:2 0 0 x 0 0 x 5:2 | 0 0 x 0 0 x 1:2 0 0 x 7:2 6:2 5'},
 spirit:{bpm:176,riff:'0:2 0 0 6:2 0 0 5:2 0 0 3:2 1:2 | 0:2 0 0 6:2 0 0 8:2 7:2 6:4'},
 horror:{bpm:210,riff:'0 x 0 x 1 x 0 x 6 x 0 x 1 x 0 x | 0 x 0 x 1 x 0 x 6:2 5:2 4:2 1:2'},
 warp:{bpm:220,riff:'0 0 0 0 12 0 0 0 10 0 0 0 7 0 5 3 | 0 0 0 0 12 0 0 0 10 0 7:2 5:2 3:2'},
 'upside-down':{bpm:168,riff:'0:3 1 0:2 6:2 0:3 1 0:2 5:2 | 0:3 1 0:2 6:2 7:4 6:4'},
 boss:{bpm:230,riff:'0 x 0 x 0 x 1 x 0 x 0 x 6 x 5 x | 0 x 0 x 0 x 1 x 0 x 8:2 7:2 6 x'}
};
Object.assign(exports,{TRACKS,PLAYLISTS,METAL});
