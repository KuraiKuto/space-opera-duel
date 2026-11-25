'use strict';

/* Mission 03: The Last Lantern. Meridian.
   New objective: relight. Three Snuffers are clamped on the Great Lantern; each one standing drains
   its light, and the mission is lost if the light runs out. Destroy all three.
   New enemies: Wardens (armoured; only hurt while they open to fire a beam) and the Snuffers themselves.
   New place: the Pyre's forge at Meridian.
   Guren flies as Kurai's wingman from wave 2. He would like it noted that he is not a wingman. */
(function (SO) {
  const { line, akari, guren } = SO.missions;
  const W = SO.W;
  const H = SO.H;

  // asked for in every wave from the second on, so he is there wherever a retry begins
  const wingman = { ally: 'redfang', mode: 'wing', unique: true };

  SO.missions.add({
    id: 'm03',
    number: 3,
    title: 'The Last Lantern',
    place: 'Meridian',
    storyBefore: 's03',
    storyAfter: 's04',
    objective: { type: 'relight', target: 'snuffer', total: 3, label: 'Lantern', text: 'Destroy the three Snuffers before the light runs out' },
    backdrop: {
      seed: 33, image: 'meridianDark', imageLit: 'meridianLit', dim: 0.5, lamp: { x: 0.794, y: 0.444 },
      debris: 'girders', embers: true, planet: null,
      sky: ['#12040e', '#2a0a1c', '#4a1420'],
      nebula: ['#a03a20', '#7a1c3c', '#b05a1c'],
      stars: ['#f8f3e0', '#ffd9b0', '#ffc9d0', '#ffd35c'],
    },

    intro: akari('Meridian, Captain. The Lantern is still breathing. Barely.'),

    chatter: {
      shieldDown: [akari('Shields are down, Captain!'), guren('Your shields are gone, fox. Try dodging.')],
      shieldUp: ['Shields back up. Phew!', akari('Shields restored.')],
      hullLow: [akari('Hull is failing, Captain!'), guren('Do NOT die before I am paid.')],
      repair: ['Patched up! Thank you, Pyre spare parts!'],
      waveClear: ['Wave down! Keep going!', akari('Forge line broken.'), guren('Is that all they have?')],
      targetDown: [akari('Snuffer destroyed! The Lantern is catching!'), guren('One clamp less. My money had better be behind the next one.')],
      lightLow: [akari('Captain, the Lantern is almost out! Break that clamp, now!')],
      darkLost: [akari('The light is gone, Captain. Meridian is dark.')],
      bossAngry: [akari('Its furnace is cracking. Keep hitting it!'), guren('It is coming apart! Do not stop!')],
      victory: [akari('The Lantern is lit! ...Captain. What is that, in the sky?')],
    },

    victoryLines: {
      S: 'Three clamps, no scratches, and a thousand years of light back in the sky.',
      A: 'The Great Lantern burns again. All across the Reach, people look up.',
      B: 'Singed and smoking, the Foxfire flies through the Lantern\'s light.',
      C: 'It was close. The light had almost gone. But almost is not gone.',
    },
    defeatLines: [
      'The Foxfire falls at the gates of Meridian. The Lantern waits in the dark.',
      'So close to the light. Kurai is already asking for another go.',
    ],
    failLines: {
      dark: 'The Snuffers drank the last of the light. Meridian is dark, and the lanes with it.',
    },

    waves: [
      {
        name: 'The Forge Line',
        say: akari('Wardens. Blasters bounce off that armour. Wait until they open up to fire, then hit the lens. And do not stand in the beam.'),
        spawns: [
          ...line('dart', { count: 5, at: 0, every: 0.3, y: 220, amp: 80 }),
          { at: 2.6, type: 'warden', y: 200, holdX: W - 230, offset: -50 },
          ...line('dart', { count: 4, at: 5.4, every: 0.3, y: 480, amp: 70, phase: Math.PI }),
          { at: 7.4, type: 'warden', y: 500, holdX: W - 340, offset: 70 },
          { at: 10.5, type: 'striker', y: 300 },
          ...line('dart', { count: 5, at: 12, every: 0.3, y: 360, amp: 140 }),
        ],
      },
      {
        // Each Snuffer's death cancels the rest of its wave, so these lists run long on purpose.
        name: 'The First Clamp',
        music: 'boss',
        say: [guren('Do not get excited. I am here for my money.'), 'Whatever you say, wingman!'],
        spawns: [
          Object.assign({ at: 0.3 }, wingman),
          { at: 1, type: 'snuffer', y: 240, hp: 110 },
          { at: 3.5, say: akari('Its plating is too thick, Captain. Aim for the furnace, between the jaws.') },
          ...line('dart', { count: 4, at: 4.5, every: 0.3, y: 500, amp: 70 }),
          { at: 8, type: 'striker', y: 430 },
          { at: 9, type: 'striker', y: 570 },
          ...line('dart', { count: 5, at: 13, every: 0.3, y: 520, amp: 80, phase: Math.PI }),
          { at: 18, type: 'lancer', y: 540, holdX: W - 400, offset: 170 },
          { at: 24, type: 'striker', y: 480 },
          ...line('dart', { count: 4, at: 28, every: 0.3, y: 540, amp: 60, dropLast: 'repair' }),
          { at: 34, type: 'warden', y: 520, holdX: W - 420, offset: 120 },
          { at: 40, type: 'striker', y: 560 },
          ...line('dart', { count: 5, at: 45, every: 0.3, y: 500, amp: 90 }),
        ],
      },
      {
        name: 'The Second Clamp',
        music: 'boss',
        say: akari('Second Snuffer, low on the ring. And it has brought Wardens.'),
        spawns: [
          Object.assign({ at: 0 }, wingman),
          { at: 1, type: 'snuffer', y: 490, hp: 125 },
          { at: 2.6, type: 'warden', y: 180, holdX: W - 330, offset: -40 },
          ...line('dart', { count: 5, at: 5, every: 0.3, y: 180, amp: 80 }),
          { at: 12, type: 'striker', y: 150 },
          { at: 15, type: 'warden', y: 300, holdX: W - 440, offset: 60 },
          ...line('dart', { count: 4, at: 18, every: 0.3, y: 200, amp: 100, phase: Math.PI, dropLast: 'repair' }),
          { at: 24, type: 'lancer', y: 180, holdX: W - 400, offset: -170 },
          { at: 30, type: 'striker', y: 220 },
          { at: 34, type: 'warden', y: 240, holdX: W - 380, offset: -80 },
          ...line('dart', { count: 5, at: 40, every: 0.3, y: 200, amp: 90 }),
          { at: 46, type: 'striker', y: 160 },
        ],
      },
      {
        name: 'Furnace Guard',
        say: [akari('The forge is emptying its hangars. Bombers, too: this time the bombs are for us.'), guren('Good. I was getting bored.')],
        spawns: [
          Object.assign({ at: 0 }, wingman),
          { at: 0, type: 'torch', y: 170 },
          { at: 1, type: 'torch', y: 430 },
          { at: 2.8, type: 'lancer', y: 220, holdX: W - 200, offset: -100 },
          { at: 3.5, type: 'lancer', y: 500, holdX: W - 310, offset: 100, drop: 'repair' },
          { at: 6.4, type: 'striker', y: 200 },
          { at: 7.2, type: 'striker', y: 520 },
          { at: 8, type: 'striker', y: 360 },
          ...line('dart', { count: 6, at: 9.6, every: 0.28, y: 360, amp: 160 }),
          { at: 12.5, type: 'torch', y: 250 },
          { at: 13.5, type: 'torch', y: 480 },
          { at: 14.5, type: 'warden', y: 360, holdX: W - 260, offset: 0 },
        ],
      },
      {
        name: 'The Keystone',
        music: 'boss',
        say: [akari('The last one is the Keystone, Captain. Break it and the Lantern is free.'), 'Everything we\'ve got, Guren!'],
        spawns: [
          Object.assign({ at: 0 }, wingman),
          { at: 1, type: 'snuffer', y: H / 2, hp: 165, name: 'Keystone Snuffer' },
          { at: 3, type: 'warden', y: 160, holdX: W - 360, offset: -150 },
          { at: 4.2, type: 'warden', y: 560, holdX: W - 360, offset: 150 },
          ...line('dart', { count: 4, at: 8.5, every: 0.3, y: 200, amp: 80, dropLast: 'repair' }),
          { at: 13, type: 'striker', y: 180 },
          { at: 14, type: 'striker', y: 540 },
          { at: 18.5, type: 'torch', y: 150 },
          ...line('dart', { count: 4, at: 23, every: 0.3, y: 520, amp: 80, phase: Math.PI, dropLast: 'repair' }),
          { at: 28, type: 'warden', y: 360, holdX: W - 430, offset: 90 },
          { at: 33, type: 'striker', y: 300 },
          { at: 34, type: 'striker', y: 460 },
          ...line('dart', { count: 5, at: 39, every: 0.3, y: 360, amp: 150 }),
          { at: 45, type: 'torch', y: 200 },
          { at: 46, type: 'torch', y: 500, drop: 'repair' },
          ...line('dart', { count: 5, at: 52, every: 0.3, y: 300, amp: 150 }),
        ],
      },
    ],
  });
})(window.SO);
