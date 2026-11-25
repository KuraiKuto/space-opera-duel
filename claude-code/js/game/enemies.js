'use strict';

/* Enemies. Each entry in TYPES is one kind of ship: its numbers, its sprite, and how it flies.
   This file holds the system and the Pyre's fighters; enemies-shiver.js, enemies-meridian.js and
   enemies-eclipse.js add the ones that arrive with missions 02 to 04 through SO.enemies.define().
   To add a kind: define it, give it a sprite in js/art/ships.js, and use its name in a mission file.
   Any field set on a spawn in a mission file (hp, speed, fireEvery, drop...) overrides the default.

   Optional fields on a kind:
     boss: true, name   health bar; its death routs every other enemy on screen
     flees: true        at zero health it breaks off and escapes instead of exploding
     ambient: true      scenery with a hit box (ice): a wave does not wait for it
     parts              extra hit circles [[dx, dy, r], ...] for ships longer than one circle
     weak               [dx, dy, r]: the only spot where shots count; they bounce off the rest
     armored(e)         true while shots bounce off everywhere
     drawUnder(ctx, e)  drawn beneath all ships: aiming lines, beams
     draw(ctx, e)       draws the ship itself, instead of sprite (the Eclipse, which has moving parts)
     drawOver(ctx, e)   drawn above all ships and above the dark: what shines (js/game/world.js, world.dark)
     lamp(e, lights)    adds pools of light { x, y, r } that the dark cannot cover
     capital: true      a ship of the line: a small health bar of its own; friendly capital ships fire at it first
     bar(e, world)      what a boss's health bar shows: { k, name, marks } (a boss in several phases)
     down(e, world)     called at zero health; return true to play out an ending of its own instead of
                        exploding at once (it calls SO.enemies.kill again with e.finished set)
     died(e, world)     called once it is beaten

   How an enemy goes, at zero health:
     most       explode at once (blast)
     flees      spin out and run (flee)
     boss or capital   break up: for BREAK_UP seconds the ship lists, shudders and bursts plate by
                plate, out of the fight but still on screen, and then goes up (breakUp). It is marked
                with e.dying, and the wave is not over until it has gone. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, lerp, rand, approach, TAU } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const DARK_LINES = 0.3; // how dark it has to be before aiming lines move above the dark
  const BREAK_UP = 1.4;   // seconds a boss or a capital ship takes to come apart

  function aimAtPlayer(e, world) {
    return Math.atan2(world.player.y - e.y, world.player.x - e.x);
  }

  function canFire(e, world) {
    return world.state === 'play' && world.player.alive && e.x < W - 30 && e.x > 0;
  }

  function fire(world, e, x, y, angle, speed) {
    SO.shots.enemy(world, x, y, angle, speed, e.def.shotDamage);
    world.fx.sparks(x, y, 3, pal.gold, 140, angle, 0.5);
    world.fx.add({ kind: 'glow', x, y, life: 0.09, size: 30, color: pal.gold });
    SO.audio.play('enemyShoot', { x });
  }

  const TYPES = {
    /* Dart: weaves across the screen in a line, loops back round, takes pot shots.
       unarmed: true on a spawn makes it one that only flies (the first minute of the first mission). */
    dart: {
      hp: 2, radius: 22, scale: 1.35, score: 100, ram: 22, ramSelf: 99, shotDamage: 12,
      boom: 1, colors: [pal.red, pal.orange], engine: [20, 16],
      sprite: art.ships.dart,
      init(e) {
        e.y0 = e.y;
        if (e.amp === undefined) e.amp = 60;       // height of the weave
        if (e.freq === undefined) e.freq = 2.2;    // speed of the weave
        if (e.phase === undefined) e.phase = 0;
        if (e.speed === undefined) e.speed = 230;
        if (!e.fireEvery) e.fireEvery = [1.5, 2.8];
        e.fireT = rand(0.5, 1.6);
      },
      update(e, dt, world) {
        const before = e.y;
        e.x -= e.speed * dt;
        e.y = e.y0 + Math.sin(e.age * e.freq + e.phase) * e.amp;
        if (dt > 0) e.rot = clamp(-(e.y - before) / dt / e.speed * 0.6, -0.5, 0.5);
        if (e.x < -50) { // off the left edge: come round again, closer to Kurai's height
          e.x = W + 50;
          e.y0 = clamp(lerp(e.y0, world.player.y, 0.5), 90, H - 90);
          e.fireT = rand(0.5, 2);
        }
        e.fireT -= dt;
        if (e.fireT <= 0 && !e.unarmed && canFire(e, world) && e.x > world.player.x + 160) {
          fire(world, e, e.x - 30, e.y, aimAtPlayer(e, world), 300);
          e.fireT = rand(e.fireEvery[0], e.fireEvery[1]);
        }
      },
    },

    /* Lancer: parks on the right, shadows Kurai's height, fires aimed three-shot bursts. */
    lancer: {
      hp: 12, radius: 34, scale: 1.3, score: 250, ram: 25, ramSelf: 4, shotDamage: 12,
      boom: 1.5, colors: [pal.red, pal.gold], engine: [32, 22],
      sprite: art.ships.lancer,
      init(e) {
        if (e.holdX === undefined) e.holdX = W - 220; // where it parks
        if (e.offset === undefined) e.offset = 0;      // height it keeps relative to Kurai
        if (e.fireEvery === undefined) e.fireEvery = 1.9;
        e.state = 'enter';
        e.vy = 0;
        e.burstT = rand(0.8, 1.4);
        e.burstLeft = 0;
        e.shotT = 0;
        e.side = 1;
        e.aim = Math.PI;
      },
      update(e, dt, world) {
        if (e.state === 'enter') {
          e.x += (e.holdX - e.x) * Math.min(1, dt * 2.4);
          if (Math.abs(e.x - e.holdX) < 5) { e.state = 'hold'; e.holdAge = e.age; }
        } else {
          e.x = e.holdX + Math.sin((e.age - e.holdAge) * 0.9) * 16;
        }
        const targetY = clamp(world.player.y + e.offset, 70, H - 70);
        e.vy = approach(e.vy, clamp((targetY - e.y) * 2, -115, 115), 320 * dt);
        e.y += e.vy * dt;

        if (e.state !== 'hold') return;
        if (e.burstLeft > 0) {
          e.shotT -= dt;
          if (e.shotT <= 0) {
            fire(world, e, e.x - 49, e.y - 29 * e.side, e.aim, 380);
            e.side = -e.side;
            e.shotT = 0.14;
            e.burstLeft--;
          }
          e.charge = 0;
          return;
        }
        e.burstT -= dt;
        e.charge = clamp(1 - e.burstT / 0.5, 0, 1); // cannons glow before a burst
        if (e.burstT <= 0 && canFire(e, world)) {
          e.aim = aimAtPlayer(e, world);
          e.burstLeft = 3;
          e.shotT = 0;
          e.burstT = e.fireEvery;
        }
      },
    },

    /* Striker: lines up on Kurai, shows a lock-on line, then rams straight across. No guns. */
    striker: {
      hp: 4, radius: 25, scale: 1.3, score: 200, ram: 36, ramSelf: 99, shotDamage: 0,
      boom: 1.2, colors: [pal.orange, pal.gold], engine: [28, 20],
      sprite: art.ships.striker,
      init(e) {
        e.state = 'enter';
        e.t = 0;
        e.homeX = W - 70 - rand(0, 50);
      },
      update(e, dt, world) {
        e.t += dt;
        if (e.state === 'enter') {
          e.x += (e.homeX - e.x) * Math.min(1, dt * 4);
          e.charge = 0;
          if (e.t > 0.7) { e.state = 'aim'; e.t = 0; e.warned = false; }
        } else if (e.state === 'aim') {
          if (e.t < 0.7) e.y += (clamp(world.player.y, 50, H - 50) - e.y) * Math.min(1, dt * 4.5);
          e.x = e.homeX + e.t * 16; // pulls back like a drawn bow
          e.charge = e.t;
          if (!e.warned && e.t > 0.35) { e.warned = true; SO.audio.play('warn', { x: e.x }); }
          if (e.t >= 1) { e.state = 'dash'; SO.audio.play('dash', { x: e.x }); }
        } else {
          e.x -= 920 * dt;
          e.charge = 1;
          world.fx.add({ kind: 'glow', x: e.x + 38, y: e.y, life: 0.2, size: 28, color: pal.orange });
          world.fx.add({ kind: 'spark', x: e.x + 30, y: e.y + rand(-16, 16), vx: 700, vy: 0, life: 0.14, size: 2, color: pal.gold });
          if (e.x < -70) { // missed: come round for another pass
            e.x = W + 60;
            e.y = rand(110, H - 110);
            e.state = 'enter';
            e.t = 0;
          }
        }
      },
      drawUnder(ctx, e) {
        if (e.state !== 'aim' || e.t < 0.35) return;
        const k = (e.t - 0.35) / 0.65;
        ctx.globalAlpha = 0.25 + 0.5 * k * (0.6 + 0.4 * Math.sin(e.t * 40));
        ctx.strokeStyle = pal.red;
        ctx.lineWidth = 4;
        ctx.setLineDash([16, 12]);
        ctx.lineDashOffset = e.t * 140;
        ctx.beginPath();
        ctx.moveTo(e.x - 54, e.y);
        ctx.lineTo(0, e.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      },
    },

    /* Ace: the squadron leader. Sweeps the right side and cycles three attacks;
       gets faster below half health. When it dies, its squadron goes with it. */
    ace: {
      hp: 150, radius: 54, scale: 1.25, score: 2000, ram: 30, ramSelf: 2, shotDamage: 12,
      boom: 3, colors: [pal.violet, pal.gold], engine: [54, 34],
      boss: true, name: 'Squadron Leader',
      sprite: art.ships.ace,
      init(e) {
        if (e.pace === undefined) e.pace = 2.0; // seconds between attacks (less once it is angry)
        e.state = 'enter';
        e.centerX = W - 250;
        e.atkT = 2;
        e.pattern = 0;
        e.burstLeft = 0;
        e.shotT = 0;
        e.enraged = false;
      },
      update(e, dt, world) {
        if (e.state === 'enter') {
          e.x += (e.centerX - e.x) * Math.min(1, dt * 1.8);
          if (Math.abs(e.x - e.centerX) < 4) { e.state = 'fight'; e.fightAge = e.age; }
          return;
        }
        const t = e.age - e.fightAge;
        e.x = e.centerX - Math.sin(t * 0.6) * 130;
        const y = H / 2 + Math.sin(t * 0.95) * 235;
        e.rot = clamp((e.y - y) * 0.04, -0.25, 0.25);
        e.y = y;

        if (!e.enraged && e.hp < e.maxHp * 0.5) {
          e.enraged = true;
          world.fx.ring(e.x, e.y, 150, pal.gold, 0.5);
          world.fx.shake(0.3);
          world.say('bossAngry');
          SO.audio.play('groan', { x: e.x });
        }

        if (e.burstLeft > 0) {
          e.shotT -= dt;
          if (e.shotT <= 0) {
            fire(world, e, e.x - 72, e.y, aimAtPlayer(e, world), 390);
            e.shotT = 0.11;
            e.burstLeft--;
          }
          return;
        }

        e.atkT -= dt;
        e.charge = clamp(1 - e.atkT / 0.55, 0, 1);
        if (e.charge > 0 && !e.charging) { e.charging = true; SO.audio.play('charge', { x: e.x }); }
        if (e.atkT > 0 || !canFire(e, world)) return;

        const aim = aimAtPlayer(e, world);
        if (e.pattern === 0) {        // aimed fan
          const n = e.enraged ? 7 : 5;
          for (let i = 0; i < n; i++) fire(world, e, e.x - 72, e.y, aim + (i - (n - 1) / 2) * 0.17, 300);
        } else if (e.pattern === 1) { // rapid aimed burst
          e.burstLeft = e.enraged ? 7 : 4;
          e.shotT = 0;
        } else {                      // slow wide wall, with gaps to slip through
          const n = e.enraged ? 11 : 9;
          for (let i = 0; i < n; i++) fire(world, e, e.x - 72, e.y, Math.PI + (i - (n - 1) / 2) * 0.2, 215);
        }
        e.pattern = (e.pattern + 1) % 3;
        e.atkT = e.enraged ? e.pace * 0.7 : e.pace;
        e.charge = 0;
        e.charging = false;
      },
    },
  };

  /* The Redfang: Guren's own ship. He flies like the Pyre's aces (he trained some of them),
     but he knows when to leave: at zero health he runs instead of going down with the ship. */
  TYPES.redfang = Object.assign({}, TYPES.ace, {
    radius: 46, scale: 1.12, colors: [pal.red, pal.gold], engine: [92, 30],
    name: 'Guren in the Redfang', flees: true,
    sprite: art.ships.redfang,
  });

  /* A beaten ship that flees: spins out for a moment, then burns away to the right. */
  function flee(e, dt, world) {
    e.fleeT += dt;
    e.charge = 0;
    if (e.fleeT < 0.7) {
      e.rot = Math.sin(e.fleeT * 22) * 0.25;
      e.y += 50 * dt;
    } else {
      if (!e.bolted) { // engine caught: off it goes
        e.bolted = true;
        world.fx.ring(e.x, e.y, 90, pal.gold, 0.4);
        SO.audio.play('boost', { x: e.x });
      }
      e.flip = true;
      e.rot = -0.12;
      e.x += (e.fleeT - 0.7) * 1500 * dt;
      e.y -= 110 * dt;
    }
    if (Math.random() < 0.5) {
      world.fx.add({ kind: 'smoke', x: e.x + rand(-20, 20), y: e.y + rand(-10, 10), vx: -80, vy: rand(-30, 30), life: 0.7, size: 13, color: '#2a3152' });
    }
    if (Math.random() < 0.25) world.fx.sparks(e.x + rand(-30, 30), e.y + rand(-12, 12), 2, pal.orange, 200);
    if (e.x > W + 180) e.dead = true;
  }

  /* A point somewhere on a ship's hull: where the next plate lets go. */
  function hullPoint(e) {
    const parts = e.def.parts;
    const i = parts ? Math.floor(Math.random() * (parts.length + 1)) : 0;
    const part = parts && i < parts.length ? parts[i] : [0, 0, e.r];
    const a = rand(0, TAU);
    const d = rand(0, part[2] * 0.8);
    return [e.x + part[0] + Math.cos(a) * d, e.y + part[1] + Math.sin(a) * d];
  }

  /* A beaten boss or capital ship, coming apart: it lists and sinks, explosions walk across the
     hull faster and faster, and at the end of BREAK_UP seconds the whole of it goes. */
  function breakUp(e, dt, world) {
    const k = clamp(e.dying / BREAK_UP, 0, 1);
    e.dying += dt;
    e.rot += e.list * 0.1 * dt;
    e.x += 10 * dt;
    e.y += 22 * dt;
    e.popT -= dt;
    if (e.popT <= 0) {
      const at = hullPoint(e);
      e.popT = lerp(0.22, 0.07, k);
      e.flash = 0.75; // white for a frame or two with each burst
      world.fx.explode(at[0], at[1], rand(0.7, 1.3), e.def.colors);
      world.fx.shake(0.14);
      SO.audio.play(e.pops++ % 3 === 2 ? 'crack' : 'boom', { x: at[0], size: 1, vol: 0.8 });
    }
    if (Math.random() < 0.5) {
      const at = hullPoint(e);
      world.fx.add({ kind: 'smoke', x: at[0], y: at[1], vx: rand(-40, 40), vy: rand(-60, -10), life: 0.8, size: 15, color: '#2a3152' });
    }
    if (e.dying >= BREAK_UP) SO.enemies.blast(world, e);
  }

  SO.enemies = {
    TYPES,
    aimAtPlayer,
    canFire,
    fire,

    /* Add a kind of enemy from another file. */
    define(name, def) { TYPES[name] = def; },

    spawn(world, type, options) {
      const def = TYPES[type];
      if (!def) {
        console.warn('Unknown enemy type: ' + type);
        return null;
      }
      const e = Object.assign({
        x: W + 60, y: H / 2, hp: def.hp, r: def.radius,
        rot: 0, age: 0, flash: 0, jolt: 0, charge: 0, dead: false, drop: null,
      }, options, { type, def });
      def.init(e, world);
      e.maxHp = e.hp;
      world.enemies.push(e);
      return e;
    },

    update(world, dt) {
      const list = world.enemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.dead) continue;
        e.age += dt;
        e.flash = Math.max(0, e.flash - dt * 9);
        e.jolt = Math.max(0, e.jolt - dt * 12);
        if (e.fleeing) { flee(e, dt, world); continue; }
        if (e.dying !== undefined) { breakUp(e, dt, world); continue; }
        if (e.dieIn !== undefined) { // caught in a rout: blows up on a short fuse
          e.dieIn -= dt;
          if (e.dieIn <= 0) { this.kill(world, e); continue; }
        }
        e.def.update(e, dt, world);
      }
    },

    /* Does a circle touch this enemy? shrink < 1 makes the enemy's hit circles smaller (ramming). */
    touches(e, x, y, r, shrink) {
      const k = shrink || 1;
      let dx = e.x - x;
      let dy = e.y - y;
      let reach = e.r * k + r;
      if (dx * dx + dy * dy < reach * reach) return true;
      const parts = e.def.parts;
      if (!parts) return false;
      for (let i = 0; i < parts.length; i++) {
        dx = e.x + parts[i][0] - x;
        dy = e.y + parts[i][1] - y;
        reach = parts[i][2] * k + r;
        if (dx * dx + dy * dy < reach * reach) return true;
      }
      return false;
    },

    /* Enemies a wave has to deal with: everything except scenery. */
    threats(world) {
      let n = 0;
      for (let i = 0; i < world.enemies.length; i++) {
        const e = world.enemies[i];
        if (!e.dead && !e.def.ambient) n++;
      }
      return n;
    },

    /* shot: the bolt or shell that did it, if one did (it decides the colour of the sparks and which
       way the debris flies). */
    hit(world, e, damage, x, y, shot) {
      if (e.dead || e.fleeing) return;
      if (e.dying !== undefined) { e.flash = Math.max(e.flash, 0.55); return; } // already coming apart: it only flinches
      const fx = world.fx;
      const weak = e.def.weak;
      let bounced = !!(e.def.armored && e.def.armored(e));
      if (!bounced && weak && x !== undefined) {
        const dx = e.x + weak[0] - x;
        const dy = e.y + weak[1] - y;
        bounced = dx * dx + dy * dy > weak[2] * weak[2];
      }
      if (bounced) { // no damage, and it has to look like it: the bolt skips off the armour
        if (x !== undefined) {
          fx.sparks(x, y, 5, pal.gold, 260, Math.PI, 1.3);
          fx.add({ kind: 'glint', x, y, life: 0.08, size: 11, color: pal.gold, rot: rand(0, TAU) });
          fx.add({
            kind: 'spark', x, y, vx: -rand(420, 560), vy: (Math.random() < 0.5 ? -1 : 1) * rand(260, 520),
            life: 0.3, size: 3.5, color: shot && shot.ally ? pal.gold : pal.cyan, drag: 1,
          });
        }
        SO.audio.play('clang', { x: x === undefined ? e.x : x });
        return;
      }
      e.hp -= damage;
      e.flash = 1;
      e.jolt = 1;
      if (x !== undefined) fx.impact(x, y, shot && shot.ally ? pal.gold : pal.cyanLight, shot && shot.heavy ? 1.6 : 1);
      if (e.hp <= 0) this.kill(world, e, shot);
      // the pitch climbs as the target weakens, so a kill can be heard coming
      else SO.audio.play('hit', { x: e.x, size: e.def.boom, pitch: 1 + 0.5 * (1 - e.hp / e.maxHp) });
    },

    kill(world, e, shot) {
      if (e.dead || e.fleeing || e.dying !== undefined) return;
      const def = e.def;
      const fx = world.fx;
      if (def.down && !e.finished && def.down(e, world)) return;
      world.stats.kills++;
      world.addScore(def.score, e.x, e.y);
      if (def.flees) {
        e.fleeing = true;
        e.fleeT = 0;
        e.hp = 0;
        fx.explode(e.x + 40, e.y, 1.6, def.colors);
        fx.shake(0.6);
        fx.flash = 0.6;
        world.freeze(0.12);
        world.slow(0.4, 0.7);
        SO.audio.play('bigBoom', { x: e.x });
        if (e.drop) SO.pickups.spawn(world, e.drop, e.x, e.y);
      } else if ((def.boss || def.capital) && !e.finished) {
        // too big to vanish in one frame: the killing blow lands, time catches, and it breaks up
        e.dying = 0;
        e.hp = 0;
        e.charge = 0;
        e.popT = 0.15;
        e.pops = 0;
        e.list = Math.random() < 0.5 ? -1 : 1;
        fx.explode(shot ? shot.x : e.x, shot ? shot.y : e.y, 1.6, def.colors);
        fx.shake(0.6);
        fx.flash = 0.7;
        world.freeze(0.12);
        world.slow(0.35, 0.9);
        SO.audio.play('bigBoom', { x: e.x });
        SO.audio.play('groan', { x: e.x });
      } else {
        this.blast(world, e, shot);
      }
      if (def.died) def.died(e, world);
      if (def.boss) world.bossDown(e);
      world.enemyDown(e);
    },

    /* The moment an enemy is gone. */
    blast(world, e, shot) {
      const def = e.def;
      const fx = world.fx;
      const big = e.dying !== undefined;
      e.dead = true;
      // debris flies on the way the shot was going
      fx.explode(e.x, e.y, def.boom, def.colors, { push: shot ? [shot.vx * 0.12, shot.vy * 0.12] : null });
      fx.shake(0.16 * def.boom);
      if (big) {
        for (let i = 0; i < 4; i++) {
          const at = hullPoint(e);
          fx.explode(at[0], at[1], rand(1.2, 2), def.colors, { delay: 0.05 + i * 0.07 });
        }
        fx.ring(e.x, e.y, 380, pal.cream, 0.7, 0.8);
        fx.ring(e.x, e.y, 240, def.colors[1], 0.55);
        fx.flash = 0.9;
        fx.shake(0.9);
        world.freeze(0.1);
      } else if (shot && !shot.ally) { // Kurai's own kill: two frames of stillness and a nudge
        world.freeze(0.03, true);
        fx.kick(2, 0);
      }
      // (a boss that played out an ending of its own has already made its noise)
      if (!e.finished) SO.audio.play(big || def.boss ? 'bigBoom' : 'boom', { x: e.x, size: def.boom });
      if (e.drop) SO.pickups.spawn(world, e.drop, e.x, e.y);
    },

    /* Remove an enemy with a bang but no score: a bomb going off, a fire-ship reaching its mark. */
    burst(world, e, size) {
      if (e.dead) return;
      e.dead = true;
      world.fx.explode(e.x, e.y, size || e.def.boom, e.def.colors);
      world.fx.shake(0.16 * (size || e.def.boom));
      SO.audio.play('boom', { x: e.x, size: size || e.def.boom });
    },

    draw(ctx, world) {
      const list = world.enemies;
      const dark = world.dark > DARK_LINES; // in the dark, aiming lines are drawn by drawOver instead
      let i, e;
      for (i = 0; i < list.length; i++) {
        e = list[i];
        if (!dark && !e.dead && !e.fleeing && e.dying === undefined && e.def.drawUnder) e.def.drawUnder(ctx, e, world);
      }
      for (i = 0; i < list.length; i++) {
        e = list[i];
        if (e.dead) continue;
        const scale = e.def.scale * (e.size || 1);
        const shove = e.jolt * 3.5 * Math.min(1, 26 / e.r);          // knocked back by a hit (small ships most)
        const shudder = e.dying !== undefined ? 2.5 : 0;              // shaking itself apart
        ctx.save();
        ctx.translate(e.x + shove + (Math.random() * 2 - 1) * shudder, e.y + (Math.random() * 2 - 1) * shudder);
        ctx.rotate(e.rot);
        ctx.scale(e.flip ? -scale : scale, scale);
        if (e.def.engine && e.dying === undefined) {
          ctx.globalCompositeOperation = 'lighter';
          art.glow(ctx, e.def.engine[0], e.def.engine[2] || 0, e.def.engine[1] * (0.85 + 0.15 * Math.sin(e.age * 31)), pal.orange, 0.85);
          ctx.globalCompositeOperation = 'source-over';
        }
        if (e.def.draw) e.def.draw(ctx, e, world);
        else e.def.sprite(ctx, { flash: e.flash > 0.35, charge: e.charge, open: e.open, loaded: e.loaded, lit: e.lit, aim: e.aim });
        ctx.restore();
      }
    },

    /* What shows above the ships, and above the dark when there is one (world.dark): whatever a kind
       draws with drawOver, the aiming lines, and an ember for every ship so none is lost in the black. */
    drawOver(ctx, world) {
      const list = world.enemies;
      const dark = world.dark;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.dead) continue;
        if (dark > DARK_LINES && !e.fleeing && e.dying === undefined && e.def.drawUnder) e.def.drawUnder(ctx, e, world);
        if (dark > 0.05 && e.def.engine) {
          ctx.globalCompositeOperation = 'lighter';
          art.glow(ctx, e.x, e.y, 30 + e.r * 0.5, pal.orange, dark * (0.6 + 0.2 * Math.sin(e.age * 9)));
          ctx.globalCompositeOperation = 'source-over';
        }
        if (e.def.drawOver) e.def.drawOver(ctx, e, world);
      }
    },
  };
})(window.SO);
