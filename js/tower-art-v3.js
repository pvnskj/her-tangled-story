// Art-directed facade around the ORIGINAL Rapunzel tower.
// Adds surface detail only: no edits to landmark coordinates, tower collision,
// roofs, door, nine-star layout, or player pathfinding.
import * as THREE from 'three';
import {ZONES} from './world-layout.js?v=20261018story';

function masonryTexture(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#beb2ce';ctx.fillRect(0,0,512,512);
 let seed=2367;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 for(let row=0;row<16;row++){
  const h=512/16,offset=row%2?22:0;
  for(let col=-1;col<9;col++){
   const x=col*67-offset,y=row*h;
   const v=~~(155+random()*63),r=v+7,g=v-6,b=v+21;
   ctx.fillStyle='rgb('+r+','+g+','+b+')';
   ctx.fillRect(x+2,y+2,63,h-4);
   ctx.fillStyle='rgba(255,247,219,.10)';ctx.fillRect(x+3,y+3,61,3);
   ctx.fillStyle='rgba(78,57,82,.15)';ctx.fillRect(x+4,y+h-5,61,3);
   if(random()>.68){ctx.strokeStyle='rgba(90,73,100,.13)';ctx.beginPath();
     ctx.moveTo(x+12,y+16);ctx.lineTo(x+19,y+23);ctx.lineTo(x+16,y+29);ctx.stroke();}
  }
 }
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=4;return tex;
}
function muralTexture(){
 const c=document.createElement('canvas');c.width=256;c.height=256;
 const ctx=c.getContext('2d');
 ctx.fillStyle='#9079ad';ctx.fillRect(0,0,256,256);
 ctx.fillStyle='#b59bcb';for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(30+i*33,70+Math.sin(i)*26,39,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#ffe5a2';ctx.beginPath();ctx.arc(178,75,36,0,Math.PI*2);ctx.fill();
 for(let i=0;i<9;i++){let a=i*Math.PI*2/9;ctx.save();ctx.translate(178,75);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-6,-42);ctx.lineTo(0,-60);ctx.lineTo(6,-42);ctx.fill();ctx.restore();}
 ctx.strokeStyle='#5a865b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(45,256);ctx.bezierCurveTo(50,175,95,165,85,88);
 ctx.moveTo(160,256);ctx.bezierCurveTo(185,190,112,154,129,111);ctx.stroke();
 for(const [x,y,color] of [[85,88,'#f4cf70'],[129,113,'#fff5cb'],[58,154,'#edd3ed'],[164,173,'#f2d48e']]){
  ctx.fillStyle=color;for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.arc(x+Math.cos(a)*10,y+Math.sin(a)*10,10,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#fff9e6';ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();
 }
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const stoneMat=new THREE.MeshStandardMaterial({map:masonryTexture(),roughness:.94,metalness:0,transparent:true,opacity:.94});
const vineMat=new THREE.MeshStandardMaterial({color:0x517441,roughness:.9});
const leafMat=new THREE.MeshStandardMaterial({color:0x6c954c,roughness:.85,side:THREE.DoubleSide});
const woodMat=new THREE.MeshStandardMaterial({color:0x74513e,roughness:.85});
const gilded=new THREE.MeshStandardMaterial({color:0xddb46c,metalness:.37,roughness:.43});
const goldHair=new THREE.MeshStandardMaterial({color:0xfce19a,emissive:0xe8ad48,emissiveIntensity:.65,roughness:.44});
function mesh(g,geometry,material,x=0,y=0,z=0){
 const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);g.add(m);return m;
}
function ring(g,r,y,material,tube=.16){
 const m=mesh(g,new THREE.TorusGeometry(r,tube,7,48),material,0,y,0);
 m.rotation.x=Math.PI/2;return m;
}
export function createTowerArtV3(scene){
 const tower=ZONES.find(z=>z.id==='tower');
 const group=new THREE.Group();group.position.set(tower.x,0,tower.z);
 group.name='V3 tower art — added around original landmark';scene.add(group);
 // A partial stone facade stays above the original entrance door.
 mesh(group,new THREE.CylinderGeometry(5.17,5.83,13.8,32,18,true),stoneMat,0,11.1,0);
 mesh(group,new THREE.CylinderGeometry(6.29,6.29,4.95,32,8,true),stoneMat,0,20,0);
 for(const [r,y] of [[5.82,4.2],[5.50,9],[5.33,14],[5.12,17.9],[6.45,22.25]])
   ring(group,r,y,gilded,.065);
 // Painted canvases: golden sunflowers on the front wall where she first approaches.
 const paintMat=new THREE.MeshStandardMaterial({map:muralTexture(),roughness:.88,emissive:0x342346,emissiveIntensity:.1});
 for(const [x,y,w,h] of [[-2.3,8.0,3.1,3.4],[2.35,13.2,2.7,3.1]]){
  const panel=mesh(group,new THREE.PlaneGeometry(w,h),paintMat,x,y,6.10);
  panel.rotation.y=x<0?-.12:.12;
  for(const shift of [-1,1])mesh(group,new THREE.BoxGeometry(.085,h+.1,.09),woodMat,x+shift*w/2,y,6.17);
  mesh(group,new THREE.BoxGeometry(w,.08,.12),woodMat,x,y+h/2,6.17);
 }
 // Stone arch around her glowing upper window, preserving the existing window light.
 for(const x of [-1.12,1.12])mesh(group,new THREE.BoxGeometry(.19,2.8,.15),woodMat,x,20,6.39);
 for(const y of [18.6,21.4])mesh(group,new THREE.BoxGeometry(2.45,.19,.15),woodMat,0,y,6.39);
 mesh(group,new THREE.BoxGeometry(.08,2.7,.13),gilded,0,20,6.48);
 // Three ivy vines spiral along the original cylindrical wall.
 const leafGeo=new THREE.SphereGeometry(.20,7,5);
 for(let strand=0;strand<3;strand++){
  const pts=[],phase=strand*Math.PI*2/3;
  for(let j=0;j<38;j++){
   const y=.7+j*.43,a=phase+j*.235,r=6.13-(y/18)*.80;
   pts.push(new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r));
  }
  const stem=mesh(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),85,.065,5,false),vineMat);
  for(let i=1;i<pts.length;i+=2){
   const p=pts[i],leaf=mesh(group,leafGeo,leafMat,p.x,p.y,p.z);
   leaf.scale.set(.65,.33,1.5);leaf.rotation.y=(phase+i*.235);
   if(i%5===0){const goldFlower=mesh(group,new THREE.SphereGeometry(.14,7,6),goldHair,p.x,p.y+.13,p.z);goldFlower.scale.set(1,.35,1);}
  }
 }
 // Small balcony ring above the original tower room.
 ring(group,7.05,22.6,woodMat,.36);
 ring(group,7.1,23.95,gilded,.13);
 for(let i=0;i<30;i++){
  const a=i*Math.PI*2/30;
  mesh(group,new THREE.CylinderGeometry(.075,.085,1.30,6),woodMat,Math.sin(a)*7.08,23.28,Math.cos(a)*7.08);
 }
 // Detailed trim follows the original conical roof; roof itself stays untouched.
 for(const [y,r] of [[23.2,6.90],[24.6,5.55],[26.1,3.94],[27.6,2.25]])
   ring(group,r,y,woodMat,.065);
 // Characteristic long golden hair flows from the upper window to the flower garden.
 const braidPts=[
  [0,20.7,6.55],[.2,18.5,7.15],[.5,15.0,6.78],
  [.9,11.6,7.3],[1.3,8.4,7.7],[1.1,5.1,8.3],[2.1,2,9.8],[3.3,.5,9.8]
 ];
 for(let strand=0;strand<3;strand++){
  const pts=braidPts.map(([x,y,z],i)=>new THREE.Vector3(x+strand*.14-.14,y+Math.sin(i*.7+strand)*.12,z+strand*.1));
  const hair=mesh(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),70,.10,8,false),goldHair);
 }
 // Castle-like warm lanterns on the small tower balcony.
 const light=new THREE.PointLight(0xffc379,1.0,21,2);light.position.set(0,22,7);group.add(light);
 // Crown of flowers: glow spilling near the tower's winding stair.
 for(let i=0;i<25;i++){
   const a=i*2.399,r=8+Math.sqrt(i/25)*4;
   const x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(z>6&&Math.abs(x)<2)continue; // keep the visible staircase clear.
   const bloom=mesh(group,new THREE.SphereGeometry(.21,7,6),goldHair,x,.37,z);
   bloom.scale.set(1.2,.38,1.2);
 }
 return{update(t){goldHair.emissiveIntensity=.47+Math.sin(t*1.7)*.24;}};
}
