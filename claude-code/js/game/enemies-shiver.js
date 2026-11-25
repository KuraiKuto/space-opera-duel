'use strict';

/* Enemies that arrive in mission 02, in the Shiver: the bombers that go for the barge,
   their bombs, the Brander fire-ship, and the ice itself. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, lerp, rand, approach } = SO.util;
  const W = SO.W;
  const H = SO.H;

  /* What the bombers are after: the ship being escorted (or the nearest of the fleet), or Kurai when there is none. */
  function prey(world, e) {
    return world.objective.ward(world, e) || world.player;
  }

  /* Torch: bomber. Ignores Kurai, makes a run at the barge, drops a firebomb, peels away and comes round again.
     Shoot it before the drop (the bomb glows as it gets close), or shoot the bomb. */
  SO.enemies.define('torch', {
    hp: 5, radius: 26, scale: 1.3, score: 200, ram: 24, ramSelf: 99, shotDamage: 0,
    boom: 1.3, colors: [pal.orange, pal.gold], engine: [36, 20],
    sprite: art.ships.torch,
    init(e) {
      if (e.speed === undefined) e.speed = 185;
      if (e.dropX === undefined) e.dropX = rand(720, 880);  // where it lets the bomb go
      if (e.peel === undefined) e.peel = e.y < H / 2 ? -1 : 1; // up or down after the drop
      e.state = 'run';
      e.loaded = true;
      e.vy = 0;
    },
    update(e, dt, world) {
      if (e.state === 'run') {
        e.x -= e.speed * dt;
        e.rot = 0;
        e.charge = clamp(1 - (e.x - e.dropX) / 260, 0, 1);
        if (e.x <= e.dropX && SO.enemies.canFire(e, world)) {
          SO.enemies.spawn(world, 'firebomb', { x: e.x - 4, y: e.y + 20 });
          world.fx.sparks(e.x, e.y + 20, 5, pal.gold, 160, Math.PI / 2, 0.8);
          SO.audio.play('enemyShoot', { x: e.x, pitch: 0.7 });
          e.loaded = false;
          e.charge = 0;
          e.state = 'away';
        }
      } else {
        e.x -= e.speed * 0.75 * dt;
        e.vy = approach(e.vy, e.peel * 300, 520 * dt);
        e.y += e.vy * dt;
        e.rot = clamp(-e.vy / 300 * 0.5, -0.5, 0.5);
        if (e.y < -70 || e.y > H + 70 || e.x < -70) { // round again, with a fresh bomb
          e.x = W + 60;
          e.y = rand(110, H - 260);
          e.vy = 0;
          e.peel = e.y < H / 2 ? -1 : 1;
          e.dropX = rand(720, 880);
          e.loaded = true;
          e.state = 'run';
        }
      }
    },
  });

  /* Firebomb: drifts toward the barge, picking up speed. Two hits put it out. */
  SO.enemies.define('firebomb', {
    hp: 2, radius: 15, scale: 1.15, score: 50, ram: 16, ramSelf: 99, shotDamage: 0,
    boom: 0.9, colors: [pal.orange, pal.gold], engine: [18, 13],
    sprite: art.ships.firebomb,
    init(e) {
      if (e.damage === undefined) e.damage = 10;   // to the barge
      if (e.top === undefined) e.top = 210;        // top speed
      e.speed = 70;
    },
    update(e, dt, world) {
      const target = prey(world, e);
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      e.speed = approach(e.speed, e.top, 150 * dt);
      e.x += dx / dist * e.speed * dt;
      e.y += dy / dist * e.speed * dt;
      e.rot = Math.atan2(dy, dx) - Math.PI;
      e.charge = Math.sin(e.age * (6 + 900 / (dist + 60))) > 0 ? 1 : 0; // blinks faster as it closes
      if (target !== world.player && dist < target.r) {
        SO.allies.damage(world, target, e.damage, e.x, e.y);
        SO.enemies.burst(world, e, 1.1);
      }
    },
  });

  /* Ice: the Shiver's own hazard. Drifts through, blocks shots, hurts to hit. Scenery: waves do not wait for it. */
  SO.enemies.define('ice', {
    hp: 5, radius: 28, scale: 1, score: 30, ram: 18, ramSelf: 99, shotDamage: 0,
    boom: 0.9, colors: [pal.ice, pal.cyanLight], ambient: true,
    sprite: art.ships.ice,
    init(e) {
      if (e.size === undefined) e.size = rand(0.75, 1.35);
      e.r = 28 * e.size;
      e.hp = Math.round(5 * e.size);
      e.vx = -(e.speed || rand(110, 170));
      e.vy = e.drift === undefined ? rand(-16, 16) : e.drift;
      e.spin = rand(-1.1, 1.1);
      e.rot = rand(0, 6);
    },
    update(e, dt) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rot += e.spin * dt;
      if (e.x < -90) e.dead = true;
    },
  });

  /* Brander: the fire-ship. It does not fight so much as arrive: it creeps toward the barge,
     and if its ram reaches the hull, both go up. It lobs firebombs ahead of itself and
     throws flame at whoever is shooting it. Faster once it is burning (below 40% health). */
  SO.enemies.define('brander', {
    hp: 190, radius: 56, scale: 1, score: 2500, ram: 40, ramSelf: 0, shotDamage: 12,
    boom: 3.4, colors: [pal.red, pal.orange], engine: [214, 46],
    boss: true, name: 'Brander',
    parts: [[-150, 8, 40], [-70, 2, 54], [70, -2, 56], [150, 0, 48]],
    sprite: art.ships.brander,
    init(e) {
      if (e.speed === undefined) e.speed = 9.5;   // pixels per second: slow, and it never stops
      e.state = 'enter';
      e.holdX = W - 250;
      e.y0 = e.y;
      e.startX = null;
      e.bombT = 4;
      e.fanT = 2.6;
      e.burning = false;
      e.warned = 0;
    },
    /* How far along its run at the barge it is, 0..1. */
    progress(e, target) {
      if (e.startX === null) return 0;
      const goal = target.x + target.r + 190;
      return clamp((e.startX - e.x) / Math.max(1, e.startX - goal), 0, 1);
    },
    update(e, dt, world) {
      const target = prey(world, e);
      if (e.state === 'enter') {
        e.x += (e.holdX - e.x) * Math.min(1, dt * 1.6);
        if (Math.abs(e.x - e.holdX) < 4) { e.state = 'advance'; e.startX = e.x; }
        return;
      }

      if (!e.burning && e.hp < e.maxHp * 0.4) {
        e.burning = true;
        world.fx.ring(e.x, e.y, 180, pal.orange, 0.5);
        world.fx.shake(0.3);
        world.say('bossAngry');
        SO.audio.play('groan', { x: e.x });
      }

      const k = this.progress(e, target);
      e.x -= e.speed * (e.burning ? 1.35 : 1) * dt;
      e.y = lerp(e.y0, target.y - 10, k * k) + Math.sin(e.age * 0.7) * 16;
      if (e.burning && Math.random() < 0.3) {
        world.fx.add({ kind: 'smoke', x: e.x + rand(-150, 190), y: e.y + rand(-40, 30), vx: 60, vy: rand(-40, -10), life: 0.8, size: 14, color: '#2a3152' });
      }

      // warnings as it closes on the barge
      if (target !== world.player) {
        if (e.warned < 1 && k > 0.5) { e.warned = 1; world.say('branderHalf', true); SO.audio.play('alarm'); }
        if (e.warned < 2 && k > 0.8) { e.warned = 2; world.say('branderClose', true); SO.audio.play('alarm'); }
        if (k >= 1) { // it got there
          SO.allies.damage(world, target, 9999, e.x - 200, e.y);
          SO.enemies.burst(world, e, 3.4);
          world.fx.flash = 1;
          world.freeze(0.14);
          return;
        }
      }

      if (!SO.enemies.canFire(e, world)) return;

      e.bombT -= dt;
      if (e.bombT <= 0) {
        SO.enemies.spawn(world, 'firebomb', { x: e.x - 120, y: e.y + 46 });
        SO.audio.play('enemyShoot', { x: e.x, pitch: 0.7 });
        e.bombT = e.burning ? 3.4 : 4.8;
      }

      e.fanT -= dt;
      e.charge = clamp(1 - e.fanT / 0.5, 0, 1);
      if (e.fanT <= 0) {
        const aim = Math.atan2(world.player.y - (e.y + 6), world.player.x - (e.x - 150));
        const n = e.burning ? 5 : 3;
        for (let i = 0; i < n; i++) SO.enemies.fire(world, e, e.x - 150, e.y + 6, aim + (i - (n - 1) / 2) * 0.2, 290);
        e.fanT = e.burning ? 1.9 : 2.5;
        e.charge = 0;
      }
    },
  });
})(window.SO);
