import {req} from './load.mjs';
const {ACTIVE_CATALOG:C}=req('src/contentPolicy.js');
const ids=process.argv.slice(2);
for(const id of ids){const r=C.characters.find(c=>c.id===id);console.log(id, r?JSON.stringify({n:r.name,s:r.source,a:r.actor,u:r.unlockBy,at:r.unlockAt,k:r.assetKey,p:r.perkType}):'MISSING');}
