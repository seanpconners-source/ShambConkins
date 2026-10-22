// Bucketheadland soundtrack: original songs in a Buckethead-ish mix of funk-metal riffing, shred leads and clean
// arpeggios (no borrowed melodies). One song per game state; rules.music(m) picks it. Format: src/engines/pinball/music.js.
// root = MIDI note of the key on the bass (40 = E2); prog = scale degree per bar; 16-step patterns per bar:
// drums k/s/h/o/t ('x' hit, t: 'h'/'l' toms); bass 'x' root, '5' fifth, 'o' octave, '-' hold; gtr 'x' palm-muted chug,
// 'O' open chord, '-' hold. lead.on: 'alt' (every other pass), 'always', 'never'.
const MINOR=[0,2,3,5,7,8,10],DORIAN=[0,2,3,5,7,9,10],MIXO=[0,2,4,5,7,9,10],MAJOR=[0,2,4,5,7,9,11],LYDIAN=[0,2,4,6,7,9,11],
 PHRYGIAN=[0,1,3,5,7,8,10],HARMONIC=[0,2,3,5,7,8,11],PENTA=[0,3,5,7,10];
const songs={
 attract:{bpm:92,root:40,scale:DORIAN,prog:[0,0,3,4],drums:{h:'x...x...x...x...'},bass:'x-------x-------',
  arp:{pattern:[0,2,4,7,4,2],rate:16,oct:1},lead:{seed:11,on:'never'}},
 plunge:{bpm:112,root:40,scale:MINOR,prog:[0],drums:{k:'x...x...x...x...',h:'..x...x...x...x.'},bass:'x.x.x.x.x.x.x.x.',gtr:'x...x...x...x.x.'},
 main:{bpm:118,root:40,scale:MINOR,prog:[0,0,5,6],
  drums:{k:'x..x..x...x.x...',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},
  bass:'x..x..x.o.x.x..5',gtr:'x..x..x...x.x...',lead:{seed:3,density:.42,on:'alt'}},
 coaster:{bpm:152,root:45,scale:MIXO,prog:[0,4,6,3],
  drums:{k:'x...x...x...x...',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',o:'..............x.'},
  bass:'x.x.x.x.x.x.x.x.',gtr:'O-------O---x.x.',lead:{seed:21,density:.5,on:'always',rate:8}},
 nunchuck:{bpm:132,root:42,scale:PENTA,prog:[0,0,2,3],
  drums:{k:'x.....x.x.......',s:'....x..x....x...',h:'xxxxxxxxxxxxxxxx',t:'..........h.l.l.'},
  bass:'x.xx.x.xx.x..x.x',gtr:'x.x...x.x.x.....',lead:{seed:33,density:.55,on:'always',rate:16}},
 bigsur:{bpm:80,root:38,scale:LYDIAN,prog:[0,1,0,4],drums:{k:'x.......x.......',h:'..x...x...x...x.'},
  bass:'x-------5-------',arp:{pattern:[0,4,7,9,11,7],rate:16,oct:1},lead:{seed:44,density:.28,on:'alt',type:'triangle',rate:8}},
 soothsayer:{bpm:96,root:40,scale:HARMONIC,prog:[0,3,4,0],
  drums:{k:'x.........x.....',s:'........x.......',h:'x...x...x...x...'},
  bass:'x-----x-5-------',gtr:'O-----------x.x.',lead:{seed:55,density:.35,on:'always',rate:8}},
 coop:{bpm:124,root:43,scale:MIXO,prog:[0,3,0,4],
  drums:{k:'x...x...x...x...',s:'....x.......x...',h:'.x.x.x.x.x.x.x.x'},
  bass:'x...5...x...5...',gtr:'.x.x.x.x.x.x.x.x',lead:{seed:66,density:.6,on:'alt',rate:16}},
 battle:{bpm:140,root:40,scale:PHRYGIAN,prog:[0,1,0,6],
  drums:{k:'xx.xxx.xxx.xxx.x',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},
  bass:'xxxxxxxxxxxxxxxx',gtr:'xxx.xxx.xx.xxx.O',lead:{seed:77,density:.45,on:'alt'}},
 jordan:{bpm:160,root:40,scale:MINOR,prog:[0,5,3,4],
  drums:{k:'x.x.x.x.x.x.x.x.',s:'....x.......x...',h:'xxxxxxxxxxxxxxxx',o:'x...............'},
  bass:'x.x.x.x.o.o.x.x.',gtr:'x.x.x.x.x.x.O---',arp:{pattern:[0,2,4,7,9,7,4,2],rate:16,oct:2},lead:{seed:88,density:.6,on:'alt',rate:16}},
 wizard:{bpm:146,root:40,scale:MAJOR,prog:[0,4,5,3],
  drums:{k:'x...x.x.x...x.x.',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.',o:'..............x.'},
  bass:'x.x.x.x.x.x.x.x.',gtr:'O-------O-------',lead:{seed:99,density:.5,on:'always',rate:8}},
};
Object.assign(exports,{songs});
