'use strict';

/* Sound, all of it made in code with the Web Audio API: there are no audio files.

   This file is the engine. It opens the audio context on the first key or click (browsers allow no
   sound before that), keeps two channels, sound effects and music, that the player can switch off
   separately (the 'sfx' and 'music' switches in js/core/settings.js), and offers the two building
   blocks every sound effect is made of: tone() and noise().
   The rest of js/audio builds on it:

     sfx.js           the sound effects
     instruments.js   the instruments the music is played on
     music.js         the sequencer that plays a song
     songs/           the songs, one file each

     SO.audio.play('boom', { x: 640, size: 2 })   play a sound effect (the options are listed in sfx.js)
     SO.audio.muffle(1)                           put the music behind glass (the pause screen, a hull hit); 0 lifts it
     SO.audio.duck(0.5, 0.6)                      dip the music under a big noise, for that many seconds

   How it is wired:

     sound effects -> sfx  ------------------------------\
                       \-> reverb -> sfx                   >-> master -> soft clip -> speakers
     music -> duck -> muffle (low-pass) -> music switch --/
                \-> reverb -> duck */
(function (SO) {
  const { clamp } = SO.util;

  const LEVEL = { master: 1.1, sfx: 1.2, music: 0.52 }; // how loud each channel is when it is on
  const OPEN = 18000;                                  // the muffle filter, wide open (Hz)
  const SHUT = 420;                                    // ...and fully muffled

  let rig = null;       // the audio graph, once the context exists
  let live = null;      // the real one, while `rig` is swapped for an offline render
  const waiting = [];   // told once, when sound becomes possible
  const SOUNDS = {};
  const lastPlayed = {};
  const NONE = {};

  // what the sound being made right now is played through: tone() and noise() read this
  const voice = { out: null, pitch: 1, vol: 1 };

  // the soft clipper's curve: its input runs from -2 to 2 (the master halves the signal on the way in)
  const CLIP = new Float32Array(1025);
  for (let i = 0; i < CLIP.length; i++) {
    const a = (i / (CLIP.length - 1) * 2 - 1) * 2;
    const over = Math.abs(a) - 0.5;
    CLIP[i] = over <= 0 ? a : Math.sign(a) * (0.5 + 0.5 * Math.tanh(over / 0.5));
  }

  /* A room for the reverb: two seconds of noise dying away, darker toward the end. */
  function impulse(ac, seconds) {
    const n = Math.floor(ac.sampleRate * seconds);
    const buffer = ac.createBuffer(2, n, ac.sampleRate);
    const rnd = SO.util.rng(4242);
    const fadeIn = ac.sampleRate * 0.006;
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      let low = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        low += (rnd() * 2 - 1 - low) * (0.75 - 0.6 * t);
        data[i] = low * Math.pow(1 - t, 2.6) * Math.min(1, i / fadeIn);
      }
    }
    return buffer;
  }

  /* Build the graph on a context: the real one, or an offline one for SO.audio.offline(). */
  function build(ac) {
    const r = { ctx: ac };
    const gain = (value) => { const g = ac.createGain(); g.gain.value = value; return g; };

    // The last stage is a soft clipper, not a compressor: a compressor swallows the first few
    // milliseconds of every sound, which is where a shot or a hit lives. Below half volume this does
    // nothing at all; above it, peaks are rounded off instead of cut square.
    r.master = gain(LEVEL.master * 0.5);
    const clip = ac.createWaveShaper();
    clip.curve = CLIP;
    clip.oversample = '2x';
    r.master.connect(clip);
    clip.connect(ac.destination);

    const room = impulse(ac, 2.2);

    // sound effects
    r.sfx = gain(LEVEL.sfx);
    r.sfx.connect(r.master);
    r.sfxVerb = ac.createConvolver();
    r.sfxVerb.buffer = room;
    r.sfxVerb.connect(r.sfx);

    // music
    r.musicSwitch = gain(LEVEL.music);
    r.musicSwitch.connect(r.master);
    r.muffle = ac.createBiquadFilter();
    r.muffle.type = 'lowpass';
    r.muffle.frequency.value = OPEN;
    r.muffle.Q.value = 0.5;
    r.muffle.connect(r.musicSwitch);
    r.music = gain(1); // songs play into this; duck() turns it down for a moment
    r.music.connect(r.muffle);
    r.musicVerb = ac.createConvolver();
    r.musicVerb.buffer = room;
    const back = gain(0.8);
    r.musicVerb.connect(back);
    back.connect(r.music);

    // two seconds of white noise, shared by everything that hisses, crashes or explodes
    r.noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = r.noise.getChannelData(0);
    const rnd = SO.util.rng(77);
    for (let i = 0; i < data.length; i++) data[i] = rnd() * 2 - 1;
    return r;
  }

  function applySwitches() {
    if (!live) return;
    const t = live.ctx.currentTime;
    live.sfx.gain.setTargetAtTime(SO.settings.get('sfx') ? LEVEL.sfx : 0, t, 0.02);
    live.musicSwitch.gain.setTargetAtTime(SO.settings.get('music') ? LEVEL.music : 0, t, 0.05);
  }

  /* Called on every key and click: the first one opens the context. */
  function unlock() {
    if (!live) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      live = rig = build(new AC());
      applySwitches();
    }
    if (live.ctx.state === 'suspended' && !document.hidden) live.ctx.resume();
    if (waiting.length) {
      const list = waiting.splice(0);
      list.forEach((fn) => fn());
    }
  }

  /* Rise quickly to `vol`, hold if asked, then die away over the rest of `dur`. */
  function envelope(param, t0, vol, o) {
    const attack = o.attack || 0.004;
    param.setValueAtTime(0.0001, t0);
    param.linearRampToValueAtTime(vol, t0 + attack);
    if (o.hold) param.setValueAtTime(vol, t0 + attack + o.hold);
    param.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  }

  /* Send a finished voice to where the current sound goes, and to the room if it asks (send: 0..1). */
  function route(node, o) {
    node.connect(voice.out);
    if (o.send) {
      const send = rig.ctx.createGain();
      send.gain.value = o.send;
      node.connect(send);
      send.connect(rig.sfxVerb);
    }
  }

  /* One oscillator: a pitch slide (from -> to, in Hz) and a fade.
       type      'sine' | 'triangle' | 'square' | 'sawtooth'
       dur, vol  seconds, 0..1
       attack    seconds to full volume (default: a click); hold: seconds at full volume before the fade
       delay     seconds before it starts
       slide     seconds the pitch slide takes (default: the whole of dur)
       cut, cutTo, q   a low-pass filter that slides from cut to cutTo (Hz)
       fm        [ratio, depth]: a second oscillator bends this one, for bells and metal (depth dies with the note)
       wobble    [rate, cents]: vibrato
       send      0..1: how much of it goes to the reverb */
  function tone(o) {
    const ac = rig.ctx;
    const t0 = ac.currentTime + (o.delay || 0);
    const end = t0 + o.dur + 0.05;
    const from = o.from * voice.pitch;
    const osc = ac.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(from, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to * voice.pitch), t0 + (o.slide || o.dur));
    if (o.fm) {
      const mod = ac.createOscillator();
      const depth = ac.createGain();
      mod.frequency.value = from * o.fm[0];
      depth.gain.setValueAtTime(from * o.fm[1], t0);
      depth.gain.exponentialRampToValueAtTime(Math.max(0.01, from * o.fm[1] * 0.02), t0 + o.dur);
      mod.connect(depth);
      depth.connect(osc.frequency);
      mod.start(t0);
      mod.stop(end);
    }
    if (o.wobble) {
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = o.wobble[0];
      depth.gain.value = o.wobble[1];
      lfo.connect(depth);
      depth.connect(osc.detune);
      lfo.start(t0);
      lfo.stop(end);
    }
    let node = osc;
    if (o.cut) {
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = o.q || 1;
      filter.frequency.setValueAtTime(o.cut, t0);
      if (o.cutTo) filter.frequency.exponentialRampToValueAtTime(o.cutTo, t0 + o.dur);
      node.connect(filter);
      node = filter;
    }
    const gain = ac.createGain();
    envelope(gain.gain, t0, o.vol * voice.vol, o);
    node.connect(gain);
    route(gain, o);
    osc.start(t0);
    osc.stop(end);
  }

  /* A burst of filtered noise: explosions, impacts, wind.
       filter    'lowpass' (default) | 'highpass' | 'bandpass', sliding from -> to (Hz), with resonance q
       dur, vol, attack, hold, delay, send   as for tone() */
  function noise(o) {
    const ac = rig.ctx;
    const t0 = ac.currentTime + (o.delay || 0);
    const src = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    src.buffer = rig.noise;
    src.loop = true;
    filter.type = o.filter || 'lowpass';
    filter.Q.value = o.q || 1;
    filter.frequency.setValueAtTime(o.from, t0);
    if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    envelope(gain.gain, t0, o.vol * voice.vol, o);
    src.connect(filter);
    filter.connect(gain);
    route(gain, o);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + o.dur + 0.05);
  }

  SO.audio = {
    unlock,
    tone,
    noise,

    /* Add sound effects: { name: { gap, vary, vol, make(options) } } (see sfx.js). */
    define(sounds) { Object.assign(SOUNDS, sounds); },

    /* Play a sound effect. Options every sound understands:
         x      where on the screen it happens (0..1280): it is panned left or right to match
         pitch  1 is as written, 2 an octave up
         vol    1 is as written
       The rest are the sound's own (size for explosions, and so on). */
    play(name, options) {
      const sound = SOUNDS[name];
      if (!rig || !sound) return;
      const ac = rig.ctx;
      const offline = rig !== live;
      if (!offline) {
        if (!SO.settings.get('sfx') || ac.state !== 'running') return;
        // the same sound twice in a few milliseconds is only louder, not better
        if (lastPlayed[name] !== undefined && ac.currentTime - lastPlayed[name] < (sound.gap || 0.03)) return;
        lastPlayed[name] = ac.currentTime;
      }
      const o = options || NONE;
      voice.pitch = (o.pitch || 1) * (sound.vary ? 1 + (Math.random() * 2 - 1) * sound.vary : 1);
      voice.vol = (o.vol === undefined ? 1 : o.vol) * (sound.vol || 1);
      voice.out = rig.sfx;
      if (o.x !== undefined && ac.createStereoPanner) {
        const pan = ac.createStereoPanner();
        pan.pan.value = clamp((o.x / SO.W - 0.5) * 1.5, -0.75, 0.75);
        pan.connect(rig.sfx);
        voice.out = pan;
      }
      sound.make(o);
    },

    /* ----- for the music ----- */

    /* True once a key or a click has let the browser make sound. */
    get ready() { return !!live; },

    /* fn is called as soon as sound is possible (at once, if it already is). */
    whenReady(fn) {
      if (live) fn();
      else waiting.push(fn);
    },

    /* The graph the music plays into: { ctx, music, musicVerb, noise }. null before the first key or click. */
    get rig() { return rig; },

    /* amount 0..1: how far the music is pushed behind glass. */
    muffle(amount, seconds) {
      if (!live) return;
      const hz = OPEN * Math.pow(SHUT / OPEN, clamp(amount, 0, 1));
      live.muffle.frequency.setTargetAtTime(hz, live.ctx.currentTime, (seconds || 0.25) / 3);
    },

    /* Dip the music by `amount` (0..1) and let it come back over `seconds`. */
    duck(amount, seconds) {
      if (!live) return;
      const t = live.ctx.currentTime;
      const g = live.music.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(1 - clamp(amount, 0, 0.9), t, 0.015);
      g.setTargetAtTime(1, t + 0.08, (seconds || 0.5) / 3);
    },

    /* ----- for development ----- */

    /* Render `seconds` of sound without playing it: fn() makes the sounds (SO.audio.play, a song),
       and the promise gives the AudioBuffer. Used to check levels; nothing in the game calls it. */
    offline(seconds, fn) {
      const rate = 44100;
      const ac = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
      const before = rig;
      rig = build(ac);
      try { fn(rig); } finally { rig = before; }
      return ac.startRendering();
    },
  };

  SO.settings.onChange(applySwitches);

  // Browsers only allow sound after a key or a click. (A touch screen counts the finger coming
  // up, not going down, so the context opened on the way down is woken again on the way up.)
  ['keydown', 'pointerdown', 'pointerup', 'touchend', 'click'].forEach((type) => window.addEventListener(type, unlock));

  // No sound from a tab nobody is looking at.
  document.addEventListener('visibilitychange', () => {
    if (!live) return;
    if (document.hidden) live.ctx.suspend();
    else live.ctx.resume();
  });
})(window.SO);
