// THE PRICE IS RIGHT STUDIO AUDIENCE YELLING (owner, Nov 26: "I don't like the low synth roar... real audience sound like the real show:
// yelling numbers, cheers, higher lower, no yes, left right... can we make it on fish ai?"). Many different fish.audio voices each yell
// short lines; ffmpeg layers 6-12 of them per take (random start offsets, left/right spread, a little room echo, distance EQ) into crowd
// takes the games already ask for: assets/music/tpir-crowd-<group>-<n>.mp3 (stage.js voice('crowd-shout') etc. picks a take at random).
//   NODE_USE_ENV_PROXY=1 node tools/gameshow/tpir-crowd.mjs [--only=<group regex>] [--mix-only] [--raw=<dir>]
// The raw single-voice yells are kept in local-test-reports/tpir-crowd-raw (not in the repo; a re-run only makes the missing ones).
// The API key: "Authorization: Bearer $FISH_API_KEY" (in the cloud sessions the network proxy puts the saved key in). Never commit a key.
import fs from 'fs';import path from 'path';import {execFileSync} from 'child_process';
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k));return a?(a.split('=')[1]??true):null;};
const only=arg('only')?new RegExp(arg('only')):null,mixOnly=!!arg('mix-only'),RAW=arg('raw')||'local-test-reports/tpir-crowd-raw',OUT='assets/music';
const KEY=process.env.FISH_API_KEY||'proxy-injected',MODEL='s2.1-pro-free';
// everyday voices from fish.audio's public library (men and women, young and older)
const VOICES=['35a41c4c9e754e49a124a4bab5aa47e6','802e3bc2b27e49c2995d23ef70e6ac89','f48d143a59a946ab87c0130fd081f349','e9b134e4c0b547a3894793be502314f1',
 'a3b3f0a9c49340bd8fa722d83c81cb08','15742afadec44b82bf52f7bb62b83f83','9259a7392c454a1eb6436141abb5a558','52e0660e03fe4f9a8d2336f67cab5440',
 '711cf3ed00ab441a8f54a45058047b7a','536d3a5e000945adb7038665781a4aca','85d6a6c915f545b399b0bfb358244fb9','933563129e564b19a115bedd57b7406a'];
// group: [lines, voices per line, takes, people per take, seconds, loudness LUFS]
const GROUPS={
 shout:[['Eight hundred!','Twelve hundred dollars!','Go higher!','Lower!','One dollar!','Bid a dollar!','Seven!','Three!','Two thousand!','That one! That one!','You got this!','Come on!','Higher!','Go lower!','Yes!','No!','Do it!','Five hundred!'],3,6,9,2.6,-21],
 higher:[['Higher!','Higher! Higher!','Go higher!','Up! Go up!'],4,3,10,1.8,-20],
 lower:[['Lower!','Lower! Lower!','Go lower!','Down! Go down!'],4,3,10,1.8,-20],
 yesno:[['Yes!','No!','No no no!','Do it!','Don\'t do it!','Keep it!','Punch again!'],3,4,9,2.2,-21],
 spinstay:[['Spin!','Stay!','Spin again!','Stay! Stay!'],4,3,9,2,-21],
 leftright:[['Left!','Right!','Go left!','Go right!','The middle!','Middle! Middle!'],3,3,9,2,-21],
 ooh:[['Ooooh!','Whoa!'],5,2,10,1.6,-21],
 aww:[['Awww!','Ohhh no!'],5,2,10,1.8,-21],
 cheer:[['Woo!','Yeah!','Wooo!','Alright!','Yes! Yes!'],4,3,12,2.2,-19],
 chatter:[['Oh my gosh, I\'m so nervous.','Did you see that car?','I hope they call my name.','Honey, look at the wheel!','I love this show.','What would you bid?','We drove all night to get here.','Is that Bob Barker?','I\'d bid nine hundred.','My mom watches this every day.'],3,1,36,24,-30]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tts(text,ref){for(let i=0;i<8;i++){let r;
 try{r=await fetch('https://api.fish.audio/v1/tts',{method:'POST',headers:{'Authorization':'Bearer '+KEY,'Content-Type':'application/json','model':MODEL},
  body:JSON.stringify({text,reference_id:ref,format:'mp3',mp3_bitrate:128,normalize:true,latency:'normal',temperature:.9,top_p:.8})});}
 catch(e){console.log('   network error, retrying:',e.cause?.code||e.message);await sleep(5000*(i+1));continue;}
 if(r.ok&&(r.headers.get('content-type')||'').includes('audio'))return Buffer.from(await r.arrayBuffer());
 const msg=await r.text().catch(()=>'');console.log('  ',r.status,msg.slice(0,120));if(r.status===401||r.status===402)throw new Error('fish.audio refused: '+r.status);await sleep(5000*(i+1));}
 throw new Error('gave up');}
// a small seeded random so a re-mix is the same
let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
const slug=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
fs.mkdirSync(RAW,{recursive:true});
for(const [g,[lines,per]] of Object.entries(GROUPS)){if(only&&!only.test(g))continue;
 // the raw yells: each line by `per` different voices (picked by the line, so a re-run picks the same ones)
 for(const [li,line] of lines.entries())for(let k=0;k<per;k++){const v=VOICES[(li*5+k*7+g.length)%VOICES.length],out=path.join(RAW,`${g}--${slug(line)}--${v.slice(0,6)}.mp3`);
  if(fs.existsSync(out)||mixOnly)continue;console.log(`${g}: ${line} (${v.slice(0,6)})`);
  const raw=await tts(line,v),tmp=out+'.tmp.mp3';fs.writeFileSync(tmp,raw);
  execFileSync('ffmpeg',['-v','error','-y','-i',tmp,'-af','silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5','-ac','1','-ar','44100',out]);fs.unlinkSync(tmp);await sleep(800);}}
// the mixes
for(const [g,[,,takes,people,secs,lufs]] of Object.entries(GROUPS)){if(only&&!only.test(g))continue;
 const raws=fs.readdirSync(RAW).filter(f=>f.startsWith(g+'--')&&f.endsWith('.mp3')).map(f=>path.join(RAW,f));if(!raws.length)continue;
 for(let n=1;n<=takes;n++){const pick=[];for(let i=0;i<people;i++)pick.push(raws[Math.floor(rnd()*raws.length)]);
  const spread=g==='chatter'?secs-2.5:Math.min(.9,secs*.35),parts=pick.map((f,i)=>{const d=Math.round(rnd()*spread*1000),vol=(g==='chatter'?.35:.55)+rnd()*.45,p=rnd(),l=(1-p).toFixed(2),r=p.toFixed(2),rate=(.94+rnd()*.12).toFixed(3);
   return `[${i}:a]asetrate=44100*${rate},aresample=44100,adelay=${d}|${d},volume=${vol.toFixed(2)},pan=stereo|c0=${l}*c0|c1=${r}*c0[a${i}]`;});
  const mix=`${parts.join(';')};${pick.map((f,i)=>`[a${i}]`).join('')}amix=inputs=${pick.length}:normalize=0:duration=longest,aecho=0.8:0.5:45|80:0.22|0.14,highpass=f=140,lowpass=f=${g==='chatter'?3800:7500},atrim=0:${secs+1.2},afade=t=out:st=${(secs+.6).toFixed(2)}:d=0.6,loudnorm=I=${lufs}:TP=-2[o]`;
  const out=path.join(OUT,`tpir-crowd-${g}-${n}.mp3`);
  execFileSync('ffmpeg',['-v','error','-y',...pick.flatMap(f=>['-i',f]),'-filter_complex',mix,'-map','[o]','-ac','2','-ar','44100','-b:a','128k',out]);console.log('mixed',out);}}
