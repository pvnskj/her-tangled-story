import * as THREE from "three";
import {CLUES} from './clues.js?v=20261018story';
import {clueTarget} from './navigation.js?v=20261018story';
import {movePoint} from './world-layout.js?v=20261018story';

// Keep the finale in the same scene, with the original avatar and boat.
export function createLakeFinale({world,player,npcs,onComplete,onBanner=()=>{}}){
 const maximus=npcs.find(n=>n.castId==='maximus'),flynn=npcs.find(n=>n.castId==='eugene'),rapunzel=npcs.find(n=>n.castId==='rapunzel');
 const dock=movePoint('lake',{x:-48,z:20}),nav=player.navigation;
 let phase='idle',horseRoute=[],flynnRoute=[],elapsed=0;
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
  // Player (her) + Flynn + Rapunzel all on boat
  player.group.position.set(boat.position.x+c*.85,.9,boat.position.z-s*.85);
  flynn.group.position.set(boat.position.x-c*.8,.65,boat.position.z+s*.8);
  flynn.group.rotation.set(0,boat.rotation.y-Math.PI/2,0);
  // Rapunzel boards too - sits opposite Flynn
  if(rapunzel){
    rapunzel.group.position.set(boat.position.x+c*.2,.65,boat.position.z-s*.2);
    rapunzel.group.rotation.set(0,boat.rotation.y+Math.PI/2,0);
    rapunzel.group.visible=true;
  }
  if(flynn.castRig){flynn.castRig.prop.visible=false;flynn.castRig.arms.forEach((arm,i)=>{arm.rotation.x=-.9+Math.sin(t*2.4+i*.3)*.4;arm.rotation.z=(i?-.2:.2);});}
  const oar=boat.children.find(o=>o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.height===3);
  if(oar)oar.rotation.x=Math.sin(t*2.4)*.35;
 }
 // V3: 1000 lanterns forming a heart in the sky
 function heartPosition(i, total) {
   // Heart curve: x=16sin^3(t), y=13cos(t)-5cos(2t)-2cos(3t)-cos(4t)
   const t = (i / total) * Math.PI * 2;
   const hx = 16 * Math.pow(Math.sin(t), 3);
   const hy = 13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t);
   // Scale and position above lake (lake at ~(-35, -201) in star coords)
   const scale = 3.5;
   return {
     x: -35 + hx * scale,
     y: 80 + (hy + 5) * scale * 0.8,  // Center around y=80
     z: -201 + (Math.random() - 0.5) * 20  // Slight depth variation
   };
 }
 
 return {
  get phase(){return phase;},
  get locked(){return phase==='boarding'||phase==='sailing';},
  heartLanterns: null,
  heartT: 0,
  // Their 2 lanterns - camera close-up
  startTwoLanterns() {
    const boat = world.boat.group;
    this.twoLanterns = [];
    for (let i = 0; i < 2; i++) {
      const geo = new THREE.CylinderGeometry(0.5, 0.6, 1.0, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd700, fog: false });
      const lantern = new THREE.Mesh(geo, mat);
      // Start in their hands (above boat)
      lantern.position.set(
        boat.position.x + (i === 0 ? -0.5 : 0.5),
        2.5,
        boat.position.z
      );
      if (world.scene) world.scene.add(lantern);
      this.twoLanterns.push({ mesh: lantern, y: 2.5, speed: 3 + i * 0.5 });
    }
  },
  updateTwoLanterns(dt, t, elapsed) {
    if (!this.twoLanterns) return;
    for (const L of this.twoLanterns) {
      L.y += L.speed * dt;
      L.mesh.position.y = L.y + Math.sin(t * 3) * 0.2;
      // Gentle sway
      L.mesh.position.x += Math.sin(t * 2) * dt * 0.5;
    }
  },
  startHeartFinale() {
    try {
      console.log("HEART: Starting 500-lantern finale");
      const n = 500;  // 500 is plenty, less perf risk
      const geo = new THREE.CylinderGeometry(0.8, 0.9, 1.4, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffcc66, fog: false });
      const inst = new THREE.InstancedMesh(geo, mat, n);
      inst.frustumCulled = false;  // Always render, never cull
      
      // Pre-compute heart targets
      const targets = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = 13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t);
        targets.push({
          x: -35 + hx * 4,
          y: 85 + (hy + 3) * 3,
          z: -201 + (Math.random()-0.5) * 15
        });
      }
      
      // Start positions: scattered across all 9 zones
      const zones = [[0,-205],[131,-157],[201,-35],[131,157],[-35,201],[-201,35],[-201,-35],[-131,-157],[-35,-201]];
      const starts = [];
      const dummy = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const z = zones[i % 9];
        const sx = z[0] + (Math.random()-0.5)*80;
        const sz = z[1] + (Math.random()-0.5)*80;
        starts.push({ x: sx, y: 3+Math.random()*4, z: sz, delay: Math.random()*2 });
        // Set initial matrix IMMEDIATELY so they're visible from frame 1
        dummy.position.set(sx, 3, sz);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      
      if (world.scene) {
        world.scene.add(inst);
        console.log("HEART: Added to scene, count=" + n);
      } else {
        console.error("HEART: world.scene is undefined!");
      }
      
      this.heartInst = inst;
      this.heartTargets = targets;
      this.heartStarts = starts;
      this.heartT = 0;
      this.heartLanterns = true;
      this.heartComplete = false;
    } catch (err) {
      console.error("HEART FAILED:", err);
    }
  },
  updateHeartFinale(dt, t) {
    if (!this.heartInst || !this.heartTargets) return;
    try {
      this.heartT += dt;
      const duration = 15;
      const progress = Math.min(1, this.heartT / duration);
      const dummy = new THREE.Object3D();
      const n = this.heartTargets.length;
      
      for (let i = 0; i < n; i++) {
        const s = this.heartStarts[i];
        const tgt = this.heartTargets[i];
        const lt = Math.max(0, Math.min(1, (this.heartT - s.delay) / duration));
        // Simple smooth lerp
        const x = s.x + (tgt.x - s.x) * lt;
        const z = s.z + (tgt.z - s.z) * lt;
        const y = s.y + (tgt.y - s.y) * lt + Math.sin(t*2 + i) * 1.2;
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        this.heartInst.setMatrixAt(i, dummy.matrix);
      }
      this.heartInst.instanceMatrix.needsUpdate = true;
      window.__heartFinaleActive = true;
      window.__heartProgress = progress;
      if (progress >= 1 && !this.heartComplete) {
        this.heartComplete = true;
        console.log("HEART COMPLETE");
      }
    } catch (err) {
      console.error("HEART UPDATE FAILED:", err);
    }
  },
  startEscort(){
   if(phase!=='idle')return;
   const target=clueTarget(CLUES[31],npcs,world);
   horseRoute=nav.route(maximus.group.position,{...target,radius:5})||[];
   player.autoTarget=target;player.autoWalkSpeed=6.5;phase='escorting';
   onBanner('Maximus knows the way — follow him to Flynn at the lake ✨');
  },
  startBoat(){
   if(['boarding','sailing','lanterns','heart','complete'].includes(phase))return;
   horseRoute=[];player.autoWalkSpeed=null;
   player.autoTarget={...dock,radius:.9,zone:'lake'};
   flynnRoute=nav.findRoute(flynn.group.position,{...dock,radius:1})||[];
   // Rapunzel also comes to the dock
   if(rapunzel){
     rapunzel.group.visible=true;
     // Teleport her near dock (she was gated)
     rapunzel.group.position.set(dock.x+2,0,dock.z+2);
   }
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
     phase='sailing';elapsed=0;player.autoTarget=null;player.riding=true;world.boat.riding=true;
     player.sprite.position.y=1;world.releaseLanterns();world.setLanternBoost(true);
     seatPassengers(t);
    }
   }else if(phase==='sailing'){
    elapsed=Math.min(12,elapsed+dt);const u=elapsed/12,a=Math.PI*u,b=world.boat.group,start=world.boatPark;
    // Ride to the MIDDLE of the lake (not a loop)
    const midX = -35, midZ = -201;  // Lake center
    b.position.set(
      start.x + (midX - start.x) * u,
      .35+Math.sin(t*2.2)*.07,
      start.z + (midZ - start.z) * u
    );
    b.rotation.y=Math.atan2(midX-start.x,midZ-start.z);
    b.rotation.z=Math.sin(t*1.6)*.025;
    seatPassengers(t);
    if(elapsed>=12){
      phase='lanterns'; elapsed=0;
      // They light their two lanterns!
      this.startTwoLanterns();
      onBanner('Rapunzel and Flynn light their lanterns 🏮');
    }
   }else if(phase==='lanterns'){
    // Camera close-up on just their 2 lanterns rising
    elapsed+=dt;
    seatPassengers(t);
    this.updateTwoLanterns(dt, t, elapsed);
    window.__twoLanternsActive = true;
    if(elapsed>=6){
      // After 6s, transition to 1000-lantern heart
      phase='heart'; elapsed=0;
      window.__twoLanternsActive = false;
      this.startHeartFinale();
      onBanner('1000 lanterns rise to form a heart 💛');
    }
   }else if(phase==='heart'){
    seatPassengers(t);
    elapsed+=dt;
    this.updateHeartFinale(dt, t);
    window.__heartFinaleActive = true;
    // Heart holds for 7 seconds after forming (15s form + 7s hold = 22s total)
    if(this.heartComplete && elapsed >= 22){
      phase='complete';
      window.__heartFinaleActive = false;
      onComplete();
    }
   }else if(phase==='complete'){
    seatPassengers(t);
   }
  }
 };
}
