'use strict';

/* Kurai's ship, the Foxfire: flight, blasters, shields and hull.
   Shields soak up damage and recharge after a quiet moment; hull damage stays until repaired. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, approach, rand, TAU } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const TUNING = {
    speed: 430,           // pixels per second
    accel: 3200,
    fireEvery: 0.13,     // seconds between twin shots
    maxShield: 100,
    maxHull: 100,
    regenDelay: 2.6,      // quiet seconds before shields recharge
    brokenDelay: 3.6,     // ...and after they were knocked out completely
    regenRate: 24,        // shield points per second
    hullInvuln: 1.1,      // seconds of safety after a hull hit
    breakInvuln: 0.6,     // ...and after the hit that breaks the shields (which never reaches the hull)
    startX: 230,
    scale: 1.25,          // sprite size; the hit circle stays small
    // touch: the ship goes where the finger has dragged it to, at its own speed
    dragGain: 2.1,        // game pixels the ship is asked to move per game pixel of finger travel
    dragSnap: 14,         // how hard it closes on that spot (speed = distance x this, up to `speed`)
  };

  function Player(world) {
    this.world = world;
    this.x = -90;
    this.y = H / 2;
    this.vx = 0;
    this.vy = 0;
    this.r = 15; // hit circle, smaller than the sprite on purpose
    this.maxShield = TUNING.maxShield;
    this.maxHull = TUNING.maxHull;
    this.shield = this.maxShield;
    this.hull = this.maxHull;
    this.alive = true;
    this.mode = 'enter'; // enter -> fly -> exit, or dead
    this.shieldBroken = false;
    this.sinceHit = 99;
    this.invuln = 0;
    this.fireCd = 0;
    this.shieldFlash = 0;
    this.flash = 0;
    this.tilt = 0;
    this.thrust = 1;
    this.trail = 0;
    this.age = 0;
    this.recoil = 0;    // 0..1: the ship jumps back a little with each shot
    this.ripples = [];  // where the shield was just struck: [{ a: angle, t: 0..1 }]
    this.beepT = 0;     // the low-hull warning's timer
    this.goal = null;   // touch: where the finger has dragged the ship to, { x, y }
    this.arrived = false;
  }

  Player.TUNING = TUNING;

  Player.prototype.update = function (dt) {
    if (!this.alive) return;
    const world = this.world;
    this.age += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt * 3.5);
    this.flash = Math.max(0, this.flash - dt * 8);
    this.recoil = Math.max(0, this.recoil - dt * 14);
    this.fireCd -= dt;
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].t += dt * 2.8;
      if (this.ripples[i].t >= 1) this.ripples.splice(i, 1);
    }

    if (this.mode === 'enter') {
      if (!this.arrived) { this.arrived = true; SO.audio.play('arrive', { x: 0 }); }
      this.x += (TUNING.startX - this.x) * Math.min(1, dt * 3.2);
      this.thrust = 1;
      if (TUNING.startX - this.x < 3) this.mode = 'fly';
    } else if (this.mode === 'fly') {
      let px = 0;
      let py = 0;
      const pull = world.pull; // something is dragging the ship: { x, y, force } (the Eclipse's maw)
      if (pull) {
        const dx = pull.x - this.x;
        const dy = pull.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        px = dx / dist * pull.force;
        py = dy / dist * pull.force;
      }
      const drag = SO.input.drag();
      let wantX, wantY;
      if (drag) { // a finger steers: head for the spot it has dragged the ship to
        const goal = this.goal || (this.goal = { x: this.x, y: this.y });
        // (whatever pulls the ship pulls that spot too, so the pull has to be dragged against, as with keys)
        goal.x = clamp(goal.x + drag.x * TUNING.dragGain + px * dt, 64, W - 70);
        goal.y = clamp(goal.y + drag.y * TUNING.dragGain + py * dt, 56, H - 52);
        wantX = (goal.x - this.x) * TUNING.dragSnap;
        wantY = (goal.y - this.y) * TUNING.dragSnap;
        const want = Math.sqrt(wantX * wantX + wantY * wantY);
        if (want > TUNING.speed) { wantX *= TUNING.speed / want; wantY *= TUNING.speed / want; }
      } else {
        const axis = SO.input.axis();
        this.goal = null;
        wantX = axis.x * TUNING.speed;
        wantY = axis.y * TUNING.speed;
      }
      this.vx = approach(this.vx, wantX, TUNING.accel * dt);
      this.vy = approach(this.vy, wantY, TUNING.accel * dt);
      this.x = clamp(this.x + (this.vx + px) * dt, 64, W - 70);
      this.y = clamp(this.y + (this.vy + py) * dt, 56, H - 52);
      this.thrust = clamp(0.5 + this.vx / TUNING.speed * 0.5, 0.15, 1);

      if (SO.input.held('fire') && this.fireCd <= 0) this.fire();
      this.rechargeShield(dt);

      // a quiet double beep while the hull is nearly gone, in time with the red edge of the screen
      if (this.hull < this.maxHull * 0.35 && world.state === 'play') {
        this.beepT -= dt;
        if (this.beepT <= 0) { this.beepT = 1.05; SO.audio.play('lowHull'); }
      } else {
        this.beepT = 0;
      }
    } else if (this.mode === 'exit') { // mission won: burn off to the right
      this.vx += 1700 * dt;
      this.vy = approach(this.vy, 0, 900 * dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.thrust = 1;
    }

    this.tilt += (clamp(this.vy / TUNING.speed, -1, 1) * 0.22 - this.tilt) * Math.min(1, dt * 12);

    // engine trail, plus smoke when the hull is in a bad way
    this.trail += dt;
    while (this.trail > 0.016) {
      this.trail -= 0.016;
      world.fx.add({
        kind: 'glow', x: this.x - 58, y: this.y + rand(-2, 2),
        vx: -200 - this.thrust * 260, vy: rand(-18, 18),
        life: 0.22, size: 15 + this.thrust * 11, color: pal.cyan,
      });
      if (this.hull < this.maxHull * 0.35 && Math.random() < 0.18) {
        world.fx.add({ kind: 'smoke', x: this.x - 20, y: this.y + rand(-8, 8), vx: -160, vy: rand(-30, 30), life: 0.6, size: 9, color: '#2a3152' });
        if (Math.random() < 0.4) world.fx.sparks(this.x + rand(-20, 20), this.y + rand(-10, 10), 2, pal.orange, 160);
      }
    }
  };

  Player.prototype.fire = function () {
    const world = this.world;
    const fx = world.fx;
    this.fireCd = TUNING.fireEvery;
    this.recoil = 1;
    world.stats.fired += 2;
    for (let side = -1; side <= 1; side += 2) {
      const y = this.y + side * 15;
      SO.shots.player(world, this.x + 38, y);
      // muzzle flash: two frames of light and a glint, and a spark thrown ahead
      fx.add({ kind: 'glow', x: this.x + 46, y, life: 0.07, size: 30, color: pal.cyanLight });
      fx.add({ kind: 'glint', x: this.x + 48, y, life: 0.05, size: 12, color: pal.white, rot: 0 });
      fx.sparks(this.x + 46, y, 1, pal.cyanLight, 300, 0, 0.3);
    }
    SO.audio.play('shoot', { x: this.x });
  };

  Player.prototype.rechargeShield = function (dt) {
    this.sinceHit += dt;
    if (this.shield >= this.maxShield) return;
    if (this.sinceHit < (this.shieldBroken ? TUNING.brokenDelay : TUNING.regenDelay)) return;
    if (this.shieldBroken) { // back from nothing: the bubble closes round the ship again
      const fx = this.world.fx;
      this.shieldBroken = false;
      this.shieldFlash = 1;
      fx.ring(this.x, this.y, 150, pal.cyanLight, 0.3, 1, true);
      fx.ring(this.x, this.y, 70, pal.cyan, 0.4);
      fx.sparks(this.x, this.y, 10, pal.cyanLight, 200);
      this.world.say('shieldUp');
      SO.audio.play('shieldUp', { x: this.x });
    }
    this.shield = Math.min(this.maxShield, this.shield + TUNING.regenRate * dt);
  };

  /* Returns true if the hit landed (false while invulnerable, entering or leaving, or once the mission is decided). */
  Player.prototype.damage = function (amount, fromX, fromY) {
    if (!this.alive || this.mode !== 'fly' || this.invuln > 0 || SO.dev.god) return false;
    const world = this.world;
    const fx = world.fx;
    if (world.state === 'lost' || world.state === 'won' || world.truce) return false;
    const angle = Math.atan2(fromY - this.y, fromX - this.x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.sinceHit = 0;

    if (this.shield > 0) {
      // the bubble takes it: light where it was struck, a ripple round the rim, a nudge away from the blow
      // (all of it, however little shield was left: the blow that breaks the bubble stops there)
      this.shield = Math.max(0, this.shield - amount);
      amount = 0;
      this.shieldFlash = 1;
      this.ripples.push({ a: angle, t: 0 });
      fx.sparks(this.x + cos * 54, this.y + sin * 44, 8, pal.cyanLight, 260, angle, 1.2);
      fx.impact(this.x + cos * 62, this.y + sin * 48, pal.cyan, 1.4);
      fx.kick(-cos * 3, -sin * 3);
      fx.shake(0.1);
      world.hud.shieldHit();
      SO.audio.play('shieldHit', { x: this.x, left: this.shield / this.maxShield });
      if (this.shield <= 0) { // ...and that was the last of it: the bubble shatters
        this.shieldBroken = true;
        this.invuln = TUNING.breakInvuln;
        fx.shards(this.x + 2, this.y, 18, pal.cyan, 400, 70, 54);
        fx.ring(this.x, this.y, 110, pal.cyan, 0.45);
        fx.sparks(this.x, this.y, 22, pal.cyan, 420);
        fx.shake(0.35);
        fx.edge(pal.cyan, 0.7);
        world.freeze(0.06);
        world.slow(0.5, 0.4);
        world.say('shieldDown', true);
        SO.audio.play('shieldDown', { x: this.x });
      }
    }

    if (amount > 0) {
      // through to the hull: plates fly, the picture jolts, the edge of the screen goes red
      const wasHealthy = this.hull >= this.maxHull * 0.35;
      this.hull -= amount;
      this.invuln = TUNING.hullInvuln;
      this.flash = 1;
      fx.sparks(this.x, this.y, 14, pal.orange, 360);
      fx.impact(this.x + cos * 20, this.y + sin * 14, pal.orange, 1.8);
      for (let i = 0; i < 3; i++) {
        const a = angle + Math.PI + rand(-0.9, 0.9);
        const v = rand(120, 260);
        fx.add({ kind: 'chunk', x: this.x, y: this.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.4, 0.7), size: rand(4, 6), color: pal.navyLight, rot: rand(0, TAU), spin: rand(-10, 10), drag: 1.4 });
      }
      fx.shake(0.5);
      fx.kick(-cos * 7, -sin * 7);
      fx.edge(pal.red, 0.9);
      world.freeze(0.07);
      world.hud.portraitHit();
      SO.audio.play('hullHit', { x: this.x });
      if (this.hull <= 0) {
        this.hull = 0;
        this.die();
      } else if (wasHealthy && this.hull < this.maxHull * 0.35) {
        world.say('hullLow', true);
      }
    }
    return true;
  };

  Player.prototype.die = function () {
    const world = this.world;
    const fx = world.fx;
    this.alive = false;
    this.mode = 'dead';
    fx.explode(this.x, this.y, 2.8, [pal.navyLight, pal.cyan]);
    fx.explode(this.x - 20, this.y + 10, 1.4, [pal.cream, pal.orange], { delay: 0.14 });
    fx.explode(this.x + 26, this.y - 14, 1.2, [pal.navyLight, pal.cyan], { delay: 0.3 });
    fx.ring(this.x, this.y, 420, pal.cyanLight, 0.8, 0.7);
    fx.shake(1);
    fx.flash = 1;
    fx.edge(pal.red, 1);
    world.freeze(0.14);
    SO.audio.play('bigBoom', { x: this.x });
    world.playerDied(); // ...which slows the clock for the fall
  };

  /* The mission is won: light the afterburner and go. */
  Player.prototype.leave = function () {
    const fx = this.world.fx;
    this.mode = 'exit';
    fx.ring(this.x - 46, this.y, 90, pal.cyanLight, 0.4);
    fx.sparks(this.x - 46, this.y, 16, pal.cyanLight, 420, Math.PI, 0.5);
    fx.add({ kind: 'glow', x: this.x - 50, y: this.y, life: 0.3, size: 90, color: pal.cyan });
    SO.audio.play('boost', { x: this.x });
  };

  Player.prototype.draw = function (ctx) {
    if (!this.alive) return;
    const blink = this.invuln > 0 && Math.floor(this.invuln * 18) % 2 === 0;

    ctx.save();
    ctx.translate(this.x - this.recoil * 3, this.y);
    ctx.rotate(this.tilt);
    ctx.scale(TUNING.scale, TUNING.scale);
    if (blink) ctx.globalAlpha = 0.4;

    // engine flame
    const len = 16 + this.thrust * 26 + Math.random() * 7;
    ctx.globalCompositeOperation = 'lighter';
    art.glow(ctx, -50, 0, 24 + this.thrust * 14, pal.cyan, 0.8);
    ctx.globalCompositeOperation = 'source-over';
    art.poly(ctx, [-43, -6.5, -43 - len, 0, -43, 6.5], pal.cyan, pal.ink, 3);
    art.poly(ctx, [-43, -3.2, -43 - len * 0.55, 0, -43, 3.2], pal.cream);

    art.ships.player(ctx, { flash: this.flash > 0.4 });
    ctx.restore();

    // shield bubble: faint while up, bright when struck
    if (this.shield > 0 && this.mode !== 'exit') {
      const k = this.shieldFlash;
      const strength = this.shield / this.maxShield;
      ctx.beginPath();
      ctx.ellipse(this.x + 2, this.y, 74 + k * 5, 58 + k * 5, 0, 0, TAU);
      ctx.globalAlpha = 0.03 + k * 0.2;
      ctx.fillStyle = pal.cyan;
      ctx.fill();
      // nearly gone, it flickers
      const weak = strength < 0.3 ? 0.55 + 0.45 * Math.sin(this.age * 34) : 1;
      ctx.globalAlpha = ((0.1 + 0.14 * strength) + k * 0.7) * weak;
      ctx.strokeStyle = k > 0.6 ? pal.cyanLight : pal.cyan;
      ctx.lineWidth = 2.5 + k * 3;
      ctx.stroke();

      // where it was struck: a bright arc that runs round the rim both ways and fades
      for (let i = 0; i < this.ripples.length; i++) {
        const r = this.ripples[i];
        const fade = 1 - r.t;
        ctx.strokeStyle = pal.cyanLight;
        ctx.globalAlpha = fade;
        ctx.lineWidth = 2 + 7 * fade;
        for (let side = -1; side <= 1; side += 2) {
          const from = r.a + side * r.t * 1.9;
          ctx.beginPath();
          ctx.ellipse(this.x + 2, this.y, 76 + k * 5, 60 + k * 5, 0, Math.min(from, from + side * 0.45), Math.max(from, from + side * 0.45));
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  };

  SO.Player = Player;
})(window.SO);
