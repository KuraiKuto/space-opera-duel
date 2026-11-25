// All voices, including percussion, are generated at the device's sample rate.
(() => {
  'use strict';
  const enabled = { music: true, sound: true };
  const storageKey = 'starfall.audio';
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const key of Object.keys(enabled)) if (typeof saved?.[key] === 'boolean') enabled[key] = saved[key];
  } catch {}
  let ctx, noise, instruments, track = 'theme', paused = false, step = 0, next = 0, timer;
  const bus = {}, lastEffect = new Map();
  const hz = n => 440 * 2 ** ((n - 69) / 12);
  function mix() {
    if (!ctx) return;
    for (const key of Object.keys(bus)) {
      const audible = enabled[key] && !document.hidden && !paused;
      const level = audible ? (key === 'sound' ? .86 : scores[track]?.level ?? 0) : 0;
      bus[key].gain.setTargetAtTime(level, ctx.currentTime, .008);
    }
  }
  function unlock() {
    if (!ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try { ctx = new Audio(); } catch { return; }
      const limiter = ctx.createDynamicsCompressor();
      limiter.connect(ctx.destination);
      for (const key of Object.keys(enabled)) {
        bus[key] = ctx.createGain();
        bus[key].gain.value = enabled[key] ? 1 : 0;
        bus[key].connect(limiter);
      }
      instruments = ctx.createGain();
      instruments.connect(bus.music);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      mix();
      timer = window.setInterval(schedule, 40);
    }
    if (ctx.state !== 'running') ctx.resume().then(schedule).catch(() => {});
    else schedule();
  }
  function voice(source, output, at, length, volume, attack, filter) {
    const env = ctx.createGain();
    env.gain.setValueAtTime(.00001, at);
    env.gain.exponentialRampToValueAtTime(volume, at + attack);
    // Keep enough body for the pitch sweep or melody to register before release.
    env.gain.exponentialRampToValueAtTime(volume * .22, at + attack + (length - attack) * .6);
    env.gain.exponentialRampToValueAtTime(.00001, at + length);
    if (filter) { source.connect(filter); filter.connect(env); }
    else source.connect(env);
    env.connect(output);
    source.onended = () => { source.disconnect(); filter?.disconnect(); env.disconnect(); };
    source.start(at);
    source.stop(at + length + .005);
  }
  function pitch(out, at, from, to, length, shape, level, attack = .004) {
    const osc = ctx.createOscillator();
    osc.type = shape;
    osc.frequency.setValueAtTime(from, at);
    if (from !== to) osc.frequency.exponentialRampToValueAtTime(to, at + length);
    voice(osc, out, at, length, level, attack);
  }
  function hiss(out, at, from, to, length, level) {
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
    src.buffer = noise;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + length);
    voice(src, out, at, length, level, .003, filter);
  }
  function effect(name) {
    if (!ctx || paused || !enabled.sound || document.hidden) return;
    const now = ctx.currentTime;
    if (now - (lastEffect.get(name) ?? -1) < .045) return;
    lastEffect.set(name, now);
    const p = (a,b,d,w,v,delay=0) => pitch(bus.sound, now+delay, a,b,d,w,v);
    const n = (a,b,d,v) => hiss(bus.sound,now,a,b,d,v);
    switch (name) {
      case 'fire': p(780,195,.105,'triangle',.13); n(4100,900,.028,.07); break;
      case 'hostile': p(285,145,.12,'sine',.09); break;
      case 'hit': n(3400,680,.065,.19); p(352,135,.07,'triangle',.10); break;
      case 'deflect': p(890,810,.12,'sine',.12); p(1350,1120,.075,'sine',.055); break;
      case 'shield': p(490,170,.24,'sine',.23); p(725,248,.26,'triangle',.09); break;
      case 'hull': n(2300,130,.31,.33); p(120,37,.28,'sawtooth',.13); break;
      case 'blast': n(3800,110,.34,.36); p(145,35,.33,'sine',.32); break;
      case 'rupture': n(5300,85,.86,.48); p(128,28,.83,'sine',.44); p(88,32,.5,'triangle',.19,.12); break;
      case 'lance': p(290,42,.48,'sawtooth',.13); n(2200,450,.4,.22); break;
      case 'warning': p(260,510,.32,'triangle',.12); break;
      case 'salvage': case 'launch': case 'clear': case 'phase': case 'lost': {
        const lines = {salvage:[76,79,86], launch:[55,62,67], clear:[67,71,74,79], phase:[55,55,62], lost:[55,51,43]};
        lines[name].forEach((note,i) => p(hz(note),hz(note),.32,'triangle',.16,i*.105));
        break;
      }
    }
  }

  // Sixteenth-note positions, semitones above D, and held lengths. The first
  // three knocks reappear in the middle eight and in the fleet's bass drum.
  const overture = [
    [[0,7,2],[3,7,2],[6,7,2],[10,10,5]],
    [[0,12,9],[11,10,2],[14,7,2]],
    [[2,5,5],[8,3,3],[12,5,4]],
    [[0,2,11]],
    [[0,7,2],[3,7,2],[6,10,2],[10,14,6]],
    [[0,15,7],[8,14,3],[12,10,4]],
    [[2,12,4],[7,7,3],[12,5,3]],
    [[0,7,11],[14,10,2]],
    [[0,15,6],[6,14,2],[10,12,6]],
    [[0,17,9],[12,15,4]],
    [[0,14,4],[5,10,3],[9,7,3],[13,10,3]],
    [[0,12,12]],
    [[0,19,3],[4,19,2],[7,17,2],[10,15,5]],
    [[0,14,6],[8,12,6]],
    [[0,10,4],[6,7,4],[12,2,4]],
    [[0,0,14]],
  ];
  const harmony = [0,-2,-4,-5, 0,3,-2,-5, 3,5,-2,0, 3,-2,-5,0];
  const battle = [
    [0,7,3],[3,7,1],[6,10,2],[8,12,3],[14,7,2],[16,14,4],[22,12,2],[26,10,4],
    [32,5,3],[35,5,1],[38,7,2],[40,10,4],[46,12,2],[48,14,3],[52,10,2],[56,7,3],[60,3,3],
  ];
  const scores = {
    theme: {bpm: 86, key: 50, level: .67}, story: {bpm: 68, key: 50, level: .33},
    blockade: {bpm: 118, key: 50, level: .76}, salvage: {bpm: 112, key: 55, level: .78},
    warden: {bpm: 128, key: 48, level: .83}, fleet: {bpm: 136, key: 50, level: .9},
    core: {bpm: 144, key: 53, level: 1},
  };
  function playStep(at) {
    const {bpm, key} = scores[track], unit = 15/bpm;
    const bar = Math.floor(step/16), beat = step%16;
    const root = key + harmony[bar];
    const third = [0,5,-5].includes(harmony[bar]) ? 3 : 4;
    const note = (n,len,w,v,attack) => pitch(instruments,at,hz(n),hz(n),unit*len,w,v,attack);
    if (beat === 0) {
      for (const interval of [0,third,7]) note(root+interval,15,'sine',.046,.12);
    }
    if (track === 'story') {
      if (!beat) note(root-12,13,'sine',.12,.2);
      if (bar%2 === 1 && beat === 6) note(root+19,8,'triangle',.069,.12);
      if (bar%4 === 2 && beat === 12) note(root+12,4,'sine',.095,.08);
    } else if (track === 'theme') {
      const melody = overture[bar].find(event => event[0] === beat);
      if (melody) note(key+12+melody[1],melody[2],'triangle',.19,.015);
      if (beat === 0 || (bar >= 4 && beat === 10)) note(root-12,7,'sine',.17);
      if (bar >= 4 && bar < 15 && [2,7,12].includes(beat))
        note(root+(beat === 7 ? third+12 : 7),3,'sine',.085);
      if (bar >= 8 && bar < 14 && beat === 8) hiss(instruments,at,2200,410,.18,.07);
    } else {
      const phrase = step%64;
      const melody = battle.find(event => event[0] === phrase);
      if (melody) note(key+12+melody[1]+(bar%8 >= 4 ? 3 : 0),melody[2],'triangle',.14,.012);
      const siege = track === 'fleet' || track === 'core';
      if ([0,3,6,8,12,14].includes(beat) || (siege && beat%2 === 0))
        note(root-12+(beat === 14 ? 7 : 0),1.8,'triangle',.16);
      if (beat === 0 || beat === 8 || beat === 11) pitch(instruments,at,124,42,.14,'sine',.23);
      if (beat === 4 || beat === 12) hiss(instruments,at,3000,440,.12,.135);
      if (beat%2 === 0) hiss(instruments,at,7900,4200,.036,beat%4 ? .044 : .024);
      if (track === 'core' && beat%4 === 2) note(root+19,2,'sawtooth',.04);
    }
    next = at + unit;
    step = (step+1)%256;
  }
  function schedule() {
    if (!ctx || paused || ctx.state !== 'running' || !track || !enabled.music || document.hidden) return;
    if (next < ctx.currentTime) next = ctx.currentTime + .012;
    while (next <= ctx.currentTime + .11) playStep(next);
  }
  function pause(value) {
    paused = value;
    if (ctx) next = ctx.currentTime + .03;
    mix();
    schedule();
  }
  function scene(name) {
    if (track === name && !paused) return;
    paused = false;
    if (ctx) {
      const previous = instruments;
      previous.gain.setTargetAtTime(0, ctx.currentTime, .025);
      window.setTimeout(() => previous.disconnect(), 180);
      instruments = ctx.createGain();
      instruments.connect(bus.music);
    }
    track = name;
    step = 0;
    next = ctx ? ctx.currentTime + .06 : 0;
    mix();
    schedule();
  }
  function label(key) {
    const btn = document.getElementById(key);
    btn.setAttribute('aria-pressed', String(enabled[key]));
    btn.querySelector('span').textContent = (key === 'music' ? 'MUSIC' : 'SFX') + (enabled[key] ? ' ON' : ' OFF');
  }
  for (const key of Object.keys(enabled)) {
    label(key);
    document.getElementById(key).addEventListener('click', () => {
      enabled[key] = !enabled[key];
      try { localStorage.setItem(storageKey,JSON.stringify(enabled)); } catch {}
      label(key);
      mix();
      if (key === 'sound' && enabled.sound) effect('salvage');
    });
  }
  // The first gesture on any screen unlocks audio under browser autoplay rules.
  for (const type of ['click','keydown','pointerup']) document.addEventListener(type, unlock, true);
  document.addEventListener('visibilitychange', mix);
  window.addEventListener('pagehide', () => { clearInterval(timer); if (ctx) ctx.suspend().catch(() => {}); });
  window.addEventListener('pageshow', e => { if (ctx && e.persisted) timer = window.setInterval(schedule,40); });
  Starfall.audio = { effect, scene, pause };
})();
