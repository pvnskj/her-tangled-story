import {CLUES} from '../js/clues.js';
export const WORLD_BOUND=38;
// Place homes behind the square; their roofs must never cross the walking routes.
export const HOMES=Array.from({length:7},(_,i)=>({x:-10+i*3.8,z:32+Math.sin(i)*1.2}));
export const PATHS=[
  [[0,5],[-2,9],[-1,13],[2,17],[4,19]],
  [[0,6],[8,11],[16,15],[19,17]],
  [[8,11],[17,7],[25,2.6]],
  [[-2,8],[-5,12],[-8,15]],
  [[-4,4],[-8,-1],[-16,-6]]
];
export const REGIONS=[
  {id:'tower',name:'Rapunzel’s Tower',short:'Tower',x:0,z:5,icon:'♜',color:'#b399bf',description:'A keepsake, a garden, and a curious new friend.'},
  {id:'forest',name:'Enchanted Forest',short:'Forest',x:19,z:17,icon:'♧',color:'#789b79',description:'Follow a little rabbit into a hidden glade.'},
  {id:'tavern',name:'The Snuggly Duckling',short:'Tavern',x:25,z:2.6,icon:'♫',color:'#b78963',description:'Find a seat. Every dream deserves a song.'},
  {id:'village',name:'Corona Village',short:'Village',x:4,z:19,icon:'⌂',color:'#ccaa78',description:'Paintings, pastries, and stories in the square.'},
  {id:'lake',name:'The Lantern Lake',short:'Lake',x:-8,z:15,icon:'≈',color:'#7fadaa',description:'A quiet boat ride beneath the first lanterns.'},
  {id:'festival',name:'The Lantern Festival',short:'Festival',x:-16,z:-6,icon:'✧',color:'#b59ac8',description:'One wish, carried above the whole valley.'}
];
// Keep the original memory identities/captions/photos; only remap their setting.
const layout=[
  [1,-2.2,7.6,'keepsake','Open the keepsake'],[2,-4.5,5.5,'flowers','Smell the garden flowers'],[3,4,4,'book','Read the traveller’s journal'],[4,-4,-3,'painting','Look at the garden painting'],[5,4.7,7.3,'horse','Offer the horse an apple'],
  [6,22,21,'hollow','Look inside the glowing tree'],[7,19,17,'rabbit','Follow the white rabbit'],[8,25,18,'mushroom','Listen to the mushroom chimes'],[9,21,14,'fern','Part the fern leaves'],[10,28,19,'deer','Wait quietly with the deer'],[11,23,25,'pollen','Catch a little golden pollen'],
  [12,25,1,'dialogue','Share a dream with Bram'],[13,29,2.4,'barrel','Open the old rain barrel'],[14,24,-.9,'music','Ask for a song'],[15,26,-.9,'bench','Take a seat by the hearth'],[16,22,2.5,'sign','Read the tavern guestbook'],
  [17,1.4,22,'easel','Pick up the painter’s photograph'],[18,5,19.8,'fountain','Make a wish at the fountain'],[19,9,20,'bakery','Choose something from the bakery'],[20,-1,18,'flowers','Choose a flower from the cart'],[21,7.1,23.8,'greet','Wave hello to Pip'],[22,-3,23,'gallery','Explore the little photo gallery'],[23,11,24,'history','Ask Asha about the kingdom'],
  [24,-10,9.3,'reeds','Listen to the lakeside reeds'],[25,-7,17.5,'fisher','Ask Dev about the lake'],[26,-8,15,'boat','Board the rowboat'],[27,-11,22,'lantern','Release a little lantern'],[28,-17,25,'duck','Feed the ducks'],
  [29,-16,-4.5,'arch','Step under the flower arch'],[30,-20,-7,'ribbon','Tie a ribbon to the wishing tree'],[31,-12,-8,'companion','Follow your tiny companion'],[32,-19,-12,'wish','Write a wish for the year ahead'],[33,-16,-10,'finale','Launch your birthday lantern']
];
export const MEMORIES=layout.map(([id,x,z,action,label])=>({...CLUES.find(c=>c.id===id),x,z,action,label}));
export const CORE=[1,7,12,17,26];
export const canCelebrate=found=>CORE.every(id=>found.has(id));
export const coreRemaining=found=>CORE.filter(id=>!found.has(id));
export const nextMemory=found=>MEMORIES.find(m=>CORE.includes(m.id)&&!found.has(m.id))??(!found.has(33)?MEMORIES.find(m=>m.id===33):MEMORIES.find(m=>!found.has(m.id)));
export function restoreProgress(raw,legacy=false){let data;try{data=JSON.parse(raw);}catch{data={};}if(!data||typeof data!=='object')data={};const found=new Set((Array.isArray(data.found)?data.found:[]).filter(id=>Number.isInteger(id)&&id>=1&&id<=33));if(legacy)found.add(1);const visited=new Set((Array.isArray(data.visited)?data.visited:[]).filter(id=>REGIONS.some(r=>r.id===id)));visited.add('tower');return {found,visited};}
export function nearestRegion(p){return REGIONS.reduce((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-b.x,p.z-b.z)?a:b);}
export function nearestMemory(p,max=2.3){let best=null,distance=max;for(const m of MEMORIES){const d=Math.hypot(m.x-p.x,m.z-p.z);if(d<distance){distance=d;best=m;}}return best;}
export function boatSample(t,duration=26){const u=Math.max(0,Math.min(1,t/duration)),s=u*u*(3-2*u),a=s*Math.PI*2;return {x:-18+Math.cos(a)*7.2,y:.08,z:15+Math.sin(a)*7.2,yaw:-a,done:u>=1};}
export const DOCK={x:-8,z:15};
export const DIALOGUES={
  12:{speaker:'Bram',line:'We all have a dream tucked away somewhere. What shall we raise a glass to?',choices:['To the adventures still ahead.','To the people who make a place feel like home.'],reply:'Then tonight, that is what we’ll sing about.'},
  19:{speaker:'Sella',line:'A birthday visitor! The first treat is on the house. What catches your eye?',choices:['The honey bun, please.','The little berry tart.'],reply:'Made with a little patience and a lot of love.'},
  23:{speaker:'Elder Asha',line:'Our lanterns carry wishes, but the people beneath them are what make the kingdom shine.',choices:['Tell me about the festival.','What would you wish for?'],reply:'More days worth remembering. And someone beside you to remember them with.'},
  25:{speaker:'Dev',line:'The water is calm, and the boat is ready. The best view is from the middle of the lake.',choices:['I’ll take a little adventure.','I’ll stay and listen a moment.'],reply:'There is no hurry here. The lake will wait for you.'}
};
