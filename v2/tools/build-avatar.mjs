// Original authored geometry and rig. Reproducible, no third-party character asset.
import * as T from 'three';
import {GLTFExporter} from '../vendor/exporters/GLTFExporter.js';
import {writeFile} from 'node:fs/promises';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(x=>{this.result='data:application/octet-stream;base64,'+Buffer.from(x).toString('base64');this.onloadend?.();});}};
const root=new T.Group();root.name='StoryHero';
const bones=[], ids={};
function bone(name,parent,x,y,z){const b=new T.Bone();b.name=name;b.position.set(x,y,z);(parent?bones[ids[parent]]:root).add(b);ids[name]=bones.length;bones.push(b);return b;}
bone('Hips',null,0,.79,0);bone('Spine','Hips',0,.27,0);bone('Chest','Spine',0,.25,0);bone('Neck','Chest',0,.13,0);bone('Head','Neck',0,.16,0);
for(const [side,s] of [['L',-1],['R',1]]) {bone('UpperArm'+side,'Chest',s*.245,-.005,0);bone('Forearm'+side,'UpperArm'+side,0,-.29,0);bone('Hand'+side,'Forearm'+side,0,-.27,0);bone('Thigh'+side,'Hips',s*.13,-.02,0);bone('Shin'+side,'Thigh'+side,0,-.36,0);bone('Foot'+side,'Shin'+side,0,-.34,.06);}
bone('Skirt','Hips',0,-.08,0);
root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones);
const mats={skin:new T.MeshStandardMaterial({color:0xe8b18b,roughness:.75}),purple:new T.MeshStandardMaterial({color:0x784999,roughness:.85}),pink:new T.MeshStandardMaterial({color:0xbe85b7,roughness:.85}),gold:new T.MeshStandardMaterial({color:0xeac15b,roughness:.48,metalness:.08}),white:new T.MeshStandardMaterial({color:0xfff1d9}),iris:new T.MeshStandardMaterial({color:0x486745}),pupil:new T.MeshStandardMaterial({color:0x201827}),lip:new T.MeshStandardMaterial({color:0xa95056}),shoe:new T.MeshStandardMaterial({color:0x876047}),trim:new T.MeshStandardMaterial({color:0xe2b971,metalness:.25,roughness:.5})};
function part(name,g,mat,bname,pos,scale=[1,1,1],rot=[0,0,0]) {g.scale(...scale);g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...pos);
 const n=g.attributes.position.count,ind=[],weights=[];for(let i=0;i<n;i++){ind.push(ids[bname],0,0,0);weights.push(1,0,0,0);}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ind,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));const mesh=new T.SkinnedMesh(g,mats[mat]);mesh.name=name;root.add(mesh);mesh.bind(skeleton);return mesh;}
const ball=(name,mat,b,pos,scale)=>part(name,new T.SphereGeometry(1,24,16),mat,b,pos,scale);
// The dress is a shaped, pleated surface with a scalloped hem, not a cone.
function skirt(){let p=[],idx=[],uv=[],n=64,rows=20;for(let j=0;j<=rows;j++){const t=j/rows,y=.10+t*.89,r=.47*(1-t)+.155*t+.065*Math.sin(t*Math.PI);for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,pleat=1+.06*Math.cos(a*12)*(1-t);p.push(Math.cos(a)*r*pleat,y+.018*Math.cos(a*12)*(1-t),Math.sin(a)*r*pleat);uv.push(i/n,t);if(j<rows&&i<n){let q=j*(n+1)+i;idx.push(q,q+n+1,q+1,q+1,q+n+1,q+n+2);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
part('Pleated silk skirt',skirt(),'purple','Skirt',[0,0,0]);
ball('Fitted bodice','purple','Spine',[0,1.08,0],[.22,.29,.145]);
ball('Bodice inset','pink','Spine',[0,1.115,.123],[.13,.19,.039]);
for(let i=0;i<5;i++) {part('Corset ribbon '+i,new T.CylinderGeometry(.009,.009,.21,5),'trim','Spine',[0,1.0+i*.043,.161],[1,1,1],[0,0,i%2?1.24:-1.24]);}
ball('Neck','skin','Neck',[0,1.445,0],[.076,.13,.075]);
ball('Face','skin','Head',[0,1.67,.016],[.255,.295,.223]);
ball('Hair crown','gold','Head',[0,1.73,-.035],[.271,.27,.22]);
for(const [side,s] of [['L',-1],['R',1]]) {
 ball('Ear'+side,'skin','Head',[s*.246,1.66,.012],[.048,.071,.041]);
 ball('Eye white'+side,'white','Head',[s*.092,1.699,.237],[.065,.077,.028]);
 ball('Iris'+side,'iris','Head',[s*.091,1.697,.258],[.036,.05,.014]);
 ball('Pupil'+side,'pupil','Head',[s*.091,1.697,.27],[.019,.034,.007]);
 ball('Catchlight'+side,'white','Head',[s*.091-.012,1.716,.276],[.011,.014,.006]);
 part('Brow'+side,new T.CapsuleGeometry(.012,.079,4,8),'shoe','Head',[s*.095,1.805,.227],[1,1,1],[0,0,s*1.3]);
 ball('Shoulder sleeve'+side,'pink','UpperArm'+side,[s*.248,1.294,0],[.109,.126,.112]);
 part('Upper arm'+side,new T.CapsuleGeometry(.062,.18,5,12),'skin','UpperArm'+side,[s*.245,1.16,0]);
 part('Lower arm'+side,new T.CapsuleGeometry(.052,.18,5,12),'skin','Forearm'+side,[s*.245,.884,0]);
 ball('Palm'+side,'skin','Hand'+side,[s*.245,.705,.009],[.057,.077,.039]);
 for(let k=0;k<4;k++)ball('Finger'+side+k,'skin','Hand'+side,[s*.245+(k-1.5)*.024,.66,.016],[.014,.044,.014]);
 ball('Thumb'+side,'skin','Hand'+side,[s*.20,.704,.043],[.023,.047,.023]);
 part('Leg'+side,new T.CapsuleGeometry(.075,.28,4,10),'skin','Shin'+side,[s*.13,.245,0]);
 ball('Slipper'+side,'shoe','Foot'+side,[s*.13,.063,.09],[.08,.065,.15]);
 // Swept locks frame the face without changing silhouette on camera rotation.
 for(let k=0;k<3;k++)ball('Swept lock'+side+k,'gold','Head',[s*(.19-k*.029),1.86-k*.02,.09+k*.049],[.099,.13,.087]);
}
ball('Nose','skin','Head',[0,1.64,.267],[.033,.044,.037]);
part('Smile',new T.TorusGeometry(.051,.008,6,20,Math.PI),'lip','Head',[0,1.559,.235],[1,.5,1],[0,0,Math.PI]);
const tracks=(name,frames)=>{const out=[];for(const [b,axis,values]of frames){const qs=[];for(const a of values){const e=new T.Euler();e[axis]=a;const q=new T.Quaternion().setFromEuler(e);qs.push(...q.toArray());}out.push(new T.QuaternionKeyframeTrack(b+'.quaternion',[0,.25,.5,.75,1],qs));}return new T.AnimationClip(name,1,out);};
const clips=[tracks('Idle',[['Chest','z',[0,.012,0,-.012,0]],['Head','y',[0,.03,0,-.03,0]]]),tracks('Walk',[['ThighL','x',[.46,0,-.46,0,.46]],['ThighR','x',[-.46,0,.46,0,-.46]],['ShinL','x',[0,.3,.12,0,0]],['ShinR','x',[.12,0,0,.3,.12]],['UpperArmL','x',[-.3,0,.3,0,-.3]],['UpperArmR','x',[.3,0,-.3,0,.3]],['Skirt','z',[0,.045,0,-.045,0]]]),tracks('Gather',[['UpperArmL','x',[-.5,-.8,-1,-.8,-.5]],['UpperArmR','x',[-.8,-1,-.7,-.5,-.8]],['ForearmL','x',[-.7,-.9,-.6,-.5,-.7]],['ForearmR','x',[-.7,-.6,-.9,-.6,-.7]],['Head','x',[.1,.15,.2,.15,.1]]]),tracks('Descent',[['ThighL','x',[-.5,-.55,-.5,-.45,-.5]],['ThighR','x',[-.4,-.45,-.4,-.35,-.4]],['ShinL','x',[.65,.7,.65,.6,.65]],['ShinR','x',[.6,.65,.6,.55,.6]],['Skirt','x',[-.08,-.1,-.08,-.06,-.08]]]),tracks('Landing',[['ThighL','x',[-.65,-.5,-.3,-.1,0]],['ThighR','x',[-.65,-.5,-.3,-.1,0]],['ShinL','x',[1,.8,.5,.2,0]],['ShinR','x',[1,.8,.5,.2,0]],['Chest','x',[.3,.2,.1,0,0]]]),tracks('Wave',[['UpperArmR','z',[2.3,2.3,2.3,2.3,2.3]],['ForearmR','z',[.1,.6,.1,.6,.1]]])];
root.userData={author:'Original Her Tangled Story V2 character',license:'Project-owned original asset',rig:'18 joints; authored clips; runtime arm IK'};
const data=await new GLTFExporter().parseAsync(root,{binary:true,animations:clips});await writeFile(new URL('../assets/story-hero.glb',import.meta.url),Buffer.from(data));console.log('Wrote story-hero.glb',data.byteLength,'bytes;',bones.length,'bones;',clips.length,'clips');
