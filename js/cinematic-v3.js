// V3 four-second real Three.js camera flight across the unmodified nine-pointed kingdom.
import * as THREE from 'three';
export function createCinematicV3({camera,player,onComplete,playMusic}){
 let active=false,seconds=0,finished=false,overlay=null;
 const finish=()=>{
   if(finished)return;finished=true;active=false;
   if(overlay){overlay.classList.add('v3-clouds-done');setTimeout(()=>overlay?.remove(),550);}
   player.camMode='third';
   player.lookSm=null;
   player.updateCamera(camera,.15);
   onComplete?.();
 };
 const begin=()=>{
   if(active||finished)return;
   if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){finish();return;}
   active=true;seconds=0;player.camMode='third';
   overlay=document.createElement('div');
   overlay.id='v3-cloud-opening';
   overlay.innerHTML='<div class="v3-cloud-bank left"></div><div class="v3-cloud-bank right"></div><div class="v3-cloud-glimmer"></div><p class="v3-cloud-title">Every fairytale begins with a little light…</p><button type="button" class="v3-cloud-skip">Skip intro</button>';
   document.body.appendChild(overlay);
   overlay.querySelector('.v3-cloud-skip').addEventListener('click',finish);
   requestAnimationFrame(()=>overlay?.classList.add('v3-cloud-parting'));
   playMusic?.();
   camera.position.set(0,325,115);
   camera.lookAt(0,0,0);
 };
 const ease=v=>v*v*(3-2*v);
 const update=dt=>{
   if(!active)return;
   seconds=Math.min(4,seconds+dt);
   const u=ease(seconds/4),p=player.group.position;
   const to=new THREE.Vector3(p.x,p.y+7.4,p.z+11);
   const from=new THREE.Vector3(0,325,115);
   camera.position.copy(from).lerp(to,u);
   // Arc gently from the sunlit overview toward her character and tower.
   camera.position.x+=Math.sin(u*Math.PI)*26;
   const aimFrom=new THREE.Vector3(0,0,0),aimTo=new THREE.Vector3(p.x,p.y+2.1,p.z-7);
   const aim=aimFrom.lerp(aimTo,ease(Math.min(1,(u+.1))));
   camera.lookAt(aim);
   if(seconds>=4)finish();
 };
 return{get active(){return active;},begin,update,finish};
}
