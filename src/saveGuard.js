// Save safety. Progress lives only in this browser at this address (another browser, a new file location or the
// browser clearing site data all mean an empty save), so: ask the browser to keep our storage, nudge a backup file
// from the title screen after real progress, and offer a restore when the save is empty.
const BACKUP_EVERY=5; // unlocks + runs since the last backup before the title screen asks
function progressMark(p){return new Set([...(p.shared||[]),...Object.values(p.rosters||{}).flat()]).size+(p.runs||0);}
const FRESH_MARK=2; // Sean and Amber, no runs
function sinceBackup(p){return Math.max(0,progressMark(p)-(p.backup?.mark??FRESH_MARK));}
function backupDue(p){return sinceBackup(p)>=BACKUP_EVERY;}
function emptySave(p){return progressMark(p)<=FRESH_MARK&&!p.xp;}
function markBackedUp(p){p.backup={at:Date.now(),mark:progressMark(p)};}
// Persistent storage is not evicted when the phone runs low on space. Chrome-based browsers decide silently;
// Firefox may ask once. Call it from a tap.
function keepSave(){try{const s=globalThis.navigator?.storage;if(!s?.persist)return;Promise.resolve(s.persisted?.()).then(kept=>kept||s.persist()).catch(()=>{});}catch{}}
function backupFileName(date=new Date()){const pad=n=>String(n).padStart(2,'0');return `ShambConkins-save-${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}.json`;}
Object.assign(exports,{progressMark,sinceBackup,backupDue,emptySave,markBackedUp,keepSave,backupFileName,BACKUP_EVERY});
