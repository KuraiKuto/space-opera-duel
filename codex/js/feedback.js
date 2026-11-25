(() => {
  'use strict';
  const { rect } = Starfall.art;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const flame = ['#ffebbd','#ffb16b','#ed7c69','#a77789'];
  const ice = ['#e6fffc','#9affe4','#61bac9'];
  const metal = ['#fff2ca','#ffc389','#db8b7c'];
  Starfall.createFeedback = function () {
    let sparks = [], waves = [], pieces = [], debris = [];
    let shake = 0, clock = 0, slow = 0, muzzle = 0, shield = 0, shieldAngle = 0, hullHit = false;
    function burst(x,y,colors,count) {
      if (reduced.matches) count = Math.ceil(count/2);
      for (let i=0; i<count; i++) {
        const angle = Math.random()*Math.PI*2, speed = 22 + Math.random()*125;
        sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
          life:.14+Math.random()*.34, color:colors[i%colors.length], size:i%3 === 0 ? 3 : 2});
      }
      if (sparks.length > 240) sparks.splice(0,sparks.length-240);
    }
    function wave(x,y,r,color,duration) {
      waves.push({x,y,r,color,duration,age:0});
    }
    function jolt(amount, slowdown = 0) {
      shake = Math.max(shake, amount);
      slow = Math.max(slow, slowdown);
    }
    function blast(x,y,heavy=false) {
      burst(x,y,flame,heavy ? 45 : 22);
      const count = reduced.matches ? 2 : heavy ? 10 : 5;
      for (let i = 0; i < count; i++) {
        const angle = (i + Math.random()) * Math.PI * 2 / count;
        const speed = (heavy ? 100 : 55) + Math.random()*65;
        debris.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
          angle, spin:Math.random()*8-4, life:.48+Math.random()*.27, width:heavy ? 8 : 5});
      }
      wave(x,y,heavy ? 63 : 27,'#ffcd96',heavy ? .42 : .24);
      jolt(heavy ? 4 : 1.6,heavy ? .095 : 0);
      Starfall.audio.effect(heavy ? 'rupture' : 'blast');
    }
    function hit(x,y,blocked=false) {
      burst(x,y,blocked ? ice : metal,blocked ? 3 : 7);
      wave(x,y,blocked ? 13 : 9,blocked ? '#9ac8ef' : '#fff0be',.12);
      Starfall.audio.effect(blocked ? 'deflect' : 'hit');
    }
    function hurt(p,hull,fromX,fromY) {
      hullHit = hull;
      shieldAngle = Math.atan2(fromY-p.y,fromX-p.x);
      shield = .32;
      const x = p.x + Math.cos(shieldAngle)*25, y = p.y + Math.sin(shieldAngle)*24;
      burst(x,y,hull ? flame : ice,hull ? 26 : 13);
      if (hull) wave(x,y,21,'#ffad70',.22);
      jolt(hull ? 3.5 : 2.3,hull ? .075 : .045);
      Starfall.audio.effect(hull ? 'hull' : 'shield');
    }
    // Cut the actual sprite along two jagged seams so its wings and reactor
    // retain their silhouettes as they separate.
    function fracture(x,y,w,h,paint) {
      const img = document.createElement('canvas');
      img.width = w; img.height = h;
      paint(img.getContext('2d'));
      for (let i = -1; i <= 1; i++) {
        const section = document.createElement('canvas');
        section.width = w; section.height = h;
        const g = section.getContext('2d');
        const seam = k => [w*(.5+k*.19),w*(.5+k*.12),w*(.5+k*.21),w*(.5+k*.15)];
        const left = i === -1 ? [0,0,0,0] : seam(i === 0 ? -1 : 1);
        const right = i === 1 ? [w,w,w,w] : seam(i === 0 ? 1 : -1);
        const rows = [0,h*.38,h*.68,h];
        g.beginPath();
        left.forEach((u,j) => j ? g.lineTo(u,rows[j]) : g.moveTo(u,rows[j]));
        for (let j=3;j>=0;j--) g.lineTo(right[j],rows[j]);
        g.closePath(); g.clip(); g.drawImage(img,0,0);
        pieces.push({img:section,x,y,side:i,age:0});
      }
      blast(x,y,true);
    }
    function advance(dt) {
      const scale = slow > 0 && !reduced.matches ? .48 : 1;
      clock += dt;
      shake = Math.max(0,shake-dt*16);
      slow = Math.max(0,slow-dt);
      muzzle = Math.max(0,muzzle-dt);
      shield = Math.max(0,shield-dt);
      for (const p of sparks) { p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt; }
      sparks = sparks.filter(p => p.life>0);
      for (const chip of debris) {
        chip.x += chip.vx*dt;
        chip.y += chip.vy*dt;
        chip.angle += chip.spin*dt;
        chip.life -= dt;
      }
      debris = debris.filter(chip => chip.life > 0);
      for (const w of waves) w.age+=dt;
      waves = waves.filter(w => w.age<w.duration);
      for (const p of pieces) p.age+=dt;
      pieces = pieces.filter(p => p.age < 1.25);
      return dt*scale;
    }
    function camera(g) {
      if (!reduced.matches && shake > 0)
        g.translate(Math.round(shake*Math.sin(clock*110)),Math.round(shake*.7*Math.cos(clock*89)));
    }
    function draw(g) {
      g.save();
      for (const p of pieces) {
        const a = p.age, travel = reduced.matches ? .4 : 1;
        g.save();
        g.globalAlpha = Math.min(1,(1.25-a)*2.1);
        g.translate(Math.round(p.x+p.side*a*68*travel),Math.round(p.y+(p.side ? -19 : 37)*a*travel));
        g.rotate(p.side*a*.38*travel);
        g.drawImage(p.img,-p.img.width/2,-p.img.height/2);
        g.restore();
      }
      for (const chip of debris) {
        g.save();
        g.globalAlpha = Math.min(1,chip.life*3);
        g.translate(Math.round(chip.x),Math.round(chip.y));
        g.rotate(chip.angle);
        rect(g,-2,-1,chip.width,3,'#725364');
        rect(g,-2,-2,chip.width-2,2,'#ffd29a');
        g.restore();
      }
      for (const w of waves) {
        const f = w.age/w.duration, r = Math.max(2,w.r*(1-(1-f)**2));
        g.globalAlpha = (1-f)*.83;
        g.strokeStyle = w.color; g.lineWidth = f<.25 ? 2 : 1;
        g.beginPath(); g.arc(w.x,w.y,r,0,Math.PI*2); g.stroke();
        if (f<.45) {
          const span = Math.ceil((1-f/.45)*w.r*.48);
          rect(g,w.x-span,w.y-1,span*2,3,w.color);
          rect(g,w.x-1,w.y-span*.5,3,span,w.color);
        }
      }
      for (const p of sparks) {
        g.globalAlpha = Math.min(1,p.life*5);
        rect(g,p.x,p.y,p.size,p.size,p.color);
      }
      g.restore();
    }
    function ship(g,p,t) {
      g.save();
      const kick = muzzle/.075;
      g.translate(p.x,p.y);
      if (!reduced.matches) g.rotate(p.bank*.092);
      g.translate(-p.x,-p.y);
      Starfall.art.player(g,p,t, reduced.matches ? 0 : Math.round(kick*2));
      if (muzzle > 0) {
        g.globalAlpha = kick;
        for (const dx of [-14,14]) {
          rect(g,p.x+dx-3,p.y-19,7,4,'#86f2de');
          rect(g,p.x+dx-1,p.y-16-9*kick,3,11*kick,'#f0fff4');
        }
      }
      g.restore();
      g.save();
      if (shield > 0 && !hullHit) {
        const f = shield/.32;
        g.globalAlpha = f*.89; g.strokeStyle='#90ffe9'; g.lineWidth=1+f*1.6;
        const r = 32+(1-f)*10;
        g.fillStyle = 'rgba(99,236,220,.12)';
        g.beginPath(); g.ellipse(p.x,p.y,r,r*.91,0,0,Math.PI*2); g.fill();
        g.beginPath(); g.ellipse(p.x,p.y,r+3,r*.91+3,0,shieldAngle-.70,shieldAngle+.70); g.stroke();
        for (let i=0;i<3;i++) {
          const a = i*Math.PI*2/3-1.5;
          g.beginPath(); g.ellipse(p.x,p.y,r,r*.91,0,a,a+1.85); g.stroke();
        }
      }
      g.restore();
    }
    return { advance, camera, draw, ship, burst, blast, hit, hurt, fracture, jolt,
      fire() { muzzle = .075; Starfall.audio.effect('fire'); } };
  };
})();
