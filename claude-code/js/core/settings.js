'use strict';

/* What the player has switched on or off. Remembered between visits (local storage).

     music   the music                    key M, and a button on the title and pause screens
     sfx     the sound effects            key N, and a button
     shake   screen shake and flashes     a button. Off does not remove them: it turns them right down.
                                          It starts off for players whose system asks for reduced motion.

   SO.settings.get('music'), .set('music', false), .toggle('music');
   SO.settings.onChange((name, value) => ...) to hear about a change. */
(function (SO) {
  const calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const wasMuted = SO.storage.get('muted', false); // earlier versions had one switch for all sound
  const DEFAULTS = { music: !wasMuted, sfx: !wasMuted, shake: !calm };

  const values = {};
  Object.keys(DEFAULTS).forEach((name) => { values[name] = !!SO.storage.get('setting.' + name, DEFAULTS[name]); });
  const listeners = [];

  SO.settings = {
    NAMES: { music: 'Music', sfx: 'Sound effects', shake: 'Screen shake' },

    get(name) { return !!values[name]; },

    set(name, value) {
      if (!(name in values) || values[name] === !!value) return;
      values[name] = !!value;
      SO.storage.set('setting.' + name, values[name]);
      listeners.forEach((fn) => fn(name, values[name]));
    },

    toggle(name) {
      this.set(name, !values[name]);
      return values[name];
    },

    onChange(fn) { listeners.push(fn); },
  };
})(window.SO);
