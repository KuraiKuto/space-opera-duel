// All flight artwork uses integer pixels in a fixed-resolution canvas.
(() => {
  const { width: W, height: H } = Starfall;
  function surface(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  function random(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  const rand = random(8751);
  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }
  function poly(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    ctx.fill();
  }
  const stars = Array.from({ length: 36 }, (_, i) => ({
    x: Math.round(rand() * W), y: Math.round(rand() * H), phase: rand() * 6.3, size: i % 5 === 0 ? 2 : 1,
  }));
  const backdrops = Starfall.missions.map((mission) => {
    const image = new Image();
    image.src = mission.art;
    return image;
  });
  // Hand-shaped mirrored fighter sprites with independent engine and canopy layers.
  function fighter(type) {
    const c = surface(43, 38),
      g = c.getContext('2d');
    const colors = type
      ? ['#361a36', '#84354a', '#d66565', '#f6a280', '#ffe2af']
      : ['#2e193a', '#713454', '#b8537c', '#ee83aa', '#ffd4d3'];
    for (let side = 0; side < 2; side++) {
      g.save();
      if (side) {
        g.translate(43, 0);
        g.scale(-1, 1);
      }
      if (type) {
        poly(
          g,
          colors[0],
          [2, 23, 5, 20, 8, 9, 13, 5, 16, 6, 18, 12, 22, 14, 22, 25, 17, 27, 12, 22, 8, 24, 3, 26],
        );
        poly(g, colors[1], [3, 22, 7, 17, 9, 9, 14, 6, 16, 12, 21, 15, 21, 23, 16, 23, 12, 19, 8, 22]);
        poly(g, colors[2], [6, 20, 10, 10, 13, 8, 13, 13, 19, 16, 21, 20, 15, 18, 11, 16]);
        rect(g, 10, 10, 2, 5, colors[3]);
        rect(g, 13, 7, 2, 5, colors[4]);
        rect(g, 5, 21, 2, 5, colors[2]);
        rect(g, 4, 25, 2, 3, colors[3]);
        rect(g, 14, 17, 2, 5, colors[3]);
      } else {
        poly(
          g,
          colors[0],
          [
            1, 5, 6, 5, 11, 12, 18, 13, 19, 18, 22, 18, 22, 30, 17, 29, 13, 24, 8, 23, 4, 28, 2, 28, 2, 17, 0,
            14,
          ],
        );
        poly(
          g,
          colors[1],
          [2, 4, 5, 4, 9, 10, 12, 13, 18, 14, 20, 20, 21, 27, 16, 25, 12, 21, 7, 22, 3, 26, 3, 15, 1, 13],
        );
        poly(g, colors[2], [3, 5, 6, 8, 8, 13, 15, 16, 17, 19, 12, 18, 8, 17, 5, 20, 4, 14]);
        rect(g, 3, 5, 2, 5, colors[3]);
        rect(g, 6, 11, 2, 4, colors[3]);
        rect(g, 4, 21, 2, 5, colors[3]);
        rect(g, 13, 10, 4, 11, colors[1]);
        rect(g, 13, 10, 2, 7, colors[3]);
        rect(g, 14, 23, 2, 5, colors[2]);
      }
      g.restore();
    }
    poly(g, colors[0], [18, 8, 24, 8, 26, 15, 25, 25, 22, 32, 19, 32, 16, 24, 16, 15]);
    poly(g, colors[2], [19, 9, 23, 9, 24, 17, 23, 25, 21, 30, 19, 26, 18, 18]);
    rect(g, 19, 11, 4, 5, colors[3]);
    rect(g, 19, 17, 5, 5, '#451f46');
    rect(g, 20, 18, 3, 3, colors[4]);
    rect(g, 20, 25, 2, 4, colors[3]);
    return c;
  }
  function captainShip() {
    const c = surface(65, 63),
      g = c.getContext('2d');
    for (let side = 0; side < 2; side++) {
      g.save();
      if (side) {
        g.translate(65, 0);
        g.scale(-1, 1);
      }
      poly(
        g,
        '#221d3a',
        [
          31, 3, 31, 54, 25, 56, 22, 50, 18, 50, 16, 53, 9, 53, 9, 48, 3, 51, 1, 50, 1, 39, 5, 36, 5, 27, 8,
          27, 8, 35, 18, 28, 25, 20, 27, 9,
        ],
      );
      poly(
        g,
        '#656780',
        [28, 18, 31, 16, 30, 46, 25, 53, 22, 47, 19, 48, 17, 44, 4, 49, 3, 43, 14, 33, 21, 31],
      );
      poly(g, '#b5b4c1', [6, 39, 15, 33, 25, 21, 24, 31, 20, 38, 4, 46, 4, 42]);
      poly(g, '#f2e6db', [5, 40, 16, 31, 23, 24, 21, 29, 15, 36, 5, 43]);
      poly(g, '#4f9da9', [6, 39, 12, 35, 12, 38, 4, 44, 4, 42]);
      rect(g, 5, 27, 2, 11, '#a2a9c1');
      rect(g, 5, 26, 2, 4, '#f6d1cf');
      rect(g, 12, 36, 6, 16, '#423c59');
      rect(g, 13, 35, 3, 13, '#bdbbc9');
      rect(g, 14, 36, 2, 4, '#f6eee7');
      rect(g, 12, 48, 6, 3, '#66657d');
      rect(g, 13, 52, 4, 2, '#91faf1');
      poly(g, '#d7cbd4', [26, 15, 30, 7, 29, 27, 26, 38, 21, 43, 22, 34]);
      rect(g, 23, 42, 4, 9, '#56526a');
      rect(g, 24, 45, 2, 5, '#aaa6b7');
      g.restore();
    }
    poly(g, '#b8b5c5', [31, 2, 34, 2, 36, 12, 38, 33, 36, 49, 33, 55, 29, 54, 27, 47, 27, 27, 29, 10]);
    poly(g, '#f7eee2', [31, 3, 33, 2, 34, 14, 33, 23, 30, 23, 30, 10]);
    poly(g, '#29445d', [30, 18, 34, 18, 36, 25, 35, 33, 32, 36, 29, 32, 28, 25]);
    poly(g, '#46bfca', [30, 20, 33, 19, 34, 24, 34, 30, 31, 33, 30, 29]);
    rect(g, 31, 20, 2, 7, '#acfff3');
    rect(g, 30, 36, 4, 10, '#f5e7e8');
    rect(g, 29, 49, 7, 5, '#514c67');
    rect(g, 29, 54, 7, 2, '#a8f5fb');
    for (const x of [18, 46]) {
      rect(g, x-2, 13, 5, 21, '#343348');
      rect(g, x-1, 14, 3, 16, '#a5b1b7');
      rect(g, x-1, 13, 3, 3, '#bdfff0');
    }
    return c;
  }
  function sweeper() {
    const c = surface(49, 35), g = c.getContext('2d');
    for (let side = 0; side < 2; side++) {
      g.save();
      if (side) { g.translate(49, 0); g.scale(-1, 1); }
      poly(g, '#172a36', [0,6,7,2,14,11,24,8,25,21,12,20,6,31,1,29,4,17]);
      poly(g, '#39828a', [2,6,6,4,13,13,23,11,23,18,11,17,5,26,7,14]);
      poly(g, '#9cdbce', [3,6,6,5,12,12,10,14,6,11]);
      rect(g, 5, 23, 3, 5, '#e5a76c');
      g.restore();
    }
    poly(g, '#56777d', [24,4,32,12,30,22,24,29,17,22,16,12]);
    poly(g, '#112e3d', [24,8,29,14,28,18,24,23,20,18,19,14]);
    rect(g, 21, 13, 7, 4, '#ffc97a');
    return c;
  }
  function warden() {
    const c = surface(130, 76), g = c.getContext('2d');
    for (let side = 0; side < 2; side++) {
      g.save();
      if (side) { g.translate(130, 0); g.scale(-1, 1); }
      poly(g, '#241d35', [0,36,6,19,26,5,35,4,38,14,55,4,66,7,66,65,55,73,41,53,24,49,10,62,3,57]);
      poly(g, '#72597f', [4,36,9,20,28,8,33,8,36,20,57,8,64,11,61,48,54,66,42,47,23,43,8,55]);
      poly(g, '#bdaac0', [8,32,12,21,28,10,31,11,27,18,17,24,13,33]);
      poly(g, '#443b53', [15,30,35,22,33,32,47,26,44,40,23,37,10,47]);
      poly(g, '#c9b5cd', [39,22,54,12,59,12,51,22,41,27]);
      for (let i = 0; i < 4; i++) rect(g, 16 + i*3, 30 - i, 2, 5, '#eeac7d');
      rect(g, 7, 47, 6, 10, '#43344f'); rect(g, 8, 54, 4, 4, '#ffa896');
      rect(g, 46, 43, 6, 12, '#43344f'); rect(g, 47, 53, 4, 4, '#ffa896');
      g.restore();
    }
    poly(g, '#302636', [64,9,77,23,78,45,65,68,52,45,53,23]);
    poly(g, '#b284b4', [65,15,73,25,74,42,65,58,56,42,57,25]);
    poly(g, '#563d62', [65,21,71,29,71,39,65,48,59,39,59,29]);
    rect(g, 61, 29, 8, 9, '#ffb584'); rect(g, 63, 30, 4, 5, '#fff1a9');
    return c;
  }
  const enemies = [fighter(0), fighter(1), sweeper(), warden()],
    player = captainShip();
  function flame(g, x, y, width, height, palette) {
    for (let i = 0; i < 3; i++) {
      const w = Math.max(1, width - i * 2),
        h = Math.max(1, Math.round(height * (1 - i * 0.28)));
      rect(g, x - Math.floor(w / 2), y, w, Math.ceil(h * 0.55), palette[i]);
      rect(
        g,
        x - Math.max(0, Math.floor(w / 2) - 1),
        y + Math.ceil(h * 0.55),
        Math.max(1, w - 2),
        Math.floor(h * 0.45),
        palette[i],
      );
    }
  }
  Starfall.art = {
    scene(g, t, index) {
      const image = backdrops[index];
      const fieldHeight = g.canvas.height;
      rect(g, 0, 0, W, fieldHeight, '#0b1517');
      if (image.complete && image.naturalWidth) {
        const fleet = Starfall.missions[index].goal === 'fleet';
        const height = fleet ? Math.round(image.naturalHeight * .53) : image.naturalHeight;
        const width = Math.round(height * W / fieldHeight);
        const x = fleet ? 0 : Math.round((image.naturalWidth - width) * 0.64);
        g.drawImage(image, x, 0, width, height, 0, 0, W, fieldHeight);
        rect(g, 0, 0, W, fieldHeight, fleet ? 'rgba(18,13,25,0.28)' : 'rgba(5,12,16,0.61)');
      }
      for (const star of stars) {
        const y = star.y * fieldHeight / H;
        const a = 0.54 + 0.4 * Math.sin(t * 1.6 + star.phase);
        g.globalAlpha = a;
        rect(g, star.x - star.size, y, star.size * 2 + 1, 1, '#e0d2ff');
        rect(g, star.x, y - star.size, 1, star.size * 2 + 1, '#dfc9ff');
      }
      g.globalAlpha = 1;
    },
    player(g, p, t, kick = 0) {
      if (p.invincible > 0) g.globalAlpha = .78 + .22 * Math.cos(t * 18);
      const x = Math.round(p.x) - 32,
        y = Math.round(p.y) - 29 + kick;
      const palette = ['#7f54b7', '#82bacf', '#bcfff1'];
      for (const dx of [15, 49])
        flame(g, x + dx, y + 53, 5, 7 + Math.round(3 * Math.sin(t * 23 + dx)), palette);
      flame(g, x + 32, y + 55, 8, 14 + Math.round(4 * Math.sin(t * 31)), palette);
      g.drawImage(player, x, y);
    },
    enemy(g, e, t) {
      const sprite = enemies[e.type];
      const x = Math.round(e.x - sprite.width / 2), y = Math.round(e.y - sprite.height / 2);
      if (e.type >= 2) {
        g.drawImage(sprite, x, y);
        if (e.type === 3) {
          rect(g, e.x - 23, y - 6, 46, 3, '#362435');
          rect(g, e.x - 23, y - 6, Math.ceil(46 * e.hp / e.maxHp), 3, '#ffa476');
        }
        return;
      }
      for (const dx of [14, 28]) {
        const h = 3 + Math.round(2 * Math.sin(t * 20 + e.phase));
        rect(g, x + dx, y + 10 - h, 2, h, '#e86f81');
      }
      g.drawImage(enemies[e.type], x, y);
    },
    recorder(g, item, t) {
      const { x, y } = item;
      g.save();
      g.translate(Math.round(x), Math.round(y));
      g.strokeStyle = '#ffdf857a';
      g.setLineDash([5, 6]);
      g.beginPath(); g.arc(0, 0, 43, 0, 2 * Math.PI); g.stroke();
      g.setLineDash([]);
      const r = 17 + Math.round(2 * Math.sin(t * 4));
      g.strokeStyle = '#ffdf85'; g.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.moveTo(-r, 5-r); g.lineTo(-r, -r); g.lineTo(5-r, -r); g.stroke();
        g.rotate(Math.PI / 2);
      }
      poly(g, '#4d3a22', [-10,-7,-5,-11,7,-11,11,-7,11,8,6,11,-7,11,-10,7]);
      rect(g, -8,-7,16,14, '#d6a551'); rect(g,-5,-5,10,7,'#354c44');
      rect(g,-3,-3,6,2,'#c0ffe5'); rect(g,-4,4,8,2,'#ffedb9');
      g.fillStyle = '#fff4ba'; g.font = 'bold 10px monospace'; g.textAlign = 'center';
      g.fillText('REC ' + item.id, 0, r + 12);
      if (item.progress > 0) {
        rect(g, -18, r + 16, 36, 4, '#162726');
        rect(g, -18, r + 16, Math.ceil(36 * item.progress), 4, '#a9ffcc');
      }
      g.restore();
    },
    shot(g, b) {
      if (b.plasma) {
        rect(g,b.x-5,b.y-5,10,10,'#ee766d44');
        rect(g,b.x-4,b.y-2,8,4,'#ff866f');
        rect(g,b.x-2,b.y-4,4,8,'#ffab74');
        rect(g,b.x-2,b.y-2,4,4,'#fff1a6');
        return;
      }
      const ally = b.ally,
        pal = ally ? ['#75e7df', '#d6fff4'] : ['#ff627c', '#ffcf9e'];
      g.globalAlpha = 0.18;
      rect(g, b.x - 3, b.y - 5, 7, 14, pal[0]);
      g.globalAlpha = 1;
      rect(g, b.x - 1, b.y - 5, 3, 12, pal[0]);
      rect(g, b.x, b.y - 4, 1, 8, pal[1]);
    },
    rect,
  };
})();
