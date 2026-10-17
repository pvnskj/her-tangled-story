// Travel resolves a clear landing before moving; no obstacle-steering loops.
export function isWalkable(world, x, z, margin = .75, bound = 113) {
  if (Math.abs(x) > bound || Math.abs(z) > bound) return false;
  if (world.colliders.some(c => Math.hypot(x - c.x, z - c.z) < c.r + margin)) return false;
  const d = world.dockRect;
  const dock = d && x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1;
  return dock || !world.waters.some(w => ((x-w.x)/w.rx)**2 + ((z-w.z)/w.rz)**2 < 1.04);
}
export function safeLanding(world, target) {
  if (isWalkable(world, target.x, target.z, 1.5)) return { x: target.x, z: target.z };
  for (let r = 1; r <= 24; r += 1) {
    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI / 24, x = target.x + Math.cos(a)*r, z = target.z + Math.sin(a)*r;
      if (isWalkable(world, x, z, 1.5)) return { x, z };
    }
  }
  return null;
}
