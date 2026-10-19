// V3 motion pass: grass separates as the heroine walks, wind moves its tips,
// drifting petals pass through the village. Does not change pathfinding geometry.
import * as THREE from 'three';
import {ZONES} from './world-layout.js?v=20261018story';

export function createNatureMotionV3(scene,player){
 const grass=scene.children.find(o=>o.name==='Filler grass');
 const uniforms={uHeroXZ:{value:new THREE.Vector2()},uTime:{value:0}};
 if(grass?.material){
  grass.material.onBeforeCompile=shader=>{
   shader.uniforms.uHeroXZ=uniforms.uHeroXZ;
   shader.uniforms.uTime=uniforms.uTime;
   shader.vertexShader='uniform vec2 uHeroXZ; uniform float uTime;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
    #include <begin_vertex>
    #ifdef USE_INSTANCING
    vec3 instancePos=(instanceMatrix*vec4(position,1.0)).xyz;
    float distanceToHero=length(instancePos.xz-uHeroXZ);
    float part=(1.0-smoothstep(1.1,4.3,distanceToHero))*max(0.0,position.y);
    vec2 dir=normalize(instancePos.xz-uHeroXZ+vec2(.0001));
    transformed.xz+=dir*part*.65;
    transformed.x+=sin(uTime*2.1+instancePos.x*.36+instancePos.z*.24)*position.y*.10;
    #endif
   `);
  };
  grass.material.customProgramCacheKey=()=>'v3-living-grass';
  grass.material.needsUpdate=true;
 }
 const village=ZONES.find(z=>z.id==='village');
 const num=/iPhone|iPad|Android/i.test(navigator.userAgent)?85:200;
 const pos=new Float32Array(num*3),start=new Float32Array(num*3),phase=new Float32Array(num);
 let seed=8310;
 const rng=()=>((seed=1664525*seed+1013904223>>>0)/4294967296);
 for(let i=0;i<num;i++){
  const a=rng()*Math.PI*2,r=4+rng()*27;
  start[i*3]=village.x+Math.cos(a)*r;
  start[i*3+1]=1+rng()*4;
  start[i*3+2]=village.z+Math.sin(a)*r;
  phase[i]=rng()*6.28;
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const petals=new THREE.Points(geo,new THREE.PointsMaterial({
  color:0xf2a7c8,size:.37,transparent:true,opacity:.72,
  depthWrite:false,blending:THREE.AdditiveBlending
 }));
 petals.name='Corona floating flower petals';
 petals.frustumCulled=false;scene.add(petals);
 return {
  update(dt,t){
   const p=player.group.position;
   uniforms.uHeroXZ.value.set(p.x,p.z);uniforms.uTime.value=t;
   const close=Math.hypot(p.x-village.x,p.z-village.z)<65;
   for(let i=0;i<num;i++){
    const j=i*3;
    pos[j]=start[j]+Math.sin(t*.65+phase[i])*2.3;
    pos[j+1]=close?(.3+(start[j+1]+t*.35+phase[i])%5.5):-10000;
    pos[j+2]=start[j+2]+Math.sin(t*.8+phase[i]*1.3)*1.3;
   }
   geo.attributes.position.needsUpdate=true;
  }
 };
}
