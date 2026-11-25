'use strict';

/* The one global. Every file attaches its piece to SO; index.html lists the load order.
   The game is drawn in a fixed 1280x720 space and scaled to the window by engine.js. */
window.SO = {
  W: 1280,
  H: 720,
  FONT: '"Arial Rounded MT Bold", ui-rounded, "Segoe UI", system-ui, sans-serif',
  scenes: {},
};
