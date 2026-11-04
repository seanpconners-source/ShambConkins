// High-score tables shared by every phone (ROADMAP I13). The game's site keeps each game's top 10, one entry per name
// (cloudflare/worker.js, class Scores). A 1-player run sends its score when it ends (gameLauncher settleSolo); with no
// connection it waits in a small outbox and goes the next time the game starts or another score is sent. Game pages read
// the table (arcadeConsole.js) and keep the last copy, so offline they still show the board as it was. Needs nothing else:
// the rest of the game works the same without it.
const {VERSION}=require("src/version.js");
const DEFAULT_HOST='https://shambconkins.loki-mylo.work';
// The game's own site, else the default site (a downloaded copy). Tests point both online play and scores elsewhere with
// localStorage sc-net-host (a ws:// address; same server).
function base(){
 try{const o=localStorage.getItem('sc-net-host');if(o)return o.replace(/^ws/,'http').replace(/\/+$/,'');}catch{}
 const l=globalThis.location;
 if(l&&l.protocol==='https:'&&/(^|\.)loki-mylo\.work$|\.workers\.dev$/.test(l.hostname))return `https://${l.host}`;
 return DEFAULT_HOST;
}
const get=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
// One id per install, only for the site's rate limit (not shown anywhere).
function installId(){let id=null;try{id=localStorage.getItem('sc-install');if(!id){id=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('sc-install',id);}}catch{}return id||'anon';}
async function call(path,body=null,ms=6000){if(typeof fetch==='undefined')throw new Error('offline');const ctl=typeof AbortController!=='undefined'?new AbortController():null,t=setTimeout(()=>ctl?.abort(),ms);
 try{const r=await fetch(base()+path,{method:body?'POST':'GET',cache:'no-store',signal:ctl?.signal,...(body?{headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)}:{})});
  if(!r.ok)throw new Error('site answered '+r.status);return await r.json();}finally{clearTimeout(t);}}
// last copy of each game's table: {game: {top, at}}, the 150 most recently seen
const CACHE='sc-scores',OUT='sc-scores-out';
function remember(game,top){const c=get(CACHE)||{};c[game]={top:Array.isArray(top)?top.slice(0,10):[],at:Date.now()};
 const keys=Object.keys(c);if(keys.length>150)keys.sort((a,b)=>c[a].at-c[b].at).slice(0,keys.length-150).forEach(k=>delete c[k]);put(CACHE,c);}
// what this phone last saw for a game: {top:[{name,score,character,at}], at} or null
const cachedTop=game=>(get(CACHE)||{})[game]||null;
// fresh table from the site (falls back to the saved copy, marked stale, when it can't be reached)
async function loadTop(game){try{const r=await call('/scores/'+encodeURIComponent(game));remember(game,r.top);return {top:r.top||[],at:Date.now(),fresh:true};}
 catch{const c=cachedTop(game);return c?{...c,fresh:false}:null;}}
const entry=(game,{name,score,character})=>({game,name:String(name||'').slice(0,16),score:Math.max(0,Math.floor(score)||0),character:String(character||'').slice(0,64)});
async function send(e){const r=await call('/scores/'+encodeURIComponent(e.game),{name:e.name,score:e.score,character:e.character,v:VERSION,install:installId()});remember(e.game,r.top);return r;}
// queued scores, oldest first; a score the site refused as junk (400) is dropped, anything else waits for next time
let flushing=null;
function flushScores(){return flushing||=(async()=>{const out=get(OUT)||[];const keep=[];
 for(const e of out){try{await send(e);}catch(err){if(!/answered 4(00|13)/.test(err.message))keep.push(e);}}
 put(OUT,keep.slice(-50));flushing=null;})();}
// a finished run: {top, rank, best} from the site, or null when it waits in the outbox
async function submitScore(game,run){const e=entry(game,run);if(!e.name||!e.score)return null;
 try{const r=await send(e);void flushScores();return r;}
 catch(err){if(!/answered 4(00|13)/.test(err.message)){const out=get(OUT)||[];out.push(e);put(OUT,out.slice(-50));}return null;}}
Object.assign(exports,{submitScore,loadTop,cachedTop,flushScores});
