// Seconds and world coordinates shared by staging, controls, and verification.
export const DURATION = 40;
export const ROOM_Y = 18;
export const LANDING = Object.freeze({x: 0.42, y: 0, z: 5.25});
export const clamp = (x, a=0, b=1) => Math.min(b, Math.max(a, x));
export const smooth = x => {x=clamp(x); return x*x*(3-2*x);};
export const mix = (a,b,t) => a+(b-a)*t;
export const phase = (t,a,b) => smooth((t-a)/(b-a));
export function sampleOpening(t) {
  t=clamp(t,0,DURATION);
  let x=0, y=ROOM_Y, z=1.1, yaw=0, pose='idle';
  if(t>=9 && t<18) {z=mix(1.1,2.08,phase(t,9,14));pose='gather';}
  if(t>=18 && t<21) {x=mix(0,.08,phase(t,18,21));y=ROOM_Y+.95*phase(t,18,19.2);z=mix(2.08,3.55,phase(t,18,21));yaw=Math.PI*phase(t,18,21);pose='climb';}
  if(t>=21 && t<29) {x=.08;y=mix(ROOM_Y+.95,.45,phase(t,21,29));z=mix(3.55,3.85,phase(t,21,29)); yaw=Math.PI;pose='slide';}
  if(t>=29) {x=mix(.08,LANDING.x,phase(t,29,31.5));y=mix(.45,0,phase(t,29,30));z=mix(3.85,LANDING.z,phase(t,29,31.5));yaw=mix(Math.PI,0,phase(t,30,33));pose=t<32?'land':'idle';}
  return {t,x,y,z,yaw,pose,scene:t<12?0:t<20?1:t<30?2:3,control:t>=DURATION,
    hairDrop:phase(t,13,19), release:phase(t,30,34), handoff:phase(t,35,40)};
}
export function safeMove(pos, delta, colliders, bound=24) {
  // Substeps prevent tunnelling on slow frames, with sliding along obstacles.
  let p={x:pos.x,z:pos.z}; const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.18));
  for(let i=0;i<steps;i++) {p.x=clamp(p.x+delta.x/steps,-bound,bound);p.z=clamp(p.z+delta.z/steps,-bound,bound);
    for(const c of colliders) {let dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz),r=c.r+.28;
      if(d<r){if(d<1e-6){dx=1;dz=0;d=1;}p.x=c.x+dx/d*r;p.z=c.z+dz/d*r;}}
  } return p;
}
