'use strict';

/* Runs a mission's waves: announces each one, spawns its enemies and fires its events on schedule,
   and moves on when the last enemy of the wave is gone. Mission data lives in js/missions.

   It also conducts the music (js/audio/music.js). Each wave plays the mission's song, or its own
   (wave.music); the song is thinned out between waves and filled in during them:
     level 0   the mission opening, and the breather after a wave
     level 1   a wave
     level 2   the last wave (or any wave that asks, with level: 2)

   And it keeps the checkpoint: a mission lost in wave 3 is taken up again at wave 3. */
(function (SO) {
  const INTRO_TIME = 3.2;   // mission title on screen before wave 1
  const RETRY_TIME = 1.6;   // ...and before the wave a retry begins at
  const BANNER_TIME = 1.7;  // "WAVE n" on screen before enemies arrive
  const CLEAR_TIME = 2.0;   // breather after a wave

  function Director(world, mission, startWave) {
    this.world = world;
    this.mission = mission;
    this.total = mission.waves.length;
    this.index = Math.min(this.total, Math.max(1, startWave || 1)) - 1;
    this.state = 'intro'; // intro -> (banner -> fight -> clear) per wave -> done
    this.t = 0;
    this.queue = [];
    this.done = false;
  }

  Director.prototype.update = function (dt) {
    const world = this.world;
    this.t += dt;

    if (this.state === 'intro') {
      if (this.t >= (world.startWave > 1 ? RETRY_TIME : INTRO_TIME)) this.beginWave();
    } else if (this.state === 'banner') {
      if (this.t >= BANNER_TIME) { this.state = 'fight'; this.t = 0; }
    } else if (this.state === 'fight') {
      // nothing left to fight: do not make the player wait for the next group
      const threats = SO.enemies.threats(world);
      if (this.queue.length && threats === 0 && this.queue[0].at > this.t) this.t = this.queue[0].at;
      while (this.queue.length && this.queue[0].at <= this.t) {
        const spawn = this.queue.shift();
        if (spawn.type) SO.enemies.spawn(world, spawn.type, spawn);
        else world.event(spawn);
      }
      if (!this.queue.length && SO.enemies.threats(world) === 0) this.waveCleared();
    } else if (this.state === 'clear') {
      if (this.t >= CLEAR_TIME) { this.index++; this.beginWave(); }
    }
  };

  /* The song for the wave that is playing, or about to. */
  Director.prototype.music = function () {
    const wave = this.mission.waves[Math.min(this.index, this.total - 1)];
    return (wave && wave.music) || this.mission.music || 'battle';
  };

  Director.prototype.beginWave = function () {
    const world = this.world;
    const wave = this.mission.waves[this.index];
    this.queue = wave.spawns.slice().sort((a, b) => a.at - b.at);
    this.state = 'banner';
    this.t = 0;
    world.state = 'play';
    // (a run that began at a boss's later phase keeps that checkpoint until the boss moves it on)
    if (!world.checkpoint || world.checkpoint.wave !== this.index + 1) {
      world.checkpoint = this.index > 0 ? { wave: this.index + 1, label: wave.retry || 'Retry from wave ' + (this.index + 1) } : null;
    }
    world.hud.showBanner('Wave ' + (this.index + 1), wave.name, BANNER_TIME + 0.5);
    world.radio(wave.say);
    SO.audio.play('wave');
    SO.music.play(this.music(), { level: wave.level !== undefined ? wave.level : this.index >= this.total - 1 ? 2 : 1 });
  };

  Director.prototype.waveCleared = function () {
    const world = this.world;
    world.addScore(500);
    if (this.index >= this.total - 1) {
      this.state = 'done';
      this.done = true;
      return;
    }
    this.state = 'clear';
    this.t = 0;
    world.hud.showBanner('Wave clear', '+500', CLEAR_TIME);
    world.say('waveClear');
    SO.audio.play('clear');
    SO.music.level(0, 1.2);
  };

  /* Drop everything still waiting (used when a squadron leader dies). */
  Director.prototype.cancelSpawns = function () { this.queue.length = 0; };

  SO.Director = Director;
})(window.SO);
