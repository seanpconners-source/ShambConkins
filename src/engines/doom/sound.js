// Doom sound effects: the WAD's DMX sound lumps (8-bit PCM) played on 8 channels with vanilla rules (one sound per
// source at a time, priorities, stereo separation and distance falloff from S_AdjustSoundParams, updated as things move).
const {audioContext}=require("src/audio.js");
const PRI={pistol:64,shotgn:64,sgcock:64,dshtgn:64,dbopn:64,dbcls:64,dbload:64,plasma:64,bfg:64,sawup:64,sawidl:118,sawful:64,sawhit:64,rlaunc:64,rxplod:70,firsht:70,firxpl:70,pstart:100,pstop:100,doropn:100,dorcls:100,stnmov:119,swtchn:78,swtchx:78,plpain:96,dmpain:96,popain:96,vipain:96,mnpain:96,pepain:96,slop:78,itemup:78,wpnup:78,oof:96,telept:32,posit1:98,posit2:98,posit3:98,bgsit1:98,bgsit2:98,sgtsit:98,cacsit:98,brssit:94,cybsit:92,spisit:90,bspsit:90,kntsit:90,vilsit:90,mansit:90,pesit:90,sklatk:70,sgtatk:70,skepch:70,vilatk:70,claw:70,skeswg:70,pldeth:32,pdiehi:32,podth1:70,podth2:70,podth3:70,bgdth1:70,bgdth2:70,sgtdth:70,cacdth:70,skldth:70,brsdth:32,cybdth:32,spidth:32,bspdth:32,vildth:32,kntdth:32,pedth:32,skedth:32,posact:120,bgact:120,dmact:120,bspact:100,bspwlk:100,vilact:100,noway:78,barexp:60,punch:64,hoof:70,metal:70,chgun:64,tink:60,bdopn:100,bdcls:100,itmbk:100,flame:32,flamst:32,getpow:60,bospit:70,boscub:70,bossit:70,bospn:70,bosdth:70,manatk:70,mandth:70,sssit:70,ssdth:70,keenpn:70,keendt:70,skeact:70,skesit:70,skeatk:70,radio:60};
const CLIP=1200,CLOSE=200,SWING=96,CHANNELS=8;
class DoomSound{
 constructor(wad){this.wad=wad;this.buffers=new Map();this.chans=[];this.volume=8/15;this.listener=null;this.bossmap=false;}
 ctx(){const a=audioContext();if(!a)return null;if(!this.out||this.out.context!==a){this.out=a.createGain();this.out.gain.value=this.volume;this.out.connect(a.destination);}return a;}
 setVolume(v){this.volume=v;if(this.out)this.out.gain.value=v;}
 buffer(name){
  if(this.buffers.has(name))return this.buffers.get(name);const a=this.ctx();let buf=null;
  const raw=this.wad.lump('DS'+name.toUpperCase());
  if(a&&raw&&raw.length>8){const dv=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);if(dv.getUint16(0,true)===3){const rate=dv.getUint16(2,true)||11025;let n=dv.getUint32(4,true);
   // DMX pads 16 bytes either side of the samples
   let start=8,len=Math.min(n,raw.length-8);if(len>32){start+=16;len-=32;}
   buf=a.createBuffer(1,Math.max(1,len),rate);const ch=buf.getChannelData(0);for(let i=0;i<len;i++)ch[i]=(raw[start+i]-128)/128;}}
  this.buffers.set(name,buf);return buf;}
 // listener = player mobj; origin = mobj / {x,y} / null (full volume, centred)
 params(origin){
  const l=this.listener;if(!origin||!l||origin===l)return {vol:1,sep:128};
  const dx=origin.x-l.x,dy=origin.y-l.y,adx=Math.abs(dx),ady=Math.abs(dy),dist=adx+ady-Math.min(adx,ady)/2;
  if(dist>CLIP&&!this.bossmap)return null;
  let ang=Math.atan2(dy,dx)-l.angle/4294967296*Math.PI*2;const sep=128-SWING*Math.sin(ang);
  let vol=dist<CLOSE?1:this.bossmap?Math.max(.12,(CLIP-Math.min(dist,CLIP))/(CLIP-CLOSE)):(CLIP-dist)/(CLIP-CLOSE);
  return {vol:Math.max(0,Math.min(1,vol)),sep};}
 start(origin,name){
  const a=this.ctx();if(!a)return;const buf=this.buffer(name);if(!buf)return;const p=this.params(origin);if(!p||p.vol<=0)return;
  const pri=PRI[name]??64;
  // a source plays one sound at a time
  if(origin)for(const c of this.chans)if(c.origin===origin)this.kill(c);
  this.chans=this.chans.filter(c=>!c.ended);
  if(this.chans.length>=CHANNELS){let worst=null;for(const c of this.chans)if(c.pri>=pri&&(!worst||c.pri>worst.pri))worst=c;if(!worst)return;this.kill(worst);this.chans=this.chans.filter(c=>c!==worst);}
  const src=a.createBufferSource();src.buffer=buf;const g=a.createGain(),pan=a.createStereoPanner?a.createStereoPanner():null;
  g.gain.value=p.vol;if(pan){pan.pan.value=(p.sep-128)/128*.85;src.connect(g);g.connect(pan);pan.connect(this.out);}else{src.connect(g);g.connect(this.out);}
  const c={src,g,pan,origin,pri,name,ended:false};src.onended=()=>{c.ended=true;};src.start();this.chans.push(c);}
 kill(c){if(c.ended)return;c.ended=true;try{c.src.stop();}catch{}}
 stopOrigin(origin){for(const c of this.chans)if(c.origin===origin)this.kill(c);}
 stopAll(){for(const c of this.chans)this.kill(c);this.chans=[];}
 // S_UpdateSounds: follow moving sources
 update(){for(const c of this.chans){if(c.ended||!c.origin)continue;const p=this.params(c.origin);if(!p){this.kill(c);continue;}c.g.gain.value=p.vol;if(c.pan)c.pan.pan.value=(p.sep-128)/128*.85;}
  this.chans=this.chans.filter(c=>!c.ended);}
}
Object.assign(exports,{DoomSound});
