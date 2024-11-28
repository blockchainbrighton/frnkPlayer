// modules/animation.js

import {
  container,
  image,
  playButton,
  recordButton,
  stopButton,
  rewindButton,
  fastForwardButton,
  resizeCanvas,
} from './dom.js';
import { spools, drawTapeDeck } from './drawing.js';
import { canvas } from './dom.js'; // Ensure canvas is imported if needed

// Import audio control functions
import { playAudio, pauseAudio, setPlaybackRate } from './audio.js';

let isPlaying = false;
let animationFrameId;

// Define speed and direction constants
const PLAY_SPEED = 1; // 1x clockwise
const FAST_FORWARD_SPEED = 5; // 5x clockwise
const REWIND_SPEED = -5; // 5x anticlockwise

let currentSpeed = PLAY_SPEED; // Initialize with Play speed

// Function to animate the spools
function animateSpools() {
  if (!isPlaying) return;

  // Increment the angles for rotation based on currentSpeed
  spools.left.angle += 0.05 * currentSpeed;
  spools.right.angle += 0.08 * currentSpeed;

  // Redraw the tape spools
  drawTapeDeck(spools, canvas.width, canvas.height);

  // Continue the animation loop
  animationFrameId = requestAnimationFrame(animateSpools);
}

// Function to start or update the animation with a specific speed
function startAnimation(speed) {
  currentSpeed = speed;
  if (!isPlaying) {
    isPlaying = true;
    animateSpools();
  }
}

// Function to stop the animation
function stopAnimation() {
  if (isPlaying) {
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    drawTapeDeck(spools, canvas.width, canvas.height); // Redraw to clear any ongoing rotation
  }
}

// Event listener for the Play button
playButton.addEventListener("click", () => {
  startAnimation(PLAY_SPEED); // Reset to 1x clockwise
  playAudio(1); // Start audio playback at normal speed
});

// Event listener for the Record button
recordButton.addEventListener("click", () => {
  startAnimation(PLAY_SPEED); // Reset to 1x clockwise
  playAudio(1); // Start audio playback at normal speed
});

// Event listener for the Stop button
stopButton.addEventListener("click", () => {
  stopAnimation();
  pauseAudio(); // Stop audio playback
});

// Event listener for the Fast Forward button
fastForwardButton.addEventListener("click", () => {
  startAnimation(FAST_FORWARD_SPEED); // Set to 5x clockwise
  playAudio(2); // Increase audio playback rate (maximum reliable rate is 2x)
});

// Event listener for the Rewind button
rewindButton.addEventListener("click", () => {
  startAnimation(REWIND_SPEED); // Set to 5x anticlockwise
  pauseAudio(); // Pause audio during rewind
});

// Event listener for window resize to adjust the canvas
window.addEventListener("resize", () => {
  resizeCanvas(() => drawTapeDeck(spools, canvas.width, canvas.height));
});

// Initial setup once the image loads
image.onload = () => {
  resizeCanvas(() => drawTapeDeck(spools, canvas.width, canvas.height));
};

// If the image is already cached and loaded
if (image.complete) {
  resizeCanvas(() => drawTapeDeck(spools, canvas.width, canvas.height));
}
