# World and navigation review — 18 October 2026

## Nine-point layout

All nine destinations sit at equal 40° intervals on a 205-unit radius. A continuous nine-pointed brown road connects their entrance approaches. The scene expands to 648×648 units with a 300-unit playable half-extent. The enlarged lake retains its 70×46 radii, turquoise material, pier, boat and water animations.

The existing low-poly landmark geometry, original player sprite and camera controls, dusk lighting and material palette are retained. Scenery, characters, moving animals, trees, collision shapes, water, boat parking and map coordinates move together. Every visible tree trunk participates in collision checks. Entrance approaches have extra clearance around scenery and are painted with the same brown road material used by navigation.

## Mixed memory journey

There are 32 clues: 18 location discoveries and 14 character encounters. All 34 supplied characters participate as hosts, companions or clue-givers. Cassandra and Owl share an encounter; Varian and Ruddiger share another. This keeps the nine-place journey varied rather than requiring 32 conversations.

| Destination | Memories | Examples |
| --- | --- | --- |
| Rapunzel’s Tower | 1–3 | Painting, mirror, Pascal |
| Forest | 4–8 | Guards, shield, Owl’s lookout, Fidella |
| Snuggly Duckling | 9–13 | Hook Hand, bouquet, unicorn, Attila, back-door sign |
| Secret Cave Tunnel | 14–18 | Shorty, puppet stage, supply crate, Stabbington brothers |
| Kingdom of Corona | 19–22 | Fabric swatches, Tor, stitched ribbon, Little Girl with Braids |
| Corona Castle | 23–25 | King Frederic, lantern, Varian and Ruddiger’s experiment |
| Dark Kingdom | 26–28 | King Edmund, black-rock inscription, enchanted reflection |
| Sundrop Enclave | 29–30 | Flower and picnic basket, hosted by Kiera and Lance |
| Lake | 31–32 | Maximus guides the avatar to Flynn, then a shared boat ride |

The lake occupies the final point. Closing memory 31 starts Maximus’s escort: he leads at a comfortable pace and waits if the player stops. Flynn holds memory 32 by the pier. Both walk to the boat, board it together, then follow a 24-second loop over the lake as lanterns rise. The final photo and message appear after the ride. Map/modal overlays pause the sequence. The original avatar sprite is retained.

Original photos 1–10, captions and riddles remain. The original finale photo moves from 33 to 32; one unused placeholder is removed. Photo/riddle screens retain their styling and interaction, with the count updated to 32. Discoveries reuse the existing golden rings, sparkles and low-poly prop style.

## Activities

Human characters have individual props and task motions: painting, checking a mirror, reading maps, preparing lanterns, guarding/polishing shields, sharpening blades, tying rope, piano playing, flower arranging, unicorn polishing, baking, drinking, mime, designing, sewing, puppetry, supply handling, alchemy and magic. Flynn rows during the ending.

Pascal follows and points; Maximus grazes, reacts and escorts; Fidella grazes with neck/tail motion; Ruddiger handles a flask; Owl turns his head and flutters. Original ambient rabbits, birds, lake fish, turtles, dancers and vegetation animations continue. Castle flags move, tunnel lamps flicker and the Sundrop flower sways. NPCs and the new discovery props are separated, and animal positions are checked against scenery and water.

## Brown paths and verification

Automatic inter-place travel follows the visible brown network through the front entrances. Short collision-cleared approaches reach individual clues. Manual input takes over immediately outside the boat cinematic; maps and photos pause walking. Every visible tree trunk participates in collision checks, and trees newly occupying the central star road are cleared together with their collision shapes.

```sh
node --loader ./tests/three-loader.mjs --test tests/navigation.test.mjs tests/cast-preservation.test.mjs tests/world-expansion.test.mjs tests/story-finale.test.mjs
```

26 tests pass, covering the complete 32-clue journey at 20/30/60 fps, all 81 pairs of destination entrances, visible road alignment and clearance, nine map arrivals, off-path forest movement, narrow gaps, safe water/boat handling, all 34 character roles, the mixed clue distribution, activity transforms, content/avatar preservation, Maximus’s escort and both passengers aboard the final boat ride.

Visual verification remains outstanding: the cloud browser has WebGL disabled, and the private preview requires sign-in. Automated checks execute the actual world, player and interaction code; they are not a completed visual browser walkthrough.
