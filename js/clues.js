import {STORY_CAST,getCharacter} from './cast.js?v=20261018story';
import {movePoint} from './world-layout.js?v=20261018story';
// Original memory content, retained below for the 32-clue journey. {id, zone, x, z, kind, photo, caption, npc?, hint?}
// kinds: hidden | villager | animal | reflection | boat | finale
// photos 1-10 use the real photos in order; 11-32 are placeholder cards;
// The original finale photo now belongs to clue 32.

const P = (n) => `assets/photos/${n}`;

const ORIGINAL_CLUES = [
  // ---- Tower Hill (1-5) ----
  { id: 1, zone: "tower", x: -12, z: -104, kind: "hidden", photo: P("01-mom-toddler.jpg"), caption: "Where it all began — in mom's arms." },
  { id: 2, zone: "tower", x: -15, z: -85, kind: "hidden", photo: P("01-toddler-garden.jpg"), caption: "Tiny explorer in the garden.",
    riddle: { prompt: "What am I?", options: ["Tiny", "TINY", "TinY"] } },
  { id: 3, zone: "tower", x: 8, z: -84, kind: "villager", photo: P("02-toddler-temple-fixed.jpg"), caption: "Temple stones and a stone elephant.",
    npc: "Eugene Fitzherbert (Flynn Rider)", hint: "They say golden sparkles hide behind the tower stairs… keep looking around here." },
  { id: 4, zone: "tower", x: -7, z: -100, kind: "hidden", photo: P("04-toddler-field.jpg"), caption: "Barefoot and fearless in the open field." },
  { id: 5, zone: "tower", x: 10, z: -95, kind: "animal", photo: P("11-toddler-overalls.jpg"), caption: "Official portrait, overalls and all.", critter: "rabbit" },

  // ---- Forest (6-11) ----
  { id: 6, zone: "forest", x: 70, z: -30, kind: "hidden", photo: P("18-museum-bears.jpg"), caption: "Pigtails on the bridge." },
  { id: 7, zone: "forest", x: 88, z: -48, kind: "animal", photo: P("03-girl-palms.jpg"), caption: "That look — she knew her mind.", critter: "rabbit" },
  { id: 8, zone: "forest", x: 78, z: -22, kind: "hidden", photo: P("09-girl-bushes.jpg"), caption: "Peeking through the roses." },
  { id: 9, zone: "forest", x: 95, z: -32, kind: "hidden", photo: P("12-child-pink-traditional.jpg"), caption: "Serious face, traditional pink." },
  { id: 10, zone: "forest", x: 72, z: -52, kind: "animal", photo: P("13-teen-giraffe.jpg"), caption: "Teen years — giraffes and butterfly dreams.", critter: "chameleon" },
  { id: 11, zone: "forest", x: 85, z: -15, kind: "reflection", photo: P("14-panda-festival.jpg"), caption: "Peace signs with a giant panda." },

  // ---- Tavern (12-16) ----
  { id: 12, zone: "tavern", x: 80, z: 40, kind: "villager", photo: P("15-barbie-crown.jpg"), caption: "Barbie crown, McDonald's, pure joy.",
    npc: "Hook Hand", hint: "A rain barrel out back? I hid nothin', I swear! …Or did I? Go see." },
  { id: 13, zone: "tavern", x: 96, z: 52, kind: "hidden", photo: P("16-restaurant-umbrellas.jpg"), caption: "Pink dress under paper umbrellas." },
  { id: 14, zone: "tavern", x: 98, z: 40, kind: "villager", photo: P("19-beach-couple.jpg"), caption: "Beach kiss under the palms.",
    npc: "Shorty", hint: "Somethin' shiny under the bench where I nap. Don't tell the others." },
  { id: 15, zone: "tavern", x: 85, z: 50, kind: "hidden", photo: P("20-lavender-dress.jpg"), caption: "Serene in lavender, surrounded by green." },
  { id: 16, zone: "tavern", x: 93, z: 49.5, kind: "hidden", photo: P("21-desert-sand.jpg"), caption: "Kicking up desert sand." },

  // ---- Village (17-23) ----
  { id: 17, zone: "village", x: -8, z: 84, kind: "villager", photo: P("22-red-coat-mountains.jpg"), caption: "Red coat, autumn mountains.",
    npc: "Queen Arianna", hint: "The old well keeps secrets behind it. I saw sparkles there at dusk." },
  { id: 18, zone: "village", x: 3, z: 93, kind: "hidden", photo: P("23-bw-artistic.jpg"), caption: "Timeless in black and white." },
  { id: 19, zone: "village", x: 10, z: 98, kind: "villager", photo: P("24-lattice-wall.jpg"), caption: "Flower crown against geometry.",
    npc: "Attila", hint: "Check under my market stall — mind the pies, they're hot!" },
  { id: 20, zone: "village", x: -12, z: 96, kind: "hidden", photo: P("25-cherry-blossoms.jpg"), caption: "Glowing under cherry blossoms." },
  { id: 21, zone: "village", x: 5, z: 80, kind: "villager", photo: P("26-blue-floral-forest.jpg"), caption: "Blue florals in the mossy forest.",
    npc: "Little Girl with Braids", hint: "I saw sparkles by the flower cart! Shiny shiny!" },
  { id: 22, zone: "village", x: -5, z: 100, kind: "hidden", photo: P("27-floral-forest-road.jpg"), caption: "Her own path through the woods." },
  { id: 23, zone: "village", x: -10, z: 88, kind: "villager", photo: P("06-greensaree.jpg"), caption: "Regal in green and gold.",
    npc: "King Frederic", hint: "The festival stage holds the greatest treasure of all. You'll see." },

  // ---- Lake (24-28) ----
  { id: 24, zone: "lake", x: -56, z: 24, kind: "reflection", photo: P("10-greensaree-print.jpg"), caption: "The green saree, captured forever." },
  { id: 25, zone: "lake", x: -50, z: 16, kind: "villager", photo: P("08-whitesaree.jpg"), caption: "Grace in white and yellow blooms.",
    npc: "Lance Strongbow", hint: "The lake shows memories in its reflection. And the old boat? It remembers too." },
  { id: 26, zone: "lake", x: -62, z: 20, kind: "boat", photo: P("28-starry-paintings.jpg"), caption: "Grace in white, glowing like starlight." },
  { id: 27, zone: "lake", x: -62, z: 36, kind: "reflection", photo: P("29-sunset-arms.jpg"), caption: "Arms open to the sunset." },
  { id: 28, zone: "lake", x: -66, z: 24, kind: "animal", photo: P("30-water-selfie.jpg"), caption: "Sunglasses and confidence by the water.", critter: "duck" },

  // ---- Festival (29-33) ----
  { id: 29, zone: "festival", x: -57, z: -53, kind: "hidden", photo: P("05-mountains.jpg"), caption: "On top of the world, peace sign high." },
  { id: 30, zone: "festival", x: -40, z: -61, kind: "hidden", photo: P("07-glasses-selfie.jpg"), caption: "That confident smile." },
  { id: 31, zone: "festival", x: -48, z: -68, kind: "animal", photo: P("31-beach-umbrella.jpg"), caption: "Yellow umbrella, beach days, love.", critter: "chameleon" },
  { id: 32, zone: "festival", x: -38, z: -56, kind: "hidden", photo: P("32-collage-finale.jpg"), caption: "Every version of you, in one frame." },
  { id: 33, zone: "festival", x: -45, z: -65, kind: "finale", photo: P("06-greensaree.jpg"), caption: "The grand finale." },
];

// Shared encounters give every one of the 34 characters a role in 32 clues.
const PLACEMENT = [["tower", -20, -110],["tower", 15, -100],["tower", 0, -70],["forest", 55, -55],["forest", 105, -55],["forest", 55, -25],["forest", 105, -25],["forest", 80, -70],["tavern", 70, 30],["tavern", 110, 30],["tavern", 70, 60],["tavern", 110, 60],["tavern", 90, 20],["cave", 120, 45],["cave", 155, 45],["cave", 120, 65],["cave", 155, 65],["cave", 138, 35],["village", -25, 75],["village", 25, 75],["village", -25, 105],["village", 25, 105],["castle", -20, 145],["castle", 20, 145],["castle", 0, 175],["dark", 125, -140],["dark", 165, -140],["dark", 145, -105],["sundrop", -140, -50],["sundrop", -115, -25],["lake", -35, 5],["lake", -35, 35],];
// Location discoveries share a chapter with their hosts, rather than requiring
// 32 conversations. The original ring/sparkle and photo interactions remain.
const DISCOVERIES = {
  1:['Rapunzel’s painting','paint'],2:['Gothel’s mirror','mirror'],
  5:['the guard’s shield in the forest','guard'],7:['Owl’s lookout perch','perch'],
  10:['the tavern bouquet','flowers'],11:['the ceramic unicorn','unicorn'],13:['the Duckling’s back-door sign','sign'],
  15:['the tunnel puppet stage','puppet'],16:['the supply crate beside the tunnel rails','barrel'],18:['the knotted rope at the tunnel exit','rope'],
  19:['the market’s fabric swatches','design'],21:['the stitched ribbon','sew'],
  24:['the castle lantern','lantern'],25:['Varian’s glowing experiment','alchemy'],
  27:['the black-rock inscription','stone'],28:['the enchanted reflection','magic'],
  29:['the Sundrop flower','flower'],30:['the picnic basket beside the cove','bread']
};
export const CLUES = PLACEMENT.map(([zone,x,z],i)=>{
 const id=i+1,characters=STORY_CAST[i],owner=getCharacter(characters[0]);
 const memory=ORIGINAL_CLUES[id===32?32:i],discovery=DISCOVERIES[id];
 const next=STORY_CAST[i+1]?.map(getCharacter).map(c=>c.name).join(' and ');
 const hint=discovery?`${owner.line} Look for ${discovery[0]} nearby — it holds your next memory.`:id===31?'Maximus paws the ground and turns toward the lake. Follow him — Flynn is waiting at the pier.':id===32?'You found me. There is one last memory waiting on the lake. Come take a boat ride with me.':`${owner.line} Your next memory is with ${next}.`;
 return {id,zone,...movePoint(zone,{x,z}),kind:discovery?(id===2||id===28?'reflection':'hidden'):'villager',...(discovery?{discovery:{label:discovery[0],activity:discovery[1]}}:{}),characters,npc:characters.map(getCharacter).map(c=>c.name).join(' & '),hint,photo:memory.photo,caption:memory.caption,...(memory.riddle?{riddle:memory.riddle}:{}),...(id===32?{finale:true}:{})};
});
export const getClue = id => CLUES.find(c=>c.id===id);

export const INTERACTIONS = {
  "1": {
    "type": "game",
    "game": "paint-lantern",
    "intro": "That's right! Now \u2014 every lantern needs color. Paint yours!",
    "outro": "Beautiful! That's the light you brought into the world."
  },
  "2": {
    "type": "riddle"
  },
  "3": {
    "type": "game",
    "game": "find-pascal",
    "intro": "Do you know why I follow you everywhere? Because we're best friends! But right now \u2014 I'm hiding! Can you find me?",
    "outro": "Ack! You found me! Best friends always find each other."
  },
  "4": {
    "type": "dialogue",
    "text": "Look at you \u2014 running with no shoes, no fear. I guarded a kingdom for years. You were guarding something better: joy. Keep running, little one."
  },
  "5": {
    "type": "choice",
    "prompt": "Important question! For your official portrait: silly face or serious face?",
    "options": [
      "Silly face!",
      "Serious face"
    ],
    "responses": [
      "Ha! That's the one! The queen of silly faces!",
      "Oh, very dignified. Very royal. I like it!"
    ],
    "outro": "Either way, you nailed it."
  },
  "6": {
    "type": "choice",
    "prompt": "Okay, be honest \u2014 on that bridge, were you thinking about jumping in?",
    "options": [
      "Yes!",
      "No way!"
    ],
    "responses": [
      "Ha! I knew it! The captain says don't, but I get it.",
      "Smart. The water's cold. But I bet you wanted to."
    ],
    "outro": "That adventurous spark? Never lose it."
  },
  "7": {
    "type": "dialogue",
    "text": "Arms crossed, chin up. You already knew your own mind at that age. Owl and I respect that. The forest is for the free \u2014 and you were the freest."
  },
  "8": {
    "type": "choice",
    "prompt": "You were peeking through the roses like a little spy. Were you hiding, or were you...",
    "options": [
      "Hunting for adventure!",
      "Just playing!"
    ],
    "responses": [
      "I knew it! A fellow adventurer!",
      "The best kind of playing \u2014 the kind with imagination."
    ],
    "outro": "Either way, you found the magic."
  },
  "9": {
    "type": "choice",
    "prompt": "Quick! If you could have one talent \u2014 piano like me, or sword fighting?",
    "options": [
      "Piano!",
      "Sword fighting!"
    ],
    "responses": [
      "YES! Music! Hook Hand approves!",
      "Ha! A warrior! I like your spirit!"
    ],
    "outro": "You look like you could do both, honestly."
  },
  "10": {
    "type": "choice",
    "prompt": "What is the animal you like?",
    "options": [
      "Giraffe",
      "Me",
      "You"
    ],
    "responses": [
      "I knew you always have the Birds Eye!",
      "I knew you always have the Birds Eye!",
      "I knew you always have the Birds Eye!"
    ],
    "outro": "The Snuggly Duckling raises a glass to every young dreamer \u2014 especially you."
  },
  "11": {
    "type": "choice",
    "prompt": "I collect ceramic unicorns. But this photo \u2014 you with the panda \u2014 where should I put it?",
    "options": [
      "With the treasures!",
      "In your heart!"
    ],
    "responses": [
      "Yes! Right next to my favorite unicorn!",
      "Oh... that's the best answer. Right here. *taps chest*"
    ],
    "outro": "Some things are too wonderful for a shelf."
  },
  "12": {
    "type": "dialogue",
    "text": "A Barbie crown at McDonald's! I bake cupcakes for a living, and even I know \u2014 that's iconic. You were always the kind of person who makes ordinary moments magical."
  },
  "13": {
    "type": "dialogue",
    "text": "...",
    "silent": true
  },
  "14": {
    "type": "choice",
    "prompt": "Beach kiss under a palm tree! Okay, I have to ask \u2014 was it romantic?",
    "options": [
      "Very!",
      "A little!",
      "None of your business!"
    ],
    "responses": [
      "Awww! Shorty loves love!",
      "A little is perfect! Just enough!",
      "Ha! Fair! Shorty respects privacy!"
    ],
    "outro": "Love looks good on you."
  },
  "15": {
    "type": "dialogue",
    "text": "Peace sign among the plants. You look so calm here, so at peace with yourself. My puppets do a little dance every time I show them this photo."
  },
  "16": {
    "type": "choice",
    "prompt": "I have a riddle! What gets bigger the more you kick it?",
    "options": [
      "A sand cloud!",
      "My energy!"
    ],
    "responses": [
      "Yes! Like in your desert photo! You're good at this!",
      "Ha! Also true! You have endless energy!"
    ],
    "outro": "That desert day \u2014 pure joy in motion."
  },
  "17": {
    "type": "choice",
    "prompt": "Red coat, autumn mountains. If you could conquer one thing \u2014 a mountain or a fear?",
    "options": [
      "A mountain!",
      "A fear!"
    ],
    "responses": [
      "With that coat? Already done!",
      "Brave answer. The mountains are easier, honestly."
    ],
    "outro": "You look like you could do both."
  },
  "18": {
    "type": "dialogue",
    "text": "Black and white. Timeless. Some photos capture a moment \u2014 this one captures you. Elegant, strong, unforgettable. The cave is dark, but you never were."
  },
  "19": {
    "type": "choice",
    "prompt": "I design clothes. That lattice wall, the flower crown \u2014 if you could wear one color forever, what would it be?",
    "options": [
      "Pink!",
      "Blue!",
      "Every color!"
    ],
    "responses": [
      "Classic! Feminine! Powerful!",
      "Bold! Calm! Like the ocean!",
      "Yes! Why choose? You're a rainbow!"
    ],
    "outro": "Whatever you wear, you make it fashion."
  },
  "20": {
    "type": "dialogue",
    "text": "Cherry blossoms. You, glowing under them. I used to brawl for a living \u2014 now I arrange flowers. The most beautiful things bloom without trying. Like you."
  },
  "21": {
    "type": "choice",
    "prompt": "Blue florals in the forest \u2014 you look like a princess. If I sewed you a ribbon for this moment, it would say...",
    "options": [
      "Brave!",
      "Free!"
    ],
    "responses": [
      "Brave! Strong! Beautiful!",
      "Free! Wild! Wonderful!"
    ],
    "outro": "I'd sew it in gold thread."
  },
  "22": {
    "type": "game",
    "game": "flower-crown",
    "intro": "You look like a forest princess! I weave flowers into braids \u2014 can we make a crown together?",
    "outro": "We're twins now! When I grow up, I want to be just like you."
  },
  "23": {
    "type": "dialogue",
    "text": "That green saree. The gold. You don't just wear royalty \u2014 you are royalty. A true queen of Corona doesn't follow paths. She makes them."
  },
  "24": {
    "type": "choice",
    "prompt": "Oh, my dear. This photo is a treasure. If you could keep one memory in a lantern forever, would it be this one?",
    "options": [
      "Yes!",
      "I have better ones!"
    ],
    "responses": [
      "Then I'll light two lanterns \u2014 one for the memory, one for you.",
      "Oh, I can't wait to see them. This one's still pretty wonderful."
    ],
    "outro": "You shine brighter than any lantern."
  },
  "25": {
    "type": "game",
    "game": "tic-tac-toe",
    "intro": "Okay, science time! I calculated a 100% win probability for you. See this tic-tac-toe board?",
    "outro": "My calculations were correct! Science is never wrong! Ruddiger gives it fourteen thumbs up!"
  },
  "26": {
    "type": "dialogue",
    "text": "White saree among yellow flowers. Light in the darkness. I ruled the Dark Kingdom for years \u2014 I know darkness. And I know light when I see it. You bring it everywhere."
  },
  "27": {
    "type": "choice",
    "prompt": "Arms open to the sunset. I've crossed deserts, seen magic most people dream of. But tell me \u2014 what were you feeling?",
    "options": [
      "Free!",
      "Happy!",
      "Alive!"
    ],
    "responses": [
      "Freedom. The greatest magic.",
      "Happiness. Rarer than any jewel.",
      "Alive. That's the whole point, isn't it?"
    ],
    "outro": "Whatever it was \u2014 hold onto it."
  },
  "28": {
    "type": "choice",
    "prompt": "I am the enchanted reflection. Answer me this: what do you see when you look at yourself?",
    "options": [
      "Strength!",
      "Love!",
      "Me!"
    ],
    "responses": [
      "Yes. It radiates from you.",
      "The most powerful magic.",
      "Exactly. And that's enough."
    ],
    "outro": "The reflection is pleased. So am I."
  },
  "29": {
    "type": "dialogue",
    "text": "Mountains behind you, peace sign up! The Sundrop flower only blooms for the brightest hearts. It bloomed the day this photo was taken \u2014 I know, I was there."
  },
  "30": {
    "type": "choice",
    "prompt": "Picnic time! If you could eat one thing forever \u2014 pizza or tacos?",
    "options": [
      "Pizza!",
      "Tacos!"
    ],
    "responses": [
      "Classic! Eugene would agree!",
      "Bold! Spicy! I like it!"
    ],
    "outro": "With that smile, everything tastes better."
  },
  "31": {
    "type": "game",
    "game": "light-lanterns",
    "intro": "He knows that smile. That's the look of someone who's found their person.",
    "outro": "Beautiful. Just like you. Come on \u2014 Flynn's waiting at the pier. Let's go."
  },
  "32": {
    "type": "dialogue",
    "text": "I collected every version of you \u2014 the toddler in the garden, the dreamer with the panda, the queen in the saree. And I'd choose every single one of them again. Now... how about that boat ride?"
  }
};
