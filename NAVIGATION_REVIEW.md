# Navigation review — 18 October 2026

The original walker stalled before clue 3 in a deterministic run using the live world and player code. Its local steering could not route around scenery and chose a nearby path without planning how the paths connected.

## Changes

- Plan collision-cleared routes that favor the existing dirt paths; connect off-path clues with short safe approaches. Keep the original 11-unit/second walking pace.
- Smooth route corners, avoid cutting through trees, and use swept manual movement with sliding instead of repeated collider push-outs.
- Use the same approach targets for guide taps, distant marker/NPC taps, and arrival detection.
- Reach original markers inside the tavern/barrels from the solid object's edge. Reach lake reflections from dry ground or the pier. Marker positions remain unchanged.
- Include the final clue in arrival detection and preserve all 33 clues in order. Boat taps cannot reveal clue 26 early or from a distance.
- Clear movement at discovery and pause walking/rowing while a riddle, photo, or map is open. Manual input immediately cancels automatic walking and restores the hint.
- Disembark onto clear ground or the pier; stay aboard with guidance if no nearby playable shore is available.

## Preserved

The original avatar sprite, construction and camera controls, world geometry, forest, lake, paths, photos, clue coordinates/order/text, riddles, UI and styling remain intact. The existing supporting-cast update is retained.

## Verification

Run from the repository root:

```sh
node --loader ./tests/three-loader.mjs --test tests/navigation.test.mjs tests/cast-preservation.test.mjs
```

16 tests pass. Tests execute the actual interaction/discovery functions and player/world code for all 33 clues at 20, 30 and 60 fps, check collisions and speed every frame, and verify photo order. Additional checks cover off-path starts, narrow gaps, dirt-path preference, manual takeover, overlay pausing, boat sequence/landing, and preservation of the artwork/world/content.

Browser limitation: the private preview required sign-in. On the public GitHub site, clicking Begin could not start the scene because this cloud browser reported WebGL disabled. These results are runtime simulations, not a completed visual browser walkthrough. Visual play-testing remains outstanding.
