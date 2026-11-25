'use strict';

/* After mission 04: the ending. The light comes back, Guren is aboard for once,
   and when Kurai calls the Fleet this time, it answers. */
(function (SO) {
  SO.story.add({
    id: 's06',
    backdrop: 'eclipseSky',
    tint: '#050b24',
    beats: [
      { card: 'The Eclipse broke apart over Meridian, and all the light it had ever swallowed came pouring back out.' },
      { card: 'Down the lanes it ran, Lantern to Lantern. From the Shiver to Hollow Moon, the Reach lit up.' },
      { backdrop: 'reachLit', tint: '#061230' },
      { music: 'theme' }, // the main theme, in full, to the end
      { place: 'The Reach', sub: 'Every Lantern lit' },

      { who: 'akari', text: 'Hollow Moon is burning again, Captain. That is the last of them. Every Lantern in the Reach is lit.' },
      { who: 'kurai', mood: 'cheer', text: 'Every single one! ...Wait. The Redfang. He flew straight into that thing. Akari, where is Guren?' },
      { who: 'akari', text: 'In our cargo bay, Captain. You towed him in yourself. He has been complaining for an hour.' },
      { aboard: 'guren' },
      { who: 'guren', mood: 'angry', text: 'You scratched my ship AGAIN, fox! There is a hole in it the size of a moth!' },
      { who: 'kurai', mood: 'cheer', text: 'You flew it into a mothership! On purpose! For me!' },
      { who: 'guren', text: 'For the debt. One more job, I said. Now we are even.' },
      { who: 'akari', text: 'On that subject. The Admiral\'s escape pod is circling the Great Lantern. It keeps bumping into the glass.' },
      { who: 'kurai', mood: 'steady', text: 'Aw. Ask the lamplighters to leave a porch light on for her. A small one.' },

      { who: 'kurai', mood: 'steady', text: 'Akari, open a channel. Foxfire to the Fleet. ...Anyone?' },
      { who: 'akari', text: 'Answers on every channel, Captain. I have counted the beacons twice. Forty-two. We are the Fleet.' },
      { who: 'kurai', mood: 'cheer', text: 'A fleet needs captains. And I know a wolf with no ship and nothing to do.' },
      { who: 'guren', mood: 'angry', text: 'I am NOT joining your Fleet!' },
      { who: 'guren', mood: 'grin', text: '...I am flying next to it. Permanently.' },
      { who: 'kurai', mood: 'cheer', text: 'Akari! Are you smiling?' },
      { who: 'akari', mood: 'smile', text: 'No, Captain.' },
      { who: 'kurai', mood: 'cheer', text: 'Then that\'s everyone. Lights on. Let\'s fly!' },

      { card: 'As long as one ship flies, the Fleet flies.' },
      { end: 'The End', sub: 'Kurai and the Fallen Fleet', cast: { kurai: 'cheer', guren: 'grin', akari: 'smile' } },
    ],
  });
})(window.SO);
