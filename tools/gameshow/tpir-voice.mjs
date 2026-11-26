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
// catalog names (src/data/showCatalog.js) the voice would trip on
const SPELL=[[/\bRAV4\b/g,'Rav four'],[/\bCR-V\b/g,'C R V'],[/\bMX-5\b/g,'M X five'],[/\bF-150\b/g,'F one fifty'],[/\bMazda3\b/g,'Mazda three'],[/\bS26\b/g,'S twenty-six'],
 [/\bGTI\b/g,'G T I'],[/\bRZR\b/g,'Razor'],[/\bTCL\b/g,'T C L'],[/\bDJI\b/g,'D J I'],[/\bUGG\b/g,'Ugg'],[/Wüsthof/g,'Voost-hof'],[/\bSMEG\b/g,'Smeg'],[/\bLG\b/g,'L G'],
 [/\bYETI\b/g,'Yeti'],[/\bOXO\b/g,'Oxo'],[/\bJBL\b/g,'J B L'],[/\bKONG\b/g,'Kong'],[/\bCHI\b/g,'C H I'],[/\bENO\b/g,'Eno'],[/\bLEGO\b/g,'Lego'],[/\bUNO\b/g,'Uno'],
 [/\bTI-84\b/g,'T I eighty-four'],[/\bA9\+/g,'A nine plus'],[/\bK-Mini\b/g,'K Mini'],[/\bK-Elite\b/g,'K Elite'],[/\bi-Type\b/g,'i Type'],[/\b4K\b/g,'four K'],
 [/\bAA\b/g,'double A'],[/\bNFL\b/g,'N F L'],[/\bNBA\b/g,'N B A'],[/\bPS5\b/g,'P S five'],[/\bQC\b/g,'Q C'],[/\bVR\b/g,'V R'],[/\bATV\b/g,'A T V'],[/\bDJ\b/g,'D J']];
const spell=s=>SPELL.reduce((a,[re,to])=>a.replace(re,to),s);
const say=s=>spell(s).replace(/\+/g,' Plus').replace(/\s*\(A16\)/,'').replace(/11-inch/,'eleven-inch').replace(/HERO13/,'Hero thirteen').replace(/CREAMi/,'Creamy').replace(/E-325/,'E three twenty-five').replace(/Pro 3\b/,'Pro three').replace(/Tundra 45/,'Tundra forty-five').replace(/Vitamix 5200/,'Vitamix fifty-two hundred').replace(/Switch 2\b/,'Switch two').replace(/Primavera 50\b/,'Primavera fifty');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function tts(text,ref){for(let i=0;i<8;i++){
 let r;try{r=await fetch('https://api.fish.audio/v1/tts',{method:'POST',headers:{'Authorization':'Bearer '+KEY,'Content-Type':'application/json','model':MODEL},
  body:JSON.stringify({text,reference_id:ref,format:'mp3',mp3_bitrate:192,normalize:true,latency:'normal',temperature:.75,top_p:.75})});}
  catch(e){console.log('   network error, retrying:',e.cause?.code||e.message);await sleep(5000*(i+1));continue;}
 if(r.ok&&(r.headers.get('content-type')||'').includes('audio'))return Buffer.from(await r.arrayBuffer());
 const msg=await r.text().catch(()=>'');console.log('  ',r.status,msg.slice(0,120));if(r.status===401||r.status===402)throw new Error('fish.audio refused: '+r.status);await sleep(5000*(i+1));}
 throw new Error('gave up');}
// trim silence at both ends (keep 60 ms), level to -16 LUFS speech
function polish(raw,out){const tmp=out+'.raw.mp3';fs.writeFileSync(tmp,raw);
 execFileSync('ffmpeg',['-v','error','-y','-i',tmp,'-af','silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,loudnorm=I=-16:TP=-1.5:LRA=11','-ac','1','-ar','44100','-b:a','128k',out]);
 fs.unlinkSync(tmp);}
let made=0,skipped=0;
// the lines + one call-down per character (--names=0 skips those)
const ALL_LINES=[...V.LINES,...(arg('names')==='0'?[]:[...V.nameLines(),...V.nameOnlyLines()])];
for(const [key,who,text,,,takes] of ALL_LINES){if(only&&!only.test(key))continue;
 for(let n=1;n<=takes;n++){const out=path.join(OUT,`tpir-v-${key}-${n}.mp3`);if(!force&&fs.existsSync(out)){skipped++;continue;}
  console.log(`${key}-${n} (${who}): ${text}`);if(dry)continue;
  const raw=await tts(say(text),V.VOICE_MODELS[who]);polish(raw,out);made++;await sleep(1200);}}
console.log(`made ${made}, already there ${skipped}`);
