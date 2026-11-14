// Sitabout Mini Golf sounds, all synthesised (WebAudio through tarantinoKit's helpers): the putter's click, a rolling hum
// that follows the ball's speed, wall knocks, the cup's rattle and drop, splashes, bumper pings, boost and portal
// whooshes, crowd oohs and cheers, a little fanfare for a hole in one, and a quiet ambience per course.
const {voice,noise,ac}=require("src/engines/tarantinoKit.js");
function createSound(){
 let roll=null,amb=0,dead=false;
 const S={
  putt(p){const v=.06+.14*Math.min(1,p);voice(1800+p*600,.03,v,'triangle');noise(.05,v*.9,{type:'highpass',f0:3000});voice(320,.06,v*.4,'sine');},
  happy(){noise(.5,.12,{type:'bandpass',f0:500,f1:2600,q:1.2});voice(140,.3,.1,'sawtooth',{slide:2.5,lp:900,delay:.05});},
  wall(v,kind){const k=Math.min(1,v/120);if(kind==='blade'||kind==='slider'||kind==='spinner'){voice(180,.08,.05+.07*k,'square',{lp:900});return;}voice(kind==='block'?260:420+Math.random()*80,.05,.03+.08*k,'triangle');noise(.03,.02+.05*k,{f0:1800});},
  cupRattle(){voice(1400,.05,.05,'square',{lp:3000});voice(1100,.05,.05,'square',{lp:3000,delay:.07});voice(900,.08,.06,'triangle',{delay:.15});},
  drop(){voice(180,.18,.12,'sine',{slide:.6,delay:.18});noise(.08,.05,{f0:600,delay:.2});},
  lip(){voice(1300,.05,.07,'square',{lp:2500});voice(700,.12,.05,'triangle',{slide:.7,delay:.05});S.ooh();},
  splash(){noise(.6,.12,{f0:1200,f1:180});noise(.25,.06,{type:'highpass',f0:2500,delay:.05});voice(90,.3,.06,'sine',{slide:.5});},
  thud(h){noise(.08,.04+Math.min(.08,h/600),{f0:500});voice(110,.1,.05,'sine');},
  bumper(){voice(880,.08,.08,'square',{slide:1.5,lp:4000});voice(1320,.12,.05,'triangle',{delay:.03});},
  boost(){noise(.7,.1,{type:'bandpass',f0:300,f1:4000,q:2});voice(110,.6,.06,'sawtooth',{slide:4,lp:2000});},
  portal(){voice(300,.35,.07,'sine',{slide:3});voice(450,.35,.05,'triangle',{slide:3,delay:.05});noise(.3,.04,{type:'bandpass',f0:2000,f1:500});},
  tunnel(){noise(.35,.06,{f0:400,f1:150});voice(160,.3,.04,'sine',{slide:.6});},
  tramp(){voice(200,.25,.1,'sine',{slide:3});voice(260,.2,.05,'triangle',{slide:2.5,delay:.04});},
  chomp(){voice(140,.08,.14,'sawtooth',{lp:700});voice(110,.1,.12,'sawtooth',{lp:600,delay:.12});noise(.12,.08,{f0:900,delay:.04});},
  gopher(){voice(900,.08,.07,'square',{slide:1.6,lp:3000});voice(1200,.06,.05,'square',{delay:.1,slide:.7,lp:3000});},
  ooh(){noise(.9,.05,{type:'bandpass',f0:420,f1:300,q:3,attack:.15});noise(.9,.04,{type:'bandpass',f0:640,f1:420,q:3,attack:.15});},
  cheer(big){const n=big?14:6;for(let i=0;i<n;i++)noise(.08+Math.random()*.1,.03+(big?.04:.02),{type:'bandpass',f0:1500+Math.random()*2500,q:1,delay:Math.random()*(big?1.6:.8)});noise(big?1.8:1,big?.07:.04,{type:'bandpass',f0:900,q:.6,attack:.1});},
  ace(){[523,659,784,1047,1319].forEach((f,i)=>voice(f,.22,.08,'triangle',{delay:i*.09}));[1047,1319,1568].forEach((f,i)=>voice(f,.5,.06,'sine',{delay:.5+i*.02}));S.cheer(true);},
  birdie(){[659,880,1175].forEach((f,i)=>voice(f,.16,.07,'triangle',{delay:i*.08}));S.cheer(false);},
  par(){[523,659].forEach((f,i)=>voice(f,.14,.06,'triangle',{delay:i*.08}));},
  bogey(){[392,330].forEach((f,i)=>voice(f,.18,.05,'triangle',{delay:i*.12}));},
  tick(){voice(1400,.02,.03,'square',{lp:4000});},
  lost(){[784,988,1175,1568].forEach((f,i)=>voice(f,.14,.06,'sine',{delay:i*.07}));},
  // rolling hum: speed 0..~250
  rolling(sp,surf){const a=ac();if(!a||dead)return;if(!roll){try{const len=a.sampleRate,buf=a.createBuffer(1,len,a.sampleRate),d=buf.getChannelData(0);let l=0;for(let i=0;i<len;i++){l=l*.97+(Math.random()*2-1)*.03;d[i]=l*6;}const src=a.createBufferSource();src.buffer=buf;src.loop=true;const f=a.createBiquadFilter();f.type='bandpass';f.Q.value=.8;const g=a.createGain();g.gain.value=0;src.connect(f);f.connect(g);g.connect(a.destination);src.start();roll={src,f,g};}catch{return;}}
   const t=a.currentTime,v=Math.min(1,sp/200),vol=sp<2?0:(.015+.06*v)*(surf==='sand'?.4:surf==='ice'?.5:1);roll.g.gain.setTargetAtTime(vol,t,.05);roll.f.frequency.setTargetAtTime((surf==='sand'?300:surf==='carpet'?500:180)+v*420,t,.05);},
  ambience(dt,kind){if(dead)return;amb-=dt;if(amb>0)return;if(kind==='spaceballs'){amb=3+Math.random()*4;voice(55+Math.random()*20,2.5,.015,'sine',{attack:.8});voice(1800+Math.random()*900,.4,.006,'sine',{slide:.5,delay:.3});}
   else{amb=1.4+Math.random()*3;const f=2600+Math.random()*1800,n=2+Math.floor(Math.random()*4);for(let i=0;i<n;i++)voice(f*(1+Math.random()*.15),.06,.012,'sine',{slide:1.25,delay:i*.09});}},
  stop(){dead=true;if(roll){try{roll.g.gain.value=0;roll.src.stop();}catch{}roll=null;}},
 };
 return S;
}
Object.assign(exports,{createSound});
