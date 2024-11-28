// modules/main.js

import { initializeAnimation } from './animation.js';
import { initializeControls } from './controls.js';
import { resizeCanvas, image, drawTapeDeck, spools, canvas } from './dom.js';

// Define the state object with flags
const state = {
  isPlaying: false,
  isRecording: false,
  isFastForwarding: false,
  isRewinding: false,
};

// Initialize the animation and controls modules, passing the state object
initializeAnimation(state);
initializeControls(state);

// Handle canvas resizing when the image loads
image.onload = () => {
  resizeCanvas(() => drawTapeDeck(spools, canvas.width, canvas.height));
};

// If the image is already loaded (cached), resize the canvas immediately
if (image.complete) {
  resizeCanvas(() => drawTapeDeck(spools, canvas.width, canvas.height));
}