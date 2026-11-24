// FRUIT NINJA THEMES: every game of Fruit Ninja (taskmaster-fruit-ninja) is set in one world picked from the run's seed:
// one of Crappy Crush's 72 worlds (src/data/crappyCrushWorlds.js: its background assets/crappycrush/<key>, its items as
// the fruit) or one of Flappy Disaster's 16 stages (src/data/flappySprites.js backgrounds bg-<id>[-tall|-fold], borrowing
// the items of the Crappy worlds that fit it, FLAPPY_FIT). The characters of those worlds' sources (the world's own source
// and its items' sources, only ones with a real picture) fly up too and get sliced. Both players get the same world.
const {seededRandom}=require("src/utils.js");
const {ART}=require("src/data/art.js");
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const CW=require("src/data/crappyCrushWorlds.js");
const FS=require("src/data/flappySprites.js");
// Flappy stages -> the Crappy worlds whose items and characters belong in that scene
const FLAPPY_FIT={classic:['mariokart','smb3','sonic','nintendopower'],meat:['crystalcamp','nightmares','basement'],fuzzy:['saturday','candyland'],pokemon:['pokemon','pokecenter'],
 hell:['heavymetal','castlevania','raccoon'],space:['galaxy','startrek','nostromo','klendathu'],sea:['spectre','bond','isla'],office:['office','sitcom','cringe'],
 grave:['cabin','crystalcamp','clocktower'],vapor:['matrix','arcadehall','dancefloor'],candy:['candyland','snackattack'],upside:['invasion','hillvalley','nightmares'],
 sewer:['sewerlair','toxic'],vegas:['qbranch','shagadelic','lebowski'],arctic:['shadowmoses','deathmountain'],disco:['dancefloor','popcharts','shagadelic']};
let THEMES=null;
function hasItemArt(id){return !!ART['photo:item:'+id];}
function themes(){if(THEMES)return THEMES;let items=[],chars=[],art=()=>false;
 try{items=require("src/data/content.js").CATALOG.items;}catch{}
 try{chars=require("src/characters.js").CHARACTERS;const {portraitURL}=require("src/assets.js"),{isRasterArt}=require("src/data/userPortraits.js");art=id=>{try{return isRasterArt(portraitURL(id,'normal'));}catch{return false;}};}catch{}
 const srcOf=new Map(items.map(i=>[i.id,i.source]));
 const castFor=sources=>{const S=new Set(sources.filter(Boolean));return chars.filter(c=>S.has(c.source)&&art(c.id)).map(c=>c.id);};
 const byKey=new Map(CW.WORLDS.map(w=>[w.key,w]));
 const out=[];
 for(const w of CW.WORLDS){if(!USER['crappy:'+w.key])continue;const its=w.items.filter(hasItemArt);
  out.push({kind:'crappy',key:w.key,name:w.name,source:w.source,tint:w.tint,items:its,chars:castFor([w.source,...its.map(i=>srcOf.get(i))]).slice(0,14)});}
 for(const [id,fit] of Object.entries(FLAPPY_FIT)){if(!FS.has('bg-'+id))continue;const ws=fit.map(k=>byKey.get(k)).filter(Boolean),its=[...new Set(ws.flatMap(w=>w.items))].filter(hasItemArt);
  out.push({kind:'flappy',key:id,name:FS.STAGE_ART[id]?.name||id,source:ws[0]?.source||'',tint:ws[0]?.tint||['#3a8ad0','#0a1430'],items:its,chars:castFor([...ws.map(w=>w.source),...its.map(i=>srcOf.get(i))]).slice(0,14)});}
 // a world needs something to slice
 THEMES=out.filter(t=>t.items.length+t.chars.length>=4);return THEMES;}
// the world for this game (same on both phones / both turns): from the seed
function pickTheme(seed){const T=themes();if(!T.length)return null;const r=seededRandom(String(seed)+':fruit-world');return T[Math.floor(r()*T.length)];}
// the flying things of a world: items and characters mixed, characters a little rarer
function objectsOf(t){if(!t)return [];return [...t.items.map(id=>({type:'item',id})),...t.chars.map(id=>({type:'char',id}))];}
// ---- pictures
const imgs=new Map();
function load(key,url){if(!url||typeof Image==='undefined')return null;let e=imgs.get(key);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(key,e);}return e.ok?e.img:null;}
const itemImg=id=>load('item:'+id,ART['photo:item:'+id]);
function background(t,W,H){if(!t)return null;const shape=require("src/bgShape.js");
 if(t.kind==='crappy')return shape.pick(W,H,{tall:t.key,fold:t.key+'-fold',wide:t.key+'-wide'},n=>load('crappy:'+n,USER['crappy:'+n]));
 return shape.pick(W,H,{wide:'bg-'+t.key,tall:'bg-'+t.key+'-tall',fold:'bg-'+t.key+'-fold'},n=>FS.picture(n));}
Object.assign(exports,{FLAPPY_FIT,themes,pickTheme,objectsOf,itemImg,background});
