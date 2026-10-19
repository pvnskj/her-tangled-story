import {CLUES} from './clues.js?v=20261018story';
import {clueTarget} from './navigation.js?v=20261018story';
import {movePoint} from './world-layout.js?v=20261018story';

// Keep the finale in the same scene, with the original avatar and boat.
export function createLakeFinale({world,player,npcs,onComplete,onBanner=()=>{},onSail=()=>{}}){
 const maximus=npcs.find(n=>n.castId==='maximus'),flynn=npcs.find(n=>n.castId==='eugene');
 const dock=movePoint('lake',{x:-48,z:20}),nav=player.navigation;
 let phase='idle',horseRoute=[],flynnRoute=[],elapsed=0,lastCue=0;
 function advance(n,route,speed,dt){
  let remaining=speed*dt;
  while(route.length&&remaining>0){const p=n.group.position,q=route[0],dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);
   if(d<.01){route.shift();continue;}
   const step=Math.min(remaining,d),x=p.x+dx/d*step,z=p.z+dz/d*step;
   if(!nav.segmentClear(p,{x,z},.7))return false;
   p.x=x;p.z=z;n.group.rotation.y=Math.atan2(dx,dz);remaining-=step;
   if(step===d)route.shift();
  }
  return route.length===0;
 }
 function seatPassengers(t){
  const boat=world.boat.group,c=Math.cos(boat.rotation.y),s=Math.sin(boat.rotation.y);
  player.group.position.set(boat.position.x+c*.85,.9,boat.position.z-s*.85);
  flynn.group.position.set(boat.position.x-c*.8,.65,boat.position.z+s*.8);
  flynn.group.rotation.set(0,boat.rotation.y-Math.PI/2,0);
  if(flynn.castRig){flynn.castRig.prop.visible=false;flynn.castRig.arms.forEach((arm,i)=>{arm.rotation.x=-.9+Math.sin(t*2.4+i*.3)*.4;arm.rotation.z=(i?-.2:.2);});}
  const oar=boat.children.find(o=>o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.height===3);
  if(oar)oar.rotation.x=Math.sin(t*2.4)*.35;
 }
 return {
  get phase(){return phase;},
  get locked(){return phase==='boarding'||phase==='sailing';},
  startEscort(){
   if(phase!=='idle')return;
   const target=clueTarget(CLUES[31],npcs,world);
   horseRoute=nav.route(maximus.group.position,{...target,radius:5})||[];
   player.autoTarget=target;player.autoWalkSpeed=6.5;phase='escorting';
   onBanner('Maximus knows the way — follow him to Flynn at the lake ✨');
  },
  startBoat(){
   if(['boarding','sailing','complete'].includes(phase))return;
   horseRoute=[];player.autoWalkSpeed=null;
   player.autoTarget={...dock,radius:.9,zone:'lake'};
   flynnRoute=nav.findRoute(flynn.group.position,{...dock,radius:1})||[];
   phase='boarding';onBanner('One last adventure, together ⛵');
  },
  update(dt,t,paused=false){
   if(paused){if(phase==='sailing'||phase==='complete')seatPassengers(t);return;}
   if(phase==='escorting'){
    // He waits if she stops or explores, so she never has to chase him.
    if(maximus.group.position.distanceTo(player.group.position)<8)advance(maximus,horseRoute,8,dt);
    if(horseRoute.length)maximus.group.position.y=Math.abs(Math.sin(t*8))*.07;
    else {player.autoWalkSpeed=null;phase='waiting';}
   }else if(phase==='boarding'){
    advance(flynn,flynnRoute,4,dt);
    const p=player.group.position,f=flynn.group.position;
    if(Math.hypot(p.x-dock.x,p.z-dock.z)<1.1&&Math.hypot(f.x-dock.x,f.z-dock.z)<1.2){
     phase='sailing';elapsed=0;lastCue=0;onSail();player.autoTarget=null;player.riding=true;world.boat.riding=true;
     player.sprite.position.y=1;world.releaseLanterns();world.setLanternBoost(true);
     seatPassengers(t);
    }
   }else if(phase==='sailing'){
    elapsed=Math.min(56,elapsed+dt);const u=elapsed/56,a=Math.PI*u,b=world.boat.group,start=world.boatPark;
    // A gentle loop inside the enlarged lake, returning to the same pier.
    b.position.set(start.x-38*Math.sin(a),.35+Math.sin(t*2.2)*.07,start.z+12*Math.sin(2*a));
    const dx=-38*Math.cos(a),dz=24*Math.cos(2*a);
    b.rotation.y=Math.atan2(-dz,dx);b.rotation.z=Math.sin(t*1.6)*.025;
    seatPassengers(t);
    // Cinematic story beats on the original boat trajectory.
    if(lastCue===0&&elapsed>11){onBanner('One small lantern for every beautiful memory…');lastCue=1;}
    if(lastCue===1&&elapsed>28){onBanner('From your very first days to this moment.');lastCue=2;}
    if(lastCue===2&&elapsed>44){onBanner('And the next chapter is ours to write.');lastCue=3;}
    if(elapsed>=56){phase='complete';onComplete();}
   }else if(phase==='complete')seatPassengers(t);
  }
 };
}
