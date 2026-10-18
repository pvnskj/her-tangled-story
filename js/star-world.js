import * as THREE from 'three';
import {buildWorld as buildOriginalWorld} from './world.js?v=20261018story';
import {Navigation} from './navigation.js?v=20261018story';
import {ZONES,WORLD_BOUND,PATHS,STAR_VERTICES,offsetFor,movePoint,sourceZone,segmentDistance} from './world-layout.js?v=20261018story';
export {ZONES};

export function buildWorld(scene){
 const world=buildOriginalWorld(scene);
 world.update(0,0); // Initialize animated instance/particle positions before relocating them.
 const oldChildren=[...scene.children],pointBatches=[],treeShifts=new Map(),clearedTrees=new Map(),clearedTrunks=[];
 const regionGroups=new Map();
 const parentFor=id=>{if(!regionGroups.has(id)){const group=new THREE.Group(),d=offsetFor(id);group.position.set(d.x,0,d.z);group.name=`${id} scenery`;scene.add(group);regionGroups.set(id,group);}return regionGroups.get(id);};
 const matrix=new THREE.Matrix4(),shifted=new THREE.Matrix4(),pos=new THREE.Vector3();
 for(const object of oldChildren){
  if(object.name==='Brown connecting path'){scene.remove(object);continue;}
  if((object.isLight&&!object.isPointLight)||object.isCamera||object===world.sun.target)continue;
  if(object.isSprite&&object.material.fog===false)continue;
  if(object.isGroup&&object.position.x===-20&&object.position.z===70){object.userData.castHorse=true;const d=offsetFor('village');object.position.x+=d.x;object.position.z+=d.z;continue;}
  const geo=object.geometry;
  if(geo?.type==='PlaneGeometry'&&geo.parameters.width>=400){object.scale.set(1.5,1,1.5);continue;}
  if(geo?.type==='CylinderGeometry'&&geo.parameters.radiusTop>=300){object.scale.set(1.5,1,1.5);continue;}
  if(geo?.type==='SphereGeometry'&&geo.parameters.radius>300)continue;
  if(object.isPoints&&object.material.sizeAttenuation===false)continue;
  if(object===world.boat.group){const d=offsetFor('lake');object.position.x+=d.x;object.position.z+=d.z;continue;}
  if(object.isInstancedMesh){
   const shifts=[];
   const trunk=geo.type==='CylinderGeometry'&&geo.parameters.radiusTop===.45;
   if(trunk)clearedTrees.set(object.count,new Set());
   for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);pos.setFromMatrixPosition(matrix);const d=(geo.type==='IcosahedronGeometry'&&treeShifts.get(object.count)?.[i])||offsetFor(object.userData.region||sourceZone(pos.x,pos.z));shifts.push(d);matrix.elements[12]+=d.x;matrix.elements[14]+=d.z;
    if(trunk&&PATHS.some(p=>segmentDistance(matrix.elements[12],matrix.elements[14],p)<2.2+.65*Math.hypot(matrix.elements[0],matrix.elements[1],matrix.elements[2]))){clearedTrees.get(object.count).add(i);clearedTrunks.push({x:matrix.elements[12],z:matrix.elements[14]});}
    if((trunk||geo.type==='IcosahedronGeometry')&&clearedTrees.get(object.count)?.has(i))matrix.scale(new THREE.Vector3(0,0,0));
    object.setMatrixAt(i,matrix);}
   if(geo.type==='CylinderGeometry'&&geo.parameters.radiusTop===.45)treeShifts.set(object.count,shifts);
   const set=object.setMatrixAt.bind(object),dynamic=object.material.fog===false;
   object.setMatrixAt=(i,m)=>{shifted.copy(m);const d=dynamic?offsetFor(sourceZone(m.elements[12],m.elements[14])):shifts[i];if(d){shifted.elements[12]+=d.x;shifted.elements[14]+=d.z;}if((trunk||geo.type==='IcosahedronGeometry')&&clearedTrees.get(object.count)?.has(i))shifted.scale(new THREE.Vector3(0,0,0));set(i,shifted);};
   object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();object.frustumCulled=false;
   continue;
  }
  if(object.isPoints){
   const attribute=geo.attributes.position,shifts=[];
   for(let i=0;i<attribute.count;i++){const d=offsetFor(object.material.size===.35?'festival':sourceZone(attribute.getX(i),attribute.getZ(i)));shifts.push(d);attribute.setX(i,attribute.getX(i)+d.x);attribute.setZ(i,attribute.getZ(i)+d.z);}
   pointBatches.push({attribute,shifts,dynamic:object.material.size===6.5});object.frustumCulled=false;attribute.needsUpdate=true;continue;
  }
  pos.copy(object.position);
  if(geo&&pos.x===0&&pos.z===0){geo.computeBoundingBox();geo.boundingBox.getCenter(pos);}
  const id=object.userData.region||sourceZone(pos.x,pos.z);
  parentFor(id).add(object);
 }
 const transform=(item,id=item.region||sourceZone(item.x,item.z))=>movePoint(id,item);
 world.colliders=world.colliders.map(c=>transform(c)).filter(c=>!clearedTrunks.some(t=>Math.hypot(c.x-t.x,c.z-t.z)<.15));
 // Include every visible tree trunk in navigation, including decorative trees
 // that did not need collision on the previous road layout.
 for(const object of oldChildren){
  if(!object.isInstancedMesh||object.geometry.type!=='CylinderGeometry'||object.geometry.parameters.radiusTop!==.45)continue;
  for(let i=0;i<object.count;i++){
   object.getMatrixAt(i,matrix);const e=matrix.elements,scale=Math.hypot(e[0],e[1],e[2]);
   if(scale>.001&&!world.colliders.some(c=>Math.hypot(c.x-e[12],c.z-e[14])<.05))world.colliders.push({x:e[12],z:e[14],r:.65*scale});
  }
 }
 world.waters=world.waters.map((w,i)=>transform(w,w.region||(i===0?'lake':'forest')));
 const lakeShift=offsetFor('lake'),d=world.dockRect;
 world.dockRect={x0:d.x0+lakeShift.x,x1:d.x1+lakeShift.x,z0:d.z0+lakeShift.z,z1:d.z1+lakeShift.z};
 world.boatPark=movePoint('lake',{x:-50,z:20});
 world.boat.group.position.set(world.boatPark.x,.35,world.boatPark.z);
 world.dryIslands=world.dryIslands.map(i=>transform(i,'castle'));
 world.bridges=world.bridges.map(([ax,az,bx,bz])=>{const a=movePoint('castle',{x:ax,z:az}),b=movePoint('castle',{x:bx,z:bz});return[a.x,a.z,b.x,b.z];});
 world.bound=WORLD_BOUND;world.zones=ZONES;world.festival=null;world.paths=PATHS.map(p=>[...p]);
 world.zoneAt=(x,z)=>ZONES.reduce((best,p)=>{const d=Math.hypot(x-p.x,z-p.z);return d<p.r&&(!best||d<best.distance)?{...p,distance:d}:best;},null);
 // Route each star tip to its entrance around the existing scenery. Paint every
 // approach as brown road, so travel never follows an invisible shortcut.
 class RoadNavigation extends Navigation {canWalk(x,z,clearance=2){return super.canWalk(x,z,Math.max(2,clearance));}}
 const planner=new RoadNavigation(world,WORLD_BOUND);
 for(let i=0;i<ZONES.length;i++){
  const tip=STAR_VERTICES[i*2],entry=ZONES[i].entry;
  const path=planner.findRoute(tip,{...entry,radius:1.1});
  if(!path)throw new Error(`No entrance path for ${ZONES[i].id}`);
  const points=[tip,...path,entry],route=[tip];
  for(let at=0;at<points.length-1;){let next=points.length-1;while(next>at+1&&!planner.segmentClear(points[at],points[next],2))next--;route.push(points[next]);at=next;}
  for(let j=1;j<route.length;j++){const a=route[j-1],b=route[j];if(Math.hypot(a.x-b.x,a.z-b.z)>.01)world.paths.push([a.x,a.z,b.x,b.z]);}
 }
 const roadMaterial=new THREE.MeshStandardMaterial({color:0x9a8563,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 for(const path of world.paths){const [ax,az,bx,bz]=path,m=new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(bx-ax,bz-az),3.6),roadMaterial);m.rotation.x=-Math.PI/2;m.rotation.z=-Math.atan2(bz-az,bx-ax);m.position.set((ax+bx)/2,.08,(az+bz)/2);m.name='Brown connecting path';m.userData.pathSegment=path;scene.add(m);}
 // Clear low meadow instances from the newly rendered road; keep buildings intact.
 for(const object of oldChildren){if(!object.isInstancedMesh||object.geometry.type==='CylinderGeometry'||object.geometry.type==='IcosahedronGeometry')continue;
  for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);pos.setFromMatrixPosition(matrix);if(pos.y>.8||!world.paths.some(p=>segmentDistance(pos.x,pos.z,p)<2.2))continue;
   // Use the underlying instance buffer directly: these matrices are already relocated.
   matrix.scale(new THREE.Vector3(0,0,0));matrix.toArray(object.instanceMatrix.array,i*16);
  }object.instanceMatrix.needsUpdate=true;
 }
 const updateOriginal=world.update;
 world.update=(dt,t,px,pz)=>{
  for(const {attribute,shifts} of pointBatches)for(let i=0;i<shifts.length;i++){attribute.array[i*3]-=shifts[i].x;attribute.array[i*3+2]-=shifts[i].z;}
  const place=world.zoneAt(px,pz),d=place?offsetFor(place.id):{x:0,z:0};
  updateOriginal(dt,t,px-d.x,pz-d.z);
  for(const {attribute,shifts,dynamic} of pointBatches){for(let i=0;i<shifts.length;i++){if(dynamic)shifts[i]=offsetFor(sourceZone(attribute.array[i*3],attribute.array[i*3+2]));attribute.array[i*3]+=shifts[i].x;attribute.array[i*3+2]+=shifts[i].z;}attribute.needsUpdate=true;}
 };
 world.regionGroups=regionGroups;
 return world;
}
