'use strict';

/* Things enemies drop. A mission marks a spawn with drop: 'repair' (Kurai's hull) or
   drop: 'patch' (the ship he escorts, or whichever ship of the fleet needs it most). */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, approach } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const TYPES = {
    repair: {
      collect(world, p) {
        const player = world.player;
        if (player.hull < player.maxHull) {
          player.hull = Math.min(player.maxHull, player.hull + 30);
          world.fx.text(p.x, p.y - 26, 'HULL +30', pal.cyanLight);
          world.say('repair');
        } else {
          world.addScore(500, p.x, p.y - 6);
        }
        world.fx.ring(p.x, p.y, 70, pal.cyan, 0.4);
        world.fx.sparks(p.x, p.y, 12, pal.cyanLight, 260);
        SO.audio.play('pickup', { x: p.x });
      },
      draw(ctx, p) {
        const pulse = 0.5 + 0.5 * Math.sin(p.age * 6);
        ctx.globalCompositeOperation = 'lighter';
        art.glow(ctx, 0, 0, 44 + pulse * 8, pal.cyan, 0.55);
        ctx.globalCompositeOperation = 'source-over';
        ctx.rotate(Math.sin(p.age * 2.2) * 0.18);
        art.roundRect(ctx, -18, -18, 36, 36, 10);
        art.paint(ctx, pal.cream, pal.ink, 4);
        art.poly(ctx, [-4.5, -12, 4.5, -12, 4.5, -4.5, 12, -4.5, 12, 4.5, 4.5, 4.5, 4.5, 12, -4.5, 12, -4.5, 4.5, -12, 4.5, -12, -4.5, -4.5, -4.5],
          pal.cyan, pal.ink, 2.5);
      },
    },
  };

  /* Patch: a repair crate for a friendly ship. Kurai collects it; the ship gets the plates. */
  TYPES.patch = {
    collect(world, p) {
      const ship = world.objective.ward(world);
      if (ship && !ship.dead && ship.hp < ship.maxHp) {
        const plates = ship.def.capital ? 30 : 20;
        ship.hp = Math.min(ship.maxHp, ship.hp + plates);
        world.fx.text(p.x, p.y - 26, (ship.def.name || 'Barge').toUpperCase() + ' +' + plates, pal.gold);
        world.fx.ring(ship.x, ship.y, 120, pal.gold, 0.5);
      } else {
        world.addScore(500, p.x, p.y - 6);
      }
      world.fx.ring(p.x, p.y, 70, pal.gold, 0.4);
      world.fx.sparks(p.x, p.y, 12, pal.gold, 260);
      SO.audio.play('pickup', { x: p.x });
    },
    draw(ctx, p) {
      const pulse = 0.5 + 0.5 * Math.sin(p.age * 6);
      ctx.globalCompositeOperation = 'lighter';
      art.glow(ctx, 0, 0, 44 + pulse * 8, pal.gold, 0.55);
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(Math.sin(p.age * 2.2) * 0.18);
      art.roundRect(ctx, -18, -18, 36, 36, 10);
      art.paint(ctx, pal.navy, pal.ink, 4);
      // a little lantern
      art.roundRect(ctx, -7, -8, 14, 17, 4);
      art.paint(ctx, pal.gold, pal.ink, 2.5);
      art.roundRect(ctx, -9, -13, 18, 5, 2);
      art.paint(ctx, pal.cream, pal.ink, 2);
      art.circle(ctx, 0, 1, 3.2, pal.cream);
    },
  };

  SO.pickups = {
    TYPES,

    spawn(world, type, x, y) {
      const def = TYPES[type];
      if (!def) return;
      world.pickups.push({
        type, def, age: 0, dead: false,
        x: clamp(x, 60, W - 90), y: clamp(y, 70, H - 70), vx: 70, vy: 0,
      });
    },

    update(world, dt) {
      const player = world.player;
      const list = world.pickups;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.age += dt;
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (player.alive && dist < 150) { // close enough: fly to the ship
          p.vx = approach(p.vx, dx / dist * 520, 2600 * dt);
          p.vy = approach(p.vy, dy / dist * 520, 2600 * dt);
        } else {
          p.vx = approach(p.vx, -85, 160 * dt);
          p.vy = approach(p.vy, Math.cos(p.age * 2) * 24, 200 * dt);
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (player.alive && dist < 36) { p.dead = true; p.def.collect(world, p); }
        else if (p.x < -50) p.dead = true;
      }
    },

    draw(ctx, world) {
      const list = world.pickups;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        ctx.save();
        ctx.translate(p.x, p.y);
        p.def.draw(ctx, p);
        ctx.restore();
      }
    },
  };
})(window.SO);
