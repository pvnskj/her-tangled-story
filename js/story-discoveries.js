import * as THREE from 'three';
// Reuse the cast's own low-poly props as keepsakes in each location.
export function buildDiscoveries(scene,clues,npcs){
 const animated=[];
 const mesh=(g,geo,color,x,y,z)=>{const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);g.add(m);return m;};
 for(const clue of clues.filter(c=>c.discovery)){
  const g=new THREE.Group();g.position.set(clue.x,0,clue.z);g.name=clue.discovery.label;g.userData.clueId=clue.id;
  const owner=npcs.find(n=>n.castId===clue.characters[0]),activity=clue.discovery.activity;
  if(activity==='flower'){
   mesh(g,new THREE.CylinderGeometry(.07,.09,.8,7),0x779053,0,.4,0);
   for(let i=0;i<6;i++){const a=i*Math.PI/3,p=mesh(g,new THREE.SphereGeometry(.22,8,6),0xf4ce64,Math.cos(a)*.27,.85,Math.sin(a)*.27);p.scale.set(1,.35,1);}
   mesh(g,new THREE.SphereGeometry(.13,8,6),0xffe7a0,0,.9,0);
  }else if(activity==='perch'||activity==='sign'){
   mesh(g,new THREE.CylinderGeometry(.09,.13,1.4,7),0x745238,0,.7,0);
   mesh(g,new THREE.BoxGeometry(1.1,.5,.12),0xc9ac76,0,1.35,0);
   mesh(g,new THREE.BoxGeometry(.55,.09,.04),0x77573d,0,1.35,.08);
  }else if(activity==='stone'){
   mesh(g,new THREE.IcosahedronGeometry(.65,0),0x393445,0,.55,0);
   for(let i=0;i<3;i++)mesh(g,new THREE.BoxGeometry(.08,.45,.05),0xc3b4d2,-.2+i*.2,.65,.51);
  }else if(activity==='paint'){
   for(const x of [-.5,.5])mesh(g,new THREE.CylinderGeometry(.045,.06,1.8,7),0x8d6949,x,.9,0);
   mesh(g,new THREE.BoxGeometry(1.3,1,.08),0xe9d9b4,0,1.4,0);
   mesh(g,new THREE.CircleGeometry(.18,12),0xe1b84e,.28,1.6,.05);
   mesh(g,new THREE.BoxGeometry(.95,.2,.03),0x86a777,0,1.15,.05);
  }else if(owner?.castRig){
   mesh(g,new THREE.BoxGeometry(1.3,.7,.9),0x886743,0,.35,0);
   const prop=owner.castRig.prop.clone(true);prop.position.set(0,.85,0);g.add(prop);animated.push({prop,activity});
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(g);
 }
 return t=>{for(const {prop,activity} of animated){if(['magic','alchemy','lantern','puppet'].includes(activity)){prop.position.y=.85+Math.sin(t*1.5)*.05;prop.rotation.y=Math.sin(t*.5)*.08;}}};
}
