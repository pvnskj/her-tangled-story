import {STORY_CAST,getCharacter} from './cast.js?v=20261018story';
import {movePoint} from './world-layout.js?v=20261018story';
// Original memory content, retained below for the 32-clue journey. {id, zone, x, z, kind, photo, caption, npc?, hint?}
// kinds: hidden | villager | animal | reflection | boat | finale
// photos 1-10 use the real photos in order; 11-32 are placeholder cards;
// The original finale photo now belongs to clue 32.

const P = (n) => `assets/photos/${n}`;

const ORIGINAL_CLUES = [
  // ---- Tower Hill (1-5) ----
  { id: 1, zone: "tower", x: -12, z: -104, kind: "hidden", photo: P("01-toddler-garden.jpg"), caption: "The littlest explorer — where it all began." },
  { id: 2, zone: "tower", x: -15, z: -85, kind: "hidden", photo: P("02-toddler-temple.jpg"), caption: "Tiny feet on ancient stones.",
    riddle: { prompt: "What am I?", options: ["Tiny", "TINY", "TinY"] } },
  { id: 3, zone: "tower", x: 8, z: -84, kind: "villager", photo: P("03-girl-palms.jpg"), caption: "Growing up under the palms.",
    npc: "Eugene Fitzherbert (Flynn Rider)", hint: "They say golden sparkles hide behind the tower stairs… keep looking around here." },
  { id: 4, zone: "tower", x: -7, z: -100, kind: "hidden", photo: P("04-toddler-field.jpg"), caption: "Wild and free in the open field." },
  { id: 5, zone: "tower", x: 10, z: -95, kind: "animal", photo: P("05-mountains.jpg"), caption: "Standing tall with the mountains.", critter: "rabbit" },

  // ---- Forest (6-11) ----
  { id: 6, zone: "forest", x: 70, z: -30, kind: "hidden", photo: P("06-greensaree.jpg"), caption: "Grace in green." },
  { id: 7, zone: "forest", x: 88, z: -48, kind: "animal", photo: P("07-glasses-selfie.jpg"), caption: "That confident smile.", critter: "rabbit" },
  { id: 8, zone: "forest", x: 78, z: -22, kind: "hidden", photo: P("08-whitesaree.jpg"), caption: "Elegant in white." },
  { id: 9, zone: "forest", x: 95, z: -32, kind: "hidden", photo: P("09-girl-bushes.jpg"), caption: "Peeking through the bushes." },
  { id: 10, zone: "forest", x: 72, z: -52, kind: "animal", photo: P("10-greensaree-print.jpg"), caption: "A favorite memory, framed forever.", critter: "chameleon" },
  { id: 11, zone: "forest", x: 85, z: -15, kind: "reflection", photo: null, caption: "A new memory is on its way…" },

  // ---- Tavern (12-16) ----
  { id: 12, zone: "tavern", x: 80, z: 40, kind: "villager", photo: null, caption: "A new memory is on its way…",
    npc: "Hook Hand", hint: "A rain barrel out back? I hid nothin', I swear! …Or did I? Go see." },
  { id: 13, zone: "tavern", x: 96, z: 52, kind: "hidden", photo: null, caption: "A new memory is on its way…" },
  { id: 14, zone: "tavern", x: 98, z: 40, kind: "villager", photo: null, caption: "A new memory is on its way…",
    npc: "Shorty", hint: "Somethin' shiny under the bench where I nap. Don't tell the others." },
  { id: 15, zone: "tavern", x: 85, z: 50, kind: "hidden", photo: null, caption: "A new memory is on its way…" },
  { id: 16, zone: "tavern", x: 93, z: 49.5, kind: "hidden", photo: null, caption: "A new memory is on its way…" },

  // ---- Village (17-23) ----
  { id: 17, zone: "village", x: -8, z: 84, kind: "villager", photo: null, caption: "A new memory is on its way…",
    npc: "Queen Arianna", hint: "The old well keeps secrets behind it. I saw sparkles there at dusk." },
  { id: 18, zone: "village", x: 3, z: 93, kind: "hidden", photo: null, caption: "A new memory is on its way…" },
  { id: 19, zone: "village", x: 10, z: 98, kind: "villager", photo: null, caption: "A new memory is on its way…",
    npc: "Attila", hint: "Check under my market stall — mind the pies, they're hot!" },
  { id: 20, zone: "village", x: -12, z: 96, kind: "hidden", photo: null, caption: "A new memory is on its way…" },
  { id: 21, zone: "village", x: 5, z: 80, kind: "villager", photo: null, caption: "A new memory is on its way…",
    npc: "Little Girl with Braids", hint: "I saw sparkles by the flower cart! Shiny shiny!" },
  { id: 22, zone: "village", x: -5, z: 100, kind: "hidden", photo: null, caption: "A new memory is on its way…" },
  { id: 23, zone: "village", x: -10, z: 88, kind: "villager", photo: null, caption: "A new memory is on its way…",
    npc: "King Frederic", hint: "The festival stage holds the greatest treasure of all. You'll see." },

  // ---- Lake (24-28) ----
  { id: 24, zone: "lake", x: -56, z: 24, kind: "reflection", photo: null, caption: "A new memory is on its way…" },
  { id: 25, zone: "lake", x: -50, z: 16, kind: "villager", photo: null, caption: "A new memory is on its way…",
    npc: "Lance Strongbow", hint: "The lake shows memories in its reflection. And the old boat? It remembers too." },
  { id: 26, zone: "lake", x: -62, z: 20, kind: "boat", photo: null, caption: "A new memory is on its way…" },
  { id: 27, zone: "lake", x: -62, z: 36, kind: "reflection", photo: null, caption: "A new memory is on its way…" },
  { id: 28, zone: "lake", x: -66, z: 24, kind: "animal", photo: null, caption: "A new memory is on its way…", critter: "duck" },

  // ---- Festival (29-33) ----
  { id: 29, zone: "festival", x: -57, z: -53, kind: "hidden", photo: null, caption: "A new memory is on its way…" },
  { id: 30, zone: "festival", x: -40, z: -61, kind: "hidden", photo: null, caption: "A new memory is on its way…" },
  { id: 31, zone: "festival", x: -48, z: -68, kind: "animal", photo: null, caption: "A new memory is on its way…", critter: "chameleon" },
  { id: 32, zone: "festival", x: -38, z: -56, kind: "hidden", photo: null, caption: "A new memory is on its way…" },
  { id: 33, zone: "festival", x: -45, z: -65, kind: "finale", photo: P("06-greensaree.jpg"), caption: "The grand finale." },
];

// Shared encounters give every one of the 34 characters a role in 32 clues.
const PLACEMENT = [["tower", -12, -104], ["tower", -15, -85], ["tower", 8, -84], ["forest", 70, -30], ["forest", 78, -22], ["forest", 88, -48], ["forest", 72, -52], ["forest", 86, -40], ["tavern", 76, 39], ["tavern", 72, 45], ["tavern", 76, 60], ["tavern", 80, 40], ["tavern", 91, 37], ["cave", 116, 55], ["cave", 121, 52.8], ["cave", 126, 57.2], ["cave", 131, 55], ["cave", 136, 52.8], ["village", -16, 91], ["village", -2, 91], ["village", 10, 91], ["village", 18, 89], ["castle", 0, 150], ["castle", -8, 142], ["castle", 8, 142], ["dark", 142, -108], ["dark", 132, -107], ["dark", 153, -109], ["sundrop", -124, -40], ["sundrop", -132, -35], ["lake", -30, 3], ["lake", -38, 20]];
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
