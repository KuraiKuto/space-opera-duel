'use strict';

/* Before mission 01. The Fleet has fallen; Kurai and Akari are what is left; Guren comes to collect. */
(function (SO) {
  SO.story.add({
    id: 's01',
    backdrop: 'hollowMoon',
    tint: '#060a1c',
    beats: [
      { card: 'Between the stars of the Reach lies the Murk: a dark that swallows ships whole.' },
      { card: 'The Lanterns light the safe lanes through it. For a thousand years, the Lantern Fleet kept them burning.' },
      { card: 'Then the Pyre came, and put the Lanterns out one by one. At Hollow Moon, the Fleet made its stand.' },
      { card: 'It lasted an hour.' },
      { place: 'Hollow Moon', sub: 'Graveyard of the Lantern Fleet' },

      { who: 'kurai', mood: 'steady', text: 'Foxfire to the Fleet. Anyone? ...Anyone at all?' },
      { who: 'akari', text: 'No answer on any channel, Captain. I have counted the beacons twice. We are the Fleet.' },
      { who: 'kurai', mood: 'cheer', text: 'Then the Fleet is still flying! That\'s the good news.' },
      { who: 'akari', text: 'The other news is a Pyre squadron picking through the wrecks. They will find us in two minutes.' },
      { who: 'akari', mood: 'alarm', text: 'And we are being hailed. Not by the Pyre. A private ship: the Redfang.' },
      { who: 'kurai', mood: 'alarm', text: 'The Redfang? ...Guren.' },

      { who: 'guren', text: 'Kurai! Still yapping. I told you that Fleet would get you killed.' },
      { who: 'kurai', mood: 'steady', text: 'You walked out on us, Guren.' },
      { who: 'guren', text: 'And look which of us is still in one piece. The Pyre pays by the tail for Lantern captains. Yours is the last one.' },
      { who: 'guren', text: 'Nothing personal, little fox.' },
      { leave: 'guren' },

      { music: 'battle' }, // the mission's song, its quiet layer only: the fight is coming
      { who: 'akari', text: 'He has cut the channel. The squadron is closing. Your orders, Captain?' },
      { who: 'kurai', mood: 'steady', text: 'Same as always, Akari. As long as one ship flies, the Fleet flies.' },
      { who: 'kurai', mood: 'cheer', text: 'Lights on. Let\'s fly!' },
    ],
  });
})(window.SO);
