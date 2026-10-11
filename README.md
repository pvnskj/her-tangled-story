# Her Tangled Story — a 3D birthday adventure

A real explorable 3D birthday game: she roams a continuous low-poly valley as
her Tangled-style avatar, hunting **33 hidden photo-clues** embedded in a living
world (villagers, tavern thugs, animals, lake reflections, a rowboat, and a
lantern-festival finale).

## Run it

No build step. Any static server works:

```bash
cd tangled-birthday-game
python3 -m http.server 8123
# open http://localhost:8123
```

Three.js r160 is vendored in `js/vendor/` and loaded via importmap — the game
runs fully offline from any static host. Pinned version, no build step.

**Controls:** virtual joystick (touch) · WASD / arrow keys (desktop) · tap
glowing spots & people (or press **E**) to discover clues.

**Debug mode:** open with `?debug=1` — clue markers become visible, keys
**1–6** teleport to each zone, clue list prints to the console.

## Customize

- **Final message:** edit `FINAL_MESSAGE` in `js/config.js` — it appears with
  the 33rd photo.
- **Photos 11–32:** drop the real photos into `assets/photos/` and set the
  `photo` field on clues 11–32 in `js/clues.js` (replace `null`). Captions live
  in the same entries.
- **Clue layout:** all 33 clues are data in `js/clues.js`
  (`{id, zone, x, z, kind, photo, caption, npc?, hint?}`) — move, reword, or
  rekindle without touching game code.

## Files

| File | What |
|---|---|
| `index.html` | Shell, importmap (Three.js 0.160.0 pinned), HUD & modal DOM |
| `css/style.css` | Mobile-first UI styling |
| `js/main.js` | Boot, game loop, discovery, boat ride, interaction |
| `js/world.js` | Terrain, 6 zones, props, water, boat, ambient animation |
| `js/player.js` | Sprite avatar, movement, collisions, follow camera |
| `js/npcs.js` | Villagers, thugs, rabbits, birds, chameleon companion |
| `js/clues.js` | All 33 clue entries (data-driven) |
| `js/ui.js` | HUD, joystick, dialogue, modals, sounds |
| `js/config.js` | Tunables + `FINAL_MESSAGE` |
| `assets/sprite.png` | Her transparent chibi avatar |
| `assets/photos/` | Clue photos (01–10 real, 11–32 pending) |

## Deploy

Copy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).
No server-side code, no build.
