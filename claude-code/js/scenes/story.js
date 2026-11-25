'use strict';

/* Story scene: plays one dialogue scene from js/story, then calls onDone.
   The scene's music (its `music`, or the quiet 'bridge') plays under it; a { music } beat changes it.
   Kurai stands on the left, Akari on the right, and anyone else calls in on the comm screen between
   them (or, once a scene brings them aboard, stands there in person).
   Enter, Space, a click or a tap goes on; Esc skips the scene (on a touch screen, the Skip button). */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const { clamp, easeOutCubic, easeOutBack, approach, TAU } = SO.util;
  const W = SO.W;
  const H = SO.H;

  const BAR = 46;                                   // letterbox bars
  const BOX = { x: 170, y: 512, w: 940, h: 160 };   // dialogue box
  const CREW = { size: 660, footY: 700, left: 232, right: 1048, guest: W / 2 }; // where the bridge crew stand
  const CALL = { x: W / 2, y: 92, w: 300, h: 318 }; // the comm screen
  const SWAP_TIME = 1.2;                            // seconds a change of place takes
  const TALK_SPEED = 48;                            // characters per second
  const CARD_SPEED = 40;
  const PLACE_TIME = 3.2;                           // a location title moves on by itself

  /* How a song is played under a scene: a battle song's quiet layer, written to sit under a fight,
     is lifted to the level of the story's own music (the song says by how much: `alone`). */
  function under(id, level) {
    return { level: level || 0, lift: level ? 0 : SO.music.alone(id) };
  }

  function StoryScene(sceneId, onDone) {
    this.scene = SO.story.get(sceneId);
    this.onDone = onDone;
  }

  StoryScene.prototype.enter = function () {
    SO.screens.hide();
    this.time = 0;
    this.index = -1;
    this.beat = null;
    this.t = 0;           // seconds into the current beat
    this.shown = 0;       // characters of the current text on screen
    this.place = null;    // last location title, kept in the top bar
    this.fadeOut = -1;    // 0..1 once the scene is closing
    this.done = false;
    this.backdrop = this.scene ? this.scene.backdrop : null;
    this.tint = this.scene ? this.scene.tint : null;
    this.was = null;      // the place being faded out of
    this.swap = 1;        // 0..1 through a change of place
    this.actors = {};
    Object.keys(SO.cast).forEach((who) => {
      if (typeof SO.cast[who] !== 'object') return;
      this.actors[who] = { on: 0, here: false, aboard: !!SO.cast[who].bridge, mood: SO.cast[who].mood, lift: 0, pop: 0 };
    });
    SO.audio.muffle(0);
    if (this.scene) {
      SO.music.play(this.scene.music || 'bridge', under(this.scene.music || 'bridge', 0));
      this.next();
    } else {
      this.fadeOut = 1;
    }
  };

  StoryScene.prototype.kind = 'story';

  StoryScene.prototype.exit = function () {};

  /* The Skip button, on a touch screen (index.html). */
  StoryScene.prototype.onAction = function (action) {
    if (action === 'skip' && this.fadeOut < 0) { SO.audio.play('ui'); this.close(); }
  };

  StoryScene.prototype.text = function () {
    const b = this.beat;
    return b ? (b.text || b.card || '') : '';
  };

  StoryScene.prototype.next = function () {
    const beats = this.scene.beats;
    this.index++;
    if (this.index >= beats.length) { this.close(); return; }
    const b = this.beat = beats[this.index];
    this.t = 0;
    this.shown = 0;
    this.lines = null;

    if (b.leave) {
      if (this.actors[b.leave]) this.actors[b.leave].here = false;
      this.next();
      return;
    }
    if (b.music) { // the mood turns: another song, or more or less of this one
      SO.music.play(b.music, Object.assign({ fade: 1.5 }, under(b.music, b.level)));
      this.next();
      return;
    }
    if (b.aboard) { // off the comm screen and onto the bridge
      const guest = this.actors[b.aboard];
      if (guest) { guest.aboard = true; guest.here = true; guest.on = 0; }
      this.next();
      return;
    }
    if (b.backdrop) {
      this.was = { backdrop: this.backdrop, tint: this.tint };
      this.backdrop = b.backdrop;
      this.tint = b.tint || this.tint;
      this.swap = 0;
      this.next();
      return;
    }
    if (b.place) this.place = b;
    if (b.place || b.end) SO.audio.play('banner');
    if (b.cast) { // the closing picture: everyone named, lit, in the mood given
      Object.keys(b.cast).forEach((who) => {
        const actor = this.actors[who];
        if (!actor) return;
        actor.here = true;
        actor.mood = b.cast[who];
        actor.pop = 1;
      });
    }
    if (b.who) {
      const actor = this.actors[b.who];
      if (actor.aboard) {
        // the bridge crew arrive together, whoever speaks first
        Object.keys(this.actors).forEach((who) => { if (SO.cast[who].bridge) this.actors[who].here = true; });
      } else {
        if (!actor.here) SO.audio.play('hail');
        // one comm screen: a new caller takes it over
        Object.keys(this.actors).forEach((who) => { if (!this.actors[who].aboard && who !== b.who) this.actors[who].here = false; });
      }
      actor.here = true;
      const mood = b.mood || SO.cast[b.who].mood;
      if (mood !== actor.mood) { actor.pop = 1; SO.audio.play('pop'); }
      actor.mood = mood;
    }
  };

  StoryScene.prototype.close = function () {
    if (this.fadeOut < 0) this.fadeOut = 0;
  };

  StoryScene.prototype.update = function (dt) {
    this.time += dt;
    if (this.fadeOut >= 0) {
      this.fadeOut += dt / 0.4;
      if (this.fadeOut >= 1 && !this.done) {
        this.done = true;
        this.onDone();
      }
      return;
    }

    if (SO.input.pressed('pause')) { SO.audio.play('ui'); this.close(); return; }

    const b = this.beat;
    this.t += dt;
    const text = this.text();
    const speed = b.card ? CARD_SPEED : TALK_SPEED;
    const before = this.shown;
    this.shown = Math.min(text.length, Math.floor(this.t * speed));
    const typing = this.shown < text.length;
    if (b.who && this.shown > before && typing) SO.audio.play('talk', { pitch: SO.cast[b.who].voice });
    else if (b.card && this.shown > before && typing) SO.audio.play('type');

    if (SO.input.advance()) {
      if (typing) {
        this.t = text.length / speed + 0.01; // first press finishes the line
      } else if (this.t > 0.25) {
        SO.audio.play('page');
        this.next();
      }
    } else if (b.place && this.t > PLACE_TIME) {
      this.next();
    }

    this.swap = Math.min(1, this.swap + dt / SWAP_TIME);

    // the cast eases toward where the current beat wants it
    const speaking = this.beat && this.beat.who;
    Object.keys(this.actors).forEach((who) => {
      const a = this.actors[who];
      a.on = approach(a.on, a.here ? 1 : 0, dt * 2.6);
      a.lift = approach(a.lift, who === speaking || (this.beat.cast && this.beat.cast[who]) ? 1 : 0, dt * 6);
      a.pop = Math.max(0, a.pop - dt * 4);
    });
  };

  /* ---------- drawing ---------- */

  StoryScene.prototype.draw = function (ctx) {
    const scene = this.scene;
    const b = this.beat;
    ctx.fillStyle = pal.ink;
    ctx.fillRect(0, 0, W, H);
    if (!scene || !b) return;

    // the place, drifting slowly (and, during a change of place, the one before it underneath)
    const panX = 0.5 + 0.32 * Math.sin(this.time * 0.06);
    const panY = 0.5 + 0.3 * Math.cos(this.time * 0.045);
    const before = this.swap < 1 && this.was ? SO.assets.images[this.was.backdrop] : null;
    const img = SO.assets.images[this.backdrop];
    if (before) art.cover(ctx, before, 1.1, panX, panY);
    if (img) {
      ctx.globalAlpha = before ? this.swap : 1;
      art.cover(ctx, img, 1.1, panX, panY);
      ctx.globalAlpha = 1;
    }
    if (!this.shade) {
      this.shade = ctx.createLinearGradient(0, 0, 0, H);
      this.shade.addColorStop(0, 'rgba(6,10,28,0.2)');
      this.shade.addColorStop(0.5, 'rgba(6,10,28,0.1)');
      this.shade.addColorStop(1, 'rgba(6,10,28,0.85)');
    }
    ctx.fillStyle = this.shade;
    ctx.fillRect(0, 0, W, H);
    const quiet = b.cast ? 0.15 : b.card || b.end ? 0.55 : b.place ? 0.2 : 0.3; // narration darkens the picture more
    this.veil = approach(this.veil === undefined ? quiet : this.veil, quiet, 0.02);
    ctx.globalAlpha = this.veil;
    ctx.fillStyle = this.tint || pal.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // callers on the comm screen, then whoever is aboard: right, guest, left
    const cast = Object.keys(this.actors);
    cast.forEach((who) => { if (!this.actors[who].aboard) this.drawCall(ctx, who); });
    cast.forEach((who) => { if (SO.cast[who].bridge === 'right') this.drawCrew(ctx, who, CREW.right, 1); });
    cast.forEach((who) => { if (this.actors[who].aboard && !SO.cast[who].bridge) this.drawCrew(ctx, who, CREW.guest, 0); });
    cast.forEach((who) => { if (SO.cast[who].bridge === 'left') this.drawCrew(ctx, who, CREW.left, -1); });

    if (b.who) this.drawBox(ctx, b);
    else if (b.card) this.drawCard(ctx, b);
    else if (b.place) this.drawTitle(ctx, b.place, b.sub, clamp(this.t / 0.35, 0, 1), clamp((PLACE_TIME - this.t) / 0.3, 0, 1));
    else if (b.end) this.drawTitle(ctx, b.end, b.sub, clamp(this.t / 0.35, 0, 1), 1, b.cast ? 578 : 330);

    this.drawBars(ctx);

    const fade = Math.max(1 - this.time / 0.5, this.fadeOut);
    if (fade > 0) {
      ctx.globalAlpha = clamp(fade, 0, 1);
      ctx.fillStyle = pal.ink;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  };

  /* Someone standing on the bridge. side: -1 comes in from the left, 1 from the right, 0 up from below. */
  StoryScene.prototype.drawCrew = function (ctx, who, x, side) {
    const a = this.actors[who];
    if (a.on <= 0.01) return;
    const img = SO.cast.image(who, a.mood);
    if (!img) return;
    const c = SO.cast[who];
    const typing = this.beat.who === who && this.shown < this.text().length;
    const size = CREW.size * (0.95 + 0.05 * a.lift + 0.05 * a.pop);
    const slide = (1 - easeOutCubic(a.on)) * 360 * side;
    const bob = typing ? Math.sin(this.time * 17) * 3 : 0;
    const left = x + slide - size / 2;
    const top = CREW.footY - c.foot * size + bob + (1 - a.lift) * 12 + (side ? 0 : (1 - easeOutCubic(a.on)) * 240);

    ctx.globalAlpha = clamp(a.on * 1.5, 0, 1);
    ctx.drawImage(img, left, top, size, size);
    if (a.lift < 0.99) { // standing back: washed toward the dark
      ctx.globalAlpha *= (1 - a.lift);
      ctx.drawImage(art.tinted(img, this.tint || pal.ink, 0.55), left, top, size, size);
    }
    ctx.globalAlpha = 1;
  };

  /* A caller, on the comm screen. */
  StoryScene.prototype.drawCall = function (ctx, who) {
    const a = this.actors[who];
    if (a.on <= 0.01) return;
    const c = SO.cast[who];
    const img = SO.cast.image(who, a.mood);
    const pop = a.here ? easeOutBack(a.on) : a.on;
    const w = CALL.w;
    const h = CALL.h;

    ctx.save();
    ctx.translate(CALL.x, CALL.y + h / 2);
    ctx.scale(pop, pop * (a.here ? 1 : a.on)); // closes like a screen switching off
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = clamp(a.on * 2, 0, 1);

    // frame
    art.roundRect(ctx, 8, 9, w, h, 22);
    art.paint(ctx, c.color);
    art.roundRect(ctx, 0, 0, w, h, 22);
    if (!this.callBg) this.callBg = {};
    if (!this.callBg[who]) {
      const colors = c.callBg || ['#5a1430', '#1d0714'];
      this.callBg[who] = ctx.createLinearGradient(0, 0, 0, h);
      this.callBg[who].addColorStop(0, colors[0]);
      this.callBg[who].addColorStop(1, colors[1]);
    }
    art.paint(ctx, this.callBg[who], pal.ink, 6);

    // the caller
    ctx.save();
    art.roundRect(ctx, 3, 3, w - 6, h - 6, 19);
    ctx.clip();
    if (img) {
      const size = 470 * (1 + 0.04 * a.pop);
      const typing = this.beat.who === who && this.shown < this.text().length;
      ctx.drawImage(img, w / 2 - size / 2, 6 + (typing ? Math.sin(this.time * 15) * 2.5 : 0), size, size);
    }
    // scan lines and a slow roll, so it reads as a transmission
    ctx.fillStyle = 'rgba(6,10,28,0.16)';
    for (let y = (this.time * 14) % 7; y < h; y += 7) ctx.fillRect(0, y, w, 2.5);
    ctx.fillStyle = 'rgba(255,211,92,0.07)';
    ctx.fillRect(0, (this.time * 90) % (h + 80) - 80, w, 80);
    if (a.lift < 0.99) {
      ctx.fillStyle = 'rgba(26,6,18,' + (0.5 * (1 - a.lift)).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
    art.roundRect(ctx, 0, 0, w, h, 22);
    art.paint(ctx, null, pal.ink, 6);

    // caption
    ctx.font = '800 15px ' + SO.FONT;
    const label = (c.call || c.name + ' on call').toUpperCase();
    const lw = ctx.measureText(label).width + 50;
    art.roundRect(ctx, w / 2 - lw / 2, h - 20, lw, 34, 17);
    art.paint(ctx, pal.ink, c.color, 3);
    if (Math.sin(this.time * 6) > -0.3) art.circle(ctx, w / 2 - lw / 2 + 19, h - 3, 5, c.color);
    art.text(ctx, label, w / 2 + 9, h + 3, { size: 15, align: 'center', color: pal.cream, stroke: null });
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  StoryScene.prototype.drawBox = function (ctx, b) {
    const c = SO.cast[b.who];
    const { x, y, w, h } = BOX;
    const rise = (1 - easeOutCubic(clamp(this.t / 0.18, 0, 1))) * 10;

    ctx.save();
    ctx.translate(0, rise);
    art.roundRect(ctx, x + 8, y + 9, w, h, 24);
    art.paint(ctx, c.color);
    art.roundRect(ctx, x, y, w, h, 24);
    art.paint(ctx, pal.cream, pal.ink, 5);

    // name tag, on the speaker's side of the box
    ctx.font = '800 21px ' + SO.FONT;
    const name = c.name.toUpperCase();
    const tagW = ctx.measureText(name).width + 44;
    const tagX = c.bridge === 'left' ? x + 30 : c.bridge === 'right' ? x + w - 30 - tagW : x + w / 2 - tagW / 2;
    art.roundRect(ctx, tagX, y - 22, tagW, 42, 21);
    art.paint(ctx, c.color, pal.ink, 5);
    art.text(ctx, name, tagX + tagW / 2, y + 7, { size: 21, align: 'center', color: pal.ink, stroke: null });
    // role, in small print beside the tag
    const roleAlign = c.bridge === 'right' ? 'right' : 'left';
    const roleX = c.bridge === 'right' ? tagX - 14 : tagX + tagW + 14;
    art.text(ctx, c.role, roleX, y + 27, { size: 14, weight: 700, align: roleAlign, color: c.nameInk, stroke: null });

    // the line
    ctx.font = '700 27px ' + SO.FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (!this.lines) this.lines = art.wrapText(ctx, b.text, w - 88);
    ctx.fillStyle = pal.ink;
    let left = this.shown;
    const lead = this.lines.length > 2 ? 35 : 38;
    for (let i = 0; i < this.lines.length && left > 0; i++) {
      ctx.fillText(this.lines[i].slice(0, left), x + 44, y + 70 + i * lead);
      left -= this.lines[i].length + 1;
    }

    if (this.shown >= b.text.length) this.drawPrompt(ctx, x + w - 40, y + h - 26, pal.ink);
    ctx.restore();
  };

  /* A small bouncing arrow: "press to go on". */
  StoryScene.prototype.drawPrompt = function (ctx, x, y, color) {
    const dy = Math.abs(Math.sin(this.time * 4.5)) * 6;
    art.poly(ctx, [x - 10, y - 8 + dy, x + 10, y - 8 + dy, x, y + 6 + dy], color);
  };

  StoryScene.prototype.drawCard = function (ctx, b) {
    ctx.font = '800 34px ' + SO.FONT;
    if (!this.lines) this.lines = art.wrapText(ctx, b.card, 900);
    const lead = 50;
    const y0 = H / 2 - (this.lines.length - 1) * lead / 2;
    let left = this.shown;
    for (let i = 0; i < this.lines.length && left > 0; i++) {
      // each line is centred as a whole, so the text does not slide while it types
      const full = ctx.measureText(this.lines[i]).width;
      art.text(ctx, this.lines[i].slice(0, left), W / 2 - full / 2, y0 + i * lead, { size: 34, baseline: 'middle', lineWidth: 8 });
      left -= this.lines[i].length + 1;
    }
    if (this.shown >= b.card.length) this.drawPrompt(ctx, W / 2, y0 + this.lines.length * lead + 6, pal.cyan);
  };

  /* Location and closing titles, in the style of the mission banners. */
  StoryScene.prototype.drawTitle = function (ctx, title, sub, enter, leave, y) {
    y = y || 330;
    title = title.toUpperCase();
    ctx.font = '800 92px ' + SO.FONT;
    const fit = Math.min(1, 980 / ctx.measureText(title).width);
    const scale = (0.6 + 0.4 * easeOutBack(enter)) * fit;
    ctx.save();
    ctx.globalAlpha = Math.min(enter * 1.5, leave, 1);
    ctx.translate(W / 2, y);
    ctx.scale(scale, scale);
    ctx.rotate(-0.03);
    art.text(ctx, title, 5, 6, { size: 92, align: 'center', color: pal.cyan, stroke: pal.ink, lineWidth: 18 });
    art.text(ctx, title, 0, 0, { size: 92, align: 'center', color: pal.cream, stroke: pal.ink, lineWidth: 18 });
    ctx.restore();
    if (sub) {
      ctx.save();
      ctx.globalAlpha = Math.min(clamp(this.t / 0.5 - 0.4, 0, 1), leave);
      ctx.font = '800 22px ' + SO.FONT;
      const text = sub.toUpperCase();
      const w = ctx.measureText(text).width + 48;
      art.roundRect(ctx, W / 2 - w / 2, y + 42, w, 42, 12);
      art.paint(ctx, pal.cyan, pal.ink, 5);
      art.text(ctx, text, W / 2, y + 71, { size: 22, align: 'center', color: pal.ink, stroke: null });
      ctx.restore();
    }
  };

  StoryScene.prototype.drawBars = function (ctx) {
    ctx.fillStyle = pal.ink;
    ctx.fillRect(0, 0, W, BAR);
    ctx.fillRect(0, H - BAR, W, BAR);
    const dim = 'rgba(248,243,224,0.6)';
    if (this.place && this.beat !== this.place) {
      art.text(ctx, this.place.place.toUpperCase(), 30, 29, { size: 15, color: pal.cyan, stroke: null });
      const offset = ctx.measureText(this.place.place.toUpperCase()).width;
      if (this.place.sub) art.text(ctx, this.place.sub, 46 + offset, 29, { size: 14, weight: 700, color: dim, stroke: null });
    }
    // (on a touch screen the Skip button sits in the corner, so the hint moves in beside it)
    if (SO.input.touch) art.text(ctx, 'TAP  next', W - 150, H - 17, { size: 13, align: 'right', color: dim, stroke: null });
    else art.text(ctx, 'ENTER  next        ESC  skip', W - 30, H - 17, { size: 13, align: 'right', color: dim, stroke: null });
    const off = (SO.settings.get('music') ? '' : 'MUSIC OFF (M)   ') + (SO.settings.get('sfx') ? '' : 'SOUND OFF (N)');
    if (off) art.text(ctx, off, 30, H - 17, { size: 13, color: pal.pink, stroke: null });
  };

  SO.scenes.Story = StoryScene;
})(window.SO);
