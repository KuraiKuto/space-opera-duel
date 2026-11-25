'use strict';

/* Start-up: wire the pieces together and open the title (or a mission or story scene, with ?mission= / ?story=). */
(function (SO) {
  SO.input.init();
  SO.engine.init();
  SO.screens.init();

  const loading = document.getElementById('loading');

  SO.assets.load(() => {
    const dev = SO.dev;
    loading.hidden = true;
    if (dev.mission && SO.missions.get(dev.mission)) {
      SO.campaign.fly(dev.mission, { startWave: dev.wave, startPhase: dev.phase });
    } else if (dev.story && SO.story.get(dev.story)) {
      SO.engine.setScene(new SO.scenes.Story(dev.story, () => SO.engine.setScene(SO.scenes.title)));
    } else {
      SO.engine.setScene(SO.scenes.title);
    }
    SO.engine.start();
  }, (loaded, total) => {
    loading.textContent = 'Loading ' + Math.round(loaded / total * 100) + '%';
  });
})(window.SO);
