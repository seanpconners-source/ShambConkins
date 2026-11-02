// Boss fights: partner-down cutscene (ROADMAP K24). When one co-op plane goes down while the other still flies, the
// fight drops into slow motion, the camera pushes in on the survivor, their sad cut-out head zooms up in a panel with
// speed lines and tears, the downed plane blows up, and a huge "NOOOOOOO!!!!" shakes across the screen. ~1.9 s real
// time, then everything speeds back up (the revive window still matters: the ghost's 5 s clock runs on game time, so
// slow motion eats little of it). Offline only the world slows down; online (two phones share one attack world) the
// cutscene is drawn the same but time is never slowed.
// startDownCut(o) → state; stepDownCut(c,dt0) → false once over; cutTimeScale(c), cutZoom(c) for the engine;
// drawDownCut(g,c,W,H,T,o) paints the overlay in arena units; noooVoice(pitch) = synth "NOOOO" (formant filters).
const TAU=Math.PI*2,DUR=1.9,SLOW=.25;
const ease=u=>1-Math.pow(1-Math.max(0,Math.min(1,u)),3);
function startDownCut(o){return Object.assign({t:0,dur:o.reduce?1.4:DUR,said:false},o);}
function stepDownCut(c,dt0){if(!c)return false;c.t+=dt0;return c.t<c.dur;}
// world time scale: a near freeze on the blast, slow motion while NOOOO plays, then a ramp back to full speed
function cutTimeScale(c){if(!c)return 1;const t=c.t;if(t<.12)return .12;const back=c.dur-.55;if(t<back)return SLOW;return SLOW+(1-SLOW)*ease((t-back)/.55);}
// camera push-in (0..1) on the survivor's plane
function cutZoom(c){if(!c||c.reduce)return 0;return ease(c.t/.3)*Math.min(1,Math.max(0,(c.dur-c.t)/.45));}
function bigWord(g,str,cx,cy,size,maxW,rot,col){g.save();g.translate(cx,cy);g.rotate(rot);g.font=`900 ${size}px "Arial Black",Impact,Arial,sans-serif`;const mw=g.measureText(str).width;if(mw>maxW)g.scale(maxW/mw,maxW/mw);
 g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.shadowColor='rgba(255,30,40,.9)';g.shadowBlur=size*.45;g.lineWidth=size*.22;g.strokeStyle='#14060a';g.strokeText(str,0,0);g.shadowBlur=0;
 g.lineWidth=size*.07;g.strokeStyle='#ff2d3c';g.strokeText(str,0,0);g.fillStyle=col;g.fillText(str,0,0);g.restore();}
// o: {px,py} survivor's plane, head(canvas|null), drawHead(g,x,y,size) fallback, col survivor colour, name
function drawDownCut(g,c,W,H,T,o){if(!c)return;const t=c.t,fade=Math.min(1,(c.dur-t)/.3,t/.08);if(fade<=0)return;g.save();
 // sad blue wash and letterbox bars
 g.globalAlpha=fade;g.fillStyle='rgba(8,18,46,.42)';g.fillRect(0,0,W,H);
 const bar=H*.085*ease(t/.2);g.fillStyle='#000';g.fillRect(0,0,W,bar);g.fillRect(0,H-bar,W,bar);
 // the survivor's head flies up out of their plane into a big panel
 const u=ease((t-.05)/.3),D=Math.min(W*.6,H*.36)*(c.reduce?.85:1),hx=o.px+(W/2-o.px)*u,hy=o.py+(H*.4-o.py)*u,size=D*(.18+.82*u),shake=c.reduce?0:Math.sin(T*70)*2.2*u;
 g.save();g.translate(hx+shake,hy);
 // speed lines in the survivor's colour, turning slowly
 g.save();g.rotate(T*.6);g.globalAlpha=fade*.45*u;for(let i=0;i<22;i++){const a=i/22*TAU,w=.05+(i%3)*.025;g.fillStyle=i%2?o.col:'#ffffff';g.beginPath();g.moveTo(Math.cos(a-w)*size*.55,Math.sin(a-w)*size*.55);g.lineTo(Math.cos(a)*size*1.05,Math.sin(a)*size*1.05);g.lineTo(Math.cos(a+w)*size*.55,Math.sin(a+w)*size*.55);g.fill();}g.restore();
 g.globalAlpha=fade;const gr=g.createRadialGradient(0,0,size*.1,0,0,size*.62);gr.addColorStop(0,'#2a3f78');gr.addColorStop(1,'#0b1230');g.fillStyle=gr;g.beginPath();g.arc(0,0,size*.6,0,TAU);g.fill();g.lineWidth=Math.max(3,size*.035);g.strokeStyle=o.col;g.stroke();
 if(o.head&&o.head.width){const S=size*1.02;g.drawImage(o.head,-S/2,-S/2-size*.04,S,S);}else if(o.drawHead)o.drawHead(g,0,0,size*.8);
 // tears
 if(u>.6){g.fillStyle='#8fd8ff';g.strokeStyle='#14304a';g.lineWidth=1.5;for(const sd of [-1,1]){for(let k=0;k<2;k++){const ph=((t*1.8+k*.5+(sd>0?.25:0))%1),tx=sd*size*.15,ty=-size*.02+ph*size*.32,r=size*.035*(1-ph*.3);g.globalAlpha=fade*(1-ph);
  g.beginPath();g.moveTo(tx,ty-r*1.8);g.quadraticCurveTo(tx+r,ty,tx,ty+r);g.quadraticCurveTo(tx-r,ty,tx,ty-r*1.8);g.fill();g.stroke();}}g.globalAlpha=fade;}
 g.restore();
 // NOOOOOOO!!!! typed out: the O's stretch while the voice holds the vowel, then the !!!!
 if(t>.2){const n=Math.min(8,1+Math.floor((t-.2)*11)),ex=t>.95?Math.min(4,Math.floor((t-.95)*14)):0,str='N'+'O'.repeat(n)+'!'.repeat(ex);
  const grow=1+Math.min(.25,(t-.2)*.3),jit=c.reduce?0:(Math.random()-.5)*5;
  bigWord(g,str,W/2+jit,H*.4+D*.62+jit*.6,Math.round(54*grow),W-20,Math.sin(T*9)*.035,'#ffffff');}
 g.restore();}
// a sung "NOOOOO": a sawtooth with vibrato through two vowel formants (N: closed and nasal for a moment, then O), falling
function noooVoice(ac,pitch=170,vol=.11,dur=1.35){if(!ac)return;try{const t0=ac.currentTime,o=ac.createOscillator(),lfo=ac.createOscillator(),lg=ac.createGain(),out=ac.createGain();
 o.type='sawtooth';o.frequency.setValueAtTime(pitch*1.12,t0);o.frequency.linearRampToValueAtTime(pitch,t0+.25);o.frequency.exponentialRampToValueAtTime(pitch*.62,t0+dur);
 lfo.frequency.value=5.6;lg.gain.setValueAtTime(0,t0);lg.gain.linearRampToValueAtTime(pitch*.035,t0+.5);lfo.connect(lg);lg.connect(o.frequency);
 const mk=(f,q,gain)=>{const b=ac.createBiquadFilter();b.type='bandpass';b.frequency.setValueAtTime(f[0],t0);b.frequency.linearRampToValueAtTime(f[1],t0+.12);b.Q.value=q;const gg=ac.createGain();gg.gain.value=gain;o.connect(b);b.connect(gg);gg.connect(out);};
 mk([260,480],7,1);mk([1100,820],9,.55);mk([2400,2500],12,.12);
 out.gain.setValueAtTime(.0001,t0);out.gain.exponentialRampToValueAtTime(vol,t0+.07);out.gain.setValueAtTime(vol,t0+dur*.7);out.gain.exponentialRampToValueAtTime(.0001,t0+dur);
 out.connect(ac.destination);o.start(t0);lfo.start(t0);o.stop(t0+dur+.05);lfo.stop(t0+dur+.05);}catch{}}
Object.assign(exports,{startDownCut,stepDownCut,cutTimeScale,cutZoom,drawDownCut,noooVoice,DOWN_CUT_DUR:DUR});
