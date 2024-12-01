// Get references to DOM elements
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const rewindButton = document.getElementById('rewindButton');
const fastForwardButton = document.getElementById('fastForwardButton');
const playbackSpeedSelector = document.getElementById('playbackSpeedSelector');
const timerDisplay = document.getElementById('timerDisplay');

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
let currentPosition = 0; // Current playback position in seconds
let startTime = 0; // The time when playback started
let direction = 1; // 1 for forward, -1 for reverse

// Sound Effect Buffers
let buttonPressBuffer = null;
let fastWindTapeBuffer = null;
let stopButtonPressBuffer = null;

// Sound Effect Source Nodes
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

// Timer Interval Variable
let timerIntervalId = null;

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

    // Load Main Audio
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

    // Load ButtonPress.mp3
    const buttonPressResponse = await fetch('assets/buttonPress.mp3');
    const buttonPressArrayBuffer = await buttonPressResponse.arrayBuffer();
    buttonPressBuffer = await audioContext.decodeAudioData(buttonPressArrayBuffer);

    // Load StopButtonPress.mp3
    const stopButtonPressResponse = await fetch('assets/stopButtonPress.mp3');
    const stopButtonPressArrayBuffer = await stopButtonPressResponse.arrayBuffer();
    stopButtonPressBuffer = await audioContext.decodeAudioData(stopButtonPressArrayBuffer);

    // Load FastWindTape.mp3
    const fastWindTapeResponse = await fetch('assets/fastWindTape.mp3');
    const fastWindTapeArrayBuffer = await fastWindTapeResponse.arrayBuffer();
    fastWindTapeBuffer = await audioContext.decodeAudioData(fastWindTapeArrayBuffer);

    // Enable buttons after loading
    [playButton, stopButton, rewindButton, fastForwardButton].forEach(
      (btn) => { if (btn) btn.disabled = false; }
    );

    // Remove loading message
    loadingMessage.remove();

    // Update total duration in timer display
    updateTimerDisplay();
  } catch (error) {
    console.error('Error loading audio:', error);
  }
}
loadAudio();

// Helper function to format time in MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Function to update the timer display
function updateTimerDisplay() {
  const currentPos = getCurrentPosition();
  const totalDuration = audioBuffer ? audioBuffer.duration : 0;
  timerDisplay.textContent = `${formatTime(currentPos)} / ${formatTime(totalDuration)}`;
}

// Function to get the current playback position
function getCurrentPosition() {
  if (!isPlaying) {
    return currentPosition;
  }

  const elapsed = audioContext.currentTime - startTime;
  const deltaPosition = elapsed * playbackRate * direction;
  let pos = currentPosition + deltaPosition;
  pos = Math.max(0, Math.min(pos, audioBuffer.duration));
  return pos;
}

// Function to Start the Timer Interval
function startTimerInterval() {
  if (!timerIntervalId) {
    timerIntervalId = setInterval(updateTimerDisplay, 250); // Update every 250ms
  }
}

// Function to Stop the Timer Interval
function stopTimerInterval() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

// Play ButtonPress Sound
function playButtonPress() {
  if (!buttonPressBuffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = buttonPressBuffer;
  source.connect(audioContext.destination);
  source.start(0);
}

// Play Stop ButtonPress Sound
function stopButtonPress() {
  if (!stopButtonPressBuffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = stopButtonPressBuffer;
  source.connect(audioContext.destination);
  source.start(0);
}

// Start FastWindTape Sound
function startFastWindTape() {
  if (!fastWindTapeBuffer || fastWindTapeSource) return;
  fastWindTapeSource = audioContext.createBufferSource();
  fastWindTapeSource.buffer = fastWindTapeBuffer;
  fastWindTapeSource.loop = true;
  fastWindTapeSource.connect(audioContext.destination);
  fastWindTapeSource.start(0);
}

// Stop FastWindTape Sound
function stopFastWindTape() {
  if (fastWindTapeSource) {
    fastWindTapeSource.stop();
    fastWindTapeSource.disconnect();
    fastWindTapeSource = null;
  }
}

// Function to switch playback modes
async function switchPlayback(newDirection, newRate, modeButton) {
    // If the requested mode is already active, do nothing
    if (isPlaying && direction === newDirection && playbackRate === newRate) {
      return;
    }
  
    // Play button press sound
    playButtonPress();
  
    // Stop any ongoing playback
    if (isPlaying) {
      stopAudio();
    }
  
    // Stop FastWindTape sound if any
    stopFastWindTape();
  
    // Update playback parameters
    direction = newDirection;
    playbackRate = newRate;
  
    // Update active button states
    updateActiveButtons(modeButton);
  
    // **Await the playAudio function**
    await playAudio();
  
    // Handle FastWindTape Sound Effects
    if (playbackRate > 1) {
      startFastWindTape();
    }
  }

// Function to update active button states
function updateActiveButtons(activeButton) {
    // Remove 'active' class from all transport buttons
    [playButton, rewindButton, fastForwardButton].forEach((btn) => {
      btn.classList.remove('active');
    });
  
    // Add 'active' class to the currently active button
    activeButton.classList.add('active');
  }

// Function to start playback based on current direction and playbackRate
async function playAudio() {
  if (isPlaying || !audioBuffer) return;

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = direction === 1 ? audioBuffer : reversedAudioBuffer;
  sourceNode.playbackRate.value = playbackRate;
  sourceNode.connect(audioContext.destination);

  let offset;
  if (direction === 1) {
    offset = currentPosition;
  } else {
    offset = audioBuffer.duration - currentPosition;
  }

  sourceNode.start(0, offset);
  startTime = audioContext.currentTime;
  isPlaying = true;
  lastTime = performance.now() / 1000;
  animateSpools();

  // Start the Timer Interval
  startTimerInterval();

  // Handle Song End
  sourceNode.onended = () => {
    stopAudio();
    deactivatePlaybackMode();
  };
}

// Function to stop playback and update currentPosition
function stopAudio() {
    if (!isPlaying) return;
  
    if (sourceNode) {
      sourceNode.onended = null; // Prevent onended from firing
      sourceNode.stop();
      sourceNode.disconnect();
      sourceNode = null;
    }
  
    // Update currentPosition
    currentPosition = getCurrentPosition();
  
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    stopTimerInterval();
    updateTimerDisplay();
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
  // Timer is now updated via setInterval

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
  const radius = Math.max(1.5, width * radiusRatio); // Ensure radius is at least 1.5

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
  const outerRadius = Math.max(0, radius - 1.5); // Ensure outerRadius is non-negative

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;

  // Draw the white border
  ctx.beginPath();
  ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw the notches
  for (let i = 0; i < notchCount; i++) {
    const notchAngle = angle + (i * (2 * Math.PI)) / notchCount;
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

// Function to handle playback speed changes
function setPlaybackRate(rate) {
  playbackRate = rate;
  if (isPlaying && sourceNode) {
    sourceNode.playbackRate.setValueAtTime(playbackRate, audioContext.currentTime);
  }
}

// Function to deactivate playback mode (called when playback ends)
function deactivatePlaybackMode() {
  // Remove 'active' class from all transport buttons
  [rewindButton, fastForwardButton, playButton].forEach((btn) => {
    btn.classList.remove('active');
  });

  // Stop FastWindTape sound if playing
  stopFastWindTape();
}

// Play Button Event Handler
playButton.addEventListener('click', async () => {
  // Switch to Play mode (direction=1, rate=1)
  await switchPlayback(1, parseFloat(playbackSpeedSelector.value), playButton);
});

// Stop Button Event Handler
stopButton.addEventListener('click', () => {
  // Play stop button sound
  stopButtonPress();

  // Stop any current playback
  if (isPlaying) {
    stopAudio();
  }

  // Reset playback position
  currentPosition = 0;
  updateTimerDisplay();

  // Remove 'active' class from all transport buttons
  [rewindButton, fastForwardButton, playButton].forEach((btn) => {
    btn.classList.remove('active');
  });

  // Stop FastWindTape sound
  stopFastWindTape();
});

// Rewind Button Event Handler
rewindButton.addEventListener('click', async () => {
  // Switch to Rewind mode (direction=-1, rate=5)
  await switchPlayback(-1, 5, rewindButton);
});

// FastForward Button Event Handler
fastForwardButton.addEventListener('click', async () => {
  // Switch to Fast Forward mode (direction=1, rate=5)
  await switchPlayback(1, 5, fastForwardButton);
});

// Handle Playback Speed Selector Changes
playbackSpeedSelector.addEventListener('change', () => {
  const selectedRate = parseFloat(playbackSpeedSelector.value);
  setPlaybackRate(selectedRate);

  // If in Play mode, update playback rate immediately
  if (isPlaying && direction === 1 && playbackRate === selectedRate) {
    // Nothing additional needed
  }

  // If in Fast Forward or Rewind, keep the rate as per transport mode
});

// Ensure Timer Interval is Stopped on Page Unload
window.addEventListener('beforeunload', () => {
  stopTimerInterval();
});