# Art

`kurai.png` is the original portrait and the reference for Kurai's look. Everything else here was made with
the image generation tool from the prompts below, then shrunk for the game:

- characters: 800 x 800 PNG, 255-colour palette with transparency
- ships: cropped to the ship, 255-colour palette with transparency
- places and title art: 1600 x 900 JPEG

Fighters, shots, effects and the HUD are not pictures: they are drawn in code (`js/art/`).

`icon.png` (the browser tab, a phone's home screen) is not generated: it is Kurai's face cut from
`kurai.png`, on the blue of his portrait in the HUD, at 180 x 180.

To redo a picture, generate it again with its prompt and references, shrink it the same way, and keep the
file name. Framing matters for two things: `js/story/cast.js` records where each character's face and feet
are, and `js/art/ships.js` records each ship's size and centre.

## Characters

Common style, taken from `kurai.png`: chibi cartoon mascot sticker, thick dark ink outlines, flat cel-shaded
colours, full body, front view, transparent background.

| File | Reference | Prompt, in short |
| --- | --- | --- |
| `kurai-steady.png` | `kurai.png` | The same character, same design and markings. Determined and confident: eyes open (large bright cyan eyes), brave closed-mouth grin, one fist raised in front of his chest, other paw on his hip. |
| `kurai-alarm.png` | `kurai.png` | The same character. Startled and worried: eyes wide open with small pupils, ears tilted back, small open mouth, both paws raised, one sweat drop. |
| `akari.png` | `kurai.png` (style only) | A new character in the same style, not the fox. Akari, first officer: a small snowy barn owl, cream-white feathers with pale-gold speckles, heart-shaped face, large half-lidded amber eyes with a calm, dry, faintly amused look, bright cyan communications headset with a microphone, a small navy datapad under one wing. |
| `akari-alarm.png` | `akari.png` | The same character. Alarmed and concerned: eyes wide and round, beak slightly open, one wing pressing the headset to her head, the other holding the datapad up. |
| `guren.png` | `kurai.png` (style only) | A new character in the same style, not the fox. Captain Guren, cocky rival privateer: a chibi wolf with crimson-red fur, charcoal ear tips, paws and tail tip, cream muzzle and chest tuft, golden inner ears and eyes, lopsided smirk with one fang, arms crossed, a notch in one ear, a short tattered gold scarf. Proud and a little smug, not evil. |
| `guren-angry.png` | `guren.png` | The same character. Furious and indignant, in a comic way: teeth bared in a shout, one fist shaking, the other arm pointing aside, tail puffed up, a cartoon anger mark. |
| `guren-grin.png` | `guren.png` | The same character, after a hard battle, caught being happy and embarrassed about it: a small genuine closed-mouth smile with one fang showing, eyes soft and looking aside, a faint blush, one paw rubbing the back of his neck; a sticking-plaster on his cheek, a soot smudge on one ear, the end of his scarf singed. |
| `akari-smile.png` | `akari.png` | The same character. Quietly, genuinely happy, which is rare for her: eyes closed in two upward-curved arcs, a small soft smile, a faint blush, the datapad hugged to her chest with both wings. |
| `kagari.png` | `kurai.png` (style only) | A new character in the same style, not the fox. Grand Admiral Kagari, villain of a light-hearted space opera: a chibi moth with a round fuzzy charcoal body, a big fluffy cream ruff, two feathery cream antennae, and four broad maroon-and-charcoal wings held like a cloak, each upper wing carrying an eye-spot like a solar eclipse (a black disc ringed with a burning orange and gold corona). Glowing ember-orange eyes, half-lidded, haughty, hungry and amused; a small smug smile; gold epaulettes and a medal; a long brass candle snuffer held upright like a sceptre. Grand and theatrical, a little comic, not frightening. |
| `kagari-rage.png` | `kagari.png` | The same character. Furious and outraged, in a comic way, like a villain whose plan is falling apart: eyes wide and blazing, mouth open in a shout, antennae bristling, ruff fluffed out, wings flared, the candle snuffer shaken above her head in one fist, a cartoon anger mark. |

## Places

Common style: wide 16:9 background for a cartoon space opera, flat cel-shaded, bold simple shapes, clean dark
outlines, limited palette, fairly dark, lower third uncluttered, no characters, no text.

| File | Reference | Prompt, in short |
| --- | --- | --- |
| `bg-hollow-moon.jpg` | none | "Hollow Moon": a starship graveyard in orbit round a huge teal ringed planet low on the right; broken navy-and-cyan fleet cruisers in dark silhouette, a few orange embers in their wounds; purple and teal nebula. Quiet, melancholy, beautiful. |
| `bg-shiver.jpg` | none | "The Shiver": a vast drifting field of pale-blue and white ice boulders and shards, cyan highlights, dark blue-violet sky with an aurora-like ribbon; far away, one tiny barge with a single warm golden lantern. Cold, vast, hushed. |
| `bg-meridian-dark.jpg` | none | "Meridian", the Great Lantern: a colossal space lighthouse shaped like an ornate hanging lantern, dark and unlit; three brutal iron clamps with orange furnace vents bolted round the glass; cables carrying the last cyan wisps to a sprawling forge; maroon and indigo sky, sparks. Ominous. |
| `bg-meridian-lit.jpg` | `bg-meridian-dark.jpg` | The same scene after a victory: the Lantern blazing cyan-white, beams across the sky, the clamps shattered, the forge going cold, the sky deep blue. In the upper left, the vast black silhouette of a dreadnought like an eclipse, rimmed with burning orange. |
| `bg-eclipse.jpg` | `bg-meridian-lit.jpg` (style only) | "Under the Eclipse": open space above Meridian at the start of a fleet battle, seen from far away. On the far left, small and distant, the Great Lantern shining cyan-white, its beams fanning across a deep blue sky; the right third of the sky swallowed by the Murk, a wall of boiling black and violet cloud lit from within by burning orange. No sun, no planet, no large ship. In the middle distance, very small, two fleets in silhouette with a few tracer streaks between them. Fairly dark overall. |
| `bg-reach-lit.jpg` | `bg-meridian-lit.jpg` (style only) | "The Lanes Relit", the happy ending: a deep blue sky warming to teal and gold along the horizon, like dawn in space. A long line of lantern-shaped lighthouses curving away into the distance, every one alight, their beams joining into one path; the nearest and largest on the right. Around it a loose crowd of small friendly ships, each with a tiny golden light. In the upper left, a few broken black fragments of a giant ship drifting apart, their rims fading from orange to grey. |
| `title-art.jpg` | `kurai-steady.png`, `akari.png`, `guren.png` | Title key art: the three characters on-model in the left half (Kurai in front with his fist raised, Akari at his shoulder, Guren further back with arms crossed in a red glow); behind them wrecked fleet ships, a distant cyan lantern-shaped beacon, a fox-eared fighter streaking past; the right half left as open starry space for the logo and menu. |

## Ships

Common style: 2D game sprite, strict side view, cartoon sticker style, thick dark outlines, flat cel-shaded
colours, no engine flame (the game draws it), transparent background.

| File | Prompt, in short |
| --- | --- |
| `ship-redfang.png` | Guren's fighter, nose to the left: crimson hull, charcoal wing tips, gold trim and canopy, a cream prow shaped like a fang, swept wings like wolf ears, twin cannons, a tattered gold pennant. |
| `ship-tinderbox.png` | The lamplighters' barge, bow to the right: chunky, friendly, unarmed, like a space tugboat; cream and navy hull with cyan trim, patched plates, golden portholes, a large brass lantern cage on its back holding one golden flame. |
| `ship-brander.png` | A Pyre fire-ship, bow to the left: a heavy frigate built to ram and explode; blackened iron plough prow, dark red hull with gold rivets, fuel tanks, rows of glowing furnace vents, glowing cracks, two smokestacks. |
| `snuffer.png` | A huge industrial clamp, taller than wide: a block of dark red and black iron with two curved jaws reaching left, and between them a round furnace core like an eye, glowing orange behind iron teeth; severed cables on its right side. |
| `ship-vigil.png` | The Vigil, an old Lantern Fleet cruiser out of retirement, bow to the right (style reference: `ship-tinderbox.png`): long, proud, slightly old-fashioned; deep navy hull, cream upper works, cyan trim, a few patched plates; three twin-barrelled turrets on the top deck; golden portholes; a tall mast carrying a large brass lantern cage with a cyan-white flame; two stern fins shaped like a fox's ears; a cream prow like a fox's muzzle. |
| `ship-marigold.png` | The Marigold, a grain freighter that has joined a battle fleet, bow to the right (style reference: `ship-tinderbox.png`): chunky, round and friendly; cream hull with marigold-yellow bands and navy trim; three domed grain silos on its back; a small wheelhouse at the stern; cannons obviously added in a hurry (two mismatched turrets bolted between the silos, one long cannon strapped under the bow) with odd grey plates, big bolts and scaffolding; a string of small golden lanterns along the rail; a hand-painted orange flower on the bow. |
| `ship-cinder.png` | A Cinder, a Pyre battleship, bow to the left (style reference: `ship-brander.png`): long, heavy, brutal; blackened iron armour over a dark red hull with gold rivets; a jagged wedge-shaped bow; twin-barrelled turrets on the top deck and a smaller one under the bow; a row of glowing furnace vents; a bridge tower like an iron furnace; a smokestack; two engine nozzles at the far right. |

The Eclipse itself is not a picture. It is drawn in code (`js/art/eclipse.js`) so that its maw, its corona
and its cracks can move; its look follows the dreadnought in `bg-meridian-lit.jpg`.
