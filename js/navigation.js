// Plan on the existing dirt paths, with clearance around the unchanged scenery.
// A weighted grid also connects off-path clues and safe points on the pier/shore.
export class Navigation {
  constructor(world, bound = world.bound || 114) {
    this.world = world; this.bound = bound; this.step = .75;
    this.buckets = new Map();
    for (const c of world.colliders) {
      for (let z = Math.floor((c.z - c.r - 1) / 8); z <= Math.floor((c.z + c.r + 1) / 8); z++)
        for (let x = Math.floor((c.x - c.r - 1) / 8); x <= Math.floor((c.x + c.r + 1) / 8); x++) {
          const key = `${x},${z}`;
          if (!this.buckets.has(key)) this.buckets.set(key, []);
          this.buckets.get(key).push(c);
        }
    }
    this.size = Math.floor(bound * 2 / this.step) + 1;
    this.cost = new Float32Array(this.size ** 2);
    for (let z = 0; z < this.size; z++) for (let x = 0; x < this.size; x++) {
      const px = x * this.step - bound, pz = z * this.step - bound;
      if (!this.canWalk(px, pz, .85)) continue;
      const d = this.pathDistance(px, pz);
      this.cost[z * this.size + x] = d <= 1.3 ? 1 : d <= 2 ? 3 : 8;
    }
  }
  pathDistance(x, z) {
    let best = Infinity;
    for (const [ax, az, bx, bz] of this.world.paths || []) {
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
    }
    return best;
  }
  canWalk(x, z, clearance = .55) {
    if (Math.abs(x) > this.bound || Math.abs(z) > this.bound) return false;
    const d = this.world.dockRect;
    const dock = d && x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1;
    const island = (this.world.dryIslands || []).some(i => Math.hypot(x-i.x,z-i.z) <= i.r-.5);
    const bridge = (this.world.bridges || []).some(([ax,az,bx,bz]) => {
      const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
      return Math.hypot(x-ax-t*dx,z-az-t*dz)<2.3;
    });
    if (!dock && !island && !bridge && this.world.waters.some(w => ((x - w.x) / w.rx) ** 2 + ((z - w.z) / w.rz) ** 2 < 1)) return false;
    return (this.buckets.get(`${Math.floor(x / 8)},${Math.floor(z / 8)}`) || []).every(c => Math.hypot(x - c.x, z - c.z) >= c.r + clearance);
  }
  segmentClear(a, b, clearance = .55) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .2));
    for (let i = 1; i <= n; i++) if (!this.canWalk(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, clearance)) return false;
    return true;
  }
  point(id) { return {x: (id % this.size) * this.step - this.bound, z: Math.floor(id / this.size) * this.step - this.bound}; }
  nearestWalkable(point, maxDistance = Infinity) {
    let best = null, distance = maxDistance;
    for (let id = 0; id < this.cost.length; id++) {
      if (!this.cost[id]) continue;
      const candidate = this.point(id), d = Math.hypot(point.x - candidate.x, point.z - candidate.z);
      if (d < distance) { best = candidate; distance = d; }
    }
    return best;
  }
  smooth(route) {
    if (route.length < 3) return route;
    const result = [route[0]];
    for (let i = 0; i < route.length - 1;) {
      let last = i + 1;
      for (let j = i + 2; j < route.length; j++) {
        const a = route[i], b = route[j], distance = Math.hypot(a.x - b.x, a.z - b.z);
        if (distance > 6) break;
        if (!this.segmentClear(a, b, .7)) continue;
        const maxRoadDistance = Math.max(1.5, this.pathDistance(a.x, a.z), this.pathDistance(b.x, b.z));
        let staysNearRoad = true;
        for (let k = 1; k < Math.ceil(distance / .3); k++) {
          const t = k / Math.ceil(distance / .3);
          if (this.pathDistance(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t) > maxRoadDistance + .05) { staysNearRoad = false; break; }
        }
        if (staysNearRoad) last = j;
      }
      result.push(route[last]); i = last;
    }
    return result;
  }
  roadRoute(start, end) {
    const nodes = new Map(), key = p => `${p.x},${p.z}`;
    const node = (x,z) => {const k=`${x},${z}`;if(!nodes.has(k))nodes.set(k,{x,z,edges:[]});return nodes.get(k);};
    for(const [ax,az,bx,bz] of this.world.paths || []) {
      const a=node(ax,az),b=node(bx,bz);
      if(!this.segmentClear(a,b,.7))continue;
      const d=Math.hypot(bx-ax,bz-az);a.edges.push([key(b),d]);b.edges.push([key(a),d]);
    }
    const from=key(start),to=key(end);
    if(!nodes.has(from)||!nodes.has(to))return null;
    const distance=new Map([[from,0]]),parent=new Map(),open=new Set([from]);
    while(open.size){let id=null,best=Infinity;for(const candidate of open)if(distance.get(candidate)<best){id=candidate;best=distance.get(candidate);}open.delete(id);
      if(id===to){const points=[];for(let at=to;at;at=parent.get(at)){const p=nodes.get(at);points.push({x:p.x,z:p.z});}return points.reverse();}
      for(const [next,length] of nodes.get(id).edges){const d=best+length;if(d<(distance.get(next)??Infinity)){distance.set(next,d);parent.set(next,id);open.add(next);}}
    }
    return null;
  }
  route(start, target) {
    const places=[...(this.world.zones || []),...(this.world.festival?[this.world.festival]:[])];
    const destination=places.find(p=>p.id===target.zone);
    if(!destination)return this.findRoute(start,target);
    const origin=this.world.zoneAt?.(start.x,start.z) || places.reduce((best,p)=>!best||Math.hypot(start.x-p.entry.x,start.z-p.entry.z)<Math.hypot(start.x-best.entry.x,start.z-best.entry.z)?p:best,null);
    if(origin?.id===destination.id&&!target.destinationId)return this.findRoute(start,target);
    if(!origin)return this.findRoute(start,target);
    const approach=this.findRoute(start,{...origin.entry,radius:1.1});
    const road=this.roadRoute(origin.entry,destination.entry);
    const finish=this.findRoute(destination.entry,target);
    if(!approach||!road||!finish)return null;
    const last=approach.at(-1)||start;
    if(!this.segmentClear(last,origin.entry,.7))return null;
    // Only the approach to a place/clue leaves the visible brown network.
    return [...approach,...road,...finish];
  }
  findRoute(start, target) {
    const n = this.size, count = this.cost.length, radius = Math.max(.5, (target.radius || 1.8) - .35);
    if (Math.hypot(start.x - target.x, start.z - target.z) < radius) return [];
    // Connect the exact player position to a nearby clear grid node, never teleport.
    let first = -1, nearest = Infinity;
    const sx = Math.round((start.x + this.bound) / this.step), sz = Math.round((start.z + this.bound) / this.step);
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
      const x = sx + dx, z = sz + dz; if (x < 0 || z < 0 || x >= n || z >= n) continue;
      const id = z * n + x, p = this.point(id), distance = Math.hypot(p.x - start.x, p.z - start.z);
      if (this.cost[id] && distance < nearest && this.segmentClear(start, p)) { first = id; nearest = distance; }
    }
    if (first < 0) return null;
    const score = new Float64Array(count); score.fill(Infinity); score[first] = 0;
    const parent = new Int32Array(count); parent.fill(-1);
    const closed = new Uint8Array(count), heap = [];
    const heuristic = id => { const p = this.point(id); return Math.max(0, Math.hypot(p.x - target.x, p.z - target.z) - radius); };
    const push = (id, f) => { let i = heap.length; heap.push({id, f}); while (i) { const j = (i - 1) >> 1; if (heap[j].f <= f) break; heap[i] = heap[j]; i = j; } heap[i] = {id, f}; };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let j = i * 2 + 1; if (j + 1 < heap.length && heap[j + 1].f < heap[j].f) j++; if (heap[j].f >= last.f) break; heap[i] = heap[j]; i = j; } heap[i] = last; } return top.id; };
    push(first, heuristic(first));
    while (heap.length) {
      const id = pop(); if (closed[id]) continue; closed[id] = 1;
      if (heuristic(id) === 0) {
        const route = []; for (let at = id; at !== -1; at = parent[at]) route.push(this.point(at));
        return this.smooth(route.reverse());
      }
      const x = id % n, z = Math.floor(id / n);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dz) || x + dx < 0 || z + dz < 0 || x + dx >= n || z + dz >= n) continue;
        const next = id + dz * n + dx;
        if (!this.cost[next] || closed[next]) continue;
        // No diagonal corner cutting through adjacent tree trunks/buildings.
        if (dx && dz && (!this.cost[id + dx] || !this.cost[id + dz * n])) continue;
        if (!this.segmentClear(this.point(id), this.point(next), .7)) continue;
        const g = score[id] + this.step * Math.hypot(dx, dz) * (this.cost[id] + this.cost[next]) / 2;
        if (g >= score[next]) continue;
        score[next] = g; parent[next] = id; push(next, g + heuristic(next));
      }
    }
    return null;
  }
}

const navigators = new WeakMap();
const targets = new WeakMap();
export function navigationFor(world, bound = world.bound || 114) {
  if (!navigators.has(world)) navigators.set(world, new Navigation(world, bound));
  return navigators.get(world);
}

// Identical targets/radii for click-to-walk, guide navigation and arrival checks.
export function clueTarget(clue, npcs, world) {
  if (clue.kind === 'villager') {
    const npc = npcs.find(n => n.clueId === clue.id);
    return npc ? {x: npc.group.position.x, z: npc.group.position.z, radius: 3.5, zone: clue.zone} : null;
  }
  const water = world.waters.some(w => ((clue.x - w.x) / w.rx) ** 2 + ((clue.z - w.z) / w.rz) ** 2 < 1);
  if (!targets.has(world)) targets.set(world, new Map());
  const cache = targets.get(world);
  if (!cache.has(clue.id)) {
    const nav = navigationFor(world);
    let nearest = Infinity;
    for (let id = 0; id < nav.cost.length; id++) {
      if (!nav.cost[id]) continue;
      const p = nav.point(id);
      nearest = Math.min(nearest, Math.hypot(p.x - clue.x, p.z - clue.z));
    }
    // Some original markers sit inside solid barrels/buildings. Reach them from
    // their edge, without moving the marker or requiring entry into the scenery.
    cache.set(clue.id, {x: clue.x, z: clue.z, zone: clue.zone, radius: Math.max(water ? 12 : 2.5, nearest + .5)});
  }
  return {...cache.get(clue.id)};
}
