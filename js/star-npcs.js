import {navigationFor} from './navigation.js?v=20261018story';
import {buildNPCs as buildOriginalNPCs} from './npcs.js?v=20261018story';
import {CLUES} from './clues.js?v=20261018story';
import {offsetFor,sourceZone} from './world-layout.js?v=20261018story';
import {CONFIG} from './config.js?v=20261018story';
export function buildNPCs(scene,world){
 const before=new Set(scene.children),actors=buildOriginalNPCs(scene),shifts=new Map();
 for(const object of scene.children){
  if(before.has(object)||object===actors.chameleon.group)continue;
  const npc=actors.npcs.find(n=>n.group===object),clue=npc&&CLUES.find(c=>c.characters.includes(npc.castId));
  const d=clue?{x:clue.x-object.position.x,z:clue.z-object.position.z}:offsetFor(sourceZone(object.position.x,object.position.z));
  shifts.set(object,d);object.position.x+=d.x;object.position.z+=d.z;
  if(npc&&clue)npc.hint=clue.hint;
 }
 const homes=new Map();
 for(const n of actors.npcs){const d=shifts.get(n.group);if(!d)continue;
  if(n.home){if(!homes.has(n.home))homes.set(n.home,{...n.home,x:n.home.x+d.x,z:n.home.z+d.z});n.home=homes.get(n.home);}
  if(n.wp){n.wp.x+=d.x;n.wp.z+=d.z;}
  if(n.patrol)n.patrol=n.patrol.map(([x,z])=>[x+d.x,z+d.z]);
  if(n.kind==='fisher'){const b=shifts.get(n.bob)||d;n.bobX+=b.x;n.bobZ+=b.z;}
 }
 for(const r of actors.rabbits){const d=shifts.get(r.group);r.hx+=d.x;r.hz+=d.z;r.tx+=d.x;r.tz+=d.z;}
 for(const b of actors.birds){const d=shifts.get(b.group);b.cx+=d.x;b.cz+=d.z;}
 actors.chameleon.group.position.set(CONFIG.SPAWN.x-1.6,0,CONFIG.SPAWN.z+1.2);
 // Give every named character (including the actual Pascal companion) a clue.
 const nav=world?navigationFor(world):null;
 const pascal={...actors.chameleon,castId:'pascal',name:'Pascal',kind:'named',castAnimal:true,headY:1.8,flavor:'Pascal points toward the next memory.',animalRig:{}};
 actors.npcs.push(pascal);
 for(const n of actors.npcs){
  const clue=CLUES.find(c=>c.characters.includes(n.castId));
  if(!clue){delete n.clueId;continue;}
  n.clueId=clue.id;n.hint=clue.hint;n.line=clue.caption;n.kind='named';delete n.patrol;
  if(n.castId!=='pascal'){
   const partner=clue.characters.indexOf(n.castId)>0;
   let x=clue.x+(partner?1.8:0),z=clue.z+(partner?1.5:0);
   if(clue.discovery&&nav){
    let chosen=false;
    for(let r=3.5;r<=7&&!chosen;r+=1)for(let i=0;i<12;i++){
     const a=i*Math.PI/6+(partner?Math.PI:0),px=clue.x+Math.cos(a)*r,pz=clue.z+Math.sin(a)*r;
     if(nav.canWalk(px,pz,1.4)&&!actors.npcs.some(other=>other!==n&&other.clueId===clue.id&&Math.hypot(other.group.position.x-px,other.group.position.z-pz)<2)){x=px;z=pz;chosen=true;break;}
    }
   }
   const keepOffRoad=['fidella','ruddiger','owl'].includes(n.castId);
   if(nav&&(!nav.canWalk(x,z,1.2)||(keepOffRoad&&nav.pathDistance(x,z)<=3))){
    const base={x,z};let chosen=false;
    for(let r=1;r<=8&&!chosen;r+=.75)for(let i=0;i<16;i++){
     const a=i*Math.PI/8,px=base.x+Math.cos(a)*r,pz=base.z+Math.sin(a)*r;
     if(nav.canWalk(px,pz,1.4)&&(!keepOffRoad||nav.pathDistance(px,pz)>3)){x=px;z=pz;chosen=true;break;}
    }
   }
   n.group.position.set(x,0,z);
  }
 }
 return actors;
}
