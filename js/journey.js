// Six open invitations. Original photos and world locations are preserved.
const photo = (file, caption) => ({ src: `assets/photos/${file}`, caption });
export const CHAPTERS = [
  { id: 'tower', place: 'Tower Hill', title: 'Once upon a you', icon: '✧', x: 0, z: -58,
    note: 'Before this little world, there was a little you. A whole lifetime of wonder was already beginning.',
    photos: [photo('01-toddler-garden.jpg', 'The littlest explorer — where it all began.'), photo('02-toddler-temple.jpg', 'Tiny feet on ancient stones.'), photo('03-girl-palms.jpg', 'Growing up under the palms.'), photo('04-toddler-field.jpg', 'Wild and free in the open field.')], gift: null },
  { id: 'forest', place: 'The Forest', title: 'Your wild, wonderful heart', icon: '❧', x: 72, z: -40,
    note: 'For your curiosity, your courage, and all the places that are still waiting to meet you.',
    photos: [photo('05-mountains.jpg', 'Standing tall with the mountains.'), photo('09-girl-bushes.jpg', 'A little wonder, everywhere you go.')], gift: null },
  { id: 'tavern', place: 'The Snuggly Duckling', title: 'The everyday magic', icon: '♡', x: 77, z: 37,
    note: 'The ordinary days deserve a place in the story, too. The little smiles. The silly moments. Just being you.',
    photos: [photo('07-glasses-selfie.jpg', 'That smile. Always a favorite.')], gift: null },
  { id: 'village', place: 'Corona Village', title: 'A little loveliness', icon: '❀', x: 0, z: 78,
    note: 'A little collection of beautiful moments, wrapped up just for you.',
    photos: [photo('08-whitesaree.jpg', 'Elegant in white.'), photo('10-greensaree-print.jpg', 'A favorite memory, framed forever.')], gift: null },
  { id: 'lake', place: 'The Lake', title: 'A wish for what comes next', icon: '≈', x: -36, z: 20,
    note: 'Take a breath by the water. Make a wish for this next chapter of your life. You can keep it just for yourself.',
    photos: [photo('06-greensaree.jpg', 'Grace in green.')], wish: true, gift: null },
  { id: 'festival', place: 'Lantern Festival', title: 'All of this, for you', icon: '✦', x: -45, z: -48,
    note: 'Happy birthday, my love. Every piece of your story is worth celebrating. I made this little world so you could wander, smile, and feel loved. — Jordan',
    photos: [], finale: true, gift: null },
];
export const PHOTOS = CHAPTERS.flatMap(c => c.photos.map(p => ({ ...p, chapter: c.id })));
const KEY = 'her-tangled-story-gifts-v1';
export function loadJourney(storage) {
  try {
    const data = JSON.parse(storage.getItem(KEY)) || {};
    return { opened: new Set((Array.isArray(data.opened) ? data.opened : []).filter(id => CHAPTERS.some(c => c.id === id))), last: CHAPTERS.some(c => c.id === data.last) ? data.last : 'tower' };
  } catch { return { opened: new Set(), last: 'tower' }; }
}
export function saveJourney(storage, state) {
  try { storage.setItem(KEY, JSON.stringify({ opened: [...state.opened], last: state.last })); return true; } catch { return false; }
}
