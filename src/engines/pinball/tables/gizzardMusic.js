// King Gizzard table soundtrack: original garage-psych / krautrock pieces (fast motorik drums, fuzz riffs in the
// phrygian-dominant and harmonic-minor colours the band loves), no borrowed melodies. Riff strings as in
// tables/sabbathMusic.js: one 16-step string per bar of hex semitones above the root ('.' rest, '-' hold), the bass
// doubles the riff (bass:'riff'). Format: src/engines/pinball/music.js.
const MINOR=[0,2,3,5,7,8,10],PHRYG_DOM=[0,1,4,5,7,8,10],HARMONIC=[0,2,3,5,7,8,11],DORIAN=[0,2,3,5,7,9,10],MIXO=[0,2,4,5,7,9,10];
const D=(k,s,h,o)=>({k,s,h,o});
const MOTORIK=D('x...x...x...x...','....x.......x...','x.x.x.x.x.x.x.x.');
const songs={
 attract:{bpm:96,root:40,scale:DORIAN,prog:[0],bass:'riff',riff:['0-------7-------','5-------3---2---'],drums:D(null,null,'x...x...x...x...'),
  arp:{pattern:[0,2,4,7,9,7,4,2],rate:16,oct:2}},
 plunge:{bpm:140,root:40,scale:PHRYG_DOM,prog:[0],bass:'riff',riff:['0.0.0.0.0.0.0.0.','0.0.0.0.1.1.4.4.'],drums:D('x...x...x...x...',null,'..x...x...x...x.')},
 main:{bpm:150,root:40,scale:PHRYG_DOM,prog:[0],bass:'riff',
  riff:['0.0.1.0.4.0.5.4.','0.0.1.0.7.5.4.1.','0.0.1.0.4.0.5.4.','8.7.5.4.1.0.1.4.'],drums:MOTORIK,lead:{seed:71,density:.4,on:'alt',rate:16}},
 nonagon:{bpm:172,root:40,scale:PHRYG_DOM,prog:[0],bass:'riff',riff:['0.1.4.5.7.5.4.1.','0.1.4.5.8.7.5.4.'],
  drums:D('x.x.x.x.x.x.x.x.','....x.......x...','xxxxxxxxxxxxxxxx','..............x.'),lead:{seed:79,density:.55,on:'always',rate:16}},
 banana:{bpm:118,root:42,scale:DORIAN,prog:[0],swing:.3,bass:'riff',riff:['0---3-5-7---5-3-','0---3-5-a---9-7-'],
  drums:D('x.....x...x.....','....x.......x...','x.x.x.x.x.x.x.x.'),arp:{pattern:[0,2,3,5,7,5,3,2],rate:16,oct:2}},
 murder:{bpm:160,root:38,scale:HARMONIC,prog:[0],bass:'riff',riff:['0.0.0.3.2.0.b.0.','0.0.0.3.5.3.2.0.'],
  drums:D('x..x..x.x..x..x.','....x.......x...','x.x.x.x.x.x.x.x.'),lead:{seed:83,density:.5,on:'alt',rate:16}},
 rats:{bpm:184,root:40,scale:MINOR,prog:[0],bass:'riff',riff:['0.0.0.0.3.0.5.0.','0.0.0.0.6.5.3.2.'],
  drums:D('x.x.x.x.x.x.x.x.','....x.......x...','x.x.x.x.x.x.x.x.'),lead:{seed:89,density:.5,on:'alt',rate:16}},
 dragon:{bpm:104,root:38,scale:PHRYG_DOM,prog:[0],bass:'riff',thunder:.15,riff:['0-----1---4-----','5---4---1-------'],
  drums:D('x.......x.x.....','....x.......x...','x...x...x...x...'),lead:{seed:97,density:.35,on:'alt',rate:8}},
 fishies:{bpm:124,root:45,scale:MIXO,prog:[0],swing:.5,bass:'riff',riff:['0---4---7---9---','a---9---7---4---'],
  drums:D('x.....x.x.......','....x.......x...','x.xxx.xxx.xxx.xx'),lead:{seed:101,density:.4,on:'alt',rate:8}},
 rattlesnake:{bpm:176,root:40,scale:PHRYG_DOM,prog:[0],bass:'riff',riff:['0.0.0.1.4.4.1.0.','0.0.0.1.5.4.1.0.','0.0.0.1.4.4.1.0.','7.5.4.1.0.1.4.5.'],
  drums:D('x.x.x.x.x.x.x.x.','....x.......x...','xxxxxxxxxxxxxxxx','..............x.'),lead:{seed:107,density:.55,on:'always',rate:16}},
 omnium:{bpm:144,root:40,scale:PHRYG_DOM,prog:[0],bass:'riff',riff:['0---4---7---8---','7---5---4---1---'],
  drums:D('x...x.x.x...x.x.','....x.......x...','x.x.x.x.x.x.x.x.','..............x.'),lead:{seed:113,density:.5,on:'always',rate:8},arp:{pattern:[0,1,4,7],rate:16,oct:2}},
};
Object.assign(exports,{songs});
