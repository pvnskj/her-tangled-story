// Festive fairy lights and Sundrop spores. Purely decorative and mobile-aware.
// Zones and physical collision/navigation stay exactly as before.
import * as THREE from 'three';
import {ZONES} from './world-layout.js?v=20261018story';
export function createFestivalAtmosphereV3(scene){
 const find=id=>ZONES.find(z=>z.id===id);
 const strings=[],bulbs=[],points=[];
 const warm=[0xffd998,0xffe9c0,0xf7b877];
 function stringLights(id,from,to,n=12){
  const z=find(id),g=new THREE.Group();g.position.set(z.x,0,z.z);
  g.name='V3 '+id+' fairy light garland';scene.add(g);
  const curve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(...from),
   new THREE.Vector3((from[0]+to[0])/2,(from[1]+to[1])/2-.85,(from[2]+to[2])/2),
   new THREE.Vector3(...to)
  ]);
  g.add(new THREE.Line(
   new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)),
   new THREE.LineBasicMaterial({color:0x66536f})));
  for(let i=0;i<n;i++){
   const p=curve.getPoint((i+.5)/n);
   const mat=new THREE.MeshBasicMaterial({color:warm[i%warm.length],transparent:true,opacity:.76});
   const bulb=new THREE.Mesh(new THREE.SphereGeometry(.15,7,6),mat);
   bulb.position.copy(p);bulb.name='Corona lantern-string bulb';g.add(bulb);
   const glow=new THREE.Sprite(new THREE.SpriteMaterial({
    color:warm[i%warm.length],transparent:true,opacity:.15,
    blending:THREE.AdditiveBlending,depthWrite:false
   }));
   glow.position.copy(p);glow.scale.set(1.35,1.35,1);g.add(glow);
   bulbs.push({bulb,glow,phase:i*.73});
   if(i===3||i===n-4){
    const light=new THREE.PointLight(warm[i%warm.length],.5,8,2);
    light.position.copy(p);g.add(light);points.push(light);
   }
  }
  strings.push(g);
 }
 stringLights('tavern',[-18,7,-9],[17,6,10],11);
 stringLights('tavern',[-10,7,15],[14,6,-13],11);
 stringLights('village',[-18,9,-10],[19,8,5],14);
 stringLights('village',[-14,8,17],[17,8,-15],14);
 stringLights('castle',[-13,8,-11],[13,8,11],10);

 // Rising glitter spores, densest where the magical Sundrop grows.
 const sundrop=find('sundrop'),mobile=/iPhone|iPad|Android/i.test(navigator.userAgent);
 const n=mobile?220:520,coords=new Float32Array(n*3),base=new Float32Array(n*3),phase=new Float32Array(n);
 let seed=78134;const rng=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 for(let i=0;i<n;i++){
  const a=rng()*Math.PI*2,r=Math.sqrt(rng())*30;
  base[i*3]=sundrop.x+Math.cos(a)*r;
  base[i*3+1]=rng()*8;
  base[i*3+2]=sundrop.z+Math.sin(a)*r;
  phase[i]=rng()*6.28;
 }
 const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
 const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(16,16,1,16,16,16);
 grad.addColorStop(0,'rgba(255,250,197,1)');grad.addColorStop(.4,'rgba(255,206,107,.9)');grad.addColorStop(1,'rgba(255,206,107,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,32,32);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(coords,3));
 const motes=new THREE.Points(geometry,new THREE.PointsMaterial({
  map:tex,color:0xffd983,transparent:true,opacity:.83,size:1.1,
  depthWrite:false,blending:THREE.AdditiveBlending
 }));
 motes.frustumCulled=false;motes.name='Sundrop rising magic spores';scene.add(motes);
 let boost=0;
 return{
  celebrate(zone){if(['tavern','village','castle','sundrop','lake'].includes(zone))boost=2;},
  update(dt,t,playerPos){
   boost=Math.max(0,boost-dt);
   const twinkle=1+Math.sin(t*2.3)*.12;
   for(const b of bulbs){
    const bright=.70+.27*Math.sin(t*1.5+b.phase)+(boost>0?.2:0);
    b.bulb.material.opacity=Math.min(1,bright);
    b.glow.material.opacity=Math.min(.4,.13+bright*.12);
    b.glow.scale.setScalar((1.1+bright*.2)*twinkle);
   }
   for(let i=0;i<points.length;i++)points[i].intensity=.35+Math.sin(t*1.4+i)*.13;
   const near=Math.hypot(playerPos.x-sundrop.x,playerPos.z-sundrop.z)<68;
   for(let i=0;i<n;i++){
    const k=i*3;
    coords[k]=base[k]+Math.sin(t*.51+phase[i])*1.05;
    coords[k+1]=near?((base[k+1]+t*.68+phase[i])%9.5)+.2:-10000;
    coords[k+2]=base[k+2]+Math.cos(t*.5+phase[i])*1.0;
   }
   geometry.attributes.position.needsUpdate=true;
  }
 };
}
