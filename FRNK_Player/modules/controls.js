// modules/controls.js

import {
  playButton,
  recordButton,
  stopButton,
  rewindButton,
  fastForwardButton,
  statusDisplay, // Optional: If implementing status display
} from './dom.js';

import {
  startAnimation,
  stopAnimation,
  PLAY_SPEED,
  FAST_FORWARD_SPEED,
  REWIND_SPEED,
  resetAnimation,
} from './animation.js';

// Optional: Function to update the status display
function updateStatusDisplay(status) {
  if (!statusDisplay) return; // If status display is not implemented, exit

  switch (status) {
    case 'play':
      statusDisplay.textContent = 'Status: Playing (1x Forward)';
      break;
    case 'record':
      statusDisplay.textContent = 'Status: Recording (1x Forward)';
      break;
    case 'fastForward':
      statusDisplay.textContent = 'Status: Fast Forwarding (5x Forward)';
      break;
    case 'rewind':
      statusDisplay.textContent = 'Status: Rewinding (5x Reverse)';
      break;
    case 'stop':
      statusDisplay.textContent = 'Status: Stopped';
      break;
    default:
      statusDisplay.textContent = 'Status: Stopped';
  }
}

// Event listener for the Play button
playButton.addEventListener("click", () => {
  resetAnimation(); // Ensure animation is reset to default
  startAnimation(PLAY_SPEED); // Start 1x clockwise
  updateStatusDisplay('play');
});

// Event listener for the Record button
recordButton.addEventListener("click", () => {
  resetAnimation(); // Ensure animation is reset to default
  startAnimation(PLAY_SPEED); // Start 1x clockwise (assuming recording is similar to play)
  updateStatusDisplay('record');
});

// Event listener for the Stop button
stopButton.addEventListener("click", () => {
  stopAnimation(); // Stop the animation
  updateStatusDisplay('stop');
});

// Event listener for the Fast Forward button
fastForwardButton.addEventListener("click", () => {
  startAnimation(FAST_FORWARD_SPEED); // Start 5x clockwise
  updateStatusDisplay('fastForward');
});

// Event listener for the Rewind button
rewindButton.addEventListener("click", () => {
  startAnimation(REWIND_SPEED); // Start 5x anticlockwise
  updateStatusDisplay('rewind');
});