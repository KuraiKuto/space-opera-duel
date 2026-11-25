'use strict';

/* Ship sprites, drawn around the origin. Kurai's ship faces right; enemy ships face left.
   Each takes (ctx, look): look.flash paints the ship white for a hit flash,
   look.charge (0..1) lights up weapons that are about to fire, look.open (0..1) parts a Warden's armour.
   Fighters are drawn in code; the big ships at the end of the file are pictures from assets/.
   The Eclipse and its parts are in js/art/eclipse.js. */
(function (SO) {
  const art = SO.art;
  const pal = SO.pal;
  const ships = art.ships = {};

  /* Kurai's ship, the Foxfire: a fox-eared fighter in his colours. */
  ships.player = function (ctx, look) {
    const flash = look && look.flash;
    const navy = flash ? pal.white : pal.navy;
    const cyan = flash ? pal.white : pal.cyan;
    const cream = flash ? pal.white : pal.cream;
    const ink = pal.ink;

    // wings, shaped and coloured like his ears
    art.mirror(ctx, () => {
      art.poly(ctx, [14, -9, -21, -40, -32, -11], navy, ink, 4);
      art.poly(ctx, [2, -14, -19, -31, -25, -15], cyan);
      // blaster on the wing root
      art.roundRect(ctx, 8, -15, 20, 6, 3);
      art.paint(ctx, flash ? pal.white : pal.navyLight, ink, 3);
    });

    // engine nozzle
    art.roundRect(ctx, -44, -7, 14, 14, 3);
    art.paint(ctx, flash ? pal.white : pal.navyDeep, ink, 3.5);

    // fuselage
    const hull = new Path2D();
    hull.moveTo(46, 0);
    hull.quadraticCurveTo(20, -17, -10, -15);
    hull.lineTo(-32, -10);
    hull.quadraticCurveTo(-38, 0, -32, 10);
    hull.lineTo(-10, 15);
    hull.quadraticCurveTo(20, 17, 46, 0);
    hull.closePath();
    ctx.fillStyle = navy;
    ctx.fill(hull);

    // cream muzzle on the nose
    ctx.beginPath();
    ctx.moveTo(46, 0);
    ctx.quadraticCurveTo(36.9, -5.95, 27.3, -9.6);
    ctx.quadraticCurveTo(19, 0, 27.3, 9.6);
    ctx.quadraticCurveTo(36.9, 5.95, 46, 0);
    ctx.closePath();
    art.paint(ctx, cream);

    // white tail tip
    art.poly(ctx, [-34.5, -6, -27, -9, -24, 0, -27, 9, -34.5, 6], cream);

    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.stroke(hull);

    // brow marks
    art.mirror(ctx, () => art.ellipse(ctx, -12, -8, 6, 2.2, cyan, null, 0, -0.12));

    // canopy
    art.ellipse(ctx, 8, 0, 11.5, 6.8, cyan, ink, 3);
    art.ellipse(ctx, 11.5, -2.2, 4.5, 1.7, flash ? pal.white : pal.cyanLight);

    // nose
    art.circle(ctx, 43.5, 0, 2.8, ink);
  };

  function enemyColors(look, body, dark) {
    const flash = look && look.flash;
    return {
      body: flash ? pal.white : body,
      dark: flash ? pal.white : dark,
      lamp: flash ? pal.white : pal.gold,
      ink: pal.enemyInk,
    };
  }

  /* Dart: small scout. */
  ships.dart = function (ctx, look) {
    const c = enemyColors(look, pal.red, pal.redDark);
    art.poly(ctx, [-25, 0, -3, -8, 12, -22, 11, -7, 21, 0, 11, 7, 12, 22, -3, 8], c.body, c.ink, 3.5);
    art.poly(ctx, [2, -4, 13, 0, 2, 4, -2, 0], c.dark);
    art.ellipse(ctx, -8, 0, 5.5, 3.2, c.lamp, c.ink, 2);
  };

  /* Lancer: twin-cannon gunship. */
  ships.lancer = function (ctx, look) {
    const c = enemyColors(look, pal.red, pal.redDark);
    const charge = (look && look.charge) || 0;
    art.mirror(ctx, () => {
      art.poly(ctx, [-38, -26, -38, -18, 6, -14, 22, -27, 4, -31], c.dark, c.ink, 3.5);
      art.circle(ctx, -37, -22, 3 + charge * 2.5, charge > 0 ? pal.gold : c.ink);
    });
    art.poly(ctx, [-24, 0, -9, -14, 22, -14, 33, 0, 22, 14, -9, 14], c.body, c.ink, 3.5);
    art.poly(ctx, [2, -7, 17, -7, 23, 0, 17, 7, 2, 7], c.dark);
    art.ellipse(ctx, -10, 0, 6.5, 4.2, c.lamp, c.ink, 2);
  };

  /* Striker: ramming interceptor. */
  ships.striker = function (ctx, look) {
    const c = enemyColors(look, pal.orange, '#c9541c');
    const charge = (look && look.charge) || 0;
    art.poly(ctx, [-38, 0, -8, -8, 6, -8, 12, -18, 27, -20, 20, -6, 29, 0, 20, 6, 27, 20, 12, 18, 6, 8, -8, 8],
      c.body, c.ink, 3.5);
    art.poly(ctx, [-33, 0, -9, -3.5, -9, 3.5], charge > 0.5 ? pal.white : pal.cream);
    art.poly(ctx, [8, -4, 20, 0, 8, 4], c.dark);
    art.ellipse(ctx, -1, 0, 5, 3, look && look.flash ? pal.white : pal.red, c.ink, 2);
  };

  /* Ace: the squadron leader. */
  ships.ace = function (ctx, look) {
    const c = enemyColors(look, pal.violet, pal.violetDark);
    const charge = (look && look.charge) || 0;
    art.mirror(ctx, () => {
      art.poly(ctx, [-4, -16, 14, -52, 46, -58, 30, -18], c.body, c.ink, 4);
      art.poly(ctx, [16, -44, 38, -50, 29, -27], c.lamp);
      art.poly(ctx, [-18, -14, -54, -36, -8, -28], c.dark, c.ink, 4);
    });
    art.poly(ctx, [-58, 0, -22, -18, 22, -22, 47, -11, 56, 0, 47, 11, 22, 22, -22, 18], c.body, c.ink, 4);
    art.poly(ctx, [-38, 0, -14, -7, 30, -7, 40, 0, 30, 7, -14, 7], c.dark);
    art.ellipse(ctx, -24, 0, 10, 5.5, look && look.flash ? pal.white : pal.red, c.lamp, 2.5);
    if (charge > 0) art.circle(ctx, -58, 0, 3 + charge * 5, pal.gold, c.ink, 2);
  };

  /* Torch: bomber. The bomb under its belly glows as it nears the drop (look.charge). */
  ships.torch = function (ctx, look) {
    const c = enemyColors(look, pal.orange, '#c9541c');
    const charge = (look && look.charge) || 0;
    if (look && look.loaded) {
      art.ellipse(ctx, -2, 15, 13, 7, look.flash ? pal.white : pal.enemyInk, c.ink, 3);
      art.circle(ctx, -9, 15, 2.5 + charge * 2.5, charge > 0.5 ? pal.white : pal.gold);
    }
    art.poly(ctx, [-6, -10, 20, -30, 34, -28, 22, -8], c.dark, c.ink, 3.5);            // tail fin
    art.poly(ctx, [-34, 2, -22, -10, 14, -13, 30, -4, 30, 8, 12, 12, -20, 11], c.body, c.ink, 3.5);
    art.poly(ctx, [-12, -4, 16, -6, 24, 1, 14, 6, -10, 5], c.dark);
    art.ellipse(ctx, -21, 0, 6.5, 4, c.lamp, c.ink, 2);
  };

  /* Firebomb: what a Torch drops. Faces left, like the ships. */
  ships.firebomb = function (ctx, look) {
    const flash = look && look.flash;
    const blink = look && look.charge > 0.5;
    art.poly(ctx, [10, -6, 20, -13, 20, 13, 10, 6], flash ? pal.white : pal.redDark, pal.enemyInk, 3);
    art.ellipse(ctx, 0, 0, 15, 10, flash ? pal.white : pal.enemyInk, pal.enemyInk, 3);
    art.ellipse(ctx, -1, 0, 12, 7.5, flash ? pal.white : '#4a1026');
    art.circle(ctx, -8, 0, 5, blink || flash ? pal.white : pal.orange, pal.enemyInk, 2);
  };

  /* A lump of the Shiver's ice. */
  ships.ice = function (ctx, look) {
    const flash = look && look.flash;
    art.poly(ctx, [-30, -6, -18, -26, 6, -31, 27, -16, 31, 8, 14, 28, -12, 26, -28, 12],
      flash ? pal.white : pal.ice, '#1a2f66', 4);
    if (flash) return;
    art.poly(ctx, [-30, -6, -18, -26, 6, -31, 2, -8, -14, 4], pal.white);
    art.poly(ctx, [31, 8, 14, 28, -12, 26, 4, 8], pal.iceDark);
    art.poly(ctx, [2, -8, 27, -16, 31, 8, 4, 8], '#9cc8f5');
  };

  /* Warden: armoured beam ship. Its shell parts (look.open) to show the lens that fires. */
  ships.warden = function (ctx, look) {
    const c = enemyColors(look, pal.violet, pal.violetDark);
    const open = (look && look.open) || 0;
    const charge = (look && look.charge) || 0;
    const gap = 3 + open * 12;
    // spine and engine block
    art.poly(ctx, [-4, -9, 26, -12, 34, 0, 26, 12, -4, 9], c.dark, c.ink, 3.5);
    // the lens
    art.circle(ctx, -8, 0, 9, look && look.flash ? pal.white : (charge > 0 ? pal.gold : pal.red), c.ink, 3);
    if (charge > 0) art.circle(ctx, -8, 0, 3 + charge * 3, pal.white);
    // shell halves
    art.mirror(ctx, () => {
      art.poly(ctx, [-30, -gap, -24, -gap - 16, 4, -gap - 24, 24, -gap - 18, 16, -gap - 2, -4, -gap], c.body, c.ink, 3.5);
      art.poly(ctx, [-22, -gap - 5, -19, -gap - 13, 2, -gap - 18, 10, -gap - 6], c.lamp);
    });
  };

  /* ---------- pictures ---------- */

  /* A sprite from an image: width in sprite units, the image point that sits on the origin
     (0..1 across and down), and a stand-in shape for when the file is missing. */
  function picture(name, width, originX, originY, standIn, extra, standInColor) {
    return function (ctx, look) {
      const img = SO.assets.images[name];
      if (!img) {
        art.poly(ctx, standIn, look && look.flash ? pal.white : (standInColor || pal.red), pal.enemyInk, 4);
      } else {
        const height = width * img.height / img.width;
        ctx.drawImage(look && look.flash ? art.tinted(img, '#ffffff', 1) : img, -width * originX, -height * originY, width, height);
      }
      if (extra) extra(ctx, look || {});
    };
  }

  /* Guren's fighter, the Redfang. As an enemy it faces left; as a wingman it is drawn flipped. */
  ships.redfang = picture('redfang', 196, 0.5, 0.5, [-98, 8, -40, -14, 50, -30, 96, -16, 96, 22, 20, 26, -60, 24], (ctx, look) => {
    if (look.charge > 0) art.circle(ctx, -72, 15, 3 + look.charge * 5, pal.gold, pal.enemyInk, 2);
  });

  /* The Tinderbox, the lamplighters' barge. Faces right. */
  ships.tinderbox = picture('tinderbox', 270, 0.5, 0.5, [-135, 10, -100, -20, 90, -24, 135, 0, 120, 50, -110, 52]);

  /* Brander: the fire-ship. */
  ships.brander = picture('brander', 430, 0.5, 0.5, [-215, 10, -150, -30, 180, -50, 215, 0, 190, 60, -150, 60], (ctx, look) => {
    if (look.charge > 0) art.circle(ctx, -150, 6, 4 + look.charge * 7, pal.gold, pal.enemyInk, 2.5);
  });

  /* Snuffer: a clamp on the Great Lantern. The origin is its furnace core. */
  ships.snuffer = picture('snuffer', 236, 0.523, 0.497, [-120, -100, 0, -116, 100, -110, 110, 110, 0, 116, -120, 100, -30, 60, -60, 0, -30, -60], (ctx, look) => {
    if (look.charge > 0) {
      ctx.globalCompositeOperation = 'lighter';
      art.glow(ctx, 0, 0, 30 + look.charge * 46, pal.gold, 0.5 + look.charge * 0.5);
      ctx.globalCompositeOperation = 'source-over';
    }
  });

  /* The Vigil: an old Lantern Fleet cruiser, out of the breaker's yard for one more fight. Faces right. */
  ships.vigil = picture('vigil', 400, 0.5, 0.5, [-200, 0, -170, -30, 150, -34, 200, 4, 170, 62, -180, 62], null, pal.navyLight);

  /* The Marigold: a grain freighter with cannons welded on. Faces right. */
  ships.marigold = picture('marigold', 380, 0.5, 0.5, [-190, -10, -150, -50, 150, -54, 190, -4, 180, 56, -170, 58], null, pal.cream);

  /* Cinder: a Pyre battleship. */
  ships.cinder = picture('cinder', 440, 0.5, 0.5, [-220, 0, -150, -24, 60, -70, 215, -20, 215, 50, -160, 66], (ctx, look) => {
    if (look.charge > 0) {
      art.circle(ctx, -152, -17, 3 + look.charge * 6, pal.gold, pal.enemyInk, 2.5);
      art.circle(ctx, -61, -17, 3 + look.charge * 6, pal.gold, pal.enemyInk, 2.5);
    }
  });
})(window.SO);
