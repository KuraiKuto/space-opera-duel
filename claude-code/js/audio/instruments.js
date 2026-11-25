'use strict';

/* The instruments the music is played on: synthesiser patches for the pitched parts, and a drum kit.
   A song (js/audio/songs) names one for each of its channels; the sequencer (music.js) plays the notes.

   A patch:
     oscs     the oscillators: [type, detune in cents, level, pitch ratio (default 1)]
     amp      [attack, decay, sustain, release]: seconds, seconds, 0..1, seconds
     filter   [peak, rest, seconds, q]: a low-pass that opens to `peak` and settles at `rest` over
              `seconds`; both are multiples of the note's own pitch, so high notes stay bright
     fm       [ratio, depth, seconds]: a second oscillator bends the first ones; the depth dies away
              over `seconds`. This is what makes a bell ring like metal.
     vibrato  [rate in Hz, depth in cents, seconds before it starts]
     gain     how loud the patch is before the song's own mix

   To add an instrument, add a patch (or a drum) here and use its name in a song. */
(function (SO) {
  const MAX_CUT = 12000;
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  const PATCHES = {
    // the voice of the main theme: bright and brassy, with a little vibrato on long notes
    lead: {
      oscs: [['sawtooth', -7, 0.5], ['sawtooth', 7, 0.5]],
      amp: [0.015, 0.2, 0.75, 0.12], filter: [8, 3.5, 0.18, 2.5], vibrato: [5.5, 9, 0.22], gain: 0.34,
    },
    // the same tune, played gently
    horn: {
      oscs: [['sawtooth', 0, 0.45], ['triangle', 4, 0.7]],
      amp: [0.05, 0.3, 0.8, 0.2], filter: [4.5, 2.2, 0.25, 1], vibrato: [5, 6, 0.3], gain: 0.22,
    },
    // slow strings: chords held under everything
    pad: {
      oscs: [['sawtooth', -10, 0.5], ['sawtooth', 10, 0.5]],
      amp: [0.4, 0.5, 0.85, 0.7], filter: [2.6, 2.6, 0, 0.5], gain: 0.11,
    },
    // faster, brighter strings for the battle songs
    strings: {
      oscs: [['sawtooth', -9, 0.5], ['sawtooth', 9, 0.5]],
      amp: [0.1, 0.3, 0.8, 0.3], filter: [5, 3.6, 0.3, 0.7], gain: 0.14,
    },
    // a dark, slow swell for the Eclipse
    drone: {
      oscs: [['sawtooth', -12, 0.5], ['sawtooth', 12, 0.5], ['sine', 0, 0.6, 0.5]],
      amp: [1.2, 1, 0.9, 1.6], filter: [3, 3, 0, 1.2], gain: 0.13,
    },
    // short and bright: the arpeggios
    pluck: {
      oscs: [['square', 0, 0.45], ['triangle', 0, 0.6, 2]],
      amp: [0.003, 0.14, 0, 0.08], filter: [7, 1.6, 0.09, 2], gain: 0.34,
    },
    // a lantern, ringing
    bell: {
      oscs: [['sine', 0, 1], ['sine', 0, 0.25, 2]],
      amp: [0.002, 1.1, 0, 0.5], fm: [3.5, 1.8, 0.35], gain: 0.22,
    },
    // a big low bell, tolling
    toll: {
      oscs: [['sine', 0, 1], ['sine', 0, 0.4, 2.76]],
      amp: [0.004, 3.2, 0, 1.5], fm: [1.41, 2.6, 1.2], gain: 0.24,
    },
    bass: {
      oscs: [['sawtooth', 0, 0.6], ['sine', 0, 0.7], ['square', 0, 0.2, 2]],
      amp: [0.004, 0.1, 0.7, 0.05], filter: [14, 5, 0.12, 1.5], gain: 0.3,
    },
    // a rounder bass for the quiet songs
    sub: {
      oscs: [['triangle', 0, 0.9], ['sine', 0, 0.5, 2]],
      amp: [0.02, 0.4, 0.8, 0.3], gain: 0.3,
    },
  };

  /* Play one note of a patch on a channel strip. ch: { ctx, in, noise }; t: when; dur: seconds; vel: 0..1. */
  function note(ch, patch, t, midi, dur, vel) {
    const p = PATCHES[patch] || PATCHES.pluck;
    const ac = ch.ctx;
    const f = hz(midi);
    const attack = p.amp[0];
    const release = p.amp[3];
    const off = t + Math.max(dur, attack);
    const stop = off + release * 2;
    const peak = vel * p.gain;

    const amp = ac.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + attack);
    amp.gain.setTargetAtTime(peak * p.amp[2], t + attack, p.amp[1] / 3);
    amp.gain.setTargetAtTime(0, off, release / 3);
    amp.connect(ch.in);

    let dest = amp;
    if (p.filter) {
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = p.filter[3] || 1;
      filter.frequency.setValueAtTime(Math.min(MAX_CUT, f * p.filter[0]), t);
      if (p.filter[2]) filter.frequency.setTargetAtTime(Math.min(MAX_CUT, f * p.filter[1]), t + 0.01, p.filter[2] / 3);
      filter.connect(amp);
      dest = filter;
    }

    let bend = null;
    if (p.fm) {
      const mod = ac.createOscillator();
      mod.frequency.value = f * p.fm[0];
      bend = ac.createGain();
      bend.gain.setValueAtTime(f * p.fm[1], t);
      bend.gain.setTargetAtTime(f * p.fm[1] * 0.04, t, p.fm[2] / 3);
      mod.connect(bend);
      mod.start(t);
      mod.stop(stop);
    }
    let sway = null;
    if (p.vibrato && dur > p.vibrato[2] + 0.1) {
      const lfo = ac.createOscillator();
      lfo.frequency.value = p.vibrato[0];
      sway = ac.createGain();
      sway.gain.setValueAtTime(0, t + p.vibrato[2]);
      sway.gain.linearRampToValueAtTime(p.vibrato[1], t + p.vibrato[2] + 0.18);
      lfo.connect(sway);
      lfo.start(t);
      lfo.stop(stop);
    }

    for (let i = 0; i < p.oscs.length; i++) {
      const spec = p.oscs[i];
      const osc = ac.createOscillator();
      const level = ac.createGain();
      osc.type = spec[0];
      osc.frequency.value = f * (spec[3] || 1);
      osc.detune.value = spec[1];
      level.gain.value = spec[2];
      if (bend && i === 0) bend.connect(osc.frequency);
      if (sway) sway.connect(osc.detune);
      osc.connect(level);
      level.connect(dest);
      osc.start(t);
      osc.stop(stop);
    }
  }

  /* ----- the drum kit ----- */

  function thump(ch, t, from, to, slide, dur, vol, type) {
    const ac = ch.ctx;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + slide);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    osc.connect(gain);
    gain.connect(ch.in);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function hiss(ch, t, type, freq, q, dur, vol, attack) {
    const ac = ch.ctx;
    const src = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    src.buffer = ch.noise;
    src.loop = true;
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    gain.gain.setValueAtTime(attack ? 0.0005 : vol, t);
    if (attack) gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ch.in);
    src.start(t, (t * 7.31) % 1.5);
    src.stop(t + dur + 0.02);
  }

  const DRUMS = {
    kick(ch, t, vel) {
      thump(ch, t, 170, 50, 0.09, 0.28, vel);
      thump(ch, t, 1200, 300, 0.012, 0.02, vel * 0.25, 'triangle');
    },
    snare(ch, t, vel) {
      hiss(ch, t, 'bandpass', 2400, 0.6, 0.18, vel * 0.7);
      thump(ch, t, 230, 170, 0.05, 0.1, vel * 0.45, 'triangle');
    },
    hat(ch, t, vel) { hiss(ch, t, 'highpass', 8500, 0.8, 0.045, vel * 0.5); },
    open(ch, t, vel) { hiss(ch, t, 'highpass', 7500, 0.8, 0.26, vel * 0.4); },
    shaker(ch, t, vel) { hiss(ch, t, 'bandpass', 7000, 1.2, 0.07, vel * 0.2, 0.012); },
    crash(ch, t, vel) {
      hiss(ch, t, 'highpass', 4500, 0.6, 1.5, vel * 0.42);
      hiss(ch, t, 'bandpass', 9000, 2, 0.5, vel * 0.2);
    },
    tom(ch, t, vel) { thump(ch, t, 150, 78, 0.18, 0.34, vel * 0.8); },
    // a kettledrum: the weight under the big moments
    timp(ch, t, vel) {
      thump(ch, t, 98, 70, 0.3, 0.9, vel * 0.9);
      hiss(ch, t, 'lowpass', 500, 0.7, 0.12, vel * 0.5);
    },
    // a slow heartbeat for the dark
    pulse(ch, t, vel) { thump(ch, t, 74, 42, 0.12, 0.3, vel * 0.9); },
  };

  SO.instruments = {
    PATCHES,
    DRUMS,
    note,
    drum(ch, name, t, vel) {
      const fn = DRUMS[name];
      if (fn) fn(ch, t, vel);
    },
  };
})(window.SO);
