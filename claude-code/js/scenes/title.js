'use strict';

/* Title scene. The picture, logo and menu are HTML (index.html, css/game.css);
   this scene fills in the menu from the player's progress and starts the story.

   A browser allows no sound before the first key or click, so the first visit shows the logo and
   "Press any key": that key lets the main theme start, and brings up the menu. */
(function (SO) {
  const label = (mission) => 'Mission ' + String(mission.number).padStart(2, '0');
  let woken = false; // true once any key has been pressed on the title

  SO.scenes.title = {
    kind: 'title',

    enter() {
      this.cold = !woken && !SO.audio.ready;
      this.show();
      SO.audio.muffle(0);
      SO.music.play('theme');
    },

    show() {
      const resume = SO.campaign.resume();
      const cleared = SO.campaign.cleared();
      const all = SO.missions.list;
      this.primary = resume ? 'continue' : 'start';

      SO.screens.show('title', {
        cold: this.cold,
        hasResume: !!resume,
        startLabel: cleared >= all.length ? 'Play again' : 'Begin the story',
        note: resume ? 'Next: ' + label(resume) + ' · ' + resume.title
          : cleared >= all.length ? 'Every Lantern is lit. The Fleet flies on.' : '',
      });
      SO.screens.fillList('missions', all.map((mission) => {
        const open = SO.campaign.isUnlocked(mission.id);
        return {
          action: 'mission:' + mission.id,
          disabled: !open,
          tag: String(mission.number).padStart(2, '0'),
          text: open ? mission.title : 'Locked',
          note: open ? mission.place : '',
        };
      }));
    },

    exit() { SO.screens.hide(); },

    update() {
      if (this.cold) {
        if (!SO.input.any()) return;
        this.cold = false;
        woken = true;
        this.show();
        SO.audio.play('banner');
        return; // that key woke the title; it does not also start the game
      }
      if (SO.input.pressed('confirm')) this.onAction(this.primary);
    },

    draw(ctx) {
      ctx.fillStyle = SO.pal.ink;
      ctx.fillRect(0, 0, SO.W, SO.H);
    },

    onAction(action) {
      let missionId = null;
      if (action === 'start') missionId = SO.missions.first().id;
      else if (action === 'continue') missionId = (SO.campaign.resume() || SO.missions.first()).id;
      else if (action.indexOf('mission:') === 0 && SO.campaign.isUnlocked(action.slice(8))) missionId = action.slice(8);
      if (!missionId) return;
      SO.audio.unlock();
      SO.audio.play('ui');
      SO.campaign.play(missionId);
    },
  };
})(window.SO);
