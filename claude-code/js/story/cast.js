'use strict';

/* The cast. Story scenes and the in-flight radio both look characters up here.

   moods     picture for each mood: a key of the manifest in js/core/assets.js
   mood      the mood used when a line does not name one
   faces     the square of each picture that holds the face, for round radio portraits
             (x, y, size as fractions of the picture)
   foot      how far down the picture the feet are (0..1), so everyone stands on the same line
   voice     pitch of the typing blip
   color     name tags, frames and radio bubbles
   bridge    'left' or 'right': where they stand on the Foxfire's bridge in story scenes.
             Anyone without it is not aboard, and appears on the comm screen instead:
   call      the caption under their comm screen, and callBg its two background colours */
(function (SO) {
  const pal = SO.pal;

  SO.cast = {
    kurai: {
      name: 'Kurai',
      role: 'Captain of the Foxfire',
      color: pal.cyan,
      nameInk: '#0a8a84',
      voice: 1,
      mood: 'steady',
      bridge: 'left',
      moods: { cheer: 'kurai', steady: 'kuraiSteady', alarm: 'kuraiAlarm' },
      faces: {
        cheer: { x: 0.203, y: 0.07, size: 0.594 },
        steady: { x: 0.203, y: 0.07, size: 0.594 },
        alarm: { x: 0.203, y: 0.113, size: 0.594 },
      },
      foot: 0.895,
    },

    akari: {
      name: 'Akari',
      role: 'First officer',
      color: pal.gold,
      nameInk: '#9a6a00',
      voice: 0.8,
      mood: 'calm',
      bridge: 'right',
      moods: { calm: 'akari', alarm: 'akariAlarm', smile: 'akariSmile' },
      faces: {
        calm: { x: 0.235, y: 0.105, size: 0.53 },
        alarm: { x: 0.235, y: 0.105, size: 0.53 },
        smile: { x: 0.235, y: 0.105, size: 0.53 },
      },
      foot: 0.934,
    },

    guren: {
      name: 'Guren',
      role: 'Captain of the Redfang',
      color: pal.red,
      nameInk: pal.redDark,
      voice: 0.58,
      mood: 'smirk',
      call: 'Redfang on call',
      callBg: ['#5a1430', '#1d0714'],
      moods: { smirk: 'guren', angry: 'gurenAngry', grin: 'gurenGrin' },
      faces: {
        smirk: { x: 0.225, y: 0.0975, size: 0.53 },
        angry: { x: 0.225, y: 0.0975, size: 0.53 },
        grin: { x: 0.223, y: 0.115, size: 0.53 },
      },
      foot: 0.957,
    },

    kagari: {
      name: 'Kagari',
      role: 'Grand Admiral of the Pyre',
      color: pal.orange,
      nameInk: '#a8500c',
      voice: 0.44,
      mood: 'calm',
      call: 'The Eclipse on call',
      callBg: ['#4a2408', '#140608'],
      moods: { calm: 'kagari', rage: 'kagariRage' },
      faces: {
        calm: { x: 0.228, y: 0.135, size: 0.53 },
        rage: { x: 0.246, y: 0.19, size: 0.53 },
      },
      foot: 0.961,
    },
  };

  /* The picture for a character in a mood, or null while it is missing. */
  SO.cast.image = function (who, mood) {
    const c = SO.cast[who];
    if (!c) return null;
    return SO.assets.images[c.moods[mood] || c.moods[c.mood]] || SO.assets.images[c.moods[c.mood]] || null;
  };

  /* Draw a character's face in a circle of radius r around the origin (the caller clips). */
  SO.cast.drawFace = function (ctx, who, mood, r) {
    const c = SO.cast[who];
    if (!c) return;
    if (!c.moods[mood]) mood = c.mood;
    const img = SO.assets.images[c.moods[mood]];
    if (!img) return;
    const f = c.faces[mood];
    ctx.drawImage(img, f.x * img.width, f.y * img.height, f.size * img.width, f.size * img.width, -r, -r * 0.94, r * 2, r * 2);
  };
})(window.SO);
