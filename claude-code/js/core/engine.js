'use strict';

/* Canvas sizing, the frame loop, and the current scene.
   A scene is any object with update(dt) and draw(ctx); enter, exit, onAction and onBlur are optional.
   A scene's `kind` ('title', 'story', 'mission') is put on the page as body[data-scene], so the
   style sheet can show what belongs to it (the touch buttons: css/game.css). */
(function (SO) {
  const MAX_STEP = 1 / 20; // a slow frame never moves the game more than this many seconds

  SO.engine = {
    canvas: null,
    ctx: null,
    scene: null,
    scale: 1,
    last: 0,
    turned: false, // true while the stage lies on its side to fill a phone held upright
    perPixel: 1,   // game pixels per CSS pixel

    init() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      this.stage = document.getElementById('stage');
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => this.resize());
      if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
      window.addEventListener('blur', () => { if (this.scene && this.scene.onBlur) this.scene.onBlur(); });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.scene && this.scene.onBlur) this.scene.onBlur();
      });
      document.addEventListener('fullscreenchange', () => this.resize());
      SO.input.onMode((touch) => {
        document.body.classList.toggle('touch', touch);
        this.resize();
      });
      document.body.classList.toggle('touch', SO.input.touch);
      this.resize();
    },

    /* Fit a 16:9 stage in the window; keep the canvas sharp on dense screens.
       A phone held upright would show the game as a thin strip across the middle, so there the
       stage is turned a quarter turn and fills the screen: the player turns the phone, not the page. */
    resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.turned = SO.input.touch && h > w * 1.1;
      const roomW = this.turned ? h : w;
      const roomH = this.turned ? w : h;
      const fit = Math.min(roomW / SO.W, roomH / SO.H);
      const cssW = Math.max(320, Math.floor(SO.W * fit));
      const cssH = Math.round(cssW * SO.H / SO.W);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.stage.style.width = cssW + 'px';
      this.stage.style.height = cssH + 'px';
      this.stage.classList.toggle('turned', this.turned);
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.scale = this.canvas.width / SO.W;
      this.perPixel = SO.W / cssW;
      // Menus are sized in rem, so they scale with the stage.
      document.documentElement.style.fontSize = (16 * cssW / SO.W) + 'px';
    },

    /* A movement on the screen (CSS pixels) as a movement in the game (game pixels). */
    toGame(dx, dy) {
      const k = this.perPixel;
      return this.turned ? { x: dy * k, y: -dx * k } : { x: dx * k, y: dy * k };
    },

    /* Full screen on and off (the F key, and a button on the title and pause screens).
       On a phone that allows it, full screen also holds the picture in landscape. */
    canFullscreen() {
      const el = document.documentElement;
      return !!(document.fullscreenEnabled && el.requestFullscreen);
    },
    isFullscreen() { return !!document.fullscreenElement; },
    toggleFullscreen() {
      if (!this.canFullscreen()) return;
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      const lock = () => {
        const o = window.screen && window.screen.orientation;
        if (o && o.lock) o.lock('landscape').catch(() => {});
      };
      const asked = document.documentElement.requestFullscreen();
      if (asked && asked.then) asked.then(lock).catch(() => {});
    },

    setScene(scene) {
      if (this.scene && this.scene.exit) this.scene.exit();
      this.scene = scene;
      document.body.dataset.scene = scene.kind || '';
      if (scene.enter) scene.enter();
    },

    start() {
      this.last = performance.now();
      const frame = (now) => {
        const dt = Math.min(MAX_STEP, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        const ctx = this.ctx;
        // these work everywhere (the buttons for them are on the title and pause screens)
        if (SO.input.pressed('music')) SO.settings.toggle('music');
        if (SO.input.pressed('sfx')) SO.settings.toggle('sfx');
        if (SO.input.pressed('fullscreen')) this.toggleFullscreen();
        if (this.scene) {
          this.scene.update(dt);
          ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          this.scene.draw(ctx);
        }
        SO.input.endFrame();
        window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
    },
  };
})(window.SO);
