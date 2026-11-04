// Item audit (Node): how many items of each kind, and which do little (ROADMAP F6). `node tests/item-audit.mjs [kind]`
import {req} from './load.mjs';
const {ITEMS,itemDescription}=req('src/items.js');
const by={};for(const it of ITEMS)(by[it.kind]||=[]).push(it);
const only=process.argv[2];
console.log('items',ITEMS.length);
for(const [k,l] of Object.entries(by).sort((a,b)=>b[1].length-a[1].length)){if(only&&k!==only)continue;console.log(String(l.length).padStart(4),k,only?'':l.slice(0,4).map(i=>`${i.id}(${i.value??''})`).join(' '));if(only)for(const i of l)console.log('     ',i.id,'|',i.name,'|',i.value,'|',itemDescription(i).slice(0,120));}
