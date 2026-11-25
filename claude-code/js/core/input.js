'use strict';

/* Input as named actions, from a keyboard or from a touch screen.

   Keyboard: bindings use physical key positions (event.code), so WASD sits in the same place on
   every keyboard layout. The 'music', 'sfx' and 'fullscreen' keys work in every scene:
   js/core/engine.js handles them.

   Touch: a finger on the game view steers by dragging (the ship moves as far as the finger does,
   from wherever the finger came down) and the blasters fire for as long as it stays down.
   drag() gives the finger's movement, held('fire') is true while it is down. The buttons a touch
   screen needs in place of keys (pause, skip) are HTML, in index.html.

   A click or tap on the game view itself (not on a menu) is the action 'tap'.
   SO.input.touch is true while the player is using a touch screen: the last thing used decides,
   and before anything is used, the kind of device does. The page shows keys or touch hints to match
   (body.touch, css/game.css). */
(function (SO) {
  const BINDINGS = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    fire: ['Space', 'KeyJ', 'KeyZ'],
    confirm: ['Enter', 'NumpadEnter'],
    pause: ['Escape', 'KeyP'],
    music: ['KeyM'],
    sfx: ['KeyN'],
    fullscreen: ['KeyF'],
  };

  const actionOf = {};
  Object.keys(BINDINGS).forEach((action) => BINDINGS[action].forEach((code) => { actionOf[code] = action; }));

  const heldCodes = new Set();
  const pressedActions = new Set();
  let anything = false; // any key or click at all, this frame
  const MODIFIERS = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'];

  // touch
  const fingers = new Map();  // every finger on the game view: pointerId -> { x, y } (where it was last)
  let steerId = null;         // the finger that steers: the first one down
  let moved = { x: 0, y: 0 }; // how far it has moved since the last frame, in game pixels
  let touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const listeners = [];

  function setTouch(value) {
    if (touch === value) return;
    touch = value;
    listeners.forEach((fn) => fn(touch));
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!e.repeat && MODIFIERS.indexOf(e.key) < 0) { anything = true; setTouch(false); }
    const action = actionOf[e.code];
    if (!action) return;
    // A focused button handles its own Enter and Space; do not also treat them as game input.
    const onButton = e.target && e.target.tagName === 'BUTTON';
    if (onButton && (action === 'confirm' || action === 'fire')) return;
    e.preventDefault();
    if (e.repeat) return;
    heldCodes.add(e.code);
    pressedActions.add(action);
  }

  function onKeyUp(e) { heldCodes.delete(e.code); }

  function release(e) {
    fingers.delete(e.pointerId);
    if (e.pointerId === steerId) steerId = fingers.size ? fingers.keys().next().value : null;
  }

  function releaseAll() {
    heldCodes.clear();
    fingers.clear();
    steerId = null;
  }

  SO.input = {
    BINDINGS,

    init() {
      const view = document.getElementById('game');
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', releaseAll);
      window.addEventListener('pointerdown', (e) => {
        anything = true;
        if (e.pointerType === 'touch') setTouch(true);
      });
      view.addEventListener('pointerdown', (e) => {
        pressedActions.add('tap');
        if (e.pointerType === 'mouse') return;
        fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (steerId === null) steerId = e.pointerId;
        if (view.setPointerCapture) { try { view.setPointerCapture(e.pointerId); } catch (err) { /* gone already */ } }
        e.preventDefault();
      });
      view.addEventListener('pointermove', (e) => {
        const finger = fingers.get(e.pointerId);
        if (!finger) return;
        if (e.pointerId === steerId) {
          const d = SO.engine.toGame(e.clientX - finger.x, e.clientY - finger.y);
          moved.x += d.x;
          moved.y += d.y;
        }
        finger.x = e.clientX;
        finger.y = e.clientY;
      });
      view.addEventListener('pointerup', release);
      view.addEventListener('pointercancel', release);
      // no menu on a long press, no page zoom on a double tap
      view.addEventListener('contextmenu', (e) => e.preventDefault());
      document.addEventListener('dblclick', (e) => e.preventDefault());
    },

    /* True while any key bound to the action is down (for 'fire': or a finger is on the game view). */
    held(action) {
      if (action === 'fire' && fingers.size) return true;
      const codes = BINDINGS[action];
      for (let i = 0; i < codes.length; i++) if (heldCodes.has(codes[i])) return true;
      return false;
    },

    /* True only on the frame the action's key went down. */
    pressed(action) { return pressedActions.has(action); },

    /* True on the frame any key at all went down, or anything was clicked ("press any key"). */
    any() { return anything; },

    /* Enter, Space or a click: "go on" in the story scenes. */
    advance() { return this.pressed('confirm') || this.pressed('fire') || this.pressed('tap'); },

    /* Movement direction from the keys, length 0 or 1. */
    axis() {
      let x = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
      let y = (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0);
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },

    /* While a finger is steering: how far it has moved since the last frame, in game pixels.
       null when no finger is down (the keys steer). */
    drag() { return steerId === null ? null : moved; },

    /* True while the player is on a touch screen. onMode(fn) hears about a change. */
    get touch() { return touch; },
    onMode(fn) { listeners.push(fn); },

    endFrame() {
      pressedActions.clear();
      anything = false;
      moved = { x: 0, y: 0 };
    },
  };
})(window.SO);
