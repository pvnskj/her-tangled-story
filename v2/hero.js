import * as T from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {phase, mix, ROOM_Y} from './timeline.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export async function loadHero(scene) {
  const gltf=await new GLTFLoader().loadAsync(new URL('./assets/story-hero.glb',import.meta.url).href);
  return createHero(scene,gltf);
}
export function createHero(scene,gltf) {
  const group=gltf.scene;scene.add(group);const bones={};const eyeMeshes=[];
  group.traverse(o=>{if(o.isBone)bones[o.name]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;if(/Eye|Iris|Pupil|Catchlight/.test(o.name))eyeMeshes.push(o);}});
  const mixer=new T.AnimationMixer(group),actions={};for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
  actions.Landing.setLoop(T.LoopOnce,1);actions.Landing.clampWhenFinished=true;
  let current;const play=(name)=>{if(current===name)return;actions[current]?.fadeOut(.25);actions[name].reset().fadeIn(.25).play();current=name;};play('Idle');
  // Two bone analytical IK: the palms track the same world-space braid used by rendering.
  function grip(side,target) {
    group.updateMatrixWorld(true);
    const upper=bones['UpperArm'+side],lower=bones['Forearm'+side];
    const shoulder=upper.getWorldPosition(V()),reach=target.clone().sub(shoulder),d=Math.min(.548,reach.length()),dir=reach.normalize();
    const a=.29,b=.27,along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
    const bend=V(side==='L'?-.8:.8,.2,.7).applyQuaternion(group.quaternion);
    bend.addScaledVector(dir,-bend.dot(dir)).normalize();
    const elbow=shoulder.clone().addScaledVector(dir,along).addScaledVector(bend,height);
    const parentQ=upper.parent.getWorldQuaternion(new T.Quaternion()).invert();
    upper.quaternion.setFromUnitVectors(V(0,-1,0),elbow.clone().sub(shoulder).normalize().applyQuaternion(parentQ));
    group.updateMatrixWorld(true);
    const q=upper.getWorldQuaternion(new T.Quaternion()).invert();
    lower.quaternion.setFromUnitVectors(V(0,-1,0),target.clone().sub(elbow).normalize().applyQuaternion(q));
  }
  return {group,bones,mixer,play,update(dt,{pose='idle',time=0,moving=false,speed=0}={}) {
    const clip=pose==='gather'?'Gather':pose==='slide'||pose==='climb'?'Descent':pose==='land'?'Landing':pose==='wave'?'Wave':moving?'Walk':'Idle';play(clip);
    actions.Walk.timeScale=Math.max(.5,speed/1.8);actions.Idle.timeScale=.38;mixer.update(dt);
    if(pose==='slide'||(pose==='climb'&&time>=20.5)) {
      const p=group.position;
      // Both shoulder offsets stay within the articulated arm reach.
      grip('L',V(.02,p.y+1.25,p.z-.32));grip('R',V(.08,p.y+1.47,p.z-.34));
      for(const side of ['L','R']) {
        const wallZ=3.35-Math.min(18,p.y)*.017;
        const forward=p.z-wallZ-.10,down=.55;const d=Math.min(.695,Math.hypot(forward,down));
        const knee=Math.PI-Math.acos(T.MathUtils.clamp((.36**2+.34**2-d*d)/(2*.36*.34),-1,1));
        const alpha=Math.acos(T.MathUtils.clamp((.36**2+d*d-.34**2)/(2*.36*d),-1,1));
        bones['Thigh'+side].rotation.x=-Math.atan2(forward,down)-alpha;
        bones['Shin'+side].rotation.x=knee;
      }
    }
    if(pose==='idle')bones.Head.rotation.y+=Math.sin(time*.55)*.09;
    // Blink: every few seconds, squash the eye meshes briefly. This alone kills the doll-stare.
    const blinkPhase=time%4.2;
    const blinkAmt=blinkPhase<.12?Math.sin(blinkPhase/.12*Math.PI):0;
    for(const m of eyeMeshes)m.scale.y=m.userData.baseScaleY??(m.userData.baseScaleY=m.scale.y),m.scale.y=m.userData.baseScaleY*(1-blinkAmt*.88);
  }};
}
export class Braid {
  constructor(scene) {
    this.count=120;this.radial=6;this.points=[];this.strands=[];this.head=V();this.tip=V();
    for(let k=0;k<3;k++) {
      const g=new T.BufferGeometry(),p=new Float32Array((this.count+1)*(this.radial+1)*3),idx=[];
      for(let i=0;i<this.count;i++)for(let j=0;j<this.radial;j++){const a=i*(this.radial+1)+j;idx.push(a,a+1,a+this.radial+1,a+1,a+this.radial+2,a+this.radial+1);}
      g.setAttribute('position',new T.BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));g.setIndex(idx);
      const m=new T.Mesh(g,new T.MeshStandardMaterial({color:[0xe6b747,0xf7d77b,0xc58b31][k],roughness:.5,metalness:.13}));m.castShadow=true;m.frustumCulled=false;scene.add(m);this.strands.push(m);
    }
  }
  update(hero,t,opening=true) {
    hero.group.updateMatrixWorld(true);this.head.copy(hero.bones.Head.getWorldPosition(V())).add(V(0,.02,-.18).applyQuaternion(hero.group.quaternion));
    const p=hero.group.position,release=opening?phase(t,30,34):1,drop=phase(t,13,19);
    const behind=V(0,0,-1).applyQuaternion(hero.group.quaternion);
    const trail=[this.head.clone(),p.clone().addScaledVector(behind,.4).add(V(0,1,0)),p.clone().addScaledVector(behind,.9).add(V(0,.15,0)),p.clone().addScaledVector(behind,2).add(V(.4,.08,0)),p.clone().addScaledVector(behind,3).add(V(.7,.08,0)),p.clone().addScaledVector(behind,3.7).add(V(.1,.08,0))];
    let points;
    const floorPoints=[this.head.clone(),V(-.6,18.8,1),V(-1.1,18.1,.7),V(-1.8,18.08,.2),V(-1.8,18.08,-1.3),V(-.4,18.08,-1.5)];
    if(opening && t<10) points=floorPoints;
    else if(release<1){
      const end=mix(18.05,.09,drop);
      points=[this.head.clone(),V(-.55,19.9,2),V(-.7,19.45,2.45),V(-.85,19.43,2.64),V(-1.03,19.4,2.45),V(-.85,19.34,2.27),V(-.68,19.3,2.45),V(-.45,19.2,3.25),V(.02,18.8,3.23),V(.02,mix(18.8,end,.5),mix(3.23,3.53,drop*.5)),V(.02,end,mix(3.23,3.53,drop))];
      if(t<13){const a=new T.CatmullRomCurve3(floorPoints),b=new T.CatmullRomCurve3(points);points=Array.from({length:18},(_,i)=>a.getPoint(i/17).lerp(b.getPoint(i/17),phase(t,10,13)));}
      if(release>0){const c=new T.CatmullRomCurve3(points);points=trail.map((v,i)=>c.getPoint(i/(trail.length-1)).lerp(v,release));}
    } else points=trail;
    if(release>0 && t<37 && opening)for(let i=2;i<points.length;i++){const swirl=Math.sin(phase(t,31,37)*Math.PI)*.7;points[i].x+=Math.sin(t*2+i)*swirl;points[i].z+=Math.cos(t*2+i)*swirl;}
    const curve=new T.CatmullRomCurve3(points,false,'centripetal');
    this.tip.copy(points.at(-1));
    for(let i=0;i<=this.count;i++) {
      const u=i/this.count,c=curve.getPoint(u),dir=curve.getTangent(u).normalize();
      const n=V(1,0,0).addScaledVector(dir,-dir.x).normalize(),b=new T.Vector3().crossVectors(dir,n).normalize();
      if(opening&&t>=13&&t<30&&u>.6)c.x+=Math.sin(t*2+u*8)*.04*Math.sin(u*Math.PI);
      for(let k=0;k<3;k++){const a=u*Math.PI*42+k*Math.PI*2/3,center=c.clone().addScaledVector(n,Math.cos(a)*.037).addScaledVector(b,Math.sin(a)*.037),arr=this.strands[k].geometry.attributes.position;
        for(let j=0;j<=this.radial;j++){const phi=j/this.radial*Math.PI*2,r=.036*(1-.65*Math.pow(u,10));const q=center.clone().addScaledVector(n,Math.cos(phi)*r).addScaledVector(b,Math.sin(phi)*r);arr.setXYZ(i*(this.radial+1)+j,q.x,q.y,q.z);}}
    }
    for(const s of this.strands){s.geometry.attributes.position.needsUpdate=true;s.geometry.computeVertexNormals();}
  }
}
