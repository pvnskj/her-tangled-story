# Her Tangled Story — 3D Game Design

A real explorable 3D birthday game for his wife (birthday Oct 26). She roams a
continuous low-poly 3D valley as her Tangled-style avatar, hunting 33 hidden
photo-clues embedded in a living world. No tap-to-advance slideshow — real
movement, real exploration.

## Tech
- Three.js via CDN importmap (pin 0.160.0), plain JS modules, no build step.
- Static hosting (GitHub Pages). Mobile-first: virtual joystick + touch;
  WASD/arrow keys on desktop. Cap pixelRatio at 2. Keep it light: instanced
  meshes for trees/flowers/lanterns, one directional light, fog.

## World — one continuous valley, ~240x240 units, 6 themed zones
1. **Tower Hill** (north, ~[0,-90]): stone tower (cylinders) on a grassy mound, path down.
2. **Forest** (northeast, ~[80,-40]): dense low-poly trees, rabbits, birds, fireflies.
3. **Tavern** (east, ~[85,45]): Snuggly-Duckling-style hut, warm windows, thugs inside/outside.
4. **Village** (south, ~[0,90]): houses with prism roofs, market stalls, well, villagers.
5. **Lake** (west, ~[-80,20]): reflective water ellipse, wooden dock, rowboat.
6. **Festival Clearing** (northwest, ~[-45,-60]): lantern poles, stage, dance circle, crowd.

Stylized look: vertex-colored terrain, dusk purple-gold sky, floating lanterns.

## Player
- Paper-style avatar: `assets/sprite.png` (transparent chibi of her) on a
  THREE.Sprite, always faces camera, gentle bob while moving, blob shadow.
- Third-person follow camera: behind + above, smoothed.
- Collision: world-bounds clamp + circle colliders (buildings, trees, water —
  water blocked except via boat).

## Clues — 33 total, data-driven in `js/clues.js`
`{id, zone, x, z, kind, photo, caption}`. Kinds:
- `villager` (8): an NPC hands it over — walk up, dialogue, clue pops.
- `animal` (5): tap the rabbit/chameleon spot.
- `reflection` (3): shimmer spots on the lake — tap.
- `boat` (1): on the rowboat.
- `hidden` (15): glowing nooks (behind tower stairs, under market stall, hollow log…).
- `finale` (1): golden clue on the festival stage.
Distribution: tower 5, forest 6, tavern 5, village 7, lake 5, festival 5 (=33).
- Discovery: within radius a "!" prompt appears; tap clue (or E) → photo modal
  with caption + "Clue X / 33", chime, counter++.
- Photos: clues 1–10 use `assets/photos/01..10` (in order sent) with era captions;
  clues 11–32 show a "a new memory is on its way" placeholder card (CSS, no image);
  clue 33 shows `assets/photos/06-greensaree.jpg` + `FINAL_MESSAGE` from `js/config.js`
  (currently a placeholder he will replace with his own text).

## Living world
- **Villagers** (village, ~10): wander waypoints, varied colors; walk up + tap →
  dialogue bubble. 8 give hints to nearby undiscovered clues
  ("golden sparkles behind the old well…").
- **Tavern thugs**: seated/bobbing around tables, mug props, music-note particles.
- **Animals**: rabbits hop waypoints (forest), birds circle overhead.
- **Chameleon companion**: tiny green creature follows the player; within 12u of an
  undiscovered clue it hops excitedly with "!" (hot/cold helper).
- **Boat**: at the dock, tap → scripted row across the lake → disembark near festival.

## HUD / UI
- Top bar: "Clues X / 33" + zone-name banner when entering a zone.
- Start overlay: title + "Find all 33 hidden memories" + Begin.
- Photo modal, dialogue bubbles, finale modal (photo + message + replay).
- Sound toggle (tiny WebAudio chimes), mute by default? No — on with toggle.
- Debug mode `?debug=1`: visible clue markers, zone teleport keys 1–6, clue list
  in console. (Used for verification; harmless in production.)

## Files
`index.html`, `css/style.css`, `js/main.js` (boot/loop), `js/world.js` (terrain+zones),
`js/player.js`, `js/npcs.js`, `js/clues.js` (data), `js/ui.js`, `js/config.js`,
`assets/sprite.png`, `assets/photos/*.jpg`, `README.md` (run + deploy notes).

## Acceptance
- Loads with zero console errors; all assets resolve.
- Avatar moves smoothly via joystick and WASD; camera follows; collisions work.
- All 33 clues discoverable (verify via debug teleport); modal shows correct
  photo/caption; counter reaches 33; finale triggers with message.
- Runs at smooth framerate on desktop; no layout overflow on 390px viewport.
