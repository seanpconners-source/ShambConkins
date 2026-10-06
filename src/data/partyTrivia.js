// Authored questions with concrete answers. Links are subject/episode pointers
// for review, not a claim that every individual answer was independently fetched.
// difficulty | question | correct answer | three distractors | explanation
const FACTS=`
@Always Sunny|comedy|It's Always Sunny in Philadelphia
e|Which gang member is nicknamed Sweet Dee?|Dee Reynolds|Artemis|The Waitress|Bonnie Kelly|Sweet Dee is Dennis Reynolds's sister, Dee.
e|Which actor plays Frank Reynolds?|Danny DeVito|Joe Pesci|Steve Buscemi|Albert Brooks|Danny DeVito joined the series as Frank in season two.
e|Which gang member shares a filthy apartment with Frank?|Charlie|Dennis|Dee|The Waitress|Charlie Kelly and Frank share Charlie's apartment.
e|Which city does the gang call home?|Philadelphia|Boston|Baltimore|Pittsburgh|Paddy's Pub and most of the gang's schemes are in Philadelphia.
e|Who is Charlie's longtime romantic obsession?|The Waitress|Artemis|Maureen Ponderosa|Gail the Snail|Charlie repeatedly tries to win over the Waitress.
e|Which gang member played by Rob McElhenney is known as Mac?|Ronald McDonald|Rickety Cricket|Rex|Luther Reynolds|Mac is Rob McElhenney's character, Ronald McDonald.
e|Which member of the gang writes The Nightman Cometh?|Charlie|Mac|Frank|Dennis|Charlie turns his Nightman song into a stage musical.
e|Who is Dennis Reynolds's twin sister?|Dee|Bonnie|Barbara|Artemis|Dennis and Dee are the Reynolds twins.
e|Which gang member enthusiastically claims expertise in bird law?|Charlie|Frank|Mac|Dee|Charlie repeatedly invokes his supposed bird-law expertise.
e|Which gang member deliberately gains weight during his season-seven Fat Mac phase?|Mac|Dennis|Charlie|Frank|Mac's weight gain becomes a recurring season-seven storyline.
m|Who does Danny DeVito's Frank portray in the Nightman musical?|The Troll|Dayman|Nightman|The Princess|Frank plays the toll-demanding Troll.
m|What is the gang's homemade wine served in to hide drinking in public?|Soda cans|Coffee mugs|Flowerpots|Milk cartons|Wine in a can is the gang's portable drinking workaround.
m|What is the first stage of the D.E.N.N.I.S. system?|Demonstrate value|Deny responsibility|Develop mystery|Demand attention|The first D stands for Demonstrate Value.
m|What clothing makes up Charlie’s Green Man costume?|A green bodysuit|A tuxedo|A referee shirt|A striped bathrobe|Green Man is Charlie’s all-green full-body costume.
m|Which former priest becomes Rickety Cricket?|Matthew Mara|Luther McDonald|Bruce Mathis|Bill Ponderosa|Matthew Mara's association with the gang leads to his Cricket identity.
m|What bird is Dee frequently compared to?|An ostrich|A penguin|A toucan|A flamingo|The gang repeatedly mocks Dee with ostrich and bird comparisons.
m|What does Charlie use as earplugs in Charlie Goes America All Over Everybody's Ass?|Cheese|Marshmallows|Gum|Bread|Charlie inserts cheese into his ears to avoid hearing criticism.
m|What kind of sporting event is Flipadelphia?|Flip cup|Darts|Bowling|Air hockey|Flipadelphia is the gang's flip-cup tournament tradition.
m|Which cult action film does the gang try to see without missing its opening?|Thunder Gun Express|Dayman Returns|Lethal Weapon 8|The Nightman Cometh|Thunder Gun Express is the film the gang races to attend.
m|What alcohol does Frank soak his ham in during the Jersey Shore trip?|Rum|Vodka|Gin|Tequila|Frank's rum-soaked ham is meant to let him eat and get drunk at the same time.
h|What does the first N in the D.E.N.N.I.S. system stand for?|Nurture dependence|Neglect emotionally|Never apologize|Name a price|Nurture dependence precedes the later Neglect emotionally step.
h|Which school nickname did Dee have because of her back brace?|The Aluminum Monster|The Tin Princess|The Iron Swan|The Copper Queen|Dee's school back brace earned her the Aluminum Monster nickname.
h|What is the name of Mac's father?|Luther|Bruce|Matthew|Bill|Luther McDonald is Mac's father.
h|What vehicle brand's image does Dennis obsessively associate with his identity?|Range Rover|Jeep|Cadillac|Subaru|Dennis repeatedly treats his Range Rover as a status symbol.
h|Which gang member develops the chemical-cleaning routine called Charlie work?|Charlie|Dee|Mac|Dennis|Charlie handles the bar's least desirable maintenance and cleaning.
h|What alias does Frank use while posing as a high-end art collector?|Ongo Gablogian|Art Vandelay|H.E. Pennypacker|Dr. Mantis Toboggan|Ongo Gablogian is Frank's art-world persona in Dee Made a Smut Film.
h|Which animal repeatedly interferes with Dee's attempts to be taken seriously in Who Got Dee Pregnant?|An ostrich|A goat|A chimpanzee|A horse|Different memories of the party depict Dee as an ostrich.
h|Which pair form the undefeated team in the original Chardee MacDennis episode?|Dennis and Dee|Charlie and Frank|Mac and Frank|Mac and Dee|Dennis and Dee dominate Charlie and Mac's team in the original game.
h|What is the third Chardee MacDennis stage called?|Spirit|Chaos|Fortune|Horror|The original sequence is Mind, Body, then Spirit; Horror is proposed in the sequel.
h|In Mac and Dennis Move to the Suburbs, what food does Mac repeatedly cook?|Mac and cheese|Chicken pot pie|Spaghetti|Tacos|Mac's monotonous mac-and-cheese meals wear Dennis down.
x|What name does Charlie obsessively read on envelopes in his mailroom conspiracy?|Pepe Silvia|Antonio Banderas|Vic Vinegar|Hugh Honey|Pepe Silvia drives Charlie's conspiracy board in Sweet Dee Has a Heart Attack.
x|Which department does Charlie claim the missing Carol works in?|Human resources|Accounting|Shipping|Sales|Charlie insists Carol from H.R. is also part of his mailroom mystery.
x|What is Frank's doctor alias with an insect in the name?|Dr. Mantis Toboggan|Dr. Cricket Reynolds|Dr. Beetle McDonald|Dr. Wasp Mathis|Frank's invented medical identity is Dr. Mantis Toboggan.
x|What is the name of Dennis and Mac's suburban neighbor who comments on the heat?|Wally|Rex|Bill|Bruce|Wally's daily comments about the weather infuriate Dennis.
x|Which surname belongs to Dee's high-school rival Fatty Magoo?|Jansen|Ponderosa|Mara|Mathis|Ingrid Fatty Magoo Jansen is Dee's former classmate and a successful designer.
x|What is Charlie's intended outcome of staging The Nightman Cometh?|A marriage proposal to the Waitress|A record deal|An acting award|A new liquor license|Charlie stages the musical as part of a proposal to the Waitress.
x|What special Chardee MacDennis jail penalty involves a dog kennel?|Eating raw cake ingredients|Singing a ballad|Counting beans|Reciting a poem|The prisoner must eat the ingredients of a cake rather than a finished cake.
x|What are Mac and Dennis’s aliases during their real-estate scheme?|Vic Vinegar and Hugh Honey|Art Vandelay and Kel Varnsen|Pepe Silvia and Carol|Dayman and Nightman|Mac is Vic Vinegar and Dennis is Hugh Honey in The Gang Exploits the Mortgage Crisis.
x|Which proposed Chardee MacDennis sequel stage resembles Operation?|Horror|Memory|Cooking|Music|Frank introduces Horror using a frightening Operation-like challenge.
x|What is Mac and Charlie's gym-sales product named after a bodybuilder drink?|Fight Milk|Wolf Cola|Paddy's Juice|Crow Chow|Fight Milk is their crow-based bodyguard drink; Wolf Cola is a different Frank venture.
@South Park|comedy|South Park
e|What is Kyle's little brother called?|Ike|Craig|Clyde|Kevin|Ike Broflovski is Kyle's adopted younger brother.
e|Who owns Tegridy Farms?|Randy Marsh|Mr. Garrison|Jimbo Kern|Stephen Stotch|Randy leaves town for the Tegridy Farms business.
e|Which boy is frequently told he is grounded by his parents?|Butters|Stan|Kenny|Tweek|Stephen and Linda Stotch repeatedly ground Butters.
e|Which character is an anthropomorphic towel?|Towelie|Towellyn|Mr. Hankey|Terrance|Towelie is the towel who habitually reminds people to bring a towel.
e|Which boy wears a green ushanka and an orange jacket?|Kyle|Cartman|Stan|Clyde|Kyle's green hat distinguishes him from the other boys.
e|What is the name of Stan's older sister?|Shelley|Wendy|Heidi|Bebe|Shelley Marsh is Stan's older sister.
e|Which boy is known for a red jacket and a blue-and-yellow hat?|Eric Cartman|Kenny McCormick|Craig Tucker|Jimmy Valmer|Cartman's familiar winter outfit has a red jacket and blue/yellow hat.
e|Which two Canadians perform flatulence-based comedy?|Terrance and Phillip|Stan and Kyle|Tweek and Craig|Jimbo and Ned|Terrance and Phillip are Canada's fictional comedy duo.
e|What is the name of the school counselor?|Mr. Mackey|Mr. Adler|Mr. Hat|Mr. Slave|Mr. Mackey is the counselor known for saying m'kay.
e|Which black-haired girl regularly dates Stan?|Wendy Testaburger|Bebe Stevens|Heidi Turner|Annie Knitts|Wendy and Stan have an on-and-off relationship.
m|What is Butters's supervillain alter ego?|Professor Chaos|Mysterion|The Human Kite|Captain Hindsight|Butters becomes Professor Chaos after being rejected by his friends.
m|Which boy is revealed as the superhero Mysterion?|Kenny|Kyle|Stan|Craig|Kenny is Mysterion, whose return from death is central to the superhero story.
m|Who disguises himself as the robot AWESOM-O?|Cartman|Butters|Randy|Mr. Garrison|Cartman builds a cardboard robot disguise to trick Butters.
m|What is the theme restaurant Cartman desperately wants to visit?|Casa Bonita|Bennigan's|TGI Fridays|Paddy's Pub|Cartman sabotages Kyle's birthday invitation list to visit Casa Bonita.
m|What multiplayer game do the boys obsess over in Make Love, Not Warcraft?|World of Warcraft|EverQuest|RuneScape|Diablo II|The boys train to defeat a powerful World of Warcraft griefer.
m|Which Styx song does Cartman compulsively finish whenever he hears it begin?|Come Sail Away|Renegade|Babe|Mr. Roboto|Cartman's inability to stop singing Come Sail Away is revealed in Cartman's Mom Is Still a Dirty Slut.
m|Who is Stan's father?|Randy|Stephen|Stuart|Gerald|Randy and Sharon Marsh are Stan's parents.
m|Which character runs City Wok?|Tuong Lu Kim|Mr. Adler|Jimbo Kern|Principal Victoria|Tuong Lu Kim operates the Chinese restaurant City Wok.
m|Which wrestler name does Cartman adopt in W.T.F.?|The Bad Irene|The Coon|The Ginger Avenger|The Wildcard|Cartman uses the wrestling persona The Bad Irene.
m|What does Randy call his massive bowel movement's unit of measurement?|Courics|Rands|Bowels|Marshes|More Crap measures the record in Courics, named after Katie Couric.
h|Which band appears at the end of Scott Tenorman Must Die?|Radiohead|Primus|Metallica|The Cure|Radiohead arrives after Cartman's revenge and criticizes Scott's crying.
h|Who voices the singing Chef in the original seasons?|Isaac Hayes|Barry White|James Earl Jones|Danny Glover|Soul musician Isaac Hayes voiced Chef.
h|Who is Professor Chaos's sidekick?|General Disarray|Captain Hindsight|Fastpass|Mosquito|Dougie's villain persona is General Disarray.
h|Which boy becomes The Human Kite?|Kyle|Craig|Clyde|Jimmy|Kyle's superhero identity is the Human Kite.
h|Which rock musician voices himself in Mecha-Streisand?|Robert Smith|Ozzy Osbourne|Les Claypool|David Bowie|The Cure's Robert Smith helps battle Mecha-Streisand.
h|What fake organization does Cartman lead in the Ginger Kids episode?|The Ginger Separatist Movement|The Redhead Alliance|The Freckle Council|The Pale Nation|Cartman organizes the Ginger Separatist Movement after being made to appear ginger.
h|Which boy's parents run a coffee shop that drives his anxious behavior?|Tweek|Clyde|Craig|Scott|Tweek's parents operate Tweek Bros. Coffee.
h|What is the name of Kenny's younger sister?|Karen|Tricia|Annie|Sally|Karen McCormick is Kenny's younger sister.
h|Which superhero has the ability to know what should have happened after a disaster?|Captain Hindsight|Super Best Friend|The Human Kite|Mintberry Crunch|Captain Hindsight offers hindsight rather than practical rescue.
h|What is Cartman's hand-puppet con man's name?|Mitch Conner|Mr. Hat|Mr. Twig|Mr. Kitty|Mitch Conner is the identity attached to Cartman's hand puppet.
x|What number is printed as the model of Cartman's AWESOM-O robot?|4000|2000|9000|300|The cardboard disguise is A.W.E.S.O.M.-O 4000.
x|What is the name of the event Cartman stages for Scott Tenorman?|Chili Con Carnival|The Chili Bowl|South Park Chili Fest|The Tenorman Cookoff|Cartman's revenge is staged at his Chili Con Carnival.
x|What is Dougie's surname, underneath the General Disarray disguise?|O'Connell|Donovan|Stevens|Valmer|Dougie O'Connell serves as Professor Chaos's sidekick.
x|What is Butters's actual first name?|Leopold|Stephen|Edward|Kenneth|Butters is the nickname of Leopold Stotch.
x|Which company do the movie executives in AWESOM-O work for?|Catamount Pictures|Paramount Pictures|Funnybot Studios|Cartmanland Productions|Catamount Pictures hires the disguised Cartman for movie ideas.
x|What is the name of the weapon delivered by Randy in Make Love, Not Warcraft?|The Sword of a Thousand Truths|The Staff of Infinite Wisdom|The Blade of Azeroth|The Hammer of Justice|The Sword of a Thousand Truths gives the boys a chance against the griefer.
x|Which superhero name does Bradley Biggle use?|Mintberry Crunch|Fastpass|Tupperware|Wonder Tweek|Bradley is Mintberry Crunch, whose cosmic identity emerges in the Coon trilogy.
x|What surname does Michael Jackson use as the boys’ new neighbor in The Jeffersons?|Jefferson|Jacksonville|Johnson|Jenkins|Michael Jackson presents himself as Mr. Jefferson in The Jeffersons.
x|What is the name of Cartman's favorite stuffed frog?|Clyde Frog|Mr. Ribbit|Frogger|Kermit Marsh|Clyde Frog is Cartman's beloved stuffed toy.
x|What short film title launched South Park's Jesus-versus-Santa version?|The Spirit of Christmas|Christmas in Colorado|Santa's Revenge|The Snowman Cometh|The 1995 Jesus vs. Santa short is part of The Spirit of Christmas shorts.
@Seinfeld|comedy|Seinfeld
e|What New York borough is the main setting of Seinfeld?|Manhattan|Queens|The Bronx|Staten Island|Jerry and his friends spend much of the series on Manhattan's Upper West Side.
e|Who lives across the hall from Jerry?|Kramer|Newman|George|Puddy|Kramer regularly bursts into Jerry's apartment from across the hall.
e|What is Jerry's favorite kind of breakfast food displayed in his kitchen?|Cereal|Pancakes|Bagels|Eggs Benedict|Jerry's kitchen shelves hold numerous cereal boxes.
e|Which character regularly shoves people while saying Get out!?|Elaine|Susan|Estelle|Helen|Elaine's excited Get out shove is a recurring physical joke.
e|Who is the character most associated with Festivus?|Frank Costanza|Morty Seinfeld|David Puddy|Kenny Bania|Frank Costanza explains the Festivus traditions.
e|What name do the friends use for the strict soup-shop owner?|The Soup Nazi|The Soup Baron|The Broth King|The Ladle Man|The Soup Nazi is the show's nickname for the strict proprietor.
e|Which profession does George often pretend to have?|Architect|Surgeon|Firefighter|Pilot|George repeatedly fantasizes about or pretends to be an architect.
e|Which mail carrier is Jerry's frequent nemesis?|Newman|Bania|Peterman|Puddy|Newman lives in Jerry's building and antagonizes him.
m|What is the name of the coffee shop where the friends meet?|Monk's Café|Central Perk|The Peach Pit|Café Nervosa|Monk's Café is their regular meeting place.
m|Which publishing company employs both Elaine and, briefly, George?|Pendant Publishing|Dunder Mifflin|Vandelay Industries|Bluth Company|George and Elaine both have work connections to Pendant Publishing.
m|Which candy causes Elaine trouble with a boyfriend and Mr. Lippman in The Opposite?|Jujyfruits|Junior Mints|Milk Duds|Raisinets|Elaine stops for Jujyfruits and struggles to talk while her mouth is full.
m|What is George's employer after The Opposite?|The New York Yankees|The Mets|The Knicks|The Rangers|George's opposite strategy gets him hired by the Yankees.
m|What is Kramer's coffee-table book about?|Coffee tables|Golf courses|Cars|Swimming pools|Kramer's book about coffee tables also has fold-out legs.
m|What does George extract from the whale’s blowhole in The Marine Biologist?|A golf ball|A fishing hook|A plastic bag|A cork|George finds a golf ball that Kramer drove into the ocean.
m|What is the name of Elaine's on-and-off boyfriend who is a mechanic?|David Puddy|Joe Davola|Bob Sacamano|Lloyd Braun|David Puddy is a mechanic and Elaine's boyfriend.
m|What holiday complaint ritual precedes the Festivus feats of strength?|The airing of grievances|The telling of secrets|The polishing of the pole|The exchange of insults|The airing of grievances lets Frank announce disappointments.
h|What is the fake charity George invents?|The Human Fund|The Costanza Foundation|The Vandelay Trust|The People's Bank|George gives coworkers cards describing donations to the Human Fund.
h|What candy bar does George obsess over in The Dealership?|Twix|Snickers|Milky Way|Kit Kat|George becomes convinced the mechanic has taken his Twix.
h|What nickname does George's coworkers give him instead of T-Bone?|Koko|G-Bone|Coco Loco|Big Salad|George's attempted T-Bone nickname results in Koko.
h|Which diner-food invention does Elaine and Mr. Lippman sell?|Muffin tops|Bagel holes|Donut centers|Crustless pizza|Elaine's muffin-top idea leaves a problem disposing of the stumps.
h|What is the movie Elaine hates that everyone else seems to admire?|The English Patient|Rochelle, Rochelle|Sack Lunch|Chunnel|Elaine openly dislikes The English Patient.
h|What does Kramer install in his apartment to entertain talk-show guests?|The Merv Griffin Show set|The Tonight Show desk|A game-show wheel|A news studio|Kramer rebuilds the discarded Merv Griffin Show set in his apartment.
h|What rare dessert does Elaine secretly eat in The Frogger?|Antique cake from a royal wedding|A chocolate babka|A marble rye|A black-and-white cookie|Elaine eats Peterman's decades-old cake from King Edward VIII's wedding to Wallis Simpson.
h|Which seasonal fruit does Kramer crave in The Doodle?|Mackinaw peaches|Blood oranges|Rainier cherries|Concord grapes|Kramer treasures Mackinaw peaches and their brief annual season.
x|What is Jerry's apartment number in the main apartment used for most of the series?|5A|4B|3C|6D|Jerry's familiar apartment is 5A.
x|What is Kramer's industrialist alias at a store in The Puerto Rican Day?|H.E. Pennypacker|Art Vandelay|Kel Varnsen|Mr. Marbles|Kramer uses H.E. Pennypacker, while Jerry uses Kel Varnsen.
x|What surname does Elaine's boss at Pendant Publishing have?|Lippman|Wilhelm|Kruger|Pitt|Mr. Lippman runs Pendant Publishing.
x|What is the first name of Elaine’s coworker who dates George in The Little Kicks?|Anna|Sue Ellen|Wendy|Rachel|Anna starts dating George while Elaine struggles with the reaction to her dancing.
x|What is the name of George's boss at the Yankees?|Mr. Wilhelm|Mr. Kruger|Mr. Lippman|Mr. Pitt|Mr. Wilhelm supervises George at the Yankees.
x|What is the surname of the man Elaine works for before joining J. Peterman?|Pitt|Ross|Dalrymple|Chiles|Elaine becomes the personal assistant of Mr. Pitt.
x|What does Kramer announce when he abruptly quits the contest?|I’m out!|I’m finished!|I give up!|I concede!|Kramer places his money down and announces that he is out in The Contest.
x|Which specific golf brand's ball does George remove from the whale?|Titleist|Callaway|Wilson|Srixon|George recognizes a Titleist golf ball in The Marine Biologist.
@The Office|comedy|The Office (American TV series)
e|Who is the office receptionist when the series starts?|Pam Beesly|Kelly Kapoor|Angela Martin|Erin Hannon|Pam is the Scranton receptionist before becoming a salesperson.
e|Who constantly claims to be assistant regional manager?|Dwight Schrute|Kevin Malone|Stanley Hudson|Creed Bratton|Dwight prefers assistant regional manager over assistant to the regional manager.
e|Who puts Dwight's stapler inside gelatin?|Jim Halpert|Ryan Howard|Oscar Martinez|Andy Bernard|Jim's gelatin stapler prank appears in the pilot.
e|Which employee is known for crossword puzzles and being unimpressed with Michael?|Stanley Hudson|Toby Flenderson|Creed Bratton|Todd Packer|Stanley regularly ignores Michael while doing crosswords.
e|What is Michael Scott's middle name?|Gary|James|William|Robert|Michael's full name is Michael Gary Scott.
e|What is the name of Pam and Jim's first child?|Cecelia|Astrid|Phillip|Holly|Their first child is Cecelia, usually called Cece.
e|Which employee frequently shares an office with Michael as a temporary worker?|Ryan Howard|Dwight Schrute|Stanley Hudson|Meredith Palmer|Ryan enters the series as the temp before his corporate rise.
e|Which employee is a member of the accounting trio alongside Oscar and Kevin?|Angela Martin|Phyllis Vance|Kelly Kapoor|Erin Hannon|Angela, Oscar and Kevin work in accounting.
m|What is the name of Michael's screenplay and film?|Threat Level Midnight|Agent Michael Scarn|Scranton Justice|Goldenface Returns|Threat Level Midnight stars Michael's agent persona Michael Scarn.
m|Who is Michael's love interest from human resources?|Holly Flax|Karen Filippelli|Cathy Simms|Nellie Bertram|Holly Flax is Michael's partner and later fiancée.
m|What is the office cat Angela says Dwight killed?|Sprinkles|Bandit|Garbage|Princess Lady|Dwight kills the sick Sprinkles while cat-sitting.
m|What business does Bob Vance constantly identify himself with?|Vance Refrigeration|Vance Motors|Vance Plumbing|Vance Paper|Bob introduces himself with his refrigeration business.
m|What is Andy Bernard's college?|Cornell|Dartmouth|Princeton|Yale|Andy repeatedly mentions Cornell.
m|What does Kevin spill across the floor in his famous cold open?|Chili|Soup|Coffee|Macaroni|Kevin loses the pot of his carefully prepared chili.
m|Who is the Scranton branch's human-resources representative most disliked by Michael?|Toby Flenderson|David Wallace|Gabe Lewis|Clark Green|Michael treats Toby as an unwelcome obstacle.
m|What company buys Dunder Mifflin after its bankruptcy?|Sabre|WUPHF|Athlead|Saticoy Steel|Sabre purchases Dunder Mifflin and introduces printers.
h|Who performs as Goldenface in Threat Level Midnight?|Jim Halpert|Ryan Howard|Dwight Schrute|Toby Flenderson|Jim plays Michael Scarn's villain Goldenface.
h|Which employee starts the call/fax/email service WUPHF.com?|Ryan Howard|Andy Bernard|Jim Halpert|Creed Bratton|Ryan seeks investment in WUPHF.com.
h|What is the name of Dwight's cousin who lives at Schrute Farms?|Mose|Zeke|Rolf|Trevor|Mose Schrute helps Dwight run the farm.
h|Who plays corporate supervisor Charles Miner?|Idris Elba|David Koechner|Craig Robinson|James Spader|Idris Elba plays Charles Miner during Michael’s departure from Dunder Mifflin.
h|Who says the fire is shooting at them during Dwight's fire drill?|Andy Bernard|Stanley Hudson|Oscar Martinez|Kevin Malone|Andy panics and exclaims that the fire is shooting at them.
h|What does Dwight cut off the CPR dummy in Stress Relief?|Its face|Its hands|Its ears|Its feet|Dwight imitates Hannibal Lecter by wearing the CPR dummy's face.
h|What product does David Wallace market after leaving Dunder Mifflin?|Suck It|WUPHF|Sabre Pyramid|The Nard Dog|Suck It is David's device for collecting children's toys.
h|What is the nickname of Andy's a cappella group?|Here Comes Treble|The Cornell Chords|The Ivy Notes|The Nard Quartet|Here Comes Treble is Andy's college a cappella group.
x|What is the name of Jan Levinson's candle business?|Serenity by Jan|Candlelight by Jan|Jan's Glow|Serene Scranton|Jan displays Serenity by Jan candles in Dinner Party.
x|Which actor plays Michael Scarn's robot butler in Threat Level Midnight?|Dwight Schrute|Kevin Malone|Creed Bratton|Ryan Howard|Dwight plays Samuel L. Chang, Scarn's robot butler.
x|What is Erin Hannon’s real first name?|Kelly|Erica|Elizabeth|Eleanor|She uses her middle name Erin to distinguish herself from Kelly Kapoor.
x|What is the name of the song Jan plays during Dinner Party?|That One Night|You Took Me by the Hand|The Hunter Song|Serenity|Hunter's song is titled That One Night.
x|What is the full name of Michael’s nephew hired in Nepotism?|Luke Cooper|Clark Green|Pete Miller|Danny Cordray|Michael hires his nephew Luke Cooper as an office assistant.
x|Which employee uses the online persona LittleKidLover for a dating profile?|Michael Scott|Andy Bernard|Toby Flenderson|Kevin Malone|Michael chooses a disastrously inappropriate username to signal that he wants children.
x|What is the name of the doll Dwight buys up for Christmas resale?|Princess Unicorn|Queen Pegasus|Sparkle Pony|Princess Mermaid|Dwight sells the scarce Princess Unicorn dolls at a markup.
x|What actress is named as Michael Scarn’s deceased wife in Threat Level Midnight’s story?|Catherine Zeta-Jones|Julia Roberts|Meryl Streep|Nicole Kidman|Scarn’s fictional backstory names Catherine Zeta-Jones as his wife.
@Taskmaster|comedy|Taskmaster (TV series)
e|What does the regular UK series trophy resemble?|Greg Davies's head|Alex Horne's shoe|A stopwatch|A gold envelope|Regular series champions receive a golden version of Greg's head, following the different first-series trophy.
e|Who sits beside Greg to explain how tasks went?|Alex Horne|Ed Gamble|Josh Widdicombe|Richard Osman|Alex Horne assists Greg and oversees the filmed tasks.
e|How many main contestants usually take part in a regular UK series?|Five|Three|Six|Eight|The standard UK series features five main contestants.
e|Where are tasks that all contestants perform together before the audience held?|The studio|The kitchen|The caravan|The pub|The final task in a regular episode is a live studio task.
e|What seals the paper envelopes holding tasks?|Red wax|Blue tape|A metal staple|A ribbon|Task envelopes are sealed with the familiar red wax seal.
e|What is the first scored round of a typical episode?|The prize task|The team relay|The live task|The tiebreaker|Contestants bring items for the episode's themed prize task.
e|What recurring instruction reminds contestants that the written task matters?|All the information is on the task|Ask the audience|Search the internet|Phone a friend|Alex often directs contestants back to the task's wording.
e|Whose judgment normally determines subjective task rankings?|Greg Davies|The audience|Alex Horne alone|The contestants|Greg ranks performances as the Taskmaster.
m|Which contestant had Greg's name tattooed on his foot?|Josh Widdicombe|Tim Key|Frank Skinner|Romesh Ranganathan|Josh's tattoo secured points in the first series.
m|Which contestant smashed a watermelon on the floor before eating it?|Romesh Ranganathan|Joe Wilkinson|Hugh Dennis|Mark Watson|Romesh's floor-smashing method featured in the first series.
m|What touched the forbidden red green and disqualified Joe Wilkinson's potato throw?|His foot|His hand|The potato bag|His elbow|Joe's apparent success was overturned because he stepped on the red green.
m|Which contestant hid among fruit dressed as a banana?|Noel Fielding|Bob Mortimer|Paul Chowdhry|Richard Osman|Noel used a banana disguise in the camouflage task.
m|Which contestant kept task-envelope wax seals as little souvenirs?|Mel Giedroyc|Liza Tarbuck|Katherine Ryan|Sally Phillips|Mel pocketed the red wax seals during her series-four tasks.
m|Who was crowned winner of the first UK series?|Josh Widdicombe|Frank Skinner|Romesh Ranganathan|Tim Key|Josh won the inaugural UK series.
m|What fruit did Bob Mortimer hide in a sock for Greg to identify?|A satsuma|A banana|A pear|A lemon|Bob's mysterious sock contained a satsuma.
m|Which series-seven teammate pair frequently frustrated James Acaster?|Phil Wang and Rhod Gilbert|Ed Gamble and David Baddiel|Bob Mortimer and Mark Watson|Hugh Dennis and Joe Lycett|James's team also included Phil Wang and Rhod Gilbert.
h|What name did Bob Mortimer, Sally Phillips and Aisling Bea's song team use?|Products of Conception|The Diverse Stripes|The Horne Section|The Cake Sitters|Products of Conception created their song about Rosalind.
h|Who wrote and performed the Rosalind song with Mark Watson?|Nish Kumar|James Acaster|Ed Gamble|Joe Wilkinson|Nish and Mark performed as the Diverse Stripes.
h|Who made Alex sit bare-bottomed on a cake?|Liza Tarbuck|Kerry Godliman|Lou Sanders|Jo Brand|Liza's cake-sitting idea is a famous series-six task moment.
h|Who won UK series seven over James Acaster, Jessica Knappett, Phil Wang and Rhod Gilbert?|Kerry Godliman|Liza Tarbuck|Lou Sanders|Katherine Ryan|Kerry Godliman won series seven.
h|Who won UK series nine, which also included David Baddiel and Jo Brand?|Ed Gamble|Kerry Godliman|Richard Herring|Lou Sanders|Ed Gamble was the series-nine champion.
h|Who won UK series eleven?|Sarah Kendall|Mike Wozniak|Lee Mack|Charlotte Ritchie|Sarah Kendall won the series featuring Mike Wozniak and Lee Mack.
h|Who won UK series thirteen?|Sophie Duker|Bridget Christie|Judi Love|Ardal O'Hanlon|Sophie Duker won series thirteen.
h|Who won UK series fourteen?|Dara Ó Briain|Sarah Millican|Fern Brady|John Kearns|Dara Ó Briain won series fourteen.
x|How many beans did Josh report in his solo baked-bean counting task?|406|433|250|512|Josh counted 406 beans; his other solo counts included spaghetti hoops and rice.
x|How many spaghetti hoops did Josh report in the separate solo task?|433|406|320|500|Josh reported 433 hoops in the tin.
x|What number of rice grains did Josh estimate in his solo rice task?|25,000|4,060|43,300|2,500|Josh's estimate was 25,000 grains in the bag.
x|Who replaced an unavailable Mae Martin in Champion of Champions III?|Kiell Smith-Bynoe|Frankie Boyle|Jenny Eclair|Ivo Graham|Series-fifteen runner-up Kiell stepped in for Mae.
x|What was the title of the UK series-one episode with Josh's menial counting tasks?|Down an octave|The last supper|A pistachio éclair|Melon buffet|The solo counting tasks appear in Down an octave.
x|Who won the second UK Champion of Champions special?|Richard Herring|Ed Gamble|Lou Sanders|Kerry Godliman|Richard Herring won Champion of Champions II.
x|Who won the first UK Champion of Champions special?|Josh Widdicombe|Bob Mortimer|Noel Fielding|Rob Beckett|Josh won the first Champion of Champions.
x|Who won UK series sixteen with Julian Clary and Lucy Beaumont?|Sam Campbell|Sue Perkins|Susan Wokoma|Julian Clary|Sam Campbell was the series-sixteen champion.
@Arrested Development|comedy|Arrested Development
e|What does GOB usually perform professionally?|Magic illusions|Stand-up comedy|Opera|Stunt driving|GOB tries to build a career as an illusionist.
m|What clothing does Tobias wear because he is a never-nude?|Cut-off denim shorts|A full wetsuit|A tuxedo|A bathrobe|Tobias's never-nude condition is represented by his denim cutoffs.
h|What is the name of Michael Bluth's deceased wife?|Tracey|Lindsay|Lucille|Marta|Michael and George Michael mourn Tracey Bluth.
x|What is Lucille Two's surname?|Austero|Bluth|Sitwell|Veal|Lucille Austero is known as Lucille Two to distinguish her from Lucille Bluth.
@Curb Your Enthusiasm|comedy|Curb Your Enthusiasm
e|Who plays Larry's housemate Leon Black?|J.B. Smoove|Richard Lewis|Jeff Garlin|Ted Danson|J.B. Smoove plays Leon Black.
m|What does Larry name his spite coffee shop?|Latte Larry's|Larry's Beans|Pretty Good Coffee|No Mocha|Larry opens Latte Larry's to spite Mocha Joe.
h|What musical does Larry star in alongside David Schwimmer?|The Producers|Cats|Chicago|Cabaret|Larry and David Schwimmer perform in The Producers storyline.
x|What is the restaurant's name in Palestinian Chicken?|Al-Abbas|Aladdin's|Falafel Palace|The Olive Tree|Larry and Jeff visit Al-Abbas, where chicken and social conflict drive the episode.
@Mr. Show|comedy|Mr. Show with Bob and David
e|On which premium cable channel did Mr. Show originally air?|HBO|Showtime|Starz|Cinemax|Mr. Show originally ran on HBO.
m|What feature-film title expands Ronnie Dobbs's story?|Run Ronnie Run|Mr. Show Returns|Ronnie on the Run|Dobbs and Company|Run Ronnie Run builds a film around the Mr. Show character.
h|What fictional corporation markets Pit-Pat?|GloboChem|Vought|Omni Consumer Products|Initech|GloboChem's ad meeting introduces the absurd Pit-Pat character.
x|Who plays the repeatedly tumbling explorer in The Story of Everest?|Jay Johnston|David Cross|Tom Kenny|Paul F. Tompkins|Jay Johnston's explorer repeatedly knocks over the thimbles.
@Garth Marenghi’s Darkplace|comedy|Garth Marenghi's Darkplace
e|Who plays author Garth Marenghi?|Matthew Holness|Matt Berry|Richard Ayoade|Julian Barratt|Matthew Holness portrays the horror author and his fictional series character.
m|Who plays actor Todd Rivers, who in turn plays Dr. Lucien Sanchez?|Matt Berry|Matthew Holness|Richard Ayoade|Noel Fielding|Matt Berry plays Todd Rivers and Lucien Sanchez.
h|Who plays the fictional actress Madeleine Wool and her Dr. Liz Asher character?|Alice Lowe|Julia Davis|Jessica Hynes|Katherine Parkinson|Alice Lowe portrays Madeleine Wool, the actress who plays Dr. Liz Asher within Darkplace.
x|What is Garth's doctor's full name within the hospital show?|Dr. Rick Dagless, M.D.|Dr. Lucien Sanchez|Dr. Dean Learner|Dr. Todd Rivers|Garth stars as Dr. Rick Dagless, M.D., inside his invented horror series.
@Review|comedy|Review (TV series)
e|Which actor plays Forrest MacNeil in the American Review?|Andy Daly|Nathan Fielder|John Wilson|David Cross|Andy Daly plays experience-reviewer Forrest MacNeil.
m|What is the name of Forrest's studio co-host?|A.J. Gibbs|Suzanne MacNeil|Lucy Grant|Debbie Green|Megan Stevenson plays co-host A.J. Gibbs.
h|Who plays Review's producer Grant?|James Urbaniak|Paul F. Tompkins|Patton Oswalt|Bob Odenkirk|James Urbaniak plays the producer who encourages Forrest's reviews.
x|What is the first name of Forrest's wife?|Suzanne|Linda|Diane|Wendy|Jessica St. Clair plays Suzanne MacNeil.
@Nathan for You|comedy|Nathan for You
e|What nationality is Nathan Fielder?|Canadian|American|Australian|British|Fielder was born in Vancouver, Canada.
m|What clothing brand does Nathan create with a Holocaust-awareness mission?|Summit Ice|Alpine Honor|Mountain Truth|Peak Memory|Summit Ice is the jacket company started in Nathan for You.
h|What episode title follows Nathan impersonating another man for a high-wire stunt?|The Hero|Finding Frances|The Movement|The Claw of Shame|The Hero has Nathan take over another man's identity for a public stunt.
x|What is the full name of the Bill Gates impersonator at the center of Finding Frances?|Bill Heath|Bill Hader|William Andrews|Billy Mitchell|Bill Heath searches for a long-lost love in Finding Frances.
@Tim & Eric|comedy|Tim and Eric Awesome Show, Great Job!
e|Which performer plays Spagett?|Tim Heidecker|Eric Wareheim|John C. Reilly|David Liebe Hart|Tim Heidecker plays the ineffectual surprise specialist.
m|Which comedian plays the Mayor in Tom Goes to the Mayor?|Bob Odenkirk|David Cross|John C. Reilly|Will Ferrell|Bob Odenkirk voices the Mayor in the earlier Tim and Eric series.
h|What are the first names of the Skylar television-host couple?|Jan and Wayne|Jill and Dave|Carol and Frank|Linda and Steve|Jan and Wayne Skylar host the fictional Channel 5 program.
x|Which performer portrays Jan Skylar?|Tim Heidecker|Eric Wareheim|John C. Reilly|Tim Robinson|Tim plays Jan while Eric plays Wayne Skylar.
@Nirvanna the Band the Show|comedy|Nirvanna the Band the Show
e|In what Canadian city do Matt and Jay's plans unfold?|Toronto|Vancouver|Montreal|Ottawa|The show follows their attempts to play a gig in Toronto.
m|How does the band's name differ from the famous Seattle grunge band's name?|It has an extra n|It has an extra r|It has an extra a|It has no vowels|The fictional band is Nirvanna, with an additional n.
h|Which 2023 phone-company film was directed by Matt Johnson?|BlackBerry|The Social Network|Air|Tetris|Matt Johnson directed and co-starred in BlackBerry.
x|Which Nirvanna performer composed the BlackBerry score?|Jay McCarrol|Matt Johnson|Jared Raab|Matthew Miller|Jay McCarrol composed the score for Matt Johnson's BlackBerry.
@Star Wars|movies|Star Wars (film)
e|Which desert planet is Luke's home in the original film?|Tatooine|Jakku|Arrakis|Geonosis|Luke grows up on Tatooine in the original Star Wars.
m|What species is Han Solo's co-pilot Chewbacca?|Wookiee|Ewok|Rodian|Gungan|Chewbacca is a Wookiee from Kashyyyk.
h|Who plays Grand Moff Tarkin in the 1977 film?|Peter Cushing|Christopher Lee|Alec Guinness|Ian McDiarmid|Peter Cushing plays the Death Star commander Tarkin.
x|What is the trash-compactor unit number Leia calls out?|3263827|1138472|2187326|3276283|Leia calls for help for trash compactor 3263827.
@Star Trek|movies|Star Trek: The Next Generation
e|Which captain leads the Enterprise-D?|Jean-Luc Picard|James T. Kirk|Benjamin Sisko|Kathryn Janeway|Picard commands the Enterprise-D in The Next Generation.
m|Which alien species is Quark?|Ferengi|Klingon|Vulcan|Cardassian|Quark is a Ferengi bartender and businessman on Deep Space Nine.
h|What is Starfleet's famously unwinnable command test called?|Kobayashi Maru|The Omega Directive|The Genesis Trial|The Khitomer Test|The Kobayashi Maru is the no-win simulation associated with Kirk's training.
x|What is the first name of Picard's brother in Family?|Robert|René|Maurice|Jacques|Robert Picard runs the family vineyard; René is Robert's son.
@The Fifth Element|movies|The Fifth Element
e|Who plays the extravagant radio host Ruby Rhod?|Chris Tucker|Chris Rock|Jamie Foxx|Eddie Murphy|Chris Tucker portrays Ruby Rhod.
m|What document does Leeloo repeatedly present at the spaceport?|A multipass|A bounty license|A Federation visa|A military warrant|Leeloo proudly repeats multipass while traveling with Korben.
h|What four classical elements do the four stones represent?|Earth, air, fire and water|Metal, wood, light and dark|Life, death, time and space|Salt, sulfur, gold and mercury|The four stones correspond to earth, air, fire and water.
x|What are the shape-shifting mercenaries working for Zorg called?|Mangalores|Mondoshawans|Fremen|Necromongers|Zorg hires Mangalore mercenaries; the Mondoshawans protect the stones.
@The Matrix|movies|The Matrix
e|Which character offers Neo the red and blue pills?|Morpheus|Trinity|Agent Smith|Cypher|Morpheus offers Neo the choice between the pills.
m|What is Neo's everyday surname before his awakening?|Anderson|Reeves|Morgan|Johnson|Neo's original identity is Thomas Anderson.
h|Which actor plays the traitorous Cypher in the original Matrix?|Joe Pantoliano|Hugo Weaving|Marcus Chong|Matt Doran|Joe Pantoliano portrays Cypher, the crewmate who bargains with Agent Smith.
x|What are Sati's parents called in The Matrix Revolutions?|Rama-Kandra and Kamala|Morpheus and Trinity|Merovingian and Persephone|Tank and Zee|Rama-Kandra and Kamala arrange Sati's passage out of the machine world.
@Men in Black|movies|Men in Black (1997 film)
e|Who plays Agent J in the 1997 Men in Black?|Will Smith|Martin Lawrence|Jamie Foxx|Chris Tucker|Will Smith portrays the newly recruited Agent J.
m|Which agent played by Rip Torn runs the headquarters?|Zed|Kay|Jay|Dee|Rip Torn's Zed leads the Men in Black headquarters.
h|What drink does the Bug in Edgar's skin demand?|Sugar water|Black coffee|Salt water|Lemonade|The disguised Bug demands water heavily loaded with sugar.
x|What is the name of the cat whose collar carries the galaxy?|Orion|Sirius|Vega|Cosmo|The galaxy is on Orion's collar rather than in a familiar constellation.
@Back to the Future|movies|Back to the Future
e|What car brand is the first movie's time machine?|DeLorean|Ferrari|Pontiac|Lotus|Doc Brown builds the time machine from a DeLorean.
m|How fast must the DeLorean travel to activate time travel?|88 miles per hour|80 miles per hour|95 miles per hour|100 miles per hour|The DeLorean must reach 88 mph.
h|What does Twin Pines Mall become after Marty changes the past?|Lone Pine Mall|Twin Oaks Mall|Hill Valley Mall|Peabody Plaza|Marty destroys one of Peabody's pines, leaving Lone Pine Mall in the changed present.
x|On what date does Doc first conceive the flux capacitor?|November 5, 1955|October 26, 1985|November 12, 1955|July 3, 1885|Doc's head injury on November 5, 1955 inspires the flux capacitor.
@Jurassic Park|movies|Jurassic Park (film)
e|Who portrays park founder John Hammond?|Richard Attenborough|David Attenborough|Ian Holm|Donald Sutherland|Richard Attenborough plays John Hammond in the original film.
m|Which small dinosaur spits venom at Dennis Nedry in the film?|Dilophosaurus|Velociraptor|Compsognathus|Gallimimus|The film's Dilophosaurus has a fictional frill and venom attack.
h|What brand's container disguises Nedry's embryo-smuggling device?|Barbasol|Gillette|Old Spice|Nivea|Nedry hides stolen dinosaur embryos in a modified Barbasol shaving-cream can.
x|What is geneticist Dr. Wu's first name?|Henry|Howard|Hector|Harold|B.D. Wong plays geneticist Dr. Henry Wu.
@Terminator|movies|The Terminator
e|Who plays Sarah Connor in the original Terminator films?|Linda Hamilton|Sigourney Weaver|Geena Davis|Jamie Lee Curtis|Linda Hamilton plays Sarah Connor in the original and second films.
m|What name is given to the future military AI responsible for the machines?|Skynet|Cybertron|HAL|Mother|Skynet becomes self-aware and wages war against humanity.
h|Who plays the liquid-metal T-1000 in Terminator 2?|Robert Patrick|Michael Biehn|Lance Henriksen|Bill Paxton|Robert Patrick plays the T-1000.
x|What is the psychiatrist Silberman's first name?|Peter|John|Miles|Paul|Earl Boen plays Dr. Peter Silberman.
@Die Hard|movies|Die Hard
e|What police officer does Bruce Willis play in Die Hard?|John McClane|Martin Riggs|Axel Foley|Jack Traven|Bruce Willis plays New York cop John McClane.
m|Who plays Hans Gruber in the first film?|Alan Rickman|Jeremy Irons|Gary Oldman|Tim Roth|Alan Rickman made his film debut as Hans Gruber.
h|What is Gruber really trying to steal from Nakatomi's vault?|Bearer bonds|Gold bars|Diamonds|Computer chips|The hostage situation disguises a robbery of negotiable bearer bonds.
x|What is the name of McClane's limousine driver?|Argyle|Powell|Theo|Eddie|De'voreaux White plays the limousine driver Argyle.
@Rambo|movies|First Blood
e|Which war did John Rambo serve in before First Blood?|Vietnam War|Korean War|Gulf War|World War II|Rambo is a Vietnam veteran returning to civilian life.
m|What is the sheriff's surname in First Blood?|Teasle|Trautman|Kern|Gault|Brian Dennehy plays Sheriff Will Teasle.
h|Who plays Colonel Sam Trautman in the first three Rambo films?|Richard Crenna|Robert Duvall|George C. Scott|Tommy Lee Jones|Richard Crenna portrays Rambo's former commanding officer.
x|What is the name of the fictional Washington town in First Blood?|Hope|Prosperity|Liberty|Paradise|The film's events take place in the town of Hope, Washington.
@Bloodsport|movies|Bloodsport
e|What is the name of the underground tournament in Bloodsport?|Kumite|Mortal Kombat|The Cell Games|The Iron Fist|Frank Dux competes in the Kumite tournament.
m|Who plays the formidable Chong Li?|Bolo Yeung|Jackie Chan|Donnie Yen|Jet Li|Bolo Yeung portrays Chong Li.
h|What is Dux's trainer's surname?|Tanaka|Miyagi|Han|Takagi|Senzo Tanaka trains Frank Dux.
x|Which actor plays Dux's American friend Ray Jackson?|Donald Gibb|Brian Thompson|Jesse Ventura|Michael Dudikoff|Donald Gibb plays the bruising competitor Ray Jackson.
@Under Siege|movies|Under Siege
e|What job does Casey Ryback hold aboard the ship?|Cook|Captain|Engineer|Navigator|The apparent cook is actually an experienced former Navy SEAL.
m|What battleship is the main setting of Under Siege?|USS Missouri|USS Arizona|USS Iowa|USS Wisconsin|The hijacking takes place aboard the USS Missouri.
h|Who plays rogue operative William Strannix?|Tommy Lee Jones|Gary Busey|Kurt Russell|Dennis Hopper|Tommy Lee Jones leads the hijackers as Strannix.
x|What is the surname of the corrupt commander played by Gary Busey?|Krill|Ryback|Strannix|Bates|Gary Busey plays Commander Krill.
@Crank 2|movies|Crank: High Voltage
e|Who returns as Chev Chelios in Crank: High Voltage?|Jason Statham|Vin Diesel|Paul Walker|Clive Owen|Jason Statham reprises Chev Chelios.
m|What replacement body part must Chev recharge in Crank 2?|An artificial heart|A robotic arm|An artificial eye|A powered leg|Chev's artificial heart needs electrical power.
h|Who plays Johnny Vang in Crank: High Voltage?|Art Hsu|Mike Patton|Maynard James Keenan|Chester Bennington|Art Hsu portrays Johnny Vang; musicians appear in other roles in the film.
x|Who composed Crank: High Voltage's score?|Mike Patton|Trent Reznor|Clint Mansell|Danny Elfman|Faith No More and Mr. Bungle singer Mike Patton composed the film's score.
@Fast & Furious|movies|The Fast and the Furious (2001 film)
e|What is Vin Diesel's character's first name?|Dominic|Brian|Roman|Deckard|Vin Diesel portrays Dominic Toretto.
m|Who plays undercover officer Brian O'Conner in the first movie?|Paul Walker|Tyrese Gibson|Ludacris|Lucas Black|Paul Walker plays Brian O'Conner.
h|What major desert racing event is featured in the first film?|Race Wars|Street Kings|Quarter-Mile Nationals|Desert Run|The racers attend Race Wars.
x|What magazine article inspired the first Fast and Furious film?|Racer X|Street Heat|The Quarter Mile|Night Racers|Kenneth Li's Vibe article Racer X helped inspire the film.
@Rocky|movies|Rocky
e|What is Rocky's trainer's first name?|Mickey|Paulie|Duke|Tony|Mickey Goldmill trains Rocky Balboa.
m|What are Rocky's pet turtles called?|Cuff and Link|Rocky and Bullwinkle|Mick and Duke|Apollo and Creed|Rocky's turtles are named Cuff and Link.
h|What is the surname of the loan shark Rocky collects money for?|Gazzo|Goldmill|Pennino|Creed|Rocky works as a collector for Tony Gazzo.
x|Who plays Tony Gazzo in the original Rocky?|Joe Spinell|Burt Young|Burgess Meredith|Frank Stallone|Joe Spinell plays loan shark Tony Gazzo.
@The Warriors|movies|The Warriors (film)
e|What neighborhood are the Warriors trying to return to?|Coney Island|Harlem|The Bronx|Hell's Kitchen|The Warriors must make it back to their Coney Island home territory.
m|What powerful gang does Cyrus lead?|The Gramercy Riffs|The Rogues|The Orphans|The Baseball Furies|Cyrus leads the Gramercy Riffs and calls the gang summit.
h|What is the name of the Rogues' leader who shoots Cyrus?|Luther|Swan|Ajax|Cleon|Luther murders Cyrus and frames the Warriors.
x|Who plays the Warriors' acting leader Swan?|Michael Beck|James Remar|David Patrick Kelly|Dorsey Wright|Michael Beck plays Swan; James Remar plays Ajax.
@Evil Dead|horror|Evil Dead II
e|Who plays Ash Williams in the original Evil Dead trilogy?|Bruce Campbell|Robert Englund|Doug Bradley|Jeffrey Combs|Bruce Campbell portrays Ash Williams.
m|Which hand does Ash cut off before replacing it with a chainsaw?|Right|Left|Both|Neither|Ash removes his possessed right hand in Evil Dead II.
h|What is the surname of the professor whose recording explains the book?|Knowby|West|Myers|Loomis|Professor Raymond Knowby's recordings describe the book and its curse.
x|What is Professor Knowby's wife's first name?|Henrietta|Annie|Linda|Cheryl|Henrietta Knowby is possessed and locked in the cellar.
@Return of the Living Dead|horror|The Return of the Living Dead
e|What do the film's talking zombies specifically demand to eat?|Brains|Hearts|Eyes|Livers|These zombies explain that brains relieve the pain of being dead.
m|What is the medical supply warehouse called?|Uneeda Medical Supply|Umbrella Medical|Weyland Supplies|Trioxin Labs|Frank and Freddy work at Uneeda Medical Supply.
h|What chemical is released from the army drum?|2-4-5 Trioxin|T-virus|Promicin|Compound V|The drum releases the reanimating chemical 2-4-5 Trioxin.
x|Which actor plays the nervous warehouse worker Frank?|James Karen|Thom Mathews|Clu Gulager|Don Calfa|James Karen plays Frank; Thom Mathews plays Freddy.
@The Thing|horror|The Thing (1982 film)
e|Who plays R.J. MacReady in the 1982 film?|Kurt Russell|Keith David|Wilford Brimley|Donald Moffat|Kurt Russell plays MacReady.
m|What nationality are the men chasing the dog in the opening?|Norwegian|Swedish|Russian|Finnish|The opening chase comes from the Norwegian Antarctic station.
h|What is MacReady's job at the outpost?|Helicopter pilot|Doctor|Cook|Biologist|MacReady is the station's helicopter pilot.
x|Who portrays biologist Blair?|Wilford Brimley|Richard Dysart|Charles Hallahan|Donald Moffat|Wilford Brimley plays Blair.
@The Big Lebowski|movies|The Big Lebowski
e|Who plays the Dude?|Jeff Bridges|John Goodman|Steve Buscemi|John Turturro|Jeff Bridges plays Jeffrey the Dude Lebowski.
m|What cocktail is the Dude most associated with?|White Russian|Old Fashioned|Manhattan|Mojito|The Dude repeatedly drinks White Russians.
h|What is Walter's surname?|Sobchak|Lebowski|Kerabatsos|Quintana|Walter Sobchak is the Dude's volatile bowling teammate.
x|What was Bunny Lebowski's original name in Minnesota?|Fawn Knutsen|Maude Peterson|Jackie Treehorn|Dawn Gunderson|The private detective identifies Bunny as Fawn Knutsen.
@Black Sabbath|music|Black Sabbath
e|Which original Black Sabbath member is the lead guitarist?|Tony Iommi|Geezer Butler|Bill Ward|Ozzy Osbourne|Tony Iommi is the band's guitarist.
m|Which Sabbath album includes Iron Man and War Pigs?|Paranoid|Master of Reality|Vol. 4|Sabotage|Both songs appear on Paranoid.
h|How many right-hand fingertips did Iommi injure in his factory accident?|Two|One|Three|Four|Iommi lost the tips of his middle and ring fingers.
x|What band name did Sabbath use immediately before adopting Black Sabbath?|Earth|Heaven and Hell|Polka Tulk Blues Band|Mythology|The group changed from Earth to Black Sabbath; Polka Tulk was an earlier name.
@Primus|music|Primus (band)
e|Which instrument is Les Claypool known for playing?|Bass guitar|Drums|Trumpet|Saxophone|Les Claypool is Primus's bassist and singer.
m|Which Primus album includes Wynona's Big Brown Beaver?|Tales from the Punchbowl|Frizzle Fry|Sailing the Seas of Cheese|The Brown Album|Wynona's Big Brown Beaver appears on the 1995 album Tales from the Punchbowl.
h|What was Primus's first studio album?|Frizzle Fry|Suck on This|Pork Soda|Tales from the Punchbowl|Frizzle Fry is the first studio album; Suck on This is a live album.
x|What thrash/death-metal band did Larry LaLonde play in before Primus?|Possessed|Death|Exodus|Testament|Larry LaLonde played guitar in Possessed before joining Primus.
@Sleep|music|Sleep (band)
e|Which Sleep member is its bassist and vocalist?|Al Cisneros|Matt Pike|Jason Roeder|Chris Hakius|Al Cisneros handles bass and vocals.
m|Which Sleep album has a mountain in its title?|Sleep's Holy Mountain|Electric Mountain|Mountain of Doom|The Mystic Summit|Sleep's Holy Mountain is the band's second studio album.
h|What band did Matt Pike form after Sleep's original breakup?|High on Fire|OM|Electric Wizard|Monolord|Matt Pike formed High on Fire.
x|Under what title was an earlier edited version of Dopesmoker released?|Jerusalem|The Sciences|Holy Mountain|Dragonaut|An earlier version of the long composition was released as Jerusalem.
@Daft Punk|music|Daft Punk
e|From which country did Daft Punk originate?|France|Germany|Belgium|Canada|Daft Punk formed in France.
m|Which Daft Punk album includes One More Time?|Discovery|Homework|Human After All|Random Access Memories|One More Time opens Discovery.
h|Which anime film is built around the Discovery album?|Interstella 5555|Redline|Paprika|Memories|Interstella 5555 tells its story using Discovery's music.
x|What stage name is used by Thomas Bangalter's songwriter father?|Daniel Vangarde|Giorgio Moroder|Marc Cerrone|Jean-Michel Jarre|Thomas's father Daniel Bangalter writes as Daniel Vangarde.
@Dragon Ball Z|anime|Dragon Ball Z
e|Which warrior is the prince of the Saiyans?|Vegeta|Goku|Piccolo|Krillin|Vegeta introduces himself as the Saiyan prince.
m|Who first transforms into Super Saiyan 2 during the Cell Games?|Gohan|Goku|Vegeta|Trunks|Gohan's Super Saiyan 2 awakening turns the fight against Cell.
h|Which Ginyu Force member can freeze time while holding his breath?|Guldo|Jeice|Burter|Recoome|Guldo uses psychic abilities including time freezing.
x|What is the Japanese name of Krillin's Destructo Disc?|Kienzan|Makankosappo|Masenko|Taiyoken|Kienzan is Krillin's razor-edged energy disc.
@Hunter × Hunter|anime|Hunter × Hunter
e|What is the first name of Gon's father?|Ging|Silva|Kite|Razor|Gon searches for his father Ging Freecss.
m|What color do Kurapika's eyes turn during strong emotion?|Scarlet|Gold|Violet|White|Kurapika belongs to the Kurta clan, known for Scarlet Eyes.
h|What is Kite's roulette-based conjured weapon ability called?|Crazy Slots|Bungee Gum|Godspeed|Chain Jail|Crazy Slots selects numbered weapons for Kite.
x|What number is on Hisoka's badge during the Hunter Exam?|44|99|301|405|Hisoka wears badge 44 during Gon's Hunter Exam.
@Legends of the Hidden Temple|nick|Legends of the Hidden Temple
e|What is Olmec in Legends of the Hidden Temple?|A giant stone head|A parrot|A robot guard|A golden statue|Olmec is the talking stone head who introduces legends and explains the temple.
m|What is the orange team called?|Orange Iguanas|Orange Tigers|Orange Monkeys|Orange Barracudas|Orange Iguanas are one of the six original teams.
h|What object lets a contestant pass a temple guard without being captured?|A Pendant of Life|A Silver Snake|A Temple Key|A Golden Torch|A whole Pendant of Life protects a contestant from a temple guard.
x|What room is famous for a three-part monkey statue puzzle?|The Shrine of the Silver Monkey|The Room of the Three Idols|The King's Storeroom|The Observatory|Contestants assemble the monkey in the Shrine of the Silver Monkey.
@F-Zero|arcade|F-Zero
e|What sort of vehicles race in F-Zero?|Hovering futuristic racing machines|Go-karts|Motorcycles|Speedboats|F-Zero's machines hover above futuristic tracks.
m|Which racer is associated with the Blue Falcon?|Captain Falcon|Samurai Goroh|Pico|Dr. Stewart|Captain Falcon pilots the Blue Falcon.
h|What machine does Samurai Goroh pilot in the original F-Zero?|Fire Stingray|Golden Fox|Wild Goose|Blue Falcon|Samurai Goroh pilots the Fire Stingray.
x|What machine does Dr. Stewart pilot in the original F-Zero?|Golden Fox|Fire Stingray|Wild Goose|White Cat|Dr. Stewart drives the Golden Fox.
`;

const levels={e:'easy',m:'medium',h:'hard',x:'impossible'};
const episodeLinks=[
 ['Come Sail Away','https://southpark.cc.com/video-clips/aqcqla/south-america-come-sail-away'],
 ['Chili Con Carnival','https://southpark.cc.com/w/index.php?title=Chili_Con_Carnival'],
 ['AWESOM-O robot','https://southpark.cc.com/w/index.php/A.W.E.S.O.M.-O_4000'],
 ['movie executives in AWESOM-O','https://southpark.cc.com/w/index.php/AWESOM-O'],
 ['Scott Tenorman Must Die','https://southpark.cc.com/w/index.php?title=Chili_Con_Carnival'],
 ['report in his solo baked-bean','https://taskmaster.info/attempt.php?id=95'],
 ['report in the separate solo task','https://taskmaster.fandom.com/wiki/Count_the_beans_in_the_baked_bean_tin'],
 ['estimate in his solo rice','https://taskmaster.info/attempt.php?id=104'],
 ['episode with Josh','https://www.comedy.co.uk/tv/taskmaster/episodes/1/4/'],
 ['in The Opposite','https://en.wikipedia.org/wiki/The_Opposite'],
 ['in The Frogger','https://en.wikipedia.org/wiki/The_Frogger'],
 ['in The Little Kicks','https://imsdb.com/transcripts/Seinfeld-The-Little-Kicks.html']
];
function parseFacts(text){let source,category,page;return text.trim().split('\n').filter(Boolean).flatMap(line=>{
 if(line.startsWith('@')){[source,category,page]=line.slice(1).split('|');return [];}
 const[difficulty,q,answer,a,b,c,explanation]=line.split('|');
 const episode=episodeLinks.find(([match])=>q.includes(match));
 return [{source,category,difficulty:levels[difficulty],q,answers:[answer,a,b,c],correct:0,explanation,provenance:'v0.39 authored factual expansion; subject/episode link supplied for review',citations:[{label:episode?source+' episode/task reference':page,url:episode?.[1]||'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.replaceAll(' ','_'))}]}];
});}
const PARTY_TRIVIA=parseFacts(FACTS);
const PARTY_TRIVIA_THEMES=[
 {tag:'sunny',title:'Paddy’s · Chardee Trivia',icon:'☀',source:'Always Sunny',description:'The gang, schemes, props and obscure Paddy’s lore.',sources:['Always Sunny','It’s Always Sunny in Philadelphia']},
 {tag:'southpark',title:'South Park · Respect My Trivia',icon:'🏔',source:'South Park',description:'South Park characters, episodes, alter egos and deep cuts.',sources:['South Park']},
 {tag:'seinfeld',title:'Seinfeld · Contest of Knowledge',icon:'🥨',source:'Seinfeld',description:'Apartment antics, workplace schemes and obscure Seinfeld details.',sources:['Seinfeld']},
 {tag:'office',title:'Scranton · Dundie Quiz',icon:'📠',source:'The Office',description:'Dunder Mifflin workers, pranks, movies and tiny Scranton details.',sources:['The Office']},
 {tag:'taskmaster',title:'Taskmaster · All the Facts Are on the Task',icon:'📜',source:'Taskmaster',description:'UK tasks, contestants, ingenious attempts and deep-cut results.',sources:['Taskmaster']},
 {tag:'cultcomedy',title:'Cult Comedy · Deep-Cut Club',icon:'🎭',source:'Mr. Show',description:'Arrested Development, Curb, Mr. Show, Darkplace, Review, Nathan, Tim & Eric and Nirvanna.',sources:['Arrested Development','Curb Your Enthusiasm','Mr. Show','Garth Marenghi’s Darkplace','Review','Nathan for You','Tim & Eric','Nirvanna the Band the Show']},
 {tag:'scifi',title:'Sci-Fi · Multipass Quiz',icon:'🛸',source:'The Fifth Element',description:'Star Wars, Star Trek, The Fifth Element, The Matrix, Men in Black, time travel and dinosaurs.',sources:['Star Wars','Star Trek','The Fifth Element','The Matrix','Men in Black','Back to the Future','Jurassic Park','Terminator','Alien','Predator','Mars Attacks!']},
 {tag:'action',title:'Action Heroes · Yippee-Ki-Quiz',icon:'💥',source:'Die Hard',description:'Die Hard, Rambo, Bloodsport, Under Siege, Crank, Fast & Furious, Rocky and The Warriors.',sources:['Die Hard','Rambo','Bloodsport','Under Siege','Crank 2','Fast & Furious','Rocky','The Warriors']}
];

Object.assign(exports,{PARTY_TRIVIA,PARTY_TRIVIA_THEMES});