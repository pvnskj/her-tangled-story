// Shared tunables for "Her Tangled Story".
// Jordan: replace FINAL_MESSAGE with your own text before the birthday.
// It appears with the 32nd (finale) photo.

export const CONFIG = {
  FINAL_MESSAGE:
    "Happy birthday, my love. ✨\n\n" +
    "Long before our paths crossed, the world was already a brighter place because you were in it. " +
    "Every little adventure, every brave step, every smile and every dream made you the person I love today.\n\n" +
    "If I could collect a thousand memories, my favorite would still be the next one we make together. " +
    "Here's to all the lanterns still waiting to rise, all the places we'll explore, and all the ordinary days " +
    "that feel like magic because I share them with you.\n\n" +
    "I love you. Happy birthday, my beautiful girl.",

  WORLD_BOUND: 300,      // playable half-extent (nine-point world is ~648x648)
  PLAYER_SPEED: 11,       // units per second
  INTERACT_RADIUS: 5,     // tap / E discovery radius
  PROMPT_RADIUS: 7,       // "!" prompt appears within this radius
  CHAMELEON_SENSE: 13,    // chameleon reacts to undiscovered clues this near
  BOAT_RIDE_TIME: 9,      // seconds for the scripted lake crossing
  SPAWN: { x: 0, z: -173 },// where she starts — her tower, lanterns & sky in frame
};

export const DEBUG = new URLSearchParams(location.search).get("debug") === "1";
