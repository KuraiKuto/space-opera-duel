'use strict';

/* Before mission 03. The Pyre has turned on Guren; he flies to Meridian with Kurai, angrily. */
(function (SO) {
  SO.story.add({
    id: 's03',
    backdrop: 'meridianDark',
    tint: '#1a0612',
    beats: [
      { place: 'Meridian', sub: 'The Great Lantern, dark for the first time in a thousand years' },

      { who: 'akari', text: 'The Tinderbox is through, Captain. Forty lamplighters, one flame, no losses. They asked me to thank the Fleet.' },
      { who: 'kurai', mood: 'cheer', text: 'Tell them the whole Fleet says you\'re welcome!' },
      { who: 'akari', text: 'The Kindling has to be lit at Meridian, and the Pyre has Meridian in a cage: three Snuffers, clamped on the Great Lantern, drinking its light.' },
      { who: 'kurai', mood: 'steady', text: 'Three clamps, one ship. I like those odds better than this morning\'s.' },
      { who: 'akari', text: 'There is a hail. I think you should take this one.' },

      { who: 'guren', text: 'They bombed the barge. I said whole. They said the contract had changed. Then they said mine had, too.' },
      { who: 'guren', mood: 'angry', text: 'The Pyre shot at the Redfang, fox. At MY ship!' },
      { who: 'kurai', mood: 'steady', text: 'Sounds like you could use a fleet.' },
      { who: 'guren', text: 'I could use my money. It is sitting in a Pyre forge at Meridian, and you are flying there anyway.' },
      { who: 'akari', text: 'For the record, Captain: this morning he was collecting your tail.' },
      { who: 'kurai', mood: 'cheer', text: 'And now he\'s my wingman! This is the best day.' },
      { who: 'guren', mood: 'angry', text: 'I am NOT your wingman. I am flying next to you. Angrily.' },
      { leave: 'guren' },

      { music: 'battle' },
      { who: 'akari', text: 'Wardens on the forge line, Captain. Armoured. And the Lantern has very little light left to lose.' },
      { who: 'kurai', mood: 'steady', text: 'Then we don\'t let them take any more. Break the clamps. Light the Lantern. Let\'s fly!' },
    ],
  });
})(window.SO);
