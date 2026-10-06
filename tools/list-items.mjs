import {req} from '../tests/load.mjs';
const what=process.argv[2]||'items';
if(what==='locations'){const {LOCATIONS}=req('src/locations.js');for(const l of LOCATIONS)console.log(l.id.padEnd(34)+l.name+'  ['+l.source+']');}
else{const {ITEMS}=req('src/items.js');for(const i of ITEMS)console.log(i.id.padEnd(34)+i.name+'  ['+i.source+']');}
