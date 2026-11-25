'use strict';

/* Mission 01: Ashes of the Fleet. Hollow Moon.
   Kurai's first fight alone, among the wrecks of his fleet. Four waves of the Pyre's fighters,
   then Guren himself in the Redfang. Guren does not die: beaten, he runs.
   It is also where a new player learns to fly, so it is the gentlest of the four: see the waves. */
(function (SO) {
  const { line, akari, guren } = SO.missions;
  const W = SO.W;
  const H = SO.H;

  SO.missions.add({
    id: 'm01',
    number: 1,
    title: 'Ashes of the Fleet',
    place: 'Hollow Moon',
    storyBefore: 's01',
    objective: { type: 'waves', text: 'Break the Pyre squadron' },
    teach: true, // show how to fly as the mission opens (js/game/hud.js)
    backdrop: { seed: 7, image: 'hollowMoon', dim: 0.3, debris: 'wrecks' },

    intro: akari('Pyre scouts inbound, Captain. Weapons are free.'),

    chatter: {
      shieldDown: [akari('Shields are down, Captain!'), 'Shields are down! Dodge till they come back!'],
      shieldUp: ['Shields back up. Phew!', akari('Shields restored.')],
      hullLow: [akari('Hull is failing, Captain. One more good hit and we are stardust.')],
      repair: ['Patched up! Thank you, mystery crate!', 'Ooh, spare parts! Hull feels better already.'],
      waveClear: ['Wave down! Who\'s next?', 'That\'s how the Fleet flew!', akari('The sky is clear. For the moment.')],
      bossAngry: [guren('Tch. You have been practising.')],
      bossDown: [guren('My engine! ...Keep the tail, fox. For now.')],
      victory: ['He ran! The Fleet flies on!'],
    },

    victoryLines: {
      S: 'Barely a scratch on the Foxfire. The Fleet would be proud, Captain.',
      A: 'The sky is clear and the ship still sings. Onward!',
      B: 'A few new dents, one squadron fewer. Good trade.',
      C: 'Held together with hope and spare parts, but still flying!',
    },
    defeatLines: [
      'The last light of the Fleet flickers... but Kurai never quits.',
      'Ship down. Kurai is already asking for another go.',
    ],

    // The first mission is the one that teaches: each wave adds one thing, and nothing comes in a crowd.
    waves: [
      {
        // flying and shooting: the first two flights do not fire back
        name: 'Scouts',
        say: 'Scouts on the scope! Time to show them this fleet still has teeth!',
        spawns: [
          ...line('dart', { count: 4, at: 0, every: 0.34, y: 210, amp: 60, unarmed: true }),
          ...line('dart', { count: 4, at: 3.4, every: 0.34, y: 510, amp: 60, phase: Math.PI, unarmed: true }),
          { at: 6.4, say: akari('The next flight is armed, Captain. Keep moving and they will miss.') },
          ...line('dart', { count: 5, at: 7.2, every: 0.34, y: 360, amp: 140, fireEvery: [3.2, 5] }),
        ],
      },
      {
        // a ship that stays and shoots
        name: 'Pincer',
        say: akari('They are boxing us in, top and bottom. A gunship behind them.'),
        spawns: [
          ...line('dart', { count: 3, at: 0, every: 0.34, y: 150, amp: 46, fireEvery: [2.8, 4.4] }),
          ...line('dart', { count: 3, at: 0.17, every: 0.34, y: 570, amp: 46, phase: Math.PI, fireEvery: [2.8, 4.4] }),
          { at: 3.4, type: 'lancer', y: 250, holdX: W - 200, offset: -90, fireEvery: 2.6 },
          ...line('dart', { count: 4, at: 7.5, every: 0.32, y: 360, amp: 120, fireEvery: [2.8, 4.4] }),
          { at: 10.5, type: 'lancer', y: 470, holdX: W - 300, offset: 90, fireEvery: 2.6, drop: 'repair' },
        ],
      },
      {
        // a ship that rams, and the line that warns of it
        name: 'Interceptors',
        say: akari('Interceptors. They ram. Watch for the red line, then move.'),
        spawns: [
          { at: 0, type: 'striker', y: 220 },
          { at: 2.4, type: 'striker', y: 500 },
          ...line('dart', { count: 4, at: 4.4, every: 0.32, y: 360, amp: 130, fireEvery: [2.4, 4] }),
          { at: 7.6, type: 'striker', y: 360 },
          { at: 8.6, type: 'striker', y: 160 },
          { at: 10.6, type: 'lancer', y: 250, holdX: W - 220, offset: -90, fireEvery: 2.4, drop: 'repair' },
          ...line('dart', { count: 4, at: 13.5, every: 0.32, y: 300, amp: 140, phase: Math.PI, fireEvery: [2.4, 4] }),
          { at: 16, type: 'striker', y: 540 },
        ],
      },
      {
        // all three together
        name: 'Gun Line',
        say: 'Gunships forming a line. Break it before it breaks us!',
        spawns: [
          { at: 0, type: 'lancer', y: 180, holdX: W - 180, offset: -170, fireEvery: 2.3 },
          { at: 0.8, type: 'lancer', y: 540, holdX: W - 280, offset: 150, fireEvery: 2.3 },
          ...line('dart', { count: 5, at: 4.2, every: 0.3, y: 300, amp: 150, fireEvery: [2.2, 3.6] }),
          { at: 8.4, type: 'striker', y: 180 },
          { at: 9.4, type: 'striker', y: 540 },
          ...line('dart', { count: 3, at: 12, every: 0.32, y: 190, amp: 60, fireEvery: [2.2, 3.6] }),
          ...line('dart', { count: 3, at: 12.16, every: 0.32, y: 530, amp: 60, phase: Math.PI, fireEvery: [2.2, 3.6], dropLast: 'repair' }),
          { at: 15.5, type: 'lancer', y: 360, holdX: W - 230, offset: 0, fireEvery: 2.3 },
          ...line('dart', { count: 4, at: 18.5, every: 0.3, y: 360, amp: 160, fireEvery: [2.2, 3.6] }),
        ],
      },
      {
        // Beating the Redfang cancels whatever has not arrived yet, so this list runs long on purpose.
        name: 'The Redfang',
        music: 'boss',
        say: [guren('Enough. I will do it myself. Hold still, little fox.'), 'The Redfang! Akari, hang on to something!'],
        spawns: [
          { at: 1.2, type: 'redfang', y: H / 2, hp: 130, pace: 2.5 },
          ...line('dart', { count: 3, at: 12, every: 0.32, y: 250, amp: 110, fireEvery: [2.4, 4], dropLast: 'repair' }),
          { at: 20, type: 'striker', y: 200 },
          { at: 21.2, type: 'striker', y: 520 },
          ...line('dart', { count: 3, at: 29, every: 0.32, y: 470, amp: 110, phase: Math.PI, fireEvery: [2.4, 4], dropLast: 'repair' }),
          { at: 37, type: 'lancer', y: 560, holdX: W - 470, offset: 170, fireEvery: 2.6 },
          { at: 45, type: 'striker', y: 360 },
          ...line('dart', { count: 4, at: 52, every: 0.32, y: 360, amp: 150, fireEvery: [2.4, 4], dropLast: 'repair' }),
          { at: 60, type: 'striker', y: 250 },
          { at: 61.2, type: 'striker', y: 470 },
        ],
      },
    ],
  });
})(window.SO);
