'use strict';

/* In-flight display, drawn on the canvas: Kurai's portrait and the radio bubble,
   shield and hull bars, wave progress, the objective's gauge, score, banners, a boss's health,
   a small bar over each enemy capital ship, and (as the first mission opens) how to fly. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, easeOutBack, approach, TAU } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const PORTRAIT = { x: 62, y: 62, r: 39 };
  const BAR = { x: 182, w: 214, h: 18, shieldY: 36, hullY: 66 };

  function Hud(world) {
    this.world = world;
    this.t = 0;
    this.shieldGhost = 1; // the pale trail a bar leaves as it drops
    this.hullGhost = 1;
    this.hurt = 0;        // portrait reaction to hull damage
    this.allyFlash = 0;   // the escort was hit: its gauge flashes
    this.fade = 1;        // the corner display fades when the ship flies under it
    this.banner = null;
    this.line = null;     // radio line being shown
    this.bubble = 0;      // 0..1 pop-in of the radio bubble
    this.scoreShown = 0;
    this.shieldPop = 0;   // 0..1: the shield bar was just struck, and jumps
    this.hullPop = 0;     // ...and the hull bar
    this.scorePop = 0;    // the score just went up, and swells
    this.bossSeen = null; // the boss whose bar is showing, and the pale trail its bar leaves
    this.bossGhost = 1;
  }

  /* note: a line of small print under the banner (the mission's objective). */
  Hud.prototype.showBanner = function (title, sub, seconds, note) {
    this.banner = { title: title.toUpperCase(), sub: sub || '', note: note || '', t: 0, dur: seconds || 2 };
    SO.audio.play('banner');
  };

  Hud.prototype.portraitHit = function () { this.hurt = 1; this.hullPop = 1; };
  Hud.prototype.shieldHit = function () { this.shieldPop = 1; };
  Hud.prototype.allyHit = function () { this.allyFlash = 1; };
  Hud.prototype.scored = function () { this.scorePop = 1; };

  Hud.prototype.update = function (dt) {
    const world = this.world;
    const p = world.player;
    this.t += dt;
    this.hurt = Math.max(0, this.hurt - dt * 1.8);
    this.allyFlash = Math.max(0, this.allyFlash - dt * 2.5);
    this.shieldPop = Math.max(0, this.shieldPop - dt * 5);
    this.hullPop = Math.max(0, this.hullPop - dt * 4);
    this.scorePop = Math.max(0, this.scorePop - dt * 6);
    this.shieldGhost = Math.max(p.shield / p.maxShield, this.shieldGhost - dt * 0.45);
    this.hullGhost = Math.max(p.hull / p.maxHull, this.hullGhost - dt * 0.3);
    this.fade = approach(this.fade, p.alive && p.x < 460 && p.y < 215 ? 0.3 : 1, dt * 4);
    this.scoreShown += (world.stats.score - this.scoreShown) * Math.min(1, dt * 10);
    if (world.stats.score - this.scoreShown < 1) this.scoreShown = world.stats.score;

    if (world.comms.current) {
      this.line = world.comms.current;
      this.bubble = Math.min(1, this.bubble + dt * 5);
    } else {
      this.bubble = Math.max(0, this.bubble - dt * 7);
    }

    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) this.banner = null;
    }
  };

  Hud.prototype.draw = function (ctx) {
    const world = this.world;
    const p = world.player;

    if (p.alive && p.hull < p.maxHull * 0.35) this.drawDangerEdge(ctx);

    ctx.save();
    ctx.globalAlpha = this.fade;
    this.drawBars(ctx, p);
    this.drawPortrait(ctx, p);
    this.drawBubble(ctx);
    ctx.restore();

    this.drawWaves(ctx);
    if (world.director.state !== 'intro') world.objective.draw(ctx, this, world);
    this.drawScore(ctx);
    this.drawCapitals(ctx);
    this.drawBoss(ctx);
    this.drawBanner(ctx);
    if (world.mission.teach && world.startWave === 1) this.drawControls(ctx);
  };

  /* How to fly, along the bottom of the screen for the first seconds of a mission that teaches
     (teach: true in the mission file). Keys are drawn as key caps; a touch screen gets its own words. */
  const TEACH = { from: 1.2, until: 12, y: H - 74 };
  const CONTROLS = {
    keys: [['key', 'Arrows'], ['word', 'or'], ['key', 'WASD'], ['word', 'fly'], ['gap'], ['key', 'Space'], ['word', 'fire'], ['gap'], ['key', 'Esc'], ['word', 'pause']],
    touch: [['key', 'Drag'], ['word', 'anywhere to fly'], ['gap'], ['key', 'Hold'], ['word', 'to fire']],
  };
  Hud.prototype.drawControls = function (ctx) {
    const t = this.world.clock;
    if (t < TEACH.from || t > TEACH.until) return;
    const parts = SO.input.touch ? CONTROLS.touch : CONTROLS.keys;
    const size = 19;
    const pad = 12;
    ctx.font = '800 ' + size + 'px ' + SO.FONT;
    const widths = parts.map((p) => (p[0] === 'gap' ? 34 : ctx.measureText(p[1].toUpperCase()).width + (p[0] === 'key' ? pad * 2 : 0)));
    const total = widths.reduce((a, b) => a + b, 0) + (parts.length - 1) * 10;
    let x = W / 2 - total / 2;
    ctx.save();
    ctx.globalAlpha = clamp((t - TEACH.from) / 0.4, 0, 1) * clamp((TEACH.until - t) / 0.6, 0, 1);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p[0] === 'key') {
        art.roundRect(ctx, x, TEACH.y - 17, widths[i], 34, 9);
        art.paint(ctx, pal.navyDeep, pal.ink, 6);
        art.roundRect(ctx, x, TEACH.y - 17, widths[i], 34, 9);
        art.paint(ctx, pal.navyDeep, pal.cyanLight, 2);
        art.text(ctx, p[1].toUpperCase(), x + pad, TEACH.y + 1, { size, baseline: 'middle', color: pal.cream, stroke: null });
      } else if (p[0] === 'word') {
        art.text(ctx, p[1].toUpperCase(), x, TEACH.y + 1, { size, baseline: 'middle', color: pal.cyanLight, lineWidth: 5 });
      }
      x += widths[i] + 10;
    }
    ctx.restore();
  };

  /* Red pulse round the screen edge when the hull is nearly gone. */
  Hud.prototype.drawDangerEdge = function (ctx) {
    if (!this.edge) {
      this.edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.58, W / 2, H / 2, H * 1.05);
      this.edge.addColorStop(0, 'rgba(239,64,86,0)');
      this.edge.addColorStop(1, 'rgba(239,64,86,0.5)');
    }
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this.t * 6);
    ctx.fillStyle = this.edge;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  };

  function drawBar(ctx, y, fraction, ghost, color, outline) {
    const x = BAR.x;
    const w = BAR.w;
    const h = BAR.h;
    art.roundRect(ctx, x, y, w, h, h / 2);
    art.paint(ctx, pal.navyDeep, outline, 4.5);
    art.paint(ctx, pal.navyDeep);
    ctx.save();
    art.roundRect(ctx, x, y, w, h, h / 2);
    ctx.clip();
    if (ghost > fraction) { ctx.fillStyle = pal.white; ctx.fillRect(x, y, w * ghost, h); }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * fraction, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y + 3, w * fraction, 3.5);
    ctx.fillStyle = 'rgba(6,10,28,0.28)'; // quarter marks
    for (let i = 1; i < 4; i++) ctx.fillRect(x + w * i / 4 - 1, y, 2, h);
    ctx.restore();
  }

  Hud.prototype.drawBars = function (ctx, p) {
    const blink = Math.sin(this.t * 14) > 0;
    const shield = p.shield / p.maxShield;
    const hull = p.hull / p.maxHull;
    const hullLow = hull < 0.35;

    // a bar that was just struck jumps, and its outline lights for a moment
    const jump = (amount) => (Math.random() * 2 - 1) * amount * amount * 4;
    ctx.save();
    ctx.translate(jump(this.shieldPop), jump(this.shieldPop));
    art.text(ctx, 'SHIELD', 114, BAR.shieldY + 10, { size: 14, baseline: 'middle', color: p.shieldBroken ? pal.pink : pal.cyanLight, lineWidth: 4 });
    drawBar(ctx, BAR.shieldY, shield, this.shieldGhost, pal.cyan, this.shieldPop > 0.5 ? pal.cyanLight : p.shieldBroken && blink ? pal.pink : pal.ink);
    if (p.shieldBroken) {
      art.text(ctx, 'OFFLINE', BAR.x + BAR.w / 2, BAR.shieldY + 10, { size: 12, baseline: 'middle', align: 'center', color: blink ? pal.pink : pal.cream, lineWidth: 3 });
    }
    ctx.restore();

    ctx.save();
    ctx.translate(jump(this.hullPop), jump(this.hullPop));
    art.text(ctx, 'HULL', 114, BAR.hullY + 10, { size: 14, baseline: 'middle', color: hullLow ? pal.pink : pal.cream, lineWidth: 4 });
    drawBar(ctx, BAR.hullY, hull, this.hullGhost, hullLow ? pal.red : pal.cream, this.hullPop > 0.5 ? pal.white : hullLow && blink ? pal.red : pal.ink);
    ctx.restore();
  };

  /* Kurai's face follows the fight: steady by default, alarmed when hurt, cheering on a win. */
  Hud.prototype.drawPortrait = function (ctx, p) {
    const world = this.world;
    const r = PORTRAIT.r;
    const low = p.hull < p.maxHull * 0.35;
    const talking = world.comms.typing() && world.comms.current.speaker === 'kurai';
    const jolt = this.hurt * this.hurt * 7;
    const mood = world.state === 'won' ? 'cheer' : (this.hurt > 0.15 || low || p.shieldBroken) ? 'alarm' : 'steady';

    ctx.save();
    ctx.translate(PORTRAIT.x + (Math.random() * 2 - 1) * jolt, PORTRAIT.y + (Math.random() * 2 - 1) * jolt);
    if (talking) {
      const bob = 1 + 0.035 * Math.sin(this.t * 22);
      ctx.scale(bob, bob);
    }

    if (!this.portraitBg) {
      this.portraitBg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
      this.portraitBg.addColorStop(0, '#a3b4ff');
      this.portraitBg.addColorStop(1, '#4f61cf');
    }
    art.circle(ctx, 0, 0, r, this.portraitBg);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    SO.cast.drawFace(ctx, 'kurai', mood, r);
    if (this.hurt > 0) {
      ctx.fillStyle = 'rgba(239,64,86,' + (this.hurt * 0.55).toFixed(3) + ')';
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    ctx.restore();
    art.circle(ctx, 0, 0, r, null, pal.ink, 6);
    art.circle(ctx, 0, 0, r - 5, null, low ? pal.red : pal.cyan, 3);
    ctx.restore();
  };

  /* Radio bubble under the portrait. Kurai's lines come from his portrait;
     anyone else's bring their own face and colour. */
  Hud.prototype.drawBubble = function (ctx) {
    const line = this.line;
    if (!line || this.bubble <= 0.01) return;
    const speaker = SO.cast[line.speaker] || SO.cast.kurai;
    const guest = line.speaker !== 'kurai';
    const size = 18;
    const lead = 23;
    const inset = guest ? 78 : 19; // room for the guest's face
    ctx.font = '700 ' + size + 'px ' + SO.FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (!line.lines) {
      line.lines = art.wrapText(ctx, line.text, guest ? 330 : 370);
      line.width = Math.max.apply(null, line.lines.map((l) => ctx.measureText(l).width));
    }

    const x = 22;
    const y = 118;
    const w = Math.max(180, line.width + inset + 19);
    const h = Math.max(guest ? 76 : 0, line.lines.length * lead + 42);
    const tailX = x + 40;
    const pop = easeOutBack(clamp(this.bubble, 0, 1));

    ctx.save();
    ctx.translate(tailX, y - 12);
    ctx.scale(pop, pop);
    ctx.translate(-tailX, -(y - 12));
    ctx.globalAlpha *= clamp(this.bubble * 2, 0, 1);

    art.roundRect(ctx, x, y, w, h, 16);
    art.paint(ctx, pal.cream, guest ? speaker.nameInk : pal.ink, 4.5);
    if (guest) {
      art.roundRect(ctx, x, y, w, h, 16);
      art.paint(ctx, null, pal.ink, 2);
      // the caller's face
      const r = 27;
      ctx.save();
      ctx.translate(x + 41, y + h / 2);
      art.circle(ctx, 0, 0, r, speaker.color);
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.clip();
      SO.cast.drawFace(ctx, line.speaker, null, r);
      ctx.restore();
      art.circle(ctx, 0, 0, r, null, pal.ink, 4);
      ctx.restore();
    } else {
      // tail pointing up at the portrait
      art.poly(ctx, [tailX - 13, y + 3, tailX, y - 14, tailX + 13, y + 3], pal.cream);
      ctx.beginPath();
      ctx.moveTo(tailX - 13, y);
      ctx.lineTo(tailX, y - 14);
      ctx.lineTo(tailX + 13, y);
      art.paint(ctx, null, pal.ink, 4.5);
      ctx.fillStyle = pal.cream;
      ctx.fillRect(tailX - 10, y - 1, 20, 5);
    }

    const textY = y + (h - (line.lines.length * lead + 42)) / 2;
    art.text(ctx, speaker.name.toUpperCase(), x + inset, textY + 24, { size: 13, color: speaker.nameInk, stroke: null });
    ctx.font = '700 ' + size + 'px ' + SO.FONT;
    ctx.fillStyle = pal.ink;
    let left = this.line === this.world.comms.current ? this.world.comms.shown() : line.text.length;
    for (let i = 0; i < line.lines.length && left > 0; i++) {
      ctx.fillText(line.lines[i].slice(0, left), x + inset, textY + 47 + i * lead);
      left -= line.lines[i].length + 1;
    }
    ctx.restore();
  };

  /* Wave pips, top centre. */
  Hud.prototype.drawWaves = function (ctx) {
    const director = this.world.director;
    const total = director.total;
    const started = director.state !== 'intro';
    const label = started ? 'WAVE ' + (director.index + 1) + ' / ' + total : this.world.mission.title.toUpperCase();
    art.text(ctx, label, W / 2, 34, { size: 16, align: 'center', color: pal.cream, lineWidth: 4 });

    const pipW = 30;
    const gap = 7;
    const x0 = W / 2 - (total * pipW + (total - 1) * gap) / 2;
    for (let i = 0; i < total; i++) {
      const done = director.done || i < director.index || (i === director.index && director.state === 'clear');
      const current = started && i === director.index && !done;
      let fill = pal.navyDeep;
      if (done) fill = pal.cyan;
      else if (current) fill = Math.sin(this.t * 6) > 0 ? pal.gold : pal.orange;
      art.roundRect(ctx, x0 + i * (pipW + gap), 46, pipW, 10, 5);
      art.paint(ctx, fill, pal.ink, 3.5);
      art.paint(ctx, fill);
    }
  };

  Hud.prototype.drawScore = function (ctx) {
    art.text(ctx, 'SCORE', W - 28, 34, { size: 14, align: 'right', color: pal.cyanLight, lineWidth: 4 });
    art.text(ctx, Math.round(this.scoreShown).toLocaleString('en-US'), W - 28, 68, { size: 32 * (1 + 0.14 * this.scorePop), align: 'right', color: this.scorePop > 0.5 ? pal.gold : pal.cream, lineWidth: 7 });
    let y = 90;
    if (!SO.settings.get('music')) { art.text(ctx, 'MUSIC OFF (M)', W - 28, y, { size: 12, align: 'right', color: pal.pink, lineWidth: 3 }); y += 16; }
    if (!SO.settings.get('sfx')) art.text(ctx, 'SOUND OFF (N)', W - 28, y, { size: 12, align: 'right', color: pal.pink, lineWidth: 3 });
  };

  /* Health bar for a boss, bottom centre. */
  Hud.prototype.drawBoss = function (ctx) {
    const enemies = this.world.enemies;
    let boss = null;
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].def.boss && !enemies[i].dead && !enemies[i].fleeing) boss = enemies[i];
    }
    if (!boss) return;
    const w = 460;
    const h = 16;
    const struck = boss.flash > 0.35;
    const x = W / 2 - w / 2 + (struck ? (Math.random() * 2 - 1) * 2 : 0); // the bar flinches with the boss
    const y = H - 44 + (struck ? (Math.random() * 2 - 1) * 2 : 0);
    // a boss in several phases reports its own figure, its name for the phase, and where the phases end
    const bar = boss.def.bar ? boss.def.bar(boss, this.world) : null;
    const k = clamp(bar ? bar.k : boss.hp / boss.maxHp, 0, 1);
    // what was just taken off shows white for a moment, as on Kurai's own bars
    if (this.bossSeen !== boss) { this.bossSeen = boss; this.bossGhost = k; }
    this.bossGhost = Math.max(k, this.bossGhost - 0.004);
    art.text(ctx, (bar ? bar.name : boss.name || boss.def.name).toUpperCase(), W / 2, y - 9, { size: 15, align: 'center', color: pal.gold, stroke: pal.enemyInk, lineWidth: 4 });
    art.roundRect(ctx, x, y, w, h, h / 2);
    art.paint(ctx, pal.enemyInk, pal.enemyInk, 5);
    if (k > 0) {
      ctx.save();
      art.roundRect(ctx, x, y, w, h, h / 2);
      ctx.clip();
      if (this.bossGhost > k) { ctx.fillStyle = pal.white; ctx.fillRect(x, y, w * this.bossGhost, h); }
      ctx.fillStyle = struck ? pal.white : (k < 0.5 ? pal.orange : pal.violet);
      ctx.fillRect(x, y, w * k, h);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x, y + 3, w * k, 3);
      ctx.restore();
    }
    if (bar && bar.marks) {
      ctx.fillStyle = pal.enemyInk;
      for (let i = 0; i < bar.marks.length; i++) ctx.fillRect(x + w * bar.marks[i] - 2, y - 3, 4, h + 6);
    }
  };

  /* A small health bar over each enemy capital ship, so the player can see the line breaking. */
  Hud.prototype.drawCapitals = function (ctx) {
    const enemies = this.world.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.def.capital || e.dead || e.fleeing || e.state === 'enter') continue;
      const w = 120;
      const x = e.x - w / 2;
      const y = e.y - 96;
      const k = clamp(e.hp / e.maxHp, 0, 1);
      art.text(ctx, (e.name || e.def.name).toUpperCase(), e.x, y - 6, { size: 12, align: 'center', color: pal.gold, stroke: pal.enemyInk, lineWidth: 3.5 });
      art.roundRect(ctx, x, y, w, 9, 4.5);
      art.paint(ctx, pal.enemyInk, pal.enemyInk, 4);
      if (k > 0) {
        art.roundRect(ctx, x, y, Math.max(9, w * k), 9, 4.5);
        art.paint(ctx, e.flash > 0.35 ? pal.white : (k < 0.4 ? pal.orange : pal.red));
      }
    }
  };

  /* Big centre-screen announcement. */
  Hud.prototype.drawBanner = function (ctx) {
    const b = this.banner;
    if (!b) return;
    const enter = clamp(b.t / 0.28, 0, 1);
    const leave = clamp((b.dur - b.t) / 0.25, 0, 1);
    ctx.font = '800 78px ' + SO.FONT;
    const fit = Math.min(1, 740 / ctx.measureText(b.title).width); // long titles shrink to fit
    const scale = (0.55 + 0.45 * easeOutBack(enter)) * fit;
    ctx.save();
    ctx.globalAlpha = Math.min(enter * 1.5, leave, 1);
    ctx.translate(W / 2, 286);
    ctx.scale(scale, scale);
    ctx.rotate(-0.035);
    art.text(ctx, b.title, 4, 5, { size: 78, align: 'center', color: pal.cyan, stroke: pal.ink, lineWidth: 16 });
    art.text(ctx, b.title, 0, 0, { size: 78, align: 'center', color: pal.cream, stroke: pal.ink, lineWidth: 16 });
    if (b.sub) {
      ctx.font = '800 26px ' + SO.FONT;
      const w = ctx.measureText(b.sub.toUpperCase()).width + 44;
      art.roundRect(ctx, -w / 2, 22, w, 42, 12);
      art.paint(ctx, pal.cyan, pal.ink, 5);
      art.text(ctx, b.sub.toUpperCase(), 0, 52, { size: 26, align: 'center', color: pal.ink, stroke: null });
    }
    ctx.restore();
    if (b.note) { // the objective, level and steady under the tilted title
      ctx.globalAlpha = Math.min(clamp(b.t / 0.4 - 1, 0, 1), leave);
      art.text(ctx, b.note, W / 2, 404, { size: 22, align: 'center', color: pal.cyanLight, lineWidth: 6 });
      ctx.globalAlpha = 1;
    }
  };

  SO.Hud = Hud;
})(window.SO);
