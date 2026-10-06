const {CASINO_THEMES}=require("src/data/tacticalItems.js");
const {hydrateEntityArt, restoreEntityMedia}=require("src/entityMedia.js");
const {normalizeSource, SOURCE_UNIVERSE}=require("src/references.js");
const {ORIGINAL_LOGOS}=require("src/data/logos.js");
const {slug, escapeHTML}=require("src/utils.js");
const {store}=require("src/state.js");
const {ART}=require("src/data/art.js");
const {logoCorrection, propertyLogoCandidate}=require("src/propertyLogos.js");
const PAGES={
 'The Mighty Ducks':'The Mighty Ducks (film)','Uno':'Uno (card game)','WarioWare':'WarioWare',
 'Men in Black':'Men in Black (1997 film)','James Bond':'James Bond','Casino Royale':'Casino Royale (2006 film)','Elvis Presley':'Elvis Presley','The Hangover':'The Hangover',
 'Kingpin':'Kingpin (1996 film)','The Color of Money':'The Color of Money','Django Unchained':'Django Unchained','Caddyshack':'Caddyshack',
 'RoboCop':'RoboCop','Total Recall':'Total Recall (1990 film)','Return of the Living Dead':'The Return of the Living Dead','Evil Dead':'The Evil Dead',
 'GUTS':'Nickelodeon Guts','House (1977)':'House (1977 film)','Hausu':'House (1977 film)','Friendship':'Friendship (2024 film)','Sleep':'Sleep (band)',
 'The Chair Company':'The Chair Company','On Cinema at the Cinema':'On Cinema','Megatouch':'Megatouch',
 'Always Sunny':"It's Always Sunny in Philadelphia",'The Office':'The Office (American TV series)',
 'Jackass':'Jackass (franchise)','Black Sabbath':'Black Sabbath','Kitchen Nightmares':'Kitchen Nightmares',
 'Super Mario':'Mario','Hunter × Hunter':'Hunter × Hunter','Star Trek':'Star Trek',
 'Garth Marenghi’s Darkplace':"Garth Marenghi's Darkplace",'Wayne’s World':"Wayne's World (film)",
 'Bob’s Burgers':"Bob's Burgers",'The Traitors':'The Traitors (American TV series)',
 'Nirvanna the Band the Show':'Nirvanna the Band the Show','Review':'Review (TV series)',
 'Taskmaster':'Taskmaster (TV series)','Terminator':'The Terminator','Alien':'Alien (film)',
 'Aliens':'Aliens (film)','Predator':'Predator (film)','Troma':'Troma Entertainment',
 'Cronenberg':'David Cronenberg','Tarantino':'Quentin Tarantino','Spielberg':'Steven Spielberg',
 'Matt & Trey':'Trey Parker','Planet Coaster 2':'Planet Coaster 2','Planet Coaster':'Planet Coaster',
 'Batman (1989)':'Batman (1989 film)','Doom Metal':'Doom metal','WarGames':'WarGames',
 'Seinfeld':'Seinfeld','Yachty':'Yahtzee','Metal Gear':'Metal Gear','Metal Gear Solid':'Metal Gear Solid',
 'The Thing':'The Thing (1982 film)','Halloween':'Halloween (1978 film)','The Fly':'The Fly (1986 film)',
 'The Godfather':'The Godfather','The Warriors':'The Warriors (film)','The Rehearsal':'The Rehearsal (TV series)',
 'Crossy Road':'Crossy Road','Hole.io':'Hole.io','Trials':'Trials (series)',
 'Happy Gilmore':'Happy Gilmore','The League':'The League','Mars Attacks!':'Mars Attacks!',
 'GoldenEye':'GoldenEye','GoldenEye 007':'GoldenEye 007 (1997 video game)',
 'I Think You Should Leave':'I Think You Should Leave with Tim Robinson',
 'Rocko’s Modern Life':"Rocko's Modern Life",'Tim and Eric':'Tim and Eric Awesome Show, Great Job!',
 'Face/Off':'Face/Off','Groundhog Day':'Groundhog Day (film)'
};
const PERSONAL=/^(Home(?:$| )|ShambConkins|House |Snack Lore|Flavor Lab|Motivational Poster|Recruiting|Unlimited Savory Systems|Music$|Game Mutation|Arcade$|Casino$|Action Icons|Comedy TV|Vietnamese Food)/;
function mediaSource(source){const name=normalizeSource(source),page=logoCorrection(name)?.page||PAGES[name]||name.replace(/[’‘]/g,"'");const local=PERSONAL.test(name);return {name,page,local,article:local?'':'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.replace(/ /g,'_')),search:'https://commons.wikimedia.org/w/index.php?search='+encodeURIComponent((logoCorrection(name)?.name||name)+' logo')+'&title=Special:MediaSearch&type=image',logoName:logoCorrection(name)?.name||name,original:ORIGINAL_LOGOS['logo:'+slug(source)]||ORIGINAL_LOGOS['logo:'+slug(name)]||''};}
const MEDIA_SOURCES=[...new Set([...SOURCE_UNIVERSE,...CASINO_THEMES.map(t=>t.source),'Kitchen Nightmares','Stranger Things','Hole.io','Crossy Road','Trials','Face/Off','Groundhog Day','Bob’s Burgers / Kitchen Nightmares','Crank 2 / Fast & Furious','Friday the 13th / A Nightmare on Elm Street'].map(normalizeSource))].map(mediaSource);
function referenceArtHTML(source,cls='reference-art',query=''){const ref=mediaSource(source),offline=ART['reference:'+slug(ref.name)];return `<div class="${cls} ${offline?'has-media':''}" data-reference-art="${escapeHTML(ref.name)}"><img ${offline?`src="${offline}" data-media-queued="true"`:''} data-reference-media="${escapeHTML(ref.name)}" data-media-kind="art" data-media-query="${escapeHTML(query)}" alt="${escapeHTML(query||ref.name)} artwork" ${offline?'':'hidden'} loading="lazy" referrerpolicy="no-referrer"><span class="reference-art-label">${escapeHTML(query||ref.name)}</span></div>`;}

// Media lookups run in the player's browser. No game action awaits a network
// request. At most two requests at once, each with an eight-second deadline.
const cache=new Map(),jobs=[],waiting=new Map();let active=0,offlineUntil=0,scheduled=false;
async function api(params,host='en.wikipedia.org'){const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),8000);try{const response=await fetch('https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',origin:'*',...params}),{signal:controller.signal,referrerPolicy:'no-referrer'});if(!response.ok)throw new Error('Media HTTP '+response.status);return await response.json();}finally{clearTimeout(deadline);}}
async function lookupMedia(source){const ref=mediaSource(source);if(ref.local)return {};const data=await api({action:'query',titles:ref.page,redirects:'1',prop:'pageimages',piprop:'thumbnail',pithumbsize:'720'}),page=Object.values(data.query?.pages||{}).find(p=>!p.missing&&p.thumbnail);const art=page?.thumbnail?.source||'';
 const files=await api({action:'query',titles:ref.page,redirects:'1',generator:'images',gimlimit:'50',prop:'imageinfo',iiprop:'url'});
 const images=Object.values(files.query?.pages||{}).filter(p=>p.imageinfo?.[0]?.url);
 let logo=images.find(p=>propertyLogoCandidate(p.title,ref.name))?.imageinfo[0].url||'';
 if(!logo){try{const results=await api({action:'query',generator:'search',gsrsearch:'"'+ref.name+'" logo',gsrnamespace:'6',gsrlimit:'5',prop:'imageinfo',iiprop:'url'},'commons.wikimedia.org');const candidates=Object.values(results.query?.pages||{});const words=ref.name.toLowerCase().replace(/[^a-z0-9 ]/g,'').split(' ').filter(w=>w.length>2);logo=candidates.find(p=>propertyLogoCandidate(p.title,ref.name))?.imageinfo?.[0]?.url||'';}catch{}}
 return {logo,art,article:ref.article,at:Date.now()};
}
function apply(node,result){const kind=node.dataset.mediaKind,url=result[kind];if(!url)return;node.onerror=()=>{if(kind==='art'){node.hidden=true;}else if(node.dataset.fallback){node.src=node.dataset.fallback;}node.onerror=null;};node.src=url;node.hidden=false;node.dataset.mediaLoaded='true';if(kind==='art')node.parentElement?.classList.add('has-media');}
function pump(){if(active>=2||!jobs.length||Date.now()<offlineUntil)return;const source=jobs.shift();active++;lookupMedia(source).then(result=>{cache.set(source,result);for(const node of waiting.get(source)||[])if(node.isConnected!==false)apply(node,result);try{localStorage.setItem('shambconkins-media-v2',JSON.stringify([...cache].slice(-180)));}catch{}}).catch(()=>{offlineUntil=Date.now()+60000;}).finally(()=>{waiting.delete(source);active--;pump();});pump();}
function hydrateMedia(){scheduled=false;hydrateEntityArt();if(!store.profile?.settings.originalLogos||typeof fetch!=='function')return;for(const node of document.querySelectorAll('[data-reference-media]')){if(node.dataset.mediaQueued)continue;node.dataset.mediaQueued='true';const source=normalizeSource(node.dataset.referenceMedia);if(cache.has(source)){apply(node,cache.get(source));continue;}if(mediaSource(source).local)continue;if(!waiting.has(source)){waiting.set(source,[]);jobs.push(source);}waiting.set(source,waiting.get(source).filter(n=>n.isConnected!==false));waiting.get(source).push(node);}pump();}
function installMedia(){restoreEntityMedia();try{for(const[key,value]of JSON.parse(localStorage.getItem('shambconkins-media-v2')||'[]'))if(value&&typeof value==='object')cache.set(key,value);}catch{}if(typeof MutationObserver!=='undefined'){new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(hydrateMedia);}}).observe(document.body,{childList:true,subtree:true});}hydrateMedia();}
function sourcesHTML(page=0){const start=page*10,list=MEDIA_SOURCES.slice(start,start+10);return `<div class="media-source-list">${list.map(ref=>`<div><b>${escapeHTML(ref.name)}</b> ${ref.local?'Local/personal artwork':`<a href="${ref.article}" target="_blank" rel="noopener">Property page</a> · <a href="${ref.search}" target="_blank" rel="noopener">Find logo/images</a>`}</div>`).join('')}</div><p class="media-note">Online images load when available. These property/search links are collection leads; network verification was unavailable in this build environment. Original asset URLs are preserved in the downloadable source list.</p>`;}

Object.assign(exports,{mediaSource,MEDIA_SOURCES,referenceArtHTML,lookupMedia,hydrateMedia,installMedia,sourcesHTML});