(() => {
  'use strict';
  const { width: W, height: baseHeight, art } = Starfall;
  const { campaign, audio } = Starfall;
  let H = baseHeight;
  let mission, missionIndex, entryScore, recorders, fleet;
  const $ = (id) => document.getElementById(id);
  const canvas = $('game'),
    ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const keys = new Set();
  const moveKeys = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pad = (n) => String(n).padStart(2, '0');
  let state, previous, player, enemies, shots, fx, wave, score, time, volley, nextWave, diveTimer;
  let pointer = null, lastFrame = 0, reinforcement = 0, salvo = 0;
  let pilotState;
  const portraits = {
    focused: ['assets/kurai-focused.webp', 'Kurai watches the flight instruments'],
    hit: ['assets/kurai-hit.webp', 'Kurai braces against the impact'],
    clear: ['assets/kurai.png', 'Kurai smiles as the sector clears'],
    lost: ['', 'Cockpit signal lost'],
  };
  function cockpit(next) {
    if (next === pilotState) return;
    pilotState = next;
    const [src, description] = portraits[next];
    const image = $('pilotImage');
    image.hidden = !src;
    if (src) image.src = src;
    image.alt = description;
    $('pilotSignal').hidden = !!src;
  }

  function vitals() {
    for (const key of ['shield', 'hull']) {
      const meter = $(key + 'Meter'),
        value = Math.ceil(player[key]);
      if (!meter.children.length) for (let i = 0; i < 12; i++) meter.append(document.createElement('i'));
      [...meter.children].forEach((segment, i) =>
        segment.classList.toggle('full', i < Math.ceil((value * 12) / 100)),
      );
      $(key + 'Value').textContent = value + '%';
    }
  }
  function formation() {
    enemies = mission.waves[wave].formation.map(([x, y, type], i) => ({
      x: x * W,
      y: y * H,
      homeX: x * W,
      homeY: y * H,
      type,
      phase: i * 1.4,
      dive: 0,
    }));
    for (const e of enemies) e.hp = mission.goal === 'blockade' ? 2 + Number(e.type === 1 && wave > 0) : 2;
    if (mission.goal === 'blockade') {
      $('wave').textContent = pad(wave + 1);
      $('announcement').textContent = 'Wave ' + (wave + 1) + ' of ' + mission.waves.length;
    } else if (mission.goal === 'warden') {
      enemies[0].hp = enemies[0].maxHp = 48;
      $('wave').textContent = '48';
    } else {
      $('wave').textContent = '00';
    }
    volley = 1.5;
    nextWave = 0;
    diveTimer = 4.5;
  }
  function fitField() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const height = Math.round(W * bounds.height / bounds.width);
    if (height === H) return;
    const ratio = height / H;
    H = height;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    if (!player) return;
    player.y = clamp(player.y * ratio, 62, H - 36);
    if (pointer) pointer.y *= ratio;
    for (const e of enemies) {
      e.y *= ratio;
      e.homeY *= ratio;
      if (e.aim) e.aim.y *= ratio;
    }
    for (const shot of shots) {
      shot.y *= ratio;
      shot.vy *= ratio;
    }
    for (const recorder of recorders) recorder.y *= ratio;
    fleet?.resize(H);
  }
  new ResizeObserver(fitField).observe(canvas);
  function reset(index, carriedScore) {
    fitField();
    missionIndex = index;
    mission = Starfall.missions[index];
    entryScore = carriedScore;
    recorders = (mission.recorders || []).map(([x, y], i) => ({ x: x * W, y: y * H, id: i + 1, progress: 0 }));
    const counters = { blockade: ['WAVE', '03'], salvage: ['RECORDERS', '03'], warden: ['WARDEN ARMOR', '48'], fleet: ['BATTERIES', '03'] };
    const [label, total] = counters[mission.goal];
    $('objectiveLabel').textContent = label;
    $('objectiveTotal').textContent = total;
    state = 'ready';
    wave = 0;
    score = carriedScore;
    time = 0;
    shots = [];
    reinforcement = 5;
    salvo = 0;
    $('signalClock').hidden = mission.goal !== 'salvage';
    if (mission.goal === 'salvage') {
      $('signalClock').textContent = 'SIGNAL  ' + mission.signalSeconds + 's';
      $('signalClock').classList.remove('urgent');
    }
    cockpit('focused');
    fx = Starfall.createFeedback();
    keys.clear();
    pointer = null;
    player = { x: W * 0.51, y: H * 0.8, bank: 0, shield: 100, hull: 100, invincible: 0, cooldown: 0, undamaged: 0 };
    $('score').textContent = String(score).padStart(6, '0');
    $('feedState').textContent = 'FLIGHT SYSTEM ONLINE';
    $('overlay').hidden = true;
    $('pauseBtn').disabled = false;
    pauseIcon(false);
    enemies = [];
    fleet = null;
    $('fleetRadio').hidden = mission.goal !== 'fleet';
    if (mission.goal === 'fleet') {
      fleet = Starfall.createFleet({
        height: H, fx, damage, award,
        recharge() {
          player.shield = Math.min(100, player.shield + 30);
          player.invincible = Math.max(player.invincible, 1.25);
          vitals();
        },
        hostileShot(x,y,vx,vy,plasma = false) { shots.push({x,y,vx,vy,ally:false,plasma}); },
        clearHostiles() { for (const b of shots) if (!b.ally) b.expired = true; },
      });
    } else formation();
    vitals();
    canvas.focus({ preventScroll: true });
    engage();
  }
  function engage() {
    if (state !== 'ready') return;
    state = 'active';
    $('feedState').textContent = 'FLIGHT SYSTEM ONLINE';
    audio.scene(mission.goal);
    audio.effect('launch');
  }
  function pauseIcon(paused) {
    $('pauseBtn').setAttribute('aria-label', paused ? 'Resume mission' : 'Pause mission');
    $('pauseBtn').innerHTML = paused
      ? '<svg viewBox="0 0 24 24"><path fill="currentColor" d="m6 3 15 9-15 9z"/></svg>'
      : '<svg><use href="#pause"/></svg>';
  }
  function dialog(label, title, desc, action) {
    $('resultLabel').textContent = label;
    $('resultTitle').textContent = title;
    $('resultText').textContent = desc;
    $('resultAction').textContent = action;
    $('overlay').hidden = false;
    $('resultAction').focus({ preventScroll: true });
    $('announcement').textContent = title + '. ' + desc;
  }
  function pause() {
    if (state === 'paused') {
      state = previous;
      audio.pause(false);
      $('overlay').hidden = true;
      pauseIcon(false);
      $('feedState').textContent = 'FLIGHT SYSTEM ONLINE';
      canvas.focus({ preventScroll: true });
    } else if (state === 'ready' || state === 'active') {
      previous = state;
      state = 'paused';
      audio.pause(true);
      keys.clear();
      pointer = null;
      pauseIcon(true);
      $('feedState').textContent = 'FLIGHT SYSTEM PAUSED';
      dialog('FLIGHT CONSOLE', 'PAUSED', 'Mission on hold.', 'RESUME');
    }
  }
  function finish(victory, reason) {
    state = victory ? 'victory' : 'defeat';
    cockpit(victory ? 'clear' : player.hull ? 'focused' : 'lost');
    keys.clear();
    pointer = null;
    $('pauseBtn').disabled = true;
    $('feedState').textContent = victory ? 'SECTOR CLEAR' : reason ? 'SIGNALS EXPIRED' : 'SIGNAL LOST';
    if (victory) campaign.save(missionIndex + 1, score);
    dialog(
      'MISSION ' + pad(missionIndex + 1) + '  /  ' + mission.name.toUpperCase(),
      victory ? 'MISSION CLEAR' : reason ? 'SIGNAL FADED' : 'GAME OVER',
      (victory ? mission.result : reason || 'Kurai’s ship was lost.') +
        '  Score ' +
        String(score).padStart(6, '0') +
        '.',
      victory ? 'OPEN TRANSMISSION' : 'RETRY MISSION',
    );
    audio.scene(null);
    audio.effect(victory ? 'clear' : 'lost');
  }
  function damage(amount, fromX, fromY) {
    if (player.invincible > 0) return;
    const absorbed = Math.min(player.shield, amount);
    player.shield -= absorbed;
    player.hull = Math.max(0, player.hull - amount + absorbed);
    player.invincible = 0.7;
    player.undamaged = 0;
    cockpit('hit');
    fx.hurt(player, amount > absorbed, fromX, fromY);
    vitals();
    if (!player.hull) {
      fx.blast(player.x, player.y, true);
      finish(false);
    }
  }
  function award(points) {
    score += points;
    $('score').textContent = String(score).padStart(6, '0');
  }
  function destroy(e, reward) {
    if (e.type === 3) {
      fx.fracture(e.x, e.y, 130, 76, g => art.enemy(g, {...e,x:65,y:38}, time));
    } else fx.blast(e.x, e.y);
    enemies.splice(enemies.indexOf(e), 1);
    if (reward) {
      award([100, 150, 200, 1500][e.type]);
    }
  }
  function fire() {
    if (player.cooldown > 0) return;
    for (const dx of [-14, 14])
      shots.push({ x: player.x + dx, y: player.y - 16, vx: 0, vy: -375 * H / baseHeight, ally: true });
    player.cooldown = 0.18;
    fx.fire();
  }
  function steer(dt) {
    let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    const len = Math.hypot(dx, dy) || 1;
    dx = (dx / len) * 245 * dt;
    dy = (dy / len) * 245 * dt * H / baseHeight;
    if (pointer) {
      const gap = Math.hypot(pointer.x - player.x, (pointer.y - player.y) * baseHeight / H) || 1;
      const step = Math.min(1, (340 * dt) / gap);
      dx = (pointer.x - player.x) * step;
      dy = (pointer.y - player.y) * step;
    }
    const lean = dt > 0 ? clamp(dx / (245 * dt), -1, 1) : 0;
    player.vx = dt > 0 ? dx / dt : 0;
    player.bank += (lean - player.bank) * Math.min(1, dt * 12);
    player.x = clamp(player.x + dx, 30, W - 30);
    player.y = clamp(player.y + dy, 62, H - 36);
    player.cooldown -= dt;
    player.invincible -= dt;
    player.undamaged += dt;
    if (pilotState === 'hit' && player.undamaged > 1 && player.hull > 35) cockpit('focused');
    if (player.shield < 100 && player.undamaged > 5) {
      const old = Math.ceil(player.shield);
      player.shield = Math.min(100, player.shield + 8 * dt);
      if (Math.ceil(player.shield) !== old) vitals();
    }
    if (keys.has(' ') || pointer) fire();
  }
  function attack(dt) {
    const config = mission.waves[wave];
    diveTimer -= dt;
    volley -= dt;
    if (mission.goal === 'blockade' && enemies.length && diveTimer <= 0) {
      const available = enemies.filter(e => !e.dive);
      if (available.length) {
        const e = available[Math.floor(Math.random() * available.length)];
        e.dive = 1;
        e.vx = clamp((player.x - e.x) * .62, -118, 118);
      }
      diveTimer = 4.8 - wave * .65;
    }
    for (const e of [...enemies]) {
      if (e.type === 3) {
        e.x = e.homeX + Math.sin(time * 0.64) * config.speed;
        e.y = e.homeY + Math.sin(time * 1.1) * 20;
      } else if (e.type === 2) {
        e.x = e.homeX + Math.sin(time * 1.25 + e.phase) * config.speed;
        const patrolY = e.homeY + Math.sin(time * .92 + e.phase) * 52;
        e.y = e.entering ? Math.min(patrolY, e.y + dt * 100) : patrolY;
        if (e.y >= patrolY) e.entering = false;
      } else if (e.dive) {
        e.y += dt * (125 + wave * 19) * H / baseHeight;
        e.x = clamp(e.x + e.vx * dt, 24, W - 24);
        if (e.y > H + 20) {
          e.dive = 2;
          e.y = -22;
          e.x = e.homeX;
          e.vx = 0;
        }
        if (e.dive === 2 && e.y >= e.homeY) e.dive = 0;
      } else {
        e.x = e.homeX + Math.sin(time * 0.85 + e.phase * 0.24) * config.speed;
        e.y = e.homeY + Math.sin(time * 1.3 + e.phase) * 5;
      }
      const contactWidth = e.type === 3 ? 60 : 24;
      if (Math.abs(e.x - player.x) < contactWidth && Math.abs(e.y - player.y) < 24) {
        if (e.type !== 3) destroy(e, false);
        damage(32, e.x, e.y);
        if (state !== 'active') return;
      }
    }
    if (mission.goal === 'salvage') {
      reinforcement -= dt;
      if (reinforcement <= 0 && enemies.length < 4) {
        const slot = salvo % config.formation.length;
        const [x, y] = config.formation[slot];
        enemies.push({x: x*W, y: -24, homeX: x*W, homeY: y*H, phase: time, type: 2, hp: 2, entering: true});
        reinforcement = 4.5;
      }
    }
    if (volley <= 0) {
      const guns = enemies.filter(e => !e.entering && !e.aim && e.y >= 0 && e.y < H);
      const count = mission.goal === 'blockade' && wave > 0 && salvo % 2 === 0 ? 2 : 1;
      for (let i = 0; i < count && guns.length; i++) {
        const [gun] = guns.splice(Math.floor(Math.random() * guns.length), 1);
        // Wingmen aim ahead of a crossing cutter. The lead gun covers its present lane.
        const lead = i === 1 || (gun.type === 1 && salvo % 3 === 1);
        const x = clamp(player.x + (lead ? player.vx * .8 : 0), 24, W - 24);
        gun.aim = {x, y: player.y, delay: .42 + .12*i};
      }
      volley = config.cadence;
      salvo++;
    }
    for (const e of enemies) {
      if (!e.aim || (e.aim.delay -= dt) > 0) continue;
      const y = e.y + (e.type === 3 ? 27 : 12);
      const angle = Math.atan2(e.aim.x - e.x, (e.aim.y - y) * baseHeight / H);
      const speed = 162 + wave * 20;
      let spread = e.type === 1 && wave > 0 ? [-.22, 0, .22] : [0];
      if (e.type === 2) spread = [0, .20];
      if (e.type === 3) spread = e.hp > e.maxHp / 2 ? [-.4, 0, .4] : [-.52, -.26, 0, .26, .52];
      audio.effect('hostile');
      for (const offset of spread) shots.push({
        x: e.x, y, vx: Math.sin(angle + offset)*speed, vy: Math.cos(angle + offset)*speed * H/baseHeight, ally: false,
      });
      e.aim = null;
    }
  }
  function projectiles(dt) {
    const keep = [];
    for (const b of shots) {
      if (b.expired) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -15 || b.y > H + 15 || b.x < -8 || b.x > W + 8) continue;
      if (b.ally) {
        if (fleet && fleet.hit(b)) continue;
        const hit = enemies.find((e) =>
          Math.abs(e.x - b.x) < (e.type === 3 ? 59 : 19) && Math.abs(e.y - b.y) < (e.type === 3 ? 26 : 16));
        if (hit) {
          hit.hp--;
          if (hit.type === 3) {
            $('wave').textContent = pad(hit.hp);
          }
          if (hit.hp > 0) fx.hit(b.x, b.y);
          if (!hit.hp) destroy(hit, true);
          continue;
        }
      } else if (Math.abs(b.x - player.x) < 15 && Math.abs(b.y - player.y) < 20) {
        damage(fleet ? 17 : 24, b.x, b.y);
        if (state !== 'active') return;
        continue;
      }
      keep.push(b);
    }
    shots = keep;
  }
  function tick(dt) {
    time += dt;
    if (state === 'ready') return;
    steer(dt);
    if (fleet) {
      if (fleet.update(dt, player)) { finish(true); return; }
    } else attack(dt);
    if (state !== 'active') return;
    projectiles(dt);
    if (state !== 'active') return;
    if (fleet) return;
    if (mission.goal === 'salvage') {
      const remaining = Math.max(0, Math.ceil(mission.signalSeconds - time));
      const clock = $('signalClock');
      const label = 'SIGNAL  ' + remaining + 's';
      if (clock.textContent !== label) {
        clock.textContent = label;
        clock.classList.toggle('urgent', remaining <= 15);
      }
      if (!remaining) {
        finish(false, 'The ice swallowed the remaining signals. Fly into each gold ring and hold until the recorder clears.');
        return;
      }
      for (const item of [...recorders]) {
        if (Math.hypot(player.x - item.x, player.y - item.y) > 43) continue;
        item.progress = Math.min(1, item.progress + dt / 3.2);
        if (item.progress < 1) continue;
        recorders.splice(recorders.indexOf(item), 1);
        const collected = mission.recorders.length - recorders.length;
        $('wave').textContent = pad(collected);
        $('announcement').textContent = 'Recorder ' + collected + ' of ' + mission.recorders.length + ' recovered.';
        award(300);
        fx.burst(item.x, item.y, ['#ffda8a', '#a7ffe2'], 22);
        audio.effect('salvage');
      }
      if (!recorders.length) finish(true);
      return;
    }
    if (!enemies.length) {
      if (!nextWave) {
        nextWave = 1.3;
        shots = shots.filter((b) => b.ally);
      }
      nextWave -= dt;
      if (nextWave <= 0) {
        if (wave + 1 === mission.waves.length) {
          finish(true);
        } else {
          wave++;
          shots = [];
          formation();
          audio.effect('phase');
        }
      }
    }
  }
  function render() {
    art.scene(ctx, time, missionIndex);
    ctx.save();
    fx.camera(ctx);
    if (fleet) fleet.draw(ctx);
    recorders.forEach((item) => art.recorder(ctx, item, time));
    enemies.forEach(e => {
      art.enemy(ctx, e, time);
      if (e.aim) {
        const r = 3 + 4 * Math.max(0, 1 - e.aim.delay / .42);
        art.rect(ctx, e.x-r, e.y+12-r, r*2, r*2, '#ff985f');
        art.rect(ctx, e.x-2, e.y+10, 4, 4, '#fff7cf');
      }
    });
    fx.draw(ctx);
    shots.forEach((b) => art.shot(ctx, b));
    if (player.hull > 0) fx.ship(ctx, player, time);
    ctx.restore();
  }
  function frame(now) {
    const dt = Math.min(0.045, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!$('flightScreen').hidden) {
      if (state === 'active') tick(fx.advance(dt));
      else if (state === 'defeat' || state === 'victory') fx.advance(dt);
      render();
    }
    requestAnimationFrame(frame);
  }
  document.addEventListener('keydown', (e) => {
    if ($('flightScreen').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'p' || k === 'escape') {
      e.preventDefault();
      if (!e.repeat) pause();
      return;
    }
    if (state !== 'active' && state !== 'ready') return;
    if (!moveKeys.includes(k) && k !== ' ') return;
    if (k === ' ' && document.activeElement instanceof HTMLButtonElement) return;
    e.preventDefault();
    engage();
    keys.add(k);
  });
  document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  // The lower pad mirrors the entire field, leaving the ship visible above the thumb.
  for (const surface of [canvas, $('touchPad')]) {
    function locate(e) {
      const bounds = surface.getBoundingClientRect();
      const offset = surface === canvas && e.pointerType === 'touch' ? 34 : 0;
      return {
        id: e.pointerId,
        x: (e.clientX - bounds.left) * W / bounds.width,
        y: (e.clientY - bounds.top) * H / bounds.height - offset,
      };
    }
    surface.addEventListener('pointerdown', (e) => {
      if (pointer || e.button !== 0 || !['ready', 'active'].includes(state)) return;
      canvas.focus({ preventScroll: true });
      engage();
      surface.setPointerCapture(e.pointerId);
      pointer = locate(e);
    });
    surface.addEventListener('pointermove', (e) => {
      if (pointer?.id === e.pointerId) pointer = locate(e);
    });
    surface.addEventListener('lostpointercapture', (e) => {
      if (pointer?.id === e.pointerId) pointer = null;
    });
  }
  window.addEventListener('blur', () => {
    if (state === 'active') pause();
    keys.clear();
    pointer = null;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'active') pause();
  });
  for (const id of ['sound','music']) {
    $(id).addEventListener('click', () => {
      if (state === 'active') canvas.focus({ preventScroll: true });
    });
  }
  $('pauseBtn').addEventListener('click', pause);
  $('resultAction').addEventListener('click', () => {
    if (state === 'paused') pause();
    else if (state === 'defeat') reset(missionIndex, entryScore);
    else if (state === 'victory') {
      state = 'story';
      campaign.story();
    }
  });
  $('returnTitle').addEventListener('click', () => {
    keys.clear();
    pointer = null;
    state = 'title';
    campaign.title();
  });
  campaign.init(reset);
  requestAnimationFrame(frame);
})();
