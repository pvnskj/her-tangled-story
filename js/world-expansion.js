import * as THREE from 'three';
import {PATHS,LAKE,BRIDGES,DRY_ISLANDS,segmentDistance,inLake} from './world-layout.js?v=20261018world';

// Reuse the original world's faceted geometry, warm windows, purple roofs and
// luminous dusk materials. No replacement renderer, avatar, lighting or textures.
export function buildExpansion(scene,{mat,box,cyl,addGlow,addPool,addCollider,waters}) {
  let seed=291033;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const landmarks={};
  function mesh(geometry,color,x,y,z){const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  function rock(x,z,size,color=0x756c83){const m=mesh(new THREE.IcosahedronGeometry(size,0),color,x,size*.65,z);m.scale.set(1,.8,1);m.rotation.y=rand()*6;addCollider(x,z,size*.8);return m;}
  function lamp(x,z){cyl(.12,.15,3.1,0x59432e,x,1.55,z,6);box(.65,.9,.65,0xdeb76c,x,3.4,z);addGlow(x,3.4,z,3,0xffbd67,.45);addPool(x,z,6,.10);}
  function sun(x,y,z,scale=1){const m=mesh(new THREE.CircleGeometry(.85*scale,16),0xeec96e,x,y,z);for(let i=0;i<8;i++){const a=i*Math.PI/4;const ray=box(.18*scale,.65*scale,.08,0xeec96e,x+Math.sin(a)*1.3*scale,y+Math.cos(a)*1.3*scale,z);ray.rotation.z=-a;}return m;}
  function roof(x,y,z,r,h,color=0x685185){const m=mesh(new THREE.ConeGeometry(r,h,8),color,x,y,z);m.rotation.y=Math.PI/8;return m;}
  function water(x,z,rx,rz,color=0x14a0b8){const m=mesh(new THREE.CircleGeometry(1,44),color,x,.06,z);m.rotation.x=-Math.PI/2;m.scale.set(rx,rz,1);m.material.transparent=true;m.material.opacity=.68;m.material.emissive.set(0x083038);m.material.roughness=.1;m.material.metalness=.3;waters.push({x,z,rx,rz});return m;}
  function arch(x,z,width=7,color=0x9a8c93,alongX=false){for(const d of [-width/2,width/2]){const px=x+(alongX?0:d),pz=z+(alongX?d:0);box(1.3,5.5,1.5,color,px,2.75,pz);addCollider(px,pz,.8);}const curve=mesh(new THREE.TorusGeometry(width/2,.68,6,12,Math.PI),color,x,5.4,z);if(alongX)curve.rotation.y=Math.PI/2;return curve;}

  // Corona's island palace: mosaic court, towers, balconies and open library.
  water(0,160,33,29);
  const island=mesh(new THREE.CylinderGeometry(24,25,.8,40),0xa99d8b,0,-.33,160);
  landmarks.castle=island;island.name='Corona Castle island';
  for(const [ax,az,bx,bz] of BRIDGES){const length=Math.hypot(bx-ax,bz-az),angle=Math.atan2(bz-az,bx-ax);const deck=box(length,1,6.4,0xa89c97,(ax+bx)/2,-.45,(az+bz)/2);deck.rotation.y=-angle;
    for(const side of [-1,1]){const nx=-Math.sin(angle)*side*3.15,nz=Math.cos(angle)*side*3.15;const rail=box(length,1.05,.4,0xc6bbae,(ax+bx)/2+nx,.55,(az+bz)/2+nz);rail.rotation.y=-angle;}}
  const palace=box(17,14,12,0xe0ceb1,0,7,163);palace.name='Corona Castle';addCollider(0,163,10.2);
  box(18,.7,13,0xbba77e,0,12,163);roof(0,18,163,13,10);
  for(const [x,z,height] of [[-13,155,15],[13,155,15],[-11,172,19],[11,172,19]]){
    cyl(2.5,3,height,0xd8c5ab,x,height/2,z,10);roof(x,height+3,z,3.6,7);addCollider(x,z,3);
    box(.8,2,.13,0xffd78b,x,height-3,z-2.55);addGlow(x,height-2,z-2.7,2.5,0xffca6b,.26);
    cyl(.1,.13,3,0xd8b454,x,height+8,z,6);const flag=mesh(new THREE.PlaneGeometry(2.1,1.1),0x8d568f,x+1,height+8,z);flag.material.side=THREE.DoubleSide;
  }
  box(3.4,5,.15,0x4b365b,0,2.5,156.9);sun(0,9,156.85,1.25);
  // Front balcony and luminous windows.
  box(9,.5,2.1,0xbba892,0,6,156.1);for(let x=-4;x<=4;x+=.8)cyl(.07,.08,1.2,0xe8d3b3,x,6.8,155.15,5);
  for(const x of [-5,5])for(const y of [4,10]){box(1.5,2,.18,0xffd49a,x,y,156.85);addGlow(x,y,156.7,2,0xffcf80,.22);}
  const court=mesh(new THREE.CircleGeometry(10,32),0xd5b783,0,.10,144);court.rotation.x=-Math.PI/2;
  for(let i=0;i<16;i++){const a=i*Math.PI/8;const tile=box(1.2,.08,2.4,i%2?0x71588c:0xe9cb7a,Math.cos(a)*7,.13,144+Math.sin(a)*7);tile.rotation.y=-a;}
  // A walk-in library loggia beside the palace, open toward the courtyard.
  box(7,.3,8,0xb8a48a,-17,.15,164);for(const x of [-20,-14])for(const z of [160,168]){cyl(.3,.4,5,0xd8c5ab,x,2.5,z,8);addCollider(x,z,.4);}
  box(8,.7,9,0x705b87,-17,5.2,164);
  for(const z of [162,165,167]){box(4,2,.7,0x735038,-17,1.2,z);addCollider(-17,z,1.5);for(let b=0;b<7;b++)box(.3,.6,.4,[0x875d83,0xc6a46a,0x607f75][b%3],-18.5+b*.5,2.5,z);}
  for(const x of [-9,9]){lamp(x,137);for(let i=0;i<4;i++)mesh(new THREE.IcosahedronGeometry(.6,0),0xba77a3,x+(i-1.5)*1.1,.5,136);}

  // Secret tunnel: visible cutaway walls keep the avatar legible in bird's-eye view.
  // The timber-supported dry passage runs under the Duckling's outer roots.
  const cave=arch(114,55,7,0x817884,true);cave.name='The Secret Cave Tunnel';landmarks.cave=cave;
  for(let x=114;x<=143;x+=4){
    for(const z of [49.7,60.3])rock(x,z,2.6,0x666074);
    if(x%8===2){for(const z of [51.5,58.5]){box(.45,4.8,.55,0x715037,x,2.4,z);addCollider(x,z,.4);}box(.55,.55,7.7,0x715037,x,4.9,55);}
  }
  arch(138,55,7,0x777180,true);
  for(const z of [53.7,56.3]){box(28,.10,.13,0x7c6553,126,.16,z);}
  for(let x=115;x<141;x+=2)box(.16,.08,3.2,0x6c4c36,x,.12,55);
  water(151,55,9,3.8,0x386d80);for(const z of [50,60])rock(151,z,3,0x676074);
  for(const x of [118,130,140])lamp(x,59);
  box(1.8,1,1.4,0x77543c,132,.7,59);addCollider(132,59,1.1);
  // Curved roots extending toward the existing tavern, above the clear walkway.
  for(const z of [49,61]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(101,5,z),new THREE.Vector3(107,8,z),new THREE.Vector3(114,5,z)]);mesh(new THREE.TubeGeometry(curve,10,.65,6,false),0x70533d,0,0,0);}

  // Sundrop cove: rock shelter, woven basket and animated golden flower.
  const cove=mesh(new THREE.CircleGeometry(9,24),0xa48c68,-130,.09,-38);cove.rotation.x=-Math.PI/2;cove.name='The Sundrop Enclave';landmarks.sundrop=cove;
  for(let i=0;i<8;i++){const a=.1+i*.37;rock(-132-Math.sin(a)*9,-38-Math.cos(a)*9,2.2+i%3*.5,0x827a86);}
  cyl(.8,1.1,.7,0xbaaa7f,-132,.35,-35,10);
  const stem=cyl(.10,.12,1.6,0x6f924a,-132,1.2,-35,7);
  const flower=new THREE.Group();flower.position.set(-132,2.1,-35);scene.add(flower);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const petal=new THREE.Mesh(new THREE.SphereGeometry(.42,7,5),mat(0xffd66b,0x5a3904));petal.scale.set(.55,.35,1.4);petal.position.set(Math.sin(a)*.55,.05,Math.cos(a)*.55);petal.rotation.y=a;flower.add(petal);}
  const heart=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),mat(0xfff0a0,0xa46d10));flower.add(heart);
  addGlow(-132,2,-35,7,0xffd76a,.5);addPool(-132,-35,10,.18);
  const basket=cyl(1.1,.8,1.25,0xa77945,-129,.63,-34,12);for(let y=.25;y<1.3;y+=.23){const ring=mesh(new THREE.TorusGeometry(.85+y*.15,.055,4,16),0xd0a56b,-129,y,-34);ring.rotation.x=Math.PI/2;}
  addCollider(-129,-34,1.1);lamp(-121,-43);

  // Dark Kingdom: broken Gothic silhouette and faceted black-rock growths.
  const ruin=box(16,11,10,0x51475e,145,5.5,-132);ruin.name='The Dark Kingdom';landmarks.dark=ruin;addCollider(145,-132,9.5);
  for(const [x,z,h] of [[133,-130,15],[157,-130,18],[140,-140,23],[152,-141,21]]){cyl(1.7,2.2,h,0x484154,x,h/2,z,7);roof(x,h+3,z,2.5,7,0x302e43);addCollider(x,z,2.3);box(.6,2,.12,0x9b86bd,x,h-3,z+1.75);}
  arch(142,-116,8,0x62586f);box(2.8,4,.12,0x28273b,145,2,-126.9);
  for(let i=0;i<28;i++){const a=rand()*Math.PI*2,r=12+rand()*15,x=145+Math.cos(a)*r,z=-130+Math.sin(a)*r;
    if(PATHS.some(p=>segmentDistance(x,z,p)<4)||Math.hypot(x-142,z+108)<5)continue;
    const h=2+rand()*7,crystal=mesh(new THREE.ConeGeometry(.8+rand()*.8,h,5),0x363342,x,h/2,z);crystal.rotation.z=(rand()-.5)*.4;addCollider(x,z,1.2);}
  addGlow(145,8,-126,12,0xa28dd3,.15);for(const x of [136,148])lamp(x,-107);

  // Sparse matching trees and meadow in the expanded outer land. Original forest is untouched.
  const trunkG=new THREE.CylinderGeometry(.4,.65,3,7),canopyG=new THREE.IcosahedronGeometry(1.7,1);
  for(let i=0;i<95;i++){
    const x=-188+rand()*376,z=-188+rand()*376;
    if(Math.abs(x)<118&&Math.abs(z)<118)continue;
    if(inLake(x,z)||waters.some(w=>((x-w.x)/w.rx)**2+((z-w.z)/w.rz)**2<1.2))continue;
    if(PATHS.some(p=>segmentDistance(x,z,p)<6)||Math.hypot(x-145,z+126)<32||Math.hypot(x,z-160)<35)continue;
    const scale=.8+rand()*.8;const trunk=mesh(trunkG,0x6a4a30,x,1.5*scale,z);trunk.scale.setScalar(scale);
    for(let layer=0;layer<3;layer++){const leaf=mesh(canopyG,[0x506647,0x6b8c49,0x91a65a][layer],x,scale*(4.4+layer*1.3),z);leaf.scale.setScalar(scale*(1.2-layer*.2));}
    addCollider(x,z,.7*scale);
  }
  // Same grass blade geometry and greens as the original meadow, at lower outer density.
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.16,0,0,.16,0,0,.05,.72,.06],3));blade.computeVertexNormals();
  const grass=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({roughness:1,side:THREE.DoubleSide}),22000),dummy=new THREE.Object3D(),color=new THREE.Color();let count=0;
  for(let i=0;i<65000&&count<22000;i++){const x=-198+rand()*396,z=-198+rand()*396;
    if(Math.abs(x)<112&&Math.abs(z)<112)continue;
    if(waters.some(w=>((x-w.x)/w.rx)**2+((z-w.z)/w.rz)**2<1.08)||PATHS.some(p=>segmentDistance(x,z,p)<2.4))continue;
    if(Math.hypot(x,z-160)<27||Math.hypot(x-145,z+130)<30||Math.hypot(x+130,z+38)<11)continue;
    dummy.position.set(x,0,z);dummy.scale.setScalar(.8+rand()*.7);dummy.rotation.y=rand()*6;dummy.updateMatrix();grass.setMatrixAt(count,dummy.matrix);grass.setColorAt(count,color.setHSL(.22+rand()*.08,.5,.35+rand()*.15));count++;}
  grass.count=count;scene.add(grass);
  return {landmarks,update(t){flower.rotation.y=Math.sin(t*.4)*.12;stem.scale.y=1+Math.sin(t)*.025;}};
}
