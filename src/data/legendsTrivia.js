// v0.44 trivia expansion. Authored factual questions; each section links its subject page.
// difficulty | question | correct answer | three distractors | explanation
const FACTS=`
@The Beatles|music|The_Beatles
e|How many members made up The Beatles?|Four|Three|Five|Six|John, Paul, George and Ringo.
e|In which English city did The Beatles form?|Liverpool|Manchester|Birmingham|Leeds|The band came together in Liverpool.
e|Who was the drummer of The Beatles?|Ringo Starr|Pete Townshend|Charlie Watts|Keith Moon|Ringo Starr joined in 1962.
e|Which Beatles album cover shows the band crossing a street?|Abbey Road|Revolver|Help!|Rubber Soul|The 1969 cover was photographed outside EMI's Abbey Road studios.
e|Which Beatle married Yoko Ono?|John Lennon|Paul McCartney|George Harrison|Ringo Starr|Lennon and Ono married in 1969.
m|Which Beatle wrote and sang "Yesterday"?|Paul McCartney|John Lennon|George Harrison|Ringo Starr|McCartney wrote and performed it nearly alone with an acoustic guitar and string quartet.
m|Which Beatle wrote "Here Comes the Sun"?|George Harrison|John Lennon|Paul McCartney|Ringo Starr|It appears on Abbey Road.
m|Which Liverpool club is most associated with The Beatles' early shows?|The Cavern Club|The Marquee|The Hacienda|The Roxy|They played hundreds of lunchtime and evening sets at the Cavern.
m|Who is the producer often called the "fifth Beatle"?|George Martin|Phil Spector|Brian Epstein|Quincy Jones|Martin produced almost all of their records.
m|On which American TV show did The Beatles appear in February 1964?|The Ed Sullivan Show|The Tonight Show|American Bandstand|Saturday Night Live|An estimated 73 million people watched.
m|What do fans call The Beatles' self-titled 1968 double album?|The White Album|Let It Be|Sgt. Pepper|Magical Mystery Tour|Its official title is simply The Beatles.
m|Which 1968 animated film features The Beatles' "All You Need Is Love"?|Yellow Submarine|Help!|A Hard Day's Night|Magical Mystery Tour|Yellow Submarine is the animated Beatles film.
m|What is Ringo Starr's birth name?|Richard Starkey|Richard Starr|Ronald Starkey|Robert Starkey|Ringo is a stage name.
m|Which Beatle wrote "Something", later covered by Frank Sinatra?|George Harrison|John Lennon|Paul McCartney|Ringo Starr|Harrison wrote it for Abbey Road.
m|What was the title of The Beatles' 1964 debut film?|A Hard Day's Night|Help!|Yellow Submarine|Let It Be|Directed by Richard Lester.
h|Which 1966 Beatles album includes "Eleanor Rigby" and "Tomorrow Never Knows"?|Revolver|Rubber Soul|Help!|Abbey Road|Revolver came between Rubber Soul and Sgt. Pepper.
h|Who was the Beatles' drummer before Ringo Starr?|Pete Best|Stuart Sutcliffe|Tommy Moore|Jimmy Nicol|Pete Best was replaced in 1962.
h|Which album did The Beatles record last, even though it was not released last?|Abbey Road|Let It Be|The White Album|Magical Mystery Tour|Let It Be was recorded earlier but released after Abbey Road.
h|Where did The Beatles perform their final public concert in January 1969?|On the roof of the Apple Corps building|At Shea Stadium|At Candlestick Park|At the Cavern Club|The rooftop concert was filmed for Let It Be.
h|Which 1967 TV film features a psychedelic coach trip?|Magical Mystery Tour|Help!|Yellow Submarine|Let It Be|It was broadcast on the BBC on Boxing Day 1967.
h|Whose son was "Hey Jude" originally written to comfort?|Julian Lennon|Sean Lennon|James McCartney|Zak Starkey|Paul McCartney wrote it during John and Cynthia Lennon's divorce.
h|Which keyboardist played on "Get Back" and is credited on the single?|Billy Preston|Nicky Hopkins|Eric Clapton|Ray Charles|The single was credited to The Beatles with Billy Preston.
h|Which song shares a 1967 double A-side single with "Strawberry Fields Forever"?|Penny Lane|Hello Goodbye|All You Need Is Love|Lady Madonna|The pair were left off Sgt. Pepper.
h|Which skiffle group did John Lennon form in 1957 before The Beatles?|The Quarrymen|The Silver Beetles|Rory Storm and the Hurricanes|The Mojos|Paul McCartney joined The Quarrymen after meeting John at a church fete.
i|Which 1965 Beatles film includes the song "Ticket to Ride"?|Help!|A Hard Day's Night|Magical Mystery Tour|Yellow Submarine|Help! was directed by Richard Lester.
i|Which guitar brand made Paul McCartney's famous "violin" bass?|Höfner|Fender|Rickenbacker|Gibson|He played the left-handed Höfner 500/1.
@*NSYNC|music|NSYNC
e|Which member of *NSYNC went on to a hugely successful solo career with "Cry Me a River"?|Justin Timberlake|JC Chasez|Joey Fatone|Chris Kirkpatrick|Timberlake released it in 2002.
e|How many members were in *NSYNC?|Five|Four|Six|Three|JC, Justin, Chris, Joey and Lance.
e|Which *NSYNC hit has a music video with puppet strings?|Bye Bye Bye|Tearin' Up My Heart|Gone|Pop|The band appear as marionettes in the video.
m|Which *NSYNC member trained to travel to the International Space Station?|Lance Bass|Joey Fatone|JC Chasez|Chris Kirkpatrick|He trained in Russia in 2002 for a planned Soyuz flight.
m|In which Florida city was *NSYNC formed?|Orlando|Miami|Tampa|Jacksonville|The group formed in Orlando in 1995.
m|What was *NSYNC's 2000 album that sold 2.4 million copies in its first week?|No Strings Attached|Celebrity|*NSYNC|Home for Christmas|It broke the first-week sales record at the time.
m|What was *NSYNC's only number-one single on the Billboard Hot 100?|It's Gonna Be Me|Bye Bye Bye|This I Promise You|Girlfriend|"It's Gonna Be Me" topped the chart in 2000.
h|Who managed both *NSYNC and the Backstreet Boys early on?|Lou Pearlman|Louis Walsh|Simon Fuller|Maurice Starr|Pearlman later went to prison for fraud.
h|Which 2024 superhero film used "Bye Bye Bye" in a major scene?|Deadpool & Wolverine|The Marvels|Madame Web|Aquaman 2|The song opens a Deadpool dance sequence.
i|Which two *NSYNC members were Mouseketeers on The All-New Mickey Mouse Club?|Justin Timberlake and JC Chasez|Lance Bass and Joey Fatone|Chris Kirkpatrick and Lance Bass|Joey Fatone and Justin Timberlake|They starred alongside Britney Spears and Christina Aguilera.
@Backstreet Boys|music|Backstreet_Boys
e|Which Backstreet Boys hit contains the line "tell me why"?|I Want It That Way|Larger Than Life|Shape of My Heart|Everybody|The 1999 single is their signature song.
e|How many members are in the Backstreet Boys?|Five|Four|Six|Three|Nick, AJ, Howie, Brian and Kevin.
m|Which Backstreet Boys album was released in 1999?|Millennium|Black & Blue|Never Gone|Unbreakable|Millennium sold more than a million copies in its first week.
m|Which Backstreet Boy is the older brother of singer Aaron Carter?|Nick Carter|AJ McLean|Howie Dorough|Brian Littrell|Nick Carter is Aaron's brother.
m|Which Backstreet Boys song begins "Everybody, rock your body"?|Everybody (Backstreet's Back)|I Want It That Way|Quit Playing Games|As Long as You Love Me|The 1997 hit is known for its zombie-themed video.
m|In which city did the Backstreet Boys form?|Orlando|Los Angeles|Nashville|Atlanta|They formed in Orlando in 1993.
h|Which Backstreet Boys member left in 2006 and returned in 2012?|Kevin Richardson|Brian Littrell|AJ McLean|Howie Dorough|Kevin returned for the group's 20th anniversary.
h|Which Backstreet Boys member had heart surgery in 1998 for a hole in his heart?|Brian Littrell|Nick Carter|Howie Dorough|AJ McLean|Littrell had a procedure to repair a patent foramen ovale.
h|Which 2013 comedy features the Backstreet Boys playing themselves in the apocalypse?|This Is the End|Pineapple Express|The Hangover Part III|Neighbors|They perform a short song in a cameo.
@Tupac Shakur|music|Tupac_Shakur
e|By what stage name was Tupac also known?|2Pac|Big Pac|Pac Man|Pac Attack|He used 2Pac and later Makaveli.
e|Which Tupac song is addressed to his mother?|Dear Mama|Brenda's Got a Baby|Keep Ya Head Up|Changes|Dear Mama was released in 1995.
m|Which Tupac album is a double album released in 1996?|All Eyez on Me|Me Against the World|Strictly 4 My N.I.G.G.A.Z.|Thug Life: Volume 1|It was released in February 1996 on Death Row.
m|Which record label released Tupac's All Eyez on Me?|Death Row Records|Bad Boy Records|Def Jam|Roc-A-Fella Records|Death Row was co-founded by Suge Knight and Dr. Dre.
m|Which Tupac song features Dr. Dre and Roger Troutman?|California Love|Hit 'Em Up|Ambitionz Az a Ridah|Changes|Released in December 1995.
m|Which Tupac film co-stars Janet Jackson?|Poetic Justice|Juice|Above the Rim|Gridlock'd|Poetic Justice was released in 1993.
h|Which rap group did Tupac join as a roadie and dancer early in his career?|Digital Underground|N.W.A|Public Enemy|Run-DMC|He appeared on their 1991 hit "Same Song".
h|Which 1992 film gave Tupac his breakout acting role as Bishop?|Juice|Boyz n the Hood|Menace II Society|South Central|He played Roland Bishop.
h|Which posthumous 1996 album was released under his alias Makaveli?|The Don Killuminati: The 7 Day Theory|R U Still Down?|Better Dayz|Until the End of Time|It was released two months after his death.
i|In which borough of New York City was Tupac born in 1971?|East Harlem|The Bronx|Brooklyn|Queens|He was born in East Harlem and moved to Baltimore as a teenager.
@Bob Marley|music|Bob_Marley
e|In which country was Bob Marley born?|Jamaica|Trinidad|Cuba|Ghana|He was born in Nine Mile, Jamaica.
e|Which religion is Bob Marley most associated with?|Rastafari|Buddhism|Hinduism|Sufism|Rastafari shaped his music and message.
m|What was the name of Bob Marley's backing band?|The Wailers|The Heptones|The Skatalites|Toots and the Maytals|The group was originally Bob Marley and the Wailers.
m|Which Bob Marley album includes "One Love/People Get Ready" and "Jamming"?|Exodus|Catch a Fire|Survival|Uprising|Exodus was released in 1977.
m|Which Bob Marley compilation is one of the best-selling reggae albums ever?|Legend|Natty Dread|Burnin'|Kaya|Legend was released in 1984.
m|Which 1975 live recording of a Marley ballad about Trenchtown became his first international hit?|No Woman, No Cry|Redemption Song|Three Little Birds|Is This Love|It was recorded at London's Lyceum Theatre.
h|At the 1978 One Love Peace Concert, Bob Marley joined the hands of which two leaders?|Michael Manley and Edward Seaga|Fidel Castro and Michael Manley|Hugh Shearer and Edward Seaga|Norman Manley and Alexander Bustamante|The rival political leaders shook hands on stage.
h|Which Marley song is performed solo with an acoustic guitar on his last album?|Redemption Song|Buffalo Soldier|Could You Be Loved|Stir It Up|It appears on Uprising (1980).
h|Which health condition caused Bob Marley's death in 1981?|Melanoma|Lung cancer|Heart failure|Leukemia|The cancer started under a toenail.
i|Which Marley song honours Black regiments of the US Army?|Buffalo Soldier|Exodus|War|Zimbabwe|It was released posthumously on Confrontation (1983).
@Stevie Wonder|music|Stevie_Wonder
e|Which label signed Stevie Wonder at age 11?|Motown|Atlantic|Stax|Columbia|He recorded as Little Stevie Wonder.
e|Which 1972 Stevie Wonder song has a famous clavinet riff and reached number one in 1973?|Superstition|Sir Duke|Isn't She Lovely|Higher Ground|It reached number one in 1973.
m|Which Stevie Wonder song was written as a tribute to Duke Ellington?|Sir Duke|Superstition|Higher Ground|Signed, Sealed, Delivered|The tribute is on Songs in the Key of Life.
m|Which 1984 Stevie Wonder single won an Academy Award for Best Original Song?|I Just Called to Say I Love You|Part-Time Lover|Overjoyed|Ebony and Ivory|It was written for the film The Woman in Red.
m|Which of these Stevie Wonder albums is from 1976?|Songs in the Key of Life|Innervisions|Talking Book|Hotter than July|Songs in the Key of Life won Album of the Year.
m|Which holiday did Stevie Wonder campaign for with his song "Happy Birthday"?|Martin Luther King Jr. Day|Juneteenth|Thanksgiving|Veterans Day|The song was a 1980 campaign anthem.
h|How old was Stevie Wonder when "Fingertips" reached number one in 1963?|13|11|15|17|He was the youngest artist to top the Billboard Hot 100 at that time.
h|Which Michigan city was Stevie Wonder born in?|Saginaw|Detroit|Flint|Lansing|He was born in Saginaw in 1950.
h|How many times has Stevie Wonder won the Grammy for Album of the Year?|Three|One|Two|Four|Innervisions, Fulfillingness' First Finale and Songs in the Key of Life.
i|What condition caused Stevie Wonder's blindness?|Retinopathy of prematurity|Glaucoma|Macular degeneration|Cataracts|He was born six weeks premature.
@Power Rangers|film|Mighty_Morphin_Power_Rangers
e|Which catchphrase begins the Rangers' transformation in the original series?|It's Morphin' Time!|Hi-yah!|Power Up!|Ranger Ready!|Jason's call starts the morph sequence.
e|Who is the Red Ranger in Mighty Morphin Power Rangers?|Jason|Zack|Billy|Tommy|Jason Lee Scott is the first Red Ranger.
e|What is the name of the city where the original Power Rangers live?|Angel Grove|Bay City|Reefside|Stone Canyon|Angel Grove is a fictional California city.
e|Which Ranger color is Kimberly?|Pink|Yellow|Blue|Black|Kimberly Hart is the Pink Ranger.
e|Who is the Blue Ranger in the original team?|Billy|Zack|Jason|Tommy|Billy Cranston is the team's brain.
m|Who mentors the original Power Rangers?|Zordon|Alpha 5|Rita Repulsa|Lord Zedd|Zordon is trapped in a time warp.
m|What is the name of the Rangers' robotic assistant?|Alpha 5|Goldar|Finster|C-3PO|Alpha 5 repeats "Ai-yi-yi!".
m|Who is the main villain at the start of Mighty Morphin Power Rangers?|Rita Repulsa|Lord Zedd|Divatox|Ivan Ooze|Rita escapes her dumpster on the Moon.
m|Which Ranger is the Yellow Ranger in the original team?|Trini|Kimberly|Aisha|Tanya|Trini Kwan wears yellow.
m|Which Japanese series was adapted into Mighty Morphin Power Rangers?|Kyōryū Sentai Zyuranger|Kamen Rider|Ultraman|Voltron|The footage came from Zyuranger.
m|Which Zord does the Red Ranger pilot?|Tyrannosaurus|Mastodon|Triceratops|Pterodactyl|The Tyrannosaurus Zord is the Red Ranger's.
h|Which Ranger joins the team as the Green Ranger?|Tommy Oliver|Zack Taylor|Rocky DeSantos|Adam Park|Tommy was originally under Rita's control.
h|What is the name of Rita Repulsa's golden-armored general?|Goldar|Scorpina|Baboo|Squatt|Goldar leads her monster attacks.
h|Which juice bar do the teens hang out in?|Ernie's Juice Bar|The Youth Center Cafe|Angel Grove Diner|Smoothie Hut|Ernie runs the Angel Grove Youth Center bar.
h|Which pair of bullies often appear in Angel Grove?|Bulk and Skull|Zack and Jason|Squatt and Baboo|Finster and Goldar|Bulk and Skull later helped the Rangers.
i|What is the Black Ranger's original Zord?|Mastodon|Tyrannosaurus|Sabre-toothed Tiger|Pterodactyl|Zack Taylor's Zord is the Mastodon.
@Mortal Kombat|game|Mortal_Kombat_(1992_video_game)
e|Which character famously shouts "Get over here!" while spearing opponents?|Scorpion|Sub-Zero|Raiden|Liu Kang|Scorpion fires a spear from his hand.
e|What phrase is shouted when an opponent is ready for a Fatality?|Finish Him!|Fight!|Perfect!|Round One|The announcer says it after the final round.
e|Which fighter wields ice powers?|Sub-Zero|Scorpion|Kano|Jax|Sub-Zero can freeze opponents.
m|Who is the thunder god in the Mortal Kombat series?|Raiden|Shang Tsung|Kung Lao|Ermac|Raiden protects Earthrealm.
m|Who is the Shaolin monk champion of the first tournaments?|Liu Kang|Johnny Cage|Kung Lao|Kitana|Liu Kang wins Mortal Kombat.
m|Who created the original Mortal Kombat?|Ed Boon and John Tobias|Shigeru Miyamoto|Eugene Jarvis|Yu Suzuki|They worked at Midway.
m|Which Mortal Kombat character has four arms?|Goro|Kano|Reptile|Baraka|Goro is the Shokan prince.
m|Which sorcerer hosts the first Mortal Kombat tournament?|Shang Tsung|Shao Kahn|Quan Chi|Shinnok|Shang Tsung steals souls.
m|Which Mortal Kombat character is Kitana's clone?|Mileena|Jade|Sonya|Tanya|Mileena is a Tarkatan-Edenian hybrid clone.
m|Which fighter wears a hat that can be thrown as a spinning blade?|Kung Lao|Baraka|Jax|Ermac|Kung Lao uses his razor-rimmed hat.
h|Which fighter is a metal-armed special forces officer?|Jax|Kano|Johnny Cage|Sonya|Jax has bionic arms.
h|Which fighter is the leader of the Black Dragon known for a knife and eye laser?|Kano|Johnny Cage|Baraka|Sektor|Kano has a cybernetic eye.
h|Who is the emperor of Outworld in Mortal Kombat II?|Shao Kahn|Shang Tsung|Goro|Shinnok|Kahn invades Earthrealm.
h|Which hidden character in the first game is a green ninja?|Reptile|Scorpion|Smoke|Ermac|Reptile appears after meeting specific conditions.
h|Which fighter's name comes from "Error Macro"?|Ermac|Smoke|Rain|Noob Saibot|The name is from a rumored error-message glitch.
h|Which controversy over Mortal Kombat contributed to the creation of the ESRB?|Violence in video games|Pricing|Online play|Piracy|Congressional hearings in 1993 targeted violent games.
i|What does the name Noob Saibot derive from?|The surnames Boon and Tobias reversed|Sub-Zero reversed|A Japanese word|A Norse legend|Noob = Boon, Saibot = Tobias.
i|Which character is the original Sub-Zero who returns as Noob Saibot?|Bi-Han|Kuai Liang|Frost|Cyrax|Bi-Han was killed by Scorpion.
i|Which 1995 film features the "Techno Syndrome" theme?|Mortal Kombat|Street Fighter|Double Dragon|Super Mario Bros.|The soundtrack's theme became famous.
@Chuck Norris|film|Chuck_Norris
e|In which TV series did Chuck Norris star as a Texas lawman?|Walker, Texas Ranger|Dallas|Miami Vice|The A-Team|The show ran from 1993 to 2001.
e|Chuck Norris is best known for which discipline?|Martial arts|Boxing|Wrestling|Gymnastics|He was a world karate champion.
m|Which 1972 film features Chuck Norris fighting Bruce Lee?|Way of the Dragon|Enter the Dragon|Fist of Fury|Game of Death|The fight is set in Rome's Colosseum.
m|What is Chuck Norris's birth name?|Carlos Ray Norris|Charles Ray Norris|Carl Roy Norris|Chuck Ray Norris|Carlos Ray is his birth name.
m|Which 1984 action film begins the Chuck Norris Vietnam rescue series?|Missing in Action|Delta Force|Lone Wolf McQuade|Code of Silence|Colonel Braddock rescues POWs.
h|In which 2012 action sequel does Chuck Norris appear as Booker?|The Expendables 2|The Expendables|The Mechanic|Red 2|He plays Booker.
h|Which 1983 film stars Chuck Norris as Texas Ranger J.J. McQuade?|Lone Wolf McQuade|Hero and the Terror|Firewalker|Sidekicks|McQuade fights an arms trafficker.
h|What internet meme brought Chuck Norris a new generation of fans?|Chuck Norris Facts|Rickrolling|Doge|Planking|The jokes claim superhuman feats.
i|Which martial art did Chuck Norris create?|Chun Kuk Do|Krav Maga|Jeet Kune Do|Kyokushin|Chun Kuk Do means universal way.
i|Which 1992 family film stars Chuck Norris as himself helping a boy?|Sidekicks|Top Dog|The Hitman|Forced Vengeance|Sidekicks co-stars Jonathan Brandis.
@Mel Gibson|film|Mel_Gibson
e|Which film role is Mel Gibson famous for as a post-apocalyptic police officer?|Mad Max|Martin Riggs|William Wallace|Hamlet|Mad Max was released in 1979.
e|In which Scottish epic does Mel Gibson play William Wallace?|Braveheart|The Patriot|Rob Roy|Highlander|Gibson also directed it.
m|Which actor co-stars with Mel Gibson in Lethal Weapon?|Danny Glover|Eddie Murphy|Morgan Freeman|Samuel L. Jackson|Glover plays Roger Murtaugh.
m|Which Mel Gibson film won the Academy Award for Best Picture in 1996?|Braveheart|The Patriot|Ransom|Payback|It also won Gibson Best Director.
m|Which animated film features Mel Gibson voicing John Smith?|Pocahontas|Hercules|Mulan|Tarzan|He voices the English captain.
m|In which 2000 animated film does Mel Gibson voice Rocky the rooster?|Chicken Run|Antz|Shrek|Madagascar|Rocky is an American rooster.
h|Which 2004 film did Mel Gibson direct about Jesus?|The Passion of the Christ|Apocalypto|The Patriot|Signs|The film was in Aramaic and Latin.
h|Which 2006 Mel Gibson film is set in the Maya civilisation?|Apocalypto|Braveheart|The Passion of the Christ|Edge of Darkness|It is in Yucatec Maya.
h|Which Australian director created Mad Max?|George Miller|Peter Weir|Baz Luhrmann|Phillip Noyce|Miller directed all four Mad Max films.
h|In which 1990 Franco Zeffirelli film does Gibson play a Shakespeare role?|Hamlet|Macbeth|Henry V|Romeo and Juliet|He plays Hamlet.
i|What is the name of Max's black car in Mad Max?|The Pursuit Special|The Interceptor Z|The War Rig|Black Beauty|It is known as the V8 Interceptor.
i|Where was Mel Gibson born?|Peekskill, New York|Sydney|Dublin|Melbourne|He moved to Australia as a teenager.
@Jean-Claude Van Damme|film|Jean-Claude_Van_Damme
e|Which nickname is Jean-Claude Van Damme known by?|The Muscles from Brussels|The Belgian Beast|The Flying Frenchman|The Iron Fist|He was born in Belgium.
e|Which 1988 film features Van Damme in the Kumite tournament?|Bloodsport|Kickboxer|Lionheart|Timecop|He plays Frank Dux.
m|Which 1992 Van Damme film co-stars Dolph Lundgren?|Universal Soldier|Cyborg|Hard Target|Nowhere to Run|They play reanimated soldiers.
m|Which 1994 film sees Van Damme time travel as a cop?|Timecop|Sudden Death|Street Fighter|Maximum Risk|Timecop is based on a Dark Horse comic.
m|Which 1991 film has Van Damme playing twin brothers?|Double Impact|Death Warrant|Lionheart|Nowhere to Run|He plays both Chad and Alex.
m|Which video game character does Van Damme play in the 1994 film Street Fighter?|Guile|Ryu|Ken|Chun-Li|Raul Julia plays M. Bison.
h|Which director made Hard Target with Van Damme?|John Woo|Tsui Hark|Ringo Lam|Wong Kar-wai|Hard Target was Woo's Hollywood debut.
h|What is Van Damme's birth name?|Jean-Claude Camille François Van Varenberg|Jean-Claude Van Dam|Jean Claude Vandame|Claude Van Varenberg|He changed it for his film career.
h|Which 2008 meta film stars Van Damme as himself?|JCVD|Replicant|The Shepherd|Wake of Death|It was directed by Mabrouk El Mechri.
h|Which truck commercial featured Van Damme doing a split?|Volvo Trucks|Mack Trucks|Peterbilt|Scania|The Epic Split commercial went viral in 2013.
i|In which animated film did Van Damme voice Master Croc?|Kung Fu Panda 2|Kung Fu Panda|Rio|Epic|Master Croc is a croc-faced warrior.
i|Which 2012 film saw Van Damme play villain Vilain?|The Expendables 2|The Expendables|The Mechanic|Pound of Flesh|He plays an arms dealer.
@GoldenEye|game|GoldenEye_007_(1997_video_game)
e|Which Nintendo console had the GoldenEye 007 game?|Nintendo 64|Super Nintendo|GameCube|Game Boy|It was released in 1997.
e|Which James Bond actor starred in the 1995 film GoldenEye?|Pierce Brosnan|Sean Connery|Roger Moore|Daniel Craig|It was Brosnan's first Bond film.
m|Which studio developed GoldenEye 007 for the N64?|Rare|Nintendo EAD|Retro Studios|Intelligent Systems|Rare was based in Twycross, England.
m|How many players could play GoldenEye 007's split-screen multiplayer?|Four|Two|Six|Eight|Four-player split-screen was a hit.
m|Which famously short Bond character was often banned in multiplayer?|Oddjob|Jaws|Scaramanga|Nick Nack|Oddjob's small hitbox gave him an advantage.
h|What does the classic house rule "Slappers only" limit GoldenEye players to?|Unarmed slap attacks|The Klobb submachine gun|Proximity mines|The golden gun|Players fight with their bare hands.
h|Which level starts GoldenEye 007 with a bungee jump?|Dam|Facility|Runway|Bunker|The Dam opening is a famous leap.
i|Which cheat in GoldenEye makes everyone's heads very large?|DK Mode|Paintball Mode|Invisibility|Turbo Mode|DK Mode gives enlarged heads and arms.
@Nintendo|game|Nintendo
e|What is the name of Mario's younger brother?|Luigi|Wario|Waluigi|Toad|Luigi first appeared in Mario Bros.
e|Who is the main hero of The Legend of Zelda?|Link|Zelda|Ganon|Epona|Link wears a green tunic.
e|Which Pokémon is Ash Ketchum's partner?|Pikachu|Charmander|Squirtle|Eevee|Pikachu is the franchise mascot.
m|Who created Mario and Donkey Kong?|Shigeru Miyamoto|Hideo Kojima|Satoru Iwata|Gunpei Yokoi|Miyamoto is a Nintendo legend.
m|Which Mario Kart item targets the player in first place?|Blue Shell|Banana|Green Shell|Mushroom|The Spiny Shell homes in on the leader.
m|Which Nintendo handheld came with Tetris in 1989?|Game Boy|Game Gear|Lynx|Virtual Boy|Tetris was a launch pack-in.
m|What is Mario's original name in Donkey Kong?|Jumpman|Plumber Joe|Mr. Video|Marioman|He became Mario in later releases.
m|Which game features a bounty hunter named Samus Aran?|Metroid|Kid Icarus|Star Fox|F-Zero|Samus is revealed to be a woman.
m|What is the kingdom in The Legend of Zelda?|Hyrule|Sinnoh|Mushroom Kingdom|Lylat|Hyrule is home to Zelda and Link.
h|Which Nintendo system was released in 2006 with motion controls?|Wii|Switch|GameCube|Wii U|Wii Sports was bundled with it.
h|What was Nintendo's original product when it was founded in 1889?|Hanafuda playing cards|Toys|Video games|Calculators|It was founded in Kyoto.
h|Which 1999 game launched the Super Smash Bros. series?|Super Smash Bros. on N64|Super Smash Bros. Melee|Brawl|Ultimate|It featured twelve fighters.
h|Which character is Kirby's archenemy and a penguin king?|King Dedede|Meta Knight|Waddle Dee|Marx|Dedede is a recurring rival.
m|What power-up gives Mario temporary invincibility?|Super Star|Fire Flower|Super Mushroom|Cape Feather|The Super Star plays a fast tune.
e|Which kingdom does Princess Peach rule?|Mushroom Kingdom|Kingdom of Koopa|Dream Land|Hyrule|It is Mario's home setting.
`;
const levels={e:'easy',m:'medium',h:'hard',i:'impossible'};
function parseFacts(text){let source,category,page;return text.trim().split('\n').filter(Boolean).flatMap(line=>{
 if(line.startsWith('@')){[source,category,page]=line.slice(1).split('|');return [];}
 const[difficulty,q,answer,a,b,c,explanation]=line.split('|');
 return [{source,category,difficulty:levels[difficulty],q,answers:[answer,a,b,c],correct:0,explanation,provenance:'v0.44 authored factual expansion; subject page linked for review',citations:[{label:source,url:'https://en.wikipedia.org/wiki/'+page}]}];
});}
const LEGENDS_TRIVIA=parseFacts(FACTS);
const LEGENDS_TRIVIA_THEMES=[
 {tag:'beatles',title:'Abbey Road · Beatles Quiz',icon:'🎸',source:'The Beatles',description:'Liverpool, Abbey Road and four lads who changed everything.',sources:['The Beatles']},
 {tag:'boybands',title:'Boy Band Bracket · *NSYNC vs Backstreet',icon:'🎤',source:'Backstreet Boys',description:'Choreography, harmony and 1990s teen idols.',sources:['*NSYNC','Backstreet Boys']},
 {tag:'legends',title:'Legends · Soul, Reggae & Hip-Hop',icon:'🎧',source:'Bob Marley',description:'Tupac, Bob Marley and Stevie Wonder.',sources:['Tupac Shakur','Bob Marley','Stevie Wonder']},
 {tag:'rangers',title:'Morphin Time · Power Rangers Quiz',icon:'🔴',source:'Power Rangers',description:'Zords, Rangers and Angel Grove.',sources:['Power Rangers']},
 {tag:'kombat',title:'Mortal Kombat · Finish-Him Quiz',icon:'🐉',source:'Mortal Kombat',description:'Fighters, fatalities and Outworld history.',sources:['Mortal Kombat']},
 {tag:'martial',title:'Roundhouse · Action Legends',icon:'🥋',source:'Chuck Norris',description:'Chuck Norris, Mel Gibson and Jean-Claude Van Damme.',sources:['Chuck Norris','Mel Gibson','Jean-Claude Van Damme']},
 {tag:'goldeneye',title:'Proximity Mines · GoldenEye 64',icon:'🕹',source:'GoldenEye',description:'Slappers only. No Oddjob.',sources:['GoldenEye']},
 {tag:'nintendo',title:'Nintendo Power Quiz',icon:'🍄',source:'Super Mario',description:'Mario, Zelda, Metroid and a thousand power-ups.',sources:['Nintendo']}
];
Object.assign(exports,{LEGENDS_TRIVIA,LEGENDS_TRIVIA_THEMES});
