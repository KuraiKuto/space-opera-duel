'use strict';

/* Shared palette and drawing helpers.
   The look follows Kurai's portrait: flat colours, thick ink outlines, navy / cyan / cream. */
(function (SO) {
  const TAU = SO.util.TAU;

  SO.pal = {
    ink: '#060a1c',
    navy: '#17284a',
    navyDeep: '#0c1530',
    navyLight: '#2a3f6e',
    cyan: '#12eadc',
    cyanLight: '#b8fbf5',
    cream: '#f8f3e0',
    pink: '#ff8f9c',
    white: '#ffffff',
    // the enemy fleet: warm colours against Kurai's cool ones
    red: '#ef4056',
    redDark: '#a3213f',
    enemyInk: '#2a0716',
    orange: '#ff9838',
    gold: '#ffd35c',
    violet: '#9258f0',
    violetDark: '#5529a8',
    // the Shiver's ice
    ice: '#bfe3ff',
    iceDark: '#6f9fd8',
  };

  const art = SO.art = {};

  /* Closed polygon path from a flat [x0, y0, x1, y1, ...] list. */
  art.path = function (ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  };

  /* Fill and/or outline the current path. */
  art.paint = function (ctx, fill, stroke, lineWidth) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 3; ctx.stroke(); }
  };

  art.poly = function (ctx, pts, fill, stroke, lineWidth) {
    art.path(ctx, pts);
    art.paint(ctx, fill, stroke, lineWidth);
  };

  art.ellipse = function (ctx, x, y, rx, ry, fill, stroke, lineWidth, rotation) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation || 0, 0, TAU);
    art.paint(ctx, fill, stroke, lineWidth);
  };

  art.circle = function (ctx, x, y, r, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    art.paint(ctx, fill, stroke, lineWidth);
  };

  /* Rounded rectangle path. */
  art.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /* Run a drawing function twice: as written, then flipped top to bottom. */
  art.mirror = function (ctx, fn) {
    fn();
    ctx.save();
    ctx.scale(1, -1);
    fn();
    ctx.restore();
  };

  /* Text with an ink outline. opts: size, color, stroke, lineWidth, align, baseline. */
  art.text = function (ctx, str, x, y, opts) {
    opts = opts || {};
    ctx.font = (opts.weight || 800) + ' ' + (opts.size || 20) + 'px ' + SO.FONT;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'alphabetic';
    if (opts.stroke !== null) {
      ctx.strokeStyle = opts.stroke || SO.pal.ink;
      ctx.lineWidth = opts.lineWidth || Math.max(3, (opts.size || 20) * 0.22);
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = opts.color || SO.pal.cream;
    ctx.fillText(str, x, y);
  };

  /* Split text into lines no wider than maxWidth, using the font already set on ctx. */
  art.wrapText = function (ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const attempt = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(attempt).width > maxWidth) {
        lines.push(line);
        line = words[i];
      } else {
        line = attempt;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  /* A copy of an image washed with one colour, cached. amount 1 gives a flat silhouette
     (the white hit flash); less gives a tint (a character standing back in a story scene). */
  const tintCache = {};
  art.tinted = function (img, color, amount) {
    const key = img.src + '|' + color + '|' + amount;
    let copy = tintCache[key];
    if (copy) return copy;
    copy = document.createElement('canvas');
    copy.width = img.width;
    copy.height = img.height;
    const g = copy.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = amount;
    g.fillStyle = color;
    g.fillRect(0, 0, copy.width, copy.height);
    tintCache[key] = copy;
    return copy;
  };

  /* Fill the screen with a picture, cropping what does not fit. zoom > 1 leaves room to pan:
     panX and panY (0..1) choose which part shows. */
  art.cover = function (ctx, img, zoom, panX, panY) {
    const scale = Math.max(SO.W / img.width, SO.H / img.height) * (zoom || 1);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, -(w - SO.W) * (panX === undefined ? 0.5 : panX), -(h - SO.H) * (panY === undefined ? 0.5 : panY), w, h);
  };

  /* Soft glow sprite, cached per colour. Draw it with ctx.globalCompositeOperation = 'lighter'. */
  const glowCache = {};
  function glowSprite(color) {
    let sprite = glowCache[color];
    if (sprite) return sprite;
    const size = 128;
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const g = sprite.getContext('2d');
    const n = parseInt(color.slice(1), 16);
    const rgb = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(' + rgb + ',1)');
    grad.addColorStop(0.3, 'rgba(' + rgb + ',0.5)');
    grad.addColorStop(0.65, 'rgba(' + rgb + ',0.14)');
    grad.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    glowCache[color] = sprite;
    return sprite;
  }

  art.glow = function (ctx, x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * Math.min(1, alpha);
    ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = before;
  };
})(window.SO);
