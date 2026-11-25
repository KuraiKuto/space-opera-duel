'use strict';

/* Mission 04: Lights On. Under the Eclipse. The last mission.
   New objective: fleet. Two capital ships, the Vigil and the Marigold, hold the line behind Kurai and
   trade shells with the Pyre's; the mission is lost if both are destroyed.
   New enemies: Cinder battleships, and the Eclipse, a boss in three phases
   (js/game/enemies-eclipse.js describes each and what Guren does in them).
   New place: the sky over Meridian, with the rest of the battle going on far off.
   Every wave is a checkpoint, as in every mission, and so is each phase of the Eclipse.

   Radio lines the Eclipse asks for, besides the usual ones:
     corona, batteryDown                       phase 1
     totality, vanes, dusk, gurenHit, vaneDown  phase 2
     dawn, inhale, brace, bossAngry            phase 3
     lastStand, ram, open, dying               the end */
(function (SO) {
  const { line, akari, guren, kagari } = SO.missions;
  const W = SO.W;
  const H = SO.H;

  const wingman = { ally: 'redfang', mode: 'wing', unique: true };

  SO.missions.add({
    id: 'm04',
    number: 4,
    title: 'Lights On',
    place: 'Under the Eclipse',
    storyBefore: 's05',
    storyAfter: 's06',
    objective: { type: 'fleet', ships: ['vigil', 'marigold'], label: 'Fleet', text: 'Hold the line, and break the Eclipse' },
    backdrop: {
      seed: 44, image: 'eclipseSky', imageLit: 'reachLit', dim: 0.28,
      debris: null, embers: true, battle: true, planet: null,
      sky: ['#04081c', '#0a1438', '#1a1030'],
      nebula: ['#1a5a9a', '#3a2a80', '#a04a20'],
      stars: ['#f8f3e0', '#f8f3e0', '#b8fbf5', '#ffd9b0', '#ffd35c'],
    },

    intro: akari('The Vigil and the Marigold are in line behind us, Captain.'),

    chatter: {
      shieldDown: [akari('Shields are down, Captain!'), guren('No shields, fox. Stop catching things.')],
      shieldUp: ['Shields back up. Phew!', akari('Shields restored.')],
      hullLow: [akari('Hull is failing, Captain! The fleet needs its fox!'), guren('Do NOT die now. I have just started to like the odds.')],
      repair: ['Patched up! Thank you, Pyre spare parts!'],
      waveClear: ['Line holding! Who\'s next?', akari('Their line is thinning, Captain.'), guren('Is that all a battle fleet buys these days?')],
      fleetHit: [akari('Shells on the fleet!'), akari('The line is taking hits, Captain!'), 'Hang on, Fleet! I\'m on it!'],
      fleetLow: [akari('Captain, one of ours is burning! Break those guns!')],
      shipDown: [akari('We have lost a ship, Captain. Her crew is in the boats. One left in the line.')],
      fleetLost: [akari('The line is gone, Captain. There is nobody left to hold it.')],
      capitalDown: [akari('Battleship down! The Vigil sends her compliments.'), guren('That one owed me money.'), 'One Cinder fewer! Keep firing, Fleet!'],

      corona: [[kagari('There you are, little fox. Come closer. Everything does, in the end.'), akari('Its hull is too thick, Captain. Take out the guns on its rim.')]],
      batteryDown: [akari('Battery destroyed!'), guren('One gun less. Keep going.'), 'Got one!'],
      totality: [kagari('Enough. Let there be dark.')],
      vanes: [[guren('Three shade vanes, round the maw. I light one, you break it. Follow my light, fox.'), 'Lead the way, lamplighter!']],
      dusk: [guren('Duskwings. They go for the light, and the light is ME. Keep them off!'), akari('Drones, Captain, making for Guren. If one reaches him, his light goes out.'), akari('I cannot see the fleet, Captain. Only him. Keep him lit.')],
      gurenHit: [guren('Gah! I said keep them OFF me!'), guren('My light! ...Give me a moment.')],
      vaneDown: [guren('That is one. Next!'), akari('Vane destroyed. I can almost see the fleet.'), guren('Good shot. Do not tell anyone I said so.')],
      dawn: [[guren('Lights on!'), 'Hey! That\'s MY line!', akari('It has to open its maw to feed, Captain. Hit the core while it does.')]],
      inhale: [akari('It is pulling us in! The core is open: fire!'), 'Whoa! Full reverse! ...And fire!', akari('The maw is open, Captain. Now!')],
      brace: [akari('It is breathing out. Get clear of the middle!'), guren('Out of its way, fox!')],
      bossAngry: [kagari('You are spoiling my appetite, little fox!')],
      lastStand: [kagari('Then I will have one last light. YOURS, little fox!')],
      ram: [guren('Not that one. FOX! This makes us EVEN!')],
      open: [[akari('He went through its jaw! The core is wide open, Captain. One shot.'), guren('...Well? FIRE, you ridiculous fox!')]],
      dying: [kagari('No. No! It is so... bright...')],
      victory: [akari('The Eclipse is gone, Captain. The light is coming back. All of it.')],
    },

    victoryLines: {
      S: 'Both ships in the line, barely a scratch on the Foxfire, and every Lantern in the Reach coming back on.',
      A: 'The Eclipse is broken and the line held. All across the Reach, the dark is going out.',
      B: 'Battered, smoking and victorious. The Fleet has flown worse, but never better.',
      C: 'It took everything the Fleet had. It was enough. The light is coming back.',
    },
    defeatLines: [
      'The Foxfire goes dark under the Eclipse. Somewhere behind her, the Fleet is still firing.',
      'Ship down. Kurai is already asking for another go. So, loudly, is Guren.',
    ],
    failLines: {
      fleet: 'The Vigil and the Marigold are gone, and the line with them. Nothing stands between the Eclipse and the Lantern.',
    },

    waves: [
      {
        name: 'Line of Battle',
        say: 'Fleet, this is Foxfire. Nothing gets past the fox!',
        spawns: [
          Object.assign({ at: 0.3 }, wingman),
          ...line('dart', { count: 4, at: 0.6, every: 0.32, y: 470, amp: 80, fireEvery: [2.2, 3.6] }),
          { at: 4, type: 'cinder', y: 180, name: 'Cinder Ashfall' },
          { at: 5.5, urgent: true, say: akari('Battleship! Those lines are its shells, bound for the fleet. Stay out of them, and break it.') },
          ...line('dart', { count: 4, at: 9, every: 0.32, y: 500, amp: 80, phase: Math.PI, fireEvery: [2.2, 3.6] }),
          { at: 13, type: 'lancer', y: 500, holdX: W - 330, offset: 110 },
          { at: 17, type: 'striker', y: 420 },
          { at: 18.2, type: 'striker', y: 560 },
          ...line('dart', { count: 4, at: 22, every: 0.32, y: 470, amp: 110, fireEvery: [2.2, 3.6], dropLast: 'repair' }),
          { at: 27, type: 'torch', y: 420, dropX: 640 },
          { at: 28.5, type: 'torch', y: 540, dropX: 600 },
          { at: 33, type: 'lancer', y: 520, holdX: W - 420, offset: 150 },
          ...line('dart', { count: 4, at: 37, every: 0.32, y: 500, amp: 90, phase: Math.PI, fireEvery: [2.2, 3.6] }),
        ],
      },
      {
        name: 'Torches',
        say: [akari('Bombers, Captain, after the fleet. Hit them before the drop.'), guren('I will take the high ones. Try not to shoot me.')],
        spawns: [
          Object.assign({ at: 0 }, wingman),
          { at: 0.5, type: 'torch', y: 180, dropX: 660 },
          { at: 1.6, type: 'torch', y: 470, dropX: 620 },
          { at: 3.2, type: 'striker', y: 320 },
          ...line('dart', { count: 4, at: 4.6, every: 0.3, y: 300, amp: 120 }),
          { at: 6.5, type: 'torch', y: 250, dropX: 640 },
          { at: 7.6, type: 'torch', y: 540, dropX: 600 },
          { at: 9.5, type: 'warden', y: 360, holdX: W - 280, offset: 40 },
          { at: 12, type: 'torch', y: 160, dropX: 680 },
          { at: 13, type: 'torch', y: 420, dropX: 620, drop: 'patch' },
          { at: 14.5, type: 'striker', y: 200 },
          { at: 15.3, type: 'striker', y: 520 },
          ...line('dart', { count: 5, at: 17.5, every: 0.3, y: 400, amp: 130, phase: Math.PI, dropLast: 'repair' }),
        ],
      },
      {
        name: 'Broadsides',
        level: 2,
        say: [akari('Two battleships, Captain, high and low.'), 'Fleet, pick one! I\'ve got the other!'],
        spawns: [
          Object.assign({ at: 0 }, wingman),
          { at: 0.5, type: 'cinder', y: 170, name: 'Cinder Kiln', drop: 'patch' },
          { at: 2.5, type: 'cinder', y: 548, holdX: W - 270, name: 'Cinder Scorch', drop: 'repair' },
          ...line('dart', { count: 5, at: 5, every: 0.3, y: 360, amp: 110 }),
          { at: 9, type: 'striker', y: 300 },
          { at: 10, type: 'striker', y: 430 },
          { at: 13, type: 'torch', y: 330, dropX: 640 },
          { at: 14.5, type: 'lancer', y: 360, holdX: W - 480, offset: 0 },
          ...line('dart', { count: 5, at: 19, every: 0.3, y: 360, amp: 130, phase: Math.PI, dropLast: 'repair' }),
          { at: 24, type: 'torch', y: 380, dropX: 620 },
          { at: 25, type: 'striker', y: 360 },
          { at: 30, type: 'warden', y: 360, holdX: W - 500, offset: 0, drop: 'patch' },
        ],
      },
      {
        // The Eclipse runs its own fight from here: its phases, its fighters and Guren's part are in
        // js/game/enemies-eclipse.js. The wave ends when it does.
        name: 'The Eclipse',
        retry: 'Retry from the Eclipse',
        music: 'eclipse', // her song, building as she arrives; the boss itself takes it from there
        level: 1,
        say: akari('Captain. It is here.'),
        spawns: [
          Object.assign({ at: 0 }, wingman),
          { at: 1.2, type: 'eclipse', y: H / 2 },
        ],
      },
    ],
  });
})(window.SO);
