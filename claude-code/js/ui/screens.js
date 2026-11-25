'use strict';

/* The HTML screens over the canvas: title, pause, victory, game over.
   Markup is in index.html; a button's data-action is sent to the current scene's onAction.

   show(id, data) fills the screen from data:
     data-field="score"    text is set to data.score
     data-if="hasNext"     shown only when data.hasNext is truthy
     data-unless="hasNext" hidden when data.hasNext is truthy
   fillList(name, items) rebuilds the buttons inside data-list="name" (the title's mission list).

   A button with data-toggle="music" flips that switch (js/core/settings.js) and shows its state in
   its data-state element; data-toggle="fullscreen" is the one switch that is not a setting
   (js/core/engine.js), and is hidden where the browser has no full screen to offer.
   toast(text) shows a line for a moment: it says what a switch key just did.

   The screen that is showing is named on the page as body[data-screen], and the kind of controller
   as body.touch: css/game.css uses both to show key hints or touch hints, and the touch buttons. */
(function (SO) {
  SO.screens = {
    current: null,

    init() {
      this.root = document.getElementById('ui');
      this.toastNode = document.getElementById('toast');
      this.root.addEventListener('click', (e) => {
        const toggle = e.target.closest && e.target.closest('[data-toggle]');
        if (toggle) {
          toggle.blur();
          if (toggle.dataset.toggle === 'fullscreen') SO.engine.toggleFullscreen();
          else SO.settings.toggle(toggle.dataset.toggle);
          return;
        }
        const button = e.target.closest && e.target.closest('[data-action]');
        if (!button || button.disabled) return;
        button.blur();
        const scene = SO.engine.scene;
        if (scene && scene.onAction) scene.onAction(button.dataset.action);
      });
      // a tick as the pointer reaches a button
      this.root.addEventListener('pointerover', (e) => {
        const button = e.target.closest && e.target.closest('button');
        if (button && !button.disabled && button !== this.hovered && e.pointerType === 'mouse') SO.audio.play('hover');
        this.hovered = button;
      });
      SO.settings.onChange((name, value) => {
        this.refreshSwitches();
        this.toast(SO.settings.NAMES[name] + (value ? ' on' : ' off'));
        SO.audio.play('toggle', { on: value });
      });
      document.addEventListener('fullscreenchange', () => this.refreshSwitches());
      this.refreshSwitches();
    },

    refreshSwitches() {
      this.root.querySelectorAll('[data-toggle]').forEach((button) => {
        const full = button.dataset.toggle === 'fullscreen';
        if (full && !SO.engine.canFullscreen()) button.hidden = true;
        const value = full ? SO.engine.isFullscreen() : SO.settings.get(button.dataset.toggle);
        button.setAttribute('aria-pressed', value ? 'true' : 'false');
        const state = button.querySelector('[data-state]');
        if (state) state.textContent = value ? 'on' : 'off';
      });
    },

    toast(text) {
      const node = this.toastNode;
      const screen = this.current && document.getElementById('screen-' + this.current);
      // a screen that has the switches on it (title, pause) already shows what changed
      if (!node || (screen && screen.querySelector('[data-toggle]'))) return;
      node.textContent = text;
      node.hidden = false;
      node.classList.remove('show');
      void node.offsetWidth; // start the animation again from the top
      node.classList.add('show');
    },

    show(id, data) {
      this.hide();
      const screen = document.getElementById('screen-' + id);
      if (!screen) return;
      data = data || {};
      screen.querySelectorAll('[data-field]').forEach((node) => {
        const value = data[node.dataset.field];
        node.textContent = value === undefined ? '' : value;
      });
      screen.querySelectorAll('[data-if]').forEach((node) => { node.hidden = !data[node.dataset.if]; });
      screen.querySelectorAll('[data-unless]').forEach((node) => { node.hidden = !!data[node.dataset.unless]; });
      this.refreshSwitches(); // (the full screen switch stays hidden where there is no full screen)
      screen.hidden = false;
      this.current = id;
      document.body.dataset.screen = id;
    },

    /* items: [{ action, tag, text, note, disabled }] */
    fillList(name, items) {
      const list = this.root.querySelector('[data-list="' + name + '"]');
      if (!list) return;
      list.textContent = '';
      items.forEach((item) => {
        const button = document.createElement('button');
        button.className = 'chip';
        button.dataset.action = item.action;
        button.disabled = !!item.disabled;
        [['chip-tag', item.tag], ['chip-text', item.text], ['chip-note', item.note]].forEach((part) => {
          if (!part[1]) return;
          const span = document.createElement('span');
          span.className = part[0];
          span.textContent = part[1];
          button.appendChild(span);
        });
        list.appendChild(button);
      });
    },

    hide() {
      this.root.querySelectorAll('.screen').forEach((screen) => { screen.hidden = true; });
      this.current = null;
      delete document.body.dataset.screen;
      const focused = document.activeElement;
      if (focused && focused.tagName === 'BUTTON') focused.blur();
    },
  };
})(window.SO);
