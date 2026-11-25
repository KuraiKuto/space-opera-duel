'use strict';

/* "Totality", the Eclipse's own music, in C minor. The tune is Kagari's: it circles one note
   like a moth round a lamp (G, A flat, G, and down). Its layers follow the fight
   (js/game/enemies-eclipse.js), and the story scenes use the lowest one for dread:

     level 0   a drone, a tolling bell and a slow heartbeat: the dark (phase 2), and the story
     level 1   bass, arpeggio and kettledrums: the Eclipse arriving
     level 2   the tune and the rest of the drums: phase 1

   Phase 3 does not belong to her: the main theme takes over ('finale', in theme.js). */
(function (SO) {
  const REST = '................';
  const bars = (first, count) => [first].concat(Array(count - 1).fill(REST)).join('|');

  const tuneA = 'g5:4 ab5:2 g5:2 eb5:8 | d5:4 eb5:2 d5:2 c5:8 | c5:4 eb5:4 ab5:6 g5:2 | eb5:8 c5:8 | ' +
                'ab5:4 bb5:2 ab5:2 f5:8 | g5:4 ab5:2 g5:2 f5:8 | g5:4 b5:4 d6:8 | d6:4 c6:4 b5:4 g5:4';
  const tuneB = 'c5:4 eb5:4 ab5:8 | d5:4 f5:4 bb5:8 | c6:6 bb5:2 g5:8 | eb5:4 g5:4 c6:8 | ' +
                'c6:6 ab5:2 eb5:8 | d6:6 bb5:2 f5:8 | g5:4 b5:4 d6:4 g6:4 | g6:8 d6:4 b5:4';

  const march = {
    drone: 'x---------------',
    pulse: 'x..x............',
    bass: 'r.r.r.r.r.r.r.rR',
    arp: '0120012001232120',
    kick: 'x.....x.x.......',
    timp: '........x.....x.',
    snare: '....x.......x...|....x.......x...|....x.......x...|....x.......x.xx',
    hat: 'x.x.x.x.x.x.x.x.',
    crash: bars('X...............', 8),
  };

  SO.music.add({
    id: 'eclipse',
    alone: 2.5,
    bpm: 120,
    echo: 0.75,
    form: ['a', 'a', 'b'],
    channels: {
      drone: { plays: 'chords', patch: 'drone', gain: 0.75, verb: 0.5, low: 48 },
      toll: { plays: 'tune', patch: 'toll', gain: 0.8, verb: 0.6 },
      pulse: { plays: 'drum', patch: 'pulse', gain: 0.5, layer: [0, 0] },
      bass: { plays: 'bass', patch: 'bass', gain: 0.6, low: 36, layer: 1 },
      arp: { plays: 'arp', patch: 'pluck', gain: 0.6, echo: 0.3, low: 60, pan: -0.3, layer: 1 },
      kick: { plays: 'drum', patch: 'kick', gain: 0.6, layer: 1 },
      timp: { plays: 'drum', patch: 'timp', gain: 0.45, verb: 0.3, layer: 1 },
      lead: { plays: 'tune', patch: 'lead', gain: 0.9, echo: 0.3, verb: 0.3, layer: 2 },
      high: { plays: 'tune', patch: 'bell', gain: 0.35, octave: 1, verb: 0.5, pan: 0.3, layer: 2 },
      snare: { plays: 'drum', patch: 'snare', gain: 0.8, verb: 0.25, layer: 2 },
      hat: { plays: 'drum', patch: 'hat', gain: 0.4, pan: 0.2, layer: 2 },
      crash: { plays: 'drum', patch: 'crash', gain: 0.55, verb: 0.3, layer: 2 },
    },
    sections: {
      a: Object.assign({
        chords: 'Cm Cm Ab Ab Fm Fm G G',
        lead: tuneA,
        high: tuneA,
        toll: 'c3:16 | _:16 | ab2:16 | _:16 | f2:16 | _:16 | g2:16 | _:16',
      }, march),
      b: Object.assign({
        chords: 'Ab Bb Cm Cm Ab Bb G G',
        lead: tuneB,
        high: tuneB,
        toll: 'ab2:16 | bb2:16 | c3:16 | _:16 | ab2:16 | bb2:16 | g2:16 | g2:16',
      }, march),
    },
  });
})(window.SO);
