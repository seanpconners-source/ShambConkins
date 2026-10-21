// Doom music: MUS (the original games) and MIDI (Freedoom) songs played on an OPL2-style FM synth with the WAD's own
// GENMIDI instrument bank, the way DOS Doom sounded on a Sound Blaster. Nine 2-operator voices, DMX-like voice
// allocation, envelopes/KSL/feedback/waveforms modelled after the YM3812. Audio is rendered in short chunks just ahead
// of the playback clock (pump() is called from the game loop).
const {audioContext}=require("src/audio.js");
const MULT=[.5,1,2,3,4,5,6,7,8,8,10,10,12,12,15,15],KSLROM=[0,32,40,45,48,51,53,55,56,58,59,60,61,62,63,64],KSLSHIFT=[8,1,2,0];
const VOLMAP=[0,1,3,5,6,8,10,11,13,14,16,17,19,20,22,23,25,26,27,29,30,32,33,34,36,37,39,41,43,45,47,49,50,52,54,55,57,59,60,61,63,64,66,67,68,69,71,72,73,74,75,77,78,79,80,81,82,83,84,84,85,86,87,88,89,90,91,92,92,93,94,95,96,96,97,98,99,99,100,101,101,102,103,103,104,105,105,106,107,107,108,109,109,110,110,111,112,112,113,113,114,114,115,115,116,117,117,118,118,119,119,120,120,121,121,122,122,123,123,123,124,124,125,125,126,126,127,127];
const ATT=new Float32Array(1024);for(let i=0;i<1024;i++)ATT[i]=Math.pow(10,-i*0.1875/20);
const SINE=new Float32Array(1024);for(let i=0;i<1024;i++)SINE[i]=Math.sin((i+.5)/1024*Math.PI*2);
const NVOICES=9;

// ---- song parsing → [{t,type,ch,a,b}] with t in seconds ----
function parseMUS(b){
 const dv=new DataView(b.buffer,b.byteOffset,b.byteLength),len=dv.getUint16(4,true),start=dv.getUint16(6,true),ev=[],vel=new Array(16).fill(127);let p=start,t=0;
 const CTL=[null,0,1,7,10,11,91,93,64,67];const mch=c=>c===15?9:c>=9?c+1:c;
 while(p<b.length&&p<start+len){const d=b[p++],last=d&0x80,type=(d>>4)&7,ch=mch(d&15);
  if(type===0){ev.push({t,type:'off',ch,a:b[p++]&127});}
  else if(type===1){let n=b[p++];if(n&0x80)vel[ch]=b[p++]&127;ev.push({t,type:'on',ch,a:n&127,b:vel[ch]});}
  else if(type===2){ev.push({t,type:'bend',ch,a:(b[p++]-128)*64});}
  else if(type===3){const c=b[p++];if(c===10||c===11)ev.push({t,type:'alloff',ch});else if(c===14)ev.push({t,type:'reset',ch});}
  else if(type===4){const c=b[p++],v=b[p++]&127;if(c===0)ev.push({t,type:'prog',ch,a:v});else if(CTL[c]!=null)ev.push({t,type:'ctl',ch,a:CTL[c],b:v});}
  else if(type===6)break;else if(type===5){}else{}
  if(last){let delay=0,x;do{x=b[p++];delay=delay*128+(x&127);}while(x&0x80&&p<b.length);t+=delay/140;}}
 ev.push({t,type:'end'});return ev;}
function parseMIDI(b){
 const dv=new DataView(b.buffer,b.byteOffset,b.byteLength),ntr=dv.getUint16(10),div=dv.getUint16(12);let p=14;const raw=[];
 for(let tr=0;tr<ntr&&p<b.length;tr++){if(String.fromCharCode(...b.subarray(p,p+4))!=='MTrk')break;const end=p+8+dv.getUint32(p+4);p+=8;let tick=0,run=0;
  while(p<end){let d=0,x;do{x=b[p++];d=d*128+(x&127);}while(x&0x80);tick+=d;let st=b[p];if(st&0x80)p++;else st=run;
   if(st===0xff){const type=b[p++];let l=0;do{x=b[p++];l=l*128+(x&127);}while(x&0x80);if(type===0x51)raw.push({tick,type:'tempo',a:(b[p]<<16)|(b[p+1]<<8)|b[p+2]});p+=l;}
   else if(st===0xf0||st===0xf7){let l=0;do{x=b[p++];l=l*128+(x&127);}while(x&0x80);p+=l;}
   else{run=st;const hi=st&0xf0,ch=st&15;
    if(hi===0x80)raw.push({tick,type:'off',ch,a:b[p++],x:b[p++]});
    else if(hi===0x90){const n=b[p++],v=b[p++];raw.push({tick,type:v?'on':'off',ch,a:n,b:v});}
    else if(hi===0xb0){const c=b[p++],v=b[p++];raw.push({tick,type:c===120||c===123?'alloff':c===121?'reset':'ctl',ch,a:c,b:v});}
    else if(hi===0xc0)raw.push({tick,type:'prog',ch,a:b[p++]});
    else if(hi===0xe0){const l=b[p++],h=b[p++];raw.push({tick,type:'bend',ch,a:((h<<7)|l)-8192});}
    else if(hi===0xa0||hi===0xd0)p+=hi===0xd0?1:2;else p+=1;}}
  p=end;}
 raw.sort((x,y)=>x.tick-y.tick);let tempo=500000,lt=0,t=0;const ev=[];
 for(const e of raw){t+=(e.tick-lt)*tempo/1e6/div;lt=e.tick;if(e.type==='tempo'){tempo=e.a;continue;}e.t=t;ev.push(e);}
 ev.push({t,type:'end'});return ev;}
function parseSong(b){if(!b||b.length<16)return null;const id=String.fromCharCode(...b.subarray(0,4));try{if(id==='MUS\x1a')return parseMUS(b);if(id==='MThd')return parseMIDI(b);}catch{}return null;}

// ---- GENMIDI bank ----
function parseGenmidi(b){if(!b||b.length<8+175*36)return null;const out=[];
 const op=o=>({am:b[o]>>7&1,vib:b[o]>>6&1,egt:b[o]>>5&1,ksr:b[o]>>4&1,mult:b[o]&15,ar:b[o+1]>>4,dr:b[o+1]&15,sl:b[o+2]>>4,rr:b[o+2]&15,ws:b[o+3]&3,ksl:b[o+4]>>6,tl:b[o+5]&63});
 for(let i=0;i<175;i++){const o=8+i*36,dv=new DataView(b.buffer,b.byteOffset+o,36),voices=[];
  for(let v=0;v<2;v++){const q=o+4+v*16;voices.push({mod:op(q),fb:(b[q+6]>>1)&7,additive:b[q+6]&1,car:op(q+7),offset:dv.getInt16(4+v*16+14,true)});}
  out.push({flags:dv.getUint16(0,true),fine:b[o+2],fixed:b[o+3],voices});}
 return out;}

// ---- FM operator ----
class Op{
 constructor(){this.phase=0;this.env=511;this.stage='off';this.out=0;this.prev=0;}
 set(p,freq,block,fnum,tl){this.p=p;this.freq=freq;this.tl=tl;const rof=p.ksr?(block*2+(fnum>>9)):(block*2+(fnum>>9))>>2;this.rof=rof;
  let k=(KSLROM[fnum>>6]<<2)-((8-block)<<5);if(k<0)k=0;this.ksl=k>>KSLSHIFT[p.ksl];}
 rate(r){if(!r)return 0;return Math.min(63,r*4+this.rof);}
 keyOn(){this.stage='attack';this.phase=0;}
 keyOff(){if(this.stage!=='off')this.stage='release';}
 // envelope in 0.1875 dB steps (0 loud .. 511 silent), advanced by dt seconds
 envStep(dt){
  switch(this.stage){
   case 'attack':{const r=this.rate(this.p.ar);if(r>=60){this.env=0;this.stage='decay';break;}if(!r)break;const tsec=2.82624/Math.pow(2,(r-4)/4);this.env-=(this.env+16)*dt/(tsec/7);if(this.env<=0){this.env=0;this.stage='decay';}break;}
   case 'decay':{const sl=this.p.sl===15?511:this.p.sl*16;const r=this.rate(this.p.dr);if(r)this.env+=511*dt/(39.28064/Math.pow(2,(r-4)/4));if(this.env>=sl){this.env=sl;this.stage=this.p.egt?'sustain':'release';}break;}
   case 'sustain':break;
   case 'release':{const r=this.rate(this.p.rr);if(r)this.env+=511*dt/(39.28064/Math.pow(2,(r-4)/4));if(this.env>=511){this.env=511;this.stage='off';}break;}}}
 // one sample; mod = phase modulation in cycles
 sample(inc,mod,trem,vib){
  this.phase+=inc*(this.p.vib?vib:1);const att=this.env+(this.tl<<2)+this.ksl+(this.p.am?trem:0);if(att>=511||this.stage==='off'){this.out=0;return 0;}
  let ph=this.phase+mod;ph-=Math.floor(ph);const idx=(ph*1024)|0;let s=SINE[idx];
  switch(this.p.ws){case 1:if(s<0)s=0;break;case 2:s=Math.abs(s);break;case 3:s=(idx&256)?0:Math.abs(s);break;}
  const v=s*ATT[att|0];this.prev=this.out;this.out=v;return v;}
}
class Voice{constructor(){this.mod=new Op();this.car=new Op();this.ch=-1;this.note=-1;this.on=false;this.age=0;this.inst=null;this.iv=0;}
 active(){return this.car.stage!=='off';}}

class DoomMusic{
 constructor(wad){this.wad=wad;this.bank=parseGenmidi(wad.lump('GENMIDI'));this.voices=Array.from({length:NVOICES},()=>new Voice());this.ev=null;this.volume=8/15;this.playing=null;this.chunks=[];}
 ctx(){const a=audioContext();if(!a)return null;if(!this.out||this.out.context!==a){this.out=a.createGain();this.out.gain.value=this.volume*.55;this.out.connect(a.destination);}return a;}
 setVolume(v){this.volume=v;if(this.out)this.out.gain.value=v*.55;}
 // start a song lump by name (D_E1M1, D_RUNNIN...); same song keeps playing
 play(name,loop=true){if(this.playing===name)return;this.stop();const lump=this.wad.lump(name);const ev=parseSong(lump);if(!ev||!this.bank){this.playing=null;return;}
  this.ev=ev;this.pos=0;this.songT=0;this.loop=loop;this.playing=name;this.resetChannels();const a=this.ctx();if(!a)return;this.sched=a.currentTime+.05;}
 stop(){this.playing=null;this.ev=null;for(const c of this.chunks){try{c.stop();}catch{}}this.chunks=[];for(const v of this.voices){v.mod.stage=v.car.stage='off';v.ch=-1;}}
 resetChannels(){this.chans=Array.from({length:16},()=>({prog:0,vol:100,expr:127,bend:0,sustain:false}));}
 pump(){if(!this.ev)return;const a=this.ctx();if(!a)return;if(this.sched<a.currentTime)this.sched=a.currentTime+.02;
  let guard=0;while(this.sched<a.currentTime+.35&&guard++<6){const n=Math.floor(a.sampleRate*.1),buf=a.createBuffer(1,n,a.sampleRate);this.render(buf.getChannelData(0),a.sampleRate);
   const src=a.createBufferSource();src.buffer=buf;src.connect(this.out);src.start(this.sched);this.sched+=n/a.sampleRate;this.chunks.push(src);src.onended=()=>{this.chunks=this.chunks.filter(c=>c!==src);};}}
 render(out,rate){
  const n=out.length,dt=1/rate,ev=this.ev;let i=0;
  while(i<n){
   // events due before the next block of samples
   while(this.ev&&this.pos<ev.length&&ev[this.pos].t<=this.songT){this.event(ev[this.pos++]);if(!this.ev)break;}
   if(!this.ev){out.fill(0,i);return;}
   const nextT=this.pos<ev.length?ev[this.pos].t:Infinity,span=Math.max(1,Math.min(n-i,Math.ceil((nextT-this.songT)*rate),64));
   this.synth(out,i,span,rate);i+=span;this.songT+=span*dt;}}
 event(e){const c=this.chans[e.ch];
  switch(e.type){
   case 'end':if(this.loop){this.pos=0;this.songT=0;for(const v of this.voices)this.release(v);this.resetChannels();}else this.ev=null;break;
   case 'on':this.noteOn(e.ch,e.a,e.b);break;
   case 'off':this.noteOff(e.ch,e.a);break;
   case 'prog':c.prog=e.a;break;
   case 'bend':c.bend=e.a;for(const v of this.voices)if(v.ch===e.ch&&v.on)this.freq(v);break;
   case 'ctl':if(e.a===7)c.vol=e.b;else if(e.a===11)c.expr=e.b;else if(e.a===64){c.sustain=e.b>=64;if(!c.sustain)for(const v of this.voices)if(v.ch===e.ch&&v.held){v.held=false;this.release(v);}}
    if(e.a===7||e.a===11)for(const v of this.voices)if(v.ch===e.ch&&v.on)this.level(v);break;
   case 'alloff':for(const v of this.voices)if(v.ch===e.ch)this.release(v);break;
   case 'reset':c.bend=0;c.vol=100;c.expr=127;c.sustain=false;break;}}
 instrument(ch,note){if(ch===9){if(note<35||note>81)return null;return this.bank[128+note-35];}return this.bank[this.chans[ch].prog];}
 noteOn(ch,note,vel){if(!vel){this.noteOff(ch,note);return;}const inst=this.instrument(ch,note);if(!inst)return;
  const two=inst.flags&4;for(let iv=0;iv<(two?2:1);iv++){const v=this.alloc(ch,iv);if(!v)return;Object.assign(v,{ch,note,vel,inst,iv,on:true,held:false,age:++this.ageCounter||(this.ageCounter=1)});
   const vd=inst.voices[iv];v.mod.p=vd.mod;v.car.p=vd.car;v.vd=vd;this.freq(v);this.level(v);v.mod.keyOn();v.car.keyOn();}}
 noteOff(ch,note){const c=this.chans[ch];for(const v of this.voices)if(v.ch===ch&&v.note===note&&v.on){if(c.sustain){v.held=true;continue;}this.release(v);}}
 release(v){v.on=false;v.mod.keyOff();v.car.keyOff();}
 alloc(ch,iv){let best=null;for(const v of this.voices)if(!v.on&&!v.active()){best=v;break;}
  if(!best)for(const v of this.voices)if(!v.on&&(!best||v.car.env>best.car.env))best=v;
  if(!best){// steal: second voices first, then the oldest note on the highest channel
   for(const v of this.voices)if(v.iv===1&&(!best||v.age<best.age))best=v;
   if(!best)for(const v of this.voices)if(v.ch>=ch&&(!best||v.ch>best.ch||(v.ch===best.ch&&v.age<best.age)))best=v;
   if(!best)return iv?null:this.voices.reduce((a,b)=>a.age<b.age?a:b);}
  best.mod.stage='off';best.car.stage='off';best.mod.env=best.car.env=511;return best;}
 freq(v){const inst=v.inst,vd=v.vd,c=this.chans[v.ch];let note=inst.flags&1?inst.fixed:v.note;note+=vd.offset;
  // DMX's note table sits an octave above MIDI numbering; GENMIDI's per-voice offsets (often -12) assume that
  let idx=(note+12)*32+(c.bend>>7);if(v.iv)idx+=(inst.fine>>1)-64;const hz=440*Math.pow(2,(idx/32-69)/12);
  let block=0;while(block<7&&hz*Math.pow(2,20-block)/49716>1023)block++;const fnum=Math.max(0,Math.min(1023,Math.round(hz*Math.pow(2,20-block)/49716)));
  v.hz=hz;v.block=block;v.fnum=fnum;this.level(v);}
 level(v){const c=this.chans[v.ch],vd=v.vd;if(!vd)return;
  const midi=2*(VOLMAP[Math.min(127,c.vol*c.expr/127|0)]+1),full=(VOLMAP[v.vel]*midi)>>9;let car=0x3f-full;if(car<(vd.car.tl))car=vd.car.tl;
  let mod=vd.mod.tl;if(vd.additive&&mod!==0x3f&&mod<car)mod=car;
  v.mod.set(vd.mod,v.hz,v.block,v.fnum,mod);v.car.set(vd.car,v.hz,v.block,v.fnum,car);}
 synth(out,i0,n,rate){
  const dt=1/rate;this.lfo=(this.lfo||0);
  for(let i=0;i<n;i++){this.lfo+=dt;const trem=(1+Math.sin(this.lfo*2*Math.PI*3.7))*2.67,vib=1+Math.sin(this.lfo*2*Math.PI*6.1)*.0004;let s=0;
   for(const v of this.voices){if(v.car.stage==='off'&&v.mod.stage==='off')continue;const m=v.mod,c=v.car,vd=v.vd;if(!vd)continue;
    if((i&15)===0){m.envStep(dt*16);c.envStep(dt*16);}
    const mul=v.hz*dt;const fb=vd.fb?(m.out+m.prev)*Math.pow(2,vd.fb-6):0;
    const mo=m.sample(mul*MULT[m.p.mult],fb,trem,vib);
    const co=c.sample(mul*MULT[c.p.mult],vd.additive?0:mo*4,trem,vib);
    s+=vd.additive?(co+mo):co;}
   out[i0+i]=Math.max(-1,Math.min(1,s*.22));}}
}
Object.assign(exports,{DoomMusic,parseSong,parseGenmidi});
