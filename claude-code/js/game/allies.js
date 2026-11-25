'use strict';

/* Friendly ships that share the sky with Kurai. A mission brings one in through its objective
   (the barge to escort) or with an event in a wave: { at: 2, ally: 'redfang', mode: 'wing' }.

   tinderbox   the lamplighters' barge: slow, unarmed, and the reason for mission 02
   redfang     Guren. mode 'watch': he hangs back and looks on. mode 'wing': he flies beside Kurai and shoots.
               Against the Eclipse (js/game/enemies-eclipse.js) he gets two more: 'light', where he holds a
               light on one of its shade vanes so Kurai can hit it, and 'ram', which ends with him 'adrift'.
   vigil, marigold   the fleet's capital ships, in allies-fleet.js (added with SO.allies.define)

   Optional fields on a kind:
     hurt(a, world)     it can be damaged; without this it is out of the fight
     capital: true, half: [w, h]   a ship of the line: the enemy's heavy shells hit its half-width and half-height
     lamp(a, lights)    adds pools of light { x, y, r } for when the sky goes dark (js/game/world.js)
     label(a)           a name drawn under it */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, rand, approach } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const TYPES = {
    tinderbox: {
      hp: 130, radius: 78,
      init(a) {
        a.x = -220;
        a.homeX = 215;
        a.homeY = a.y === undefined ? 545 : a.y;
        a.y = a.homeY;
        a.vx = 0;
      },
      update(a, dt, world) {
        if (world.state === 'won') {            // safe: away it goes
          a.vx += 520 * dt;
          a.x += a.vx * dt;
        } else {
          a.x += (a.homeX - a.x) * Math.min(1, dt * 1.4);
          a.y = a.homeY + Math.sin(a.age * 0.7) * 12;
        }
        // limping: smoke and sparks once it is badly hurt
        if (a.hp < a.maxHp * 0.4 && Math.random() < 0.3) {
          world.fx.add({ kind: 'smoke', x: a.x + rand(-90, 60), y: a.y + rand(-30, 20), vx: -90, vy: rand(-40, -5), life: 0.8, size: 12, color: '#2a3152' });
          if (Math.random() < 0.3) world.fx.sparks(a.x + rand(-90, 90), a.y + rand(-30, 30), 2, pal.orange, 180);
        }
      },
      hurt(a, world) {
        world.fx.shake(0.4);
        world.hud.allyHit();
        SO.audio.play('hullHit', { x: a.x });
        if (a.hp <= 0) { // the barge goes up end to end
          for (let i = 0; i < 7; i++) {
            world.fx.explode(a.x + rand(-110, 110), a.y + rand(-50, 40), rand(1.2, 2.4), [pal.cream, pal.orange], { delay: i * 0.09 });
          }
          world.fx.ring(a.x, a.y, 360, pal.gold, 0.8, 1.2);
          world.fx.flash = 1;
          world.fx.shake(1);
          world.fx.edge(pal.red, 1);
          world.freeze(0.14);
          SO.audio.play('bigBoom', { x: a.x });
        } else if (a.hp < a.maxHp * 0.4 && !a.warned) {
          a.warned = true;
          world.say('escortLow', true);
          SO.audio.play('alarm');
        } else {
          world.say('escortHit');
        }
      },
      draw(ctx, a) {
        ctx.globalCompositeOperation = 'lighter';
        art.glow(ctx, -146, 22, 34 + 6 * Math.sin(a.age * 27), pal.cyan, 0.8);                 // engine
        art.glow(ctx, -8, -34, 60 + 10 * Math.sin(a.age * 3.1), pal.gold, 0.5);                 // the Kindling
        ctx.globalCompositeOperation = 'source-over';
        art.ships.tinderbox(ctx, { flash: a.flash > 0.4 });
      },
    },

    redfang: {
      radius: 40,
      init(a) {
        if (!a.mode) a.mode = 'wing';
        if (a.mode === 'watch') {
          a.x = W + 140;
          a.y = a.y === undefined ? 120 : a.y;
          a.homeX = W - 190;
          a.homeY = a.y;
        } else {
          a.x = -160;
          a.y = H / 2 + 130;
          a.vy = 0;
          a.fireT = 1;
          a.side = 1;
        }
        a.vx = 0;
        a.vy = a.vy || 0;
        a.leaving = false;
        a.stagger = 0;   // 'light': seconds until he is back on station after being knocked off it
        a.lit = false;   // 'light': true while his light is on the vane
        a.vane = null;   // 'light': the vane he is lighting (the Eclipse tells him which)
        a.spin = 0;
      },
      update(a, dt, world) {
        const player = world.player;
        if (a.mode === 'adrift') { // engines dead, tumbling slowly, very much alive
          a.x = clamp(a.x + a.vx * dt, 120, W - 200);
          a.y = clamp(a.y + a.vy * dt, 90, H - 90);
          a.vx *= Math.max(0, 1 - 1.3 * dt);
          a.vy *= Math.max(0, 1 - 1.3 * dt);
          a.tilt = (a.tilt || 0) + a.spin * dt;
          a.spin = approach(a.spin, 0.25, 2.2 * dt);
          if (Math.random() < 0.35) {
            world.fx.add({ kind: 'smoke', x: a.x + rand(-30, 30), y: a.y + rand(-12, 12), vx: rand(-30, 30), vy: rand(-50, -15), life: 0.9, size: 12, color: '#2a3152' });
          }
          if (Math.random() < 0.08) world.fx.sparks(a.x + rand(-30, 30), a.y + rand(-12, 12), 3, pal.gold, 200);
          return;
        }
        if (a.mode === 'ram') { // drop back, line up, and go through the target
          a.t += dt;
          a.tilt = 0;
          if (a.t < 0.5) {
            a.x += (170 - a.x) * Math.min(1, dt * 6);
            a.y += (a.ramY - a.y) * Math.min(1, dt * 6);
            a.vx = 0;
          } else {
            a.vx += 6200 * dt;
            a.x += a.vx * dt;
            a.y += (a.ramY - a.y) * Math.min(1, dt * 10);
            world.fx.add({ kind: 'glow', x: a.x - 70, y: a.y, life: 0.3, size: 42, color: pal.gold });
            world.fx.add({ kind: 'spark', x: a.x - 60, y: a.y + rand(-18, 18), vx: -900, vy: 0, life: 0.16, size: 2.5, color: pal.cream });
            if (!a.screamed) { a.screamed = true; SO.audio.play('dash', { x: a.x, pitch: 0.8 }); }
            if (a.x >= a.ramX) {
              a.x = a.ramX;
              a.mode = 'adrift';
              a.rammed = true;
              a.vx = -520;
              a.vy = 190;
              a.spin = 7;
            }
          }
          return;
        }
        if (a.mode === 'watch') {
          if (world.state === 'won') a.leaving = true;
          if (a.leaving) {
            a.vx += 900 * dt;
            a.x += a.vx * dt;
            a.y -= 60 * dt;
            if (a.x > W + 220) a.dead = true;
          } else {
            a.x += (a.homeX - a.x) * Math.min(1, dt * 1.8);
            a.y = a.homeY + Math.sin(a.age * 1.1) * 10;
          }
          return;
        }

        if (world.state === 'won' || a.leaving) { // off with Kurai, or off on his own
          a.vx += 1500 * dt;
          a.x += a.vx * dt;
          if (a.x > W + 220) a.dead = true;
          return;
        }
        if (a.mode === 'light') {
          const vane = a.vane && !a.vane.dead ? a.vane : null;
          a.lit = false;
          if (a.stagger > 0) { // knocked off station: no light until he is back
            a.stagger -= dt;
            a.x = clamp(a.x + a.vx * dt, 90, W);
            a.y = clamp(a.y + a.vy * dt, 70, H - 70);
            a.vx *= Math.max(0, 1 - 2.4 * dt);
            a.vy *= Math.max(0, 1 - 2.4 * dt);
            a.tilt = Math.sin(a.stagger * 13) * 0.5 * Math.min(1, a.stagger);
            return;
          }
          const tx = vane ? vane.x - 92 : clamp(player.x - 60, 90, W * 0.45);
          const ty = vane ? vane.y + (vane.hover || -64) : clamp(player.y + 125, 70, H - 70);
          a.x += (tx - a.x) * Math.min(1, dt * 2.8);
          a.y += (ty - a.y) * Math.min(1, dt * 2.8);
          a.tilt = clamp((ty - a.y) / 300, -0.2, 0.2);
          a.lit = !!vane && Math.abs(tx - a.x) < 34 && Math.abs(ty - a.y) < 34;
          return;
        }

        // hold station off Kurai's wing, on whichever side has more room
        if (player.y < H * 0.38) a.side = 1;
        else if (player.y > H * 0.62) a.side = -1;
        const targetX = clamp(player.x - 60, 90, W * 0.45);
        const targetY = clamp(player.y + a.side * 125, 70, H - 70);
        a.x += (targetX - a.x) * Math.min(1, dt * 2.4);
        a.vy = approach(a.vy, clamp((targetY - a.y) * 3, -330, 330), 1300 * dt);
        a.y += a.vy * dt;
        a.tilt = clamp(a.vy / 330, -1, 1) * 0.16;

        a.fireT -= dt;
        if (a.fireT <= 0 && world.state === 'play' && player.alive && this.hasTarget(a, world)) {
          SO.shots.ally(world, a.x + 84, a.y + 13);
          world.fx.add({ kind: 'glow', x: a.x + 90, y: a.y + 13, life: 0.07, size: 22, color: pal.gold });
          SO.audio.play('allyShoot', { x: a.x });
          a.fireT = 0.3;
        }
      },
      /* Something worth shooting, ahead and roughly level. */
      hasTarget(a, world) {
        for (let i = 0; i < world.enemies.length; i++) {
          const e = world.enemies[i];
          if (!e.dead && !e.fleeing && e.dying === undefined && !e.def.ambient && e.x > a.x + 60 && e.x < W && Math.abs(e.y - a.y) < e.r + 70) return true;
        }
        return false;
      },
      /* Something reached him while he was holding the light (a Duskwing): he is thrown clear for a few seconds. */
      knock(a, world) {
        if (a.mode !== 'light' || a.stagger > 0) return;
        a.stagger = 3.2;
        a.lit = false;
        a.vx = -560;
        a.vy = rand(-160, 160);
        world.fx.explode(a.x + 30, a.y, 0.9, [pal.orange, pal.gold]);
        world.fx.shake(0.25);
        world.fx.edge(pal.ink, 0.8); // his light is out
        world.say('gurenHit', true);
        SO.audio.play('hullHit', { x: a.x });
      },
      lamp(a, lights) {
        if (a.mode !== 'light' || a.stagger > 0) { lights.push({ x: a.x, y: a.y, r: 110, a: 0.6 }); return; }
        lights.push({ x: a.x, y: a.y, r: 150 });
        if (a.lit && a.vane) lights.push({ x: a.vane.x, y: a.vane.y, r: 185 });
      },
      draw(ctx, a) {
        const facing = a.mode === 'watch' && !a.leaving ? 1 : -1; // the picture faces left
        if (a.mode === 'light' && a.lit && a.vane) { // his light, on the vane
          const vx = a.vane.x - a.x;
          const vy = a.vane.y - a.y;
          const flicker = 0.85 + 0.15 * Math.sin(a.age * 23);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.3 * flicker;
          art.poly(ctx, [60, 8, vx - 26, vy - 44, vx + 26, vy + 44], pal.gold);
          ctx.globalAlpha = 1;
          art.glow(ctx, vx, vy, 120 * flicker, pal.gold, 0.6);
          art.glow(ctx, 66, 8, 30, pal.cream, 0.9);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.rotate(a.tilt || 0);
        ctx.scale(0.82 * facing, 0.82);
        if (a.mode !== 'adrift') {
          ctx.globalCompositeOperation = 'lighter';
          art.glow(ctx, 98, 0, (a.mode === 'ram' ? 46 : 28) + 5 * Math.sin(a.age * 29), pal.orange, 0.85);
          ctx.globalCompositeOperation = 'source-over';
        }
        art.ships.redfang(ctx, {});
      },
      /* A name under the ship while he only watches, so nobody mistakes him for a target. */
      label(a) { return a.mode === 'watch' && !a.leaving ? 'GUREN' : null; },
    },
  };

  SO.allies = {
    TYPES,

    /* Add a kind of friendly ship from another file. */
    define(name, def) { TYPES[name] = def; },

    spawn(world, type, options) {
      const def = TYPES[type];
      if (!def) {
        console.warn('Unknown ally: ' + type);
        return null;
      }
      const a = Object.assign({ hp: def.hp || 1, r: def.radius, age: 0, flash: 0, dead: false }, options, { type, def });
      def.init(a, world);
      a.maxHp = a.hp;
      world.allies.push(a);
      return a;
    },

    /* The first living ally of a type, or null. */
    find(world, type) {
      for (let i = 0; i < world.allies.length; i++) {
        const a = world.allies[i];
        if (a.type === type && !a.dead) return a;
      }
      return null;
    },

    /* Only allies with a hurt() can be damaged; the rest are out of the fight. */
    damage(world, a, amount, x, y) {
      if (a.dead || !a.def.hurt || world.state !== 'play' || SO.dev.god) return;
      a.hp = Math.max(0, a.hp - amount);
      a.flash = 1;
      world.fx.sparks(x, y, 12, pal.orange, 320);
      world.fx.impact(x, y, pal.orange, 1.6);
      a.def.hurt(a, world);
      if (a.hp <= 0) a.dead = true;
    },

    /* Send an ally home (a mission event: { at, dismiss: 'redfang' }). */
    dismiss(world, type) {
      const a = this.find(world, type);
      if (a) a.leaving = true;
    },

    update(world, dt) {
      const list = world.allies;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.dead) continue;
        a.age += dt;
        a.flash = Math.max(0, a.flash - dt * 6);
        a.def.update(a, dt, world);
      }
    },

    draw(ctx, world) {
      const list = world.allies;
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.dead) continue;
        ctx.save();
        ctx.translate(a.x, a.y);
        a.def.draw(ctx, a);
        ctx.restore();
        const label = a.def.label && a.def.label(a);
        if (label) art.text(ctx, label, a.x, a.y + 52, { size: 13, align: 'center', color: pal.gold, stroke: pal.enemyInk, lineWidth: 4 });
      }
    },
  };
})(window.SO);
