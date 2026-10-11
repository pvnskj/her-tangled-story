// Shared tunables for "Her Tangled Story".
// Jordan: replace FINAL_MESSAGE with your own text before the birthday.
// It appears with the 33rd (finale) photo.

export const CONFIG = {
  FINAL_MESSAGE:
    "Happy birthday, my love. Every step of this valley holds a piece of " +
    "your story — and every piece led me to you. (Jordan: replace this " +
    "text with your own message.)",

  WORLD_BOUND: 114,      // playable half-extent (world is ~240x240)
  PLAYER_SPEED: 11,       // units per second
  INTERACT_RADIUS: 5,     // tap / E discovery radius
  PROMPT_RADIUS: 7,       // "!" prompt appears within this radius
  CHAMELEON_SENSE: 13,    // chameleon reacts to undiscovered clues this near
  BOAT_RIDE_TIME: 9,      // seconds for the scripted lake crossing
  SPAWN: { x: 0, z: -58 },// where she starts — her tower, lanterns & sky in frame
};

export const DEBUG = new URLSearchParams(location.search).get("debug") === "1";
