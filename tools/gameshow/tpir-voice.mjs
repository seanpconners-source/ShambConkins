// Makes The Price Is Right voice lines (src/data/tpirVoice.js) with fish.audio text-to-speech:
//   node tools/gameshow/tpir-voice.mjs [--only=<regex on key>] [--force] [--dry]
// Writes assets/music/tpir-v-<key>-<n>.mp3 for every take that isn't there yet (--force remakes them), then trims the silence at both
// ends and levels it (ffmpeg loudnorm to -16 LUFS, mono 44.1 kHz 128 kbps). Uses the free model (s2.1-pro-free). The API key is sent
// as "Authorization: Bearer $FISH_API_KEY" (in the cloud sessions the network proxy puts the saved key in; any value works there).
// Never commit a key. In the cloud box run it with NODE_USE_ENV_PROXY=1 (Node 22 fetch only uses the proxy then).
import fs from 'fs';import path from 'path';import {execFileSync} from 'child_process';
import {req} from '../../tests/load.mjs';
const V=req('src/data/tpirVoice.js');
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k));return a?(a.split('=')[1]??true):null;};
const only=arg('only')?new RegExp(arg('only')):null,force=!!arg('force'),dry=!!arg('dry');
const OUT='assets/music',KEY=process.env.FISH_API_KEY||'proxy-injected',MODEL='s2.1-pro-free';
// how product names are said out loud
const say=s=>s.replace(/\+/g,' Plus').replace(/\s*\(A16\)/,'').replace(/11-inch/,'eleven-inch').replace(/HERO13/,'Hero thirteen').replace(/CREAMi/,'Creamy').replace(/E-325/,'E three twenty-five').replace(/Pro 3\b/,'Pro three').replace(/Tundra 45/,'Tundra forty-five').replace(/Vitamix 5200/,'Vitamix fifty-two hundred').replace(/Switch 2\b/,'Switch two').replace(/Primavera 50\b/,'Primavera fifty');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tts(text,ref){for(let i=0;i<5;i++){
 const r=await fetch('https://api.fish.audio/v1/tts',{method:'POST',headers:{'Authorization':'Bearer '+KEY,'Content-Type':'application/json','model':MODEL},
  body:JSON.stringify({text,reference_id:ref,format:'mp3',mp3_bitrate:192,normalize:true,latency:'normal',temperature:.75,top_p:.75})});
 if(r.ok&&(r.headers.get('content-type')||'').includes('audio'))return Buffer.from(await r.arrayBuffer());
 const msg=await r.text().catch(()=>'');console.log('  ',r.status,msg.slice(0,120));if(r.status===401||r.status===402)throw new Error('fish.audio refused: '+r.status);await sleep(5000*(i+1));}
 throw new Error('gave up');}
// trim silence at both ends (keep 60 ms), level to -16 LUFS speech
function polish(raw,out){const tmp=out+'.raw.mp3';fs.writeFileSync(tmp,raw);
 execFileSync('ffmpeg',['-v','error','-y','-i',tmp,'-af','silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,loudnorm=I=-16:TP=-1.5:LRA=11','-ac','1','-ar','44100','-b:a','128k',out]);
 fs.unlinkSync(tmp);}
let made=0,skipped=0;
for(const [key,who,text,,,takes] of V.LINES){if(only&&!only.test(key))continue;
 for(let n=1;n<=takes;n++){const out=path.join(OUT,`tpir-v-${key}-${n}.mp3`);if(!force&&fs.existsSync(out)){skipped++;continue;}
  console.log(`${key}-${n} (${who}): ${text}`);if(dry)continue;
  const raw=await tts(say(text),V.VOICE_MODELS[who]);polish(raw,out);made++;await sleep(1200);}}
console.log(`made ${made}, already there ${skipped}`);
