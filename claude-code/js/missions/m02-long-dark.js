'use strict';

/* Mission 02: The Long Dark. The Shiver.
   New objective: escort. The lamplighters' barge, the Tinderbox, has to come through alive.
   New enemies: Torch bombers, which ignore Kurai and bomb the barge, and the Brander fire-ship.
   New place: an ice field, with ice in the way.
   Guren turns up for his prize in wave 4, watches what the Pyre does, and does not fire. */
(function (SO) {
  const { line, akari, guren } = SO.missions;
  const W = SO.W;

  SO.missions.add({
    id: 'm02',
    number: 2,
    title: 'The Long Dark',
    place: 'The Shiver',
    storyBefore: 's02',
    objective: { type: 'escort', ally: 'tinderbox', label: 'Tinderbox', text: 'Escort the Tinderbox through the Shiver' },
    backdrop: {
      seed: 21, image: 'shiver', dim: 0.45, debris: 'ice',
      sky: ['#04061a', '#0a1238', '#161c50'],
      nebula: ['#2a6fb0', '#3a3aa8', '#1a8a9a'],
      stars: ['#f8f3e0', '#f8f3e0', '#d6ecff', '#b8fbf5', '#bfe3ff'],
      planet: { x: 980, y: 700, r: 190, light: '#7fa8d8', dark: '#0a1238', ring: '#d6ecff' },
    },

    intro: akari('The Tinderbox is on our port side, Captain. Slow, unarmed, and carrying the last flame in the Reach.'),

    chatter: {
      shieldDown: [akari('Shields are down, Captain!'), 'No shields! Fly careful, fly fast!'],
      shieldUp: ['Shields are humming again!', akari('Shields restored.')],
      hullLow: [akari('Our hull is failing, Captain. The barge needs us in one piece.')],
      repair: ['Patched up! Hull feels better already.'],
      waveClear: ['Clear! How\'s our barge?', akari('Wave down. The Tinderbox is still with us.'), 'Nothing gets through!'],
      escortHit: [akari('The barge is hit!'), akari('Bomb on the Tinderbox!'), 'Sorry, Tinderbox! That one\'s on me!'],
      escortLow: [akari('The Tinderbox is breaking up, Captain! It cannot take much more!')],
      escortLost: [akari('The Tinderbox... Captain, it is gone.')],
      bossAngry: [akari('The Brander is burning. It is speeding up!')],
      branderHalf: [akari('It is halfway to the barge!')],
      branderClose: [akari('Captain! It is almost on them!')],
      bossDown: [guren('...Hmph. Do not look at me like that, fox.')],
      victory: [akari('The Tinderbox is clear of the Shiver. All hands safe.')],
    },

    victoryLines: {
      S: 'Not a scorch mark on the barge. The lamplighters are singing about you already.',
      A: 'The Kindling is safe and the barge is in one piece. The Reach has a chance.',
      B: 'Dented, smoking, and through. The lamplighters will take it.',
      C: 'The Tinderbox limps out of the ice with the flame still lit. Just.',
    },
    defeatLines: [
      'Without its escort, the Tinderbox does not last the night.',
      'The Foxfire is down, and the last flame in the Reach is alone in the ice.',
    ],
    failLines: {
      escort: 'The Tinderbox is lost, and the Kindling with it. The Reach stays dark.',
    },

    waves: [
      {
        name: 'Into the Ice',
        say: akari('Ice ahead. Shoot it or steer round it. The barge can plough through; we cannot.'),
        spawns: [
          { at: 0, type: 'ice', y: 150 },
          { at: 0.9, type: 'ice', y: 400 },
          ...line('dart', { count: 5, at: 1.5, every: 0.32, y: 230, amp: 70, fireEvery: [2.2, 3.6] }),
          { at: 2.4, type: 'ice', y: 280 },
          { at: 3.6, type: 'ice', y: 90 },
          { at: 4.8, type: 'ice', y: 350 },
          ...line('dart', { count: 5, at: 5.6, every: 0.32, y: 360, amp: 100, phase: Math.PI, fireEvery: [2.2, 3.6] }),
          { at: 6.6, type: 'ice', y: 200 },
          { at: 8, type: 'ice', y: 430 },
          ...line('dart', { count: 4, at: 9.4, every: 0.3, y: 170, amp: 60 }),
          { at: 10, type: 'ice', y: 310 },
        ],
      },
      {
        name: 'Torches',
        say: [
          akari('Torches. Bombers. They are flying straight past us, Captain: they want the barge.'),
          'Hit them before the drop! And if a bomb gets loose, shoot the bomb!',
        ],
        spawns: [
          { at: 0.5, type: 'torch', y: 180 },
          { at: 2.8, type: 'torch', y: 310 },
          { at: 3.4, type: 'ice', y: 420 },
          ...line('dart', { count: 4, at: 5.4, every: 0.3, y: 400, amp: 60 }),
          { at: 6.4, type: 'ice', y: 140 },
          { at: 7.6, type: 'torch', y: 130 },
          { at: 8.6, type: 'torch', y: 260 },
          { at: 10.5, type: 'ice', y: 340 },
          { at: 12, type: 'torch', y: 210 },
          ...line('dart', { count: 4, at: 12.6, every: 0.3, y: 330, amp: 80, phase: Math.PI }),
        ],
      },
      {
        name: 'Crossfire',
        say: akari('Gunships, to pin us down while the bombers work. Rude.'),
        spawns: [
          { at: 0, type: 'lancer', y: 200, holdX: W - 200, offset: -120 },
          { at: 0.7, type: 'lancer', y: 420, holdX: W - 320, offset: 70 },
          { at: 2.6, type: 'torch', y: 140 },
          { at: 4.2, type: 'torch', y: 290 },
          { at: 5, type: 'ice', y: 380 },
          { at: 6.4, type: 'striker', y: 300 },
          { at: 8.4, type: 'torch', y: 190, drop: 'repair' },
          ...line('dart', { count: 5, at: 10.2, every: 0.3, y: 260, amp: 120 }),
          { at: 11, type: 'ice', y: 120 },
          { at: 12.4, type: 'torch', y: 120 },
          { at: 13.2, type: 'torch', y: 320, drop: 'patch' },
          { at: 15, type: 'striker', y: 200 },
          { at: 15.7, type: 'striker', y: 400 },
        ],
      },
      {
        name: 'A Wolf at the Door',
        say: guren('There is my barge. Out of the way, fox. I am only here to...'),
        spawns: [
          { at: 0.4, ally: 'redfang', mode: 'watch', y: 150, unique: true },
          { at: 2, type: 'torch', y: 220 },
          { at: 2.8, type: 'torch', y: 330 },
          ...line('dart', { count: 5, at: 4.4, every: 0.3, y: 300, amp: 130 }),
          { at: 6.2, say: guren('...Bombs? The contract said capture. Who gave that order?!'), urgent: true },
          { at: 7.6, type: 'torch', y: 260 },
          { at: 8.4, type: 'torch', y: 380 },
          { at: 9.2, type: 'torch', y: 200 },
          { at: 10.4, type: 'lancer', y: 300, holdX: W - 300, offset: -60, drop: 'repair' },
          { at: 12.6, type: 'striker', y: 240 },
          { at: 13.3, type: 'striker', y: 420 },
          { at: 15, type: 'torch', y: 300 },
          { at: 15.8, type: 'torch', y: 210, drop: 'patch' },
          { at: 16.4, say: akari('Captain, the Redfang is not firing. On anyone.') },
        ],
      },
      {
        // Sinking the Brander cancels whatever has not arrived yet, so this list runs long on purpose.
        name: 'The Brander',
        music: 'boss',
        say: [
          akari('A Brander, Captain. A fire-ship. If its ram reaches the Tinderbox, it takes them both.'),
          'Then it doesn\'t reach!',
        ],
        spawns: [
          { at: 0, ally: 'redfang', mode: 'watch', y: 150, unique: true }, // still here, if the run began at this wave
          { at: 1, type: 'brander', y: 290 },
          { at: 9, type: 'torch', y: 130 },
          { at: 12, say: guren('That is not a capture. That is a pyre.') },
          ...line('dart', { count: 4, at: 15, every: 0.3, y: 180, amp: 70 }),
          { at: 21, type: 'torch', y: 150, drop: 'patch' },
          { at: 27, type: 'striker', y: 220 },
          { at: 32, type: 'torch', y: 120 },
          ...line('dart', { count: 4, at: 37, every: 0.3, y: 160, amp: 60, dropLast: 'repair' }),
          { at: 43, type: 'torch', y: 140 },
          { at: 44, type: 'torch', y: 200 },
        ],
      },
    ],
  });
})(window.SO);
