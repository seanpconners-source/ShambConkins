// Generative board score. A STYLE (per level, warp board or the title screen) sets the
// groove, harmony, tempo and band; the BIOME of the landmark nearest the current player
// colours it (lead instrument, mode, ambience, extra percussion). Every piece is original
// and seeded, so the same scene always plays the same tune. Synthesis lives in src/music.js.
const {seededRandom}=require("src/utils.js");

const QUAL={M:[0,4,7],m:[0,3,7],'5':[0,7,12],maj7:[0,4,7,11],maj9:[0,4,7,11,14],m7:[0,3,7,10],m9:[0,3,7,10,14],m11:[0,3,7,10,14,17],
 '7':[0,4,7,10],'9':[0,4,7,10,14],'13':[0,4,10,14,21],'7b9':[0,4,7,10,13],add9:[0,4,7,14],sus:[0,5,7,10],sus2:[0,2,7],m7b5:[0,3,6,10],'6':[0,4,7,9],m6:[0,3,7,9],dim:[0,3,6,9]};
// "root.quality" with root in semitones above the key, e.g. "9.m9".
const chord=s=>{const [r,q]=String(s).split('.');return {root:+r,q:q||'M',tones:QUAL[q||'M']||QUAL.M};};
const prog=s=>s.split(/\s+/).filter(Boolean).map(chord);
const SCALES={major:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11],mixo:[0,2,4,5,7,9,10],dorian:[0,2,3,5,7,9,10],minor:[0,2,3,5,7,8,10],
 harmonic:[0,2,3,5,7,8,11],phrygdom:[0,1,4,5,7,8,10],locrian:[0,1,3,5,6,8,10],pentmaj:[0,2,4,7,9],pentmin:[0,3,5,7,10]};

// bank: {scale, A, B}. cs = sixteenths per chord. lead: default lead voice, center: lead register (MIDI).
const STYLES={
 home:{genre:'Lo-fi',name:'Title Lounge',bpm:78,swing:.12,key:5,cs:16,gain:1,
  bright:{scale:'major',A:'2.m9 7.13 0.maj9 9.m7',B:'5.maj9 4.m7 2.m9 7.sus'},dark:{scale:'dorian',A:'0.m9 5.9 0.m9 5.9',B:'3.maj7 2.m7 0.m9 10.6'},
  chordInst:'epiano',comp:'lofi',bass:'lofi',bassInst:'sub',pad:null,kit:'boombap',lead:'vibes',center:72,density:'sparse',amb:'vinyl'},
 mind:{genre:'Study Jazz',label:'Mind',bpm:90,swing:.1,key:2,cs:16,gain:1,
  bright:{scale:'major',A:'0.maj9 9.m9 2.m9 7.13',B:'4.m7 9.m9 2.m9 7.7b9'},dark:{scale:'dorian',A:'0.m9 5.9 0.m9 5.9',B:'3.maj7 2.m7 0.m9 5.9'},
  chordInst:'epiano',comp:'bossa',bass:'walk',bassInst:'upright',pad:null,kit:'brush',lead:'vibes',center:74,density:'mid',amb:null},
 body:{genre:'Nu-Disco',label:'Body',bpm:112,swing:0,key:9,cs:16,gain:1.15,duck:true,
  bright:{scale:'major',A:'5.maj9 7.9 4.m7 9.m9',B:'2.m9 7.9 0.maj9 9.m9'},dark:{scale:'dorian',A:'0.m9 5.9 0.m9 5.9',B:'3.maj7 5.9 7.m7 10.maj7'},
  chordInst:'clav',comp:'stabs',bass:'funk',bassInst:'slap',pad:'warm',kit:'disco',lead:'synth',center:76,density:'mid',amb:null},
 spirit:{genre:'Dream Pop',label:'Spirit',bpm:70,swing:0,key:7,cs:32,gain:1.25,
  bright:{scale:'lydian',A:'0.maj9 2.add9 0.maj9 2.add9',B:'9.m9 4.m7 5.maj9 7.sus'},dark:{scale:'minor',A:'0.m9 8.maj7 3.maj9 10.add9',B:'5.m9 8.maj7 10.6 7.sus'},
  chordInst:'harp',comp:'arpUp',bass:'sustain',bassInst:'sub',pad:'choir',kit:'downtempo',lead:'flute',center:74,density:'sparse',amb:'shimmer'},
 'upside-down':{genre:'Darkwave',label:'Upside Down',bpm:84,swing:0,key:4,cs:16,gain:2,duck:true,
  bright:{scale:'minor',A:'0.m 0.m 8.maj7 8.maj7',B:'5.m 8.M 10.M 7.m'},dark:{scale:'minor',A:'0.m 0.m 8.maj7 8.maj7',B:'5.m 8.M 10.M 7.m'},
  chordInst:'arpSaw',comp:'arp16',bass:'pulse8',bassInst:'synthBass',pad:'warm',kit:'synthwave',lead:'synth',center:72,density:'sparse',amb:'rumble'},
 horror:{genre:'Hardcore Horror',bpm:180,swing:0,key:4,cs:16,gain:0.55,hardcore:true,
  bright:{scale:'locrian',A:'0.5 1.5 0.5 6.5',B:'0.5 3.5 1.5 6.5'},dark:{scale:'locrian',A:'0.5 1.5 0.5 6.5',B:'0.5 3.5 1.5 6.5'},
  chordInst:'power',comp:'chug',bass:'gabber',bassInst:'distBass',pad:null,kit:'hardcore',lead:'scream',center:76,density:'busy',amb:'siren'},
 // Warp boards (one style each)
 'rainbow-road':{genre:'Space Synthpop',bpm:128,swing:0,key:1,cs:16,gain:.9,duck:true,
  bright:{scale:'major',A:'9.m7 5.maj7 7.M 0.add9',B:'2.m7 7.M 4.m7 9.m'},chordInst:'pluck',comp:'arp16',bass:'octave',bassInst:'synthBass',pad:'glass',kit:'disco',lead:'synth',center:76,density:'mid',amb:'shimmer'},
 'candy-land':{genre:'Sugar Pop',bpm:104,swing:.06,key:0,cs:16,gain:1,
  bright:{scale:'major',A:'0.add9 5.maj7 9.m7 7.sus',B:'5.maj7 7.M 4.m7 9.m7'},chordInst:'marimba',comp:'bounce',bass:'bounce',bassInst:'sub',pad:null,kit:'pop',lead:'toypiano',center:79,density:'mid',amb:null},
 chutes:{genre:'Ukulele Skip',bpm:100,swing:.08,key:7,cs:16,gain:1.2,
  bright:{scale:'major',A:'0.M 7.M 9.m 5.M',B:'5.M 0.M 2.m7 7.M'},chordInst:'pluck',comp:'strum',bass:'bounce',bassInst:'upright',pad:null,kit:'pop',lead:'whistle',center:79,density:'mid',amb:'birds'},
 monopoly:{genre:'Lounge Swing',bpm:124,swing:0,swing8:.32,key:5,cs:16,gain:1,
  bright:{scale:'major',A:'0.6 9.m7 2.m7 7.7',B:'4.m7 9.7 2.m7 7.13'},chordInst:'epiano',comp:'charleston',bass:'walk',bassInst:'upright',pad:null,kit:'swing',lead:'mutedTrumpet',center:72,density:'mid',amb:null},
 'mario-world':{genre:'Island Calypso',bpm:112,swing:.05,key:0,cs:16,gain:1,
  bright:{scale:'major',A:'0.M 5.M 7.M 0.M',B:'9.m 5.M 7.7 0.M'},chordInst:'marimba',comp:'calypso',bass:'calypso',bassInst:'sub',pad:null,kit:'calypso',lead:'steel',center:76,density:'mid',amb:'waves'},
 clue:{genre:'Noir Jazz',bpm:76,swing:0,swing8:.3,key:2,cs:16,gain:1.4,
  bright:{scale:'harmonic',A:'0.m9 0.m9 5.m9 7.7b9',B:'8.maj7 7.7b9 0.m9 7.7b9'},chordInst:'epiano',comp:'noir',bass:'walk',bassInst:'upright',pad:null,kit:'brush',lead:'mutedTrumpet',center:70,density:'sparse',amb:'rain'},
 hyrule:{genre:'Field Folk',bpm:96,swing:0,key:2,cs:16,gain:1,
  bright:{scale:'dorian',A:'0.m 10.M 0.m 10.M',B:'3.M 10.M 5.M 0.m'},chordInst:'harp',comp:'arpUp',bass:'sustain',bassInst:'sub',pad:'strings',kit:'march',lead:'flute',center:76,density:'mid',amb:'birds'},
 'green-hill':{genre:'Sunny Synth-Funk',bpm:136,swing:0,key:0,cs:16,gain:1.15,
  bright:{scale:'major',A:'5.maj7 7.M 4.m7 9.m',B:'2.m7 4.m7 5.maj7 7.sus'},chordInst:'clav',comp:'stabs',bass:'funk',bassInst:'slap',pad:'glass',kit:'breakbeat',lead:'square',center:76,density:'busy',amb:null}
};
// Exotic harmony used by desert biomes on any level.
const EXOTIC={scale:'phrygdom',A:'0.M 1.M 0.M 10.m',B:'5.m 1.maj7 0.M 0.sus'};
// Biome colour: lead voice, harmonic mood, ambience, extra percussion, title word.
const BIOMES={
 space:{lead:'bell',mood:'bright',amb:'shimmer',title:'Orbit'},
 forest:{lead:'flute',mood:'bright',amb:'birds',title:'Woodland'},
 nyc:{lead:'mutedTrumpet',mood:'bright',amb:null,title:'Uptown'},
 gotham:{lead:'cello',mood:'dark',amb:'rain',title:'Rooftop'},
 jungle:{lead:'marimba',mood:'bright',amb:'birds',perc:'congas',title:'Canopy'},
 beach:{lead:'steel',mood:'bright',amb:'waves',perc:'shaker',title:'Boardwalk'},
 desert:{lead:'oud',mood:'exotic',amb:'wind',perc:'congas',title:'Mirage'},
 snow:{lead:'celesta',mood:'bright',amb:'wind',perc:'sleigh',title:'Snowfall'},
 graveyard:{lead:'theremin',mood:'dark',amb:'wind',title:'Graveside'},
 gothic:{lead:'harpsichord',mood:'dark',amb:null,title:'Gothic'},
 lava:{lead:'cello',mood:'dark',amb:'rumble',title:'Magma'},
 digital:{lead:'square',mood:'dark',amb:'bits',title:'Mainframe'},
 themepark:{lead:'synthPluck',mood:'bright',amb:null,title:'Midway'},
 funhouse:{lead:'toypiano',mood:'bright',amb:null,title:'Slime-Time'},
 stage:{lead:'guitar',mood:'bright',amb:null,title:'Backstage'},
 mountains:{lead:'koto',mood:'pent',amb:'wind',title:'Summit'},
 countryside:{lead:'whistle',mood:'pent',amb:'birds',title:'Meadow'},
 suburb:{lead:'epianoLead',mood:'bright',amb:null,title:'Cul-de-Sac'}
};
// One-bar rhythm cells: [onset, length] in sixteenths.
const CELLS={
 sparse:[[[0,6],[6,2],[8,8]],[[2,2],[4,4],[10,6]],[[0,4],[4,4],[8,8]],[[0,3],[3,3],[6,10]],[[4,4],[8,2],[10,6]],[[0,8],[10,2],[12,4]]],
 mid:[[[0,2],[2,2],[4,4],[8,2],[10,2],[12,4]],[[0,3],[3,3],[6,2],[8,6],[14,2]],[[2,2],[4,2],[6,4],[10,2],[12,4]],[[0,4],[4,2],[6,2],[8,8]],[[0,2],[3,3],[6,2],[8,2],[10,6]],[[0,2],[2,1],[3,3],[6,4],[12,4]]],
 busy:[[[0,1],[1,1],[2,2],[4,2],[6,2],[8,1],[9,1],[10,2],[12,4]],[[0,2],[2,1],[3,1],[4,2],[6,2],[8,2],[10,2],[12,2],[14,2]],[[0,1],[1,1],[2,1],[3,1],[4,4],[8,2],[10,2],[12,2],[14,2]],[[0,3],[3,1],[4,2],[6,2],[8,3],[11,1],[12,4]]],
 cadence:[[[0,4],[4,12]],[[0,2],[2,2],[4,12]],[[0,8],[8,8]],[[0,3],[3,13]]]
};

function styleFor(zone){
 const z=String(zone||'home');
 if(z.startsWith('warp'))return STYLES[z.slice(5)]?z.slice(5):'rainbow-road';
 return STYLES[z]?z:'mind';
}
// Snap to the nearest MIDI note whose pitch class is in `pcs`.
function nearestIn(midi,pcs){for(let d=0;d<12;d++){for(const m of [midi+d,midi-d])if(pcs.includes(((m%12)+12)%12))return m;}return midi;}
// Voice-led chord voicing around C4.
function voice(ch,key,prev){
 const pcs=ch.tones.map(t=>(key+ch.root+t)%12),n=pcs.length;let best=null,bestCost=Infinity;
 for(let inv=0;inv<n;inv++){const notes=[];let last=0;
  for(let i=0;i<n;i++){const pc=pcs[(i+inv)%n];let m=(i?last:52)+((pc-(i?last:52))%12+12)%12;if(i&&m===last)m+=12;notes.push(m);last=m;}
  if(notes[0]<52)notes.forEach((_,i)=>notes[i]+=12);
  // spread the top of wide chords so voicings stay under ~2 octaves
  const cost=prev?notes.reduce((s,m,i)=>s+Math.abs(m-(prev[Math.min(i,prev.length-1)])),0):Math.abs(notes[0]-55);
  if(notes[notes.length-1]<=79&&cost<bestCost){bestCost=cost;best=notes;}}
 return best||pcs.map(pc=>60+pc);
}
// Melody for `bars` bars over a progression. Returns [{at,dur,midi,vel}] in sixteenths.
function melody(rand,{prog,cs,key,scale,center,density,bars,motif}){
 const pcs=scale.map(s=>(s+key)%12),notes=[];for(let m=center-12;m<=center+14;m++)if(pcs.includes(((m%12)+12)%12))notes.push(m);
 const chordAt=step=>prog[Math.floor(step/cs)%prog.length];
 const chordPcs=ch=>ch.tones.map(t=>(key+ch.root+t)%12);
 const pick=a=>a[Math.floor(rand()*a.length)],cells=CELLS[density]||CELLS.mid;
 const ev=[];let idx=notes.indexOf(nearestIn(center,pcs));if(idx<0)idx=Math.floor(notes.length/2);
 const m1=motif||{cell:pick(cells),moves:null},answer=pick(cells);
 for(let bar=0;bar<bars;bar++){
  const role=bar%4,last=bar===bars-1;
  if(density==='sparse'&&role===1&&rand()<.55)continue; // leave room for the band
  const cell=role===3?pick(CELLS.cadence):role===1?answer:m1.cell;
  const replay=role===2&&m1.moves,moves=[];
  cell.forEach(([on,len],i)=>{
   const at=bar*16+on,ch=chordAt(at),cp=chordPcs(ch),strong=on%4===0||len>=4;
   let step=replay?m1.moves[i]??0:pick([-2,-1,-1,1,1,2,-3,3,0]);
   if(notes[idx]>center+8)step=-Math.abs(step)||-1;if(notes[idx]<center-6)step=Math.abs(step)||1;
   idx=Math.max(0,Math.min(notes.length-1,idx+step));let midi=notes[idx];
   if(strong)midi=nearestIn(midi,cp);
   if(role===3&&i===cell.length-1){const root=(key+ch.root)%12,third=cp[1];midi=nearestIn(midi,last||bars<=4?[root]:[third,cp[2]??root]);}
   idx=Math.max(0,notes.indexOf(nearestIn(midi,pcs)));moves.push(step);
   ev.push({at,dur:len,midi,vel:(on%4===0?1:.82)*(.9+rand()*.15)});});
  if(role===0&&!m1.moves)m1.moves=moves;
 }
 return {events:ev,motif:m1};
}
// Compose a song for a scene. variation re-seeds the melodies (new tune, same scene).
function composeSong(zone,biome,place,variation=0){
 const id=styleFor(zone),st=STYLES[id],bio=BIOMES[biome]||null;
 const fixed=st.hardcore||String(zone).startsWith('warp')||id==='home';
 const mood=fixed?'bright':bio?.mood||'bright';
 const bank=mood==='exotic'?EXOTIC:mood==='dark'?(st.dark||st.bright):st.bright;
 const scale=mood==='pent'&&!fixed?SCALES[/dorian|minor/.test(bank.scale)?'pentmin':'pentmaj']:SCALES[bank.scale];
 const rand=seededRandom(`${id}|${biome||''}|${variation}`);
 const progA=prog(bank.A),progB=prog(bank.B),cs=st.cs,progBars=progA.length*cs/16,secBars=Math.max(8,progBars);
 const lead=(!fixed&&bio?.lead)||st.lead,center=st.center;
 const mk=(p,motif)=>melody(rand,{prog:p,cs,key:st.key,scale,center,density:st.density,bars:secBars,motif});
 const a=mk(progA),a2=mk(progA,a.motif),b=mk(progB);
 const voicings=p=>{let prev=null;return p.map(ch=>prev=voice(ch,st.key,prev));};
 const sec=(name,p,leadEv,drums,extra={})=>({name,prog:p,voicings:voicings(p),bars:secBars,lead:leadEv,drums,...extra});
 const sections=[
  sec('intro',progA,[],'light',{bars:Math.min(4,progBars)}),
  sec('A',progA,a.events,'full'),
  sec('A2',progA,a2.events,'full'),
  sec('B',progB,b.events,'full',{lift:true}),
  sec('A3',progA,a.events,'full'),
  sec('break',progA,a2.events.filter((_,i)=>i%2===0),'light',{thin:true})
 ];
 return {id,zone,biome:biome||null,place:place||null,variation,bpm:st.bpm,swing:st.swing||0,swing8:st.swing8||0,key:st.key,cs,
  sections,lead,chordInst:st.chordInst,comp:st.comp,bass:st.bass,bassInst:st.bassInst,pad:st.pad,kit:st.kit,duck:!!st.duck,hardcore:!!st.hardcore,
  gain:st.gain||1,amb:fixed?st.amb:(bio?.amb??st.amb),perc:fixed?null:bio?.perc||null,
  name:fixed?st.name||st.genre:`${bio?.title||st.label||''} ${st.genre}`.trim(),by:place?`near ${place}`:''};
}
Object.assign(exports,{STYLES,BIOMES,SCALES,QUAL,chord,composeSong,styleFor,voice,melody});
