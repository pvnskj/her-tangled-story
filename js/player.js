import * as THREE from 'three';
import { CONFIG } from './config.js?v=20261017g';
import { isWalkable } from './navigation.js?v=20261017g';

// A small, faceless wooden storybook figure with a lavender dress and golden braid.
function heroine() {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshStandardMaterial({color:c, roughness:.85});
  const add = (geo, color, x,y,z) => { const m = new THREE.Mesh(geo,mat(color)); m.position.set(x,y,z); g.add(m); return m; };
  add(new THREE.ConeGeometry(.7,1.65,12),0x9970bd,0,.95,0);
  add(new THREE.CylinderGeometry(.33,.42,.65,12),0xba92d2,0,1.68,0);
  add(new THREE.SphereGeometry(.36,16,12),0xe8c6a0,0,2.28,0); // deliberately no face
  add(new THREE.SphereGeometry(.38,16,10,0,Math.PI*2,0,1.6),0xdab34d,0,2.34,0);
  for(let i=0;i<10;i++) add(new THREE.SphereGeometry(.15-i*.008,8,6),0xe6bf56,Math.sin(i*.8)*.08,2.22-i*.16,-.3-i*.025);
  const arms = [-1,1].map(s => {const pivot = new THREE.Group();pivot.position.set(s*.39,1.85,0);g.add(pivot);const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.5,4,8),mat(0xba92d2));arm.position.y=-.3;pivot.add(arm);return pivot;});
  g.userData.arms=arms;
  return g;
}
export class Player {
  constructor(scene, world) {
    this.world=world; this.group=new THREE.Group(); this.sprite=heroine();this.group.add(this.sprite);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.65,24),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.23,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.04;this.group.add(shadow);
    this.group.position.set(CONFIG.SPAWN.x,0,CONFIG.SPAWN.z);scene.add(this.group);
    this.camMode='third';this.orbit={yaw:0,pitch:0};this.moveVec={x:0,z:0};this.svel=new THREE.Vector3();this.lookSm=null;this.bobT=0;this.riding=false;
  }
  cycleCamMode(){this.camMode=this.camMode==='third'?'top':'third';return this.camMode;}
  resetCamera(){this.camMode='third';this.orbit={yaw:0,pitch:0};this.lookSm=null;}
  addLook(dx,dy){this.orbit.yaw-=dx*.004;this.orbit.pitch=THREE.MathUtils.clamp(this.orbit.pitch+dy*.003,-.1,.35);}
  setInput(x,z){this.moveVec={x,z};}
  stop(){this.setInput(0,0);this.svel.set(0,0,0);}
  inWater(x,z){return this.world.waters.some(w=>((x-w.x)/w.rx)**2+((z-w.z)/w.rz)**2<1);}
  onDock(x,z){const d=this.world.dockRect;return x>=d.x0&&x<=d.x1&&z>=d.z0&&z<=d.z1;}
  update(dt){
    if(this.riding)return;
    const {x,z}=this.moveVec, len=Math.max(1,Math.hypot(x,z)), yaw=this.orbit.yaw;
    const vx=(x*Math.cos(yaw)+z*Math.sin(yaw))/len*8;
    const vz=(-x*Math.sin(yaw)+z*Math.cos(yaw))/len*8;
    this.svel.x+=(vx-this.svel.x)*Math.min(1,dt*12);this.svel.z+=(vz-this.svel.z)*Math.min(1,dt*12);
    const p=this.group.position, nx=p.x+this.svel.x*dt,nz=p.z+this.svel.z*dt;
    if(isWalkable(this.world,nx,nz)){p.x=nx;p.z=nz;}else if(isWalkable(this.world,nx,p.z)){p.x=nx;}else if(isWalkable(this.world,p.x,nz)){p.z=nz;}
    p.y=window.terrainHeight?.(p.x,p.z)||0;
    const speed=this.svel.length();this.bobT+=dt*(speed>1?8:2);
    this.sprite.position.y=speed>1?Math.abs(Math.sin(this.bobT))*.07:0;
    this.sprite.userData.arms.forEach((arm,i)=>arm.rotation.x=speed>1?Math.sin(this.bobT+i*Math.PI)*.45:Math.sin(this.bobT)*.04);
    if(speed>1){const angle=Math.atan2(this.svel.x,this.svel.z);let diff=angle-this.group.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));this.group.rotation.y+=diff*Math.min(1,dt*10);}
  }
  updateCamera(camera,dt,snap=false){
    const p=this.group.position, top=this.camMode==='top', h=top?34:24+this.orbit.pitch*18,d=top?6:20;
    const desired=new THREE.Vector3(p.x+Math.sin(this.orbit.yaw)*d,p.y+h,p.z+Math.cos(this.orbit.yaw)*d);
    const target=new THREE.Vector3(p.x,p.y+1,p.z);
    if(snap||!this.lookSm){camera.position.copy(desired);this.lookSm=target;}else{camera.position.lerp(desired,1-Math.exp(-dt*6));this.lookSm.lerp(target,1-Math.exp(-dt*8));}
    camera.lookAt(this.lookSm);
  }
  teleport(x,z){this.group.position.set(x,window.terrainHeight?.(x,z)||0,z);this.stop();this.riding=false;this.resetCamera();}
}
