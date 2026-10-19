// V3 heroine: a stylized, animated 3D avatar, built from lightweight Three.js geometry.
// The original photo sprite remains in Player for compatibility but is not rendered
// in third-person; memory images and the complete original world are untouched.
import * as THREE from 'three';

const mesh=(parent,geo,mat,x=0,y=0,z=0)=>{
 const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;
};
const skin=new THREE.MeshStandardMaterial({color:0xe5aa88,roughness:.83});
const skinShade=new THREE.MeshStandardMaterial({color:0xc98f73,roughness:.86});
const dress=new THREE.MeshStandardMaterial({color:0x7940a0,roughness:.75,metalness:.08});
const bodice=new THREE.MeshStandardMaterial({color:0x9f69c3,roughness:.7});
const trim=new THREE.MeshStandardMaterial({color:0xf6d59b,roughness:.55,metalness:.23});
const hairMat=new THREE.MeshStandardMaterial({color:0x251b25,roughness:.82});
const hairHighlight=new THREE.MeshStandardMaterial({color:0x43313c,roughness:.7});
const white=new THREE.MeshStandardMaterial({color:0xfffbeb,emissive:0xffdf9e,emissiveIntensity:.25});
const gold=new THREE.MeshStandardMaterial({color:0xffd978,emissive:0xffb34b,emissiveIntensity:.3});
const eyeMat=new THREE.MeshBasicMaterial({color:0x231e2b});
const shine=new THREE.MeshBasicMaterial({color:0xffffff});

export function createHeroineV3(player){
 const root=new THREE.Group();root.name="Birthday heroine — V3 animated purple dress";
 player.group.add(root);
 const skirt=mesh(root,new THREE.CylinderGeometry(.35,.77,1.28,12,4),dress,0,.86,0);
 const overlay=mesh(root,new THREE.CylinderGeometry(.38,.76,1.25,12,1,true),bodice,0,.88,0);
 overlay.material= new THREE.MeshStandardMaterial({color:0x8f55b1,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false});
 const hem=mesh(root,new THREE.TorusGeometry(.745,.027,5,20),trim,0,.235,0);hem.rotation.x=Math.PI/2;
 mesh(root,new THREE.CylinderGeometry(.26,.32,.72,10),bodice,0,1.78,0);
 for(const side of [-1,1]){
  const sleeve=mesh(root,new THREE.SphereGeometry(.23,10,8),dress,side*.34,1.97,0);sleeve.scale.set(1,.83,.95);
  const arm=new THREE.Group();arm.position.set(side*.38,1.88,0);root.add(arm);
  mesh(arm,new THREE.CapsuleGeometry(.11,.52,4,8),skin,0,-.38,0);
  mesh(arm,new THREE.SphereGeometry(.12,8,7),skin,0,-.78,0);
  arm.userData.side=side; if(!root.userData.arms)root.userData.arms=[];root.userData.arms.push(arm);
  const shoe=mesh(root,new THREE.SphereGeometry(.16,10,8),dress,side*.26,.15,.13);shoe.scale.set(1,.65,1.55);
 }
 const neck=mesh(root,new THREE.CylinderGeometry(.11,.12,.18,10),skin,0,2.18,0);
 const face=new THREE.Group();face.position.y=2.52;root.add(face);
 const head=mesh(face,new THREE.SphereGeometry(.37,16,14),skin);
 head.scale.set(.89,1.14,.85);
 // Face looks toward the avatar's +Z travel direction.
 for(const side of [-1,1]){
   mesh(face,new THREE.SphereGeometry(.078,10,8),shine,side*.145,.035,.303).scale.set(.9,1.15,.5);
   mesh(face,new THREE.SphereGeometry(.046,10,8),eyeMat,side*.145,.03,.345);
   mesh(face,new THREE.SphereGeometry(.015,8,6),shine,side*.13,.05,.38);
   const brow=mesh(face,new THREE.BoxGeometry(.16,.025,.018),hairMat,side*.15,.15,.305);brow.rotation.z=side*.09;
 }
 const smile=mesh(face,new THREE.TorusGeometry(.1,.012,5,16,Math.PI),skinShade,0,-.16,.318);
 smile.rotation.z=Math.PI;
 mesh(face,new THREE.SphereGeometry(.3,12,10),hairMat,0,.18,-.08).scale.set(1.13,.9,1.14);
 // Two side locks frame the face without hiding her eyes.
 for(const s of [-1,1]){
   const lock=mesh(face,new THREE.CapsuleGeometry(.095,.32,4,8),hairMat,s*.30,-.13,-.03);
   lock.rotation.z=s*.15;
 }
 const braidRoot=new THREE.Group();braidRoot.position.set(0,2.75,-.28);root.add(braidRoot);
 const braidSegments=[],flowerMaterials=[];
 for(let i=0;i<5;i++){
  const segment=new THREE.Group();
  if(i===0)braidRoot.add(segment);else{segment.position.y=-.33;braidSegments[i-1].add(segment);}
  const scale=1-i*.11;
  const a=mesh(segment,new THREE.CapsuleGeometry(.17*scale,.23,4,8),i%2?hairHighlight:hairMat,0,-.18,-.045);
  a.rotation.z=i%2?.17:-.17;
  const band=mesh(segment,new THREE.TorusGeometry(.12*scale,.023,5,12),trim,0,-.32,-.04);band.rotation.x=Math.PI/2;
  // White-gold flowers: emissive petals brighten on each clue.
  if(i%1===0){
   const flower=new THREE.Group();flower.position.set(i%2?.17:-.16,-.17,.11);segment.add(flower);
   const material=i%2?white.clone():gold.clone();flowerMaterials.push(material);
   for(let p=0;p<5;p++){
     const petal=mesh(flower,new THREE.SphereGeometry(.068,7,6),material,
       Math.cos(p*Math.PI*2/5)*.076,Math.sin(p*Math.PI*2/5)*.076,0);
     petal.scale.set(.75,.9,.38);
   }
   mesh(flower,new THREE.SphereGeometry(.042,7,6),gold,0,0,.026);
  }
  braidSegments.push(segment);
 }
 // Long trailing end, bouncing rather than being a static hair block.
 const tip=mesh(braidSegments[4],new THREE.ConeGeometry(.095,.38,7),hairMat,0,-.49,-.02);tip.rotation.z=.1;
 const glow=new THREE.PointLight(0xffce82,.15,4,2);glow.position.set(0,2.2,-.25);root.add(glow);
 const boots=root.children.filter(o=>o.isMesh&&o.geometry.type==='SphereGeometry'&&o.position.y<.3);
 let lastYaw=player.group.rotation.y,turnLag=0,pulse=0;
 return {
   root, light:glow,
   discover(){pulse=2.4;},
   update(dt,t){
     const speed=Math.hypot(player.svel?.x||0,player.svel?.z||0);
     const walking=player.moving&&!player.riding;
     const turn=THREE.MathUtils.euclideanModulo(player.group.rotation.y-lastYaw+Math.PI,Math.PI*2)-Math.PI;
     lastYaw=player.group.rotation.y;
     turnLag=THREE.MathUtils.lerp(turnLag,THREE.MathUtils.clamp(turn,-.55,.55),Math.min(1,dt*4));
     root.position.y=walking?Math.abs(Math.sin(t*9))*.065:Math.sin(t*1.8)*.02;
     root.rotation.z=walking?Math.sin(t*8)*.02:Math.sin(t*.8)*.012;
     root.userData.arms?.forEach((arm,i)=>{arm.rotation.x=walking?Math.sin(t*9+i*Math.PI)*.48:Math.sin(t*1.4+i)*.06;});
     boots.forEach((boot,i)=>{boot.position.z=.13+(walking?Math.sin(t*9+i*Math.PI)*.18:0);});
     braidSegments.forEach((s,i)=>{
       const k=(i+1)/5;
       s.rotation.y=-turnLag*k*.85+Math.sin(t*1.7-i*.55)*.055*k;
       s.rotation.z=Math.sin(t*1.9-i*.55)*(.04+.04*k)+(walking?Math.sin(t*9-i*.42)*.045*k:0);
     });
     face.rotation.z=Math.sin(t*1.7)*.02;
     pulse=Math.max(0,pulse-dt);
     const intensity=.25+(pulse>0?Math.sin((2.4-pulse)*10)**2*1.9:Math.sin(t*1.4)*.12);
     flowerMaterials.forEach(m=>m.emissiveIntensity=intensity);
     glow.intensity=.18+(pulse>0?Math.sin((2.4-pulse)*9)**2*.9:0);
     root.visible=player.camMode!=='first';
   }
 };
}
