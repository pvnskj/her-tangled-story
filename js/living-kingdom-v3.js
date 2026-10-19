// V3 Living Kingdom. Everything here is decorative / opt-in interaction;
// NEVER changes the original 9-star topology, world colliders, landmark groups,
// walkability, clue positions, photo order or any source world asset.
import * as THREE from 'three';
import {ZONES} from './world-layout.js?v=20261018story';

const zone=id=>ZONES.find(z=>z.id===id);
const material=(color,emissive=0x000000,intensity=0)=>new THREE.MeshStandardMaterial({
 color,roughness:.78,emissive,emissiveIntensity:intensity,side:THREE.DoubleSide
});
const gold=material(0xe6b45c,0x7d4619,.14),wood=material(0x76513b),stone=material(0xaca1aa);
const lavender=material(0x73528d),white=material(0xf3e7dc);
function put(g,geo,mat,x=0,y=0,z=0){
 const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);g.add(o);return o;
}
function orb(g,r,mat,x,y,z){return put(g,new THREE.SphereGeometry(r,9,7),mat,x,y,z);}
function box(g,w,h,d,mat,x,y,z){return put(g,new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
function pole(g,h,x,z,color=wood){return put(g,new THREE.CylinderGeometry(.10,.12,h,7),color,x,h/2,z);}
function lantern(g,x,y,z,light=false){
 const holder=new THREE.Group();holder.position.set(x,y,z);g.add(holder);
 const a=material(0xf9c57a,0xf3a134,.8);
 put(holder,new THREE.CylinderGeometry(.23,.23,.48,8,1),a,0,0,0);
 put(holder,new THREE.CylinderGeometry(.28,.28,.06,8),gold,0,.25,0);
 put(holder,new THREE.CylinderGeometry(.28,.28,.06,8),gold,0,-.25,0);
 if(light){const point=new THREE.PointLight(0xffb765,.65,14,2);point.position.y=.1;holder.add(point);}
 return holder;
}
function crystal(g,x,y,z,color,scale=1){
 const m=material(color,color,.85);const o=put(g,new THREE.OctahedronGeometry(scale,0),m,x,y,z);
 o.scale.set(.45,1.35,.56);o.rotation.z=.12;return o;
}
function leaves(g,cx,cy,cz,count=12){
 const green=material(0x507b42);
 for(let i=0;i<count;i++){
  const a=i*2.4,r=.3+(i%3)*.12;
  const leaf=put(g,new THREE.SphereGeometry(.22,7,5),green,cx+Math.sin(a)*r,cy-i*.28,cz+Math.cos(a)*r);
  leaf.scale.set(.7,.38,1.4);leaf.rotation.z=a;
 }
}
function canvasSun(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
 ctx.translate(128,128);ctx.strokeStyle='#fbe0a1';ctx.fillStyle='#f4ca69';
 for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*Math.PI/6);ctx.beginPath();ctx.moveTo(-10,-46);ctx.lineTo(0,-102);ctx.lineTo(10,-46);ctx.closePath();ctx.fill();ctx.restore();}
 ctx.beginPath();ctx.arc(0,0,48,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#a97831';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.stroke();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const sunTexture=canvasSun();
function sunDecal(g,x,z,s=6){
 const plane=put(g,new THREE.PlaneGeometry(s,s),new THREE.MeshBasicMaterial({
 map:sunTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false,opacity:.92
 }),x,.12,z);plane.rotation.x=-Math.PI/2;plane.renderOrder=3;return plane;
}
const waveMats=[];
function clothMaterial(color){
 const col=new THREE.Color(color);
 const mat=new THREE.ShaderMaterial({
 uniforms:{uTime:{value:0},uColor:{value:col}},
 side:THREE.DoubleSide,transparent:true,depthWrite:false,
 vertexShader:`
 uniform float uTime; varying vec2 vUv;
 void main(){
  vUv=uv; vec3 p=position;
  p.z+=sin(p.x*5.5 + uTime*2.5 + p.y*3.2)*.09*(.25+uv.y);
  p.y+=sin(p.x*3.1+uTime*1.8)*.035;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
 }`,
 fragmentShader:`
 uniform vec3 uColor; varying vec2 vUv;
 void main(){
  vec2 p=(vUv-.5)*2.;float a=atan(p.y,p.x),r=length(p);
  float disk=1.-smoothstep(.31,.36,r);
  float rays=(1.-smoothstep(.64,.78,r))*(smoothstep(.6,.95,cos(a*8.)))*smoothstep(.32,.5,r);
  vec3 sun=vec3(.98,.82,.43);
  vec3 base=uColor*(.8+.18*vUv.y);
  gl_FragColor=vec4(mix(base,sun,max(disk,rays)*.9),.97);
 }`
 });
 waveMats.push(mat);return mat;
}
function sunBanner(g,x,y,z,rot=0,w=2,h=3,color=0x78569e){
 const banner=new THREE.Mesh(new THREE.PlaneGeometry(w,h,9,5),clothMaterial(color));
 banner.position.set(x,y,z);banner.rotation.y=rot;banner.name='Rippled Corona sun banner';
 g.add(banner);return banner;
}
function bunting(g,a,b,colors=[0x9062a5,0xf1b365,0xd68199]){
 const steps=9;
 const cable=new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(a[0],a[1],a[2]),new THREE.Vector3(b[0],b[1],b[2])
 ]);
 g.add(new THREE.Line(cable,new THREE.LineBasicMaterial({color:0xf3dfbb})));
 for(let i=0;i<steps;i++){
  const u=(i+.5)/steps,x=a[0]+(b[0]-a[0])*u,z=a[2]+(b[2]-a[2])*u,y=a[1]+(b[1]-a[1])*u-.24;
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(.9,1.15,5,4),clothMaterial(colors[i%colors.length]));
  flag.position.set(x,y-.48,z);flag.rotation.y=Math.atan2(b[2]-a[2],b[0]-a[0]);
  g.add(flag);
 }
}
function makeFire(g,x,z){
 const coals=material(0xdd7038,0xe0550e,1),ash=material(0x44343a);
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9;orb(g,.27,ash,x+Math.sin(a)*1.0,.14,z+Math.cos(a)*1.0);}
 for(let i=0;i<3;i++){const flame=put(g,new THREE.ConeGeometry(.22,1.2,7),coals,x+Math.sin(i*2.1)*.24,.8,z+Math.cos(i*2.1)*.25);flame.rotation.z=Math.sin(i*2.4)*.2;}
 const point=new THREE.PointLight(0xff984e,1.6,16,2);point.position.set(x,2,z);g.add(point);return point;
}
function makeBasket(g,x,z){
 const basket=put(g,new THREE.CylinderGeometry(.65,.52,.65,10),material(0xaa7c45),x,.36,z);
 const rim=put(g,new THREE.TorusGeometry(.62,.07,5,12),gold,x,.7,z);rim.rotation.x=Math.PI/2;
 return basket;
}
function makeEasel(g,x,z){
 for(const dx of [-.5,.5]){const l=pole(g,2.8,x+dx,z);l.rotation.z=dx*.2;}
 const panel=box(g,1.8,1.45,.12,material(0xefcfb6),x,1.75,z);
 const painting=box(g,1.15,.68,.13,material(0x83a5b1),x,1.83,z+.10);
 put(g,new THREE.SphereGeometry(.18,8,6),gold,x+.2,1.99,z+.22);
 return panel;
}
function makeLog(g,x,z){
 const log=put(g,new THREE.CylinderGeometry(.65,.75,3.4,10),wood,x,.75,z);
 log.rotation.z=Math.PI/2;
 const opening=put(g,new THREE.CircleGeometry(.52,12),material(0x372a24),x+1.7,.8,z);
 opening.rotation.y=Math.PI/2;return log;
}
function floralPatch(g,x,z,n=16){
 const stem=material(0x557f4b),petal=material(0xf4c465,0xd8a12c,.45);
 for(let i=0;i<n;i++){
  const a=i*2.4,r=.7+Math.sqrt((i+.5)/n)*3.0,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
  const h=.35+(i%4)*.11;
  put(g,new THREE.CylinderGeometry(.025,.035,h,5),stem,px,h/2,pz);
  const f=orb(g,.15,petal,px,h+.05,pz);f.scale.set(1.1,.43,1.1);
 }
}
function fountain(g,x,z){
 const basin=put(g,new THREE.CylinderGeometry(3.1,2.7,.85,24),stone,x,.42,z);
 const water=put(g,new THREE.CylinderGeometry(2.76,2.76,.03,24),new THREE.MeshStandardMaterial({
 color:0x95c6db,metalness:.45,roughness:.18,transparent:true,opacity:.83
 }),x,.89,z);
 const column=put(g,new THREE.CylinderGeometry(.35,.44,3.1,12),stone,x,2.25,z);
 orb(g,.45,gold,x,4.0,z);
 const shower=new THREE.Mesh(new THREE.CylinderGeometry(1.4,.35,2.25,24,8,true),
  new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,
  uniforms:{uTime:{value:0}},
  vertexShader:'uniform float uTime;varying vec2 uvv;void main(){uvv=uv;vec3 p=position;p.x+=sin(uTime*2.+p.y*5.)*.045;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
  fragmentShader:'uniform float uTime;varying vec2 uvv;void main(){float waves=.48+.15*sin(uvv.y*32.+uTime*5.);gl_FragColor=vec4(.65,.86,1.,waves*.66);}'})
 );shower.position.set(x,2.5,z);g.add(shower);
 return shower;
}
function purpleFog(g,x,z,size=12){
 const p=put(g,new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({
 color:0x715d8c,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide
 }),x,.20,z);p.rotation.x=-Math.PI/2;return p;
}
function addRays(g,x,z,color=0xffe2a3){
 const rayMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 for(let i=0;i<4;i++){
  const a=i*.95,ray=put(g,new THREE.ConeGeometry(2.4,19,4,1,true),rayMat.clone(),x+Math.cos(a)*5,10,z+Math.sin(a)*5);
  ray.rotation.z=.22+i*.13;
 }
}
function placeInteractive(g,id,x,z,mesh,hitMeshes,extras={}){
 mesh.userData.interact={kind:'ambient',activity:id,x:g.position.x+x,z:g.position.z+z,...extras};
 // Parent the decorative group: raycast will find this tagged ancestor.
 hitMeshes.push(mesh);
}
export function createLivingKingdomV3(scene,clues,npcs,hitMeshes){
 const groups=new Map(),animated=[],ambient=new Map(),responsive=[],particles=[];
 const mobile=/iPhone|iPad|Android/i.test(navigator.userAgent);
 for(const z of ZONES){const group=new THREE.Group();group.position.set(z.x,0,z.z);group.name='V3 living '+z.name;scene.add(group);groups.set(z.id,group);}
 const at=id=>groups.get(id);
 // TOWER: sun-washed stone, vines, painting, baskets, warm highlights.
 {
  const g=at('tower');
  sunDecal(g,-6,-8,8);makeEasel(g,-9,-7);makeBasket(g,-5,-10);
  for(let i=0;i<18;i++){
   const a=i*.48;const x=-13+Math.cos(a)*1.2,z=-2+Math.sin(a)*1.2;
   const vine=orb(g,.15,material(0x578044),x,.5+i*.42,z);vine.scale.set(1.6,.7,1);
   if(i%3===0)leaves(g,x,1+i*.42,z,3);
  }
  const mural=box(g,4,2.6,.12,material(0xdbc0a5),8,3,-10);
  const painted=box(g,2.6,1.2,.14,material(0x9c83b2),8,3,-9.89);
  sunBanner(g,4,5,-10,.2,1.65,2.4,0x875cab);
  const prop=makeBasket(g,12,7);
  placeInteractive(g,'tower',12,7,prop,hitMeshes);
 }
 // FOREST: root bridges, shafts of sun, hollow log, animals already from world.js.
 {
  const g=at('forest');addRays(g,-8,-5);makeLog(g,5,12);
  const rootMat=material(0x665039);
  for(let i=0;i<3;i++){
    const points=[];
    for(let j=0;j<10;j++){const a=j/9;points.push(new THREE.Vector3(-12+a*21,-.05+Math.sin(Math.PI*a)*(1.8+i*.3),-11+i*4));}
    const tube=put(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),28,.26+i*.045,5,false),rootMat);
  }
  floralPatch(g,14,-8,24);
  const log=makeLog(g,14,8);placeInteractive(g,'forest',14,8,log,hitMeshes);
 }
 // TAVERN: pub glow, mugs, lanterns, fire and festival bunting.
 {
  const g=at('tavern');
  bunting(g,[-15,7,-14],[15,7,13]);bunting(g,[-17,6,10],[15,6,-15]);
  // Animated cloth canopy and sun banners over the existing tavern stalls.
  const awning=new THREE.Mesh(new THREE.PlaneGeometry(9,4,12,6),clothMaterial(0x925d87));
  awning.position.set(16,5,-12);awning.rotation.x=-.22;g.add(awning);
  sunBanner(g,16,6,12,-.2,2.2,3.0,0x6c427f);
  for(let i=0;i<5;i++){const a=i*1.4;const x=Math.cos(a)*8,z=Math.sin(a)*8;
   const barrel=put(g,new THREE.CylinderGeometry(.68,.68,1.1,10),wood,x,.56,z);
   const band=put(g,new THREE.TorusGeometry(.69,.05,5,10),gold,x,1.07,z);band.rotation.x=Math.PI/2;
  }
  makeFire(g,-12,12);lantern(g,-12,4,-11,true);lantern(g,12,4,9);
  const table=box(g,3,.20,2,wood,12,.9,-10);
  pole(g,1,11,-10);pole(g,1,13,-10);
  const mug=put(g,new THREE.CylinderGeometry(.3,.24,.6,9),material(0xbb8a53),12,1.35,-10);
  const spilled=put(g,new THREE.CylinderGeometry(.32,.26,.58,9),material(0xab7848),10.4,1.23,-9.7);
  spilled.rotation.z=Math.PI/2.9;
  const spill=put(g,new THREE.CircleGeometry(.58,14),material(0xb88f49),10.7,1.015,-9.55);
  spill.rotation.x=-Math.PI/2;
  placeInteractive(g,'tavern',12,-10,mug,hitMeshes);
 }
 // CAVE: enclosed feeling, crystalline blue-purple sparkle and pickaxe lanterns.
 {
  const g=at('cave');
  for(let i=0;i<22;i++){
    const a=i*2.399,r=5+Math.sqrt(i/22)*15,x=Math.sin(a)*r,z=Math.cos(a)*r;
    crystal(g,x,.85,z,i%2?0x8f78dc:0x6eb5e5,.5+(i%5)*.21);
  }
  for(let i=0;i<5;i++){
   const x=-12+i*6;pole(g,4.8,x,-13);
   const pick=box(g,1.2,.12,.14,material(0x8f94ae),x+.48,4.87,-13);
   pick.rotation.z=-.13;
   const cord=put(g,new THREE.CylinderGeometry(.018,.018,.53,5),wood,x+1.0,4.44,-13);
   lantern(g,x+1.0,4.08,-13,i===2);
  }
  const ore=crystal(g,10,1.3,6,0x9bc6fd,1.5);placeInteractive(g,'cave',10,6,ore,hitMeshes);
 }
 // VILLAGE: street sun emblems, garlands, flowers and dancing couples.
 {
  const g=at('village');
  for(const [x,z,s] of [[-8,2,9],[10,-7,6],[8,12,5]])sunDecal(g,x,z,s);
  bunting(g,[-21,9,-5],[21,9,-5]);bunting(g,[-19,8,11],[19,8,11]);
  bunting(g,[-7,8,-20],[12,8,19]);
  // Existing market stalls keep their original meshes. These additional
  // rippling awnings sit high above the walking paths.
  for(const x of [-17,17]){
    const canopy=new THREE.Mesh(new THREE.PlaneGeometry(9,4,10,5),clothMaterial(x<0?0xb46a86:0x9473c6));
    canopy.position.set(x,5.8,8);canopy.rotation.x=-.17;g.add(canopy);
  }
  sunBanner(g,-16,6,-14,.2,2.5,3,0xa06fbe);
  floralPatch(g,5,-16,22);floralPatch(g,-11,12,20);
  const stage=put(g,new THREE.CylinderGeometry(2.8,2.8,.24,16),wood,16,.12,12);
  sunDecal(g,16,12,4);
  placeInteractive(g,'village',16,12,stage,hitMeshes);
 }
 // CASTLE: banner avenue, fountain, regal lanterns.
 {
  const g=at('castle');for(const x of [-18,-9,9,18])sunBanner(g,x,7,-15,Math.PI,2,3.8,x<0?0x7752aa:0x9f78cb);
  sunDecal(g,0,1,9);
  const water=fountain(g,12,12);animated.push({kind:'fountain',mesh:water});
  lantern(g,-9,4,7,true);lantern(g,9,4,7);
  placeInteractive(g,'castle',12,12,water,hitMeshes);
 }
 // DARK KINGDOM: obsidian, lonely haze and white crystal lights.
 {
  const g=at('dark');
  for(let i=0;i<15;i++){const a=i*2.4,r=7+i%5*3;
   const spire=put(g,new THREE.ConeGeometry(.9+(i%3)*.3,5+(i%6)*1.5,5),material(0x242333),Math.cos(a)*r,2.5+(i%6)*.75,Math.sin(a)*r);
   spire.rotation.z=(i%3-1)*.11;
  }
  for(const [x,z] of [[-11,-8],[6,12],[14,-12]]){const fog=purpleFog(g,x,z,18);animated.push({kind:'fog',mesh:fog,phase:x});}
  const shard=crystal(g,8,1.3,5,0xecf3ff,1.7);placeInteractive(g,'dark',8,5,shard,hitMeshes);
 }
 // SUNDROP: 5000 flowers on desktop, reduced count on phones; no collision.
 {
  const g=at('sundrop'),n=mobile?1700:5000;
  // Five broad Sundrop petals per instanced flower, rather than spiky cones.
  // One draw call for the whole 5,000-flower carpet.
  const petalVertices=[];
  for(let p=0;p<5;p++){
    const a=p*Math.PI*2/5,s=Math.sin(a),co=Math.cos(a),
      sx=Math.sin(a-.35),sz=Math.cos(a-.35),ex=Math.sin(a+.35),ez=Math.cos(a+.35);
    // Two triangles per wide glowing petal, opening from the flower's heart.
    petalVertices.push(0,.35,0,sx*.40,.25,sz*.40,s*.62,.34,co*.62);
    petalVertices.push(0,.35,0,s*.62,.34,co*.62,ex*.40,.25,ez*.40);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(petalVertices,3));
  geometry.computeVertexNormals();
  const mat=material(0xf5cb66,0xcfa04c,.6);
  const field=new THREE.InstancedMesh(geometry,mat,n);
  const d=new THREE.Object3D();let seed=12477;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  const colors=[0xf7d98d,0xeebb64,0xffe7ae,0xeec37b,0xf9d36d];
  for(let i=0;i<n;i++){
    const a=rnd()*Math.PI*2,r=2+Math.sqrt(rnd())*31;
    d.position.set(Math.sin(a)*r,.3,Math.cos(a)*r);
    d.rotation.y=rnd()*Math.PI*2;d.scale.setScalar(.6+rnd()*1.2);d.updateMatrix();
    field.setMatrixAt(i,d.matrix);field.setColorAt(i,new THREE.Color(colors[i%5]));
  }
  field.instanceMatrix.needsUpdate=true;field.name='Sundrop bloom field';g.add(field);
  addRays(g,0,0,0xffe8ae);sunDecal(g,0,0,5);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;crystal(g,Math.sin(a)*5,1.1,Math.cos(a)*5,0xffd873,.65);}
  const flower=orb(g,1.2,material(0xf5c865,0xf5bd42,1.7),11,1.5,6);
  for(let i=0;i<8;i++){const a=i*Math.PI*2/8;
    const p=orb(g,.9,material(0xffdc8a,0xfac45a,.9),11+Math.sin(a)*1.0,1.5,6+Math.cos(a)*1.0);
    p.scale.set(1.3,.4,.7);}
  placeInteractive(g,'sundrop',11,6,flower,hitMeshes);
 }
 // LAKE: a reflective patch by the dock and nine lanterns waiting for the finale.
 const lanternGroup=[];
 {
  const g=at('lake');
  const plane=put(g,new THREE.PlaneGeometry(40,21,24,12),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:{value:0}},
    vertexShader:'uniform float uTime;varying vec2 vv;void main(){vv=uv;vec3 p=position;p.z+=sin(p.x*.6+uTime*1.2)*.06;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader:'uniform float uTime;varying vec2 vv;void main(){float wave=.5+.5*sin(vv.x*40.+uTime*2.5+sin(vv.y*20.));float star=pow(max(0.,sin(vv.x*171.)*sin(vv.y*237.)),22.);vec3 dusk=mix(vec3(.25,.16,.49),vec3(.90,.48,.60),vv.y);gl_FragColor=vec4(dusk+vec3(star*.4+wave*.07),.14+wave*.11);}'})
  ,0,.15,0);plane.rotation.x=-Math.PI/2;
  for(let i=0;i<9;i++){
   const a=(i-4)*.33;
   const l=lantern(g,16+Math.sin(a)*8,2,(17+Math.cos(a)*5),false);
   l.visible=false;lanternGroup.push({object:l,startX:l.position.x,startZ:l.position.z,phase:i*.4});
  }
  lantern(g,-10,2,13,true);
  const candle=lantern(g,-12,1.4,-6);placeInteractive(g,'lake',-12,-6,candle,hitMeshes);
  animated.push({kind:'water',mesh:plane});
 }
 // CHARACTER PAIRS: only non-clue wanderers, anchored to their existing spots.
 // No character involved with a required memory is moved.
 for(const id of ['village','tavern']){
  const z=zone(id),candidates=npcs.filter(n=>
    !n.clueId&&(n.kind==='wanderer'||n.kind==='thug')&&n.group&&
    Math.hypot(n.group.position.x-z.x,n.group.position.z-z.z)<z.r*.75);
  for(let i=0;i<Math.min(6,candidates.length);i++){
   const n=candidates[i],partner=i%2,angle=partner*Math.PI;
   n.danceAnchor={x:n.group.position.x,z:n.group.position.z,phase:Math.floor(i/2)*1.8+angle};
   n.danceStyle=id;
  }
 }
 // All 32 memories receive a tactile clue prop, in their exact original position.
 const clueProps=new Map();
 for(const clue of clues){
  const parent=new THREE.Group();parent.position.set(clue.x,0,clue.z);
  parent.name='Memory '+clue.id+' — '+clue.zone+' interactive keepsake';
  scene.add(parent);
  let prop;
  if(clue.zone==='tower'){
   prop=clue.id%2?makeBasket(parent,1.1,.6):makeEasel(parent,1.1,.6);
  }else if(clue.zone==='forest'){
   prop=makeLog(parent,1.1,.4);
  }else if(clue.zone==='tavern'){
   prop=put(parent,new THREE.CylinderGeometry(.38,.32,.62,10),wood,1,.52,.3);
  }else if(clue.zone==='cave'){
   prop=crystal(parent,1,1,.3,0x9d8ce1,.76);
  }else if(clue.zone==='village'){
   prop=put(parent,new THREE.CylinderGeometry(.76,.76,.14,9),gold,1,.28,.3);
  }else if(clue.zone==='castle'){
   prop=lantern(parent,1,1.1,.3);
  }else if(clue.zone==='dark'){
   prop=crystal(parent,1,1,.3,0xf5f5ff,.78);
  }else if(clue.zone==='sundrop'){
   prop=orb(parent,.6,material(0xf8d77c,0xfbd76c,1.5),1,1,.3);
  }else{
   prop=lantern(parent,1,1.2,.3);
  }
  if(prop){
    prop.userData.interact={kind:'clue',clue};
    hitMeshes.push(prop);
    clueProps.set(clue.id,{prop,parent,clue});
  }
 }
 let finaleActive=false,finaleTime=0;
 const texts={
  tower:'You add a golden brushstroke to Rapunzel’s painting.',
  forest:'The woodland creatures reveal a little hidden magic.',
  tavern:'The Snuggly Duckling raises a cheerful toast!',
  cave:'You tap the crystal. A secret shimmers within.',
  village:'The dancers spin faster as the kingdom celebrates you!',
  castle:'Make a wish beside the royal fountain.',
  dark:'A little light can shine through even the darkest stone.',
  sundrop:'The golden Sundrop blooms brighter at your touch.',
  lake:'One lantern rises with a wish for your next chapter.'
 };
 let activityCooldown=0;
 const interact=(target,ui)=>{
  if(activityCooldown>0)return;
  activityCooldown=1.8;
  ui.banner(texts[target.activity]||'A little magic awaits.');
  ui.chime();
  if(target.activity==='lake')startFinaleLanterns();
  if(target.activity==='sundrop'){const m=groups.get('sundrop');m.scale.y=1.02;}
 };
 function startFinaleLanterns(){finaleActive=true;finaleTime=0;lanternGroup.forEach(l=>{l.object.visible=true;l.object.position.set(l.startX,2,l.startZ);});}
 return{
  interact,startFinaleLanterns,
  clueProps,
  update(dt,t,player,activeClue){
   activityCooldown=Math.max(0,activityCooldown-dt);
   for(const m of waveMats)m.uniforms.uTime.value=t;
   for(const a of animated){
    if(a.mesh.material.uniforms?.uTime)a.mesh.material.uniforms.uTime.value=t;
    if(a.kind==='fog'){a.mesh.position.x+=Math.sin(t*.42+a.phase)*dt*.07;}
   }
   // Gently distinguish active keepsakes; all still at the same coordinates.
   for(const [id,item] of clueProps){
    const active=id===activeClue;
    if(item.prop.material?.emissive)item.prop.material.emissiveIntensity=active?.72:.14;
    if(active&&['cave','sundrop','dark'].includes(item.clue.zone))
      item.prop.rotation.y+=dt*.45;
   }
   if(finaleActive){
    finaleTime+=dt;
    for(const l of lanternGroup){
     l.object.position.y=2+Math.min(35,finaleTime*1.05)+Math.sin(t+l.phase)*.4;
     l.object.position.x=l.startX+Math.sin(t*.35+l.phase)*1.5;
     if(finaleTime>57)l.object.visible=false;
    }
    if(finaleTime>57)finaleActive=false;
   }
  }
 };
}
