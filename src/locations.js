const {REFERENCE_LANDMARKS}=require("src/references.js");
const {LAB_LOCATION}=require("src/data/savoryLab.js");
const LOCATIONS = [
 ['mighty-ducks-rink','Mighty Ducks Ice Rink','The Mighty Ducks','body','🏒',[],'Quack, quack! A five-shot hockey challenge. A first win recruits Emilio Estevez / Coach Bombay to the winner’s roster.'],
 ['parents','My Parents’ House','Home','mind','🏡',['kc','mylo','chris-parent','angie-parent'],'A familiar driveway. Say hello to Mom, Dad and two extremely good dogs.'],
 ['dunder','Dunder Mifflin / Scranton','The Office','mind','🏢',['michael-scott','dwight-schrute','jim-halpert','pam-beesly'],'The paper business has become unnecessarily competitive.'],
 ['dunshire','The Cones of Dunshire','Parks and Recreation','mind','🔶',['ben-wyatt'],'You forgot the essence of the game. Again.'],
 ['paddys','Paddy’s Pub','Always Sunny','mind','🍻',['charlie','mac','dee','dennis','frank'],'The health inspection is not going well.'],
 ['quarks','Quark’s','Star Trek','mind','🛸',['quark','worf','sisko','data','picard'],'The house takes a cut. The house also has ears.'],
 ['kitchen','Kitchen Nightmares','Kitchen Nightmares','body','🍳',['gordon-ramsay'],'The fridge is a crime scene. A chef has arrived to fix it.'],
 ['hill-valley','Hill Valley','Back to the Future','body','🕰️',['docbrown','marty'],'Roads? The board has a few.'],
 ['goon-docks','Goon Docks','The Goonies','body','🏴‍☠️',['mikey-goonies','chunk-goonies','sloth-goonies'],'A new route. Absolutely no treasure map confidence.'],
 ['kingston','Kingston Falls','Gremlins','body','🌙',['gizmo','stripe'],'The snack bar closes at midnight. For very good reasons.'],
 ['nick','Nickelodeon Studios','90s Nickelodeon','mind','🟠',['tommy-pickles','helga-pataki','rocko-wallaby','kel-kimble'],'An alarming amount of orange slime.'],
 ['tournament','World Martial Arts Tournament','Dragon Ball Z','body','🐉',['goku','vegeta','piccolo','bulma'],'The power level is the least of your problems.'],
 ['hunter','Hunter Association','Hunter × Hunter','spirit','🎣',['gon-freecss','killua-zoldyck','kurapika','leorio'],'An exam with unusually flexible safety standards.'],
 ['area51','Area 51','Mars Attacks!','body','🛸',['mars-attacker'],'Nothing to see. Except all of that.'],
 ['rivoli','The Rivoli','Nirvanna the Band the Show','spirit','🎸',['matt-ntbts','jay-ntbts'],'Tonight could finally be the night.'],
 ['ohio','Ohio University','Home','mind','🎓',[],'College Green. A suspiciously nostalgic shortcut.'],
 ['cincinnati','Cincinnati Riverfront','Home','body','🌉',[],'The river has brought a very strange visitor.'],
 ['chicago','Chicago','Home','body','🚇',['ferris','cameron-frye'],'Life moves pretty fast. Especially on this board.'],
 ['indy','Indianapolis','Home','spirit','🏎️',[],'You have somehow entered a much smaller race.'],
 ['rainbow','Rainbow Road','Super Mario','spirit','🌈',['mario','luigi'],'No guardrails. Several questionable decisions.'],
 ['matrix','The Construct','The Matrix','spirit','☎️',['neo','trinity-matrix','morpheus-matrix'],'Reality has disconnected. Reconnect at your convenience.'],
 ['klendathu','Klendathu','Starship Troopers','body','🪲',['rico'],'Would you like to know more? Preferably from behind cover.'],
 ['taskhouse','Taskmaster House','Taskmaster','mind','📏',['taskmaster','alex'],'All the information is on the task. Almost.'],
 ['bowling','Hollywood Star Lanes','The Big Lebowski','spirit','🎳',['the-dude','walter','donny'],'This aggression will probably affect your score.'],
 ['upside-down','The Upside Down','Stranger Things','spirit','🌫️',[],'Something has crawled between the spaces.']
].map(([id,name,source,realm,icon,characters,description])=>({id,name,source,realm,icon,characters,description}));
// Retain every existing landmark and give the full crossover catalog a route
// into each procedural run. Reference-specific visitor pools cover the long
// tail instead of silently limiting recruitment to the original 24 stops.
LOCATIONS.push(...REFERENCE_LANDMARKS.filter(l=>l.source!=='Unlimited Savory Systems'));
LOCATIONS.push(LAB_LOCATION);
const location = id => LOCATIONS.find(l => l.id === id);

Object.assign(exports,{LOCATIONS,location});