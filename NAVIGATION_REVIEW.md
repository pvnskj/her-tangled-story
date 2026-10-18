# World and navigation review — 18 October 2026

## Expanded world

Nine main destinations: Rapunzel’s Tower, the Kingdom of Corona, the Snuggly Duckling, Corona Castle, the Secret Cave Tunnel, the Sundrop Enclave, the Dark Kingdom, the Forest and the Lake. The original lantern festival remains a clearing, with its five original clues.

Four newly built areas use the existing faceted geometry, warm window/glow materials, purple roofs and dusk lighting. The castle includes an island, stone bridge, mosaic courtyard, towers, balcony and library loggia. The tunnel has rock walls, supports, rails, roots and a flooded end. The enclave contains the golden flower and basket. The Dark Kingdom has ruined towers and black-rock growths.

Ground expands from 240×240 to 432×432 units; playable bounds expand from 114 to 204 per axis. Lake radii grow from 42×32 to 70×46: approximately 2.4 times the water surface. Its center moves west to preserve the east shore and original pier. Existing trees/grass newly covered by water or corrected roads are cleared, while original procedural forest generation is retained.

## Brown paths and navigation

The brown visible strips are the roads. Road geometry, the map and automatic travel share one segment network. Inter-place travel uses the road graph and each destination’s front entrance, rather than an off-road shortcut. Short collision-cleared approaches connect the avatar and each clue to that network. Visible road sections that crossed barrels, houses or the tavern are rerouted.

The map has nine destination buttons that walk at the original pace, without teleporting. It displays the actual roads, water, islands, clue progress and player position. All 33 original clues, riddles, photos, captions and sequence remain intact, along with the original avatar asset, construction and camera controls. Photo/riddle UI and styling outside the map remain unchanged.

Retained navigation fixes include safe edge/shore approaches for unreachable markers, distant clue taps, final-clue arrival, immediate manual takeover, overlay pausing, ordered boat discovery and clear-ground disembarking.

## Verification

```sh
node --loader ./tests/three-loader.mjs --test tests/navigation.test.mjs tests/cast-preservation.test.mjs tests/world-expansion.test.mjs
```

23 tests pass: all 33 clues at 20/30/60 fps; all 81 pairs of destination entrances on the brown network; continuous clearance and matching rendered orientation for every road; walking/arrival at nine map destinations; bridge/island water rules; narrow gaps and manual movement; boat landings; original content, avatar and style preservation; finite transforms and valid opacity.

Visual verification remains outstanding: this cloud browser has WebGL disabled, so the public game cannot get past Begin; the private preview also requires sign-in. Automated checks use the actual world/player and interaction code and are not a completed visual browser walkthrough.
