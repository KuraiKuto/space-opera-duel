'use strict';

/* Before mission 04. The Reach has answered the light: a fleet of ferries, and two ships with guns.
   Guren knows how the Eclipse fights. Its Admiral calls to gloat, and turns out to be a moth. */
(function (SO) {
  SO.story.add({
    id: 's05',
    backdrop: 'meridianLit',
    tint: '#050b24',
    // Kept short on purpose: this is the scene between the player and the last battle. What each phase
    // of the Eclipse asks for is said again on the radio when it happens (js/missions/m04-lights-on.js).
    beats: [
      { place: 'Meridian', sub: 'One hour before the Eclipse' },

      { who: 'akari', text: 'They came, Captain. Forty-one ships. Two have guns: the Vigil, an old Fleet cruiser. And the Marigold. A grain freighter. Someone has welded cannons to it.' },
      { who: 'kurai', mood: 'cheer', text: 'A grain freighter with cannons! Akari, that is the best ship I have ever heard of.' },

      { who: 'guren', text: 'Stop grinning and listen, fox. I flew escort for that monster. First, the guns on its rim. Then it pulls the dark over the sky and hides behind three shade vanes.' },
      { who: 'guren', text: 'I know where they are. I put a light on them, you break them. Try to keep up.' },
      { who: 'akari', text: 'For the log: Captain Guren has volunteered to carry a light for the Lantern Fleet.' },
      { who: 'guren', mood: 'angry', text: 'I am NOT a lamplighter! I am pointing at things! With a lamp!' },
      { leave: 'guren' },

      { music: 'eclipse', level: 1 }, // her song
      { who: 'kagari', text: 'So this is the Lantern Fleet. A fox, an owl, forty ferries, and my worst-paid wolf.' },
      { who: 'kagari', text: 'A thousand years of light, calling and calling. I am not your enemy, little fox. I am simply still at dinner.' },
      { who: 'kurai', mood: 'steady', text: 'Akari. The mothership is run by a moth.' },
      { who: 'akari', text: 'I noticed, Captain. Please do not.' },
      { who: 'kurai', mood: 'cheer', text: 'It\'s a MOTH-ership!' },
      { who: 'kagari', mood: 'rage', text: 'Put him out. Put them ALL out!' },
      { leave: 'kagari' },

      { music: 'theme' }, // ...and his
      { who: 'kurai', mood: 'cheer', text: 'Foxfire to the Fleet! Lights on. Let\'s fly!' },
    ],
  });
})(window.SO);
