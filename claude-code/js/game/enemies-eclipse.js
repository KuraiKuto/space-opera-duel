'use strict';

/* Enemies that arrive in mission 04, the fleet battle: the Pyre's Cinder battleships, and its
   mothership, the Eclipse, with everything that hangs off it.

   The Eclipse is one boss in three phases, and each plays differently:

     1  Corona     its hull cannot be hurt. Four gun batteries on the rim shoot at Kurai and shell the
                   fleet. Destroy the batteries.
     2  Totality   it pulls the dark over the whole sky and hides three shade vanes round its maw.
                   Shots bounce off a vane in the dark. Guren knows where they are: he holds a light on
                   one at a time, and Kurai breaks the one that is lit. Duskwings fly at Guren's light
                   to put it out, so they have to be shot down too.
     3  The Maw    the light is back and the maw has to open to feed. While it inhales it drags the
                   Foxfire toward it and its core can be hurt; then it breathes out a beam down the
                   middle of the screen. Shoot the core while it is open, and be out of the way after.

   At zero health it does not go quietly: it locks on to Kurai for one last shot, Guren puts the
   Redfang through its jaw, and the core hangs open until Kurai fires the shot that ends it.

   Each phase is a checkpoint: lost in the dark, the fight is taken up again in the dark. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, rand, approach, TAU } = SO.util;
  const W = SO.W;
  const H = SO.H;
  const E = art.eclipse; // the hull's shape: { dx, r }, measured from the maw

  /* Turn an angle toward another by at most step, the short way round. */
  function turn(angle, target, step) {
    const diff = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
    return Math.abs(diff) <= step ? target : angle + Math.sign(diff) * step;
  }

  /* A dashed line from a gun to where its shell will land. */
  function shellLine(ctx, x0, y0, x1, y1, k, t) {
    ctx.globalAlpha = 0.25 + 0.5 * k * (0.6 + 0.4 * Math.sin(t * 40));
    ctx.strokeStyle = pal.orange;
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 14]);
    ctx.lineDashOffset = t * 160;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  /* Where on a friendly capital ship a shell is laid: somewhere along its hull, short of the bow
     (the Foxfire arrives just ahead of the fleet, and should not arrive in the line of fire). */
  function layOn(ship) {
    return { x: ship.x + rand(-90, ship.def.half[0] - 110), y: ship.y + rand(-16, 16) };
  }

  /* ---------- Cinder: a Pyre battleship ---------- */

  const CINDER = {
    aim: 1.0,                                       // seconds its aiming lines show before a broadside
    guns: [[-150, -16], [-59, -16], [-169, 54]],    // muzzles: two deck turrets, one under the bow
  };

  /* Cinder: parks on the right and trades broadsides with the fleet. Its heavy shells are laid on a
     capital ship, along lines that show for a second first: stay out of them, or take one on the
     shields for the fleet. A smaller gun under the bow keeps Kurai honest. Faster once it is burning. */
  SO.enemies.define('cinder', {
    hp: 240, radius: 46, scale: 1, score: 2500, ram: 36, ramSelf: 0, shotDamage: 12,
    shellDamage: 20, fleetDamage: 4,
    boom: 3.2, colors: [pal.red, pal.orange], engine: [212, 40, 18],
    capital: true, name: 'Cinder',
    parts: [[-160, 14, 34], [-80, 8, 42], [80, 0, 46], [160, 10, 40]],
    sprite: art.ships.cinder,
    init(e) {
      if (e.holdX === undefined) e.holdX = W - 240;
      if (e.every === undefined) e.every = 6.5; // seconds between broadsides
      e.state = 'enter';
      e.y0 = e.y;
      e.salvoT = 2.4;
      e.aimT = -1;      // >= 0 while the aiming lines show
      e.aimAt = null;
      e.shells = 0;
      e.shotT = 0;
      e.gun = 0;
      e.pdT = 3;        // the bow gun, for Kurai
      e.pdLeft = 0;
      e.burning = false;
    },
    update(e, dt, world) {
      if (e.state === 'enter') {
        e.x += (e.holdX - e.x) * Math.min(1, dt * 1.3);
        if (Math.abs(e.x - e.holdX) < 4) e.state = 'line';
        return;
      }
      e.y = e.y0 + Math.sin(e.age * 0.5) * 10;

      if (!e.burning && e.hp < e.maxHp * 0.4) {
        e.burning = true;
        world.fx.ring(e.x, e.y, 180, pal.orange, 0.5);
        world.fx.shake(0.3);
        SO.audio.play('groan', { x: e.x });
      }
      if (e.burning && Math.random() < 0.3) {
        world.fx.add({ kind: 'smoke', x: e.x + rand(-170, 190), y: e.y + rand(-40, 30), vx: 60, vy: rand(-40, -10), life: 0.8, size: 14, color: '#2a3152' });
      }
      if (!SO.enemies.canFire(e, world)) { e.charge = 0; e.aimT = -1; return; }
      const haste = e.burning ? 0.78 : 1;

      // the broadside
      if (e.shells > 0) {
        e.shotT -= dt;
        if (e.shotT <= 0) {
          const muzzle = CINDER.guns[e.gun];
          const x = e.x + muzzle[0];
          const y = e.y + muzzle[1];
          const angle = Math.atan2(e.aimAt.y - y, e.aimAt.x - x);
          SO.shots.shell(world, x, y, angle, 340, this.shellDamage, this.fleetDamage);
          world.fx.add({ kind: 'glow', x: x - 10, y, life: 0.14, size: 56, color: pal.gold });
          world.fx.add({ kind: 'disc', x: x - 8, y, life: 0.05, size: 15, color: pal.white });
          world.fx.sparks(x, y, 6, pal.gold, 280, angle, 0.5);
          world.fx.shake(0.06);
          SO.audio.play('cannon', { x });
          e.gun = (e.gun + 1) % CINDER.guns.length;
          e.shells--;
          e.shotT = 0.2;
        }
        e.charge = 0;
      } else if (e.aimT >= 0) {
        e.aimT += dt;
        e.charge = clamp(e.aimT / CINDER.aim, 0, 1);
        if (e.aimT >= CINDER.aim) { e.shells = CINDER.guns.length; e.shotT = 0; e.aimT = -1; }
      } else {
        e.salvoT -= dt;
        if (e.salvoT <= 0) {
          const ship = world.objective.ward(world, e);
          if (ship) { e.aimAt = layOn(ship); e.aimT = 0; SO.audio.play('warn', { x: e.x }); }
          e.salvoT = e.every * haste;
        }
      }

      // the bow gun
      if (e.pdLeft > 0) {
        e.pdShot -= dt;
        if (e.pdShot <= 0) {
          const x = e.x + CINDER.guns[2][0];
          const y = e.y + CINDER.guns[2][1];
          SO.enemies.fire(world, e, x, y, Math.atan2(world.player.y - y, world.player.x - x), 330);
          e.pdShot = 0.18;
          e.pdLeft--;
        }
      } else {
        e.pdT -= dt;
        if (e.pdT <= 0 && e.shells === 0) { e.pdLeft = e.burning ? 3 : 2; e.pdShot = 0; e.pdT = 3.8 * haste; }
      }
    },
    drawUnder(ctx, e) {
      if (e.aimT < 0 || !e.aimAt) return;
      const k = e.aimT / CINDER.aim;
      for (let i = 0; i < CINDER.guns.length; i++) {
        shellLine(ctx, e.x + CINDER.guns[i][0], e.y + CINDER.guns[i][1], e.aimAt.x, e.aimAt.y, k, e.aimT);
      }
    },
    died(e, world) { world.say('capitalDown', true); },
  });

  /* ---------- the Eclipse's parts ---------- */

  /* Battery: a twin gun on the Eclipse's rim. Tracks Kurai and fires pairs of shots; now and then
     the Eclipse has two of them lay a shell on the fleet instead (the aiming line shows first). */
  SO.enemies.define('battery', {
    hp: 54, radius: 27, scale: 1, score: 600, ram: 0, ramSelf: 0, shotDamage: 12,
    shellDamage: 20, fleetDamage: 4,
    boom: 1.7, colors: [pal.red, pal.gold],
    sprite: art.ships.battery,
    init(e) {
      e.aim = Math.PI;
      e.fireT = rand(1.8, 3.4);
      e.burstLeft = 0;
      e.shotT = 0;
      e.shellT = -1;   // >= 0 while it is laying a shell on the fleet
      e.aimAt = null;
    },
    update(e, dt, world) {
      e.x = e.parent.x + e.dx;
      e.y = e.parent.y + e.dy;
      if (!SO.enemies.canFire(e, world)) { e.charge = 0; e.shellT = -1; return; }

      if (e.shellT >= 0) {
        e.aim = turn(e.aim, Math.atan2(e.aimAt.y - e.y, e.aimAt.x - e.x), dt * 3);
        e.shellT += dt;
        e.charge = clamp(e.shellT / 1.0, 0, 1);
        if (e.shellT >= 1.0) {
          const x = e.x + Math.cos(e.aim) * 44;
          const y = e.y + Math.sin(e.aim) * 44;
          SO.shots.shell(world, x, y, Math.atan2(e.aimAt.y - y, e.aimAt.x - x), 340, this.shellDamage, this.fleetDamage);
          world.fx.add({ kind: 'glow', x, y, life: 0.14, size: 56, color: pal.gold });
          world.fx.add({ kind: 'disc', x, y, life: 0.05, size: 15, color: pal.white });
          world.fx.shake(0.06);
          SO.audio.play('cannon', { x });
          e.shellT = -1;
          e.charge = 0;
          e.fireT = Math.max(e.fireT, 1.2);
        }
        return;
      }

      e.aim = turn(e.aim, SO.enemies.aimAtPlayer(e, world), dt * 2.4);
      if (e.burstLeft > 0) {
        e.shotT -= dt;
        if (e.shotT <= 0) {
          const side = e.burstLeft % 2 ? 1 : -1; // one barrel, then the other
          const x = e.x + Math.cos(e.aim) * 44 - Math.sin(e.aim) * 9.5 * side;
          const y = e.y + Math.sin(e.aim) * 44 + Math.cos(e.aim) * 9.5 * side;
          SO.enemies.fire(world, e, x, y, e.aim, 320);
          e.shotT = 0.17;
          e.burstLeft--;
        }
        e.charge = 0;
        return;
      }
      e.fireT -= dt;
      e.charge = clamp(1 - e.fireT / 0.5, 0, 1);
      if (e.fireT <= 0) { e.burstLeft = 2; e.shotT = 0; e.fireT = rand(3.3, 4.5); }
    },
    drawUnder(ctx, e) {
      if (e.shellT < 0 || !e.aimAt) return;
      shellLine(ctx, e.x + Math.cos(e.aim) * 44, e.y + Math.sin(e.aim) * 44, e.aimAt.x, e.aimAt.y, e.shellT, e.shellT);
    },
    died(e, world) { world.say('batteryDown'); },
  });

  /* Shade vane: holds the dark over the Eclipse. Armoured unless Guren's light is on it. */
  SO.enemies.define('vane', {
    hp: 60, radius: 31, scale: 1, score: 800, ram: 0, ramSelf: 0, shotDamage: 0,
    boom: 1.8, colors: [pal.violet, pal.gold],
    sprite: art.ships.vane,
    armored(e) { return !e.lit; },
    init(e) { e.lit = false; },
    update(e) {
      e.x = e.parent.x + e.dx;
      e.y = e.parent.y + e.dy;
    },
    died(e, world) { // its crystal breaks, and a little of the dark goes with it
      world.fx.ring(e.x, e.y, 260, pal.gold, 0.7);
      world.fx.ring(e.x, e.y, 150, pal.cream, 0.5);
      world.fx.shards(e.x, e.y, 14, pal.violet, 360, 12);
      world.fx.flash = Math.max(world.fx.flash, 0.4);
      world.freeze(0.07);
      world.say('vaneDown', true);
      SO.audio.play('chime', { x: e.x });
    },
  });

  /* Duskwing: a drone that flies at the nearest light to put it out. While Guren is holding his
     light on a vane, that light is his: if one reaches him he is knocked off station and the vane
     goes dark again. Otherwise it comes for the Foxfire. */
  SO.enemies.define('duskwing', {
    hp: 2, radius: 17, scale: 1.3, score: 150, ram: 14, ramSelf: 99, shotDamage: 0,
    boom: 0.9, colors: ['#8a2440', pal.orange], engine: [14, 13],
    sprite: art.ships.duskwing,
    init(e) {
      if (e.speed === undefined) e.speed = 205;
      e.wobble = rand(0, TAU);
    },
    update(e, dt, world) {
      const guren = SO.allies.find(world, 'redfang');
      const target = guren && guren.mode === 'light' && guren.stagger <= 0 ? guren : world.player;
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const sway = Math.sin(e.age * 5 + e.wobble) * 70; // moths do not fly straight
      e.x += (dx / dist * e.speed - dy / dist * sway) * dt;
      e.y += (dy / dist * e.speed + dx / dist * sway) * dt;
      e.rot = Math.atan2(dy, dx) - Math.PI + Math.sin(e.age * 5 + e.wobble) * 0.3;
      if (target === guren && dist < 44) {
        guren.def.knock(guren, world);
        SO.enemies.burst(world, e, 0.9);
      }
    },
    /* Its lamp shows in the dark, so it can be seen coming. */
    drawOver(ctx, e, world) {
      if (world.dark < 0.05) return;
      ctx.globalCompositeOperation = 'lighter';
      art.glow(ctx, e.x, e.y, 34, pal.gold, world.dark * (0.7 + 0.3 * Math.sin(e.age * 16)));
      ctx.globalCompositeOperation = 'source-over';
      art.circle(ctx, e.x, e.y, 4.5, pal.cream, pal.enemyInk, 2);
    },
  });

  /* Wreck: a piece of somebody's hull, sucked toward the maw while it inhales. It comes from behind.
     Scenery with a hit box, like the Shiver's ice: a wave does not wait for it. */
  SO.enemies.define('wreck', {
    hp: 3, radius: 22, scale: 1, score: 40, ram: 12, ramSelf: 99, shotDamage: 0,
    boom: 0.8, colors: [pal.redDark, pal.orange], ambient: true,
    sprite: art.ships.wreck,
    init(e) {
      if (e.size === undefined) e.size = rand(0.7, 1.15);
      e.r = 22 * e.size;
      e.spin = rand(-3, 3);
      e.speed = 170;
      e.vx = 170;
      e.vy = 0;
    },
    update(e, dt, world) {
      const pull = world.pull;
      if (pull) {
        const dx = pull.x - e.x;
        const dy = pull.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        e.speed = approach(e.speed, 430, 300 * dt);
        e.vx = dx / dist * e.speed;
        e.vy = dy / dist * e.speed;
        if (dist < 90) { // swallowed
          world.fx.sparks(e.x, e.y, 6, pal.gold, 200);
          e.dead = true;
          return;
        }
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rot += e.spin * dt;
      if (e.x > W + 80 || e.y < -80 || e.y > H + 80) e.dead = true;
    },
  });

  /* ---------- the Eclipse ---------- */

  const HOLD = { x: W - 200, y: H / 2 };                               // where the maw comes to rest
  const BATTERIES = [[-151, -117], [-151, 117], [-47, -221], [-47, 221]]; // on the rim, from the maw
  const VANES = [[-77, -111, -64], [-135, 0, -64], [-77, 111, 64]];    // dx, dy, and where Guren hovers to light it
  const BEAM_HALF = 62;                                                // half the height of its breath
  const PHASES = ['', 'Corona', 'Totality', 'The Maw', 'Last Light'];
  const TIMES = { dim: 2.4, dawn: 2.6, inhale: 5, brace: 1.1, beam: 0.95 };
  const DEATH = { split: 2.4, gone: 3.9 }; // seconds after the last shot: the disc splits, and is gone

  /* Living parts of one kind. */
  function parts(world, e, type) {
    const list = [];
    for (let i = 0; i < world.enemies.length; i++) {
      const p = world.enemies[i];
      if (p.parent === e && p.type === type && !p.dead) list.push(p);
    }
    return list;
  }

  /* How many fighters it still has out. */
  function escorts(world, e) {
    let n = 0;
    for (let i = 0; i < world.enemies.length; i++) {
      const p = world.enemies[i];
      if (p !== e && p.parent !== e && !p.dead && !p.def.ambient) n++;
    }
    return n;
  }

  /* Blow up everything it has out (fighters, drones, wreckage), on short fuses. */
  function rout(world, e) {
    for (let i = 0; i < world.enemies.length; i++) {
      const p = world.enemies[i];
      if (p !== e && p.parent !== e && !p.dead) p.dieIn = rand(0.1, 0.6);
    }
  }

  /* Guren, wherever he is. He is in this fight even if the mission was started at this wave. */
  function guren(world) {
    return SO.allies.find(world, 'redfang') || SO.allies.spawn(world, 'redfang', { mode: 'wing' });
  }

  function fire(world, e, angle, speed) {
    SO.enemies.fire(world, e, e.x - 26, e.y, angle, speed);
  }

  SO.enemies.define('eclipse', {
    hp: 400, radius: 58, scale: 1, score: 10000, ram: 30, ramSelf: 0, shotDamage: 12,
    beamDamage: 34, beamFleetDamage: 7, burn: 14,
    boom: 4, colors: [pal.orange, pal.gold],
    boss: true, name: 'The Eclipse',

    /* Its core is only open to fire in phase 3, while the maw is; and for the last shot of all. */
    armored(e) {
      if (e.phase === 4) return e.state !== 'open';
      return e.phase !== 3 || e.maw < 0.6;
    },

    init(e) {
      e.x = W + 340;
      e.y = HOLD.y;
      e.phase = 0;
      e.state = 'enter';
      e.t = 0;          // seconds in the current state
      e.maw = 0;        // 0 shut .. 1 open
      e.heat = 0;       // 0..1: the core charging
      e.crack = 0;
      e.split = 0;
      e.fanT = 3;
      e.aimT = 4;
      e.burstLeft = 0;
      e.shotT = 0;
      e.turn = 0;
      e.pattern = 0;
      e.salvoT = 5;
      e.escortT = 7;
      e.launches = 0;
      e.duskT = 4;
      e.wreckT = 0;
      e.bumpT = 0;
      e.boomT = 0;
      e.hintT = 0;
      e.enraged = false;
      e.struck = false;
      e.ramCalled = false;
      e.beatT = 0;
      e.rumbled = false;
    },

    /* ----- moving between phases ----- */

    /* A phase reached is a phase kept: a retry starts from it, not from the first. */
    reached(world, phase, label) {
      world.checkpoint = { wave: world.director.index + 1, phase, label };
    },

    begin(e, world) {
      const phase = world.startPhase; // 1, unless this is a retry from a later phase (or a development shortcut)
      if (phase >= 3) { this.dawn(e, world); if (phase >= 4) e.hp = 4; return; }
      if (phase === 2) { this.totality(e, world); return; }
      e.phase = 1;
      e.state = 'guns';
      BATTERIES.forEach((b) => SO.enemies.spawn(world, 'battery', { parent: e, dx: b[0], dy: b[1], x: e.x + b[0], y: e.y + b[1] }));
      world.say('corona', true);
      SO.music.play('eclipse', { level: 2 }); // her tune, in full
    },

    totality(e, world) {
      this.reached(world, 2, 'Retry from Totality');
      e.phase = 2;
      e.state = 'dim';
      e.t = 0;
      e.heat = 0;
      world.clearEnemyShots();
      world.nightfall(0.92);
      world.fx.ring(e.x + E.dx, e.y, 460, pal.orange, 0.9);
      world.fx.shake(0.7);
      world.fx.edge(pal.ink, 1);
      world.freeze(0.1);
      world.hud.showBanner('Totality', 'Phase 2', 2.6);
      world.say('totality', true);
      SO.audio.play('nightfall');
      SO.music.play('eclipse', { level: 0 }); // the music goes dark with the sky: a drone, a bell, a heartbeat
    },

    dawn(e, world) {
      this.reached(world, 3, 'Retry from the Maw');
      e.phase = 3;
      e.state = 'dawn';
      e.t = 0;
      e.heat = 0;
      world.clearEnemyShots();
      rout(world, e);
      world.nightfall(0);
      world.fx.flash = 1.2;
      world.fx.ring(e.x, e.y, 520, pal.cyan, 0.9);
      world.fx.ring(e.x, e.y, 320, pal.cyanLight, 0.7);
      world.fx.shake(0.6);
      const g = guren(world);
      g.mode = 'wing';
      g.vane = null;
      g.lit = false;
      g.stagger = 0;
      g.vy = 0;
      g.fireT = 1;
      g.side = g.side || 1;
      world.freeze(0.08);
      world.hud.showBanner('The Maw', 'Phase 3', 2.6);
      world.say('dawn', true);
      SO.audio.play('dawn');
      SO.music.play('finale', { level: 0, fade: 0.4 }); // "Lights on!": the main theme, over the battle beat
    },

    cycle(e, world, state) {
      e.state = state;
      e.t = 0;
      e.struck = false;
      if (state === 'barrage') { e.fanT = 0.9; world.pull = null; e.heat = 0; }
      if (state === 'inhale') { e.wreckT = 0.5; world.say('inhale', true); SO.audio.play('inhale', { x: e.x }); }
      if (state === 'brace') { world.pull = null; SO.audio.play('alarm'); world.say('brace', true); }
      if (state === 'beam') { // the breath: the whole picture is shoved left
        SO.audio.play('devour');
        world.fx.shake(0.7);
        world.fx.kick(-8, 0);
        world.fx.flash = Math.max(world.fx.flash, 0.45);
      }
    },

    /* Zero health. It is not over until the scene has played out (see the top of the file). */
    down(e, world) {
      if (e.phase === 4) {
        if (e.state === 'open') this.die(e, world);
        return true;
      }
      e.phase = 4;
      e.state = 'lock';
      e.t = 0;
      e.hp = 1;
      e.heat = 0;
      e.ramCalled = false;
      world.pull = null;
      world.truce = true;
      world.clearEnemyShots();
      rout(world, e);
      world.timeScale = 0.45;
      world.freeze(0.14);
      world.fx.shake(0.5);
      world.fx.flash = Math.max(world.fx.flash, 0.6);
      world.say('lastStand', true);
      SO.audio.play('alarm');
      SO.audio.play('groan', { x: e.x });
      SO.music.stop(0.7); // no music from here to the end: only the ship, the alarm, and a heartbeat
      return true;
    },

    die(e, world) {
      // the last shot: everything stops, then the ship takes a long moment to understand
      e.state = 'dying';
      e.t = 0;
      e.boomT = 0.3;
      e.rumbled = false;
      world.truce = true;
      world.freeze(0.22);
      world.slow(0.25, 1.6);
      world.fx.flash = 1;
      world.fx.shake(0.8);
      world.fx.ring(e.x, e.y, 300, pal.cream, 0.6, 1.2);
      world.fx.explode(e.x, e.y, 2.4, [pal.gold, pal.cream]);
      world.say('dying', true);
      SO.audio.play('finalBlow');
    },

    /* ----- every frame ----- */

    update(e, dt, world) {
      e.t += dt;
      this.fend(e, dt, world);

      if (e.state === 'enter') {
        e.x += (HOLD.x - e.x) * Math.min(1, dt * 0.9);
        if (Math.abs(e.x - HOLD.x) < 4) { e.x = HOLD.x; this.begin(e, world); }
        return;
      }
      e.y = HOLD.y + Math.sin(e.age * 0.35) * 5;
      const can = SO.enemies.canFire(e, world);

      if (e.phase === 1) this.corona(e, dt, world, can);
      else if (e.phase === 2) this.dark(e, dt, world, can);
      else if (e.phase === 3) this.feed(e, dt, world, can);
      else this.ending(e, dt, world);
    },

    /* Nobody flies through the hull: the ship is pushed back out, singed. */
    fend(e, dt, world) {
      const p = world.player;
      e.bumpT -= dt;
      if (!p.alive || p.mode !== 'fly' || e.split > 0) return;
      const cx = e.x + E.dx;
      const dx = p.x - cx;
      const dy = p.y - e.y;
      const reach = E.r + 20;
      if (dx * dx + dy * dy >= reach * reach) return;
      p.x = Math.min(p.x, cx - Math.sqrt(Math.max(0, reach * reach - dy * dy)));
      p.vx = Math.min(p.vx, 0);
      if (p.goal) p.goal.x = Math.min(p.goal.x, p.x); // (touch steering: the spot being flown to is pushed out too)
      if (e.bumpT <= 0 && p.damage(this.burn, cx, e.y)) e.bumpT = 0.9;
    },

    /* Fighters from its hangars, when it has few out. */
    launch(e, dt, world, every) {
      e.escortT -= dt;
      if (e.escortT > 0 || escorts(world, e) >= 3) return;
      e.escortT = every;
      const kind = e.launches++ % 2;
      if (kind === 0) {
        const y = rand(140, H - 140);
        for (let i = 0; i < 4; i++) {
          SO.enemies.spawn(world, 'dart', { x: W + 60 + i * 70, y, amp: 90, phase: i * 0.4, drop: i === 3 && e.launches % 4 === 1 ? 'repair' : null });
        }
      } else {
        SO.enemies.spawn(world, 'striker', { y: rand(120, 300) });
        SO.enemies.spawn(world, 'striker', { y: rand(420, H - 120), x: W + 130 });
      }
    },

    /* Phase 1: the batteries do the fighting; this only directs their fire at the fleet. */
    corona(e, dt, world, can) {
      const guns = parts(world, e, 'battery');
      if (!guns.length) { this.totality(e, world); return; }
      e.salvoT -= dt;
      if (e.salvoT <= 0 && can) {
        e.salvoT = 6.5;
        const free = guns.filter((g) => g.shellT < 0 && g.burstLeft === 0);
        for (let i = 0; i < 2 && free.length; i++) {
          const g = free.splice((Math.random() * free.length) | 0, 1)[0];
          const ship = world.objective.ward(world, g);
          if (!ship) break;
          g.aimAt = layOn(ship);
          g.shellT = 0;
          SO.audio.play('warn');
        }
      }
      this.launch(e, dt, world, 13);
    },

    /* Phase 2: the dark. */
    dark(e, dt, world, can) {
      if (e.state === 'dim') { // the light going out
        if (e.t < TIMES.dim) return;
        e.state = 'dark';
        e.t = 0;
        e.fanT = 2.6;
        e.aimT = 5;
        e.duskT = 8;
        VANES.forEach((v) => SO.enemies.spawn(world, 'vane', { parent: e, dx: v[0], dy: v[1], hover: v[2], x: e.x + v[0], y: e.y + v[1] }));
        const g = guren(world);
        g.mode = 'light';
        g.stagger = 0;
        world.say('vanes', true);
        return;
      }
      const vanes = parts(world, e, 'vane');
      if (!vanes.length) { this.dawn(e, world); return; }
      const g = guren(world);
      g.vane = vanes[0];
      for (let i = 0; i < vanes.length; i++) vanes[i].lit = g.lit && g.vane === vanes[i];
      if (!can) return;

      // flares off the corona: a slow fan with a gap that moves
      e.fanT -= dt;
      e.heat = clamp(1 - e.fanT / 0.7, 0, 1) * 0.5;
      if (e.fanT <= 0) {
        const n = 10;
        const gap = 1 + (e.turn * 3) % (n - 3);
        for (let i = 0; i < n; i++) {
          if (i === gap || i === gap + 1) continue;
          fire(world, e, Math.PI + (i - (n - 1) / 2) * 0.2, 185);
        }
        e.turn++;
        e.fanT = 3.2;
        e.heat = 0;
      }
      // and a few aimed shots, so standing still in the gap is not an answer
      if (e.burstLeft > 0) {
        e.shotT -= dt;
        if (e.shotT <= 0) { fire(world, e, SO.enemies.aimAtPlayer(e, world), 330); e.shotT = 0.2; e.burstLeft--; }
      } else {
        e.aimT -= dt;
        if (e.aimT <= 0) { e.burstLeft = 3; e.shotT = 0; e.aimT = 5; }
      }

      // duskwings, for Guren's light. They come in from the far side of the screen, behind Kurai,
      // so there are a few seconds to turn round and stop them.
      e.duskT -= dt;
      if (e.duskT <= 0 && escorts(world, e) < 4) {
        e.duskT = 7;
        const edge = e.launches++ % 3;
        for (let i = 0; i < 2; i++) {
          const x = rand(40, 300);
          if (edge === 0) SO.enemies.spawn(world, 'duskwing', { x, y: -30 });
          else if (edge === 1) SO.enemies.spawn(world, 'duskwing', { x, y: H + 30 });
          else SO.enemies.spawn(world, 'duskwing', { x: -30, y: rand(120, H - 120) });
        }
        world.say('dusk', e.launches === 1);
      }
    },

    /* Phase 3: barrage (shut) -> inhale (open, pulling) -> brace (open, charging) -> beam -> barrage. */
    feed(e, dt, world, can) {
      if (e.state === 'dawn') {
        if (e.t >= TIMES.dawn) this.cycle(e, world, 'barrage');
        return;
      }
      if (!e.enraged && e.hp < e.maxHp * 0.45) {
        e.enraged = true;
        world.fx.ring(e.x, e.y, 220, pal.gold, 0.5);
        world.fx.shake(0.4);
        world.say('bossAngry', true);
        SO.audio.play('groan', { x: e.x });
      }
      const open = e.state === 'inhale' || e.state === 'brace' || e.state === 'beam';
      e.maw = approach(e.maw, open ? 1 : 0, dt * (open ? 2.4 : 3.2));

      if (e.state === 'barrage') {
        if (can) this.barrage(e, dt, world);
        this.launch(e, dt, world, 9);
        if (e.t >= (e.enraged ? 4.4 : 5.4) && e.burstLeft === 0) this.cycle(e, world, 'inhale');
      } else if (e.state === 'inhale') {
        this.inhale(e, dt, world);
        if (e.t >= TIMES.inhale) this.cycle(e, world, 'brace');
      } else if (e.state === 'brace') {
        e.heat = clamp(e.t / TIMES.brace, 0, 1);
        if (e.t >= TIMES.brace) this.cycle(e, world, 'beam');
      } else if (e.state === 'beam') {
        e.heat = 1;
        this.breathe(e, world);
        if (e.t >= TIMES.beam) this.cycle(e, world, 'barrage');
      }
    },

    barrage(e, dt, world) {
      if (e.burstLeft > 0) {
        e.shotT -= dt;
        if (e.shotT <= 0) { fire(world, e, SO.enemies.aimAtPlayer(e, world), 370); e.shotT = 0.13; e.burstLeft--; }
        return;
      }
      e.fanT -= dt;
      e.heat = clamp(1 - e.fanT / 0.5, 0, 1) * 0.5;
      if (e.fanT > 0) return;
      const aim = SO.enemies.aimAtPlayer(e, world);
      const hard = e.enraged;
      let n, i;
      if (e.pattern === 0) {          // aimed fan
        n = hard ? 7 : 5;
        for (i = 0; i < n; i++) fire(world, e, aim + (i - (n - 1) / 2) * 0.16, 290);
      } else if (e.pattern === 1) {   // slow wall with a gap
        n = hard ? 13 : 11;
        const gap = 2 + (e.turn++ * 3) % (n - 5);
        for (i = 0; i < n; i++) {
          if (i === gap || i === gap + 1) continue;
          fire(world, e, Math.PI + (i - (n - 1) / 2) * 0.17, 205);
        }
      } else {                        // aimed burst
        e.burstLeft = hard ? 6 : 4;
        e.shotT = 0;
      }
      e.pattern = (e.pattern + 1) % 3;
      e.fanT = hard ? 1.25 : 1.6;
      e.heat = 0;
    },

    inhale(e, dt, world) {
      const p = world.player;
      const force = e.enraged ? 185 : 150;
      world.pull = e.maw > 0.5 ? { x: e.x - 30, y: e.y, force } : null;
      e.heat = 0.25 + 0.1 * Math.sin(e.t * 9);
      SO.audio.play('inhale', { x: e.x });

      // light, torn loose and streaming into the maw
      for (let i = 0; i < 2; i++) {
        const a = Math.PI + rand(-0.9, 0.9);
        const d = rand(260, 900);
        const x = e.x + Math.cos(a) * d;
        const y = e.y + Math.sin(a) * d;
        world.fx.add({ kind: 'spark', x, y, vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d * 1.6, life: 0.55, size: rand(2, 3.5), color: i ? pal.cyanLight : pal.cyan });
      }
      // whatever is still in the air goes with it
      for (let i = 0; i < world.enemyShots.length; i++) {
        const s = world.enemyShots[i];
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        s.vx += dx / dist * 520 * dt;
        s.vy += dy / dist * 520 * dt;
        if (dist < 70) s.dead = true;
      }
      // and wreckage, from behind
      e.wreckT -= dt;
      if (e.wreckT <= 0 && e.t < TIMES.inhale - 1.2 && p.alive) {
        e.wreckT = e.enraged ? 0.6 : 0.85;
        SO.enemies.spawn(world, 'wreck', { x: -50, y: rand(70, H - 70) });
      }
    },

    /* The beam: one heavy hit on whoever is in it, Kurai or a capital ship. */
    breathe(e, world) {
      if (e.struck) return;
      e.struck = true;
      const p = world.player;
      if (p.alive && p.x < e.x - 40 && Math.abs(p.y - e.y) < BEAM_HALF + p.r) p.damage(this.beamDamage, p.x + 60, e.y);
      for (let i = 0; i < world.allies.length; i++) {
        const a = world.allies[i];
        if (a.dead || !a.def.capital) continue;
        if (Math.abs(a.y - e.y) < BEAM_HALF + a.def.half[1]) SO.allies.damage(world, a, this.beamFleetDamage, a.x + a.def.half[0], a.y);
      }
    },

    /* Phase 4: lock -> (Guren) -> reel -> open -> (Kurai's shot) -> dying -> gone. */
    ending(e, dt, world) {
      const g = guren(world);
      e.maw = approach(e.maw, 1, dt * 4);
      if (e.state === 'lock') {
        e.heat = clamp(e.t / 2, 0, 1);
        if (!e.ramCalled && e.t > 1.15) { // long enough for the Admiral to have her say
          e.ramCalled = true;
          g.mode = 'ram';
          g.t = 0;
          g.vx = 0;
          g.rammed = false;
          g.ramX = e.x - 78;
          g.ramY = e.y + 62;
          world.say('ram', true);
        }
        if (g.rammed || e.t > 3.6) { // he is through its jaw: the shot goes wide
          e.state = 'reel';
          e.t = 0;
          world.timeScale = 1;
          world.freeze(0.16);
          world.slow(0.3, 0.9);
          world.fx.explode(e.x - 50, e.y + 66, 3, [pal.red, pal.gold]);
          world.fx.explode(e.x - 20, e.y + 40, 2, [pal.orange, pal.cream], { delay: 0.1 });
          world.fx.ring(e.x - 50, e.y + 66, 340, pal.gold, 0.6, 1.2);
          world.fx.flash = 1;
          world.fx.shake(1);
          world.fx.kick(8, 3);
          SO.audio.play('bigBoom', { x: e.x });
          SO.audio.play('devour');
        }
      } else if (e.state === 'reel') {
        e.heat = clamp(1 - e.t / 0.9, 0, 1);
        e.crack = Math.min(0.4, e.t * 0.6);
        if (e.t > 1.0) {
          e.state = 'open';
          e.t = 0;
          e.hintT = 0;
          world.truce = false;
          world.say('open', true);
        }
      } else if (e.state === 'open') {
        e.heat = 0.45 + 0.25 * Math.sin(e.t * 8);
        e.hintT -= dt;
        if (e.hintT <= 0) { e.hintT = 3.2; world.hud.showBanner('Fire!', 'Finish it', 2.2); }
        e.beatT -= dt;
        if (e.beatT <= 0) { // the core, beating in the quiet
          e.beatT = 0.9;
          world.fx.ring(e.x, e.y, 120, pal.gold, 0.5, 0.6);
          SO.audio.play('heartbeat', { x: e.x });
        }
        if (Math.random() < 0.3) world.fx.sparks(e.x + rand(-60, 60), e.y + rand(-60, 60), 2, pal.gold, 240);
      } else if (e.state === 'dying') {
        this.breakApart(e, dt, world);
      }
    },

    /* The Eclipse breaking apart, in three movements:
         0 .. SPLIT        cracks run out from the maw and the light it swallowed starts to show through
                           them; explosions walk across the hull, faster and faster; the picture trembles
         SPLIT             one white frame, and the disc comes apart in six pieces
         SPLIT .. GONE     the pieces drift, and the light pours back out across the sky */
    breakApart(e, dt, world) {
      const fx = world.fx;
      const cx = e.x + E.dx;
      const k = clamp(e.t / DEATH.split, 0, 1);
      e.heat = 1;
      e.crack = Math.min(1, 0.4 + e.t * 0.3);
      if (!e.rumbled && e.t > 0.25) { e.rumbled = true; SO.audio.play('rumble'); }

      if (e.split === 0) {
        fx.trauma = Math.max(fx.trauma, 0.2 + 0.35 * k); // a tremble that grows, never a blur
        e.boomT -= dt;
        if (e.boomT <= 0) {
          e.boomT = 0.2 - 0.13 * k;
          const a = rand(0, TAU);
          const d = rand(0, E.r);
          fx.explode(cx + Math.cos(a) * d, e.y + Math.sin(a) * d, rand(1, 2.4), this.colors);
          SO.audio.play(Math.random() < 0.35 ? 'crack' : 'boom', { x: e.x, size: 1.5, vol: 0.7 });
        }
        if (e.t > DEATH.split) { // it goes
          e.split = 0.001;
          fx.flash = 1.8;
          fx.shake(1);
          world.freeze(0.2);
          world.slow(0.3, 1.3);
          this.pour(e, world, 46);
          fx.ring(cx, e.y, 760, pal.cream, 1.0, 1.6);
          fx.ring(cx, e.y, 520, pal.cyanLight, 0.8, 1.2);
          fx.ring(cx, e.y, 320, pal.gold, 0.6);
          for (let i = 0; i < 16; i++) { // plates of the hull
            const a = rand(0, TAU);
            const v = rand(160, 520);
            fx.add({ kind: 'chunk', x: cx + Math.cos(a) * 120, y: e.y + Math.sin(a) * 120, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1, 1.8), size: rand(9, 18), color: '#22101c', rot: rand(0, TAU), spin: rand(-6, 6), drag: 0.5, trail: pal.orange });
          }
          for (let i = 0; i < 6; i++) {
            const a = rand(0, TAU);
            const d = rand(0, E.r * 0.9);
            fx.explode(cx + Math.cos(a) * d, e.y + Math.sin(a) * d, rand(1.6, 2.8), this.colors, { delay: i * 0.07 });
          }
          SO.audio.play('shatter', { x: e.x });
        }
      } else {
        e.split += dt * 0.75;
        this.pour(e, world, 2);
      }
      if (e.t > DEATH.gone) {
        e.finished = true;
        world.truce = false;
        SO.enemies.kill(world, e);
      }
    },

    /* The light it swallowed, pouring back out: motes of cyan, streaming away from the wreck. */
    pour(e, world, count) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU);
        const v = rand(220, 760);
        world.fx.add({
          kind: 'glow', x: e.x + E.dx * 0.5 + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40,
          vx: Math.cos(a) * v - 140, vy: Math.sin(a) * v, life: rand(0.8, 1.7), size: rand(12, 30),
          color: i % 3 === 0 ? pal.cream : i % 3 === 1 ? pal.cyan : pal.cyanLight, drag: 0.5,
        });
      }
    },

    /* ----- what the HUD and the dark ask of it ----- */

    bar(e, world) {
      const guns = BATTERIES.length * SO.enemies.TYPES.battery.hp;
      const vanes = VANES.length * SO.enemies.TYPES.vane.hp;
      const total = guns + vanes + e.maxHp;
      const sum = (list) => list.reduce((n, p) => n + Math.max(0, p.hp), 0);
      const phase = e.state === 'enter' ? world.startPhase : e.phase; // (on its way in, a retry already shows what is done)
      let left = phase === 4 ? 0 : Math.max(0, e.hp);
      if (phase < 3) left += e.phase === 2 && e.state === 'dark' ? sum(parts(world, e, 'vane')) : vanes;
      if (phase < 2) left += e.phase === 1 ? sum(parts(world, e, 'battery')) : guns;
      return {
        k: left / total,
        name: this.name + (PHASES[e.phase] ? ' · ' + PHASES[e.phase] : ''),
        marks: [e.maxHp / total, (e.maxHp + vanes) / total],
      };
    },

    lamp(e, lights) { lights.push({ x: e.x, y: e.y, r: 130, a: 0.35 }); },

    draw(ctx, e) {
      art.ships.eclipse(ctx, { t: e.age, maw: e.maw, heat: e.heat, flash: e.flash > 0.35, crack: e.crack, split: e.split });
    },

    drawOver(ctx, e, world) {
      if (e.split > 0) return;
      if (e.state === 'dying') this.shafts(ctx, e);
      const p = world.player;
      ctx.save();
      ctx.translate(e.x, e.y);
      art.ships.eclipseCorona(ctx, e.age, 0.2 + world.dark * 0.8 + e.heat * 0.3);
      if (world.dark > 0.3) { // in the dark: a breath of furnace light, so the maw can be found
        ctx.globalCompositeOperation = 'lighter';
        art.glow(ctx, 0, 0, 70 + e.heat * 80, pal.orange, world.dark * (0.35 + e.heat));
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();

      const x1 = e.x - 60;
      if (e.phase === 3 && e.state === 'brace') { // where the beam will be
        const k = e.t / TIMES.brace;
        const blink = 0.6 + 0.4 * Math.sin(e.t * 40);
        ctx.globalAlpha = 0.1 + 0.16 * k * blink;
        ctx.fillStyle = pal.gold;
        ctx.fillRect(0, e.y - BEAM_HALF, x1, BEAM_HALF * 2);
        ctx.globalAlpha = 0.35 + 0.6 * k * blink;
        ctx.strokeStyle = pal.gold;
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 12]);
        ctx.lineDashOffset = e.t * 160;
        ctx.beginPath();
        ctx.moveTo(x1, e.y - BEAM_HALF);
        ctx.lineTo(0, e.y - BEAM_HALF);
        ctx.moveTo(x1, e.y + BEAM_HALF);
        ctx.lineTo(0, e.y + BEAM_HALF);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else if (e.phase === 3 && e.state === 'beam') {
        const k = Math.max(0, Math.min(1, e.t / 0.06, (TIMES.beam - e.t) / 0.16)); // snaps on, tapers off
        this.beam(ctx, x1, e.y, x1 + 40, BEAM_HALF * k);
      } else if (e.phase === 4 && e.state === 'lock' && p.alive) { // the last shot, lined up on Kurai
        const blink = 0.6 + 0.4 * Math.sin(e.t * 50);
        ctx.globalAlpha = 0.55 + 0.45 * e.heat * blink;
        ctx.strokeStyle = e.heat > 0.6 && blink > 0.8 ? pal.white : pal.red;
        ctx.lineWidth = 6 + e.heat * 8;
        ctx.setLineDash([20, 12]);
        ctx.lineDashOffset = e.t * 260;
        ctx.beginPath();
        ctx.moveTo(x1, e.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 62 - e.heat * 18, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.phase === 4 && e.state === 'reel' && e.t < 0.7) { // ...and going wide
        const k = Math.max(0, Math.min(1, e.t / 0.05, (0.7 - e.t) / 0.25));
        ctx.save();
        ctx.translate(x1 + 40, e.y);
        ctx.rotate(0.42);
        this.beam(ctx, 0, 0, 1600, BEAM_HALF * 0.8 * k);
        ctx.restore();
      }
    },

    /* Shafts of light breaking out of the dying hull: more of them, and longer, as the cracks spread. */
    shafts(ctx, e) {
      const k = clamp(e.t / DEATH.split, 0, 1);
      const count = 3 + Math.floor(k * 8);
      const reach = 260 + 900 * k;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996 + e.age * (i % 2 ? 0.22 : -0.16); // spread by the golden angle, turning slowly
        const half = 0.03 + 0.025 * Math.sin(e.age * 5 + i * 1.7);
        ctx.globalAlpha = (0.16 + 0.2 * k) * (0.7 + 0.3 * Math.sin(e.age * 9 + i));
        art.poly(ctx, [0, 0, Math.cos(a - half) * reach, Math.sin(a - half) * reach, Math.cos(a + half) * reach, Math.sin(a + half) * reach], i % 3 ? pal.cyanLight : pal.cream);
      }
      ctx.globalAlpha = 1;
      art.glow(ctx, 0, 0, 120 + 160 * k, pal.cyanLight, 0.5 + 0.4 * k);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    },

    /* A beam from x back to the left edge (or `length` long), centred on y, `half` thick each way. */
    beam(ctx, x, y, length, half) {
      if (half <= 0) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = pal.orange;
      ctx.fillRect(x - length, y - half * 1.5, length, half * 3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = pal.orange;
      ctx.fillRect(x - length, y - half, length, half * 2);
      ctx.fillStyle = pal.gold;
      ctx.fillRect(x - length, y - half * 0.72, length, half * 1.44);
      ctx.fillStyle = pal.white;
      ctx.fillRect(x - length, y - half * 0.36, length, half * 0.72);
    },
  });
})(window.SO);
