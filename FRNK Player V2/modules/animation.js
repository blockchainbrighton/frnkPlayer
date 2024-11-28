// Get references to DOM elements
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const rewindButton = document.getElementById('rewindButton');
const fastForwardButton = document.getElementById('fastForwardButton');
const playbackSpeedSelector = document.getElementById('playbackSpeedSelector');

// Disable buttons until audio is loaded
[playButton, stopButton, rewindButton, fastForwardButton].forEach(btn => btn.disabled = true);

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

// Spool animation variables
let leftSpoolAngle = 0;
let rightSpoolAngle = 0;
const spoolSpeed = 2 * Math.PI; // Radians per second
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

// Load audio from URL
async function loadAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

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

    // Enable buttons after loading
    [playButton, stopButton, rewindButton, fastForwardButton].forEach(
      btn => (btn.disabled = false)
    );

    // Remove loading message
    loadingMessage.remove();
  } catch (error) {
    console.error('Error loading audio:', error);
  }
}
loadAudio();

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
  leftSpoolAngle += rotation;
  rightSpoolAngle += rotation;

  drawSpools();

  if (isPlaying) {
    animationFrameId = requestAnimationFrame(animateSpools);
  }
}

// Draw spools
function drawSpools() {
  ctx.clearRect(0, 0, spoolCanvas.width, spoolCanvas.height);

  drawSpool(spoolCanvas.width * 0.3, spoolCanvas.height * 0.5, leftSpoolAngle);
  drawSpool(spoolCanvas.width * 0.7, spoolCanvas.height * 0.5, rightSpoolAngle);
}

// Draw a single spool
function drawSpool(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, 2 * Math.PI);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// Handle playback speed changes
function setPlaybackRate(rate) {
  playbackRate = rate;
  if (isPlaying) {
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

// Unified event handler for transport buttons
function handleTransport(directionSign) {
  if (isPlaying) stopAudio();
  direction = directionSign;
  setPlaybackRate(parseFloat(playbackSpeedSelector.value));
  playAudio();
  rampPlaybackRate(5, 1);
}

function releaseTransport() {
  rampPlaybackRate(parseFloat(playbackSpeedSelector.value), 1);
  setTimeout(() => {
    setPlaybackRate(parseFloat(playbackSpeedSelector.value));
    direction = 1; // Resume normal forward playback
  }, 1000);
}

playButton.addEventListener('click', () => {
  direction = 1;
  setPlaybackRate(parseFloat(playbackSpeedSelector.value));
  playAudio();
});

stopButton.addEventListener('click', () => {
  stopAudio();
  startOffset = 0; // Reset playback position
});

rewindButton.addEventListener('mousedown', () => handleTransport(-1));
rewindButton.addEventListener('mouseup', releaseTransport);

fastForwardButton.addEventListener('mousedown', () => handleTransport(1));
fastForwardButton.addEventListener('mouseup', releaseTransport);

playbackSpeedSelector.addEventListener('change', () =>
  setPlaybackRate(parseFloat(playbackSpeedSelector.value))
);
