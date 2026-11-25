'use strict';

/* In-flight radio: short lines typed out in a bubble under Kurai's portrait.
   Anyone in the cast (js/story/cast.js) can speak; the HUD draws the current line,
   this file only keeps the queue and the timing. */
(function (SO) {
  const CHARS_PER_SECOND = 42;

  function Comms() {
    this.queue = [];
    this.current = null;
    this.t = 0;
  }

  /* urgent: cut in over whatever is being said. */
  Comms.prototype.say = function (speaker, text, urgent) {
    const line = { speaker, text, hold: 1.7 + text.length * 0.04 };
    if (urgent) {
      this.queue.length = 0;
      this.current = line;
      this.t = 0;
    } else if (this.queue.length < 3) {
      this.queue.push(line);
    }
  };

  /* How many characters of the current line are visible. */
  Comms.prototype.shown = function () {
    return this.current ? Math.min(this.current.text.length, Math.floor(this.t * CHARS_PER_SECOND)) : 0;
  };

  Comms.prototype.typing = function () {
    return !!this.current && this.shown() < this.current.text.length;
  };

  Comms.prototype.update = function (dt) {
    if (!this.current && this.queue.length) {
      this.current = this.queue.shift();
      this.t = 0;
    }
    if (!this.current) return;
    const before = this.shown();
    this.t += dt;
    if (this.shown() > before && this.typing()) {
      SO.audio.play('talk', { pitch: SO.cast[this.current.speaker] ? SO.cast[this.current.speaker].voice : 1 });
    }
    if (this.t > this.current.text.length / CHARS_PER_SECOND + this.current.hold) this.current = null;
  };

  SO.Comms = Comms;
})(window.SO);
