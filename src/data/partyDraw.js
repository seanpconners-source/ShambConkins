// Drawable prompts for "Draw It", grouped by category so decoys always come from the same category.
const CATS={
 film:{label:'Movie props',icon:'🎬'},tv:{label:'TV worlds',icon:'📺'},game:{label:'Video games',icon:'🕹️'},critter:{label:'Famous critters',icon:'🐾'},
 food:{label:'Pop-culture food',icon:'🍕'},ride:{label:'Rides & gadgets',icon:'🚀'},hero:{label:'Heroes & monsters',icon:'🦸'},stage:{label:'Music & stage',icon:'🎸'}
};
const P={
 film:['DeLorean time machine','Lightsaber','Ruby slippers','Golden ticket','Shark fin (Jaws)','Sinking ocean liner','Flying bicycle at the moon','T-Rex chasing a jeep','The One Ring','Wizard hat and wand','Pirate ship','Magic carpet','Giant gorilla on a skyscraper','Ghostbusters ghost','Fedora and whip','Pink convertible','Dinosaur egg','Clapperboard','Haunted mansion','Rocket to the Moon','Boombox on a shoulder','Flux capacitor'],
 tv:['Paddy’s Pub rat','Iron Throne','Pink-frosted donut','Krusty Krab','Portal gun','Ream of paper','Orange couch in a coffee shop','Skateboard and slingshot','Pork-pie hat and sunglasses','Christmas lights on a wall','Baby alien sipping soup','Dungeon-and-dragons board','Giant moustache','Evil tented fingers','Blue police box','Giant creepy doll','Burger restaurant with a tall sign','Pickle with a face','Cheese-wheel village','Dancing hot dog','Mysterious island hatch'],
 game:['Pac-Man ghost','Red-and-white mushroom','Green creeper face','Poké Ball','Falling L-shaped block','Heart container','Spinning gold ring','Crewmate with a visor','Angry bird with eyebrows','Banana peel on a track','Space Invader','Diamond pickaxe','Rolling barrel','Round pink puffball','Laughing duck-hunt dog','Retro joystick','Giant boss with a crown','Glowing treasure chest','Cartoon plumber moustache','Pixel sword','Floating question block'],
 critter:['Shark with sharp teeth','Lion cub on a cliff','Orange clown fish','Lasagna-loving orange cat','Dog on a doghouse roof','Frog with a banjo','Yellow electric mouse','Great Dane in a van','Blue forgetful fish','Bear with a honey pot','Flying elephant with big ears','Giant lizard breathing fire','Giant ape','Collie dog','Black dragon with big eyes','Mouse with round ears','Duck in a sailor hat','White cat with a bow','Blue hedgehog running','Talking donkey','Penguin in a bow tie'],
 food:['Burger with a secret recipe','Giant lasagna','Birthday cake with candles','Slice of pepperoni pizza','Chocolate river','Foaming mug of butterbeer','Tall pancake stack','Hot dog with mustard zigzag','Dropped ice-cream cone','Tomato soup can','Spaghetti and a meatball','Giant chocolate-chip cookie','Popcorn bucket','Sushi roll with chopsticks','Banana split','Wheel of cheese','Taco in a holder','Donut with sprinkles','Coffee cup with steam','Gingerbread man','Cupcake with a cherry'],
 ride:['Bat-themed car','Spaceship with a laser','Hot air balloon','Magic school bus','Van with a dog inside','Ambulance with ghost on top','Red race car with a smile','Yellow submarine','UFO beaming up a cow','Jet pack','Hoverboard','Big-wheel bicycle','Rocket with flames','Ice-cream truck','Army tank','Pirate galleon','Steam train','Monster truck','Flying saucer','Moon rover','Robot with a tin body'],
 hero:['Bat symbol','Red cape','Spider-web slinger','Hammer with lightning','Round shield with a star','Black helmet with a cape','Wide villain grin','Golden rope lasso','Giant green fist','Red-and-gold helmet','Three metal claws','Mad scientist with a monster','Wrapped mummy','Witch on a broom','Zombie hand rising from soil','Ghost in a sheet','Werewolf howling at the moon','Vampire with a cape and fangs','Genie out of a lamp','Dragon on a treasure pile','Wizard in a tall hat'],
 stage:['Electric guitar','Shiny disco ball','Microphone on a stand','Grand piano','Drum kit','Retro boombox','Vinyl record','Big headphones','Ukulele','Trumpet','Cowboy hat and boots','Top hat and cane','Stage spotlight','Ballet shoes','Golden crown','Gold medal on a ribbon','Trophy cup','Karaoke screen','Magic wand with sparkles','Red carpet and ropes']
};
const PROMPTS=[];
for(const cat of Object.keys(P))for(const text of P[cat])PROMPTS.push({cat,text});
// Returns {prompt, options:[6 strings shuffled], answer:index}
function makeRound(prompt,rand,shuffle){
 const same=PROMPTS.filter(p=>p.cat===prompt.cat&&p.text!==prompt.text);
 const decoys=shuffle(same,rand).slice(0,5);
 const options=shuffle([prompt,...decoys],rand);
 return {prompt,options:options.map(o=>o.text),answer:options.findIndex(o=>o.text===prompt.text)};
}
Object.assign(exports,{PROMPTS,CATS,makeRound});
