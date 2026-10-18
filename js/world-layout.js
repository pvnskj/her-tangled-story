// Nine equally spaced destinations and a continuous, visible nine-pointed road.
import {ZONES as SOURCE_ZONES,FESTIVAL as SOURCE_FESTIVAL,LAKE as SOURCE_LAKE} from './landmark-layout.js?v=20261018story';
export {segmentDistance} from './landmark-layout.js?v=20261018story';
export const WORLD_BOUND=300;
export const JOURNEY=['tower','forest','tavern','cave','village','castle','dark','sundrop','lake'];
const point=(radius,angle)=>({x:+(Math.sin(angle)*radius).toFixed(3),z:+(-Math.cos(angle)*radius).toFixed(3)});
export const ZONES=JOURNEY.map((id,index)=>{
 const source=SOURCE_ZONES.find(p=>p.id===id),center=point(205,index*Math.PI*2/9);
 return {...source,...center,r:id==='lake'?76:42,source:{x:source.x,z:source.z},entry:{x:center.x+source.entry.x-source.x,z:center.z+source.entry.z-source.z},mapLabel:['Tower','Forest','Duckling','Cave Tunnel','Corona','Castle','Dark Kingdom','Sundrop','Lake'][index]};
});
export function offsetFor(id){const place=ZONES.find(z=>z.id===(id==='festival'?'sundrop':id));if(id==='festival')return{x:place.x+18-SOURCE_FESTIVAL.x,z:place.z+24-SOURCE_FESTIVAL.z};return{x:place.x-place.source.x,z:place.z-place.source.z};}
export function movePoint(id,p){const d=offsetFor(id);return {...p,x:p.x+d.x,z:p.z+d.z};}
export function sourceZone(x,z){return [...SOURCE_ZONES,SOURCE_FESTIVAL].reduce((best,p)=>{const d=Math.hypot(x-p.x,z-p.z)/p.r;return !best||d<best.distance?{id:p.id,distance:d}:best;},null).id;}
export const FESTIVAL={...SOURCE_FESTIVAL,...movePoint('festival',SOURCE_FESTIVAL),entry:movePoint('festival',SOURCE_FESTIVAL.entry),r:22};
export const LAKE={...SOURCE_LAKE,...movePoint('lake',SOURCE_LAKE)};
export const STAR_VERTICES=Array.from({length:18},(_,i)=>point(i%2?76:132,i*Math.PI/9));
export const PATHS=STAR_VERTICES.map((a,i)=>{const b=STAR_VERTICES[(i+1)%18];return[a.x,a.z,b.x,b.z];});
export const inLake=(x,z)=>((x-LAKE.x)/LAKE.rx)**2+((z-LAKE.z)/LAKE.rz)**2<1;
