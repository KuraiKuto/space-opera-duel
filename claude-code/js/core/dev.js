'use strict';

/* Development shortcuts, read from the page address:
     index.html?mission=m02          skip the title and the story, start that mission
     index.html?mission=m02&wave=4   start at wave 4
     index.html?mission=m02&god=1    the ship (and whatever it escorts) takes no damage
     index.html?mission=m04&wave=4&phase=3   start the Eclipse at phase 2 or 3 (4: one hit from the end)
     index.html?story=s03            play one story scene, then go to the title */
(function (SO) {
  let params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = new Map(); }
  SO.dev = {
    mission: params.get('mission') || null,
    story: params.get('story') || null,
    wave: Math.max(1, parseInt(params.get('wave'), 10) || 1),
    god: params.get('god') === '1',
    phase: parseInt(params.get('phase'), 10) || 1,
  };
})(window.SO);
