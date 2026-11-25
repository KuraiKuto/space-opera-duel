'use strict';

/* Scrolling space backdrop. A mission picks a theme by passing options:

     image     far layer: a place picture (a key of the manifest in js/core/assets.js), panned slowly.
               Without one (or while the file is missing) the sky, nebula and planet are drawn in code.
     imageLit  a second picture to cross-fade to when relight() is called (Meridian's Lantern)
     dim       how much the picture is darkened so ships and shots stand out (0..1)
     lamp      where the Lantern is in the picture (0..1 across and down): its glow grows with .glow
     debris    what drifts past in the middle distance: 'wrecks', 'ice', 'girders' or null
     embers    true for sparks rising from below
     battle    true for two fleets far off, trading fire (it stops when relight() is called)
     sky, nebula, planet, seed, stars   colours and layout for the parts drawn in code */
(function (SO) {
  const art = SO.art;
  const { TAU, wrap, clamp } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const DEFAULTS = {
    seed: 7,
    sky: ['#050818', '#0c1634', '#1a1442'],
    nebula: ['#0f7d8c', '#5a2ea0', '#8a2c6c'],
    stars: ['#f8f3e0', '#f8f3e0', '#f8f3e0', '#b8fbf5', '#ffc9d0'],
    planet: { x: 1010, y: 720, r: 215, light: '#1f6076', dark: '#0a1733', ring: '#b8fbf5' },
    image: null,
    imageLit: null,
    dim: 0.35,
    lamp: null,
    debris: 'wrecks',
    embers: false,
    battle: false,
  };

  /* Things that drift past, as flat point lists. fill/line colour them; embers are glowing points. */
  const DEBRIS = {
    // broken hulls of the Lantern Fleet
    wrecks: {
      fill: '#141f45', line: '#2b3c70', ember: '#ff9838', count: 4, lanes: [150, 520, 330, 610],
      shapes: [
        { // cruiser, snapped in half
          parts: [
            [0, 0, 60, -22, 180, -30, 250, -26, 262, -8, 240, -2, 256, 10, 232, 18, 244, 30, 170, 34, 60, 26],
            [110, -30, 120, -52, 150, -52, 158, -30],
            [282, -22, 302, -28, 310, -10, 290, -4],
            [296, 14, 318, 8, 324, 24, 304, 30],
          ],
          embers: [248, 4, 236, 22, 150, -40],
        },
        { // carrier slab
          parts: [
            [0, -10, 40, -34, 300, -34, 330, -20, 318, -2, 336, 14, 300, 34, 200, 30, 190, 44, 120, 44, 110, 30, 20, 26],
            [350, -30, 372, -24, 360, -8],
          ],
          embers: [322, 4, 90, 0, 210, 36],
        },
        { // frigate
          parts: [
            [0, 0, 30, -14, 110, -18, 140, -6, 126, 4, 138, 14, 100, 20, 30, 16],
            [152, -12, 166, -6, 158, 6],
          ],
          embers: [130, 6],
        },
      ],
    },
    // the Shiver: slabs and splinters of ice (lit: the facet that catches the light)
    ice: {
      fill: '#1f3470', line: '#5f8fd0', lit: '#33529c', ember: '#b8fbf5', count: 6, lanes: [110, 600, 300, 660, 60, 450],
      shapes: [
        { parts: [[0, 10, 30, -40, 110, -62, 200, -30, 230, 20, 170, 60, 60, 56]], lit: [[30, -40, 110, -62, 200, -30, 120, -8]], embers: [112, -40] },
        { parts: [[0, 0, 50, -24, 120, -12, 150, 16, 90, 36, 20, 28], [170, -6, 196, -14, 204, 6, 182, 14]], lit: [[0, 0, 50, -24, 120, -12, 70, 4]], embers: [] },
        { parts: [[0, 6, 18, -60, 44, -90, 62, -40, 70, 20, 36, 44]], lit: [[18, -60, 44, -90, 62, -40, 40, -22]], embers: [42, -70] },
      ],
    },
    // Meridian: the Pyre's scaffolds round the Lantern
    girders: {
      fill: '#1c0a18', line: '#5a1c30', ember: '#ff9838', count: 4, lanes: [110, 650, 50, 610],
      shapes: [
        { // gantry
          parts: [
            [0, -8, 360, -8, 360, 8, 0, 8],
            [30, 8, 46, 8, 90, 70, 74, 70], [150, 8, 166, 8, 122, 70, 106, 70],
            [210, 8, 226, 8, 270, 70, 254, 70], [330, 8, 346, 8, 302, 70, 286, 70],
            [60, 70, 320, 70, 320, 82, 60, 82],
          ],
          embers: [90, 76, 286, 76],
        },
        { // crane arm
          parts: [
            [0, -7, 300, -7, 300, 7, 0, 7],
            [20, 7, 34, 7, 120, 54, 106, 54], [200, 7, 214, 7, 134, 54, 120, 54],
            [100, 54, 140, 54, 140, 66, 100, 66],
            [270, 7, 282, 7, 282, 60, 270, 60], [258, 60, 294, 60, 288, 78, 264, 78],
          ],
          embers: [276, 82],
        },
      ],
    },
  };

  function Backdrop(options) {
    const theme = this.theme = Object.assign({}, DEFAULTS, options);
    if (theme.wrecks === false) theme.debris = null;
    const rnd = SO.util.rng(theme.seed);
    const between = (a, b) => a + rnd() * (b - a);

    this.scroll = 0;
    this.speed = 1;  // the mission raises this for the warp-out
    this.time = 0;
    this.glow = 0;   // 0..1: how much of the Lantern's light is showing (theme.lamp)
    this.lit = 0;    // 0..1: cross-fade to theme.imageLit
    this.lighting = false;

    this.stars = [];
    const layers = [
      { count: 150, drift: 9, size: [0.8, 1.6], alpha: [0.25, 0.65] },
      { count: 70, drift: 24, size: [1.2, 2.2], alpha: [0.45, 0.85] },
      { count: 24, drift: 64, size: [1.8, 2.8], alpha: [0.7, 1] },
    ];
    layers.forEach((layer, index) => {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          x: between(0, W + 40), y: between(0, H),
          drift: layer.drift * between(0.8, 1.2),
          size: between(layer.size[0], layer.size[1]),
          alpha: between(layer.alpha[0], layer.alpha[1]),
          twinkle: between(1, 4), phase: between(0, TAU),
          color: theme.stars[(rnd() * theme.stars.length) | 0],
          near: index === 2,
        });
      }
    });

    this.blobs = [];
    for (let i = 0; i < 9; i++) {
      this.blobs.push({
        x: between(0, W + 900), y: between(-60, H + 60),
        r: between(220, 430), drift: between(4, 8),
        alpha: between(0.16, 0.3),
        color: theme.nebula[i % theme.nebula.length],
      });
    }

    this.debris = [];
    const kind = this.kind = DEBRIS[theme.debris] || null;
    if (kind) {
      for (let i = 0; i < kind.count; i++) {
        this.debris.push({
          shape: kind.shapes[i % kind.shapes.length],
          x: 300 + i * (2480 / kind.count) + between(-80, 80), y: kind.lanes[i % kind.lanes.length] + between(-30, 30),
          drift: between(13, 20), scale: between(0.7, 1.15),
          tilt: theme.debris === 'girders' ? between(-0.08, 0.08) : between(-0.35, 0.35),
          spin: theme.debris === 'girders' ? 0 : between(-0.012, 0.012),
          phase: between(0, TAU),
        });
      }
    }

    // two lines of far-off ships: the fleet on the left, the Pyre on the right
    this.fleets = [];
    if (theme.battle) {
      for (let i = 0; i < 9; i++) {
        const ours = i % 2 === 0;
        this.fleets.push({
          ours,
          x: ours ? between(330, 560) : between(700, 900),
          y: 140 + i * 52 + between(-14, 14),
          size: between(0.55, 1),
          phase: between(0, TAU),
          rate: between(0.5, 1.1),
        });
      }
    }

    this.sparks = [];
    if (theme.embers) {
      for (let i = 0; i < 46; i++) {
        this.sparks.push({ x: between(0, W + 40), y: between(0, H), rise: between(14, 46), drift: between(30, 80), size: between(1.5, 3.2), phase: between(0, TAU) });
      }
    }
  }

  /* Cross-fade to the lit picture (the Great Lantern catching). */
  Backdrop.prototype.relight = function () { this.lighting = true; };

  Backdrop.prototype.update = function (dt) {
    this.time += dt;
    this.scroll += dt * this.speed;
    if (this.lighting) this.lit = Math.min(1, this.lit + dt / 1.1);
  };

  Backdrop.prototype.draw = function (ctx) {
    const theme = this.theme;
    const t = this.time;
    const images = SO.assets.images;
    const picture = images[theme.image];
    const pan = clamp(this.scroll * 0.004, 0, 1);

    if (picture) {
      art.cover(ctx, picture, 1.14, pan, 0.5);
      const lit = images[theme.imageLit];
      if (lit && this.lit > 0) {
        ctx.globalAlpha = this.lit;
        art.cover(ctx, lit, 1.14, pan, 0.5);
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = theme.dim * (1 - 0.45 * this.lit);
      ctx.fillStyle = theme.sky[0];
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    } else {
      if (!this.sky) {
        this.sky = ctx.createLinearGradient(0, 0, 0, H);
        this.sky.addColorStop(0, theme.sky[0]);
        this.sky.addColorStop(0.55, theme.sky[1]);
        this.sky.addColorStop(1, theme.sky[2]);
      }
      ctx.fillStyle = this.sky;
      ctx.fillRect(0, 0, W, H);
    }

    // nebula: full strength on a drawn sky, a light wash over a picture
    ctx.globalCompositeOperation = 'lighter';
    const wash = (picture ? 0.4 : 1) * (1 - this.lit);
    for (let i = 0; i < this.blobs.length && wash > 0; i++) {
      const b = this.blobs[i];
      const x = wrap(b.x - this.scroll * b.drift, W + 900) - 450;
      art.glow(ctx, x, b.y, b.r, b.color, b.alpha * wash);
    }

    // the Lantern's light, as far as it has been freed
    if (picture && theme.lamp && this.glow > 0 && this.lit < 1) {
      const scale = Math.max(W / picture.width, H / picture.height) * 1.14;
      const lx = theme.lamp.x * picture.width * scale - (picture.width * scale - W) * pan;
      const ly = theme.lamp.y * picture.height * scale - (picture.height * scale - H) * 0.5;
      const pulse = 0.85 + 0.15 * Math.sin(t * 3);
      art.glow(ctx, lx, ly, (140 + 260 * this.glow) * pulse, '#12eadc', (0.25 + 0.4 * this.glow) * (1 - this.lit));
      art.glow(ctx, lx, ly, 70 + 90 * this.glow, '#b8fbf5', (0.3 + 0.5 * this.glow) * (1 - this.lit));
    }
    ctx.globalCompositeOperation = 'source-over';

    // far and middle stars
    this.drawStars(ctx, false);

    if (!picture && theme.planet) this.drawPlanet(ctx, theme.planet);

    this.drawFleets(ctx);
    this.drawDebris(ctx);
    this.drawEmbers(ctx);

    // near stars, streaking with speed
    this.drawStars(ctx, true);
    ctx.globalAlpha = 1;
  };

  Backdrop.prototype.drawDebris = function (ctx) {
    const kind = this.kind;
    if (!kind) return;
    const t = this.time;
    for (let i = 0; i < this.debris.length; i++) {
      const w = this.debris[i];
      const x = wrap(w.x - this.scroll * w.drift, W + 1200) - 500;
      if (x > W + 60) continue;
      ctx.save();
      ctx.translate(x, w.y + Math.sin(t * 0.3 + w.phase) * 6);
      ctx.rotate(w.tilt + t * w.spin);
      ctx.scale(w.scale, w.scale);
      for (let p = 0; p < w.shape.parts.length; p++) {
        art.poly(ctx, w.shape.parts[p], kind.fill, kind.line, 2.5);
      }
      for (let p = 0; w.shape.lit && p < w.shape.lit.length; p++) art.poly(ctx, w.shape.lit[p], kind.lit);
      ctx.globalCompositeOperation = 'lighter';
      const embers = w.shape.embers;
      for (let e = 0; e < embers.length; e += 2) {
        const flicker = 0.45 + 0.35 * Math.sin(t * 5 + e * 1.7 + w.phase) + 0.2 * Math.sin(t * 13 + e);
        art.glow(ctx, embers[e], embers[e + 1], 16, kind.ember, Math.max(0, flicker) * 0.7);
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  /* The rest of the battle, a long way off: small dark hulls with one light each, and tracer between them. */
  Backdrop.prototype.drawFleets = function (ctx) {
    const list = this.fleets;
    if (!list.length) return;
    const t = this.time;
    const calm = 1 - this.lit;
    let i, s;
    for (i = 0; i < list.length; i++) {
      s = list[i];
      const dir = s.ours ? 1 : -1;
      const x = s.x + Math.sin(t * 0.11 + s.phase) * 14;
      const y = s.y + Math.sin(t * 0.3 + s.phase) * 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir * s.size, s.size);
      art.poly(ctx, [-34, 0, -26, -7, 4, -8, 10, -15, 20, -15, 22, -7, 36, -2, 30, 7, -28, 8], s.ours ? '#0d1a3a' : '#1c0a14', s.ours ? '#27457e' : '#5a1c30', 2);
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      art.glow(ctx, x - dir * 30 * s.size, y, 9, s.ours ? '#12eadc' : '#ff9838', 0.7);
      // a shot now and then, toward the other line
      const beat = (t * s.rate + s.phase) % 2.6;
      if (calm > 0 && beat < 0.45) {
        const k = beat / 0.45;
        const reach = 150 + s.size * 120;
        const x0 = x + dir * (36 * s.size + k * reach);
        ctx.globalAlpha = calm * (1 - k) * 0.9;
        ctx.strokeStyle = s.ours ? '#b8fbf5' : '#ffd35c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, y - 3);
        ctx.lineTo(x0 - dir * 26, y - 3);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (beat < 0.08) art.glow(ctx, x + dir * 36 * s.size, y - 3, 16, s.ours ? '#b8fbf5' : '#ffd35c', calm);
      }
      // ...and one landing
      const hit = (t * s.rate * 0.7 + s.phase * 2) % 4.3;
      if (calm > 0 && hit < 0.25) art.glow(ctx, x + Math.sin(s.phase * 7) * 16, y + 2, 20 * (1 - hit / 0.25) + 6, '#ff9838', calm * (1 - hit / 0.25));
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  /* Sparks rising from the forge. They go out when the Lantern is lit. */
  Backdrop.prototype.drawEmbers = function (ctx) {
    if (!this.sparks.length || this.lit >= 1) return;
    const t = this.time;
    ctx.fillStyle = '#ffb347';
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      const x = wrap(s.x - this.scroll * s.drift + Math.sin(t * 0.9 + s.phase) * 14, W + 40) - 20;
      const y = H - wrap(H - s.y + t * s.rise, H + 20);
      ctx.globalAlpha = (0.35 + 0.35 * Math.sin(t * 4 + s.phase)) * (y / H) * (1 - this.lit);
      ctx.fillRect(x, y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  };

  Backdrop.prototype.drawStars = function (ctx, near) {
    const t = this.time;
    const stretch = near ? this.speed * 2.5 : Math.max(0, this.speed - 1) * 3;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      if (s.near !== near) continue;
      const x = wrap(s.x - this.scroll * s.drift, W + 40) - 20;
      ctx.globalAlpha = s.alpha * (0.72 + 0.28 * Math.sin(t * s.twinkle + s.phase));
      ctx.fillStyle = s.color;
      ctx.fillRect(x, s.y, s.size + stretch, s.size);
    }
    ctx.globalAlpha = 1;
  };

  Backdrop.prototype.drawPlanet = function (ctx, p) {
    const x = wrap(p.x - this.scroll * 2.2 + 700, W + 1400) - 700;
    if (x - p.r * 1.8 > W) return;
    const y = p.y;
    const r = p.r;
    const ring = (from, to) => {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.75, r * 0.34, -0.32, from, to);
      ctx.strokeStyle = p.ring;
      ctx.globalAlpha = 0.1;
      ctx.lineWidth = r * 0.085;
      ctx.stroke();
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = r * 0.02;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    ctx.lineCap = 'butt';
    ring(Math.PI, TAU); // far half of the ring, behind the planet

    ctx.globalCompositeOperation = 'lighter';
    art.glow(ctx, x, y, r * 1.5, p.light, 0.2);
    ctx.globalCompositeOperation = 'source-over';

    const shade = ctx.createRadialGradient(x - r * 0.45, y - r * 0.5, r * 0.1, x, y, r);
    shade.addColorStop(0, p.light);
    shade.addColorStop(0.55, '#12294c');
    shade.addColorStop(1, p.dark);
    art.circle(ctx, x, y, r, shade);

    // cloud bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.clip();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#b8fbf5';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(x - r * 0.1, y - r * 0.62 + i * r * 0.3, r * 1.1, r * 0.055, -0.32, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    ring(0, Math.PI); // near half, in front
    ctx.lineCap = 'round';
  };

  SO.Backdrop = Backdrop;
})(window.SO);
