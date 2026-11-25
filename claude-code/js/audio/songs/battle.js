'use strict';

/* "Scramble", the music of the missions, in D minor. It is built in layers, and the mission turns
   them up and down (js/game/director.js):

     level 0   bass, strings and hi-hat: the mission opening, and the breather between waves
     level 1   drums, arpeggio and the tune: a wave
     level 2   the tune doubled an octave up, and open hi-hats: the last wave

   Its middle section (b) lifts into F major and plays Kurai's call from the main theme. */
(function (SO) {
  const REST = '................';
  const bars = (first, count) => [first].concat(Array(count - 1).fill(REST)).join('|');

  const tuneA = 'd5:6 f5:2 a5:4 g5:2 f5:2 | e5:2 f5:2 d5:8 _:4 | d5:6 f5:2 bb5:4 a5:2 g5:2 | g5:6 e5:2 c5:4 e5:4 | ' +
                'd5:6 f5:2 a5:4 g5:2 f5:2 | a5:6 d6:2 c6:4 a5:4 | bb5:6 a5:2 g5:4 f5:4 | e5:6 c#5:2 e5:4 a5:4';
  const tuneB = 'c5:4 f5:4 a5:6 g5:2 | g5:6 e5:2 c5:8 | d5:4 f5:4 a5:6 bb5:2 | bb5:6 a5:2 f5:8 | ' +
                'c5:4 f5:4 a5:6 c6:2 | d6:6 c6:2 bb5:8 | bb5:4 a5:4 g5:4 f5:4 | e5:8 c#5:4 e5:4';
  const tuneC = '_:16 | _:16 | _:16 | _:16 | d5:4 e5:4 f5:4 a5:4 | g5:8 e5:8 | f5:4 g5:4 a5:4 bb5:4 | a5:8 c#6:8';

  const snare = '....x.......x...|....x.......x...|....x.......x...|....x.......x.xx';

  SO.music.add({
    id: 'battle',
    alone: 3.5,
    bpm: 152,
    echo: 0.75,
    form: ['intro', 'a', 'a', 'b', 'a', 'c', 'b'],
    loopFrom: 1,
    channels: {
      lead: { plays: 'tune', patch: 'lead', gain: 1.0, echo: 0.28, verb: 0.2, layer: 1 },
      high: { plays: 'tune', patch: 'pluck', gain: 0.35, octave: 1, echo: 0.2, pan: 0.3, layer: 2 },
      pad: { plays: 'chords', patch: 'strings', gain: 0.75, verb: 0.3, low: 57 },
      arp: { plays: 'arp', patch: 'pluck', gain: 0.6, echo: 0.25, low: 62, pan: -0.3, layer: 1 },
      bass: { plays: 'bass', patch: 'bass', gain: 0.57, low: 33 },
      kick: { plays: 'drum', patch: 'kick', gain: 0.6, layer: 1 },
      snare: { plays: 'drum', patch: 'snare', gain: 0.75, verb: 0.15, layer: 1 },
      hat: { plays: 'drum', patch: 'hat', gain: 0.4, pan: 0.2 },
      open: { plays: 'drum', patch: 'open', gain: 0.5, pan: -0.2, layer: 2 },
      crash: { plays: 'drum', patch: 'crash', gain: 0.55, verb: 0.3, layer: 1 },
    },
    sections: {
      intro: {
        chords: 'Dm Dm Bb C',
        pad: 'x---------------',
        arp: '0212321202123212',
        bass: 'r.rr.rr.r.rr.rr.',
        kick: 'x...x...x...x...',
        hat: 'x.o.x.o.x.o.x.o.',
      },
      a: {
        chords: 'Dm Dm Bb C Dm Dm Bb A',
        lead: tuneA,
        high: tuneA,
        pad: 'x---------------',
        arp: '0212321202123212',
        bass: 'r.rr.rr.r.rr.rr.|r.rr.rr.r.rr.rRr',
        kick: 'x...x...x...x...|x...x...x...x.x.',
        snare,
        hat: 'x.oxx.oxx.oxx.ox',
        open: '..x...x...x...x.',
        crash: bars('X...............', 8),
      },
      b: {
        chords: 'F C Dm Bb F Bb Gm A',
        lead: tuneB,
        high: tuneB,
        pad: 'x---------------',
        arp: '0.2.1.2.3.2.1.2.',
        bass: 'r..r..r.r..r..r.',
        kick: 'x...x...x...x...',
        snare,
        hat: 'x.oxx.oxx.oxx.ox',
        open: '..x...x...x...x.',
        crash: bars('X...............', 4),
      },
      c: {
        chords: 'Dm C Bb A Dm C Bb A',
        lead: tuneC,
        pad: 'x---------------',
        arp: '0123210301232103',
        bass: 'r...r...r...r.r.',
        kick: 'x.......x.......|x.......x.......|x.......x.......|x.......x.......|' +
              'x...x...x...x...|x...x...x...x...|x...x...x...x...|x...x...x...x...',
        snare: REST + '|' + REST + '|' + REST + '|' + REST + '|' +
               '....x.......x...|....x.......x...|....x.......x...|x.x.x.x.xxxxxxxx',
        hat: 'x.x.x.x.x.x.x.x.',
        crash: bars('X...............', 8),
      },
    },
  });
})(window.SO);
