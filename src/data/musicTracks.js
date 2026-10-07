// Metal riffs for the level title cards. (Board music is generated: src/musicGen.js.)
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
Object.assign(exports,{METAL});
