'use strict';

/* The fleet that answered the light: the capital ships that hold the line in mission 04.
   They sit behind Kurai on the left and trade shells with whatever the Pyre brings; the 'fleet'
   objective (js/game/objectives.js) is to keep at least one of them alive.

   vigil      an old Lantern Fleet cruiser, crewed by lamplighters: three turrets, the tougher of the two
   marigold   a grain freighter with cannons welded on: fewer guns, slower to reload

   Each fires a volley at the biggest thing its shells can hurt, holds its fire in the dark,
   and carries a lantern the dark cannot put out. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, rand } = SO.util;
  const W = SO.W;

  const AIM_LIMIT = 0.55; // how far off straight ahead the guns can turn, in radians

  /* The enemy a capital ship fires at: something on screen that its shells can hurt,
     capital ships and bosses first, then whatever is biggest and closest to level. */
  function pickTarget(a, world) {
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < world.enemies.length; i++) {
      const e = world.enemies[i];
      if (e.dead || e.fleeing || e.dying !== undefined || e.def.ambient || e.state === 'enter') continue;
      if (e.x > W - 20 || e.x < a.x + 260) continue;
      if (e.def.weak || (e.def.armored && e.def.armored(e))) continue;
      if (Math.abs(Math.atan2(e.y - a.y, e.x - a.x)) > AIM_LIMIT) continue;
      const score = (e.def.capital || e.def.boss || e.parent ? 1000 : 0) + e.maxHp - Math.abs(e.y - a.y) * 0.3;
      if (score > bestScore) { best = e; bestScore = score; }
    }
    return best;
  }

  /* o: name, hp, x, y (where it holds), sprite, width, half [w, h], guns [[dx, dy], ...] (muzzles),
        engines [[dx, dy, size], ...], lantern [dx, dy], fireEvery, shellDamage */
  function capital(o) {
    return {
      hp: o.hp, radius: o.half[1] + 14, capital: true, name: o.name, half: o.half,

      init(a) {
        a.x = -o.width;
        a.homeX = o.x;
        a.homeY = a.y === undefined ? o.y : a.y;
        a.y = a.homeY;
        a.fireT = o.fireEvery * rand(0.6, 1.1);
        a.volley = 0;   // shells still to fire in this volley
        a.gun = 0;
        a.shotT = 0;
        a.target = null;
        a.kick = 0;     // recoil
        a.warned = false;
      },

      update(a, dt, world) {
        a.x += (a.homeX - a.kick * 6 - a.x) * Math.min(1, dt * 1.3);
        a.y = a.homeY + Math.sin(a.age * 0.6 + o.y) * 6;
        a.kick = Math.max(0, a.kick - dt * 3);

        if (a.hp < a.maxHp * 0.4 && Math.random() < 0.3) { // burning
          world.fx.add({ kind: 'smoke', x: a.x + rand(-o.half[0], o.half[0] * 0.6), y: a.y + rand(-30, 20), vx: -50, vy: rand(-50, -10), life: 0.9, size: 13, color: '#2a3152' });
          if (Math.random() < 0.3) world.fx.sparks(a.x + rand(-o.half[0], o.half[0]), a.y + rand(-30, 30), 2, pal.orange, 180);
        }

        // gunnery: a volley, one barrel after another, then reload
        if (world.state !== 'play' || world.dark > 0.5 || a.x < a.homeX - 40) return;
        if (a.volley > 0) {
          a.shotT -= dt;
          if (a.shotT > 0) return;
          if (!a.target || a.target.dead) a.target = pickTarget(a, world);
          const muzzle = o.guns[a.gun];
          const x = a.x + muzzle[0];
          const y = a.y + muzzle[1];
          const angle = a.target ? clamp(Math.atan2(a.target.y - y, a.target.x - x), -AIM_LIMIT, AIM_LIMIT) : 0;
          SO.shots.salvo(world, x, y, angle, o.shellDamage);
          world.fx.add({ kind: 'glow', x: x + 10, y, life: 0.12, size: 46, color: pal.cyanLight });
          world.fx.add({ kind: 'disc', x: x + 8, y, life: 0.05, size: 13, color: pal.white });
          world.fx.sparks(x, y, 5, pal.cyanLight, 260, angle, 0.5);
          SO.audio.play('salvo', { x });
          a.kick = 1;
          a.gun = (a.gun + 1) % o.guns.length;
          a.volley--;
          a.shotT = 0.17;
          return;
        }
        a.fireT -= dt;
        if (a.fireT > 0) return;
        a.target = pickTarget(a, world);
        if (a.target) {
          a.volley = o.guns.length;
          a.shotT = 0;
          a.fireT = o.fireEvery * rand(0.9, 1.1);
        } else {
          a.fireT = 0.4; // nothing to shoot at: look again shortly
        }
      },

      hurt(a, world) {
        world.fx.shake(0.22);
        world.hud.allyHit();
        SO.audio.play('hullHit', { x: a.x, vol: 0.7 });
        if (a.hp <= 0) { // she goes up from stem to stern
          for (let i = 0; i < 10; i++) {
            world.fx.explode(a.x + rand(-o.half[0], o.half[0]), a.y + rand(-o.half[1], o.half[1]), rand(1.2, 2.6), [pal.cream, pal.orange], { delay: i * 0.08 });
          }
          world.fx.ring(a.x, a.y, 420, pal.cyanLight, 0.8, 1.2);
          world.fx.flash = 1;
          world.fx.shake(1);
          world.fx.edge(pal.red, 1);
          world.freeze(0.14);
          world.slow(0.4, 0.8);
          SO.audio.play('bigBoom', { x: a.x });
          world.say('shipDown', true);
        } else if (a.hp < a.maxHp * 0.4 && !a.warned) {
          a.warned = true;
          world.say('fleetLow', true);
          SO.audio.play('alarm');
        } else {
          world.say('fleetHit');
        }
      },

      lamp(a, lights) {
        lights.push({ x: a.x + o.lantern[0], y: a.y + o.lantern[1], r: 150 + 14 * Math.sin(a.age * 3.3), a: 0.8 });
      },

      draw(ctx, a) {
        let i;
        ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < o.engines.length; i++) {
          const n = o.engines[i];
          art.glow(ctx, n[0], n[1], n[2] + 5 * Math.sin(a.age * 27 + i), pal.cyan, 0.8);
        }
        ctx.globalCompositeOperation = 'source-over';
        o.sprite(ctx, { flash: a.flash > 0.4 });
        ctx.globalCompositeOperation = 'lighter';
        art.glow(ctx, o.lantern[0], o.lantern[1], 44 + 8 * Math.sin(a.age * 3.1), o.lanternColor || pal.cyan, 0.6);
        ctx.globalCompositeOperation = 'source-over';

        // name and hull, tucked under the stern
        const k = a.hp / a.maxHp;
        const x = 34 - a.x; // a fixed place on screen, whatever the ship is doing
        const y = o.half[1] + 12;
        const w = 86;
        const low = k < 0.4;
        art.text(ctx, o.name.toUpperCase(), x, y + 1, { size: 12, baseline: 'middle', color: low ? pal.pink : pal.cyanLight, lineWidth: 3.5 });
        ctx.font = '800 12px ' + SO.FONT;
        const bx = x + ctx.measureText(o.name.toUpperCase()).width + 8;
        art.roundRect(ctx, bx, y - 5, w, 9, 4.5);
        art.paint(ctx, pal.navyDeep, pal.ink, 3.5);
        if (k > 0) {
          art.roundRect(ctx, bx, y - 5, Math.max(9, w * k), 9, 4.5);
          art.paint(ctx, a.flash > 0.4 ? pal.white : low ? pal.red : pal.cyan);
        }
      },
    };
  }

  SO.allies.define('vigil', capital({
    name: 'Vigil', hp: 230, x: 150, y: 262, width: 400, half: [186, 52],
    sprite: art.ships.vigil,
    guns: [[-70, -2], [54, -2], [124, -2]],
    engines: [[-196, 14, 30], [-196, 42, 30]],
    lantern: [-29, -24],
    fireEvery: 3.4, shellDamage: 4,
  }));

  SO.allies.define('marigold', capital({
    name: 'Marigold', hp: 190, x: 142, y: 586, width: 380, half: [178, 50],
    sprite: art.ships.marigold,
    guns: [[4, -10], [97, -5], [186, 44]],
    engines: [[-184, 14, 36]],
    lantern: [-123, -46], lanternColor: pal.gold,
    fireEvery: 4.4, shellDamage: 4,
  }));
})(window.SO);
