# Her Tangled Story — a world for you

The original six-place 3D valley, presented as an open birthday journey. Choose
any place, unwrap a keepsake, revisit the photo album, or wander at your own
pace. The scenery, terrain, buildings, paths, lighting and world layout remain
in `js/world.js` unchanged.

## The birthday experience

- Six surprises, available in any order. No riddles, sequential locks or empty photo cards.
- One-tap travel fades to a collision-checked arrival point. Walking is optional.
- A faceless lavender-and-gold 3D heroine. Villagers sweep, arrange flowers,
  carry bread, tend lanterns, read, or fish with animated arms and props.
- Ten original photos in paper frames, with uncropped full-screen viewing,
  previous/next controls, keyboard arrows, and horizontal swipes.
- A private, ephemeral wish at the lake and a lantern celebration at the festival.
- Opened keepsakes and last destination resume on this browser when local storage
  is available. Private browsing/storage restrictions may prevent persistence.

## Controls

**Places** travels directly to any destination; **Album** opens all ten photos.
**View** switches between a calm elevated follow camera and overhead view.
Drag the world to orbit the camera. On phones, choose **Walk yourself** to show
the joystick; on desktop use WASD/arrows. Press **E** or tap the nearby prompt
to greet a worker or board the existing boat. **Back to shore** is always
available while boating. Escape closes a dialog/photo viewer.

## Add the actual birthday presents

The six wrapped keepsakes are ready. Actual purchased gifts have deliberately
not been invented. In `js/journey.js`, replace a chapter's `gift: null` with:

```js
gift: {
  title: 'The title of your real present',
  message: 'Your personal reveal, or where she can find the wrapped present.'
}
```

The gift message appears only after unwrapping and can be reopened. Edit each
chapter's `note` for your own words. Edit the festival note for the final birthday
letter. This is a public static site: do not put passwords, voucher redemption
codes, private addresses, or other secrets in its source.

Photos live in `assets/photos/`; their captions and chapter groupings are in
`js/journey.js`. Add a photo to a chapter's `photos` array to include it in both
the chapter and album. Keep every photo's `src` unique.

## Run and verify

No build step or external dependencies. Serve this folder with any static server.
Three.js r160 is vendored locally. GitHub Pages serves the root `index.html`.
The separate `v2/` prototype has not been changed.

With Node 24:

```bash
node --loader ./tests/three-loader.mjs --test tests/journey.test.mjs
```

These checks build the actual seeded world geometry to validate every arrival
point, collisions, avatar/camera state, NPC activities, photo paths, and progress
storage. They do not render WebGL or replace mobile Safari visual testing.

Use `?debug=1` to expose a diagnostic `window.__game` during local testing.
