// Lists every character id and whether it has a local portrait (supplied photo, face pack, drop-in or drawn art).
import {req} from '../tests/load.mjs';
import fs from 'node:fs';
const {CHARACTERS}=req('src/characters.js'); const {ART}=req('src/data/art.js'); const {FACE_ASSIGNMENTS}=req('src/data/facePack.js');
const drop=new Set(fs.existsSync('assets/portraits')?fs.readdirSync('assets/portraits').map(f=>f.split('.')[0]):[]);
let missing=0;
for(const c of CHARACTERS){const has=drop.has(c.id)||FACE_ASSIGNMENTS[c.id]||ART['photo:char:'+c.id]||Object.keys(ART).some(k=>k.startsWith('char:'+c.id));if(!has)missing++;console.log((has?'  ':'? ')+c.id.padEnd(28)+c.name+'  ['+c.source+']');}
console.error(`${missing} of ${CHARACTERS.length} characters have no bundled portrait (they use the online photo lookup, then a drawn placeholder).`);
