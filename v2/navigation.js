import {safeMove} from './timeline.js';
export function findPath(from,to,colliders,bound=23) {
  const step=.7,key=(x,z)=>`${x},${z}`,cell=p=>({x:Math.round(p.x/step),z:Math.round(p.z/step)});
  const start=cell(from),end=cell(to),blocked=(x,z)=>Math.abs(x*step)>bound||Math.abs(z*step)>bound||colliders.some(c=>Math.hypot(x*step-c.x,z*step-c.z)<c.r+.45);
  if(blocked(end.x,end.z))return [];
  const sk=key(start.x,start.z),open=[{...start,g:0,f:0,k:sk}],known=new Map([[sk,0]]),parents=new Map(),closed=new Set();
  for(let loops=0;open.length&&loops<6500;loops++){
    open.sort((a,b)=>b.f-a.f);const n=open.pop();if(closed.has(n.k))continue;closed.add(n.k);
    if(n.x===end.x&&n.z===end.z){const result=[to];let k=n.k;while(k!==sk){const [x,z]=k.split(',').map(Number);result.unshift({x:x*step,z:z*step});k=parents.get(k);}return result;}
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;const x=n.x+dx,z=n.z+dz,k=key(x,z);if(blocked(x,z)||closed.has(k))continue;if(dx&&dz&&(blocked(n.x+dx,n.z)||blocked(n.x,n.z+dz)))continue;
      const g=n.g+Math.hypot(dx,dz);if(g>=(known.get(k)??Infinity))continue;known.set(k,g);parents.set(k,n.k);open.push({x,z,k,g,f:g+Math.hypot(x-end.x,z-end.z)});}
  }return [];
}
export {safeMove};
