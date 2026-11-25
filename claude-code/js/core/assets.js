'use strict';

/* Image files. Characters, places and the big ships are pictures (prompts in assets/README.md);
   fighters, shots, effects and the HUD are drawn in code (js/art).
   The game still runs if a picture is missing: every user of an image has a fallback. */
(function (SO) {
  const MANIFEST = {
    // the cast: one picture per mood (js/story/cast.js says which is which)
    kurai: 'assets/kurai.png',
    kuraiSteady: 'assets/kurai-steady.png',
    kuraiAlarm: 'assets/kurai-alarm.png',
    akari: 'assets/akari.png',
    akariAlarm: 'assets/akari-alarm.png',
    akariSmile: 'assets/akari-smile.png',
    guren: 'assets/guren.png',
    gurenAngry: 'assets/guren-angry.png',
    gurenGrin: 'assets/guren-grin.png',
    kagari: 'assets/kagari.png',
    kagariRage: 'assets/kagari-rage.png',

    // places: behind the story scenes and far behind the missions
    hollowMoon: 'assets/bg-hollow-moon.jpg',
    shiver: 'assets/bg-shiver.jpg',
    meridianDark: 'assets/bg-meridian-dark.jpg',
    meridianLit: 'assets/bg-meridian-lit.jpg',
    eclipseSky: 'assets/bg-eclipse.jpg',
    reachLit: 'assets/bg-reach-lit.jpg',

    // ships too detailed to draw in code (js/art/ships.js wraps them as sprites)
    redfang: 'assets/ship-redfang.png',
    tinderbox: 'assets/ship-tinderbox.png',
    brander: 'assets/ship-brander.png',
    snuffer: 'assets/snuffer.png',
    vigil: 'assets/ship-vigil.png',
    marigold: 'assets/ship-marigold.png',
    cinder: 'assets/ship-cinder.png',
  };

  SO.assets = {
    images: {},

    /* progress(loaded, total) is called as each picture arrives (or fails to). */
    load(done, progress) {
      const names = Object.keys(MANIFEST);
      let left = names.length;
      const finish = () => {
        left--;
        if (progress) progress(names.length - left, names.length);
        if (left === 0) done();
      };
      names.forEach((name) => {
        const img = new Image();
        img.onload = () => { this.images[name] = img; finish(); };
        img.onerror = finish;
        img.src = MANIFEST[name];
      });
    },
  };
})(window.SO);
