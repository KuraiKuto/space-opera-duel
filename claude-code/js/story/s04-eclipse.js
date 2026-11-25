'use strict';

/* After mission 03. The Lantern burns again, and the Pyre's flagship comes to put it out.
   It leads straight into s05, the scene before the last mission. */
(function (SO) {
  SO.story.add({
    id: 's04',
    backdrop: 'meridianLit',
    tint: '#050b24',
    beats: [
      { card: 'At Meridian, the Great Lantern burns again. Its light runs down the lanes, and all across the Reach, people look up.' },
      { place: 'Meridian', sub: 'The Great Lantern, lit' },

      { who: 'akari', text: 'Signals, Captain. Dozens of them. Freighters, ferries, an old patrol cutter. They saw the light. They are asking where the Fleet is.' },
      { who: 'kurai', mood: 'cheer', text: 'Tell them: right here! All two of us!' },
      { who: 'guren', text: 'I got my money. Do not count me.' },
      { who: 'kurai', mood: 'cheer', text: 'All three of us!' },
      { music: 'eclipse' }, // the Eclipse's song, at its darkest: a drone, a bell, a heartbeat
      { who: 'akari', mood: 'alarm', text: 'Captain. Something is rising out of the Murk. Something very large. The Lantern is flickering.' },
      { who: 'guren', text: 'The Eclipse. The Pyre\'s flagship. It does not snuff Lanterns, fox. It eats them.' },
      { who: 'kurai', mood: 'alarm', text: 'It\'s bigger than the whole Fleet was...' },
      { who: 'kurai', mood: 'steady', text: 'Then it\'ll have to get past the Fleet that\'s left.' },
      { who: 'guren', text: '...One more job. After that, we are even.' },
      { who: 'akari', text: 'Noted for the log: the Lantern Fleet is three strong, and one of us is pretending not to be.' },

      { end: 'The Eclipse is coming', sub: 'And the Reach is answering' },
    ],
  });
})(window.SO);
