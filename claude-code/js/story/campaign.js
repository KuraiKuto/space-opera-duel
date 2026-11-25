'use strict';

/* The campaign: the order things happen in, and how far the player has got.
   Missions run in the order of js/missions; a mission's storyBefore scene plays before it,
   and storyAfter (the last mission's epilogue) after its victory. */
(function (SO) {
  SO.campaign = {
    /* How many missions have been won, counting from the first. */
    cleared() {
      return Math.min(SO.missions.list.length, SO.storage.get('cleared', 0));
    },

    isUnlocked(missionId) {
      const index = SO.missions.list.indexOf(SO.missions.get(missionId));
      return index >= 0 && index <= this.cleared();
    },

    /* The mission "Continue" leads to, or null when there is nothing to continue. */
    resume() {
      const n = this.cleared();
      return n > 0 && n < SO.missions.list.length ? SO.missions.list[n] : null;
    },

    complete(missionId) {
      const index = SO.missions.list.indexOf(SO.missions.get(missionId));
      if (index + 1 > this.cleared()) SO.storage.set('cleared', index + 1);
    },

    /* Play a mission as the story tells it: its dialogue scene, then the flying. */
    play(missionId) {
      const mission = SO.missions.get(missionId) || SO.missions.first();
      const fly = () => this.fly(mission.id);
      if (mission.storyBefore && SO.story.get(mission.storyBefore)) {
        SO.engine.setScene(new SO.scenes.Story(mission.storyBefore, fly));
      } else {
        fly();
      }
    },

    /* Straight to the flying (retry, development shortcuts). */
    fly(missionId, options) {
      SO.engine.setScene(new SO.scenes.Mission(missionId, options));
    },

    /* What follows a mission, if anything. */
    hasMore(missionId) {
      const mission = SO.missions.get(missionId);
      return !!(SO.missions.next(missionId) || (mission && mission.storyAfter));
    },

    /* On from a victory: the epilogue if this mission has one, then the next mission or the title. */
    advance(missionId) {
      const mission = SO.missions.get(missionId);
      const next = SO.missions.next(missionId);
      const onward = () => {
        if (next) this.play(next.id);
        else SO.engine.setScene(SO.scenes.title);
      };
      if (mission && mission.storyAfter && SO.story.get(mission.storyAfter)) {
        SO.engine.setScene(new SO.scenes.Story(mission.storyAfter, onward));
      } else {
        onward();
      }
    },
  };
})(window.SO);
