// Oregon birthday heroine — original stylized playable doll inspired by the
// recipient's Oregon forest-road photograph. No third-party character assets.
// All meshes are local procedural Three.js geometry, optimized for mobile.
import * as THREE from 'three';
const M=(c,rough=.8,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:rough,...extra});
const skin=M(0xe9b49b),skinShade=M(0xd99982),hair=M(0x38242a,.69),hairLight=M(0x633a39,.69),
  eyeWhite=M(0xfff8ed,.5),iris=M(0x633b2d,.47),pupil=M(0x211920,.38),lash=M(0x322029),
  lips=M(0xc97073),blush=M(0xe9a19b,.93,{transparent:true,opacity:.38,depthWrite:false}),
  shoe=M(0xe9e6dc),sole=M(0xcfc5bd),flowerCenter=M(0xf0c77b,.4),
  flowerPink=M(0xffd3db),flowerWhite=M(0xfff3df);
function mesh(parent,geo,mat,x=0,y=0,z=0){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
function ell(parent,mat,x,y,z,sx,sy,sz){const o=mesh(parent,new THREE.SphereGeometry(1,18,14),mat,x,y,z);o.scale.set(sx,sy,sz);return o;}
function tube(parent,pts,r,mat){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),Math.max(12,pts.length*6),r,6,false),mat);}
function floralMaterial(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff1e9';ctx.fillRect(0,0,512,512);
 // Repeating small pastel flowers on the actual fabric rather than pasted purple blobs.
 let seed=27;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<190;i++){
  const x=rand()*512,y=rand()*512,r=2.5+rand()*7;
  const cols=['#d9a4b7','#b9add8','#9cbca2','#d6a0a8','#d8c1e2'];
  ctx.fillStyle=cols[Math.floor(rand()*cols.length)];
  if(i%4===0){ctx.beginPath();ctx.ellipse(x,y,r*.55,r*1.5,rand()*6.28,0,6.283);ctx.fill();continue;}
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.6,r*.6,r*.37,a,0,6.283);ctx.fill();}
  ctx.fillStyle='#e6c48b';ctx.beginPath();ctx.arc(x,y,r*.24,0,6.283);ctx.fill();
 }
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;
 return M(0xffffff,.94,{map:tex,side:THREE.DoubleSide});
}
function blossom(parent,x,y,z,r,mat){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const p=ell(g,mat,Math.cos(a)*r*.55,Math.sin(a)*r*.55,0,r*.53,r*.36,r*.13);p.rotation.z=a;}
 ell(g,flowerCenter,0,0,r*.12,r*.24,r*.24,r*.13);return g;}
function buildFace(parent){
 const head=new THREE.Group();head.position.set(0,2.43,.01);parent.add(head);
 ell(head,skin,0,0,0,.32,.415,.29);
 // Jaw is embedded into the main head volume.
 ell(head,skin,0,-.18,.075,.247,.192,.216);
 for(const s of [-1,1]){
  ell(head,skin,s*.313,-.048,-.01,.055,.112,.054);
  ell(head,blush,s*.199,-.117,.251,.075,.045,.009);
  const eye=ell(head,eyeWhite,s*.127,.018,.270,.077,.059,.028);
  ell(head,iris,s*.126,.010,.295,.043,.048,.015);
  ell(head,pupil,s*.125,.010,.307,.024,.034,.009);
  ell(head,eyeWhite,s*.112,.033,.316,.013,.013,.007);
  const lid=ell(head,lash,s*.127,.074,.285,.080,.012,.011);lid.rotation.z=-s*.10;
  const brow=ell(head,hair,s*.13,.163,.266,.087,.013,.012);brow.rotation.z=-s*.13;
 }
 ell(head,skinShade,0,-.087,.288,.033,.038,.029);
 const mouth=tube(head,[[-.067,-.213,.259],[-.026,-.235,.279],[.028,-.235,.279],[.068,-.213,.259]],.009,lips);
 // Side-parted forehead and soft face-framing strands.
 ell(head,hair,0,.279,-.05,.322,.192,.272);
 for(const s of [-1,1]){
  const fringe=ell(head,s===1?hair:hairLight,s*.153,.258,.155,.174,.085,.121);fringe.rotation.z=s*.22;
  const lock=ell(head,hair,s*.298,-.133,-.034,.070,.31,.097);lock.rotation.z=s*.09;
 }
 return head;
}
export function createHeroineV3(player){
 const root=new THREE.Group();root.name='Oregon floral birthday heroine';player.group.add(root);
 const cloth=floralMaterial(),cream=M(0xffe5dc),ribbon=M(0xc99aa8),arms=[],legs=[],hairRig=[];
 const body=new THREE.Group();root.add(body);
 // Long floral dress from the Oregon road reference: fitted waist, floating skirt.
 const skirtPoints=[
  [0,.22],[.39,.22],[.46,.27],[.53,.40],[.54,.56],[.50,.76],
  [.43,.98],[.35,1.18],[.28,1.36],[.235,1.45],[0,1.45]
 ].map(([r,y])=>new THREE.Vector2(r,y));
 const skirt=mesh(body,new THREE.LatheGeometry(skirtPoints,40,0,Math.PI*2),cloth);
 const pos=skirt.geometry.attributes.position;for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i),y=pos.getY(i),a=Math.atan2(z,x);
  const k=1+.028*Math.sin(a*12+y*2.2)*(1-Math.min(1,y/1.5));
  pos.setXYZ(i,x*k,y,z*k);
 }pos.needsUpdate=true;skirt.geometry.computeVertexNormals();
 // Fitted upper bodice and gently scooped neckline.
 const bodice=mesh(body,new THREE.CylinderGeometry(.225,.275,.65,24,4),cloth,0,1.72,0);
 ell(body,cloth,0,1.97,.105,.226,.115,.18);
 tube(body,[[-.2,2.055,.105],[-.11,2.01,.228],[0,2.005,.243],[.11,2.01,.228],[.2,2.055,.105]],.014,cream);
 const belt=mesh(body,new THREE.TorusGeometry(.266,.018,7,28),ribbon,0,1.402,0);belt.rotation.x=Math.PI/2;
 // Semi-sheer floral puff sleeves with narrower, properly articulated forearms.
 for(const s of [-1,1]){
  const shoulder=ell(body,cloth,s*.335,2.02,0,.185,.19,.19);
  const arm=new THREE.Group();arm.position.set(s*.355,1.99,0);body.add(arm);
  ell(arm,cloth,s*.045,-.20,0,.112,.24,.125);
  ell(arm,skin,s*.055,-.49,.014,.077,.16,.082);
  ell(arm,skin,s*.065,-.65,.044,.070,.107,.070);
  ell(arm,cream,s*.05,-.40,0,.108,.028,.112);
  arms.push(arm);
 }
 // Visible lower legs and the cream sneakers in the photograph.
 for(const s of [-1,1]){
  const leg=new THREE.Group();leg.position.set(s*.18,.37,0);root.add(leg);
  ell(leg,skin,0,-.10,0,.095,.26,.11);
  ell(leg,shoe,0,-.275,.115,.133,.092,.226);
  ell(leg,sole,0,-.34,.123,.139,.033,.236);
  tube(leg,[[-.06,-.213,.286],[0,-.205,.299],[.06,-.213,.286]],.012,cream);
  legs.push(leg);
 }
 ell(body,skin,0,2.18,0,.11,.17,.12);
 const head=buildFace(body);
 // Flowing auburn-dark hair from Oregon photo: tapered articulated overlapping
 // ribbons rather than a stiff braid or a chain of beads.
 const back=new THREE.Group();back.position.set(0,2.72,-.18);body.add(back);
 for(let i=0;i<8;i++){
  const strand=new THREE.Group();
  if(i===0)back.add(strand);else{strand.position.set(0,-.26,-.015);hairRig[i-1].add(strand);}
  const width=.265*(1-i/11);
  ell(strand,i%3===0?hairLight:hair,0,-.12,-.065,width,.24,.13);
  for(const s of [-1,1]){
   const curl=ell(strand,i%2?hair:hairLight,s*width*.66,-.15,-.018,width*.43,.22,.105);
   curl.rotation.z=s*.13;
  }
  if(i===1||i===3||i===5){blossom(strand,(i%2?.17:-.17),-.10,-.172,.115,i===3?flowerPink:flowerWhite);}
  hairRig.push(strand);
 }
 // Cascading side strands and flowers, with motion distinct from the body.
 for(const s of [-1,1]){
  tube(body,[[s*.25,2.49,-.12],[s*.32,2.12,-.14],[s*.30,1.73,-.23],[s*.37,1.38,-.29]],.07,hairLight);
 }
 blossom(body,.25,2.72,.12,.10,flowerWhite);
 const sparkle=new THREE.PointLight(0xffddaf,0,4,2);sparkle.position.set(0,2.1,0);root.add(sparkle);
 let lastYaw=player.group.rotation.y,turnLag=0,pulse=0;
 return {
  root,discover(){pulse=2;},
  update(dt,t){
   const moving=!!player.moving&&!player.riding;
   const yaw=player.group.rotation.y;let d=yaw-lastYaw;while(d>Math.PI)d-=Math.PI*2;while(d< -Math.PI)d+=Math.PI*2;lastYaw=yaw;
   turnLag+=(THREE.MathUtils.clamp(d,-.5,.5)-turnLag)*Math.min(1,dt*3);
   body.position.y=moving?Math.abs(Math.sin(t*8))*.045:Math.sin(t*1.4)*.014;
   body.rotation.z=Math.sin(t*(moving?5:1.1))*(moving?.017:.01);
   skirt.rotation.y=Math.sin(t*1.2)*.017;
   arms.forEach((a,i)=>a.rotation.x=moving?Math.sin(t*8+i*Math.PI)*.32:Math.sin(t*1.3+i)*.055);
   legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(t*8+i*Math.PI)*.23:0);
   hairRig.forEach((h,i)=>{const k=(i+1)/hairRig.length;
     h.rotation.z=Math.sin(t*1.6-i*.4)*.035*k+(moving?Math.sin(t*7-i*.45)*.025*k:0);
     h.rotation.y=-turnLag*k*1.15+Math.sin(t*.9-i*.4)*.055*k;
   });
   head.rotation.z=Math.sin(t*1.2)*.016;
   pulse=Math.max(0,pulse-dt);sparkle.intensity=pulse>0?.5*Math.sin((2-pulse)*8)**2:0;
   root.visible=player.camMode!=='first';
  }
 };
}
