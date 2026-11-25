'use strict';

/* The two endings of a mission. Neither loops (loop: false); each is played once, and the mission
   scene says what comes after (js/scenes/mission.js).

     victory   Kurai's call run up to the top and brought home, in D major. It starts as the mission
               is won; the last chord lands as the victory screen appears.
     defeat    the same call, slow and in D minor, falling instead of rising */
(function (SO) {
  SO.music.add({
    id: 'victory',
    bpm: 150,
    echo: 0.75,
    loop: false,
    tail: 2.5,
    form: ['fanfare'],
    channels: {
      lead: { plays: 'tune', patch: 'lead', gain: 1.0, echo: 0.2, verb: 0.35 },
      high: { plays: 'tune', patch: 'bell', gain: 0.45, octave: 1, verb: 0.5, pan: 0.25 },
      pad: { plays: 'chords', patch: 'strings', gain: 0.8, verb: 0.45, low: 57 },
      bass: { plays: 'bass', patch: 'bass', gain: 0.6, low: 33, gate: 0.95 },
      timp: { plays: 'drum', patch: 'timp', gain: 0.6, verb: 0.3 },
      snare: { plays: 'drum', patch: 'snare', gain: 0.7, verb: 0.2 },
      crash: { plays: 'drum', patch: 'crash', gain: 0.6, verb: 0.3 },
    },
    sections: {
      fanfare: {
        chords: 'D G,A D D',
        lead: 'a4:2 d5:2 f#5:2 a5:2 d6:6 _:2 | b5:2 b5:1 b5:1 d6:4 c#6:2 c#6:1 c#6:1 e6:4 | d6:16 | _:16',
        high: 'a4:2 d5:2 f#5:2 a5:2 d6:6 _:2 | b5:2 b5:1 b5:1 d6:4 c#6:2 c#6:1 c#6:1 e6:4 | d6:16 | _:16',
        pad: 'x---------------',
        bass: 'r.r.r.r.r---r---|r---r---r---r---|r---------------|----------------',
        timp: 'x.....x.x.......|x...x...x...x.xx|X...............|................',
        snare: '............x.xx|x.x.x.xxx.x.xxxx|................|................',
        crash: 'x...............|................|X...............|................',
      },
    },
  });

  SO.music.add({
    id: 'defeat',
    bpm: 92,
    echo: 0.75,
    loop: false,
    tail: 3,
    form: ['fall'],
    channels: {
      bell: { plays: 'tune', patch: 'bell', gain: 1.1, echo: 0.3, verb: 0.6 },
      pad: { plays: 'chords', patch: 'pad', gain: 1.0, verb: 0.6, low: 55 },
      bass: { plays: 'bass', patch: 'sub', gain: 0.5, low: 33 },
    },
    sections: {
      fall: {
        chords: 'Dm Bb Gm,A Dm',
        bell: 'a4:4 d5:4 f5:6 e5:2 | d5:8 bb4:8 | g4:4 bb4:4 a4:8 | d4:16',
        pad: 'x---------------',
        bass: 'r---------------',
      },
    },
  });
})(window.SO);
