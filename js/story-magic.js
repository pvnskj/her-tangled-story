// Storybook atmosphere for the existing nine-pointed-star layout.
// Purely decorative: never changes paths, colliders, clues or zone positions.
import * as THREE from 'three';
import {ZONES} from './world-layout.js?v=20261018story';

export function createStoryMagic(scene) {
  const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const perZone = mobile ? 12 : 26;
  const total = ZONES.length * perZone;
  const positions = new Float32Array(total * 3);
  const origins = new Float32Array(total * 3);
  const phases = new Float32Array(total);
  let seed = 73451;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  for (let j = 0; j < ZONES.length; j++) {
    const zone = ZONES[j];
    for (let k = 0; k < perZone; k++) {
      const i = j * perZone + k, a = random() * Math.PI * 2;
      const r = 6 + Math.sqrt(random()) * Math.min(zone.r * .72, 25);
      origins[i * 3] = zone.x + Math.cos(a) * r;
      origins[i * 3 + 1] = .65 + random() * 3.2;
      origins[i * 3 + 2] = zone.z + Math.sin(a) * r;
      phases[i] = random() * Math.PI * 2;
    }
  }
  const ambientGeo = new THREE.BufferGeometry();
  ambientGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const ambient = new THREE.Points(ambientGeo, new THREE.PointsMaterial({
    color: 0xffdf91, size: mobile ? .6 : .75, transparent: true,
    opacity: .65, depthWrite: false, blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  }));
  ambient.frustumCulled = false;
  ambient.name = 'Storybook fireflies (decorative)';
  scene.add(ambient);

  // Pool for short-lived sparkling reactions when characters greet her and memories unlock.
  const capacity = mobile ? 48 : 96;
  const burstCoords = new Float32Array(capacity * 3);
  const burstVelocity = new Float32Array(capacity * 3);
  const life = new Float32Array(capacity);
  const maxLife = new Float32Array(capacity);
  const burstGeo = new THREE.BufferGeometry();
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstCoords, 3));
  for (let i = 0; i < capacity; i++) burstCoords[i * 3 + 1] = -10000;
  const burst = new THREE.Points(burstGeo, new THREE.PointsMaterial({
    color: 0xffefb1, size: .95, transparent: true, opacity: .9,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  burst.frustumCulled = false;
  burst.name = 'Magic memory sparkles (decorative)';
  scene.add(burst);
  let cursor = 0, lastGreeting = -100;
  const burstAt = (x, z, count, height = 1.3) => {
    for (let k = 0; k < count; k++) {
      const i = cursor++ % capacity, ix = i * 3, angle = random() * Math.PI * 2;
      burstCoords[ix] = x + (random() - .5) * 1.4;
      burstCoords[ix + 1] = height + random() * 1.2;
      burstCoords[ix + 2] = z + (random() - .5) * 1.4;
      const speed = 1 + random() * 3;
      burstVelocity[ix] = Math.cos(angle) * speed;
      burstVelocity[ix + 1] = 1.1 + random() * 2;
      burstVelocity[ix + 2] = Math.sin(angle) * speed;
      maxLife[i] = life[i] = .9 + random() * 1.25;
    }
    burstGeo.attributes.position.needsUpdate = true;
  };
  return {
    discover(clue) { burstAt(clue.x, clue.z, mobile ? 24 : 42, 1.1); },
    greet(npc, time) {
      if (!npc?.group || time - lastGreeting < 2) return;
      lastGreeting = time;
      burstAt(npc.group.position.x, npc.group.position.z, 10, 2.2);
    },
    update(dt, time, playerPos, isMoving=false) {
      for (let i = 0; i < total; i++) {
        const q = i * 3, phase = phases[i], dist = Math.hypot(origins[q] - playerPos.x, origins[q + 2] - playerPos.z);
        // Keep particles close to explored scenery, not blanketing distant zones.
        const approach=!isMoving&&dist<9 ? (1-dist/9)*.46 : 0;
        positions[q] = origins[q] + Math.sin(time * .48 + phase) * .75 + (playerPos.x-origins[q])*approach;
        positions[q + 1] = dist < 55 ? origins[q + 1] + Math.sin(time * 1.2 + phase) * .35 : -10000;
        positions[q + 2] = origins[q + 2] + Math.cos(time * .44 + phase) * .7 + (playerPos.z-origins[q+2])*approach;
      }
      ambientGeo.attributes.position.needsUpdate = true;
      for (let i = 0; i < capacity; i++) {
        if (life[i] <= 0) continue;
        life[i] = Math.max(0, life[i] - dt);
        const ix = i * 3;
        if (!life[i]) { burstCoords[ix + 1] = -10000; continue; }
        burstCoords[ix] += burstVelocity[ix] * dt;
        burstCoords[ix + 1] += burstVelocity[ix + 1] * dt;
        burstCoords[ix + 2] += burstVelocity[ix + 2] * dt;
        burstVelocity[ix + 1] -= dt * 1.8;
      }
      burstGeo.attributes.position.needsUpdate = true;
      burst.material.opacity = .7 + Math.sin(time * 4) * .2;
    }
  };
}
