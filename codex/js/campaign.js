(() => {
  'use strict';
  const { missions, scenes, crew } = Starfall;
  const $ = (id) => document.getElementById(id);
  const number = (n) => String(n).padStart(2, '0');
  const saveKey = 'starfall.last-relay.checkpoint';
  let checkpoint = null, sortie = null, chapter = 0, line = 0, launch;

  function readCheckpoint() {
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey));
      if (saved && Number.isInteger(saved.chapter) && saved.chapter >= 0 && saved.chapter <= missions.length &&
          Number.isSafeInteger(saved.score) && saved.score >= 0) return saved;
    } catch { /* Storage is optional for local-file play. */ }
    return null;
  }
  function save(next, score) {
    if (sortie) {
      sortie = { chapter: next, score };
      return;
    }
    checkpoint = { chapter: next, score };
    try { localStorage.setItem(saveKey, JSON.stringify(checkpoint)); } catch {}
  }
  function screen(id) {
    for (const view of ['titleScreen', 'storyScreen', 'flightScreen']) $(view).hidden = view !== id;
    $('pauseBtn').hidden = id !== 'flightScreen';
    if (id !== 'flightScreen') Starfall.audio.scene(id === 'titleScreen' ? 'theme' : 'story');
    window.scrollTo(0, 0);
  }
  function title(focus = true) {
    sortie = null;
    screen('titleScreen');
    $('begin').querySelector('span').textContent = checkpoint ? 'CONTINUE CAMPAIGN' : 'BEGIN CAMPAIGN';
    if (focus) $('begin').focus({ preventScroll: true });
  }
  function showLine() {
    const scene = scenes[chapter];
    const [name, words] = scene[line];
    const speaker = crew[name];
    $('speakerImage').src = name === 'Kurai' && chapter < missions.length ? 'assets/kurai-focused.webp' : speaker.image;
    $('speakerName').textContent = name.toUpperCase();
    $('speakerRole').textContent = speaker.role.toUpperCase();
    $('lineText').textContent = words;
    $('lineCount').textContent = number(line + 1) + ' / ' + number(scene.length);
    const last = line === scene.length - 1;
    let action = 'NEXT  →';
    if (last) action = chapter === missions.length ? 'END CAMPAIGN  ✓' : 'LAUNCH MISSION  ▸';
    $('advance').textContent = action;
    $('announcement').textContent = name + '. ' + words;
  }
  function story() {
    if (!sortie && !checkpoint) save(0, 0);
    chapter = (sortie || checkpoint).chapter;
    line = 0;
    const ending = chapter === missions.length;
    const place = missions[Math.min(chapter, missions.length - 1)];
    screen('storyScreen');
    $('storyScreen').style.backgroundImage = 'url("' + (ending ? 'assets/vesper.webp' : place.art) + '")';
    $('storyChapter').textContent = ending ? 'EPILOGUE  /  CAMPAIGN COMPLETE' : 'MISSION ' + number(chapter + 1) + '  /  SECTOR ' + place.sector;
    $('storyLocation').textContent = ending ? 'THE LONG WAY HOME' : place.name.toUpperCase();
    showLine();
    $('advance').focus({ preventScroll: true });
  }
  function leaveScene() {
    if (chapter === missions.length) {
      const finalScore = (sortie || checkpoint).score;
      if (!sortie) {
        checkpoint = null;
        try { localStorage.removeItem(saveKey); } catch {}
      }
      title();
      $('announcement').textContent = 'Campaign complete. Final score ' + finalScore + '.';
      return;
    }
    const mission = missions[chapter];
    screen('flightScreen');
    $('missionNumber').textContent = 'MISSION ' + number(chapter + 1);
    $('missionName').textContent = mission.name.toUpperCase();
    $('missionObjective').textContent = mission.objective;
    $('sectorName').textContent = 'SECTOR ' + mission.sector;
    $('flightScreen').style.setProperty('--panorama', 'url("' + mission.art + '")');
    launch(chapter, (sortie || checkpoint).score);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function picture(src, className) {
    const img = element('img', className);
    img.src = src;
    img.alt = '';
    return img;
  }
  function archive(label, heading, content) {
    $('archiveLabel').textContent = label;
    $('archiveTitle').textContent = heading.toUpperCase();
    $('archiveBody').replaceChildren(...content);
    $('archive').showModal();
    $('closeArchive').focus();
  }
  function dossier() {
    const rows = Object.entries(crew).map(([name, person]) => {
      const row = element('section', 'crew-row');
      const bio = element('div');
      bio.append(element('div', 'speaker-role', person.role.toUpperCase()), element('h3', '', name.toUpperCase()), element('p', '', person.bio));
      row.append(picture(person.image), bio);
      return row;
    });
    archive('MERIDIAN LINE', 'Crew dossier', rows);
  }
  function brief(mission, index) {
    const info = element('div', 'brief-info');
    info.append(element('div', 'speaker-role', 'OBJECTIVE'), element('p', '', mission.objective),
      element('div', 'speaker-role', 'HOSTILES'), element('p', '', mission.threat));
    archive('MISSION ' + number(index + 1) + '  /  SECTOR ' + mission.sector, mission.name, [picture(mission.art, 'brief-art'), info]);
  }
  function routeCard(mission, index) {
    const card = element('button', 'route-card');
    const body = element('span', 'card-body');
    body.innerHTML = '<svg aria-hidden="true"><use href="#next"/></svg>';
    body.append(element('strong', '', mission.name.toUpperCase()), element('small', '', mission.call));
    const tag = 'MISSION ' + number(index + 1) + (mission.goal === 'fleet' ? ' / FINALE' : '');
    card.append(picture(mission.art), element('span', 'mission-tag', tag), body);
    card.addEventListener('click', () => brief(mission, index));
    return card;
  }
  Starfall.campaign = {
    init(startMission) {
      launch = startMission;
      const expand = $('expand');
      expand.hidden = !document.fullscreenEnabled;
      expand.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
        } catch { $('announcement').textContent = 'Full screen is unavailable in this window.'; }
      });
      document.addEventListener('fullscreenchange', () => {
        const label = document.fullscreenElement ? 'Exit full screen' : 'Enter full screen';
        expand.setAttribute('aria-label', label);
        expand.title = label;
        if (!$('flightScreen').hidden && $('overlay').hidden) $('game').focus({ preventScroll: true });
      });
      checkpoint = readCheckpoint();
      $('sectorCount').textContent = number(missions.length) + ' SECTORS';
      $('routeCards').append(...missions.map(routeCard));
      $('playFinale').addEventListener('click', () => {
        const finale = missions.length - 1;
        if (checkpoint?.chapter !== finale) sortie = { chapter: finale, score: 0 };
        story();
      });
      $('begin').addEventListener('click', story);
      $('dossier').addEventListener('click', dossier);
      $('closeArchive').addEventListener('click', () => $('archive').close());
      $('archive').addEventListener('click', (event) => {
        if (event.target !== $('archive')) return;
        const r = $('archive').getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('archive').close();
      });
      $('advance').addEventListener('click', () => {
        if (line + 1 === scenes[chapter].length) leaveScene();
        else { line++; showLine(); }
      });
      $('skipScene').addEventListener('click', leaveScene);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.repeat && !event.altKey && !event.metaKey && !event.ctrlKey &&
            !$('titleScreen').hidden && !$('archive').open && !(document.activeElement instanceof HTMLButtonElement)) {
          event.preventDefault();
          story();
        }
      });
      title(false);
    },
    title, story, save,
  };
})();
