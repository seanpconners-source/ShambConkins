// Words n' Shit dictionary: ENABLE (public domain, the list Words With Friends started from) minus slurs,
// packed as a DAWG (minimal word graph) into assets/wordsnshit/dict.bin, read by src/engines/wns/dict.js.
// Usage: node tools/wns/build-dict.mjs <enable1.txt>
// Format: 'WNSD1' + u32 edge count + u32 root + u32 word count, then Uint32 edges: bits 0-4 letter (a=0), bit 5 end of
// word, bit 6 last edge of its node, bits 7-31 index of the child node's first edge (0 = no children).
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const src=process.argv[2];if(!src){console.error('usage: node tools/wns/build-dict.mjs enable1.txt');process.exit(1);}
// slurs the game never accepts (ordinary swearing stays: the game is called Words n' Shit). Stems: any word starting with one.
const BLOCK=new Set(('nigger niggers fag fags faggot faggots faggoty faggotry faggotries kike kikes spic spics spick spicks spik spiks '+
 'chink chinks chinky chinkier chinkiest gook gooks gooky wetback wetbacks coon coons darkie darkies darky jigaboo jigaboos sambo sambos '+
 'dago dagos dagoes wop wops retard retards retarded spaz spazzes squaw squaws redskin redskins honky honkie honkies gyp gyps gypped gypping '+
 'dyke dykes dykey').split(' '));
const blocked=w=>BLOCK.has(w);
// a few words Words With Friends takes that ENABLE (1997-2000) doesn't
const EXTRA=['qi','qis','za','zas','ok','ew','zen','vax','emoji','emojis','selfie','selfies','texted','texting','bae','yeet','meme','memes'];
const words=[...new Set([...EXTRA,...fs.readFileSync(src,'utf8').split(/\r?\n/)].map(w=>w.trim().toLowerCase()).filter(w=>/^[a-z]{2,15}$/.test(w)))].filter(w=>!blocked(w)).sort();
// incremental minimal DAWG (Daciuk et al.) over sorted words
let nextId=0;const mk=()=>({id:nextId++,final:false,edges:new Map()});const root=mk();const reg=new Map();let unchecked=[],prev='';
const key=n=>(n.final?'1':'0')+[...n.edges].map(([c,ch])=>c+ch.id).join(',');
function minimize(down){for(let i=unchecked.length-1;i>=down;i--){const [parent,c,child]=unchecked[i],k=key(child),hit=reg.get(k);if(hit)parent.edges.set(c,hit);else reg.set(k,child);unchecked.pop();}}
for(const w of words){let cp=0;while(cp<w.length&&cp<prev.length&&w[cp]===prev[cp])cp++;minimize(cp);let node=unchecked.length?unchecked[unchecked.length-1][2]:root;
 for(let i=cp;i<w.length;i++){const n=mk();node.edges.set(w[i],n);unchecked.push([node,w[i],n]);node=n;}node.final=true;prev=w;}
minimize(0);
// flatten: each node with children = a run of edges (sorted letters); index 0 is reserved (no children)
const first=new Map(),order=[];const seen=new Set();
(function walk(n){if(seen.has(n.id))return;seen.add(n.id);if(n.edges.size)order.push(n);for(const ch of n.edges.values())walk(ch);})(root);
let at=1;for(const n of order){first.set(n.id,at);at+=n.edges.size;}
const edges=new Uint32Array(at);
for(const n of order){let i=first.get(n.id);const list=[...n.edges].sort((a,b)=>a[0]<b[0]?-1:1);list.forEach(([c,ch],j)=>{edges[i+j]=(c.charCodeAt(0)-97)|(ch.final?32:0)|(j===list.length-1?64:0)|((ch.edges.size?first.get(ch.id):0)<<7);});}
const head=Buffer.alloc(17);head.write('WNSD1',0,'latin1');head.writeUInt32LE(at,5);head.writeUInt32LE(first.get(root.id),9);head.writeUInt32LE(words.length,13);
const out=Buffer.concat([head,Buffer.from(edges.buffer)]);
const dir=path.join(path.dirname(new URL(import.meta.url).pathname),'../../assets/wordsnshit');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'dict.bin.gz'),zlib.gzipSync(out,{level:9}));
console.log(`${words.length} words, ${reg.size+1} nodes, ${at} edges, ${out.length} bytes, gz ${fs.statSync(path.join(dir,'dict.bin.gz')).size}`);
