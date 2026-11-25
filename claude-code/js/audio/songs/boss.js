'use strict';

/* "Pyre", for the ships with a name and a health bar: Guren's Redfang, the Brander, the Snuffers.
   E minor with the flattened second (the F under the riff) that makes it sound like a threat.
   Heavier and slower-footed than the battle song: the snare lands once a bar in the riff (r, a)
   and twice in the push (b). Level 2 adds a second voice an octave up. */
(function (SO) {
  const REST = '................';
  const bars = (first, count) => [first].concat(Array(count - 1).fill(REST)).join('|');

  const tuneA = 'e5:6 g5:2 b5:4 a5:2 g5:2 | a5:6 f5:2 c5:8 | e5:6 g5:2 b5:4 d6:2 b5:2 | c6:6 a5:2 f5:8 | ' +
                'd6:6 b5:2 g5:8 | c6:6 a5:2 f5:8 | e5:4 g5:4 b5:4 e6:4 | d#6:8 b5:4 f#5:4';
  const tuneB = 'e5:4 g5:4 c6:8 | d6:6 a5:2 f#5:8 | e5:4 g5:4 b5:4 e6:4 | e6:8 b5:8 | ' +
                'e6:6 c6:2 g5:8 | f#5:4 a5:4 d6:8 | d#6:6 b5:2 f#5:8 | b5:4 a5:4 f#5:4 d#5:4';

  const heavy = {
    pad: 'x---------------',
    arp: '0.0.2.0.3.0.2.0.',
    bass: 'r..r..r.r..r..rR',
    kick: 'x..x..x...x.....|x..x..x...x...x.',
    snare: '........x.......|........x.......|........x.......|........x...x.xx',
    hat: 'x.x.x.x.x.x.x.x.',
  };

  SO.music.add({
    id: 'boss',
    bpm: 138,
    echo: 0.75,
    form: ['r', 'a', 'a', 'b'],
    channels: {
      lead: { plays: 'tune', patch: 'lead', gain: 1.0, echo: 0.28, verb: 0.25 },
      high: { plays: 'tune', patch: 'pluck', gain: 0.35, octave: 1, echo: 0.2, pan: 0.3, layer: 2 },
      pad: { plays: 'chords', patch: 'strings', gain: 0.75, verb: 0.3, low: 52 },
      arp: { plays: 'arp', patch: 'pluck', gain: 0.65, echo: 0.3, low: 64, pan: -0.3 },
      bass: { plays: 'bass', patch: 'bass', gain: 0.6, low: 40 },
      kick: { plays: 'drum', patch: 'kick', gain: 0.65 },
      snare: { plays: 'drum', patch: 'snare', gain: 0.8, verb: 0.25 },
      hat: { plays: 'drum', patch: 'hat', gain: 0.4, pan: 0.2 },
      tom: { plays: 'drum', patch: 'tom', gain: 0.6, verb: 0.2, pan: -0.2 },
      crash: { plays: 'drum', patch: 'crash', gain: 0.55, verb: 0.3 },
    },
    sections: {
      r: Object.assign({ chords: 'Em Em F Em', tom: REST + '|' + REST + '|' + REST + '|........x.x.x.xx', crash: bars('X...............', 4) }, heavy),
      a: Object.assign({ chords: 'Em F Em F G F Em B', lead: tuneA, high: tuneA, crash: bars('X...............', 8) }, heavy),
      b: {
        chords: 'C D Em Em C D B B',
        lead: tuneB,
        high: tuneB,
        pad: 'x---------------',
        arp: '0212321202123212',
        bass: 'r.rr.rr.r.rr.rr.',
        kick: 'x...x...x...x...',
        snare: '....x.......x...|....x.......x...|....x.......x...|....x.......x.xx',
        hat: 'x.oxx.oxx.oxx.ox',
        tom: bars(REST, 7) + '|........x.x.xxxx',
        crash: bars('X...............', 4),
      },
    },
  });
})(window.SO);
