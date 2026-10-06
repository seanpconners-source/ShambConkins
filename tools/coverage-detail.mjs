// Per-category coverage of docs/REFERENCE_LIST.md: characters, trivia, items, cards, locations, games.
import fs from 'node:fs';
import {req} from '../tests/load.mjs';
const {ACTIVE_CATALOG:C}=req('src/contentPolicy.js');
const {LOCATIONS}=req('src/locations.js');
const {GAMES,EVENT_GAMES}=req('src/gameRegistry.js');
const norm=t=>String(t||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’‘`]/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
const text=arr=>arr.map(x=>norm(Object.values(x).filter(v=>typeof v==='string').join(' ')));
const T={characters:text(C.characters),trivia:text(C.trivia.map(q=>({s:q.source,q:q.q}))),items:text(C.items),cards:text(C.cards.map(c=>({t:c.title,s:c.source,b:c.body}))),locations:text(LOCATIONS),games:text([...GAMES,...EVENT_GAMES])};
const md=fs.readFileSync(new URL('../docs/REFERENCE_LIST.md',import.meta.url),'utf8').split('## Part 3')[0];
const names=new Set();
for(const line of md.split('\n')){if(/^#|^Copied|^$/.test(line))continue;const body=line.replace(/^(TV|Movies|Horror|Games|Anime \/ animation|90s kid|Music|Anime|Locations?)[^:]*:\s*/i,'').replace(/\.$/,'');for(let n of body.split(/;/)){n=n.replace(/\(.*?\)/g,' ').trim();for(const a of n.split(' / '))if(a.trim().length>2)names.add(a.trim());}}
const rows=[];
for(const n of names){const k=norm(n);const r={n};for(const [cat,list] of Object.entries(T))r[cat]=list.filter(t=>t.includes(k)).length;rows.push(r);}
const weak=rows.filter(r=>r.trivia===0&&r.characters===0);
console.log(`${rows.length} names; ${weak.length} have neither a character nor a trivia question`);
console.log(weak.map(r=>r.n).join(' | '));
console.log('\nNo trivia but a character:',rows.filter(r=>r.trivia===0&&r.characters>0).length,' | no location mention:',rows.filter(r=>r.locations===0).length,' | no item/card:',rows.filter(r=>r.items+r.cards===0).length);
