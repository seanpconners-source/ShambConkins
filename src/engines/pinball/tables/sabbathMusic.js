// Black Sabbath table soundtrack: original doom-metal pieces (slow, heavy, swung, built on the tritone) with no
// borrowed melodies. Riff-driven: each song's `riff` is one 16-step string per bar of hex semitones above E3
// ('.' rest, '-' hold; 6 = the tritone B♭), the bass doubles it an octave down (bass:'riff'). The attract piece is
// rain, thunder and a tolling bell under a ringing riff. Format: src/engines/pinball/music.js.
const MINOR=[0,2,3,5,7,8,10],PHRYGIAN=[0,1,3,5,7,8,10],BLUES=[0,3,5,6,7,10];
const D=(k,s,h,o)=>({k,s,h,o});
const songs={
 attract:{bpm:58,root:40,scale:MINOR,prog:[0],rain:.9,thunder:.25,bell:'x...............',bellNote:50,riffRing:true,bass:'riff',
  riff:['0---------------','6---------------','5-------3-------','0-------------6-'],drums:D('x...............')},
 plunge:{bpm:96,root:40,scale:MINOR,prog:[0],bass:'riff',riff:['0.0.0.0.0.0.0.0.','0.0.0.0.3.3.5.6.'],drums:D('x...x...x...x...',null,'..x...x...x...x.')},
 main:{bpm:76,root:40,scale:BLUES,prog:[0],swing:.6,bass:'riff',
  riff:['0---0.3-5--6--5.','3-0-----a-8-7-5.','0---0.3-5--6--5.','7---6---5---3-0.'],
  drums:D('x.......x.x.....','....x.......x...','x.x.x.x.x.x.x.x.','..............x.'),lead:{seed:13,density:.35,on:'alt',rate:8}},
 paranoid:{bpm:168,root:40,scale:MINOR,prog:[0],bass:'riff',riff:['5.5.5.5.8.5.a.8.','5.5.5.5.8.5.3.0.'],
  drums:D('x...x...x...x...','....x.......x...','x.x.x.x.x.x.x.x.'),lead:{seed:21,density:.55,on:'always',rate:16}},
 master:{bpm:84,root:40,scale:BLUES,prog:[0],swing:.5,bass:'riff',riff:['0-----3---0-5---','6-5-3-0-------3.'],
  drums:D('x.....x.x.......','....x.......x...','x...x...x...x...'),lead:{seed:27,density:.3,on:'alt',rate:8}},
 supernaut:{bpm:132,root:40,scale:MINOR,prog:[0],bass:'riff',riff:['0.3.0.5.3.0.8.7.','0.3.0.5.3.0.6.5.'],
  drums:D('x..x..x.x..x..x.','....x.......x...','xxxxxxxxxxxxxxxx'),lead:{seed:33,density:.5,on:'alt',rate:16}},
 bloody:{bpm:108,root:40,scale:PHRYGIAN,prog:[0],bass:'riff',riff:['0--b-a-8-7--5-3-','0--b-a-8-7--6-5-'],
  drums:D('x...x.x.x...x.x.','....x.......x...','x.x.x.x.x.x.x.x.','..............x.'),lead:{seed:41,density:.4,on:'alt'}},
 void:{bpm:150,root:40,scale:MINOR,prog:[0],bass:'riff',riff:['0.0.0.3.0.0.5.6.','0.0.0.3.0.0.a.8.'],
  drums:D('x.x.x.x.x.x.x.x.','....x.......x...','x.x.x.x.x.x.x.x.'),arp:{pattern:[0,2,4,7,4,2],rate:16,oct:2}},
 neversaydie:{bpm:178,root:40,scale:MINOR,prog:[0],bass:'riff',riff:['0.0.0.0.5.5.5.5.','3.3.3.3.0.0.0.0.'],
  drums:D('x.x.x.x.x.x.x.x.','....x.......x...','x.x.x.x.x.x.x.x.'),lead:{seed:49,density:.5,on:'alt',rate:16}},
 ironman:{bpm:60,root:40,scale:PHRYGIAN,prog:[0],riffRing:true,bass:'riff',thunder:.12,riff:['0-------3---5---','6-------5---3-0-'],
  drums:D('x.......x.......','........x.......','x...x...x...x...')},
 warpigs:{bpm:88,root:40,scale:BLUES,prog:[0],swing:.6,bass:'riff',riff:['0-----0-3-0---5-','0-----0-3-0-6-5-'],
  drums:D('x..x....x..x....','....x.......x...','x.x.x.x.x.x.x.x.','..............x.'),lead:{seed:57,density:.45,on:'alt',rate:8}},
 wizard:{bpm:120,root:40,scale:MINOR,prog:[0],bass:'riff',riff:['0---3---5---7---','8---7---5---3---'],
  drums:D('x...x.x.x...x.x.','....x.......x...','x.x.x.x.x.x.x.x.','..............x.'),lead:{seed:63,density:.5,on:'always',rate:8},arp:{pattern:[0,2,4,7],rate:16,oct:2}},
};
Object.assign(exports,{songs});
