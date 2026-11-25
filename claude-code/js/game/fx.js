'use strict';

/* What a hit looks like: particles, explosions, floating text, screen shake and flashes.
   (What it sounds like is in js/audio/sfx.js; the pauses and slow motion are World.freeze and
   World.slow, in world.js.)

   Everything here is tuned so the fight stays readable: the shake only moves the ships' layer
   (never the HUD), by a few pixels; a flash never whites the picture out; coloured flashes keep to
   the edges of the screen. FEEL holds the limits. With "screen shake" switched off in the menu
   (js/core/settings.js), shake and flashes drop to FEEL.calm of their strength. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { rand, clamp, TAU } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const FEEL = {
    shake: 12,          // pixels the picture moves at the hardest shake
    turn: 0.005,        // ...and radians it turns
    settle: 1.9,        // shake lost per second
    kick: 9,            // the most a single blow can push the picture, in pixels
    flash: 0.5,         // how much of the picture the brightest white flash covers (0..1)
    edge: 0.6,          // ...and the brightest coloured flash, at the very edge of the screen
    calm: 0.3,          // what is left of shake and flashes when "screen shake" is off
    maxParticles: 1200,
  };

  // an eight-point comic "pow" burst, radius 1
  const POW = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 1 : 0.5;
    POW.push(Math.cos(i / 16 * TAU) * r, Math.sin(i / 16 * TAU) * r);
  }
  // a four-point glint for a bolt landing
  const GLINT = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 1 : 0.28;
    GLINT.push(Math.cos(i / 8 * TAU) * r, Math.sin(i / 8 * TAU) * r);
  }

  const edges = {}; // coloured edge gradients, one per colour

  function Fx() {
    this.list = [];
    this.t = 0;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.turn = 0;
    this.kickX = 0;
    this.kickY = 0;
    this.flash = 0;     // white full-screen flash, 0..1 (more than 1 lasts longer)
    this.edgeA = 0;     // coloured flash round the edges
    this.edgeColor = pal.red;
    this.delay = 0;     // while set, everything added starts this much later (see explode)
  }

  Fx.FEEL = FEEL;

  /* kind: spark | glow | smoke | chunk | shard | ring | pow | glint | disc | text
     Any particle may have delay: seconds before it appears. */
  Fx.prototype.add = function (p) {
    if (this.list.length >= FEEL.maxParticles) return;
    p.max = p.life;
    p.vx = p.vx || 0;
    p.vy = p.vy || 0;
    if (this.delay) p.delay = (p.delay || 0) + this.delay;
    this.list.push(p);
  };

  /* Shake the picture. amount: 0.15 is a small fighter going up, 1 the hardest there is. */
  Fx.prototype.shake = function (amount) { this.trauma = Math.min(1, this.trauma + amount); };

  /* Push the picture a few pixels one way; it springs back. For a blow that has a direction. */
  Fx.prototype.kick = function (dx, dy) {
    this.kickX = clamp(this.kickX + dx, -FEEL.kick, FEEL.kick);
    this.kickY = clamp(this.kickY + dy, -FEEL.kick, FEEL.kick);
  };

  /* A flash of colour round the edges of the screen: the middle, where the fight is, stays clear. */
  Fx.prototype.edge = function (color, amount) {
    this.edgeColor = color;
    this.edgeA = Math.max(this.edgeA, amount);
  };

  Fx.prototype.sparks = function (x, y, count, color, speed, angle, spread) {
    for (let i = 0; i < count; i++) {
      const a = angle === undefined ? rand(0, TAU) : angle + rand(-spread, spread);
      const v = rand(0.35, 1) * speed;
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.18, 0.45), size: rand(2, 3.5), color, drag: 2.5 });
    }
  };

  /* width: 1 is the usual line; inward: true closes in on the point instead of spreading from it. */
  Fx.prototype.ring = function (x, y, radius, color, life, width, inward) {
    this.add({ kind: 'ring', x, y, life: life || 0.35, size: radius, color, w: width || 1, inward: !!inward });
  };

  Fx.prototype.text = function (x, y, str, color, size) {
    this.add({ kind: 'text', x, y, vy: -46, life: 0.9, text: str, color: color || pal.cream, size: size || 20 });
  };

  /* A bolt landing: a glint and a breath of light, gone in three frames. */
  Fx.prototype.impact = function (x, y, color, size) {
    const s = size || 1;
    this.add({ kind: 'glint', x, y, life: 0.09, size: 15 * s, color: pal.white, rot: rand(0, TAU) });
    this.add({ kind: 'glow', x, y, life: 0.12, size: 34 * s, color });
  };

  /* Splinters of something that broke: a shield, a pane of ice. */
  Fx.prototype.shards = function (x, y, count, color, speed, rx, ry) {
    for (let i = 0; i < count; i++) {
      const a = i / count * TAU + rand(-0.2, 0.2);
      const v = rand(0.5, 1) * speed;
      this.add({
        kind: 'shard', x: x + Math.cos(a) * (rx || 0), y: y + Math.sin(a) * (ry || rx || 0),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.35, 0.7), size: rand(7, 14),
        color, rot: rand(0, TAU), spin: rand(-10, 10), drag: 1.8,
      });
    }
  };

  /* size: about 1 for a small fighter, 3 for something big. colors: [main, accent].
     options: push [vx, vy] throws the debris that way (the way the shot was going);
              delay starts the whole explosion that many seconds later (for a chain of them). */
  Fx.prototype.explode = function (x, y, size, colors, options) {
    const main = colors[0];
    const accent = colors[1];
    const root = Math.sqrt(size);
    const px = options && options.push ? options.push[0] : 0;
    const py = options && options.push ? options.push[1] : 0;
    const outer = this.delay;
    this.delay = outer + ((options && options.delay) || 0);
    let i, a, v;

    // the hit itself: a hard white disc for a few frames, and the comic burst
    this.add({ kind: 'disc', x, y, life: 0.06 + 0.02 * size, size: 28 * Math.pow(size, 0.7), color: pal.white });
    this.add({ kind: 'pow', x, y, life: 0.16 + 0.02 * size, size: 34 * size, color: pal.cream, rot: rand(0, TAU) });
    this.add({ kind: 'glow', x, y, life: 0.3, size: 80 * size, color: pal.cream });
    this.add({ kind: 'glow', x, y, life: 0.5, size: 110 * size, color: accent });

    // the shock: one fast ring, and for anything big a slower one behind it
    this.ring(x, y, 60 * size, pal.cream, 0.32);
    if (size >= 1.4) this.ring(x, y, 110 * size, accent, 0.55, 0.6);

    // sparks, and a few long streaks
    this.sparks(x, y, Math.round(10 * size), accent, 420 * root);
    this.sparks(x, y, Math.round(6 * size), pal.cream, 300 * root);
    for (i = 0; i < Math.round(3 * size); i++) {
      a = rand(0, TAU);
      v = rand(520, 800) * root;
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * v + px, vy: Math.sin(a) * v + py, life: rand(0.25, 0.5), size: 2, color: pal.cream, drag: 3 });
    }

    // pieces of hull, trailing fire
    for (i = 0; i < Math.round(4 * size); i++) {
      a = rand(0, TAU);
      v = rand(80, 260) * root;
      this.add({
        kind: 'chunk', x, y, vx: Math.cos(a) * v + px, vy: Math.sin(a) * v + py, life: rand(0.5, 0.95), size: rand(5, 9),
        color: main, rot: rand(0, TAU), spin: rand(-9, 9), drag: 1.2, trail: size >= 1 ? accent : null,
      });
    }

    // embers that hang in the air a moment longer than everything else
    for (i = 0; i < Math.round(5 * size); i++) {
      a = rand(0, TAU);
      v = rand(30, 170) * root;
      this.add({ kind: 'glow', x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 8, vx: Math.cos(a) * v + px * 0.5, vy: Math.sin(a) * v + py * 0.5, life: rand(0.45, 1.05), size: rand(7, 13), color: i % 2 ? accent : pal.gold, drag: 1.6 });
    }

    for (i = 0; i < Math.round(4 * size); i++) {
      a = rand(0, TAU);
      v = rand(20, 90);
      this.add({ kind: 'smoke', x: x + rand(-10, 10) * size, y: y + rand(-10, 10) * size, vx: Math.cos(a) * v - 40, vy: Math.sin(a) * v, life: rand(0.5, 1), size: rand(10, 20) * size, color: '#2a3152', drag: 1 });
    }

    // something big does not go up all at once
    for (i = 0; size >= 2 && i < 2; i++) {
      const dx = rand(-34, 34) * size;
      const dy = rand(-26, 26) * size;
      const wait = rand(0.07, 0.24);
      this.add({ kind: 'disc', x: x + dx, y: y + dy, life: 0.07, size: 16 * size, color: pal.white, delay: wait });
      this.add({ kind: 'glow', x: x + dx, y: y + dy, life: 0.3, size: 60 * size, color: accent, delay: wait });
      this.add({ kind: 'ring', x: x + dx, y: y + dy, life: 0.3, size: 36 * size, color: pal.cream, w: 1, inward: false, delay: wait });
    }
    this.delay = outer;
  };

  Fx.prototype.update = function (dt, realDt) {
    const calm = SO.settings.get('shake') ? 1 : FEEL.calm;
    this.t += realDt;
    this.trauma = Math.max(0, this.trauma - realDt * FEEL.settle);
    // two slow waves and two fast ones: a rattle, not a jitter
    const t = this.t;
    const mag = this.trauma * this.trauma * FEEL.shake * calm;
    const settle = Math.exp(-realDt * 16);
    this.kickX *= settle;
    this.kickY *= settle;
    this.shakeX = mag * (Math.sin(t * 47 + 1.3) + 0.5 * Math.sin(t * 83 + 4.1)) / 1.5 + this.kickX * calm;
    this.shakeY = mag * (Math.sin(t * 59 + 2.7) + 0.5 * Math.sin(t * 97 + 0.4)) / 1.5 + this.kickY * calm;
    this.turn = SO.settings.get('shake') ? this.trauma * this.trauma * FEEL.turn * Math.sin(t * 41 + 5) : 0;
    this.flash = Math.max(0, this.flash - realDt * 3);
    this.edgeA = Math.max(0, this.edgeA - realDt * 2.6);

    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life -= dt;
      if (p.life <= 0) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      if (p.spin) p.rot += p.spin * dt;
      if (p.trail && Math.random() < dt * 34 && list.length < FEEL.maxParticles) {
        list.push({ kind: 'glow', x: p.x, y: p.y, vx: 0, vy: 0, life: 0.26, max: 0.26, size: 12, color: p.trail });
      }
    }
  };

  /* Move the ships' layer by the shake. The world calls this between save() and restore(). */
  Fx.prototype.transform = function (ctx) {
    ctx.translate(W / 2 + this.shakeX, H / 2 + this.shakeY);
    if (this.turn) ctx.rotate(this.turn);
    ctx.translate(-W / 2, -H / 2);
  };

  Fx.prototype.draw = function (ctx) {
    const list = this.list;
    let p, k, i;

    for (i = 0; i < list.length; i++) {
      p = list[i];
      if (p.kind !== 'smoke' || p.delay > 0) continue;
      k = p.life / p.max;
      ctx.globalAlpha = k * 0.5;
      art.circle(ctx, p.x, p.y, p.size * (1.4 - k * 0.6), p.color);
    }
    ctx.globalAlpha = 1;

    for (i = 0; i < list.length; i++) {
      p = list[i];
      if (p.kind !== 'chunk' || p.delay > 0) continue;
      k = p.life / p.max;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, k * 3);
      art.poly(ctx, [-p.size, -p.size * 0.6, p.size, -p.size * 0.2, 0, p.size], p.color, pal.ink, 2.5);
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < list.length; i++) {
      p = list[i];
      if (p.delay > 0) continue;
      k = p.life / p.max;
      if (p.kind === 'glow') {
        art.glow(ctx, p.x, p.y, p.size * (0.5 + 0.5 * k), p.color, k);
      } else if (p.kind === 'spark') {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
      } else if (p.kind === 'shard') {
        ctx.globalAlpha = Math.min(1, k * 2.2);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        art.poly(ctx, [-p.size, 0, p.size * 0.2, -p.size * 0.45, p.size, p.size * 0.3], p.color);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    for (i = 0; i < list.length; i++) {
      p = list[i];
      if (p.delay > 0) continue;
      k = p.life / p.max;
      if (p.kind === 'ring') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = (1 + 6 * k) * p.w;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.inward ? p.size * k * k : p.size * (1 - k * k)) + 4, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (p.kind === 'disc') {
        ctx.globalAlpha = Math.min(1, k * 1.6);
        art.circle(ctx, p.x, p.y, p.size * (1.25 - 0.25 * k), p.color);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'pow' || p.kind === 'glint') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const s = p.size * (1.15 - k * 0.6);
        ctx.scale(s, s);
        art.path(ctx, p.kind === 'pow' ? POW : GLINT);
        ctx.fillStyle = p.color;
        ctx.fill();
        if (p.kind === 'pow') {
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = 4 / s;
          ctx.stroke();
        }
        ctx.restore();
      } else if (p.kind === 'text') {
        // pops in a little too big, then settles
        const pop = 1 + 0.5 * Math.max(0, 1 - (p.max - p.life) / 0.12);
        ctx.globalAlpha = Math.min(1, k * 2.5);
        art.text(ctx, p.text, p.x, p.y, { size: p.size * pop, color: p.color, align: 'center' });
        ctx.globalAlpha = 1;
      }
    }
  };

  /* The flashes, over the whole picture. Drawn after the ships' layer and before the HUD. */
  Fx.prototype.drawFlash = function (ctx) {
    const calm = SO.settings.get('shake') ? 1 : FEEL.calm;
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.flash) * FEEL.flash * calm;
      ctx.fillStyle = pal.white;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.edgeA > 0) {
      let edge = edges[this.edgeColor];
      if (!edge) {
        const n = parseInt(this.edgeColor.slice(1), 16);
        const rgb = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
        edge = edges[this.edgeColor] = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.02);
        edge.addColorStop(0, 'rgba(' + rgb + ',0)');
        edge.addColorStop(1, 'rgba(' + rgb + ',1)');
      }
      ctx.globalAlpha = Math.min(1, this.edgeA) * FEEL.edge * (calm < 1 ? 0.6 : 1);
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  };

  SO.Fx = Fx;
})(window.SO);
