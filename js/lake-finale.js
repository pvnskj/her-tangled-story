import * as THREE from "three";
import {CLUES} from './clues.js?v=20261018story';
import {clueTarget} from './navigation.js?v=20261018story';
import {movePoint,LAKE,ZONES} from './world-layout.js?v=20261018story';

// Keep the finale in the same scene, with the original avatar and boat.
export function createLakeFinale({world,player,npcs,onComplete,onBanner=()=>{}}){
 const maximus=npcs.find(n=>n.castId==='maximus'),flynn=npcs.find(n=>n.castId==='eugene'),rapunzel=npcs.find(n=>n.castId==='rapunzel');
 const dock=movePoint('lake',{x:-48,z:20}),nav=player.navigation;
 let phase='idle',horseRoute=[],flynnRoute=[],elapsed=0,sailFrom=null,sailSweep=0;
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
  get locked(){return ['boarding','sailing','lanterns','heart'].includes(phase);},
  heartLanterns: null,
  heartT: 0,
  // Shared soft-glow texture (radial falloff)
  _makeGlowTex() {
    if (this._glowTex) return this._glowTex;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, "rgba(255,215,130,1)");
    gr.addColorStop(0.4, "rgba(255,175,85,0.55)");
    gr.addColorStop(1, "rgba(255,150,50,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this._glowTex = new THREE.CanvasTexture(c);
    return this._glowTex;
  },
  // Their 2 lanterns - camera close-up
  startTwoLanterns() {
    const boat = world.boat.group;
    const glowTex = this._makeGlowTex();
    this.twoLanterns = [];
    for (let i = 0; i < 2; i++) {
      const grp = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 1.0, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd98a, fog: false })
      );
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffc06a, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      spr.scale.set(6, 6, 1);
      grp.add(mesh); grp.add(spr);
      grp.position.set(boat.position.x + (i === 0 ? -0.7 : 0.7), 2.6, boat.position.z);
      if (world.scene) world.scene.add(grp);
      this.twoLanterns.push({ mesh: grp, y: 2.6, speed: 2.6 + i * 0.4 });
    }
  },
  updateTwoLanterns(dt, t, elapsed) {
    if (!this.twoLanterns) return;
    for (const L of this.twoLanterns) {
      L.y += L.speed * dt;
      L.mesh.position.y = L.y + Math.sin(t * 3) * 0.2;
      L.mesh.position.x += Math.sin(t * 2) * dt * 0.5;
    }
    const p = this.twoLanterns[0].mesh.position;
    window.__twoLanternPos = { x: p.x, y: p.y, z: p.z };
  },
  startHeartFinale() {
    try {
      const n = 500;
      // Build the heart FACING THE BOAT, centred on the avatar's sightline.
      // B = boat position; F = toward the kingdom (her view direction);
      // R = her right. The heart hangs in the air straight ahead of her.
      const bp = world.boat.group.position;
      const B = { x: bp.x, z: bp.z };
      let fx = 0 - B.x, fz = 0 - B.z;
      const fl = Math.hypot(fx, fz); fx /= fl; fz /= fl;
      const F = { x: fx, z: fz };
      const R = { x: -fz, z: fx }; // screen-right for a camera looking along F (matches lookAt x-axis)
      const S = 1.5, DIST = 95;
      const H = { x: B.x + F.x * DIST, y: 58, z: B.z + F.z * DIST };
      const geo = new THREE.CylinderGeometry(0.42, 0.5, 0.95, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
      const inst = new THREE.InstancedMesh(geo, mat, n);
      inst.frustumCulled = false;
      // Warm per-lantern colour variation (some deep gold, some pale honey)
      const col = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const w = Math.random();
        col.setHSL(0.09 + w * 0.03, 0.95, 0.55 + w * 0.18);
        inst.setColorAt(i, col);
      }
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      // Glow layer — soft halos so they read as lanterns, not tiles
      const glowTex = this._makeGlowTex();
      const gp = new Float32Array(n * 3);
      const gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.BufferAttribute(gp, 3));
      const glow = new THREE.Points(gg, new THREE.PointsMaterial({
        map: glowTex, color: 0xffbe78, size: 8, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
      }));
      glow.frustumCulled = false;
      // Targets: a FILLED heart in the plane facing her (R = right, world-up = up)
      const targets = [];
      for (let i = 0; i < n; i++) {
        const tt = (i / n) * Math.PI * 2;
        const ox = 16 * Math.pow(Math.sin(tt), 3);
        const oy = 13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt);
        let px = ox, py = oy;
        if (i % 5 >= 3) { // 40% interior fill toward centroid (0,-3)
          const r = Math.sqrt(Math.random()) * 0.88;
          px = ox * r; py = -3 + (oy + 3) * r;
        }
        const depth = (Math.random() - 0.5) * 5;
        targets.push({
          x: H.x + R.x * px * S + F.x * depth,
          y: H.y + (py + 3) * S,
          z: H.z + R.z * px * S + F.z * depth
        });
      }
      // Starts: scattered over the real nine zones
      const starts = [];
      const dummy = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        const zn = ZONES[i % ZONES.length];
        const sx = zn.x + (Math.random() - 0.5) * 50;
        const sz = zn.z + (Math.random() - 0.5) * 50;
        const sy = 3 + Math.random() * 4;
        starts.push({ x: sx, y: sy, z: sz, delay: Math.random() * 2.5 });
        dummy.position.set(sx, sy, sz);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        gp[i * 3] = sx; gp[i * 3 + 1] = sy; gp[i * 3 + 2] = sz;
      }
      inst.instanceMatrix.needsUpdate = true;
      if (world.scene) { world.scene.add(inst); world.scene.add(glow); }
      this.heartInst = inst;
      this.heartGlow = glow;
      this.heartTargets = targets;
      this.heartStarts = starts;
      this.heartT = 0;
      this.heartLanterns = true;
      this.heartComplete = false;
      // Camera = the avatar's POV: just behind/above the boat, looking along F at the heart
      window.__heartCamPos = { x: B.x - F.x * 9, y: 7, z: B.z - F.z * 9 };
      window.__heartCamLook = { x: H.x, y: H.y, z: H.z };
      window.__heartCamFrom = null;
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
      const pos = this.heartGlow.geometry.attributes.position;
      const n = this.heartTargets.length;
      for (let i = 0; i < n; i++) {
        const s = this.heartStarts[i];
        const tg = this.heartTargets[i];
        let lt = Math.max(0, Math.min(1, (this.heartT - s.delay) / Math.max(0.1, duration - s.delay)));
        lt = lt * lt * (3 - 2 * lt); // smoothstep
        const x = s.x + (tg.x - s.x) * lt;
        const z = s.z + (tg.z - s.z) * lt;
        const y = s.y + (tg.y - s.y) * lt + Math.sin(lt * Math.PI) * 10 + Math.sin(t * 2 + i) * 0.8;
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        this.heartInst.setMatrixAt(i, dummy.matrix);
        pos.setXYZ(i, x, y, z);
      }
      this.heartInst.instanceMatrix.needsUpdate = true;
      pos.needsUpdate = true;
      window.__heartFinaleActive = true;
      window.__heartProgress = progress;
      if (progress >= 1 && !this.heartComplete) this.heartComplete = true;
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
   phase='boarding';sailFrom=null;
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
     player.sprite.position.y=1;
     seatPassengers(t);
    }
   }else if(phase==='sailing'){
    // Ride ALONG the lake perimeter (ellipse inset from the shore) — never leaves the water
    const b=world.boat.group,ERX=LAKE.rx-14,ERZ=LAKE.rz-12;
    if(sailFrom===null){
      sailFrom=Math.atan2((b.position.z-LAKE.z)/ERZ,(b.position.x-LAKE.x)/ERX);
      const target=Math.atan2(0.766/ERZ,0.643/ERX); // perimeter point toward the world centre
      let sweep=target-sailFrom;
      while(sweep<0.9)sweep+=Math.PI*2;
      while(sweep>2.6)sweep-=Math.PI*2;
      sailSweep=sweep;
    }
    elapsed=Math.min(12,elapsed+dt);const u=elapsed/12;
    const th=sailFrom+sailSweep*u;
    const vx=-ERX*Math.sin(th),vz=ERZ*Math.cos(th);
    b.position.set(LAKE.x+ERX*Math.cos(th),.35+Math.sin(t*2.2)*.07,LAKE.z+ERZ*Math.sin(th));
    b.rotation.y=Math.atan2(-vz,vx);
    b.rotation.z=Math.sin(t*1.6)*.025;
    seatPassengers(t);
    if(elapsed>=12){
      phase='lanterns'; elapsed=0;
      this.startTwoLanterns();
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
