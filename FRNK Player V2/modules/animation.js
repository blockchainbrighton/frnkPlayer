// Get references to DOM elements
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const rewindButton = document.getElementById('rewindButton');
const fastForwardButton = document.getElementById('fastForwardButton');
const playbackSpeedSelector = document.getElementById('playbackSpeedSelector');

// Disable buttons until audio is loaded
[playButton, stopButton, rewindButton, fastForwardButton].forEach(
  (btn) => { if (btn) btn.disabled = true; }
);

// Spool canvas and context
const spoolCanvas = document.getElementById('spoolCanvas');
const ctx = spoolCanvas.getContext('2d');

// Resize canvas to match the image dimensions
function resizeCanvas() {
  spoolCanvas.width = spoolCanvas.clientWidth;
  spoolCanvas.height = spoolCanvas.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Audio context and variables
let audioContext;
let audioBuffer = null;
let reversedAudioBuffer = null;
let sourceNode = null;
let isPlaying = false;
let playbackRate = 1;
let startOffset = 0;
let startTime = 0;
let direction = 1; // 1 for forward, -1 for reverse

// *** New Sound Effect Buffers ***
let buttonPressBuffer = null;
let fastWindTapeBuffer = null;
let stopButtonPressBuffer = null;

// *** References to Sound Effect Source Nodes ***
let fastWindTapeSource = null;

// Spool properties using ratios
const spools = {
  left: { xRatio: 0.33, yRatio: 0.55, radiusRatio: 0.05, angle: 0 },
  right: { xRatio: 0.67, yRatio: 0.55, radiusRatio: 0.05, angle: 0 },
};

// Animation variables
const spoolSpeed = Math.PI; // Radians per second
let animationFrameId;
let lastTime = 0;

// Show loading message
const loadingMessage = document.createElement('div');
loadingMessage.textContent = 'Loading...';
Object.assign(loadingMessage.style, {
  color: 'white',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
});
document.body.appendChild(loadingMessage);

// Load audio from URLs
async function loadAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // *** Load Main Audio ***
    const response = await fetch(
      'https://ordinals.com/content/fad631362e445afc1b078cd06d1a59c11acd24ac400abff60ed05742d63bff50i0'
    );
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create reversed audio buffer
    reversedAudioBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      reversedAudioBuffer
        .getChannelData(i)
        .set(audioBuffer.getChannelData(i).slice().reverse());
    }

    // *** Load ButtonPress.mp3 ***
    const buttonPressResponse = await fetch('assets/buttonPress.mp3');
    const buttonPressArrayBuffer = await buttonPressResponse.arrayBuffer();
    buttonPressBuffer = await audioContext.decodeAudioData(buttonPressArrayBuffer);

    // *** Load StopButtonPress.mp3 ***
    const stopButtonPressResponse = await fetch('assets/stopButtonPress.mp3');
    const stopButtonPressArrayBuffer = await stopButtonPressResponse.arrayBuffer();
    stopButtonPressBuffer = await audioContext.decodeAudioData(stopButtonPressArrayBuffer);

    // *** Load FastWindTape.mp3 ***
    const fastWindTapeResponse = await fetch('assets/fastWindTape.mp3');
    const fastWindTapeArrayBuffer = await fastWindTapeResponse.arrayBuffer();
    fastWindTapeBuffer = await audioContext.decodeAudioData(fastWindTapeArrayBuffer);

    // Enable buttons after loading
    [playButton, stopButton, rewindButton, fastForwardButton].forEach(
      (btn) => { if (btn) btn.disabled = false; }
    );

    // Remove loading message
    loadingMessage.remove();
  } catch (error) {
    console.error('Error loading audio:', error);
  }
}
loadAudio();

// *** Function to Play ButtonPress Sound ***
function playButtonPress() {
  if (!buttonPressBuffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = buttonPressBuffer;
  source.connect(audioContext.destination);
  source.start(0);
}

// *** Function to Play Stop ButtonPress Sound ***
function stopButtonPress() {
  if (!stopButtonPressBuffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = stopButtonPressBuffer;
  source.connect(audioContext.destination);
  source.start(0);
}

// *** Function to Start FastWindTape Sound ***
function startFastWindTape() {
  if (!fastWindTapeBuffer || fastWindTapeSource) return; // Prevent multiple instances
  fastWindTapeSource = audioContext.createBufferSource();
  fastWindTapeSource.buffer = fastWindTapeBuffer;
  fastWindTapeSource.loop = true; // Loop the sound
  fastWindTapeSource.connect(audioContext.destination);
  fastWindTapeSource.start(0);
}

// *** Function to Stop FastWindTape Sound ***
function stopFastWindTape() {
  if (fastWindTapeSource) {
    fastWindTapeSource.stop();
    fastWindTapeSource.disconnect();
    fastWindTapeSource = null;
  }
}

// Play audio function
async function playAudio() {
  if (isPlaying || !audioBuffer) return;

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = direction === 1 ? audioBuffer : reversedAudioBuffer;
  sourceNode.playbackRate.value = playbackRate;
  sourceNode.connect(audioContext.destination);

  let offset = startOffset;
  if (direction === -1) {
    offset = audioBuffer.duration - startOffset;
  }

  sourceNode.start(0, offset);
  startTime = audioContext.currentTime;
  isPlaying = true;
  lastTime = performance.now() / 1000;
  animateSpools();

  // Handle Song End to Deactivate Transport Mode
  sourceNode.onended = () => {
    stopAudio();
    deactivateTransport();
  };
}

// Stop audio function
function stopAudio() {
  if (!isPlaying) return;

  sourceNode.stop();
  const elapsed = (audioContext.currentTime - startTime) * playbackRate;

  startOffset += direction * elapsed;
  startOffset = Math.max(0, Math.min(startOffset, audioBuffer.duration));

  isPlaying = false;
  cancelAnimationFrame(animationFrameId);
}

// Animate spools
function animateSpools() {
  const now = performance.now() / 1000;
  const deltaTime = now - lastTime;
  lastTime = now;

  const rotation = deltaTime * spoolSpeed * playbackRate * direction;

  // Update spool angles
  spools.left.angle += rotation;
  spools.right.angle += rotation;

  drawSpools();

  if (isPlaying) {
    animationFrameId = requestAnimationFrame(animateSpools);
  }
}

// Draw spools
function drawSpools() {
  const width = spoolCanvas.width;
  const height = spoolCanvas.height;

  ctx.clearRect(0, 0, width, height);

  // Draw each spool
  drawSpool(spools.left, width, height);
  drawSpool(spools.right, width, height);
}

// Draw a single spool
function drawSpool(spool, width, height) {
  const { xRatio, yRatio, radiusRatio, angle } = spool;
  const x = width * xRatio;
  const y = height * yRatio;
  const radius = width * radiusRatio;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Draw main spool
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.fillStyle = '#000';
  ctx.fill();

  // Draw rotating white circumference with notches
  const notchCount = 3; // Number of notches
  const notchLength = radius * 0.15; // Length of each notch
  const notchWidth = radius * 0.05; // Width of the notches
  const outerRadius = radius - 1.5; // Position of the white border

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;

  // Draw the white border
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw the notches
  for (let i = 0; i < notchCount; i++) {
    const notchAngle = angle + (i * (2 * Math.PI)) / notchCount; // Rotate notches evenly
    const notchStartX = outerRadius * Math.cos(notchAngle);
    const notchStartY = outerRadius * Math.sin(notchAngle);
    const notchEndX = (outerRadius - notchLength) * Math.cos(notchAngle);
    const notchEndY = (outerRadius - notchLength) * Math.sin(notchAngle);

    ctx.beginPath();
    ctx.moveTo(notchStartX, notchStartY);
    ctx.lineTo(notchEndX, notchEndY);
    ctx.lineWidth = notchWidth;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }

  ctx.restore();
}

drawSpools();

// Handle playback speed changes
function setPlaybackRate(rate) {
  playbackRate = rate;
  if (isPlaying && sourceNode) {
    sourceNode.playbackRate.setValueAtTime(playbackRate, audioContext.currentTime);
  }
}

// Ramp playback rate
function rampPlaybackRate(targetRate, duration) {
  if (sourceNode) {
    const now = audioContext.currentTime;
    sourceNode.playbackRate.cancelScheduledValues(now);
    sourceNode.playbackRate.setValueAtTime(sourceNode.playbackRate.value, now);
    sourceNode.playbackRate.linearRampToValueAtTime(targetRate, now + duration);
  }
}

// Unified Event Handler for Transport Buttons with Toggle Functionality
let transportMode = null; // null, 'fastForward', or 'rewind'

// Function to Activate Transport Mode
function activateTransport(mode) {
  if (transportMode === mode) {
    // If the same transport mode is already active, deactivate it
    deactivateTransport();
    return;
  }

  // Deactivate any existing transport mode
  deactivateTransport();

  // Set the new transport mode
  transportMode = mode;

  // Set direction based on mode
  direction = mode === 'fastForward' ? 1 : -1;

  // Set playback rate to a higher value for fast transport
  setPlaybackRate(5); // Adjust the rate as needed

  // Play audio in the specified direction
  playAudio();

  // Ramp playback rate smoothly
  rampPlaybackRate(5, 1);

  // Start FastWindTape Sound
  startFastWindTape();

  // Add an active CSS class to indicate active transport mode
  if (mode === 'fastForward') {
    fastForwardButton.classList.add('active');
  } else if (mode === 'rewind') {
    rewindButton.classList.add('active');
  }
}

// Function to Deactivate Transport Mode
function deactivateTransport() {
  if (!transportMode) return;

  // Stop current playback and update startOffset
  stopAudio();

  // Reset direction to forward
  direction = 1;

  // Set playback rate back to normal
  setPlaybackRate(parseFloat(playbackSpeedSelector.value));

  // Stop FastWindTape sound
  stopFastWindTape();

  // Reset transport mode
  transportMode = null;

  // Remove active CSS class
  fastForwardButton.classList.remove('active');
  rewindButton.classList.remove('active');
}

// Play Button Event Handler
playButton.addEventListener('click', () => {
  // Play ButtonPress Sound
  playButtonPress();

  // Deactivate any transport mode
  deactivateTransport();

  // If already playing, stop and reset
  if (isPlaying) {
    stopAudio();
  }

  // Set direction to forward
  direction = 1;

  // Set playback rate to selected value
  setPlaybackRate(parseFloat(playbackSpeedSelector.value));

  // Start playing from the updated startOffset
  playAudio();
});

// Stop Button Event Handler
stopButton.addEventListener('click', () => {
  // Play stopButtonPress Sound
  stopButtonPress();

  // Deactivate any transport mode
  deactivateTransport();

  // Stop any current playback
  if (isPlaying) {
    stopAudio();
  }

  // Reset playback position
  startOffset = 0;
});

// Rewind Button Event Handler
rewindButton.addEventListener('click', () => {
  // Play ButtonPress Sound for Rewind
  playButtonPress();

  activateTransport('rewind');
});

// FastForward Button Event Handler
fastForwardButton.addEventListener('click', () => {
  // Play ButtonPress Sound for Fast Forward
  playButtonPress();

  activateTransport('fastForward');
});

// Handle Playback Speed Selector Changes
playbackSpeedSelector.addEventListener('change', () =>
  setPlaybackRate(parseFloat(playbackSpeedSelector.value))
);