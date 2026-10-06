// Correct property identities. These built-in wordmarks remain visible offline;
// a strictly matched property-page logo can replace them in the browser.
const LOGO_CORRECTIONS=[
 ['Fargo','Fargo','Fargo (1996 film)',['F A R G O'],'#df4545'],
 ['30 Rock','30 Rock','30 Rock',['30','ROCK'],'#f4e5a1'],
 ['Star Wars','Star Wars','Star Wars',['STAR','WARS'],'#ffe05a'],
 ['Alien','Alien','Alien (film)',['A L I E N'],'#c9f0cc'],
 ['Aliens','Aliens','Aliens (film)',['A L I E N S'],'#c3dff3'],
 ['Predator','Predator','Predator (film)',['PREDATOR'],'#ec5143'],
 ['Evil Dead','Evil Dead','The Evil Dead',['EVIL DEAD'],'#f25b48'],
 ['The Fifth Element','The Fifth Element','The Fifth Element',['THE FIFTH','ELEMENT'],'#ffc168'],
 ['Jurassic Park','Jurassic Park','Jurassic Park (film)',['JURASSIC PARK'],'#ffe3a0'],
 ['Wayne’s World','Wayne’s World',"Wayne's World (film)",['WAYNE’S','WORLD'],'#c5d6ff'],
 ['Zoolander','Zoolander','Zoolander',['ZOOLANDER'],'#f2e7d9'],
 ['Nathan for You','Nathan for You','Nathan for You',['NATHAN','FOR YOU'],'#f8db66'],
 ['I Think You Should Leave','I Think You Should Leave','I Think You Should Leave with Tim Robinson',['I THINK YOU','SHOULD LEAVE'],'#ffe599'],
 ['Curb Your Enthusiasm','Curb Your Enthusiasm','Curb Your Enthusiasm',['CURB YOUR','ENTHUSIASM'],'#f3f0e6'],
 ['Garth Marenghi’s Darkplace','Garth Marenghi’s Darkplace',"Garth Marenghi's Darkplace",['GARTH MARENGHI’S','DARKPLACE'],'#f0b75d'],
 ['Review','Review','Review (TV series)',['REVIEW','WITH FORREST MACNEIL'],'#b8dceb'],
 ['Rambo','Rambo','Rambo (franchise)',['RAMBO'],'#ef5a48'],
 ['Jay and Silent Bob','Mallrats','Mallrats',['MALLRATS'],'#dba7ef'],
 ['Jackie Chan','Jackie Chan Adventures','Jackie Chan Adventures',['JACKIE CHAN','ADVENTURES'],'#ffb370'],
 ['The Big Lebowski','The Big Lebowski','The Big Lebowski',['THE BIG','LEBOWSKI'],'#eec498'],
 ['Mars Attacks!','Mars Attacks!','Mars Attacks!',['MARS','ATTACKS!'],'#bbed76'],
 ['Unlimited Savory Systems','Unlimited Savory Systems','',['UNLIMITED SAVORY','SYSTEMS · R&D LAB'],'#b7f5cf'],
 ['Terminator','Terminator','The Terminator',['TERMINATOR'],'#d6362f'],
 ['Men in Black','Men in Black','Men in Black (1997 film)',['MEN IN','BLACK'],'#e8eef7'],
 ['Jackass','Jackass','Jackass (franchise)',['jackass'],'#f2efe4'],
 ['Star Trek','Star Trek','Star Trek',['STAR TREK'],'#f3c64a'],
 ['Back to the Future','Back to the Future','Back to the Future',['BACK TO THE','FUTURE'],'#f08a3c'],
 ['Home Alone','Home Alone','Home Alone',['HOME ALONE'],'#e5493e'],
 ['Austin Powers','Austin Powers','Austin Powers (franchise)',['AUSTIN','POWERS'],'#e8b73a'],
 ['The Matrix','The Matrix','The Matrix',['THE MATRIX'],'#57d683'],
 ['Mortal Kombat','Mortal Kombat','Mortal Kombat',['MORTAL','KOMBAT'],'#e8452c'],
 ['Power Rangers','Power Rangers','Power Rangers',['POWER','RANGERS'],'#f2554a'],
 ['GoldenEye','GoldenEye 007','GoldenEye 007',['GOLDENEYE','007'],'#f1c94d'],
 ['The Mighty Ducks','The Mighty Ducks','The Mighty Ducks',['THE MIGHTY','DUCKS'],'#52b8a8'],
 ['Die Hard','Die Hard','Die Hard',['DIE HARD'],'#e24b3b'],
 ['Chuck Norris','Chuck Norris','Chuck Norris',['CHUCK','NORRIS'],'#d9b47a']
].map(([source,name,page,lines,color])=>({source,name,page,lines,color}));
function logoCorrection(name){return LOGO_CORRECTIONS.find(row=>row.source===name)||null;}
// Built-in wordmarks for franchises whose live logo lookup can land on a sequel or
// spin-off (e.g. Terminator -> Sarah Connor Chronicles, Men in Black -> MIB II).
const PINNED_WORDMARKS=new Set(['Fargo','Jurassic Park','Alien','Aliens','Predator','Star Wars','Terminator','Men in Black','Jackass','Star Trek','Back to the Future','Home Alone','Austin Powers','The Matrix','Mortal Kombat','Power Rangers','GoldenEye','The Mighty Ducks','Die Hard','Chuck Norris']);
function pinnedFilmLogoURL(name){return PINNED_WORDMARKS.has(name)?correctedLogoURL(name):'';}
const cache=new Map();
function correctedLogoURL(name){const row=logoCorrection(name);if(!row)return '';if(cache.has(name))return cache.get(name);
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const height=row.lines.length===1?100:164,outline=name==='Star Wars',decor=name==='Predator'?'<path d="M25 25l-14 51m23-51L20 76m23-51L29 76" stroke="#ec5143" stroke-width="4"/>':name==='Jurassic Park'?'<path d="M30 53l18-24 35 3 12 12-21 4 17 11-36 3-9 24-5-24-21 15z" fill="#efb558"/>':'';
 const texts=row.lines.map((line,i)=>{const small=name==='Review'&&i===1,size=Math.min(small?24:75,570/Math.max(1,line.length*.63));return `<text x="320" y="${row.lines.length===1?77:67+i*74}" text-anchor="middle" font-family="Arial Black,Impact,Arial,sans-serif" font-weight="900" font-size="${size}" fill="${outline?'#161d25':row.color}" stroke="${outline?row.color:'#161d25'}" stroke-width="${outline?3:4}" paint-order="stroke" letter-spacing="${name==='Alien'?3:1}">${escape(line)}</text>`;}).join('');
 const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 ${height}" role="img" aria-label="${escape(row.name)} reference wordmark">${decor}${texts}</svg>`);cache.set(name,url);return url;
}
function propertyLogoCandidate(title,source){
 const row=logoCorrection(source),text=String(title||'').replace(/[_-]/g,' ').toLowerCase();
 if(!/logo|wordmark|logotype/.test(text)||/wiki|commons|disambig|law firm|lawfirm|avp|alien vs|resident evil/.test(text)&&!/^Resident Evil/.test(source))return false;
 if(source==='Fargo'&&/wells|bank|financial|television|tv logo/.test(text))return false;
 if(source==='Jurassic Park'&&/jeep|vehicle|car logo|ford|land rover|license plate/.test(text))return false;
 if(source==='Review'&&!/macneil|television|tv|comedy/.test(text))return false;
 const words=(row?.name||source).toLowerCase().replace(/[^a-z0-9 ]/g,'').split(' ').filter(w=>w.length>2&& !['the','for','your','with'].includes(w));
 return words.length>0&&words.every(word=>text.includes(word));
}

Object.assign(exports,{LOGO_CORRECTIONS,logoCorrection,pinnedFilmLogoURL,correctedLogoURL,propertyLogoCandidate});