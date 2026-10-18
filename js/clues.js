import {STORY_CAST,getCharacter} from './cast.js?v=20261018story';
import {movePoint} from './world-layout.js?v=20261018story';
// Original memory content, retained below for the 32-clue journey. {id, zone, x, z, kind, photo, caption, npc?, hint?}
// kinds: hidden | villager | animal | reflection | boat | finale
// photos 1-10 use the real photos in order; 11-32 are placeholder cards;
// The original finale photo now belongs to clue 32.

const P = (n) => `assets/photos/${n}`;

const ORIGINAL_CLUES = [
  // ---- Tower Hill (1-5) ----
  { id: 1, zone: "tower", x: -12, z: -104, kind: "hidden", photo: P("01-mom-toddler.jpg"), caption: "This is where your story starts — in someone's arms, completely loved. I painted this one myself. Every tower needs its first light. — Rapunzel" },
  { id: 2, zone: "tower", x: -15, z: -85, kind: "hidden", photo: P("01-toddler-garden.jpg"), caption: "Look how small you were. The world was enormous and you walked into it anyway. Even I can admit — that took courage. — Mother Gothel",
    riddle: { prompt: "What am I?", options: ["Tiny", "TINY", "TinY"] } },
  { id: 3, zone: "tower", x: 8, z: -84, kind: "villager", photo: P("02-toddler-temple-fixed.jpg"), caption: "Ack! Big stone elephant! You weren't scared though. You never were. That's why I like you. — Pascal",
    npc: "Eugene Fitzherbert (Flynn Rider)", hint: "They say golden sparkles hide behind the tower stairs… keep looking around here." },
  { id: 4, zone: "tower", x: -7, z: -100, kind: "hidden", photo: P("04-toddler-field.jpg"), caption: "Running full speed, no shoes, no fear. I spent years guarding a kingdom — you were guarding your own joy. — Captain of the Guard" },
  { id: 5, zone: "tower", x: 10, z: -95, kind: "animal", photo: P("11-toddler-overalls.jpg"), caption: "Studio portrait, very official. You look like you're about to announce something important. Probably snack time. — Stan", critter: "rabbit" },

  // ---- Forest (6-11) ----
  { id: 6, zone: "forest", x: 70, z: -30, kind: "hidden", photo: P("18-museum-bears.jpg"), caption: "Pigtails on a bridge over the water! You look like you're deciding whether to jump in. — Pete" },
  { id: 7, zone: "forest", x: 88, z: -48, kind: "animal", photo: P("03-girl-palms.jpg"), caption: "Arms crossed. That look. You were already the kind of kid who knew her own mind. Owl respects that. — Cassandra", critter: "rabbit" },
  { id: 8, zone: "forest", x: 78, z: -22, kind: "hidden", photo: P("09-girl-bushes.jpg"), caption: "Peeking through the roses like a little spy! Were you hiding, or were you hunting for adventure? — Fidella" },
  { id: 9, zone: "forest", x: 95, z: -32, kind: "hidden", photo: P("12-child-pink-traditional.jpg"), caption: "What a serious little face! You look like you're about to deliver very important news. Hook Hand listens. — Hook Hand" },
  { id: 10, zone: "forest", x: 72, z: -52, kind: "animal", photo: P("13-teen-giraffe.jpg"), caption: "A giraffe! Butterflies! You look so grown up here. The Snuggly Duckling salutes a young dreamer! — Big Nose", critter: "chameleon" },
  { id: 11, zone: "forest", x: 85, z: -15, kind: "reflection", photo: P("14-panda-festival.jpg"), caption: "You and the giant panda! Both doing peace signs! This goes in my collection of wonderful things. — Vladimir" },

  // ---- Tavern (12-16) ----
  { id: 12, zone: "tavern", x: 80, z: 40, kind: "villager", photo: P("15-barbie-crown.jpg"), caption: "A Barbie crown at McDonald's! Even I say this is the best look I've ever seen. — Attila",
    npc: "Hook Hand", hint: "A rain barrel out back? I hid nothin', I swear! …Or did I? Go see." },
  { id: 13, zone: "tavern", x: 96, z: 52, kind: "hidden", photo: P("16-restaurant-umbrellas.jpg"), caption: "..." },
  { id: 14, zone: "tavern", x: 98, z: 40, kind: "villager", photo: P("19-beach-couple.jpg"), caption: "Whoa — a beach kiss under the palm tree! Shorty loves love! Is this the good part? — Shorty",
    npc: "Shorty", hint: "Somethin' shiny under the bench where I nap. Don't tell the others." },
  { id: 15, zone: "tavern", x: 85, z: 50, kind: "hidden", photo: P("20-lavender-dress.jpg"), caption: "Peace sign among the plants! You look so calm and happy here. — Fang" },
  { id: 16, zone: "tavern", x: 93, z: 49.5, kind: "hidden", photo: P("21-desert-sand.jpg"), caption: "Kicking up sand in the desert! Now THAT'S energy! — Greno" },

  // ---- Village (17-23) ----
  { id: 17, zone: "village", x: -8, z: 84, kind: "villager", photo: P("22-red-coat-mountains.jpg"), caption: "Red coat against the autumn mountains! You look like you could conquer anything. — Patchy",
    npc: "Queen Arianna", hint: "The old well keeps secrets behind it. I saw sparkles there at dusk." },
  { id: 18, zone: "village", x: 3, z: 93, kind: "hidden", photo: P("23-bw-artistic.jpg"), caption: "Such a striking portrait — timeless, classic, unforgettable. — Sideburns" },
  { id: 19, zone: "village", x: 10, z: 98, kind: "villager", photo: P("24-lattice-wall.jpg"), caption: "The geometric wall, the flower crown, that dress! *chef's kiss* — perfect! — Gunther",
    npc: "Attila", hint: "Check under my market stall — mind the pies, they're hot!" },
  { id: 20, zone: "village", x: -12, z: 96, kind: "hidden", photo: P("25-cherry-blossoms.jpg"), caption: "Under the cherry blossoms, glowing! You smell like springtime itself. — Tor" },
  { id: 21, zone: "village", x: 5, z: 80, kind: "villager", photo: P("26-blue-floral-forest.jpg"), caption: "A forest princess in blue florals! I want to make a ribbon to match this moment. — Killer",
    npc: "Little Girl with Braids", hint: "I saw sparkles by the flower cart! Shiny shiny!" },
  { id: 22, zone: "village", x: -5, z: 100, kind: "hidden", photo: P("27-floral-forest-road.jpg"), caption: "Walking your own path through the woods. I want to be just like you! — Little Girl with Braids" },
  { id: 23, zone: "village", x: -10, z: 88, kind: "villager", photo: P("06-greensaree.jpg"), caption: "That green saree, the gold jewelry — absolutely regal. I bow to a true queen. — King Frederic",
    npc: "King Frederic", hint: "The festival stage holds the greatest treasure of all. You'll see." },

  // ---- Lake (24-28) ----
  { id: 24, zone: "lake", x: -56, z: 24, kind: "reflection", photo: P("10-greensaree-print.jpg"), caption: "Oh, my dear. This photo is a treasure. This lantern burns brighter just looking at you. — Queen Arianna" },
  { id: 25, zone: "lake", x: -50, z: 16, kind: "villager", photo: P("08-whitesaree.jpg"), caption: "Can a photo capture pure grace? Result: YES. Fourteen thumbs up! — Varian & Ruddiger",
    npc: "Lance Strongbow", hint: "The lake shows memories in its reflection. And the old boat? It remembers too." },
  { id: 26, zone: "lake", x: -62, z: 20, kind: "boat", photo: P("28-starry-paintings.jpg"), caption: "White saree among yellow flowers — light in the darkness. You bring light wherever you go. — King Edmund" },
  { id: 27, zone: "lake", x: -62, z: 36, kind: "reflection", photo: P("29-sunset-arms.jpg"), caption: "Arms open to the whole sky at sunset. I've never seen spirit like yours. — Adira" },
  { id: 28, zone: "lake", x: -66, z: 24, kind: "animal", photo: P("30-water-selfie.jpg"), caption: "Sunglasses by the water, completely unstoppable. Even the enchanted reflection is jealous. — Zhan Tiri", critter: "duck" },

  // ---- Festival (29-33) ----
  { id: 29, zone: "festival", x: -57, z: -53, kind: "hidden", photo: P("05-mountains.jpg"), caption: "Mountains behind you, peace sign up! The Sundrop flower blooms brightest for you! — Kiera" },
  { id: 30, zone: "festival", x: -40, z: -61, kind: "hidden", photo: P("07-glasses-selfie.jpg"), caption: "That confident smile! This is the best view in the whole kingdom! — Lance" },
  { id: 31, zone: "festival", x: -48, z: -68, kind: "animal", photo: P("31-beach-umbrella.jpg"), caption: "He knows that smile — that's the look of someone in love. Follow him — Flynn is waiting at the pier. — Maximus", critter: "chameleon" },
  { id: 32, zone: "festival", x: -38, z: -56, kind: "hidden", photo: P("32-collage-finale.jpg"), caption: "I collected every version of you — the toddler, the dreamer, the queen. And I'd choose every single one of them again. Now... how about a boat ride? — Flynn Rider" },
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
