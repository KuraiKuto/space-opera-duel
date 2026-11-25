# Kurai and the Fallen Fleet

A browser space opera. Plain HTML, CSS and JavaScript on a canvas: no libraries, no build step.
Open `index.html` in a browser to play (double-click works; no server needed). It plays with a
keyboard, or with one finger on a phone or tablet.

To share it, put the folder as it is (`index.html`, `css/`, `js/`, `assets/`) on any static web host.

## The story

Between the stars of the Reach lies the Murk, a dark that swallows ships. The **Lanterns** light the safe
lanes through it, and for a thousand years the **Lantern Fleet** kept them burning. Then the **Pyre** came
and put them out one by one. At Hollow Moon the Fleet made its stand, and lost.

- **Kurai**: captain of the *Foxfire*, the last ship of the Fleet. Cheerful past all reason.
- **Akari**: his first officer. Dry, exact, and the voice on the radio.
- **Guren**: captain of the *Redfang*. He walked out on the Fleet years ago and hunts for whoever pays.
  At first the Pyre pays.
- **Kagari**: Grand Admiral of the Pyre, aboard its mothership, the *Eclipse*. A moth. She does not hate
  the Lanterns; she cannot stop eating them.

| | Mission | Place | New objective | New enemies |
| --- | --- | --- | --- | --- |
| 01 | Ashes of the Fleet | Hollow Moon | Break the Pyre squadron | Darts, Lancers, Strikers; Guren in the *Redfang* |
| 02 | The Long Dark | The Shiver | Escort the lamplighters' barge, the *Tinderbox* | Torch bombers and their firebombs, drifting ice, the Brander fire-ship |
| 03 | The Last Lantern | Meridian | Destroy three Snuffers before they drain the Great Lantern | Wardens (armoured, beam), Snuffers; Guren flies as wingman |
| 04 | Lights On | Under the Eclipse | Hold the line: keep at least one of the fleet's two capital ships alive | Cinder battleships; the *Eclipse* |

A dialogue scene plays before each mission, one more after mission 03, and the ending after mission 04.

### The last mission

Two friendly capital ships, the *Vigil* and the *Marigold*, sit behind Kurai and trade shells with the
Pyre's battleships while he fights in between. Enemy shells show their path for a second before they are
fired; Kurai can stay out of them, or take one on his shields for the fleet. Then the *Eclipse* arrives.
It is one boss in three phases:

1. **Corona.** Its hull cannot be hurt. Destroy the four gun batteries on its rim.
2. **Totality.** The whole sky goes dark and the ship hides three shade vanes. Guren knows where they are:
   he holds a light on one at a time, and only a lit vane can be damaged. Duskwing drones fly at his light
   from behind; if one reaches him, the light goes out for a few seconds.
3. **The Maw.** The maw opens to feed, which drags the *Foxfire* toward it and is the only time the core
   can be hurt; then it fires a beam down the middle of the screen.

At zero health it lines up one last shot on Kurai. Guren rams it, and the core hangs open until the player
fires.

### Losing

A mission that is lost is taken up again where it was lost: every wave after the first is a checkpoint, and
so is each phase of the *Eclipse* ("Retry from wave 3", "Retry from Totality"). The retry starts with full
shields and hull, and with the barge, the Lantern or the fleet as they were at the start. "Restart mission",
beside it and on the pause screen, starts again from the top.

## Controls

| Key | Touch screen | Action |
| --- | --- | --- |
| Arrows or WASD | Drag anywhere on the game | Fly |
| Space (or J / Z) | Keep the finger down | Fire |
| Esc or P | The pause button, bottom right | Pause |
| Esc | The Skip button | Skip a story scene |
| Enter, Space or click | Tap | Next line in a story scene; confirm on menus |
| M | | Music on / off |
| N | | Sound effects on / off |
| F | | Full screen on / off |

On a touch screen the ship moves as far as the finger does, from wherever the finger came down (so the
thumb need not cover the ship), at the ship's own speed. The page shows key hints or touch hints according
to what the player last used. The controls are shown again along the bottom of the screen as the first
mission opens.

A phone held upright shows the game turned on its side, filling the screen: the player turns the phone.
Held sideways, it is simply the game.

The title and pause screens have a button for the music and the sound effects, and a third for **screen
shake**: switched off, the shake and the flashes drop to a fraction of their strength (it starts off for
players whose system asks for reduced motion). The title also has a **full screen** button, where the
browser offers full screen (an iPhone's does not). The first key, click or tap on the title starts the
music: browsers allow no sound before that.

Progress (missions won, best scores) and the three switches are kept in the browser's local storage.

## Sound and music

Everything heard is synthesised in code with the Web Audio API: there are no audio files.

| Song | Where | What it is |
| --- | --- | --- |
| `theme` | Title; the end of the story | "Lights On", the main theme, in D major. Its first four notes are Kurai's call. |
| `bridge` | Story scenes; after a victory | The same tune, slow, on bells |
| `battle` | Missions | "Scramble", in D minor. Its middle section plays Kurai's call in the major. |
| `boss` | The Redfang, the Brander, the Snuffers | "Pyre": heavier, in E minor with a flattened second |
| `eclipse` | The *Eclipse*, phases 1 and 2; dread in the story | "Totality", Kagari's tune, in C minor |
| `finale` | The *Eclipse*, phase 3 | The main theme at half speed over the battle beat |
| `victory`, `defeat` | The end of a mission | Kurai's call, rising in the major, or falling in the minor |

The battle songs are built in layers that follow the fight: bass, strings and hi-hat between waves; drums,
arpeggio and tune during one; a second voice on the last. The *Eclipse* drops to a drone, a bell and a
heartbeat when the sky goes dark, and loses its music altogether for the last shot. The music goes
"behind glass" on the pause screen and dips under the biggest explosions.

The title, the story scenes and the battles are balanced to play at about the same loudness, so nobody
has to reach for the volume between them: the main theme and the story music sit near -19 LUFS, and the battle
songs at full strength near -17.5. A battle song's quiet layer is
written to sit under a fight; when a story scene borrows it, the scene plays it louder by the song's
`alone` (in decibels).

## Layout

```
index.html            page, menu screens, the touch buttons, script load order
css/game.css          menu screens (title, pause, victory, game over), key hints or touch hints
assets/               pictures: the cast, the places, the big ships (assets/README.md has the prompts)
js/core/              engine: loop and canvas sizing, input (keys and touch), settings (the three switches), image loading
js/audio/             sound: the engine (audio.js), the sound effects (sfx.js), the instruments, the sequencer (music.js)
js/audio/songs/       the songs, one file each (theme.js also holds the story and finale arrangements)
js/art/               palette, drawing helpers, ship sprites (the Eclipse has its own file), backdrops
js/game/              one mission run: player, enemies, allies, objectives, shots, pickups, effects, HUD, radio, wave director
                      (enemies-*.js and allies-fleet.js hold what each later mission added)
js/story/             the cast, the dialogue scenes (one file each), and the campaign order
js/missions/          mission data, one file per mission
js/scenes/            title scene, story scene (plays a dialogue), mission scene
js/ui/screens.js      shows and fills the HTML screens
```

Scripts are ordinary `<script>` tags sharing one global, `SO`. A new file needs a line in `index.html`.

## Adding things

- **Mission**: copy a file in `js/missions/`, change the id, text and waves, add its script tag after the
  previous mission. It joins the campaign and the title's mission list automatically. The format is described
  at the top of `js/missions/missions.js`. A mission added after `m04` would come after the ending; to
  keep the ending last, move its `storyAfter` to the new last mission. Every wave is a checkpoint, so a wave
  must not count on what an earlier wave brought in: a ship that stays for several waves is asked for in each
  of them (`unique: true`).
- **Story scene**: copy a file in `js/story/`, give it a new id, add its script tag, and name it in a mission's
  `storyBefore` or `storyAfter`. The format is at the top of `js/story/story.js`.
- **Character or mood**: add the picture to the manifest in `js/core/assets.js` and an entry (or a mood) in
  `js/story/cast.js`. Anyone in the cast can speak in story scenes and on the in-flight radio. Characters
  with `bridge` stand on the Foxfire's bridge; the others appear on the comm screen.
- **Objective**: add an entry to `TYPES` in `js/game/objectives.js`; a mission picks it with `objective: { type }`.
- **Enemy**: `SO.enemies.define('name', {...})` (see `js/game/enemies-shiver.js`) and a sprite in
  `js/art/ships.js`, then use its name in a mission. `boss: true` and a `name` give it a health bar and rout its
  escorts on death; the other optional fields are listed at the top of `js/game/enemies.js`.
  A boss with phases and parts of its own is in `js/game/enemies-eclipse.js`.
- **Friendly ship**: `SO.allies.define('name', {...})` (see `js/game/allies-fleet.js`); a wave brings it in
  with `{ at, ally: 'name' }`, or an objective does.
- **Pickup**: add an entry to `TYPES` in `js/game/pickups.js`; missions drop it with `drop: 'name'`.
- **Place**: add the picture to the manifest and name it in the mission's `backdrop` (options at the top of
  `js/art/backdrop.js`) and in the story scene's `backdrop`.
- **Sound effect**: add an entry in `js/audio/sfx.js`, play it with `SO.audio.play('name', { x })`
  (`x`, a position on screen, pans it left or right). A sound is a few calls to `tone()` and `noise()`;
  their options are listed in `js/audio/audio.js`.
- **Song**: copy a file in `js/audio/songs/`, give it a new id, add its script tag. Then name it in a mission
  (`music`), in one of its waves, or in a story scene (`music`, or a `{ music }` beat). A song is written as text:
  chords, a tune in note names, and patterns for the bass, arpeggio and drums. The format is at the top of
  `js/audio/music.js`; a miscounted bar is reported in the browser console.
- **Instrument**: add a patch or a drum in `js/audio/instruments.js` and use its name in a song's channel.

## Tuning

How hard the game is rests on a few decisions, and they are worth keeping when the numbers change:

- **The first mission teaches.** Its first two flights do not fire (`unarmed: true`), each wave adds one
  kind of enemy, and nothing arrives in a crowd. A player who holds fire and moves only now and then
  gets through it.
- **Shields forgive.** They start to recharge after 2.6 quiet seconds; the hit that breaks them never reaches
  the hull, and the ship cannot be hurt for a moment after it, nor for a second after a hull hit. Without
  that, a few hits in a row end a run before a new player has understood what hit them.
- **Nothing is aimed at where the player is put.** The *Foxfire* arrives clear of the lines the enemy's
  shells follow to the fleet.
- **Losing costs a wave, not a mission** (see "Losing", above).

The numbers:

- Ship speed, fire rate, shields and hull, and how forgiving the shields are: `TUNING` in `js/game/player.js`
  (`dragGain` there is how far the ship moves for a finger's movement on a touch screen).
- Enemy health, damage and score: the first line of each kind in `js/game/enemies*.js`. A mission can
  override any of them on a spawn: `hp`, `fireEvery` (how often it shoots), `pace` (seconds between a
  squadron leader's attacks), `unarmed`.
- The barge's hull: `tinderbox` in `js/game/allies.js`. Bomb damage: `firebomb` in `js/game/enemies-shiver.js`.
- How fast the Lantern drains: `drain` and `restore` in `js/game/objectives.js` (or on the mission's `objective`).
- The fleet: hull, reload time and shell damage of the *Vigil* and the *Marigold* at the bottom of
  `js/game/allies-fleet.js`.
- Battleships and the *Eclipse*: `js/game/enemies-eclipse.js`. `hp` on `battery`, `vane` and `eclipse` sets the
  length of phases 1, 2 and 3; `fleetDamage` is what a shell does to a capital ship; `TIMES` holds how long the
  maw stays open and how much warning the beam gives.
- Wave contents and timing: the mission file.
- How a hit feels: `FEEL` in `js/game/fx.js` holds the limits (how far the screen can shake, how bright a flash
  can be, what is left of both with screen shake switched off). The pauses and slow motion are the
  `world.freeze(seconds)` and `world.slow(scale, seconds)` calls next to each event: in `js/game/player.js`
  (shield and hull), `js/game/enemies.js` (kills; `BREAK_UP` is how long a boss takes to come apart) and
  `js/game/enemies-eclipse.js` (`DEATH`: the *Eclipse*'s last seconds).
- The mix: `LEVEL` in `js/audio/audio.js` (master, sound effects, music), `vol` on a sound in `js/audio/sfx.js`,
  `gain` on a channel in a song, `alone` on a song (see "Sound and music").

## Development shortcuts

- `index.html?mission=m02` starts a mission directly, without its story scene.
- `index.html?mission=m02&wave=4` starts at wave 4.
- `index.html?mission=m02&god=1` makes the ship (and whatever it escorts) take no damage.
- `index.html?mission=m04&wave=4&phase=2` starts the *Eclipse* at phase 2 or 3 (`phase=4`: one hit from the end).
- `index.html?mission=m04&wave=4&phase=2` is also exactly what "Retry from Totality" does.
- `index.html?story=s03` plays one story scene (`s01` to `s06`), then goes to the title.
- In the browser console, `SO.music.play('boss', { level: 2 })` plays any song at any level, and
  `SO.music.render('battle', 20, 2)` renders 20 seconds of one to an `AudioBuffer` without playing it,
  to measure levels (a fourth argument, a channel name, renders that channel alone; a fifth plays it that
  many decibels louder, as a story scene does with `alone`).
