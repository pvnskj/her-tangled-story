import {CLUES} from './clues.js?v=20261018story';
import {clueTarget} from './navigation.js?v=20261018story';
import {movePoint} from './world-layout.js?v=20261018story';

// Keep the finale in the same scene, with the original avatar and boat.
export function createLakeFinale({world,player,npcs,onComplete,onBanner=()=>{}}){
 const maximus=npcs.find(n=>n.castId==='maximus'),flynn=npcs.find(n=>n.castId==='eugene');
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
  player.group.position.set(boat.position.x+c*.85,.9,boat.position.z-s*.85);
  flynn.group.position.set(boat.position.x-c*.8,.65,boat.position.z+s*.8);
  flynn.group.rotation.set(0,boat.rotation.y-Math.PI/2,0);
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
  startHeartFinale() {
    console.log("Starting 1000-lantern heart finale!");
    const n = 1000;
    const bodyG = new THREE.CylinderGeometry(0.6, 0.7, 1.2, 8);
    const bodyM = new THREE.MeshBasicMaterial({ color: 0xffc06a, fog: false });
    const inst = new THREE.InstancedMesh(bodyG, bodyM, n);
    // Glow points for magical effect
    const gp = new Float32Array(n * 3);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.BufferAttribute(gp, 3));
    // Create glow texture
    const gc = document.createElement("canvas"); gc.width = gc.height = 64;
    const gg2 = gc.getContext("2d");
    const grad = gg2.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, "rgba(255,200,100,1)");
    grad.addColorStop(1, "rgba(255,150,50,0)");
    gg2.fillStyle = grad; gg2.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(gc);
    const glowPts = new THREE.Points(gg, new THREE.PointsMaterial({
      map: glowTex, color: 0xffb050, size: 8, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    }));
    // Each lantern: start from random zone, target heart position
    const data = [];
    const zones = [
      {x: 0, z: -205}, {x: 131, z: -157}, {x: 201, z: -35},
      {x: 131, z: 157}, {x: -35, z: 201}, {x: -201, z: 35},
      {x: -201, z: -35}, {x: -131, z: -157}, {x: -35, z: -201}
    ];
    for (let i = 0; i < n; i++) {
      const zone = zones[i % 9];
      const startX = zone.x + (Math.random() - 0.5) * 60;
      const startZ = zone.z + (Math.random() - 0.5) * 60;
      const target = heartPosition(i, n);
      data.push({
        sx: startX, sy: 2 + Math.random() * 5, sz: startZ,  // Start
        tx: target.x, ty: target.y, tz: target.z,  // Heart target
        delay: Math.random() * 3,  // Staggered launch
        speed: 0.8 + Math.random() * 0.4,
        phase: Math.random() * 6.28
      });
    }
    // Add to scene - need access to scene, get from world
    // World should have scene reference
    this.heartInst = inst;
    this.heartGlow = glowPts;
    this.heartData = data;
    this.heartT = 0;
    // Add to scene via world object
    if (world.scene) {
      world.scene.add(inst);
      world.scene.add(glowPts);
    }
    this.heartLanterns = true;
  },
  updateHeartFinale(dt, t) {
    if (!this.heartData) return;
    this.heartT += dt;
    const duration = 15;  // 15 seconds to form heart
    const progress = Math.min(1, this.heartT / duration);
    // Ease in-out for magical feel
    const e = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    const dummy = new THREE.Object3D();
    const pos = this.heartGlow.geometry.attributes.position;
    
    for (let i = 0; i < this.heartData.length; i++) {
      const d = this.heartData[i];
      // Delay before launch
      const localT = Math.max(0, Math.min(1, (this.heartT - d.delay) / duration));
      const le = localT < 0.5 
        ? 4 * localT * localT * localT 
        : 1 - Math.pow(-2 * localT + 2, 3) / 2;
      
      // Rise first, then converge to heart
      const riseH = 30 * Math.min(1, localT * 2);  // Initial rise
      const x = d.sx + (d.tx - d.sx) * le;
      const z = d.sz + (d.tz - d.sz) * le;
      // Y: rise from ground, then to heart height
      const y = d.sy + riseH * (1 - le) + (d.ty - d.sy) * le + Math.sin(t * 2 + d.phase) * 1.5;
      
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.heartInst.setMatrixAt(i, dummy.matrix);
      pos.setXYZ(i, x, y + 0.8, z);
    }
    this.heartInst.instanceMatrix.needsUpdate = true;
    pos.needsUpdate = true;
    
    // Camera: slowly tilt up to sky view during heart formation
    // (Camera control handled in main.js via event)
    if (progress >= 1 && !this.heartComplete) {
      this.heartComplete = true;
      console.log("Heart complete! Magical AF ✨");
      if (onComplete) onComplete();
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
     phase='sailing';elapsed=0;player.autoTarget=null;player.riding=true;world.boat.riding=true;
     player.sprite.position.y=1;world.releaseLanterns();world.setLanternBoost(true);
     seatPassengers(t);
    }
   }else if(phase==='sailing'){
    elapsed=Math.min(24,elapsed+dt);const u=elapsed/24,a=Math.PI*u,b=world.boat.group,start=world.boatPark;
    // A gentle loop inside the enlarged lake, returning to the same pier.
    b.position.set(start.x-38*Math.sin(a),.35+Math.sin(t*2.2)*.07,start.z+12*Math.sin(2*a));
    const dx=-38*Math.cos(a),dz=24*Math.cos(2*a);
    b.rotation.y=Math.atan2(-dz,dx);b.rotation.z=Math.sin(t*1.6)*.025;
    seatPassengers(t);
    if(elapsed>=24){phase='complete';onComplete();}
   }else if(phase==='complete'){
    seatPassengers(t);
    // V3: 1000-lantern heart in the sky - the ultimate magical moment!
    if(!this.heartLanterns) this.startHeartFinale();
    if(this.heartLanterns) this.updateHeartFinale(dt, t);
   }
  }
 };
}
