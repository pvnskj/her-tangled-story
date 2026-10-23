// Shared tunables for "Her Tangled Story".
// Jordan's own final message (added 2026-10-22). It appears after the
// lantern finale, before the final photo is revealed.

export const CONFIG = {
  FINAL_MESSAGE:
    `Living this life with you has been a miracle. There was never a moment or a second where I resented my life with you. While I wasn’t a happy soul, you helped me in every way to overcome my struggles. This wasn’t the life I was expecting to give you. I wanted you to stay happy, enjoy every single minute of this once in a who know when opportunity. I always wonder how did I get to meet such a beautiful soul. Someone who doesn’t need or worry about the worldly pleasures or has any greed. I will become rich one day (if it did not happen already), rich enough to take you on a vacation where you need not run or where you aren’t rushed. I’ll take you around the world to all the places that you wanted to visit. I will do my best to keep you safe, healthy and lead a confident/satisfying life. I want you to know that I always want you to be strong and independent. You need not mend your ways for anyone. You need not adjust to please others. You have made more sacrifices than anyone that I know. It breaks my heart everyday, every minute and every second knowing that you have to compromise. I am going to work on myself and make sure that I can give you the relaxed life that you deserve.

I don’t know when we will meet again, but if given a chance I want you to be my wife and my partner in every life (next 69 lives).

If you want to be a rock, I’ll be a river that protects you. If you want to be a tree, I’ll be the soil that doesn’t let you wither away. If you want to be a non existent material, I’ll be the reason you want to exist.

I don’t know why did those words come out of my mouth when we first met but that is the truth that I will always stick to. You are precious. Be my precious forever!

A reminder to my ferocious peppa saan from his little lamb.

Love you ❤️

purrr on ya my Bulli myan`,

  // Shown after she reads the message — the very last image of the game.
  FINALE_PHOTO: "assets/photos/37-queen-finale.jpg",

  WORLD_BOUND: 300,      // playable half-extent (nine-point world is ~648x648)
  PLAYER_SPEED: 11,       // units per second
  INTERACT_RADIUS: 5,     // tap / E discovery radius
  PROMPT_RADIUS: 7,       // "!" prompt appears within this radius
  CHAMELEON_SENSE: 13,    // chameleon reacts to undiscovered clues this near
  BOAT_RIDE_TIME: 9,      // seconds for the scripted lake crossing
  SPAWN: { x: 0, z: -173 },// where she starts — her tower, lanterns & sky in frame
};

export const DEBUG = new URLSearchParams(location.search).get("debug") === "1";
