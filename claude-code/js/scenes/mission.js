'use strict';

/* Mission scene: plays one mission, handles pause, and shows the victory or game over screen.
   The dialogue before and after is a separate scene (js/scenes/story.js); js/story/campaign.js strings them together. */
(function (SO) {
  const { formatTime, pick } = SO.util;
  const number = (n) => Math.round(n).toLocaleString('en-US');

  function MissionScene(missionId, options) {
    this.mission = SO.missions.get(missionId) || SO.missions.first();
    this.options = options || {};
  }

  MissionScene.prototype.kind = 'mission';

  MissionScene.prototype.enter = function () {
    this.world = new SO.World(this.mission, this.options);
    this.paused = false;
    this.ended = false;
    this.primary = null; // what Enter does on the end screen
    SO.screens.hide();
  };

  MissionScene.prototype.exit = function () {
    SO.screens.hide();
    SO.audio.muffle(0);
  };

  MissionScene.prototype.update = function (dt) {
    if (this.ended) {
      this.world.update(dt); // the sky keeps moving behind the end screen
      if (SO.input.pressed('confirm')) this.onAction(this.primary);
      return;
    }
    if (SO.input.pressed('pause')) this.setPaused(!this.paused);
    else if (this.paused && SO.input.pressed('confirm')) this.setPaused(false);
    if (this.paused) return;

    this.world.update(dt);
    if (this.world.outcome) this.finish(this.world.outcome);
  };

  MissionScene.prototype.draw = function (ctx) { this.world.draw(ctx); };

  MissionScene.prototype.setPaused = function (paused) {
    if (this.ended || this.paused === paused) return;
    this.paused = paused;
    SO.audio.play('ui');
    SO.audio.muffle(paused ? 1 : 0, 0.3); // the music goes behind glass while the game is on hold
    if (paused) SO.screens.show('pause', { mission: this.label(), objective: this.world.objective.text || '' });
    else SO.screens.hide();
  };

  MissionScene.prototype.onBlur = function () {
    if (!this.ended && this.world && this.world.state !== 'lost') this.setPaused(true);
  };

  MissionScene.prototype.label = function () {
    return 'Mission ' + String(this.mission.number).padStart(2, '0') + ' \u00b7 ' + this.mission.title;
  };

  MissionScene.prototype.finish = function (outcome) {
    const world = this.world;
    const mission = this.mission;
    const stats = world.stats;
    const label = this.label();
    this.ended = true;

    if (outcome === 'victory') {
      const hull = world.player.hull / world.player.maxHull;
      const grade = world.objective.grade(world); // 0..1: the hull, weighed with the objective
      const rank = grade >= 0.9 ? 'S' : grade >= 0.6 ? 'A' : grade >= 0.3 ? 'B' : 'C';
      const extra = world.objective.stat(world);
      const best = SO.storage.get('best.' + mission.id, 0);
      if (stats.score > best) SO.storage.set('best.' + mission.id, stats.score);
      SO.campaign.complete(mission.id);
      const hasNext = SO.campaign.hasMore(mission.id);
      this.primary = hasNext ? 'next' : 'retry';
      SO.screens.show('victory', {
        mission: label,
        rank,
        line: (mission.victoryLines && mission.victoryLines[rank]) || 'The sky is clear.',
        score: number(stats.score),
        hull: Math.round(hull * 100) + '%',
        extraLabel: extra[0],
        extra: extra[1],
        time: formatTime(stats.time),
        best: stats.score > best ? (best ? 'New best score! Previous best: ' + number(best) : 'New best score!') : 'Best score: ' + number(best),
        hasNext,
        nextLabel: SO.missions.next(mission.id) ? 'Next mission' : 'Continue the story',
      });
      // (the fanfare has been playing since the last enemy went down: js/game/world.js)
    } else {
      const director = world.director;
      const failLine = world.failReason && mission.failLines && mission.failLines[world.failReason];
      this.primary = 'retry';
      SO.screens.show('gameover', {
        mission: label,
        heading: world.failReason ? 'Mission failed' : 'Game over',
        line: failLine || (mission.defeatLines ? pick(mission.defeatLines) : 'The ship is lost.'),
        score: number(stats.score),
        wave: (director.index + 1) + ' / ' + director.total,
        kills: number(stats.kills),
        time: formatTime(stats.time),
        retryLabel: world.checkpoint ? world.checkpoint.label : 'Retry mission',
        hasCheckpoint: !!world.checkpoint,
      });
      SO.audio.muffle(0, 0.2);
      SO.music.play('defeat', { fade: 0.2 });
    }
  };

  MissionScene.prototype.onAction = function (action) {
    if (action === 'resume') {
      this.setPaused(false);
    } else if (action === 'pause') { // the pause button on a touch screen
      this.setPaused(true);
    } else if (action === 'retry' || action === 'restart') { // straight back in: the story scene is not replayed
      // after a defeat, 'retry' takes the mission up where it was lost; 'restart' is always from the top
      const from = action === 'retry' && this.world.outcome === 'gameover' ? this.world.checkpoint : null;
      SO.audio.play('ui');
      SO.campaign.fly(this.mission.id, from ? { startWave: from.wave, startPhase: from.phase, checkpoint: from } : {});
    } else if (action === 'next') {
      SO.audio.play('ui');
      SO.campaign.advance(this.mission.id);
    } else if (action === 'title') {
      SO.audio.play('ui');
      SO.engine.setScene(SO.scenes.title);
    }
  };

  SO.scenes.Mission = MissionScene;
})(window.SO);
