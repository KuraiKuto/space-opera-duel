'use strict';

/* Story scenes: the dialogue between missions. Each file in this folder calls SO.story.add({...});
   js/scenes/story.js plays them. A mission names its scenes with storyBefore / storyAfter.

   A scene:
     id
     backdrop   a place picture: a key of the manifest in js/core/assets.js
     tint       colour laid over the picture so the cast stands out
     music      the song under the scene (js/audio/songs); 'bridge', the quiet one, if it names none
     beats      what happens, in order. Each beat is one of:
       { place: 'Hollow Moon', sub: '...' }       the location title
       { card: '...' }                             narration, centred on the screen
       { who: 'kurai', mood: 'cheer', text: '' }   a line of dialogue (mood is optional;
                                                   moods are listed in js/story/cast.js)
       { leave: 'guren' }                          someone drops off the channel
       { aboard: 'guren' }                         a caller comes aboard, and stands between the crew from then on
       { backdrop: 'reachLit', tint: '#061230' }   the place changes (a slow cross-fade)
       { music: 'eclipse', level: 0 }              the music changes (level: how many of the song's layers play)
       { end: 'The End', sub: '...' }              closing title
                                                   (add cast: { kurai: 'cheer', ... } to keep those people
                                                   lit, in those moods, with the title across their feet)

   Kurai and Akari stand on the bridge of the Foxfire, left and right (bridge in js/story/cast.js).
   Everyone else calls in on the comm screen between them, one caller at a time. */
(function (SO) {
  const byId = {};

  SO.story = {
    add(scene) { byId[scene.id] = scene; },
    get(id) { return byId[id] || null; },
  };
})(window.SO);
