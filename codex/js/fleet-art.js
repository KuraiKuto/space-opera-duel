// Fleet silhouettes are cached at native resolution like the smaller flight sprites.
(() => {
  'use strict';
  const { rect } = Starfall.art;
  function hull(g, color, vertices) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(...vertices[0]);
    for (const [x, y] of vertices.slice(1)) g.lineTo(x, y);
    g.closePath();
    g.fill();
  }
  function sprite(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    paint(g);
    return c;
  }
  const allied = ['#101e29','#253d4b','#43616b','#79988f','#cccfac','#81ffdb'];
  const hostile = ['#261a2c','#463044','#775063','#a97776','#e0a68c','#ff775e'];
  function capital(colors) {
    const [ink, shadow, metal, edge, light, lamp] = colors;
    return sprite(170,77,(g) => {
      hull(g,ink,[[1,37],[26,30],[40,21],[72,21],[77,12],[95,12],[100,19],[119,19],[132,27],[150,28],[153,33],[166,33],[166,56],[145,60],[136,68],[91,68],[78,61],[40,57],[22,48],[3,45]]);
      hull(g,metal,[[4,37],[51,24],[124,24],[145,31],[133,41],[42,44],[5,41]]);
      hull(g,shadow,[[8,42],[128,38],[146,33],[160,36],[154,52],[132,60],[100,62],[44,52]]);
      hull(g,edge,[[8,37],[48,26],[107,25],[125,28],[113,31],[44,35]]);
      hull(g,metal,[[41,46],[122,43],[142,37],[140,47],[131,54],[93,58],[63,52]]);
      for (let i = 0; i < 9; i++) {
        const x = 45 + i * 10;
        rect(g,x,32,7,3,metal); rect(g,x,38,6,2,i%3 ? lamp : light);
        rect(g,x+3,47,2,5,shadow);
      }
      hull(g,shadow,[[60,26],[73,16],[106,16],[119,23],[109,29],[61,30]]);
      rect(g,76,16,29,3,edge); rect(g,84,10,12,7,metal);
      rect(g,82,12,18,2,light); rect(g,89,3,2,8,edge); rect(g,96,7,1,6,light);
      for (const [x,y] of [[30,31],[62,28],[103,28]]) {
        rect(g,x,y,10,5,ink); rect(g,x+1,y-1,8,3,edge); rect(g,x-9,y,12,2,light);
      }
      for (const [x,y,w] of [[126,32,34],[112,51,42]]) {
        rect(g,x,y,w,9,ink); rect(g,x+3,y+1,w-5,3,metal);
        rect(g,x+w-5,y,4,9,edge); rect(g,x+w,y+2,3,5,lamp);
      }
      rect(g,30,40,16,1,light); rect(g,58,55,18,1,edge);
    });
  }
  const capitals = [capital(hostile), capital(allied)];
  const flagship = sprite(238,111,(g) => {
    for (let side = 0; side < 2; side++) {
      g.save();
      if (side) { g.translate(238,0); g.scale(-1,1); }
      hull(g,'#251a2a',[[0,51],[12,23],[33,12],[44,14],[57,31],[81,24],[98,9],[120,1],[120,107],[102,99],[89,76],[65,69],[40,84],[19,72],[6,68]]);
      hull(g,'#554051',[[4,50],[15,26],[33,16],[43,18],[55,37],[89,27],[113,8],[117,11],[114,92],[104,90],[91,67],[65,60],[40,75],[22,66],[10,62]]);
      hull(g,'#9a7580',[[9,47],[18,28],[33,19],[41,20],[44,24],[27,28],[19,42]]);
      hull(g,'#755968',[[21,46],[39,29],[52,42],[79,33],[70,49],[43,64],[20,59]]);
      hull(g,'#392b40',[[28,48],[41,37],[45,44],[72,38],[65,47],[37,59],[27,56]]);
      for (let i=0; i<7; i++) {
        rect(g,25+i*7,49-Math.floor(i/2),3,2,i%3 ? '#ffaf74' : '#ffdb9c');
      }
      for (const [x,y] of [[13,49],[57,45],[87,32]]) {
        rect(g,x,y,7,16,'#292334'); rect(g,x+1,y,3,12,'#a98284');
        rect(g,x+1,y+13,5,3,'#dc8a6c');
      }
      hull(g,'#ab8183',[[78,33],[100,15],[111,12],[97,28],[82,40]]);
      hull(g,'#755364',[[83,41],[110,22],[112,72],[100,76],[93,53],[79,56]]);
      rect(g,34,14,2,10,'#f9b18d'); rect(g,38,9,1,9,'#c68a89');
      g.restore();
    }
    hull(g,'#2a2330',[[119,6],[132,20],[137,57],[130,81],[119,103],[108,81],[101,57],[105,22]]);
    hull(g,'#b4898a',[[119,12],[129,23],[132,49],[119,66],[106,49],[109,23]]);
    hull(g,'#554255',[[119,20],[126,27],[129,47],[119,58],[109,47],[112,27]]);
    for (let y=30; y<47; y+=5) rect(g,115,y,8,2,'#ffbf88');
  });
  const blackwing = sprite(38,35,(g) => {
    hull(g,'#101b26',[[19,0],[23,14],[37,24],[37,30],[25,27],[22,33],[16,33],[12,27],[1,30],[1,24],[15,13]]);
    hull(g,'#735363',[[19,3],[22,16],[35,25],[24,22],[21,30],[17,30],[14,22],[3,26],[16,15]]);
    hull(g,'#b3a8a3',[[19,5],[21,17],[29,22],[21,20],[19,26],[17,19],[11,21],[17,15]]);
    rect(g,18,12,3,7,'#ffc787');
  });
  function centered(g,img,x,y,scale=1) {
    const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
    g.drawImage(img,Math.round(x-w/2),Math.round(y-h/2),w,h);
  }
  function target(g,x,y,r,ratio,t) {
    const ink = '#ffdc8c';
    g.save(); g.translate(Math.round(x),Math.round(y));
    const span = r + Math.round(Math.sin(t*4));
    for (let i=0; i<4; i++) {
      rect(g,-span,-span,7,2,ink); rect(g,-span,-span,2,6,ink);
      g.rotate(Math.PI/2);
    }
    rect(g,-r,r+5,r*2,3,'#2f212a'); rect(g,-r,r+5,Math.ceil(r*2*ratio),3,ink);
    g.restore();
  }
  Starfall.fleetArt = {
    capital(g,s,t) {
      g.save(); g.translate(Math.round(s.x),Math.round(s.y));
      if (s.ally) g.scale(-1,1);
      for (const [x,y] of [[78,-2],[71,16]]) {
        rect(g,x,y,6+Math.floor(3*Math.sin(t*15+y)),3,s.ally ? '#67d3c9' : '#f68d73');
      }
      centered(g,capitals[Number(s.ally)],0,0);
      g.restore();
    },
    flagship(g,b,stage,t) {
      centered(g,flagship,b.x,b.y);
      if (stage < 2) return;
      g.save(); g.translate(Math.round(b.x),Math.round(b.y));
      for (const dx of [-84,84]) {
        hull(g,'#352332',[[dx-12,14],[dx-4,9],[dx+3,15],[dx+12,11],[dx+8,23],[dx,26],[dx-11,21]]);
        rect(g,dx-6,17,6,2,'#d17f68');
      }
      if (stage >= 3) {
        for (const direction of [-1,1]) {
          g.save(); g.scale(direction,1);
          hull(g,'#322333',[[7,-9],[22,-25],[31,-23],[22,-1],[44,6],[36,14],[19,9],[15,32],[9,26]]);
          hull(g,'#a47a7a',[[20,-14],[29,-25],[34,-24],[26,-6],[37,0],[33,3],[20,-4]]);
          for (let i=0; i<4; i++) {
            const flicker = Math.floor(t*10+i)%3;
            rect(g,19+i*4,5-i*2,2+flicker,2,flicker ? '#c66c55' : '#f4c382');
          }
          g.restore();
        }
      }
      g.restore();
    },
    rook(g,r,t) {
      rect(g,r.x-2,r.y+11,4,9+Math.round(Math.sin(t*18)*3),'#8ce5d7');
      centered(g,blackwing,r.x,r.y);
      g.textAlign='center'; g.font='bold 9px monospace'; g.fillStyle='#b1efdc';
      g.fillText('ROOK',Math.round(r.x),Math.round(r.y+34));
    },
    target,
    node(g,x,y,r,t) {
      g.save(); g.translate(Math.round(x),Math.round(y));
      hull(g,'#512c3b',[[-r,0],[-r+5,-r+3],[0,-r],[r-4,-r+3],[r,0],[r-4,r-2],[0,r],[-r+4,r-2]]);
      const size = Math.round(r*(0.55+0.12*Math.sin(t*6)));
      rect(g,-size,-size,size*2,size*2,'#ff996b'); rect(g,-size+2,-3,size*2-4,5,'#fff0b4');
      g.restore();
    },
  };
})();
