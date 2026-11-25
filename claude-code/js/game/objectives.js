'use strict';

/* What a mission asks for, beyond clearing its waves. A mission file picks one:

     objective: { type: 'waves',   text: '...' }                       clear every wave (the default)
     objective: { type: 'escort',  text: '...', ally: 'tinderbox' }    ...and keep a ship alive
     objective: { type: 'relight', text: '...', target: 'snuffer', total: 3 }
                                                                       ...and destroy the targets before the light runs out
     objective: { type: 'fleet',   text: '...', ships: ['vigil', 'marigold'] }
                                                                       ...and keep at least one of the capital ships alive

   Each objective can: set itself up (init), tick (update), say why the mission is lost (failed),
   react to a kill (enemyDown) and to the win (won), draw its gauge under the wave pips (draw),
   grade the run from 0 to 1 (grade), name one figure for the victory screen (stat), and point at
   the friendly ship that bombs go for and patch crates mend (ward). */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp } = SO.util;
  const W = SO.W;

  const GAUGE = { y: 68, w: 200, h: 13 };

  /* A labelled bar, centred under the wave pips. */
  function gauge(ctx, hud, label, fraction, color, alert) {
    const x = W / 2 - GAUGE.w / 2 + 44;
    const blink = Math.sin(hud.t * 14) > 0;
    art.text(ctx, label, x - 12, GAUGE.y + 7, { size: 13, align: 'right', baseline: 'middle', color: alert ? pal.pink : pal.cream, lineWidth: 4 });
    art.roundRect(ctx, x, GAUGE.y, GAUGE.w, GAUGE.h, GAUGE.h / 2);
    art.paint(ctx, pal.navyDeep, alert && blink ? pal.red : pal.ink, 4);
    art.paint(ctx, pal.navyDeep);
    if (fraction > 0) {
      ctx.save();
      art.roundRect(ctx, x, GAUGE.y, GAUGE.w, GAUGE.h, GAUGE.h / 2);
      ctx.clip();
      ctx.fillStyle = color;
      ctx.fillRect(x, GAUGE.y, GAUGE.w * clamp(fraction, 0, 1), GAUGE.h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, GAUGE.y + 2.5, GAUGE.w * clamp(fraction, 0, 1), 3);
      ctx.restore();
    }
    return x + GAUGE.w;
  }

  const hullOf = (world) => world.player.hull / world.player.maxHull;

  const BASE = {
    init() {},
    update() {},
    failed() { return null; },
    enemyDown() {},
    won() {},
    draw() {},
    /* The friendly ship in need: for a bomber, the one nearest `from`; for a patch crate (no `from`),
       the one most damaged. null when the mission has nobody to look after. */
    ward() { return null; },
    grade(world) { return hullOf(world); },
    stat(world) {
      const s = world.stats;
      return ['Accuracy', s.fired ? Math.round(s.hits / s.fired * 100) + '%' : '-'];
    },
  };

  const TYPES = {
    waves: {},

    /* Keep one ship alive. */
    escort: {
      init(world) {
        this.ship = SO.allies.spawn(world, this.ally, {});
        this.name = (this.label || this.ally).toUpperCase();
      },
      failed() { return this.ship.hp <= 0 ? 'escort' : null; },
      ward() { return this.ship.dead ? null : this.ship; },
      draw(ctx, hud) {
        const k = this.ship.hp / this.ship.maxHp;
        const low = k < 0.4;
        const flash = hud.allyFlash > 0.5;
        gauge(ctx, hud, this.name, k, flash ? pal.white : low ? pal.red : pal.gold, low || flash);
      },
      grade(world) { return (hullOf(world) + this.ship.hp / this.ship.maxHp) / 2; },
      stat() { return [this.label || 'Escort', Math.round(this.ship.hp / this.ship.maxHp * 100) + '%']; },
    },

    /* Destroy every target before they drain the light. Each one still standing drinks it;
       each one destroyed gives a little back. */
    relight: {
      init(world) {
        this.total = this.total || 3;
        this.drain = this.drain === undefined ? 0.5 : this.drain;    // light per second, per target on the field
        this.restore = this.restore === undefined ? 12 : this.restore; // light given back per target destroyed
        this.light = 100;
        this.destroyed = 0;
        this.warned = false;
        // a run that begins at a later wave (a retry): the targets of the waves before it are already gone
        const waves = world.mission.waves;
        for (let i = 0; i < world.startWave - 1 && i < waves.length; i++) {
          waves[i].spawns.forEach((spawn) => { if (spawn.type === this.target) this.destroyed++; });
        }
        world.backdrop.glow = this.destroyed / this.total;
      },
      update(world, dt) {
        if (world.state !== 'play') return;
        let active = 0;
        for (let i = 0; i < world.enemies.length; i++) {
          const e = world.enemies[i];
          if (e.type === this.target && !e.dead && e.dying === undefined && e.state !== 'enter') active++;
        }
        this.draining = active > 0;
        this.light = Math.max(0, this.light - active * this.drain * dt);
        if (!this.warned && this.light < 30) {
          this.warned = true;
          world.say('lightLow', true);
          SO.audio.play('alarm');
        }
      },
      failed() { return this.light <= 0 ? 'dark' : null; },
      enemyDown(world, e) {
        if (e.type !== this.target) return;
        this.destroyed++;
        this.light = Math.min(100, this.light + this.restore);
        world.backdrop.glow = this.destroyed / this.total;
        world.fx.ring(e.x, e.y, 320, pal.cyan, 0.8);
        world.fx.ring(e.x, e.y, 200, pal.cyanLight, 0.6);
        world.fx.edge(pal.cyan, 0.6); // a little of the Lantern's light, back
        SO.audio.play('chime', { x: e.x });
        if (this.destroyed < this.total) world.say('targetDown', true);
      },
      won(world) {
        world.backdrop.relight();
        world.fx.flash = 1.4;
        SO.audio.play('relight');
      },
      draw(ctx, hud) {
        const k = this.light / 100;
        const low = k < 0.3;
        const pulse = this.draining && Math.sin(hud.t * 9) > 0; // the bar flickers while it is being drunk
        const right = gauge(ctx, hud, (this.label || 'Light').toUpperCase(), k, low ? pal.pink : pulse ? pal.cyanLight : pal.cyan, low);
        // one mark per target: red while it stands, lit once it is gone
        for (let i = 0; i < this.total; i++) {
          const done = i < this.destroyed;
          art.circle(ctx, right + 20 + i * 20, GAUGE.y + GAUGE.h / 2, 6.5, done ? pal.cyan : pal.redDark, pal.ink, 3.5);
        }
      },
      grade(world) { return (hullOf(world) + this.light / 100) / 2; },
      stat() { return [this.label || 'Light', Math.round(this.light) + '%']; },
    },

    /* Hold the line: the mission is lost when the last of the fleet's capital ships is gone.
       Losing one is survivable; it costs firepower, and the rank. */
    fleet: {
      init(world) {
        this.fleet = (this.ships || []).map((name) => SO.allies.spawn(world, name, {}));
      },
      strength() {
        let hp = 0;
        let max = 0;
        this.fleet.forEach((ship) => { hp += ship.hp; max += ship.maxHp; });
        return max ? hp / max : 0;
      },
      failed() { return this.fleet.every((ship) => ship.hp <= 0) ? 'fleet' : null; },
      ward(world, from) {
        let best = null;
        let bestScore = Infinity;
        this.fleet.forEach((ship) => {
          if (ship.dead) return;
          const score = from ? Math.abs(ship.y - from.y) : ship.hp / ship.maxHp;
          if (score < bestScore) { best = ship; bestScore = score; }
        });
        return best;
      },
      won(world) {
        world.backdrop.relight();
        world.fx.flash = 1.4;
        SO.audio.play('relight');
      },
      draw(ctx, hud) {
        const k = this.strength();
        const low = k < 0.35;
        const flash = hud.allyFlash > 0.5;
        const right = gauge(ctx, hud, (this.label || 'Fleet').toUpperCase(), k, flash ? pal.white : low ? pal.red : pal.cyan, low || flash);
        // one lantern per ship: lit while it is in the line
        for (let i = 0; i < this.fleet.length; i++) {
          art.circle(ctx, right + 20 + i * 20, GAUGE.y + GAUGE.h / 2, 6.5, this.fleet[i].dead ? pal.navyDeep : pal.gold, pal.ink, 3.5);
        }
      },
      grade(world) { return (hullOf(world) + this.strength()) / 2; },
      stat() { return [this.label || 'Fleet', Math.round(this.strength() * 100) + '%']; },
    },
  };

  SO.objectives = {
    TYPES,

    /* config: the mission's objective field. */
    create(world, config) {
      config = config || {};
      const objective = Object.assign({}, BASE, TYPES[config.type] || TYPES.waves, config);
      objective.init(world);
      return objective;
    },
  };
})(window.SO);
