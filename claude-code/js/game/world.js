'use strict';

/* One run of a mission: owns every object in play, steps them, checks collisions, draws the frame.
   The mission scene creates a World, calls update and draw, and reads world.outcome
   (and world.checkpoint, for where a retry should start).

   It also keeps the game's clock, and two ways of bending it for a blow that should be felt:
     world.freeze(0.08)     stop everything for that many real seconds (a hit-stop)
     world.slow(0.4, 0.8)   run at that speed for that many real seconds, easing back to normal
   Both are kept short. The player cannot steer while time stands still, so a freeze is a few
   frames, and nothing that happens ten times a second gets one. */
(function (SO) {
  const pal = SO.pal;
  const { rand, pick, approach, clamp, lerp } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const SAY_COOLDOWN = 7; // seconds before the same kind of radio line can repeat
  const DARK = { scale: 0.25, margin: 24, color: '3,3,12', depth: 0.93 }; // the dark is painted small and stretched

  function World(mission, options) {
    options = options || {};
    this.mission = mission;
    this.state = 'intro'; // intro -> play -> won | lost
    this.outcome = null;  // 'victory' | 'gameover', set once the ending has played out
    this.time = 0;
    this.clock = 0;       // real seconds, unaffected by slow motion
    this.endT = 0;
    this.hitStop = 0;     // real seconds of freeze left
    this.lastFreeze = -9; // when the last one was asked for (world.clock)
    this.timeScale = 1;   // set directly for a slow scene (the Eclipse's last shot, a lost mission)
    this.slowT = 0;       // real seconds of slow motion left, out of slowDur, at slowScale
    this.slowDur = 1;
    this.slowScale = 1;
    this.stats = { score: 0, kills: 0, fired: 0, hits: 0, time: 0 };
    this.lastSaid = {};

    this.failReason = null; // why the mission was lost, when it was not Kurai's ship: 'escort', 'dark', 'fleet'

    // Where a retry picks up after a defeat: { wave, phase, label }, or null for the top of the mission.
    // The director moves it on at each wave (js/game/director.js); a boss in phases can move it further.
    this.checkpoint = options.checkpoint || null;
    this.startWave = options.startWave || 1;   // this run began here (a retry from a checkpoint)...
    this.startPhase = options.startPhase || 1; // ...and at this phase of that wave's boss

    // what a boss can do to the whole sky (the Eclipse, js/game/enemies-eclipse.js)
    this.dark = 0;        // 0..1: how much of the light is gone; ships carry pools of light through it
    this.darkGoal = 0;    // ...and where it is heading
    this.pull = null;     // { x, y, force }: drags Kurai's ship toward a point
    this.truce = false;   // true while a scripted moment plays: nothing can hurt Kurai

    this.enemies = [];
    this.allies = [];
    this.shots = [];
    this.enemyShots = [];
    this.pickups = [];

    this.fx = new SO.Fx();
    this.backdrop = new SO.Backdrop(mission.backdrop);
    this.comms = new SO.Comms();
    this.player = new SO.Player(this);
    this.hud = new SO.Hud(this);
    this.objective = SO.objectives.create(this, mission.objective);
    this.director = new SO.Director(this, mission, options.startWave);

    if (this.startWave > 1) { // a retry from a checkpoint: no need to be told twice
      this.hud.showBanner(mission.title, 'Mission ' + String(mission.number).padStart(2, '0'), 1.5);
    } else {
      this.hud.showBanner(mission.title, 'Mission ' + String(mission.number).padStart(2, '0'), 3, this.objective.text);
      this.radio(mission.intro);
    }
    // the mission's song, with only its quiet parts until the first wave arrives (the director turns it up)
    SO.audio.muffle(0);
    SO.music.play(this.director.music(), { level: 0 });
  }

  /* Stop the clock for a few frames, so a blow lands. Calls do not add up: the longest one wins.
     light: true is for small things (a fighter going up); it is skipped if there was a freeze a
     moment ago, so a string of kills does not turn into a stutter. */
  World.prototype.freeze = function (seconds, light) {
    if (light && this.clock - this.lastFreeze < 0.25) return;
    this.lastFreeze = this.clock;
    this.hitStop = Math.max(this.hitStop, seconds);
  };

  /* Slow motion: `scale` times normal speed for `seconds` of real time. It holds for the first half
     and eases back to full speed over the second. */
  World.prototype.slow = function (scale, seconds) {
    if (this.slowT > 0 && this.slowScale < scale) return; // already slower than that
    this.slowScale = scale;
    this.slowDur = seconds;
    this.slowT = seconds;
  };

  World.prototype.update = function (realDt) {
    let scale = this.timeScale;
    if (this.slowT > 0) {
      this.slowT -= realDt;
      scale *= lerp(1, this.slowScale, clamp(this.slowT / this.slowDur * 2, 0, 1));
    }
    let dt = realDt * scale;
    if (this.hitStop > 0) { this.hitStop -= realDt; dt = 0; }
    this.clock += realDt;
    this.time += dt;
    if (this.state === 'play') this.stats.time += dt;

    this.backdrop.update(dt);
    if (this.state === 'intro' || this.state === 'play') this.director.update(dt);
    this.player.update(dt);
    SO.allies.update(this, dt);
    SO.enemies.update(this, dt);
    SO.shots.update(this.shots, dt);
    SO.shots.update(this.enemyShots, dt);
    SO.pickups.update(this, dt);
    this.collide();
    SO.shots.sweep(this.shots);
    SO.shots.sweep(this.enemyShots);
    SO.shots.sweep(this.enemies);
    SO.shots.sweep(this.pickups);
    this.objective.update(this, dt);
    this.dark = approach(this.dark, this.darkGoal, realDt * 0.5);
    this.fx.update(dt, realDt);
    this.comms.update(realDt);
    this.hud.update(realDt);

    if (this.state === 'play') {
      const why = this.objective.failed(this);
      if (why) this.fail(why);
      else if (this.director.done && this.player.alive) this.win();
    }
    if (this.state === 'won') {
      this.endT += realDt;
      this.backdrop.speed = Math.min(7, 1 + this.endT * 4);
      if (this.endT > 2.6) this.outcome = 'victory';
    } else if (this.state === 'lost') {
      this.endT += realDt;
      this.timeScale = this.endT < 0.9 ? 0.3 : 1;
      if (this.endT > (this.failReason ? 3.2 : 2.3)) this.outcome = 'gameover';
    }
  };

  World.prototype.collide = function () {
    const player = this.player;
    const enemies = this.enemies;
    let i, j, s, e, dx, dy, reach;

    // Kurai's bolts against enemies
    for (i = 0; i < this.shots.length; i++) {
      s = this.shots[i];
      for (j = 0; j < enemies.length; j++) {
        e = enemies[j];
        if (e.dead || e.fleeing || e.x - e.r > W + 10) continue;
        if (SO.enemies.touches(e, s.x, s.y, s.r)) {
          s.dead = true;
          if (!s.ally) this.stats.hits++;
          this.fx.sparks(s.x, s.y, s.heavy ? 9 : 4, s.ally ? pal.gold : pal.cyanLight, s.heavy ? 320 : 220, Math.PI, 0.9);
          SO.enemies.hit(this, e, s.dmg, s.x, s.y, s);
          break;
        }
      }
    }

    // the enemy's heavy shells against the fleet's capital ships
    for (i = 0; i < this.enemyShots.length; i++) {
      s = this.enemyShots[i];
      if (!s.heavy || s.dead) continue;
      for (j = 0; j < this.allies.length; j++) {
        const a = this.allies[j];
        if (a.dead || !a.def.capital) continue;
        if (Math.abs(s.x - a.x) < a.def.half[0] && Math.abs(s.y - a.y) < a.def.half[1]) {
          s.dead = true;
          this.fx.explode(s.x, s.y, 0.8, [pal.orange, pal.gold], { push: [s.vx * 0.3, s.vy * 0.3] });
          SO.audio.play('boom', { x: s.x, size: 0.8 });
          SO.allies.damage(this, a, s.fleetDmg, s.x, s.y);
          break;
        }
      }
    }

    if (!player.alive || player.mode !== 'fly') return;

    // enemy fire against Kurai
    for (i = 0; i < this.enemyShots.length; i++) {
      s = this.enemyShots[i];
      if (s.dead) continue;
      dx = player.x - s.x;
      dy = player.y - s.y;
      reach = player.r + s.r;
      if (dx * dx + dy * dy < reach * reach && player.damage(s.dmg, s.x, s.y)) {
        s.dead = true;
        if (!player.alive) return;
      }
    }

    // ramming
    for (j = 0; j < enemies.length; j++) {
      e = enemies[j];
      if (e.dead || e.fleeing || e.dying !== undefined) continue;
      if (SO.enemies.touches(e, player.x, player.y, player.r, 0.8) && player.damage(e.def.ram, e.x, e.y)) {
        SO.enemies.hit(this, e, e.def.ramSelf);
        if (!player.alive) return;
      }
    }
  };

  World.prototype.addScore = function (points, x, y) {
    this.stats.score += points;
    this.hud.scored();
    if (x !== undefined) this.fx.text(x, y - 24, '+' + points, pal.gold, points >= 1000 ? 30 : points >= 500 ? 24 : 20);
  };

  /* Put lines on the radio. A line is 'text' (Kurai speaking) or { who, text }, as the helpers
     in js/missions/missions.js build them; lines may be one line or a list of them. */
  World.prototype.radio = function (lines, urgent) {
    if (!lines) return;
    if (!Array.isArray(lines)) lines = [lines];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (typeof line === 'string') this.comms.say('kurai', line, urgent && i === 0);
      else this.comms.say(line.who, line.text, urgent && i === 0);
    }
  };

  /* Someone says a random line of the given kind from the mission's chatter (shieldDown, waveClear...). */
  World.prototype.say = function (kind, urgent) {
    const lines = this.mission.chatter && this.mission.chatter[kind];
    if (!lines || !lines.length) return;
    if (this.lastSaid[kind] !== undefined && this.clock - this.lastSaid[kind] < SAY_COOLDOWN) return;
    this.lastSaid[kind] = this.clock;
    this.radio(pick(lines), urgent);
  };

  /* Something a wave scheduled that is not an enemy:
       { at, say: line or lines }            radio
       { at, ally: 'redfang', mode: 'wing' } a friendly ship arrives (unique: true: unless it is already here)
       { at, dismiss: 'redfang' }            ...and leaves */
  World.prototype.event = function (ev) {
    if (ev.say) this.radio(ev.say, ev.urgent);
    if (ev.ally && !(ev.unique && SO.allies.find(this, ev.ally))) {
      SO.allies.spawn(this, ev.ally, Object.assign({}, ev, { type: undefined, at: undefined, unique: undefined }));
    }
    if (ev.dismiss) SO.allies.dismiss(this, ev.dismiss);
  };

  /* Every kill passes through here, so the objective can keep count. */
  World.prototype.enemyDown = function (e) { this.objective.enemyDown(this, e); };

  /* A boss is beaten: the rest of its squadron breaks and burns. (What the boss itself does as it
     goes is in js/game/enemies.js: it runs, or it breaks up.) */
  World.prototype.bossDown = function (boss) {
    this.say('bossDown', true);
    this.director.cancelSpawns();
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.dead && e !== boss) e.dieIn = rand(0.2, 0.8);
    }
  };

  /* Take the light away (0..1) or give it back (0). It fades over a couple of seconds. */
  World.prototype.nightfall = function (amount) { this.darkGoal = amount; };

  World.prototype.clearEnemyShots = function () {
    for (let i = 0; i < this.enemyShots.length; i++) {
      const s = this.enemyShots[i];
      this.fx.sparks(s.x, s.y, 3, pal.pink, 120);
      this.fx.add({ kind: 'glow', x: s.x, y: s.y, life: 0.25, size: 26, color: pal.pink });
    }
    this.enemyShots.length = 0;
  };

  World.prototype.win = function () {
    this.state = 'won';
    this.endT = 0;
    this.stats.hullBonus = Math.round(this.player.hull) * 20;
    this.stats.score += this.stats.hullBonus;
    this.clearEnemyShots();
    this.player.leave();
    this.objective.won(this);
    this.say('victory', true);
    // the fanfare starts now, and reaches its last chord as the victory screen comes up
    SO.music.play('victory', { fade: 0.4, then: { id: 'bridge', level: 0 } });
  };

  World.prototype.playerDied = function () {
    if (this.state === 'lost') return;
    this.state = 'lost';
    this.endT = 0;
    this.comms.queue.length = 0;
    this.comms.current = null;
    SO.music.stop(1.2);
    SO.audio.muffle(1, 0.9);
  };

  /* The mission is lost though Kurai still flies: the escort is gone, the light is out. */
  World.prototype.fail = function (reason) {
    if (this.state !== 'play') return;
    this.state = 'lost';
    this.failReason = reason;
    this.endT = 0;
    this.comms.queue.length = 0;
    this.comms.current = null;
    this.say(reason + 'Lost', true); // chatter: escortLost, darkLost
    SO.music.stop(1.6);
    SO.audio.muffle(1, 1.2);
    if (reason === 'dark') {
      this.backdrop.glow = 0;
      this.fx.shake(0.6);
      this.fx.edge(pal.ink, 1);
      SO.audio.play('nightfall');
    }
  };

  World.prototype.draw = function (ctx) {
    const fx = this.fx;
    this.backdrop.draw(ctx);

    ctx.save();
    fx.transform(ctx);
    SO.allies.draw(ctx, this);
    SO.pickups.draw(ctx, this);
    SO.enemies.draw(ctx, this);
    if (this.dark > 0.01) this.drawDark(ctx);
    SO.enemies.drawOver(ctx, this);
    SO.shots.drawEnemy(ctx, this.enemyShots);
    SO.shots.drawPlayer(ctx, this.shots);
    this.player.draw(ctx);
    fx.draw(ctx);
    ctx.restore();

    fx.drawFlash(ctx);
    this.hud.draw(ctx);
  };

  /* The dark: everything drawn so far goes black, except round the lights. Kurai's ship is one;
     allies and enemies add theirs with lamp(). Shots, effects and the HUD are drawn after, so they shine. */
  World.prototype.drawDark = function (ctx) {
    const m = DARK.margin; // wider than the screen, so a screen shake shows no bright edge
    const k = DARK.scale;
    if (!this.darkCanvas) {
      this.darkCanvas = document.createElement('canvas');
      this.darkCanvas.width = Math.ceil((W + m * 2) * k);
      this.darkCanvas.height = Math.ceil((H + m * 2) * k);
    }
    const g = this.darkCanvas.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, this.darkCanvas.width, this.darkCanvas.height);
    g.fillStyle = 'rgba(' + DARK.color + ',' + (this.dark * DARK.depth).toFixed(3) + ')';
    g.fillRect(0, 0, this.darkCanvas.width, this.darkCanvas.height);

    const lights = [];
    const p = this.player;
    if (p.alive) lights.push({ x: p.x, y: p.y, r: 250 });
    let i;
    for (i = 0; i < this.allies.length; i++) {
      if (!this.allies[i].dead && this.allies[i].def.lamp) this.allies[i].def.lamp(this.allies[i], lights);
    }
    for (i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].dead && this.enemies[i].def.lamp) this.enemies[i].def.lamp(this.enemies[i], lights);
    }
    g.globalCompositeOperation = 'destination-out';
    for (i = 0; i < lights.length; i++) {
      const l = lights[i];
      const x = (l.x + m) * k;
      const y = (l.y + m) * k;
      const r = l.r * k;
      const pool = g.createRadialGradient(x, y, 0, x, y, r);
      pool.addColorStop(0, 'rgba(0,0,0,' + (l.a === undefined ? 0.95 : l.a) + ')');
      pool.addColorStop(0.45, 'rgba(0,0,0,' + (l.a === undefined ? 0.6 : l.a * 0.6) + ')');
      pool.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = pool;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.drawImage(this.darkCanvas, -m, -m, W + m * 2, H + m * 2);
  };

  SO.World = World;
})(window.SO);
