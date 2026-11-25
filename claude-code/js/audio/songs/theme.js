'use strict';

/* "Lights On", the main theme, in D major. Its first four notes (A, D, F sharp, E: up to the tonic,
   up again, and one step back) are Kurai's call, and they come back all through the game.

     theme    the title screen, and the end of the story: the full arrangement
     bridge   the story scenes: the same tune, slow and quiet, on bells
     finale   the last phase of the Eclipse: the tune at half speed over a battle beat

   The tune and its chords are kept in SO.music.THEME so other songs can quote them
   (the format is described at the top of js/audio/music.js). */
(function (SO) {
  const REST = '................';
  const bars = (first, count) => [first].concat(Array(count - 1).fill(REST)).join('|');

  const T = SO.music.THEME = {
    // the first eight bars, ending in the air (on A)...
    chordsOpen: 'D A/C# Bm G D/F# G A A',
    tuneOpen: 'a4:4 d5:4 f#5:6 e5:2 | e5:6 c#5:2 a4:8 | b4:4 d5:4 f#5:6 g5:2 | g5:6 f#5:2 d5:8 | ' +
              'a4:4 d5:4 f#5:6 a5:2 | b5:6 a5:2 g5:8 | a5:4 g5:4 f#5:4 e5:4 | e5:12 _:4',
    // ...the same eight, coming home (to D)...
    chordsHome: 'D A/C# Bm G D/F# G A D',
    tuneHome: 'a4:4 d5:4 f#5:6 e5:2 | e5:6 c#5:2 a4:8 | b4:4 d5:4 f#5:6 g5:2 | g5:6 f#5:2 d5:8 | ' +
              'a4:4 d5:4 f#5:6 a5:2 | b5:6 a5:2 g5:8 | a5:4 g5:4 f#5:4 e5:4 | d5:12 _:4',
    // ...and the middle eight, which climbs away and leads back
    chordsAway: 'G A Bm D G D/F# Em A',
    tuneAway: 'b4:2 d5:2 g5:8 f#5:2 e5:2 | e5:6 c#5:2 e5:4 a5:4 | f#5:6 d5:2 f#5:4 b5:4 | a5:8 f#5:4 d5:4 | ' +
              'b4:2 d5:2 g5:8 a5:2 b5:2 | a5:6 f#5:2 d5:8 | e5:4 g5:4 b5:4 a5:4 | a5:6 g5:2 e5:4 c#5:4',
  };

  SO.music.add({
    id: 'theme',
    bpm: 104,
    echo: 0.75,
    form: ['intro', 'open', 'home', 'away', 'home'],
    loopFrom: 1,
    channels: {
      lead: { plays: 'tune', patch: 'horn', gain: 1.1, echo: 0.22, verb: 0.35 },
      high: { plays: 'tune', patch: 'bell', gain: 0.5, octave: 1, verb: 0.5, pan: 0.25 },
      pad: { plays: 'chords', patch: 'pad', gain: 1.0, verb: 0.5, low: 57 },
      arp: { plays: 'arp', patch: 'bell', gain: 0.4, echo: 0.3, verb: 0.4, low: 69, pan: -0.25 },
      bass: { plays: 'bass', patch: 'bass', gain: 0.45, low: 33, gate: 0.95 },
      kick: { plays: 'drum', patch: 'kick', gain: 0.5 },
      snare: { plays: 'drum', patch: 'snare', gain: 0.6, verb: 0.2 },
      hat: { plays: 'drum', patch: 'hat', gain: 0.45, pan: 0.2 },
      timp: { plays: 'drum', patch: 'timp', gain: 0.5, verb: 0.3 },
      crash: { plays: 'drum', patch: 'crash', gain: 0.5, verb: 0.3 },
    },
    sections: {
      intro: {
        chords: 'G A Bm A',
        pad: 'x---------------',
        arp: '0.1.2.1.3.2.1.2.',
        bass: 'r---------------',
        timp: REST + '|' + REST + '|' + REST + '|........o...o.xx',
      },
      open: {
        chords: T.chordsOpen,
        lead: T.tuneOpen,
        pad: 'x---------------',
        arp: '0.1.2.1.3.2.1.2.',
        bass: 'r-------r-------',
        kick: 'x.......x.......',
        hat: '..o...o...o...o.',
        crash: bars('X...............', 8),
      },
      home: {
        chords: T.chordsHome,
        lead: T.tuneHome,
        high: T.tuneHome,
        pad: 'x---------------',
        arp: '0.1.2.3.2.1.2.3.',
        bass: 'r.r.r.r.r.r.f.r.',
        kick: 'x.......x.x.....',
        snare: '....x.......x...|....x.......x...|....x.......x...|....x.......x.oo',
        hat: 'x.o.x.o.x.o.x.o.',
        crash: bars('X...............', 8),
      },
      away: {
        chords: T.chordsAway,
        lead: T.tuneAway,
        pad: 'x---------------',
        arp: '0.1.2.3.2.1.2.3.',
        bass: 'r...r.r.r...r.f.',
        kick: 'x.....x.x.......',
        snare: '....x.......x...',
        hat: 'x.o.x.o.x.o.x.o.',
        timp: bars(REST, 7) + '|........x...x.xx',
        crash: bars('x...............', 8),
      },
    },
  });

  /* The story scenes. The tune comes and goes, so a long scene does not wear it out; while it is
     away the bells keep moving underneath, so the scene is never much quieter than the title was.
     (The four sections are balanced to within a decibel or two of each other, and of the main theme:
     README.md, "Sound and music", says how to measure.) */
  SO.music.add({
    id: 'bridge',
    bpm: 84,
    echo: 0.75,
    form: ['still', 'open', 'drift', 'away'],
    channels: {
      bell: { plays: 'tune', patch: 'bell', gain: 1.0, echo: 0.3, verb: 0.6 },
      pad: { plays: 'chords', patch: 'pad', gain: 1.5, verb: 0.6, low: 57 },
      arp: { plays: 'arp', patch: 'bell', gain: 1.0, echo: 0.35, verb: 0.5, low: 69, pan: -0.3 },
      bass: { plays: 'bass', patch: 'sub', gain: 0.7, low: 38 },
    },
    sections: {
      still: { chords: T.chordsOpen, pad: 'x---------------', arp: '0...2...1...3...|0...2...3...1.2.', bass: 'r---------------' },
      open: { chords: T.chordsOpen, bell: T.tuneOpen, pad: 'x---------------', bass: 'r---------------' },
      drift: { chords: T.chordsAway, pad: 'x---------------', arp: '0...2...1...3...|0...2...3...1.2.', bass: 'r---------------' },
      away: { chords: T.chordsAway, bell: T.tuneAway, pad: 'x---------------', bass: 'r---------------' },
    },
  });

  /* The Eclipse, phase 3: "Lights on!" The theme comes back over the battle beat. */
  const drive = {
    pad: 'x---------------',
    arp: '0212321202123212',
    bass: 'r.rr.rr.r.rr.rr.|r.rr.rr.r.rr.rRr',
    kick: 'x...x...x...x...',
    snare: '....x.......x...|....x.......x...|....x.......x...|....x.......x.xx',
    hat: 'X.oxX.oxX.oxX.ox',
    crash: bars('X...............', 8),
  };
  SO.music.add({
    id: 'finale',
    bpm: 152,
    echo: 0.75,
    form: ['open', 'home', 'away', 'home'],
    channels: {
      lead: { plays: 'tune', patch: 'lead', gain: 1.0, echo: 0.25, verb: 0.25 },
      high: { plays: 'tune', patch: 'bell', gain: 0.4, octave: 1, verb: 0.4, pan: 0.25 },
      pad: { plays: 'chords', patch: 'strings', gain: 0.75, verb: 0.35, low: 57 },
      arp: { plays: 'arp', patch: 'pluck', gain: 0.6, echo: 0.25, low: 62, pan: -0.3 },
      bass: { plays: 'bass', patch: 'bass', gain: 0.57, low: 33 },
      kick: { plays: 'drum', patch: 'kick', gain: 0.6 },
      snare: { plays: 'drum', patch: 'snare', gain: 0.75, verb: 0.15 },
      hat: { plays: 'drum', patch: 'hat', gain: 0.4, pan: 0.2 },
      crash: { plays: 'drum', patch: 'crash', gain: 0.55, verb: 0.3 },
    },
    sections: {
      open: Object.assign({ stretch: 2, chords: T.chordsOpen, lead: T.tuneOpen, high: T.tuneOpen }, drive),
      home: Object.assign({ stretch: 2, chords: T.chordsHome, lead: T.tuneHome, high: T.tuneHome }, drive),
      away: Object.assign({ stretch: 2, chords: T.chordsAway, lead: T.tuneAway, high: T.tuneAway }, drive),
    },
  });
})(window.SO);
