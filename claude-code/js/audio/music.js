'use strict';

/* The music: a small sequencer that plays the songs in js/audio/songs on the instruments in
   instruments.js. Nothing is recorded; every note is scheduled a moment before it sounds.

     SO.music.play('battle')                 start a song (cross-fading from the one before); it loops
     SO.music.play('battle', { level: 2 })   ...with more of its parts playing (see "layer" below)
     SO.music.level(0)                       thin out or fill in the song that is playing
     SO.music.stop(1.5)                      fade to silence over that many seconds
     SO.music.play('victory', { then: 'bridge' })   a song that does not loop can lead into one that does
     SO.music.play('battle', { lift: 3 })    ...played that many decibels louder than it is written

   A song is written in sixteenth-note steps, sixteen to a bar:

     id, bpm
     echo       echo time in beats (0.75 is a dotted eighth); leave it out for none
     loop       false for a song that plays once (a fanfare); tail: seconds it rings on after its last bar
     alone      decibels to lift its level 0 by when that plays on its own under a story scene: a battle
                song's quiet layer is written to sit under a fight, with the sound effects on top
     form       the order its sections are played in, and loopFrom: where it goes back to (an index of form)
     channels   one mixer strip per part:
                  plays   'tune' | 'chords' | 'arp' | 'bass' | 'drum'
                  patch   the instrument (a patch in instruments.js); drums name a drum instead
                  gain    how loud; echo, verb: how much goes to the echo and to the reverb; pan: -1..1
                  layer   the level at which this part joins in (default 0: always), or [from, to]
                  low     the lowest note of its register (chords, arp, bass); octave: shift a tune by octaves
                  gate    how much of each step a note sounds for (default 0.9)
     sections   each has `chords`, one per bar ('Dm Bb F C'; 'Gm,A' is two in one bar), and a line
                for each channel that plays in it. A channel the section does not mention is silent.
                stretch: 2 plays its chords and tunes at half speed (the theme, over a battle beat).

   What a channel's line looks like depends on what it plays:

     tune     notes, each 'pitch:steps': 'a4:4 d5:4 f#5:6 e5:2 | ...'. '_' is a rest; '|' marks the
              bar lines (they are only checked, to catch a miscounted bar).
     chords   when the chord is struck, one bar of sixteen steps: 'x---------------' holds it all bar.
     arp      which note of the chord, counting up from the bottom: '0.1.2.1.3.2.1.2.'
     bass     r root, R root an octave up, f fifth, F fifth below, t third
     drum     x a hit, X an accent, o a soft one

   In every pattern '.' is silence, '-' holds the note before it, spaces are ignored, and several bars
   can be given with '|' between them; they repeat for as long as the section lasts. */
(function (SO) {
  const STEPS = 16;   // steps in a bar
  const AHEAD = 0.2;  // seconds of music scheduled in advance
  const TICK = 30;    // milliseconds between looks at the clock
  const START = 0.06; // a new song starts this long after it is asked for

  const songs = {};
  let players = [];   // the one playing, and any still fading out
  let current = null;
  let wanted = null;  // { id, level, then }: what should be playing, even while it cannot
  let timer = null;

  /* ----- reading a song ----- */

  const LETTER = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const QUALITY = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
    sus4: [0, 5, 7], sus2: [0, 2, 7], dim: [0, 3, 6], 5: [0, 7, 12],
  };
  const BASS = { r: 0, R: 12, f: 7, F: -5 };
  const HIT = { x: 0.8, X: 1, o: 0.4 };

  const pitchClass = (letter, mark) => LETTER[letter.toLowerCase()] + (mark === '#' ? 1 : mark === 'b' ? -1 : 0);

  function midiOf(name) {
    const m = /^([a-g])([#b]?)(\d)$/.exec(name);
    return m ? 12 * (Number(m[3]) + 1) + pitchClass(m[1], m[2]) : null;
  }

  function chordOf(name) {
    const m = /^([A-G])([#b]?)(m7|maj7|m|7|sus4|sus2|dim|5)?(?:\/([A-G])([#b]?))?$/.exec(name);
    if (!m) return null;
    const root = pitchClass(m[1], m[2]);
    const steps = QUALITY[m[3] || ''];
    return { root, bass: m[4] ? pitchClass(m[4], m[5]) : root, third: steps[1], tones: steps.map((s) => (root + s) % 12) };
  }

  /* The chord's notes, close together, starting at or above `low`. Whatever the chord, it stays in
     the same register, so one chord leads smoothly into the next. */
  function voicing(chord, low) {
    return chord.tones.map((pc) => low + ((pc - low) % 12 + 12) % 12).sort((a, b) => a - b);
  }

  /* 'x...|x.x.' -> one sixteen-step string per bar. */
  function patternBars(text, where) {
    return text.replace(/\s+/g, '').split('|').filter(Boolean).map((bar) => {
      if (bar.length !== STEPS) console.warn('Song ' + where + ': a pattern bar has ' + bar.length + ' steps, not ' + STEPS + ': ' + bar);
      return bar.padEnd(STEPS, '.');
    });
  }

  function compileSection(song, name, section) {
    const where = song.id + '/' + name;
    const stretch = section.stretch || 1;

    // the chord sounding at every step
    const chordAt = [];
    section.chords.split(/[\s|]+/).filter(Boolean).forEach((token) => {
      const names = token.split(',');
      names.forEach((n) => {
        const chord = chordOf(n);
        if (!chord) console.warn('Song ' + where + ': unknown chord ' + n);
        for (let i = 0; i < STEPS * stretch / names.length; i++) chordAt.push(chord || chordOf('C'));
      });
    });
    const length = chordAt.length;
    const events = [];
    for (let i = 0; i < length; i++) events.push(null);
    const add = (step, channel, midi, len, vel) => {
      if (step >= length) return;
      (events[step] || (events[step] = [])).push({ channel, midi, len, vel });
    };

    Object.keys(song.channels).forEach((channel) => {
      const ch = song.channels[channel];
      const line = section[channel];
      if (!line) return;

      if (ch.plays === 'tune') {
        let step = 0;
        let inBar = 0;
        line.split(/\s+/).filter(Boolean).forEach((token) => {
          if (token === '|') {
            if (inBar !== STEPS) console.warn('Song ' + where + ', ' + channel + ': a bar of ' + inBar + ' steps before step ' + step / stretch);
            inBar = 0;
            return;
          }
          const parts = token.split(':');
          const len = Number(parts[1] || ch.step || 2);
          if (parts[0] !== '_') {
            const midi = midiOf(parts[0]);
            if (midi === null) console.warn('Song ' + where + ', ' + channel + ': unknown note ' + token);
            else add(step, channel, midi + 12 * (ch.octave || 0), len * stretch, 1);
          }
          step += len * stretch;
          inBar += len;
        });
        if (step !== length) console.warn('Song ' + where + ', ' + channel + ': ' + step + ' steps written, ' + length + ' in the section');
        return;
      }

      const bars = patternBars(line, where + ', ' + channel);
      const low = ch.low || (ch.plays === 'bass' ? 33 : 55);
      let last = null; // the events of the note being held, so '-' can lengthen them
      for (let step = 0; step < length; step++) {
        const c = bars[Math.floor(step / STEPS) % bars.length][step % STEPS];
        const chord = chordAt[step];
        const changed = step > 0 && chordAt[step - 1] !== chord;
        if (c === '-' && last && !(ch.plays === 'chords' && changed)) {
          last.forEach((ev) => { ev.len++; });
          continue;
        }
        last = null;
        if (c === '.') continue;
        const before = events[step] ? events[step].length : 0;
        if (ch.plays === 'drum') {
          if (HIT[c]) add(step, channel, null, 1, HIT[c]);
        } else if (ch.plays === 'chords') {
          voicing(chord, low).forEach((midi) => add(step, channel, midi, 1, 1));
        } else if (ch.plays === 'arp') {
          const notes = voicing(chord, low);
          const i = Number(c);
          if (i >= 0) add(step, channel, notes[i % notes.length] + 12 * Math.floor(i / notes.length), 1, 1);
        } else if (ch.plays === 'bass') {
          const root = low + ((chord.bass - low) % 12 + 12) % 12;
          const up = c === 't' ? (chord.root + chord.third - chord.bass + 12) % 12 : BASS[c];
          if (up !== undefined) add(step, channel, root + up, 1, 1);
        }
        if (events[step] && events[step].length > before) last = events[step].slice(before);
      }
    });
    return { length, events };
  }

  function compile(song) {
    song.compiled = {};
    Object.keys(song.sections).forEach((name) => { song.compiled[name] = compileSection(song, name, song.sections[name]); });
    song.form.forEach((name) => { if (!song.compiled[name]) console.warn('Song ' + song.id + ': no section called ' + name); });
    song.form = song.form.filter((name) => song.compiled[name]);
  }

  /* ----- playing a song ----- */

  const inLayer = (ch, level) => {
    const layer = ch.layer || 0;
    return Array.isArray(layer) ? level >= layer[0] && level <= layer[1] : level >= layer;
  };

  const fromDb = (db) => Math.pow(10, (db || 0) / 20);

  /* lift: decibels louder than written. solo: play only that channel (for development: see SO.music.render). */
  function Player(song, rig, level, solo, lift) {
    const ac = rig.ctx;
    const gain = (value, to) => { const g = ac.createGain(); g.gain.value = value; if (to) g.connect(to); return g; };
    this.song = song;
    this.ac = ac;
    this.level = level;
    this.stepDur = 60 / song.bpm / 4;
    this.lift = lift || 0;
    this.out = gain(fromDb(lift), rig.music);
    this.toVerb = gain(fromDb(lift), rig.musicVerb);

    let echoIn = null;
    if (song.echo) {
      echoIn = gain(1);
      const delay = ac.createDelay(2);
      delay.delayTime.value = song.echo * 60 / song.bpm;
      const damp = ac.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2800;
      echoIn.connect(delay);
      delay.connect(damp);
      damp.connect(gain(0.38, delay));
      damp.connect(this.out);
    }

    this.strips = {};
    Object.keys(song.channels).forEach((name) => {
      const ch = song.channels[name];
      const on = inLayer(ch, level) && (!solo || solo === name);
      const strip = { ctx: ac, noise: rig.noise, def: ch, in: gain(1), fader: gain(on ? ch.gain : 0), on };
      strip.in.connect(strip.fader);
      let post = strip.fader;
      if (ch.pan && ac.createStereoPanner) {
        post = ac.createStereoPanner();
        post.pan.value = ch.pan;
        strip.fader.connect(post);
      }
      post.connect(this.out);
      if (ch.echo && echoIn) post.connect(gain(ch.echo, echoIn));
      if (ch.verb) post.connect(gain(ch.verb, this.toVerb));
      this.strips[name] = strip;
    });

    this.at = 0;     // which entry of the form
    this.step = 0;   // which step of that section
    this.time = ac.currentTime + START;
    this.ended = false;
    this.gone = Infinity; // when a fade-out is over
  }

  /* Schedule every note that starts before `until`. */
  Player.prototype.schedule = function (until) {
    const song = this.song;
    const late = this.ac.currentTime - 0.02; // a stalled tab: skip what is already in the past
    while (!this.ended && this.time < until) {
      const section = song.compiled[song.form[this.at]];
      const list = section.events[this.step];
      if (list && this.time >= late) {
        for (let i = 0; i < list.length; i++) {
          const ev = list[i];
          const strip = this.strips[ev.channel];
          if (!strip.on) continue;
          const ch = strip.def;
          if (ch.plays === 'drum') SO.instruments.drum(strip, ch.patch, this.time, ev.vel);
          else SO.instruments.note(strip, ch.patch, this.time, ev.midi, (ev.len - 1 + (ch.gate || 0.9)) * this.stepDur, ev.vel);
        }
      }
      this.step++;
      this.time += this.stepDur;
      if (this.step >= section.length) {
        this.step = 0;
        this.at++;
        if (this.at >= song.form.length) {
          if (song.loop === false) { this.ended = true; this.endTime = this.time + (song.tail || 2); }
          else this.at = song.loopFrom || 0;
        }
      }
    }
  };

  Player.prototype.setLevel = function (level, seconds) {
    this.level = level;
    const t = this.ac.currentTime;
    Object.keys(this.strips).forEach((name) => {
      const strip = this.strips[name];
      const on = inLayer(strip.def, level);
      if (on === strip.on) return;
      strip.on = on;
      strip.fader.gain.setTargetAtTime(on ? strip.def.gain : 0, t, (seconds || 0.5) / 3);
    });
  };

  Player.prototype.setLift = function (lift, seconds) {
    if (lift === this.lift) return;
    this.lift = lift;
    const t = this.ac.currentTime;
    this.out.gain.setTargetAtTime(fromDb(lift), t, (seconds || 0.5) / 3);
    this.toVerb.gain.setTargetAtTime(fromDb(lift), t, (seconds || 0.5) / 3);
  };

  Player.prototype.fade = function (seconds) {
    const t = this.ac.currentTime;
    this.out.gain.setTargetAtTime(0, t, seconds / 3);
    this.toVerb.gain.setTargetAtTime(0, t, seconds / 3);
    this.gone = t + seconds * 1.5;
  };

  Player.prototype.dispose = function () {
    this.out.disconnect();
    this.toVerb.disconnect();
  };

  /* ----- the conductor ----- */

  function tick() {
    const rig = SO.audio.rig;
    if (!rig) return;
    const now = rig.ctx.currentTime;
    players = players.filter((p) => {
      if (now < p.gone) return true;
      p.dispose();
      return false;
    });
    for (let i = 0; i < players.length; i++) players[i].schedule(now + AHEAD);
    if (current && current.ended && now > current.endTime) { // a fanfare is over: on to what follows it
      const ended = current.song.id;
      current.fade(0.3);
      current = null;
      if (wanted && wanted.id === ended) follow(wanted.then);
    }
    if (!players.length && timer) { window.clearInterval(timer); timer = null; }
  }

  /* What comes after a song that does not loop: the song named in its `then` (an id, or
     { id, level }), or silence. */
  function follow(then) {
    wanted = null;
    if (typeof then === 'string') SO.music.play(then);
    else if (then) SO.music.play(then.id, then);
  }

  /* Make what is playing match what is wanted. */
  function start(fade) {
    if (!wanted || !SO.audio.ready || !SO.settings.get('music')) return;
    const song = songs[wanted.id];
    if (!song) return;
    if (current && current.song === song && !current.ended && !wanted.restart) {
      current.setLevel(wanted.level, 0.6);
      current.setLift(wanted.lift, 0.9);
      return;
    }
    wanted.restart = false;
    if (current) current.fade(fade === undefined ? 0.8 : fade);
    current = new Player(song, SO.audio.rig, wanted.level, null, wanted.lift);
    players.push(current);
    if (!timer) timer = window.setInterval(tick, TICK);
    tick();
  }

  SO.music = {
    add(song) {
      compile(song);
      songs[song.id] = song;
    },

    /* options: level (which layers play), lift (decibels louder than written), fade (seconds the song
       before it takes to go), restart (from the top even if it is already playing), then (what
       follows a song that ends). */
    play(id, options) {
      const o = options || {};
      const song = songs[id];
      if (!song) console.warn('Unknown song: ' + id);
      // with the music switched off, a fanfare is never heard: remember what follows it instead
      if (song && song.loop === false && !SO.settings.get('music')) { follow(o.then); return; }
      const same = wanted && wanted.id === id;
      wanted = {
        id,
        level: o.level !== undefined ? o.level : same ? wanted.level : 0,
        lift: o.lift || 0,
        then: o.then || null,
        restart: !!o.restart,
      };
      start(o.fade);
    },

    level(level, seconds) {
      if (wanted) wanted.level = level;
      if (current && SO.settings.get('music')) current.setLevel(level, seconds);
    },

    stop(seconds) {
      wanted = null;
      if (current) current.fade(seconds === undefined ? 0.8 : seconds);
      current = null;
    },

    /* The id of the song that is (or should be) playing. */
    get current() { return wanted ? wanted.id : null; },

    /* How many decibels a song's level 0 is lifted by when it plays alone under a story scene. */
    alone(id) { return (songs[id] && songs[id].alone) || 0; },

    /* The channel names of a song. */
    channels(id) { return songs[id] ? Object.keys(songs[id].channels) : []; },

    /* For development: render a song to an AudioBuffer instead of playing it (see SO.audio.offline).
       solo: the name of one channel, to hear (or measure) it alone. lift: as for play(). */
    render(id, seconds, level, solo, lift) {
      return SO.audio.offline(seconds, (rig) => {
        const player = new Player(songs[id], rig, level || 0, solo, lift);
        player.schedule(seconds);
      });
    },
  };

  // The song asked for before the first key or click starts as soon as sound is allowed...
  SO.audio.whenReady(() => start(0));
  // ...and the music switch stops it dead, or starts it again from the top.
  SO.settings.onChange((name, isOn) => {
    if (name !== 'music') return;
    if (isOn) { start(0); return; }
    players.forEach((p) => p.fade(0.15));
    current = null;
  });
})(window.SO);
