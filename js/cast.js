// User-supplied Tangled cast. Presentation only: no clue sequencing or movement rules.
const person = (id, name, description, color, hair, activity, detail, line) =>
  ({ id, name, description, color, hair, activity, detail, line });
export const CAST = [
  person('rapunzel','Rapunzel','The Princess of Corona, whose seventy feet of magical golden hair can heal and reverse aging.',0xb28bce,0xf0cb58,'paint','braid','Every wall can become a painting. I’m adding a little more sunshine to this one.'),
  person('eugene','Eugene Fitzherbert (Flynn Rider)','A charismatic thief who leaves his criminal life behind after falling in love with Rapunzel.',0x438b88,0x593d29,'map','vest','Flynn Rider, at your service. Well, Eugene. I’m checking the way back to Corona.'),
  person('gothel','Mother Gothel','A vain, manipulative woman who keeps Rapunzel isolated to exploit her hair’s rejuvenating magic.',0x762e3f,0x241f26,'mirror','curls','Just checking my reflection. The Sundrop Enclave holds a story I know rather well.'),
  {id:'pascal',name:'Pascal',species:'chameleon',description:'Rapunzel’s fiercely loyal chameleon and lifelong companion in the tower.',line:'Pascal stays close, keeping an eye out for your next clue.'},
  {id:'maximus',name:'Maximus',species:'horse',description:'The relentless palace horse who takes his duties as a royal guard very seriously.',line:'Maximus checks the road, flicks an ear, and resumes his watch.'},
  person('frederic','King Frederic','The stoic, deeply loving King of Corona, who mourns his missing daughter for eighteen years.',0x344f87,0x79604c,'scroll','crown','I’m reviewing the plans for the evening at Corona Castle.'),
  person('arianna','Queen Arianna','Rapunzel’s gentle, resilient mother and the heart behind Corona’s annual lantern tradition.',0xbb728f,0x8b5c37,'lantern','tiara','One more lantern ready for the evening. Every light carries a little hope.'),
  person('patchy','Patchy Stabbington','A towering, eye-patched brute who pursues Flynn after the stolen-crown betrayal.',0x6a4b36,0xb36b32,'sharpen','patch','A blade needs looking after. So does a certain stolen crown.'),
  person('sideburns','Sideburns Stabbington','Patchy’s twin brother and equally ruthless criminal partner.',0x67533d,0xb36b32,'rope','sideburns','I’m checking the knots. My brother can do the talking.'),
  person('captain','Captain of the Guard','The frustrated leader of Corona’s military, repeatedly outmaneuvered by Flynn Rider.',0x626d83,0x59606c,'guard','helmet','Keep the road clear. The royal patrol is still on duty.'),
  person('stan','Stan','A heavily armored palace guard involved in the forest search for Flynn.',0x677c9c,0x5e4837,'guard','helmet','Polishing the shield. A guard should always look ready.'),
  person('pete','Pete','Stan’s partner in the royal guard, a little less capable in his duties.',0x5e7393,0x805f45,'guard','helmet','I think I polished the same spot twice. Better make it three times.'),
  person('hook','Hook Hand','The intimidating, hook-handed pub ruffian whose dream is to become a concert pianist.',0x6a5546,0x533e2e,'piano','hook','Listen to this phrase. One day, a concert hall; tonight, the Snuggly Duckling.'),
  person('bignose','Big Nose','A rugged pub ruffian with a romantic soul who dreams of finding true love.',0x6c8658,0x805d34,'flowers','ruffian','A bouquet should say something lovely before you say a word.'),
  person('vladimir','Vladimir','A massive bruiser with a gentle secret: a collection of ceramic unicorns.',0x71604e,0x9c7a51,'unicorn','ruffian','Careful with this one. I’m giving my favorite little unicorn a polish.'),
  person('attila','Attila','The helmeted ruffian who dreams of becoming a master cupcake baker.',0x785a41,0x4e3930,'bake','fullHelmet','A little frosting, a little patience. The next batch is nearly ready.'),
  person('shorty','Shorty','The tiny, eccentric old pub regular, known for Cupid costumes and unexpected commentary.',0x99756c,0xb4a69a,'mug','small','A toast! To… ah. Give me a moment. I had something wonderful.'),
  person('ulf','Ulf','The Snuggly Duckling patron whose passion is professional mime.',0x927289,0x43312c,'mime','ruffian','Ulf silently presses against an invisible wall, then gives an elaborate bow.'),
  person('gunther','Gunther','A hulking ruffian who dreams of being an interior designer.',0x6a7b86,0x735237,'design','ruffian','This corner needs a softer color. I’m trying a few combinations.'),
  person('tor','Tor','A tavern brawler who hopes to leave crime behind and become a florist.',0x668550,0x704c31,'flowers','ruffian','A stem here, a bloom there. Flowers suit me better than brawling.'),
  person('killer','Killer','The surprisingly small ruffian whose real passion is sewing and tailoring.',0x93697a,0x5c4030,'sew','small','Just one more stitch. Even ruffians deserve a well-fitted coat.'),
  person('fang','Fang','The tough-looking ruffian whose hidden passion is putting on puppet shows.',0x75658d,0x513b2a,'puppet','ruffian','And now, a very brave little puppet with a very big adventure.'),
  person('greno','Greno','The burly pub regular who helps Rapunzel and Flynn escape through the hidden tunnel.',0x6f6552,0x4d3528,'barrel','ruffian','I’m stacking the supplies. The Secret Cave Tunnel is part of this tavern’s story.'),
  person('braids','Little Girl with Braids','The young Corona villager who helps weave flowers into Rapunzel’s long golden braid.',0xd987ad,0x8e562d,'flowers','pigtails','These little flowers will look beautiful woven into a braid.'),
  person('cassandra','Cassandra','Rapunzel’s pragmatic lady-in-waiting, an accomplished swordswoman and Gothel’s daughter.',0x3b6475,0x283644,'sharpen','cape','Keep your blade steady. I’m getting in a little practice before the next journey.'),
  person('varian','Varian','The brilliant, socially awkward fourteen-year-old alchemist from Old Corona.',0x417c86,0x302d2a,'alchemy','goggles','Just one tiny adjustment to the mixture. Ruddiger, leave that alone!'),
  person('lance','Lance Strongbow','Eugene’s boisterous, food-loving childhood friend and former partner in crime.',0x9b6c48,0x31241f,'bread','vest','A quiet view and something good to eat. Eugene should try this more often.'),
  {id:'ruddiger',name:'Ruddiger',species:'raccoon',description:'Varian’s mischievous but deeply loyal pet raccoon.',line:'Ruddiger turns a little flask over in his paws, then carefully sets it down.'},
  {id:'fidella',name:'Fidella',species:'horse',description:'Cassandra’s calm, reliable palace horse and a romantic interest for Maximus.',line:'Fidella grazes quietly, pausing to flick an ear toward the palace road.'},
  {id:'owl',name:'Owl',species:'owl',description:'Cassandra’s intelligent, deadpan bird-of-prey companion.',line:'Owl turns his head, surveys the road, and gives a measured flutter.'},
  person('edmund','King Edmund','The brooding ruler of the Dark Kingdom and Eugene’s biological father.',0x414356,0xaaa1a0,'scroll','darkCrown','These old maps lead far beyond Corona, toward the Dark Kingdom.'),
  person('adira','Adira','The enigmatic Dark Kingdom warrior who carries a blade made of indestructible black rock.',0x9a5765,0xe0d8c8,'sharpen','cape','A black-rock blade deserves careful handling. I’m checking its balance.'),
  person('zhantiri','Zhan Tiri','The ancient demonic sorceress whose dark magic threatens the realm.',0x4b315b,0x292131,'magic','horns','Such interesting light in this valley. I’m studying it… closely.'),
  person('kiera','Kiera (Angry)','The scrappy, fiercely independent young thief who comes to befriend Rapunzel and Eugene.',0x9b684f,0x402b27,'rope','small','A good knot is useful. So is keeping an eye on your own bag.'),
];
export const getCharacter = id => CAST.find(c => c.id === id);
export const CLUE_CAST = {3:'eugene',12:'hook',14:'shorty',17:'arianna',19:'attila',21:'braids',23:'frederic',25:'lance'};
export const WANDER_CAST = ['rapunzel','gothel','varian','edmund','cassandra','adira','patchy','sideburns','gunther','tor','kiera','zhantiri','captain','stan','pete'];
export const TAVERN_CAST = ['bignose','killer','vladimir','ulf','fang','greno'];

// Additional locations are lore references, not new routes or moved clue locations.
export const PLACE_LORE = [
  {name:"Rapunzel's Tower",zone:'tower',description:'The hidden, door-less spire in a secluded rock canyon.'},
  {name:'The Kingdom of Corona',zone:'village',description:'The island kingdom known for its sun motifs, streets and maritime life.'},
  {name:'The Snuggly Duckling',zone:'tavern',description:'The deceptively named forest tavern and home of the dreaming ruffians.'},
  {name:'Corona Castle',zone:null,description:'The royal palace overlooking Corona’s bay.',speaker:'frederic'},
  {name:'The Secret Cave Tunnel',zone:null,description:'The hidden passage beneath the Snuggly Duckling.',speaker:'greno'},
  {name:'The Sundrop Enclave',zone:null,description:'The coastal hiding place of the magical golden flower.',speaker:'gothel'},
  {name:'The Dark Kingdom',zone:null,description:'The distant realm corrupted by the Moonstone.',speaker:'edmund'},
];
