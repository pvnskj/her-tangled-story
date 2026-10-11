// Player: paper-style sprite avatar, joystick + WASD/arrows, follow camera,
// collisions (bounds, circle colliders, water unless boating/on dock).

import * as THREE from "three";
import { CONFIG } from "./config.js";

export class Player {
  constructor(scene, world) {
    this.world = world;
    const tex = new THREE.TextureLoader().load("assets/sprite.png");
    tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    this.sprite.scale.set(1.9, 3.6, 1);
    this.group = new THREE.Group();
    this.group.add(this.sprite);
    this.sprite.position.y = 1.8;
    // blob shadow
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03;
    this.group.add(sh);
    this.group.position.set(CONFIG.SPAWN.x, 0, CONFIG.SPAWN.z);
    scene.add(this.group);

    this.vel = new THREE.Vector3();
    this.riding = false;
    this.moveVec = { x: 0, z: 0 };
    this.moving = false;
    this.bobT = 0;
  }

  setInput(x, z) { this.moveVec.x = x; this.moveVec.z = z; }

  inWater(x, z) {
    return this.world.waters.some((w) => ((x - w.x) / w.rx) ** 2 + ((z - w.z) / w.rz) ** 2 < 1);
  }
  onDock(x, z) {
    const d = this.world.dockRect;
    return x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1;
  }

  update(dt) {
    if (this.riding) return; // boat drives
    const { x: ix, z: iz } = this.moveVec;
    const len = Math.hypot(ix, iz);
    this.moving = len > 0.08;
    const prev = this.group.position.clone();

    if (this.moving) {
      const nx = ix / Math.max(1, len), nz = iz / Math.max(1, len);
      const sp = CONFIG.PLAYER_SPEED * Math.min(1, len);
      this.group.position.x += nx * sp * dt;
      this.group.position.z += nz * sp * dt;
      this.bobT += dt * 11;
      this.sprite.position.y = 1.8 + Math.abs(Math.sin(this.bobT)) * 0.14;
    } else {
      this.sprite.position.y = 1.8 + Math.sin(performance.now() * 0.002) * 0.03;
    }

    const p = this.group.position;
    // world bounds
    const B = CONFIG.WORLD_BOUND;
    p.x = Math.max(-B, Math.min(B, p.x));
    p.z = Math.max(-B, Math.min(B, p.z));
    // water: blocked unless on the dock
    if (this.inWater(p.x, p.z) && !this.onDock(p.x, p.z)) {
      p.copy(prev);
    }
    // circle colliders: push out
    for (const c of this.world.colliders) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + 0.55;
      if (d < min && d > 1e-4) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
  }

  updateCamera(camera, dt) {
    const p = this.group.position;
    // pull back on narrow (portrait phone) screens so more world is visible
    const wide = 1 + Math.max(0, 1 - camera.aspect) * 0.55;
    // look-ahead: shift the frame toward her movement direction so landmarks
    // ahead of her stay visible — she "sees what the world is"
    const mx = this.moveVec.x, mz = this.moveVec.z;
    const ml = Math.hypot(mx, mz);
    const lead = ml > 0.05 ? Math.min(1, ml) : 0;
    const lx = lead ? (mx / ml) * 5.5 * lead : 0;
    const lz = lead ? (mz / ml) * 5.5 * lead : 0;
    // low vista pitch (~25°) so the horizon, sky and landmarks read
    const target = new THREE.Vector3(p.x + lx, 11 * wide, p.z + lz + 17 * wide);
    camera.position.lerp(target, 1 - Math.pow(0.0015, dt));
    camera.lookAt(p.x + lx * 0.7, 3.5, p.z + lz * 0.7);
  }

  teleport(x, z) {
    this.group.position.set(x, 0, z);
    this.riding = false;
  }
}
