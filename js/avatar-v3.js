// Tangled-inspired princess heroine. Warm, expressive, romantic and clearly
// readable in third person. Dark hair and white/gold flowers stay personal to
// the birthday recipient; all animations are native Three.js / offline.
import * as THREE from 'three';

function mat(hex,rough=.75,metal=0){return new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal,side:THREE.DoubleSide});}
const colors={
  skin:mat(0xefb994,.84),nose:mat(0xeaa780),shadow:mat(0xc77a73),
  hair:mat(0x352934,.79),hairSide:mat(0x59404e,.76),
  dress:mat(0x985dc4,.74),dressDark:mat(0x70388f,.78),
  lavender:mat(0xc39ad8,.76),lace:mat(0xffecce,.57),
  gold:mat(0xe6bb6c,.45,.28),boot:mat(0x59365f,.82),
  brow:mat(0x493042),eyes:mat(0xffffff,.5),iris:mat(0x634330,.45),
  pupil:mat(0x25191e,.4),pink:mat(0xdb8585),blush:mat(0xe7a49a)
};
function put(parent,geo,material,x=0,y=0,z=0){
 const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);
 parent.add(m);m.castShadow=true;return m;
}
function ball(p,m,x,y,z,rx,ry=rx,rz=rx){
 const s=put(p,new THREE.SphereGeometry(1,18,14),m,x,y,z);
 s.scale.set(rx,ry,rz);return s;
}
function cone(p,r1,r2,height,m,x,y,z,segments=24){
 return put(p,new THREE.CylinderGeometry(r1,r2,height,segments,3),m,x,y,z);
}
function curve(p,points,r,m){
 return put(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),30,r,7,false),m);
}
function flower(p,x,y,z,size,matPetal,lightMats){
 const g=new THREE.Group();g.position.set(x,y,z);p.add(g);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3;
  const petal=ball(g,matPetal,Math.cos(a)*size*.58,Math.sin(a)*size*.58,0,size*.56,size*.38,size*.18);
  petal.rotation.z=a;
 }
 ball(g,colors.gold,0,0,size*.12,size*.34,size*.34,size*.16);
 lightMats.push(matPetal);
 return g;
}
function petalMaterial(tint){
 return new THREE.MeshStandardMaterial({
  color:tint,emissive:0xffdbab,emissiveIntensity:.15,roughness:.55
 });
}
export function createHeroineV3(player){
 const root=new THREE.Group();
 root.name="Her Tangled Story — fairytale princess";
 player.group.add(root);
 const limbs=[];

 // Draped bell skirt: rounded overlapping panels, not a blunt straight cylinder.
 const dressBody=new THREE.Group();root.add(dressBody);
 // A sculpted, continuously curved skirt silhouette replaces the old toy-like blobs.
 const lathePts=[
  new THREE.Vector2(0,.10),
  new THREE.Vector2(.69,.10),
  new THREE.Vector2(.84,.18),
  new THREE.Vector2(.83,.32),
  new THREE.Vector2(.73,.65),
  new THREE.Vector2(.57,.97),
  new THREE.Vector2(.39,1.34),
  new THREE.Vector2(.26,1.50),
  new THREE.Vector2(0,1.52)
 ];
 const skirt=put(dressBody,new THREE.LatheGeometry(lathePts,32),colors.dressDark);
 skirt.material=new THREE.MeshStandardMaterial({
   color:0x8e4bb7,roughness:.78,side:THREE.DoubleSide
 });
 // Continuous fabric folds with radial displacement; no attached spherical panels.
 // The folds are integrated into the surface, so the dress reads as sewn cloth.
 const skirtPosition=skirt.geometry.attributes.position;
 const skirtOriginal=new Float32Array(skirtPosition.array);
 const skirtNormals=()=>{skirt.geometry.computeVertexNormals();skirt.geometry.attributes.normal.needsUpdate=true;};
 for(let i=0;i<skirtPosition.count;i++){
   const x=skirtOriginal[i*3],y=skirtOriginal[i*3+1],z=skirtOriginal[i*3+2];
   const angle=Math.atan2(z,x);
   const r=Math.hypot(x,z);
   const fold=Math.sin(angle*10+Math.sin(y*2)*.18)*(.015+.028*(1-Math.min(1,y/1.5)));
   skirtPosition.setXYZ(i,x*(1+fold),y,z*(1+fold));
 }
 skirtPosition.needsUpdate=true;skirtNormals();
 // Fine gold seams flow down the dress instead of disconnected purple patches.
 const skirtOverlay=new THREE.MeshStandardMaterial({
   color:0xb17bd1,roughness:.88,transparent:true,opacity:.72,side:THREE.DoubleSide,
   depthWrite:false
 });
 for(let i=0;i<6;i++){
   const a=(i+.35)*Math.PI/3,vertices=[],indices=[];
   for(let j=0;j<=12;j++){
     const y=.18+j*.104;
     const r=.845-(y-.18)*.42;
     for(const da of [-.115,.115]){
       const theta=a+da*(1-(y/1.6)*.55);
       vertices.push(Math.sin(theta)*(r+.012),y,Math.cos(theta)*(r+.012));
     }
     if(j<12){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
   }
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
   geo.setIndex(indices);geo.computeVertexNormals();
   const fold=new THREE.Mesh(geo,skirtOverlay);
   fold.castShadow=false;dressBody.add(fold);
 }
 // Fine vertical stitch ribbons with gold embroidery, and a scalloped hem.
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,pts=[];
  for(let j=0;j<=7;j++){
   const y=.15+j*.158,r=.85-(y-0.15)*.42;
   pts.push([Math.sin(a)*r,y+.018,Math.cos(a)*r]);
  }
  curve(root,pts,.011,i%3===0?colors.gold:colors.lavender);
  if(i%3===0)ball(root,colors.gold,Math.sin(a)*.79,.25,Math.cos(a)*.79,.022,.03,.022);
 }
 const hem=put(root,new THREE.TorusGeometry(.82,.035,8,36),colors.lace,0,.165,0);
 hem.rotation.x=Math.PI/2;
 // Sweetheart fitted corset over the gown.
 cone(root,.23,.35,.64,colors.lavender,0,1.77,0,20);
 // Shaped bodice, small collar and laced panel rather than protruding torso balls.
 const frontPanel=put(root,new THREE.PlaneGeometry(.42,.53),colors.dressDark,0,1.79,.315);
 frontPanel.rotation.x=-.04;
 const collar=put(root,new THREE.TorusGeometry(.245,.025,6,22,Math.PI),colors.lace,0,2.105,.145);
 collar.rotation.z=Math.PI;
 for(const x of [-.21,.21]){
  curve(root,[[x,2.1,.35],[x*.7,1.78,.37],[x*.55,1.48,.28]],.02,colors.gold);
 }
 const bodiceLaces=[];
 for(let i=0;i<4;i++){
  const y=1.62+i*.11;
  const l=curve(root,[[-.10,y,.378],[0,y+.065,.405],[.10,y,.378]],.016,colors.lace);
  bodiceLaces.push(l);
 }
 // Rapunzel-style puff sleeves, hanging forearms, detailed cuffs.
 for(const side of [-1,1]){
  const sleeve=ball(root,colors.dress,side*.405,2.045,0,.195,.175,.20);
  ball(root,colors.lavender,side*.405,2.115,.075,.16,.085,.15);
  const arm=new THREE.Group();arm.position.set(side*.49,1.98,.01);root.add(arm);
  ball(arm,colors.skin,0,-.29,0,.088,.29,.095);
  ball(arm,colors.skin,0,-.59,.035,.083,.13,.095);
  cone(arm,.135,.14,.13,colors.lace,0,-.48,0,12);
  limbs.push(arm);
  const foot=ball(root,colors.boot,side*.29,.16,.18,.18,.14,.29);
  foot.name='slipper';
 }

 const neck=cone(root,.12,.13,.22,colors.skin,0,2.29,0,16);
 // Disney-inspired expressive face with large eyes and softened cheeks.
 const face=new THREE.Group();face.position.set(0,2.61,0);
 root.add(face);
 const head=ball(face,colors.skin,0,0,0,.355,.435,.315);
 // A continuous jaw and cheeks produce a softer heart-shaped face.
 ball(face,colors.skin,0,-.22,.065,.275,.205,.265);
 const cheeks=[];
 for(const side of [-1,1]){
  cheeks.push(ball(face,colors.blush,side*.205,-.155,.258,.078,.043,.009));
  // Strong upper eyelid, big almond sclera, dark warm iris.
  ball(face,colors.eyes,side*.139,.015,.275,.082,.064,.043);
  ball(face,colors.iris,side*.138,.009,.310,.047,.052,.021);
  ball(face,colors.pupil,side*.137,.008,.326,.025,.038,.011);
  ball(face,colors.eyes,side*.129,.039,.339,.012,.014,.008);
  const eyelid=ball(face,colors.hairSide,side*.139,.075,.308,.087,.014,.011);
  eyelid.rotation.z=-side*.09;
  // Tiny lashes give her personality, unlike the previous featureless doll.
  for(let j=0;j<2;j++){
   const lash=put(face,new THREE.CapsuleGeometry(.011,.073,4,6),colors.hair,
     side*(.199+j*.02),.082-j*.01,.31);
   lash.rotation.z=side*(.5+j*.18);
  }
  const brow=ball(face,colors.brow,side*.139,.165,.298,.09,.012,.012);
  brow.rotation.z=-side*.14;
 }
 ball(face,colors.nose,0,-.095,.308,.036,.042,.035);
 const smile=put(face,new THREE.TorusGeometry(.082,.008,6,22,Math.PI),colors.shadow,0,-.232,.307);
 smile.rotation.z=Math.PI;
 ball(face,colors.pink,0,-.252,.302,.077,.012,.012);
 // Soft side part and face-framing locks.
 ball(face,colors.hair,0,.273,-.038,.35,.235,.314);
 for(const side of [-1,1]){
  const bangs=ball(face,colors.hairSide,side*.172,.247,.176,.168,.08,.119);
  bangs.rotation.z=side*.32;
  const curl=ball(face,colors.hair,side*.296,-.14,-.038,.080,.295,.10);
  curl.rotation.z=side*.10;
 }

 // Huge flowing black-brown braid: interleaved locks visible from the back.
 // Chained rig reaches the hem and sways with inertia during turns.
 const braidBase=new THREE.Group();
 braidBase.position.set(.035,2.96,-.26);root.add(braidBase);
 const braid=[],flowerMats=[];
 for(let i=0;i<9;i++){
  const seg=new THREE.Group();
  if(i===0)braidBase.add(seg);
  else{seg.position.set(Math.sin(i*.53)*.033,-.285,-.015);braid[i-1].add(seg);}
  const r=.156-i*.006;
  // Closely overlapping tapered locks form a smoother woven braid.
  for(const side of [-1,1]){
   const x=side*(.095-i*.004);
   const lock=ball(seg,(i+side)%2?colors.hair:colors.hairSide,x*.70,-.145,0,r*.73,.21,.13);
   lock.rotation.z=side*.52;
  }
  ball(seg,colors.hair,0,-.175,-.035,r*.86,.215,.14);
  const band=put(seg,new THREE.TorusGeometry(r*.8,.013,6,14),colors.gold,0,-.288,0);
  band.rotation.x=Math.PI/2;
  if(i%2===0 || i===7){
   const petal=petalMaterial(i%3===0?0xffffff:0xffe5a4);
   const fx=i%2===0?-.135:.135;
   flower(seg,fx,-.13,-.23,i<6?.20:.16,petal,flowerMats);
  }
  braid.push(seg);
 }
 const end=ball(braid[8],colors.hair,0,-.38,0,.065,.18,.065);
 // Light woven ribbon and flowers that actually face the player's camera.
 curve(braidBase,[[0,-.06,-.15],[-.10,-.55,-.18],[.08,-1.12,-.18],[-.09,-1.7,-.18],[.05,-2.25,-.18]],.019,colors.gold);
 for(let i=0;i<3;i++){
  const material=petalMaterial(i===1?0xffd4a5:0xffffff);
  flower(braidBase,-.18+i*.18,-.08,-.31,.18,material,flowerMats);
 }
 // Hair curls along the dress hem, creating the recognizable trailing silhouette.
 const trailPts=[
   [0,.44,-.3],[.0,.24,-.43],[.10,.15,-.65],[.25,.125,-.91],
   [.4,.12,-.97],[.75,.12,-1.17],[.98,.12,-1.12]
 ];
 const trail=curve(root,trailPts,.061,colors.hairSide);
 curve(root,trailPts.map(([x,y,z])=>[x+.045,y+.045,z]),.014,colors.gold);
 const trailFlowers=[];
 for(const [i,x,z] of [[0,.53,-1.02],[1,.89,-1.14]]){
  const petals=petalMaterial(i?0xffffff:0xffdba5);
  const f=flower(root,x,.25,z,.16,petals,flowerMats);
  f.rotation.x=-Math.PI/2;trailFlowers.push(f);
 }
 // Gentle magical light only at discoveries (not a spooky bright spotlight).
 const flowerLight=new THREE.PointLight(0xfff0b4,.0,4,2);
 flowerLight.position.set(0,1.9,-.2);root.add(flowerLight);

 let pulse=0,lastYaw=player.group.rotation.y,lag=0;
 return{
  root,light:flowerLight,
  discover(){pulse=2.25;},
  update(dt,t){
   const moving=player.moving&&!player.riding;
   const yaw=player.group.rotation.y;
   let delta=yaw-lastYaw;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;
   lastYaw=yaw;
   lag+=(THREE.MathUtils.clamp(delta,-.55,.55)-lag)*Math.min(1,dt*3.1);
   // The skirt has floating, graceful fabric motion (not a stiff rotating cone).
   root.position.y=moving?Math.abs(Math.sin(t*7.9))*.055:Math.sin(t*1.5)*.014;
   dressBody.rotation.z=Math.sin(t*(moving?3.4:1.35))*(moving?.025:.014);
   skirt.rotation.y=Math.sin(t*.75)*.018;
   limbs.forEach((arm,i)=>{
     arm.rotation.x=moving?Math.sin(t*8+i*Math.PI)*.46:Math.sin(t*1.7+i)*.065;
     arm.rotation.z=(i?-.07:.07)+Math.sin(t*1.1+i)*.02;
   });
   // Loose braid segments lag one another — a weighted flowing illusion.
   braid.forEach((b,i)=>{
     const k=(i+1)/braid.length;
     b.rotation.y=-lag*k*1.15+Math.sin(t*1.18-i*.49)*.085*k;
     b.rotation.z=Math.sin(t*1.45-i*.41)*(.025+.055*k)+
       (moving?Math.sin(t*7-i*.56)*.045*k:0);
   });
   face.rotation.z=Math.sin(t*1.35)*.015;
   const blink=(t%4.3);
   const b=Math.max(0,1-Math.abs(blink-2.2)*14);
   // Eyes blink softly by narrowing only the sclera, keeping face readable.
   const eyes=face.children.filter(o=>o.isMesh&&o.material===colors.eyes);
   eyes.forEach(eye=>{eye.scale.y=.064*(1-b*.88);});
   pulse=Math.max(0,pulse-dt);
   const glow=pulse>0?Math.sin((2.25-pulse)*9)**2:0;
   for(const m of flowerMats)m.emissiveIntensity=.18+glow*1.35;
   flowerLight.intensity=glow*.62;
   root.visible=player.camMode!=='first';
  }
 };
}
