'use strict';

/* Blaster bolts (Kurai's, and a wingman's), plasma orbs (the enemy's), and the heavy shells that
   capital ships throw at each other. Plain objects in the world's lists.
   Every shot carries t, its age in seconds: a bolt leaves the muzzle fat and draws a tail behind it,
   an orb swells into being and drags a short glow, so the eye can tell which way each is going. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const W = SO.W;
  const H = SO.H;
  const EDGE = 40;

  SO.shots = {
    player(world, x, y) {
      world.shots.push({ x, y, vx: 1150, vy: 0, r: 7, dmg: 1, dead: false, t: 0 });
    },

    /* A wingman's bolt: hurts enemies like Kurai's, drawn in gold, not counted in his accuracy. */
    ally(world, x, y) {
      world.shots.push({ x, y, vx: 1050, vy: 0, r: 7, dmg: 1, dead: false, ally: true, t: 0 });
    },

    enemy(world, x, y, angle, speed, dmg) {
      world.enemyShots.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 7, dmg, dead: false, age: Math.random(), t: 0,
      });
    },

    /* A friendly capital ship's shell: slower and heavier than a bolt, and it can be aimed. */
    salvo(world, x, y, angle, dmg) {
      world.shots.push({
        x, y, vx: Math.cos(angle) * 780, vy: Math.sin(angle) * 780,
        r: 10, dmg: dmg || 4, dead: false, ally: true, heavy: true, angle, t: 0,
      });
    },

    /* An enemy capital ship's shell. It is meant for the fleet (fleetDmg), but it hurts whatever
       it meets first, and Kurai's shields can take it for them (js/game/world.js). */
    shell(world, x, y, angle, speed, dmg, fleetDmg) {
      world.enemyShots.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 12, dmg, fleetDmg, dead: false, age: Math.random(), heavy: true, t: 0,
      });
    },

    update(list, dt) {
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.t += dt;
        if (s.age !== undefined) s.age += dt;
        if (s.x < -EDGE || s.x > W + EDGE || s.y < -EDGE || s.y > H + EDGE) s.dead = true;
      }
    },

    /* Drop everything marked dead. Works for any list of objects with a dead flag. */
    sweep(list) {
      let n = 0;
      for (let i = 0; i < list.length; i++) if (!list[i].dead) list[n++] = list[i];
      list.length = n;
    },

    drawPlayer(ctx, list) {
      let i, s;
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < list.length; i++) {
        s = list[i];
        const color = s.ally && !s.heavy ? pal.gold : pal.cyan;
        art.glow(ctx, s.x, s.y, s.heavy ? 40 : 22, color, s.heavy ? 0.7 : 0.55);
        // the tail: it grows out of the muzzle, then follows at full length
        const tail = Math.min(s.heavy ? 70 : 46, s.t * 700);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = color;
        if (s.heavy) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.angle);
          ctx.fillRect(-24 - tail, -4, tail, 8);
          ctx.restore();
        } else {
          ctx.fillRect(s.x - 16 - tail, s.y - 2.5, tail, 5);
        }
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';
      for (i = 0; i < list.length; i++) {
        s = list[i];
        if (s.heavy) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.angle);
          art.roundRect(ctx, -24, -6.5, 46, 13, 6.5);
          art.paint(ctx, pal.cyanLight, pal.ink, 3);
          art.roundRect(ctx, -8, -2.5, 26, 5, 2.5);
          art.paint(ctx, pal.white);
          ctx.restore();
          continue;
        }
        const fat = 1 + 0.6 * Math.max(0, 1 - s.t / 0.05); // fresh from the muzzle
        art.roundRect(ctx, s.x - 16, s.y - 4 * fat, 30, 8 * fat, 4 * fat);
        art.paint(ctx, s.ally ? pal.gold : pal.cyan, s.ally ? pal.enemyInk : pal.ink, 2.5);
        art.roundRect(ctx, s.x - 6, s.y - 1.5, 17, 3, 1.5);
        art.paint(ctx, pal.cream);
      }
    },

    drawEnemy(ctx, list) {
      let i, s;
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < list.length; i++) {
        s = list[i];
        const color = s.heavy ? pal.orange : pal.red;
        art.glow(ctx, s.x, s.y, s.heavy ? 52 : 30, color, 0.75);
        // a short glow behind it, pointing back the way it came
        art.glow(ctx, s.x - s.vx * 0.04, s.y - s.vy * 0.04, s.heavy ? 34 : 20, color, 0.45);
        art.glow(ctx, s.x - s.vx * 0.08, s.y - s.vy * 0.08, s.heavy ? 24 : 14, color, 0.25);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (i = 0; i < list.length; i++) {
        s = list[i];
        const pulse = (1 + 0.14 * Math.sin(s.age * 18)) * Math.min(1, 0.45 + s.t * 7); // swells into being
        if (s.heavy) {
          art.circle(ctx, s.x, s.y, 14.5 * pulse, pal.orange, pal.enemyInk, 3.5);
          art.circle(ctx, s.x, s.y, 8 * pulse, pal.gold);
          art.circle(ctx, s.x - 2, s.y - 2, 3.2, pal.white);
          continue;
        }
        art.circle(ctx, s.x, s.y, 9.5 * pulse, '#ff5d7c', pal.enemyInk, 3);
        art.circle(ctx, s.x, s.y, 4.4 * pulse, pal.cream);
      }
    },
  };
})(window.SO);
