'use strict';

/* Before mission 02. Guren lets slip where the lamplighters are; the Pyre is not there to capture them. */
(function (SO) {
  SO.story.add({
    id: 's02',
    backdrop: 'shiver',
    tint: '#070b24',
    beats: [
      { place: 'The Shiver', sub: 'Ice fields on the lane to Meridian' },

      { who: 'akari', text: 'The Redfang limped off with one engine, Captain. I would call that a win. A small one.' },
      { who: 'kurai', mood: 'cheer', text: 'A win is a win! Did you see his face?' },
      { who: 'akari', text: 'It was a voice channel.' },
      { who: 'kurai', mood: 'cheer', text: 'I imagined it very clearly!' },
      { who: 'akari', text: 'Before he ran, he was talking to the Pyre. They have a new job for him: a lamplighter barge, crossing the Shiver tonight.' },
      { who: 'kurai', mood: 'alarm', text: 'Lamplighters? Out here? What are they carrying?' },
      { who: 'akari', text: 'The Kindling. The first flame, carried out of Meridian before the Great Lantern went dark. With it, a Lantern can be lit again.' },
      { who: 'kurai', mood: 'steady', text: 'Then that barge is the most important ship in the Reach. And it has no guns.' },
      { who: 'akari', text: 'It has us: one fighter, patched armour, and a captain who talks to wrecks.' },
      { who: 'kurai', mood: 'cheer', text: 'See? Practically an escort fleet.' },

      { who: 'guren', text: 'Fox. You scratched my ship. I am adding it to your bill.' },
      { who: 'guren', text: 'Stay out of the Shiver. The barge is mine. The Pyre wants it whole, and I deliver whole.' },
      { who: 'kurai', mood: 'steady', text: 'It\'s full of lamplighters, Guren. You grew up under their lights, same as me.' },
      { who: 'guren', text: '...I grew up. That is the difference.' },
      { leave: 'guren' },

      { music: 'battle' },
      { who: 'akari', mood: 'alarm', text: 'Captain. Pyre bombers on the scope, ahead of him. They are not here to take anything whole.' },
      { who: 'kurai', mood: 'steady', text: 'Then we stay close to the barge, and nothing gets through. Let\'s fly!' },
    ],
  });
})(window.SO);
