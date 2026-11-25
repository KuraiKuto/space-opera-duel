'use strict';

/* Enemies that arrive in mission 03, at Meridian: the armoured Wardens of the forge,
   and the Snuffers clamped on the Great Lantern. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, rand, approach } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const BEAM_HALF = 15; // half the height of a Warden's beam

  /* Warden: armoured beam ship. While its shell is shut, shots bounce off. To fire it has to open:
     it lines up, shows a gold aiming line, then burns a beam straight across the screen and vents.
     It can only be hurt while open, so the moment to shoot it is the moment it is aiming at you. */
  SO.enemies.define('warden', {
    hp: 9, radius: 30, scale: 1.3, score: 350, ram: 26, ramSelf: 3, shotDamage: 32,
    boom: 1.5, colors: [pal.violet, pal.gold], engine: [38, 22],
    sprite: art.ships.warden,
    armored(e) { return e.open < 0.5; },
    init(e) {
      if (e.holdX === undefined) e.holdX = W - 240;
      if (e.offset === undefined) e.offset = 0;      // height it keeps relative to Kurai while it waits
      if (e.wait === undefined) e.wait = rand(1.2, 2.2);
      e.state = 'enter';
      e.t = 0;
      e.open = 0;
      e.vy = 0;
    },
    update(e, dt, world) {
      const player = world.player;
      e.t += dt;
      if (e.state === 'enter') {
        e.x += (e.holdX - e.x) * Math.min(1, dt * 2.6);
        if (Math.abs(e.x - e.holdX) < 5) { e.state = 'guard'; e.t = 0; }
      } else if (e.state === 'guard') {       // shut, shadowing Kurai
        e.open = approach(e.open, 0, dt * 5);
        e.charge = 0;
        const targetY = clamp(player.y + e.offset, 70, H - 70);
        e.vy = approach(e.vy, clamp((targetY - e.y) * 2.2, -150, 150), 420 * dt);
        e.y += e.vy * dt;
        if (e.t > e.wait && SO.enemies.canFire(e, world)) { e.state = 'aim'; e.t = 0; SO.audio.play('warn', { x: e.x }); }
      } else if (e.state === 'aim') {         // open, holding still: the aiming line is showing
        e.open = approach(e.open, 1, dt * 5);
        e.charge = clamp(e.t / 0.8, 0, 1);
        if (e.t >= 0.8) { e.state = 'beam'; e.t = 0; e.struck = false; SO.audio.play('beam', { x: e.x }); world.fx.shake(0.25); world.fx.kick(-4, 0); }
      } else if (e.state === 'beam') {
        e.charge = 1;
        // one heavy hit per beam, however long Kurai stays in it
        if (!e.struck && player.alive && player.x < e.x - 20 && Math.abs(player.y - e.y) < BEAM_HALF + player.r) {
          e.struck = player.damage(this.shotDamage, player.x + 60, e.y);
        }
        if (e.t >= 0.65) { e.state = 'vent'; e.t = 0; }
      } else {                                // still open, cooling: a second chance to hit it
        e.charge = 0;
        if (Math.random() < 0.4) {
          world.fx.add({ kind: 'smoke', x: e.x - 10, y: e.y + rand(-8, 8), vx: -70, vy: rand(-50, 50), life: 0.5, size: 8, color: '#4a3a78' });
        }
        if (e.t >= 0.9) { e.state = 'guard'; e.t = 0; e.wait = rand(1.5, 2.6); }
      }
    },
    drawUnder(ctx, e) {
      if (e.state === 'aim') {
        const k = e.t / 0.8;
        ctx.globalAlpha = 0.25 + 0.5 * k * (0.6 + 0.4 * Math.sin(e.t * 40));
        ctx.strokeStyle = pal.gold;
        ctx.lineWidth = 4;
        ctx.setLineDash([16, 12]);
        ctx.lineDashOffset = e.t * 140;
        ctx.beginPath();
        ctx.moveTo(e.x - 44, e.y);
        ctx.lineTo(0, e.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else if (e.state === 'beam') {
        const k = Math.min(1, e.t / 0.06, (0.65 - e.t) / 0.12); // snaps on, tapers off
        const half = BEAM_HALF * Math.max(0, k);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = pal.orange;
        ctx.fillRect(0, e.y - half * 2.2, e.x - 30, half * 4.4);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = pal.gold;
        ctx.fillRect(0, e.y - half, e.x - 30, half * 2);
        ctx.fillStyle = pal.white;
        ctx.fillRect(0, e.y - half * 0.45, e.x - 30, half * 0.9);
      }
    },
  });

  /* Snuffer: one of the three clamps choking the Great Lantern. It does not move. Its furnace
     throws rings of plasma with a gap that shifts each time, and aimed bursts in between.
     Only the furnace can be hurt: shots bounce off the jaws and the body, so Kurai has to sit
     in front of the thing that is shooting at him.
     Destroying it frees part of the Lantern (js/game/objectives.js keeps count). */
  SO.enemies.define('snuffer', {
    hp: 120, radius: 50, scale: 1, score: 1500, ram: 30, ramSelf: 0, shotDamage: 12,
    boom: 3.2, colors: [pal.red, pal.orange],
    boss: true, name: 'Snuffer',
    parts: [[-62, -86, 36], [-62, 86, 36], [56, -70, 56], [56, 70, 56]],
    weak: [0, 0, 58],
    sprite: art.ships.snuffer,
    init(e) {
      if (e.holdX === undefined) e.holdX = W - 150;
      e.state = 'enter';
      e.y0 = e.y;
      e.ringT = 2.4;
      e.burstT = 4.2;
      e.burstLeft = 0;
      e.shotT = 0;
      e.turn = 0;
      e.angry = false;
    },
    update(e, dt, world) {
      if (e.state === 'enter') {
        e.x += (e.holdX - e.x) * Math.min(1, dt * 1.7);
        if (Math.abs(e.x - e.holdX) < 4) e.state = 'clamped';
        return;
      }
      e.y = e.y0 + Math.sin(e.age * 0.8) * 7;

      if (!e.angry && e.hp < e.maxHp * 0.5) {
        e.angry = true;
        world.fx.ring(e.x, e.y, 170, pal.gold, 0.5);
        world.fx.shake(0.3);
        world.say('bossAngry');
        SO.audio.play('groan', { x: e.x });
      }
      if (!SO.enemies.canFire(e, world)) return;

      if (e.burstLeft > 0) {
        e.shotT -= dt;
        if (e.shotT <= 0) {
          SO.enemies.fire(world, e, e.x - 60, e.y, SO.enemies.aimAtPlayer(e, world), 360);
          e.shotT = 0.16;
          e.burstLeft--;
        }
      } else {
        e.burstT -= dt;
        if (e.burstT <= 0) { e.burstLeft = e.angry ? 4 : 3; e.shotT = 0; e.burstT = e.angry ? 3.4 : 4.4; }
      }

      e.ringT -= dt;
      e.charge = clamp(1 - e.ringT / 0.7, 0, 1);
      if (e.charge > 0 && !e.charging) { e.charging = true; SO.audio.play('charge', { x: e.x }); }
      if (e.ringT <= 0) {
        // a fan across the whole left side, with one gap that moves each time
        const n = 11;
        const gap = 2 + (e.turn * 3) % (n - 4);
        for (let i = 0; i < n; i++) {
          if (i === gap || i === gap + 1) continue;
          SO.enemies.fire(world, e, e.x - 60, e.y, Math.PI + (i - (n - 1) / 2) * 0.21, 205);
        }
        e.turn++;
        e.ringT = e.angry ? 2.5 : 3.3;
        e.charge = 0;
        e.charging = false;
      }
    },
  });
})(window.SO);
