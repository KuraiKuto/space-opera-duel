'use strict';

(function (SO) {
  SO.util = {
    TAU: Math.PI * 2,

    clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
    lerp(a, b, t) { return a + (b - a) * t; },

    /* Move v toward target by at most step. */
    approach(v, target, step) {
      return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
    },

    rand(a, b) { return a + Math.random() * (b - a); },
    pick(list) { return list[(Math.random() * list.length) | 0]; },
    wrap(v, span) { return ((v % span) + span) % span; },

    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
    easeOutBack(t) {
      const c = 1.70158;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    },

    /* Seeded random numbers (mulberry32), so a backdrop looks the same every run. */
    rng(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    formatTime(seconds) {
      const s = Math.max(0, Math.floor(seconds));
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    },
  };

  /* localStorage that never throws (private windows, file:// quirks). */
  SO.storage = {
    get(key, fallback) {
      try {
        const v = window.localStorage.getItem('so.' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem('so.' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };
})(window.SO);
