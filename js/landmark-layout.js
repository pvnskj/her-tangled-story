// One source of truth for the visible brown roads, map and walking destinations.
export const WORLD_BOUND = 204;
export const LAKE = {x: -108, z: 20, rx: 70, rz: 46};
export const ZONES = [
  {id:'tower', name:'Rapunzel’s Tower', x:0, z:-95, r:36, entry:{x:0,z:-80}},
  {id:'village', name:'The Kingdom of Corona', x:0, z:90, r:35, entry:{x:0,z:82}},
  {id:'tavern', name:'The Snuggly Duckling', x:90, z:45, r:27, entry:{x:78,z:45}},
  {id:'castle', name:'Corona Castle', x:0, z:160, r:33, entry:{x:0,z:142}},
  {id:'cave', name:'The Secret Cave Tunnel', x:138, z:55, r:22, entry:{x:136,z:55}},
  {id:'sundrop', name:'The Sundrop Enclave', x:-128, z:-38, r:22, entry:{x:-124,z:-40}},
  {id:'dark', name:'The Dark Kingdom', x:145, z:-126, r:31, entry:{x:142,z:-108}},
  {id:'forest', name:'The Forest', x:80, z:-40, r:40, entry:{x:80,z:-40}},
  {id:'lake', name:'The Lake', x:LAKE.x, z:20, r:70, entry:{x:-36,z:20}},
];
export const FESTIVAL = {id:'festival',name:'Lantern Festival Clearing',x:-45,z:-60,r:24,entry:{x:-45,z:-60}};
export const PATHS = [
  [0,-80,-20,-77], [-20,-77,-40,-70], [-40,-70,-45,-60], [-45,-60,-32,-56], [-32,-56,-32,-35], [-32,-35,-36,20], [-36,20,0,82],
  [0,82,78,45], [78,45,80,-40], [80,-40,0,-80],
  [-45,-60,-52,-40], [0,82,0,65],
  // Castle bridge: the existing village remains where it is.
  [0,82,0,72], [0,72,36,72], [36,72,42,115], [42,115,30,132], [30,132,18,142], [18,142,0,142],
  // A clear approach around the tavern, then through the mine passage.
  [78,45,72,45], [72,45,72,55], [72,55,78,65], [78,65,100,65], [100,65,114,55], [114,55,136,55],
  // Coastal flower cove and the distant black-rock realm.
  [-45,-60,-80,-52], [-80,-52,-124,-40],
  [80,-40,118,-72], [118,-72,142,-108],
];
export const BRIDGES = [[42,115,30,132],[30,132,18,142],[18,142,0,142]];
export const DRY_ISLANDS = [{x:0,z:160,r:24}];
export function segmentDistance(x,z,[ax,az,bx,bz]) {
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-ax-t*dx,z-az-t*dz);
}
export const inLake=(x,z)=>((x-LAKE.x)/LAKE.rx)**2+((z-LAKE.z)/LAKE.rz)**2<1;
