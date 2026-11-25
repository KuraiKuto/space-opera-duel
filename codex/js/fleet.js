(() => {
  'use strict';
  const { width: W, height: baseHeight, fleetArt: art } = Starfall;
  const glow = ['#fff4bc','#ffb478','#e37971'];
  const mint = ['#d4fff1','#66dac4','#90b4b5'];
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2,'0');

  Starfall.createFleet = function ({ height, fx, damage, award, recharge, hostileShot, clearHostiles }) {
    let H = baseHeight;
    const { burst } = fx;
    const { audio } = Starfall;
    const batteryHp = 7, pylonHp = 8, siegeHp = 28, coreHp = 32;
    const allies = [[50,120],[79,255],[55,345]].map(([x,y]) => ({x,y,homeX:x,homeY:y,ally:true}));
    const opponents = [[579,106],[675,186],[537,255]].map(([x,y]) => ({x,y,homeX:x,homeY:y,ally:false,hp:batteryHp}));
    const boss = {x:400,y:-80};
    const rook = {x:174,y:303};
    const pylons = [{dx:-84,hp:pylonHp},{dx:84,hp:pylonHp}];
    let split = false, pylonTurn = 0;
    let crossfire = [], salvo = 0, broadside = 0.4, stage = 0, t = 0, age = 0, volley = 1;
    let lanceClock = 0, lanceX = 400, portOpen = false, armor = siegeHp, core = coreHp;
    let intercept = null, rookCooldown = 0, batteryCount = 3;
    function resize(height) {
      const ratio = height / H;
      for (const ship of [...allies, ...opponents]) {
        ship.y *= ratio;
        ship.homeY *= ratio;
      }
      for (const bolt of crossfire) {
        bolt.y *= ratio;
        bolt.vy *= ratio;
      }
      boss.y *= ratio;
      rook.y *= ratio;
      if (intercept) intercept.y *= ratio;
      H = height;
    }
    resize(height);
    function radio(name,line) {
      $('radioPortrait').src = Starfall.crew[name].image;
      $('radioCall').textContent = name.toUpperCase() + '  /  ' + (name === 'Rook' ? 'BLACKWING' : 'WAYFARER');
      $('radioText').textContent = line;
    }
    function counter(label,value,max) {
      $('objectiveLabel').textContent = label;
      $('wave').textContent = pad(value);
      $('objectiveTotal').textContent = pad(max);
    }
    function phase(n) {
      stage = n;
      age = 0;
      volley = 2.4;
      clearHostiles();
      crossfire = [];
      if (n > 0 && n < 4) recharge();
      if (n === 0) {
        $('missionObjective').textContent = 'Fly through the crossfire and destroy the three marked gun batteries.';
        counter('BATTERIES',3,3);
        radio('Iona','I’ve marked the guns in amber. Watch for orange fire crossing from starboard.');
      } else if (n === 1) {
        $('missionObjective').textContent = 'Destroy both shield pylons on the Sovereign’s wings.';
        counter('I · SHIELD PYLONS',2,2);
        radio('Iona','Reserve charge coming through. Watch the wings. Those guns take turns.');
      } else if (n === 2) {
        $('missionObjective').textContent = 'Dodge the siege lance. Fire into the gun port while Blackwing holds it open.';
        counter('II · SIEGE ARMOR',armor,siegeHp);
        radio('Rook','She’s tracking you. Dodge the red lane. I’ll jam her gun port open after each shot.');
      } else if (n === 3) {
        $('missionObjective').textContent = 'Thread the expanding rings and destroy the exposed drive core.';
        counter('III · DRIVE CORE',core,coreHp);
        audio.scene('core');
        radio('Rook','Her core is bare! Follow the glow between the rings. I’ve got your flank.');
      } else {
        $('missionObjective').textContent = 'Escort the convoy home.';
        crossfire = [];
        counter('SOVEREIGN',0,1);
        radio('Iona','Drive signal lost. All ships, cease fire.');
      }
      if (n && n < 4) audio.effect('phase');
    }
    function line(g,x1,y1,x2,y2,color,width) {
      g.strokeStyle = color; g.lineWidth = width;
      g.beginPath(); g.moveTo(Math.round(x1),Math.round(y1)); g.lineTo(Math.round(x2),Math.round(y2)); g.stroke();
    }
    function fleetGuns(dt) {
      broadside -= dt;
      if (broadside <= 0) {
        const lane = salvo % 3;
        const opposingLane = (lane + Math.floor(salvo/3)) % 3;
        const a = allies[lane], b = opponents[opposingLane];
        for (const [from,to] of [[a,b],[b,a]]) {
          if (!from.ally && !stage && !from.hp) continue;
          // Retreating ships shoot from their aft guns as the flagship takes the line.
          const gunOffset = !from.ally && stage ? 28 : (from.ally ? 47 : -47);
          const x = from.x + gunOffset, y = from.y + 1;
          const angle = Math.atan2(to.y-y,to.x-x);
          crossfire.push({x,y,vx:Math.cos(angle)*235,vy:Math.sin(angle)*235,to,ally:from.ally});
          burst(x,y,from.ally ? mint : glow,4);
        }
        audio.effect('hostile');
        salvo++;
        broadside = stage ? 2.15 : 1.05;
      }
      crossfire = crossfire.filter(b => {
        b.x += b.vx*dt; b.y += b.vy*dt;
        if ((b.ally && b.x >= b.to.x-30) || (!b.ally && b.x <= b.to.x+30)) {
          burst(b.x,b.y,b.ally ? mint : glow,10);
          return false;
        }
        return b.x > -40 && b.x < W+40;
      });
    }
    function update(dt,player) {
      t += dt; age += dt;
      if (stage === 4) {
        if (!split && age >= .52) {
          split = true;
          fx.fracture(boss.x,boss.y,238,112,g => art.flagship(g,{x:119,y:56},3,t));
        } else if (!split && (volley -= dt) <= 0) {
          const side = age < .23 ? -1 : 1;
          fx.blast(boss.x+side*68,boss.y+13);
          volley = .24;
        }
        return age > 1.84;
      }
      const toFlank = stage ? Math.min(1,(t-boss.arrival)/2) : 0;
      allies.forEach((s,i) => {
        s.x = s.homeX + Math.sin(t*.3+i)*8 - toFlank*30;
        s.y = s.homeY + Math.sin(t*.45+i)*6;
      });
      opponents.forEach((s,i) => {
        s.x = s.homeX + (W-s.homeX-10)*toFlank + Math.sin(t*.3+i)*8;
        s.y = s.homeY + Math.sin(t*.45+i+2)*6;
      });
      rook.x += ((stage === 2 ? boss.x-144 : player.x-67) + 16*Math.sin(t*1.4)-rook.x)*Math.min(1,dt*2);
      rook.x = Math.max(35,Math.min(W-35,rook.x));
      rook.y += ((stage === 2 ? boss.y+66 : Math.min(H-38,player.y+8))+8*Math.cos(t)-rook.y)*Math.min(1,dt*2);
      fleetGuns(dt);
      if (stage === 3) {
        rookCooldown -= dt;
        if (intercept && (intercept.life -= dt) <= 0) intercept = null;
        const threat = rookCooldown <= 0 && crossfire.find(b =>
          !b.ally && Math.hypot(b.x-player.x,b.y-player.y) < 100);
        if (threat) {
          intercept = {x:threat.x,y:threat.y,life:.2};
          fx.hit(threat.x,threat.y,true);
          crossfire.splice(crossfire.indexOf(threat),1);
          rookCooldown = 3;
        }
      }
      const contact = crossfire.find(b => !b.ally && Math.abs(b.x-player.x)<23 && Math.abs(b.y-player.y)<14);
      if (contact) damage(13,contact.x,contact.y);
      if (!stage) {
        volley -= dt;
        if (volley <= 0) {
          const batteries = opponents.filter(s => s.hp);
          const source = batteries[salvo % batteries.length];
          const x = source.x-42, y = source.y+8;
          const bearing = Math.atan2(player.x-x,(player.y-y)*baseHeight/H);
          hostileShot(x,y,Math.sin(bearing)*146,Math.cos(bearing)*146*H/baseHeight);
          volley = 2.3;
        }
        return false;
      }

      const drift = stage === 3 ? 159 : stage === 2 ? 74 : 49;
      const course = 400 + Math.sin((t-boss.arrival)*(stage===3 ? .85 : .48))*drift;
      boss.x += (course-boss.x)*Math.min(1,dt*6);
      boss.y = Math.min(1,(t-boss.arrival)/1.3)*(125*H/baseHeight+80)-80 + 9*Math.sin(t*1.1);
      if (Math.abs(player.x-boss.x)<104 && Math.abs(player.y-boss.y)<37) damage(30,boss.x,boss.y);
      volley -= dt;
      if (stage === 2) {
        const previousClock = lanceClock;
        lanceClock = (lanceClock+dt)%6.1;
        if (previousClock < 1.15 && lanceClock >= 1.15) audio.effect('warning');
        if (previousClock < 1.85 && lanceClock >= 1.85) {
          audio.effect('lance'); fx.jolt(2);
        }
        if (lanceClock < 1.15) lanceX = player.x;
        const live = lanceClock >= 1.85 && lanceClock < 2.38;
        if (live && Math.abs(player.x-lanceX)<25 && player.y>boss.y+45) damage(30,lanceX,boss.y);
        portOpen = lanceClock >= 2.38;
      } else if (volley <= 0 && boss.y>65) {
        audio.effect('hostile');
        if (stage === 1) {
          const intact = pylons.filter(p => p.hp);
          const pylon = intact[pylonTurn++ % intact.length];
          const x = boss.x + pylon.dx, y = boss.y + 24;
          const aim = Math.atan2(player.x-x, (player.y-y)*baseHeight/H);
          for (const offset of [-.32, 0, .32]) hostileShot(x,y,Math.sin(aim+offset)*122,Math.cos(aim+offset)*122*H/baseHeight);
          volley = 2.25;
        } else {
          for (let i=0; i<15; i++) {
            const a = i*Math.PI*2/15 + age*.24;
            hostileShot(boss.x,boss.y+17,Math.sin(a)*107,Math.cos(a)*107*H/baseHeight,true);
          }
          volley = 1.28;
        }
      }
      return false;
    }
    function hit(b) {
      const near = (x,y,w,h) => Math.abs(b.x-x)<w && Math.abs(b.y-y)<h;
      if (!stage) {
        const ship = opponents.find(s => s.hp && near(s.x-42,s.y+8,25,19));
        if (!ship) return false;
        fx.hit(b.x,b.y);
        if (!--ship.hp) {
          fx.blast(ship.x-42,ship.y+8);
          award(300);
          counter('BATTERIES',--batteryCount,3);
          if (!batteryCount) { boss.arrival = t; phase(1); }
        }
        return true;
      }
      if (stage === 4) return false;
      if (stage === 1) {
        const p = pylons.find(p => p.hp && near(boss.x+p.dx,boss.y+17,24,20));
        if (p) {
          fx.hit(b.x,b.y);
          if (!--p.hp) {
            fx.blast(boss.x+p.dx,boss.y+17); award(250);
            const intact=pylons.filter(p => p.hp).length;
            counter('I · SHIELD PYLONS',intact,2);
            if (!intact) phase(2);
          }
          return true;
        }
      } else if (near(boss.x,boss.y+18,stage===2 ? 29 : 23,23) && (stage===3 || portOpen)) {
        fx.hit(b.x,b.y);
        if (stage === 2) {
          counter('II · SIEGE ARMOR',--armor,siegeHp);
          if (!armor) { fx.blast(boss.x,boss.y+18,true); award(600); phase(3); }
        } else {
          counter('III · DRIVE CORE',--core,coreHp);
          if (!core) { fx.blast(boss.x,boss.y); award(2400); phase(4); volley=0; }
        }
        return true;
      }
      if (near(boss.x,boss.y,109,36)) {
        fx.hit(b.x,b.y,true);
        return true;
      }
      return false;
    }
    function draw(g) {
      g.save();
      for (const s of [...allies,...opponents]) art.capital(g,s,t);
      if (!stage) opponents.filter(s=>s.hp).forEach(s => {
        art.node(g,s.x-42,s.y+8,9,t); art.target(g,s.x-42,s.y+8,17,s.hp/batteryHp,t);
      });
      if (stage) {
        if (stage===2 && lanceClock<2.38) {
          const live=lanceClock>=1.85, y=boss.y+48;
          g.fillStyle=live ? '#ff77509c' : '#fa5c6b29';
          g.fillRect(lanceX-23,y,46,H-y);
          g.setLineDash(live ? [] : [6,7]);
          for (const dx of [-23,23]) line(g,lanceX+dx,y,lanceX+dx,H,'#ff8c7c',1);
          g.setLineDash([]);
          if (live) {
            line(g,boss.x,boss.y+16,lanceX,y,'#ffb365',9);
            line(g,lanceX,y,lanceX,H,'#ffdf8d',13); line(g,lanceX,y,lanceX,H,'#fff8d8',4);
          }
        }
        if (!split) art.flagship(g,boss,stage,t);
        if (stage===1) {
          g.strokeStyle='#9cc6e9ad'; g.fillStyle='#8bb7f813'; g.lineWidth=2;
          g.beginPath(); g.ellipse(boss.x,boss.y,124,59,0,0,Math.PI*2); g.fill(); g.stroke();
          pylons.filter(p=>p.hp).forEach(p => {
            art.node(g,boss.x+p.dx,boss.y+17,11,t); art.target(g,boss.x+p.dx,boss.y+17,17,p.hp/pylonHp,t);
          });
        }
        if (stage===2 && portOpen) {
          g.setLineDash([5,5]); line(g,rook.x,rook.y-14,boss.x,boss.y+18,'#92ffe0',2); g.setLineDash([]);
        }
        if (stage===3 || (stage===2 && portOpen)) {
          art.node(g,boss.x,boss.y+18,stage===3 ? 17 : 13,t);
          art.target(g,boss.x,boss.y+18,stage===3 ? 22 : 20,stage===3 ? core/coreHp : armor/siegeHp,t);
        }
      }
      for (const b of crossfire) {
        const x=b.x-b.vx*.088, y=b.y-b.vy*.088;
        line(g,x,y,b.x,b.y,b.ally ? '#5de5e966' : '#ff604f77',7);
        line(g,x,y,b.x,b.y,b.ally ? '#aaffee' : '#ffb888',3);
      }
      if (intercept && stage===3) line(g,rook.x,rook.y-10,intercept.x,intercept.y,'#adffe2',2);
      art.rook(g,rook,t);
      g.restore();
    }
    phase(0);
    return {update,hit,draw,resize};
  };
})();
