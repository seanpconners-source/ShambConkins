// BASEketball Shootout callouts (owner, Nov 14: "instead of swish brick airball it should say fuck yea, or extremely rude
// shit when you brick or airball, like the psych outs"). {name} = the shooter. Same rules as psychOuts.js: crude, filthy,
// personal; no slurs, nothing about race, religion, disability or sexuality as an insult. CLEAN = Settings → Clean chat.
const MAKE=['FUCK YEA!','FUCK YEAH, BABY!','HELL YES!','COUNT THAT SHIT!','BOOM, MOTHERFUCKER!','SUCK IT!','IN YOUR FACE!','DAMN RIGHT!','WHO\'S YOUR DADDY?','GET SOME!','OH HELL YEAH!','BUTTER!','CASH MONEY!','EAT IT!'];
const SWISH=['NOTHING BUT NET, BITCHES!','FUCK YEA! ALL NET!','SWISH, MOTHERFUCKER!','DADDY\'S HOME!','SO WET!','SMOOTH AS HELL!'];
const BRICK=['BRICK! BUILD A HOUSE, {name}!','YOU SHOOT LIKE SHIT, {name}!','WHAT THE FUCK WAS THAT?','MY GRANDMA SHOOTS BETTER, AND SHE\'S DEAD!','NICE BRICK, DUMBASS!','CLANK! YOU SUCK!','OPEN YOUR EYES, SHITHEAD!','{name} IS A FRAUD!','YOU THROW LIKE YOUR ARMS CAME FROM IKEA!','HOLY SHIT, THAT WAS UGLY!'];
const AIRBALL=['AIRBALL, DUMBASS!','AIIIRBALL! AIIIRBALL!','DID YOU EVEN AIM, {name}?','THAT DIDN\'T TOUCH SHIT!','MISSED THE WHOLE FUCKING HOOP!','GO HOME, {name}!','YOUR MOM SAW THAT!','NOT EVEN CLOSE, JACKASS!','{name} SHOOTS LIKE A WET NOODLE!','ARE YOU DRUNK?'];
const RIMOUT=['SO CLOSE AND STILL SHIT!','IN AND OUT, LIKE YOUR LOVE LIFE!','RIMMED OUT, LOSER!','THE RIM HATES YOU, {name}!','CHOKE!'];
const LIGHTNING=['LIGHTNING BONUS, MOTHERFUCKER!','HE\'S ON FIRE!','LIGHTNING! FUCK YEA!','UNSTOPPABLE!'];
const CLEAN={MAKE:['YEAH!','HECK YES!','COUNT IT!','IN YOUR FACE!','BOOM!','BUTTER!'],SWISH:['SWISH!','NOTHING BUT NET!','ALL NET!'],BRICK:['BRICK!','CLANK!','UGLY!','NICE BRICK, {name}!'],AIRBALL:['AIRBALL!','NOT EVEN CLOSE!','DID YOU AIM?'],RIMOUT:['RIMMED OUT!','SO CLOSE!'],LIGHTNING:['LIGHTNING BONUS!','ON FIRE!']};
const ALL={MAKE,SWISH,BRICK,AIRBALL,RIMOUT,LIGHTNING};
function shootoutLine(kind,name,{clean=false,rand=Math.random}={}){const list=(clean?CLEAN:ALL)[kind]||MAKE;return list[Math.floor(rand()*list.length)].replace(/\{name\}/g,String(name||'ROOKIE').toUpperCase());}
Object.assign(exports,{shootoutLine});
