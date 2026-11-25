'use strict';

/* The Eclipse, the Pyre's mothership, and the things that belong to it. All drawn in code:
   a black disc rimmed with fire is mostly silhouette, and its maw, cracks and corona have to move.

   The Eclipse is drawn around its maw (the origin); the centre of the disc sits art.eclipse.dx to the right.
   look: t (seconds, for the flames), maw (0 shut .. 1 open), heat (0..1: the core charging to fire),
         flash (the core, struck), crack (0..1), split (0..: the disc coming apart). */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const TAU = SO.util.TAU;
  const ships = art.ships;

  const E = art.eclipse = { dx: 70, r: 290, maw: 84 };
  const IRON = '#150912';
  const PLATE = '#22101c';
  const SEAM = '#3a1628';
  const SPIKES = 16;
  const HULL_SCALE = 1.5; // the cached hull is drawn larger than life, so it stays sharp on dense screens
  const HULL_HALF = E.r * 1.5;

  let hull = null;
  let ring = null;

  /* The parts that never change: spikes, disc, plates, vents. Painted once. */
  function hullCanvas() {
    if (hull) return hull;
    const r = E.r;
    hull = document.createElement('canvas');
    hull.width = hull.height = Math.ceil(HULL_HALF * 2 * HULL_SCALE);
    const g = hull.getContext('2d');
    g.scale(HULL_SCALE, HULL_SCALE);
    g.translate(HULL_HALF, HULL_HALF);
    g.lineJoin = 'round';
    g.lineCap = 'round';

    // iron spikes, swept like flames in a wind
    for (let i = 0; i < SPIKES; i++) {
      const a = i / SPIKES * TAU + 0.2;
      const long = i % 2 === 0;
      const tip = r * (long ? 1.42 : 1.2);
      const half = long ? 0.13 : 0.1;
      art.poly(g, [
        Math.cos(a - half) * r * 0.95, Math.sin(a - half) * r * 0.95,
        Math.cos(a + 0.2) * tip, Math.sin(a + 0.2) * tip,
        Math.cos(a + half) * r * 0.95, Math.sin(a + half) * r * 0.95,
      ], '#0d0610', '#6e2414', 3.5);
    }

    // the disc
    art.circle(g, 0, 0, r, IRON, pal.enemyInk, 8);
    art.circle(g, 0, 0, r * 0.93, PLATE);
    art.circle(g, 0, 0, r * 0.77, IRON, SEAM, 4);
    art.circle(g, 0, 0, r * 0.52, PLATE, SEAM, 4);
    g.strokeStyle = SEAM;
    g.lineWidth = 3.5;
    for (let i = 0; i < 14; i++) { // plate seams
      const a = i / 14 * TAU + 0.11;
      g.beginPath();
      g.moveTo(Math.cos(a) * r * 0.77, Math.sin(a) * r * 0.77);
      g.lineTo(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93);
      g.stroke();
    }
    for (let i = 0; i < 28; i++) { // rivets
      const a = i / 28 * TAU;
      art.circle(g, Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, 3.6, '#b07a26', pal.enemyInk, 1.5);
    }
    for (let i = 0; i < 9; i++) { // furnace vents
      const a = i / 9 * TAU + 0.35;
      g.save();
      g.translate(Math.cos(a) * r * 0.645, Math.sin(a) * r * 0.645);
      g.rotate(a + Math.PI / 2);
      art.roundRect(g, -24, -8, 48, 16, 7);
      art.paint(g, pal.orange, pal.enemyInk, 4);
      g.fillStyle = pal.gold;
      for (let k = -1; k <= 1; k++) g.fillRect(k * 13 - 3, -5, 6, 10);
      g.restore();
    }

    // the burning rim
    g.beginPath();
    g.arc(0, 0, r - 5, 0, TAU);
    g.strokeStyle = '#ff7a28';
    g.lineWidth = 7;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r - 9, 0, TAU);
    g.strokeStyle = pal.gold;
    g.lineWidth = 2;
    g.stroke();
    return hull;
  }

  /* The corona: a soft ring of fire just outside the disc. Drawn with 'lighter'. */
  function ringCanvas() {
    if (ring) return ring;
    const half = E.r * 1.7;
    ring = document.createElement('canvas');
    ring.width = ring.height = 512;
    const g = ring.getContext('2d');
    const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    const at = (radius) => radius / half;
    grad.addColorStop(0, 'rgba(255,152,56,0)');
    grad.addColorStop(at(E.r * 0.9), 'rgba(255,152,56,0)');
    grad.addColorStop(at(E.r * 0.99), 'rgba(255,224,150,0.95)');
    grad.addColorStop(at(E.r * 1.08), 'rgba(255,152,56,0.6)');
    grad.addColorStop(at(E.r * 1.3), 'rgba(239,64,86,0.2)');
    grad.addColorStop(1, 'rgba(239,64,86,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    ring.half = half;
    return ring;
  }

  /* Flames licking off the rim. */
  function flames(ctx, t, strength) {
    const r = E.r;
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + Math.sin(t * 0.7 + i) * 0.03;
      const len = (16 + 20 * (0.5 + 0.5 * Math.sin(t * 3.1 + i * 2.3)) + 10 * Math.sin(t * 7 + i * 1.3)) * (0.7 + strength);
      const half = 0.075;
      art.poly(ctx, [
        Math.cos(a - half) * r, Math.sin(a - half) * r,
        Math.cos(a + 0.09) * (r + len), Math.sin(a + 0.09) * (r + len),
        Math.cos(a + half) * r, Math.sin(a + half) * r,
      ], i % 3 === 0 ? pal.gold : pal.orange, '#a3321c', 2.5);
    }
  }

  /* The maw: an iron iris over the core. */
  function maw(ctx, look) {
    const open = look.maw || 0;
    const heat = look.heat || 0;
    const R = E.maw;
    art.circle(ctx, 0, 0, R + 14, '#0b0509', '#5a1c30', 7);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + 0.3;
      art.circle(ctx, Math.cos(a) * (R + 14), Math.sin(a) * (R + 14), 4.5, pal.gold, pal.enemyInk, 2);
    }
    art.circle(ctx, 0, 0, R, '#05020a');

    // the core, behind the blades
    if (open > 0.02 || heat > 0) {
      const core = 60 * Math.max(open, heat * 0.45);
      ctx.globalCompositeOperation = 'lighter';
      art.glow(ctx, 0, 0, core * 2.6 + heat * 60, heat > 0.5 ? pal.gold : pal.orange, 0.7 + heat * 0.3);
      ctx.globalCompositeOperation = 'source-over';
      art.circle(ctx, 0, 0, core, look.flash ? pal.white : pal.orange, pal.enemyInk, 4);
      art.circle(ctx, 0, 0, core * 0.7, look.flash ? pal.white : pal.gold);
      art.circle(ctx, 0, 0, core * (0.34 + heat * 0.3), heat > 0.4 || look.flash ? pal.white : pal.cream);
    }

    // eight blades: shut they meet in the middle, open they draw back to the rim, twisting
    const tipR = 6 + open * (R - 16);
    const twist = open * 0.55;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + twist;
      art.poly(ctx, [
        Math.cos(a - 0.42) * R, Math.sin(a - 0.42) * R,
        Math.cos(a + 0.42) * R, Math.sin(a + 0.42) * R,
        Math.cos(a + 0.42 - twist * 1.4) * tipR, Math.sin(a + 0.42 - twist * 1.4) * tipR,
      ], look.flash && open < 0.5 ? pal.white : (i % 2 ? '#2e101e' : '#3d1626'), pal.enemyInk, 3.5);
    }
    if (open < 0.25) { // shut: a seam of furnace light where the blades meet
      ctx.globalCompositeOperation = 'lighter';
      art.glow(ctx, 0, 0, 26 + heat * 40, pal.orange, 0.5 + heat * 0.5);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* Cracks running out from the maw as it dies. */
  const CRACKS = [];
  (function () {
    const rnd = SO.util.rng(91);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + rnd() * 0.4;
      const pts = [];
      let d = E.maw + 10;
      let bend = a;
      while (d < E.r * 1.25) {
        pts.push(Math.cos(bend) * d + E.dx * Math.min(1, d / E.r), Math.sin(bend) * d);
        d += 26 + rnd() * 34;
        bend = a + (rnd() - 0.5) * 0.5;
      }
      CRACKS.push(pts);
    }
  })();

  function cracks(ctx, amount) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < CRACKS.length; i++) {
      const pts = CRACKS[i];
      const n = Math.max(2, Math.round(pts.length / 2 * Math.min(1, amount * 1.3 + (i % 3) * 0.1)));
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let k = 1; k < n && k * 2 < pts.length; k++) ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
      ctx.strokeStyle = pal.orange;
      ctx.lineWidth = 9;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.strokeStyle = pal.cream;
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = 1;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawHull(ctx) {
    ctx.drawImage(hullCanvas(), E.dx - HULL_HALF, -HULL_HALF, HULL_HALF * 2, HULL_HALF * 2);
  }

  ships.eclipse = function (ctx, look) {
    look = look || {};
    const t = look.t || 0;
    const split = look.split || 0;

    if (split > 0) { // coming apart: six wedges of hull, each on its own way out
      for (let i = 0; i < 6; i++) {
        const a0 = i / 6 * TAU + 0.4;
        const mid = a0 + TAU / 12;
        const out = split * (150 + (i % 3) * 70);
        ctx.save();
        ctx.translate(E.dx + Math.cos(mid) * out, Math.sin(mid) * out);
        ctx.rotate(split * (i % 2 ? 0.5 : -0.4));
        ctx.translate(-E.dx, 0);
        ctx.beginPath();
        ctx.moveTo(E.dx, 0);
        ctx.arc(E.dx, 0, HULL_HALF, a0, a0 + TAU / 6);
        ctx.closePath();
        ctx.clip();
        ctx.globalAlpha = Math.max(0, 1 - split * 0.55);
        drawHull(ctx);
        ctx.restore();
      }
      return;
    }

    ctx.save();
    ctx.translate(E.dx, 0);
    ctx.globalCompositeOperation = 'lighter';
    art.glow(ctx, 0, 0, E.r * 1.55, pal.orange, 0.3 + 0.1 * Math.sin(t * 2));
    ctx.globalCompositeOperation = 'source-over';
    flames(ctx, t, look.heat || 0);
    ctx.restore();

    drawHull(ctx);
    maw(ctx, look);
    if (look.crack > 0) cracks(ctx, look.crack);
  };

  /* The corona on its own, for drawing above the dark: in totality it is all that shows of the ship. */
  ships.eclipseCorona = function (ctx, t, strength) {
    const sprite = ringCanvas();
    const pulse = 1 + 0.015 * Math.sin(t * 2.3);
    const half = sprite.half * pulse;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, strength * (0.85 + 0.15 * Math.sin(t * 5.1)));
    ctx.drawImage(sprite, E.dx - half, -half, half * 2, half * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  /* Battery: a twin gun on the Eclipse's rim. look.aim turns the barrels (radians; pi is straight left). */
  ships.battery = function (ctx, look) {
    const flash = look && look.flash;
    const charge = (look && look.charge) || 0;
    const aim = look && look.aim !== undefined ? look.aim : Math.PI;
    art.circle(ctx, 0, 0, 27, flash ? pal.white : '#2a0f1c', pal.enemyInk, 4);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      art.circle(ctx, Math.cos(a) * 21, Math.sin(a) * 21, 2.6, pal.gold);
    }
    ctx.save();
    ctx.rotate(aim);
    art.roundRect(ctx, 4, -14, 36, 9, 3);
    art.paint(ctx, flash ? pal.white : '#3a3040', pal.enemyInk, 3);
    art.roundRect(ctx, 4, 5, 36, 9, 3);
    art.paint(ctx, flash ? pal.white : '#3a3040', pal.enemyInk, 3);
    if (charge > 0) {
      art.circle(ctx, 42, -9.5, 2 + charge * 4.5, pal.gold, pal.enemyInk, 2);
      art.circle(ctx, 42, 9.5, 2 + charge * 4.5, pal.gold, pal.enemyInk, 2);
    }
    ctx.restore();
    art.circle(ctx, 0, 0, 16, flash ? pal.white : pal.redDark, pal.enemyInk, 3.5);
    art.circle(ctx, -3, -3, 6, flash ? pal.white : pal.red);
  };

  /* Shade vane: one of the three that hold the dark over the Eclipse. Unlit it is iron and shadow, and
     shots bounce off; in Guren's light (look.lit) the crystal shows, and can be broken. */
  ships.vane = function (ctx, look) {
    const flash = look && look.flash;
    const lit = look && look.lit;
    art.poly(ctx, [-30, 0, -15, -26, 15, -26, 30, 0, 15, 26, -15, 26], flash ? pal.white : '#1c0a18', lit ? pal.gold : '#5a1c30', 4);
    art.poly(ctx, [-34, -8, -40, 0, -34, 8], lit ? pal.gold : '#5a1c30');
    art.poly(ctx, [0, -31, 18, 0, 0, 31, -18, 0], flash ? pal.white : (lit ? pal.violet : '#2b1840'), pal.enemyInk, 3.5);
    if (lit && !flash) {
      art.poly(ctx, [0, -31, 18, 0, 0, 0, -6, -12], '#c7a4ff');
      art.poly(ctx, [-18, 0, 0, 31, 0, 0], pal.violetDark);
      art.circle(ctx, 0, 0, 5, pal.gold, pal.enemyInk, 2);
    }
  };

  /* Duskwing: a small Pyre drone that flies at the nearest light to put it out. Faces left. */
  ships.duskwing = function (ctx, look) {
    const flash = look && look.flash;
    const wing = flash ? pal.white : '#6a1830';
    const dark = flash ? pal.white : '#2a0f1c';
    art.mirror(ctx, () => {
      art.poly(ctx, [-6, -3, 8, -26, 26, -22, 14, -4], wing, pal.enemyInk, 3);
      art.poly(ctx, [2, -4, 22, -8, 20, 2], dark, pal.enemyInk, 2.5);
      if (!flash) art.circle(ctx, 14, -17, 3.6, pal.orange, pal.enemyInk, 1.5);
    });
    art.ellipse(ctx, 0, 0, 15, 7, dark, pal.enemyInk, 3);
    art.circle(ctx, -10, 0, 4.5, flash ? pal.white : pal.gold, pal.enemyInk, 2);
  };

  /* A piece of somebody's hull, on its way into the maw. */
  ships.wreck = function (ctx, look) {
    const flash = look && look.flash;
    art.poly(ctx, [-26, -8, -10, -22, 16, -18, 28, 2, 12, 20, -16, 16], flash ? pal.white : '#4a1026', pal.enemyInk, 4);
    if (flash) return;
    art.poly(ctx, [-10, -22, 16, -18, 6, -4, -12, -6], pal.redDark);
    art.circle(ctx, -12, 6, 3, pal.gold);
    art.circle(ctx, 12, 8, 3, pal.gold);
    art.poly(ctx, [16, -18, 28, 2, 18, 0], pal.orange);
  };
})(window.SO);
