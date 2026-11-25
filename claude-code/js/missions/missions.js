'use strict';

/* Mission list. Each mission file calls SO.missions.add({...}); the order of the
   script tags in index.html is the order of the campaign.

   A mission:
     id, number, title, place
     storyBefore / storyAfter   ids of the dialogue scenes around it (js/story)
     objective  what is asked, beyond clearing the waves (js/game/objectives.js); its text shows under the title
     backdrop   options for js/art/backdrop.js
     music      the song that plays (js/audio/songs); 'battle' if the mission names none
     teach      true to show the controls along the bottom of the screen as the mission opens
     intro      radio line(s) as the mission opens
     chatter    radio lines picked at random, by kind:
                  shieldDown, shieldUp, hullLow, repair, waveClear, bossAngry, bossDown, victory
                  escortHit, escortLow, escortLost     (escort objective)
                  targetDown, lightLow, darkLost       (relight objective)
                  fleetHit, fleetLow, shipDown, fleetLost, capitalDown   (fleet objective, capital ships)
                  and the Eclipse's own, listed in js/missions/m04-lights-on.js
                An entry may be a list of lines: they are said one after another.
     victoryLines / defeatLines / failLines   text for the end screens (failLines by reason: escort, dark, fleet)
     waves      [{ name, say, spawns: [...] }]
                every wave after the first is a checkpoint: a mission lost in wave 3 is retried from wave 3.
                A wave can name its retry button (retry: 'Retry from the Eclipse'). Because a run can start
                at any wave, a ship that stays for several waves is asked for in each of them, with
                unique: true (see the wingman in js/missions/m04-lights-on.js).
                a wave may name its own song (music: 'boss'), and how much of it plays (level: 0 to 2;
                js/game/director.js picks 1, and 2 for the last wave)
                a spawn is an enemy   { at, type, y, ...overrides, drop }
                or an event           { at, say } / { at, ally, mode } / { at, dismiss }
                                      (ally with unique: true does nothing if that ship is already here)
                at = seconds after the wave starts; type = a key of SO.enemies.TYPES

   A radio line is plain text when Kurai says it, or akari('...') / guren('...') / kagari('...') for the others. */
(function (SO) {
  const list = [];
  const byId = {};

  SO.missions = {
    list,

    add(mission) {
      list.push(mission);
      byId[mission.id] = mission;
    },

    get(id) { return byId[id] || null; },
    first() { return list[0]; },
    next(id) {
      const i = list.indexOf(byId[id]);
      return i >= 0 && i + 1 < list.length ? list[i + 1] : null;
    },

    /* Radio lines from the rest of the cast. */
    kurai(text) { return { who: 'kurai', text }; },
    akari(text) { return { who: 'akari', text }; },
    guren(text) { return { who: 'guren', text }; },
    kagari(text) { return { who: 'kagari', text }; },

    /* Spawn helper: several of the same enemy, one after another.
       line('dart', { count: 5, at: 2, every: 0.3, y: 200 }) -> five darts from t = 2s, 0.3s apart.
       stepY shifts each one down; dropLast gives the last one a pickup; everything else is passed through. */
    line(type, options) {
      const spawns = [];
      const o = Object.assign({ count: 1, at: 0, every: 0.3, stepY: 0 }, options);
      for (let i = 0; i < o.count; i++) {
        const spawn = Object.assign({}, options, { type, at: o.at + i * o.every, y: o.y + i * o.stepY });
        delete spawn.count;
        delete spawn.every;
        delete spawn.stepY;
        delete spawn.dropLast;
        if (o.dropLast && i === o.count - 1) spawn.drop = o.dropLast;
        spawns.push(spawn);
      }
      return spawns;
    },
  };
})(window.SO);
