'use strict';

/* The sound effects. Each is a few tones and bursts of noise (SO.audio.tone and SO.audio.noise,
   described in audio.js), played with SO.audio.play('name', options).

   An entry:
     gap    seconds before the same sound may play again (default 0.03)
     vary   how much the pitch wanders from one play to the next (0.05 = 5%), so a sound heard
            ten times a second does not turn into a drill
     vol    the sound's place in the mix (default 1): turn a whole sound up or down here
     make(o)   builds the sound; o is the options object given to play()

   Options every sound takes: x (screen position, for left / right), pitch, vol.
   Some take more:
     hit, boom, bigBoom   size: about 1 for a small fighter, 3 for something big
     shieldHit            left: how much shield is left, 0..1 (it sounds thinner as it goes)
     toggle               on: true or false */
(function (SO) {
  const { tone, noise } = SO.audio;
  const rand = SO.util.rand;

  /* A few short bursts of bright noise: glass breaking, hot metal ticking. */
  function crackle(count, within, vol, from) {
    for (let i = 0; i < count; i++) {
      noise({ filter: 'highpass', from: from || rand(4000, 8000), dur: rand(0.025, 0.06), vol: vol * rand(0.5, 1), delay: rand(0.02, within) });
    }
  }

  /* Notes one after another, on a soft triangle wave. */
  function run(notes, every, dur, vol, send) {
    notes.forEach((f, i) => tone({ type: 'triangle', from: f, dur, vol, delay: i * every, send }));
  }

  SO.audio.define({
    /* ----- guns ----- */

    // Kurai's twin blasters. Heard seven times a second, so: short, light, and never quite the same.
    shoot: { gap: 0.05, vary: 0.035, make() {
      tone({ type: 'square', from: 1250, to: 380, dur: 0.085, vol: 0.04, cut: 5200, cutTo: 1800 });
      tone({ type: 'triangle', from: 1900, to: 900, dur: 0.05, vol: 0.045 });
      tone({ type: 'sine', from: 230, to: 110, dur: 0.06, vol: 0.06 });
      noise({ filter: 'highpass', from: 6000, dur: 0.025, vol: 0.028 });
    } },
    allyShoot: { gap: 0.08, vary: 0.03, make() {
      tone({ type: 'square', from: 760, to: 300, dur: 0.08, vol: 0.028, cut: 3000 });
      tone({ type: 'triangle', from: 1100, to: 600, dur: 0.05, vol: 0.022 });
    } },
    enemyShoot: { gap: 0.06, vol: 1.6, vary: 0.05, make() {
      tone({ type: 'sawtooth', from: 520, to: 150, dur: 0.14, vol: 0.045, cut: 2600, cutTo: 700 });
      noise({ filter: 'bandpass', from: 1800, to: 600, dur: 0.09, vol: 0.03, q: 2 });
    } },
    // capital ships: the fleet's guns, and the Pyre's
    salvo: { gap: 0.1, vary: 0.05, make() {
      noise({ from: 1100, to: 140, dur: 0.24, vol: 0.15, send: 0.2 });
      tone({ type: 'triangle', from: 320, to: 110, dur: 0.2, vol: 0.1 });
      tone({ type: 'sine', from: 120, to: 50, dur: 0.18, vol: 0.14 });
    } },
    cannon: { gap: 0.1, vary: 0.05, make() {
      noise({ from: 800, to: 70, dur: 0.34, vol: 0.22, send: 0.25 });
      tone({ type: 'sawtooth', from: 150, to: 48, dur: 0.28, vol: 0.1, cut: 900 });
      tone({ type: 'sine', from: 90, to: 36, dur: 0.3, vol: 0.2 });
    } },
    beam: { gap: 0.15, make() {
      tone({ type: 'sawtooth', from: 140, to: 95, dur: 0.7, vol: 0.12, cut: 1800 });
      tone({ type: 'sine', from: 62, to: 50, dur: 0.7, vol: 0.16 });
      noise({ filter: 'bandpass', from: 2600, to: 1200, dur: 0.7, vol: 0.11, q: 2, send: 0.2 });
    } },

    /* ----- hits ----- */

    // a bolt landing. The caller raises the pitch as the target weakens, so a kill can be heard coming.
    hit: { gap: 0.04, vol: 1.5, vary: 0.06, make(o) {
      const big = Math.sqrt(o.size || 1);
      noise({ filter: 'bandpass', from: 3200 / big, to: 1400 / big, dur: 0.04, vol: 0.07, q: 1.5 });
      tone({ type: 'square', from: 330 / big, to: 160 / big, dur: 0.05, vol: 0.045, cut: 2400 });
    } },
    // a bolt bouncing off armour: no damage done, and it should sound like it
    clang: { gap: 0.05, vary: 0.08, make() {
      tone({ type: 'sine', from: 2100, dur: 0.16, vol: 0.05, fm: [1.41, 0.9] });
      tone({ type: 'sine', from: 3300, to: 1500, dur: 0.12, vol: 0.028 });
      noise({ filter: 'highpass', from: 5000, dur: 0.03, vol: 0.045 });
    } },
    shieldHit: { gap: 0.05, vary: 0.03, make(o) {
      const k = 0.78 + 0.3 * (o.left === undefined ? 1 : o.left);
      tone({ type: 'sine', from: 1500 * k, to: 640 * k, dur: 0.2, vol: 0.12, fm: [2.5, 0.6], send: 0.25 });
      tone({ type: 'triangle', from: 760 * k, to: 320 * k, dur: 0.12, vol: 0.06 });
      noise({ filter: 'highpass', from: 3500, dur: 0.05, vol: 0.07 });
    } },
    shieldDown: { gap: 0.3, make() {
      tone({ type: 'sawtooth', from: 820, to: 60, dur: 0.55, vol: 0.12, cut: 4000, cutTo: 300 });
      tone({ type: 'sine', from: 300, to: 40, dur: 0.5, vol: 0.2 });
      noise({ filter: 'bandpass', from: 2600, to: 300, dur: 0.45, vol: 0.12, q: 2, send: 0.3 });
      crackle(7, 0.32, 0.08);
      SO.audio.duck(0.4, 0.6);
    } },
    shieldUp: { gap: 0.3, vol: 1.6, make() {
      tone({ type: 'sine', from: 420, to: 1260, dur: 0.3, vol: 0.09, send: 0.3 });
      tone({ type: 'sine', from: 630, to: 1890, dur: 0.3, vol: 0.05, delay: 0.06 });
      tone({ type: 'sine', from: 1680, dur: 0.5, vol: 0.06, delay: 0.26, fm: [2, 0.5], send: 0.4 });
    } },
    hullHit: { gap: 0.08, vol: 0.8, vary: 0.05, make() {
      noise({ from: 2200, to: 140, dur: 0.28, vol: 0.36, send: 0.15 });
      tone({ type: 'square', from: 190, to: 48, dur: 0.24, vol: 0.14, cut: 1200 });
      tone({ type: 'sine', from: 110, to: 40, dur: 0.3, vol: 0.28 });
      tone({ type: 'sine', from: 900, dur: 0.12, vol: 0.05, fm: [1.41, 1.5] });
      SO.audio.duck(0.35, 0.5);
    } },
    lowHull: { gap: 0.5, vol: 1.5, make() {
      tone({ type: 'sine', from: 660, dur: 0.09, vol: 0.05 });
      tone({ type: 'sine', from: 660, dur: 0.09, vol: 0.05, delay: 0.14 });
    } },

    /* ----- explosions ----- */

    boom: { gap: 0.05, vary: 0.1, make(o) {
      const s = o.size || 1;
      const d = 0.3 + 0.16 * s;
      noise({ from: 2400, to: 70, dur: d, vol: Math.min(0.5, 0.24 + 0.07 * s), send: 0.25 });
      noise({ filter: 'bandpass', from: 900, to: 300, dur: d * 0.5, vol: 0.12, q: 0.8, delay: 0.03 });
      tone({ type: 'sine', from: 170 / Math.sqrt(s), to: 36, dur: d * 0.8, vol: 0.3 });
      crackle(3, 0.22, 0.05);
    } },
    bigBoom: { gap: 0.12, vol: 0.75, vary: 0.05, make() {
      noise({ from: 3000, to: 50, dur: 1.3, vol: 0.6, send: 0.4 });
      tone({ type: 'sine', from: 120, to: 26, dur: 1.1, vol: 0.55 });
      tone({ type: 'triangle', from: 60, to: 30, dur: 1.4, vol: 0.3, attack: 0.02 });
      noise({ from: 900, to: 110, dur: 0.6, vol: 0.32, delay: 0.16, send: 0.3 });
      noise({ from: 600, to: 80, dur: 0.7, vol: 0.22, delay: 0.38, send: 0.3 });
      crackle(8, 0.7, 0.07);
      SO.audio.duck(0.5, 0.9);
    } },
    // something large coming apart, plate by plate
    crack: { gap: 0.05, vary: 0.15, make() {
      noise({ filter: 'highpass', from: 2500, dur: 0.045, vol: 0.14, send: 0.3 });
      tone({ type: 'square', from: 900, to: 200, dur: 0.06, vol: 0.06, cut: 3000 });
    } },
    // the growl of a big ship that has been hurt badly
    groan: { gap: 0.4, vary: 0.08, make() {
      tone({ type: 'sawtooth', from: 95, to: 58, dur: 0.6, vol: 0.15, cut: 700, wobble: [9, 40] });
      noise({ from: 500, to: 160, dur: 0.5, vol: 0.12, send: 0.3 });
    } },
    // the shot that ends the Eclipse
    finalBlow: { gap: 1, vol: 0.75, make() {
      noise({ from: 6000, to: 60, dur: 1.6, vol: 0.6, send: 0.5 });
      tone({ type: 'sine', from: 180, to: 24, dur: 1.4, vol: 0.6 });
      tone({ type: 'sine', from: 2400, dur: 1.6, vol: 0.05, fm: [1.5, 0.3], send: 0.6, attack: 0.02 });
      SO.audio.duck(0.85, 2.2);
    } },
    // ...its hull shaking itself to pieces
    rumble: { gap: 1, vol: 0.9, make() {
      noise({ from: 160, to: 520, dur: 2.7, vol: 0.42, attack: 2.2, send: 0.3 });
      tone({ type: 'sine', from: 36, to: 58, dur: 2.7, vol: 0.4, attack: 2.0 });
      tone({ type: 'sawtooth', from: 48, to: 96, dur: 2.7, vol: 0.08, attack: 2.3, cut: 500, wobble: [13, 60] });
    } },
    // ...and the moment it goes
    shatter: { gap: 1, vol: 0.75, make() {
      noise({ from: 5000, to: 40, dur: 2.2, vol: 0.65, send: 0.5 });
      tone({ type: 'sine', from: 90, to: 22, dur: 1.9, vol: 0.6 });
      noise({ from: 900, to: 90, dur: 0.9, vol: 0.3, delay: 0.22, send: 0.4 });
      noise({ from: 700, to: 70, dur: 1.0, vol: 0.24, delay: 0.5, send: 0.4 });
      noise({ filter: 'highpass', from: 4000, to: 9000, dur: 1.6, vol: 0.07, attack: 0.3, send: 0.6 });
      crackle(12, 1.1, 0.08);
      SO.audio.duck(0.85, 2.5);
    } },

    /* ----- the Foxfire ----- */

    arrive: { gap: 0.5, vol: 1.5, make() {
      noise({ filter: 'bandpass', from: 3200, to: 500, dur: 0.5, vol: 0.1, q: 2 });
      tone({ type: 'sine', from: 320, to: 140, dur: 0.45, vol: 0.06 });
    } },
    boost: { gap: 0.5, vol: 1.5, make() {
      noise({ filter: 'bandpass', from: 400, to: 5000, dur: 0.7, vol: 0.18, q: 2, attack: 0.05, send: 0.3 });
      tone({ type: 'sawtooth', from: 110, to: 440, dur: 0.55, vol: 0.06, cut: 2400 });
      tone({ type: 'sine', from: 80, to: 200, dur: 0.55, vol: 0.15 });
    } },
    pickup: { gap: 0.1, make() {
      run([880, 1175, 1760], 0.07, 0.16, 0.12, 0.3);
      tone({ type: 'sine', from: 1760, dur: 0.5, vol: 0.05, delay: 0.14, fm: [2, 0.6], send: 0.4 });
    } },

    /* ----- warnings and the enemy ----- */

    warn: { gap: 0.12, vol: 1.5, make() {
      tone({ type: 'square', from: 1040, dur: 0.07, vol: 0.05, cut: 3200 });
      tone({ type: 'square', from: 1040, dur: 0.07, vol: 0.05, cut: 3200, delay: 0.11 });
    } },
    alarm: { gap: 0.5, vol: 1.5, make() {
      [0, 0.2, 0.4].forEach((d) => tone({ type: 'square', from: 780, to: 560, dur: 0.14, vol: 0.06, cut: 2600, delay: d }));
    } },
    dash: { gap: 0.1, vol: 2, make() {
      noise({ filter: 'bandpass', from: 500, to: 3600, dur: 0.32, vol: 0.16, q: 3 });
      tone({ type: 'sawtooth', from: 160, to: 520, dur: 0.28, vol: 0.04, cut: 2000 });
    } },
    charge: { gap: 0.2, vol: 1.5, make() {
      tone({ type: 'sawtooth', from: 180, to: 560, dur: 0.42, vol: 0.045, attack: 0.3, cut: 2400, wobble: [22, 30] });
    } },
    // a glass bell: a Snuffer or a shade vane giving up its light
    chime: { gap: 0.2, vol: 1.5, make() {
      tone({ type: 'sine', from: 1175, dur: 1.0, vol: 0.08, fm: [3.01, 0.8], send: 0.5 });
      tone({ type: 'sine', from: 1760, dur: 0.8, vol: 0.05, delay: 0.09, fm: [3.01, 0.6], send: 0.5 });
    } },

    /* ----- the Eclipse ----- */

    nightfall: { gap: 1, make() {
      tone({ type: 'sawtooth', from: 220, to: 36, dur: 2.2, vol: 0.15, attack: 0.2, cut: 1500, cutTo: 200 });
      tone({ type: 'sine', from: 110, to: 30, dur: 2.4, vol: 0.22, attack: 0.3 });
      noise({ from: 2400, to: 80, dur: 2.2, vol: 0.13, attack: 0.4, send: 0.5 });
    } },
    dawn: { gap: 1, make() {
      [294, 440, 587, 880, 1175].forEach((f, i) => tone({ type: 'sine', from: f, dur: 1.5 - i * 0.15, vol: 0.1, delay: i * 0.09, attack: 0.05, send: 0.5 }));
      noise({ filter: 'highpass', from: 1200, to: 6000, dur: 0.9, vol: 0.08, attack: 0.3, send: 0.4 });
    } },
    inhale: { gap: 0.9, make() {
      noise({ filter: 'bandpass', from: 300, to: 1500, dur: 1.0, vol: 0.1, q: 4, attack: 0.5 });
      tone({ type: 'sine', from: 70, to: 120, dur: 1.0, vol: 0.1, attack: 0.4 });
    } },
    devour: { gap: 0.3, make() {
      tone({ type: 'sawtooth', from: 120, to: 60, dur: 1.0, vol: 0.2, cut: 1400 });
      tone({ type: 'square', from: 480, to: 160, dur: 0.9, vol: 0.05, cut: 2000 });
      tone({ type: 'sine', from: 50, to: 35, dur: 1.0, vol: 0.25 });
      noise({ filter: 'bandpass', from: 2200, to: 700, dur: 1.0, vol: 0.2, q: 1.5, send: 0.3 });
      SO.audio.duck(0.4, 0.9);
    } },
    heartbeat: { gap: 0.3, make() {
      tone({ type: 'sine', from: 72, to: 44, dur: 0.16, vol: 0.34 });
      tone({ type: 'sine', from: 66, to: 40, dur: 0.18, vol: 0.22, delay: 0.24 });
    } },
    // every Lantern coming back on: a rising chord of D, so it sits on top of the victory fanfare
    relight: { gap: 2, make() {
      [147, 220, 294, 370, 440, 587, 740, 880, 1175].forEach((f, i) => {
        tone({ type: 'sine', from: f, dur: 2.8 - i * 0.18, vol: 0.085, delay: i * 0.12, attack: 0.08, send: 0.5 });
      });
      noise({ filter: 'highpass', from: 800, to: 7000, dur: 1.6, vol: 0.1, attack: 0.5, send: 0.5 });
    } },

    /* ----- announcements ----- */

    // a wave arriving: a two-note call (D and A, which fit every battle song)
    wave: { gap: 0.2, vol: 1.3, make() {
      tone({ type: 'triangle', from: 587, dur: 0.16, vol: 0.1, send: 0.3 });
      tone({ type: 'triangle', from: 880, dur: 0.3, vol: 0.1, delay: 0.13, send: 0.3 });
    } },
    clear: { gap: 0.2, vol: 1.3, make() { run([587, 880, 1175], 0.08, 0.2, 0.1, 0.3); } },
    // a banner slamming in
    banner: { gap: 0.1, make() {
      noise({ filter: 'bandpass', from: 300, to: 2600, dur: 0.26, vol: 0.06, q: 1.5 });
      tone({ type: 'sine', from: 200, to: 80, dur: 0.22, vol: 0.1, delay: 0.16 });
    } },

    /* ----- menus and story ----- */

    ui: { gap: 0.05, make() { tone({ type: 'triangle', from: 620, to: 930, dur: 0.09, vol: 0.11 }); } },
    hover: { gap: 0.04, make() { tone({ type: 'triangle', from: 1240, dur: 0.03, vol: 0.03 }); } },
    toggle: { gap: 0.05, make(o) {
      const up = o.on !== false;
      tone({ type: 'triangle', from: up ? 620 : 830, dur: 0.07, vol: 0.1 });
      tone({ type: 'triangle', from: up ? 830 : 620, dur: 0.1, vol: 0.1, delay: 0.07 });
    } },
    // the blip of a voice typing out a line (pitch: the speaker's voice)
    talk: { gap: 0.045, vol: 3, make() {
      tone({ type: 'triangle', from: 880 + Math.random() * 260, dur: 0.035, vol: 0.022 });
    } },
    // ...and of the narrator's cards
    type: { gap: 0.05, make() { noise({ filter: 'highpass', from: 4500, dur: 0.012, vol: 0.012 }); } },
    page: { gap: 0.05, vol: 1.3, make() { tone({ type: 'triangle', from: 520, to: 700, dur: 0.06, vol: 0.06 }); } },
    pop: { gap: 0.1, make() { tone({ type: 'sine', from: 320, to: 640, dur: 0.07, vol: 0.06 }); } },
    hail: { gap: 0.3, vol: 1.5, make() {
      [740, 988, 740, 988].forEach((f, i) => tone({ type: 'square', from: f, dur: 0.09, vol: 0.045, cut: 3000, delay: i * 0.11 }));
    } },
  });
})(window.SO);
