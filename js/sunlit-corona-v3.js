// Tangled-inspired fairytale COLOR AND LIGHTING pass — bright, warm, lush.
// Intentionally changes *only* visual appearance, never geometry, paths,
// star positions, clue positions, player movement, or photographs.
import * as THREE from 'three';

const palette={
  top:new THREE.Color(0x8dcff5),
  mid:new THREE.Color(0xc1e2fb),
  horizon:new THREE.Color(0xffdcb6),
  below:new THREE.Color(0xf9bb9d),
  forest:new THREE.Color(0x9ccd79),
  mist:new THREE.Color(0xe2e5ca),
  darkMist:new THREE.Color(0xbcbdd9)
};
function fixSky(scene){
  const sky=scene.children.find(o=>o.isMesh &&
    o.geometry?.type==='SphereGeometry' &&
    o.geometry.parameters.radius>=400 && o.material?.side===THREE.BackSide);
  if(!sky)return null;
  const position=sky.geometry.attributes.position;
  const color=sky.geometry.attributes.color;
  if(!color)return sky;
  const temp=new THREE.Color();
  for(let i=0;i<position.count;i++){
    const y=position.getY(i)/sky.geometry.parameters.radius;
    if(y>.26)temp.copy(palette.mid).lerp(palette.top,Math.min(1,(y-.26)/.74));
    else if(y>-.07)temp.copy(palette.horizon).lerp(palette.mid,(y+.07)/.33);
    else temp.copy(palette.horizon).lerp(palette.below,Math.min(1,(-y-.07)*3));
    color.setXYZ(i,temp.r,temp.g,temp.b);
  }
  color.needsUpdate=true;
  sky.material.color.set(0xffffff);
  return sky;
}
function restoreNature(scene){
  const original=new THREE.Color(),target=new THREE.Color();
  const earth=[0x75b954,0x88c865,0xa0cf70,0xbbd57a,0xd9bb78];
  scene.traverse(o=>{
    if(o.isInstancedMesh&&o.geometry?.type==='IcosahedronGeometry'&&o.instanceColor){
      const attr=o.instanceColor;
      for(let i=0;i<attr.count;i++){
        original.fromBufferAttribute(attr,i);
        const {h,s,l}=original.getHSL({});
        const leafHue=h<.15?0xdaa55d:earth[i%4];
        target.setHex(leafHue);
        target.lerp(original,.28);
        target.offsetHSL(0,.03,.08);
        attr.setXYZ(i,target.r,target.g,target.b);
      }
      attr.needsUpdate=true;
      o.castShadow=false;
      o.receiveShadow=false;
    }
    // The grass shouldn't look charred or Halloween-purple on mobile.
    if(o.name==='Filler grass'&&o.instanceColor){
      for(let i=0;i<o.instanceColor.count;i++){
        original.fromBufferAttribute(o.instanceColor,i);
        target.setHex(i%6===0?0xb6d581:i%3===0?0x7fbc59:0x6aae4d);
        target.lerp(original,.35);
        o.instanceColor.setXYZ(i,target.r,target.g,target.b);
      }
      o.instanceColor.needsUpdate=true;
      o.receiveShadow=false;
    }
    // The original ground's final mist edge was deep purple.
    if(o.geometry?.type==='PlaneGeometry'&&o.geometry.parameters.width>=400&&o.geometry.attributes.color){
      const a=o.geometry.attributes.color;
      for(let i=0;i<a.count;i++){
        original.fromBufferAttribute(a,i);
        const {h,s,l}=original.getHSL({});
        // Preserve sandy shores but replace very purple low-value terrain with greens.
        if(l<.34&&h>.64){
          target.setHex(0x94ba72);target.lerp(original,.1);
          a.setXYZ(i,target.r,target.g,target.b);
        }else if(h>.2&&h<.55){
          target.copy(original).lerp(new THREE.Color(0xa4c675),.18);
          a.setXYZ(i,target.r,target.g,target.b);
        }
      }
      a.needsUpdate=true;
      o.receiveShadow=false;
    }
    // Existing original sun illumination below is boosted; this reduces
    // those extremely black shadows on animal backs and dark tree bases.
    if(o.geometry?.type==='ConeGeometry'&&o.material?.color?.getHex()===0x242333){
      // Obsidian is the one zone intentionally kept shadowy.
      return;
    }
  });
}
export function createSunlitCoronaV3(scene,renderer,world){
  // The old grading was a purple dusk with cool fill that made everything look eerie.
  // Tangled's Corona should be golden-hour daylight with green bounce light.
  renderer.setClearColor(0xb9dcf0,1);
  renderer.toneMapping=THREE.NoToneMapping;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const sky=fixSky(scene);
  restoreNature(scene);
  scene.traverse(o=>{
    if(o.isHemisphereLight){
      o.color.setHex(0xfff0d7);
      o.groundColor.setHex(0x87b66a);
      o.intensity=2.6;
    }
    if(o.isDirectionalLight){
      o.color.setHex(0xffedc7);
      o.intensity=2.1;
      o.shadow.radius=4;
      o.shadow.normalBias=.08;
    }
  });
  // Broad soft daylight: characters and woodland creatures stay colorful in shade.
  const fill=new THREE.DirectionalLight(0xf2f7ff,1.05);
  fill.position.set(55,82,-45);
  fill.castShadow=false;
  scene.add(fill);
  const bounce=new THREE.AmbientLight(0xfff8e9,.58);
  scene.add(bounce);
  const originalFog=scene.fog;
  if(originalFog){
    originalFog.near=205;
    originalFog.far=735;
    originalFog.color.copy(palette.mist);
  }
  const sparkle=new THREE.PointLight(0xffe2b2,.55,19,2);
  sparkle.position.set(0,13,0);scene.add(sparkle);
  return{
    update(t,playerPos,zoneId){
      // world.update recolors fog and sky every frame. Restore the sunlit
      // art direction after that update without touching original world logic.
      if(sky)sky.material.color.set(0xffffff);
      const warm=zoneId==='dark'?palette.darkMist:palette.mist;
      if(scene.fog){
        scene.fog.color.copy(warm);
        scene.fog.near=zoneId==='dark'?140:205;
        scene.fog.far=zoneId==='dark'?470:735;
      }
      sparkle.position.set(playerPos.x+3,12,playerPos.z-4);
      sparkle.intensity=.48+Math.sin(t*.8)*.08;
    }
  };
}
