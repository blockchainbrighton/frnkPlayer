// Immediately Invoked Function Expression (IIFE) to encapsulate the module
(() => {
    // Helper function to load and decode audio buffers
    const loadAudioBuffer = async (audioContext, url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      const arrayBuffer = await response.arrayBuffer();
      return audioContext.decodeAudioData(arrayBuffer);
    };
  
    // Helper function to play a given audio buffer
    const playSound = (audioContext, buffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      return source;
    };
  
    // Helper function to format time in MM:SS
    const formatTime = (seconds) => {
      const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
      const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
      return `${mins}:${secs}`;
    };
  
    // Get references to DOM elements
    const elements = {
      playButton: document.getElementById('playButton'),
      stopButton: document.getElementById('stopButton'),
      rewindButton: document.getElementById('rewindButton'),
      fastForwardButton: document.getElementById('fastForwardButton'),
      playbackSpeedSelector: document.getElementById('playbackSpeedSelector'),
      timerDisplay: document.getElementById('timerDisplay'),
      spoolCanvas: document.getElementById('spoolCanvas'),
    };
  
    // Disable buttons initially
    const transportButtons = [
      elements.playButton,
      elements.stopButton,
      elements.rewindButton,
      elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => btn && (btn.disabled = true));
  

     // Spool properties
     const spools = {
        left: { xRatio: 0.33, yRatio: 0.55, radiusRatio: 0.05, angle: 0 },
        right: { xRatio: 0.67, yRatio: 0.55, radiusRatio: 0.05, angle: 0 },
      };

      
     // Function to draw a single spool
     const drawSpool = (spool, width, height) => {
        const { xRatio, yRatio, radiusRatio, angle } = spool;
        const x = width * xRatio;
        const y = height * yRatio;
        const radius = Math.max(1.5, width * radiusRatio);
    
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
    
        // Main spool
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#000';
        ctx.fill();
    
        // Notches and border
        const notchCount = 3;
        const notchLength = radius * 0.15;
        const notchWidth = radius * 0.05;
        const outerRadius = Math.max(0, radius - 1.5);
    
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
    
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
        ctx.stroke();
    
        for (let i = 0; i < notchCount; i++) {
          const notchAngle = angle + (i * 2 * Math.PI) / notchCount;
          const startX = outerRadius * Math.cos(notchAngle);
          const startY = outerRadius * Math.sin(notchAngle);
          const endX = (outerRadius - notchLength) * Math.cos(notchAngle);
          const endY = (outerRadius - notchLength) * Math.sin(notchAngle);
    
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.lineWidth = notchWidth;
          ctx.stroke();
        }
    
        ctx.restore();
      };
    
      // Function to draw all spools
      const drawSpools = () => {
        const { width, height } = elements.spoolCanvas;
        ctx.clearRect(0, 0, width, height);
        Object.values(spools).forEach((spool) => drawSpool(spool, width, height));
      };
    
      // Animation loop for spools
      const animateSpools = (timestamp) => {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = (timestamp - lastTime) / 1000; // Convert to seconds
        lastTime = timestamp;
    
        const rotation = deltaTime * spoolSpeed * playbackRate * direction;
        Object.values(spools).forEach((spool) => {
          spool.angle += rotation;
        });
    
        drawSpools();
    
        if (isPlaying) {
          animationFrameId = requestAnimationFrame(animateSpools);
        }
      };

    // Set up canvas
    const ctx = elements.spoolCanvas.getContext('2d');
    const resizeCanvas = () => {
      elements.spoolCanvas.width = elements.spoolCanvas.clientWidth;
      elements.spoolCanvas.height = elements.spoolCanvas.clientHeight;
      drawSpools();
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  

    
   
  
    // Animation variables
    const spoolSpeed = Math.PI; // Radians per second
    let animationFrameId = null;
    let lastTime = 0;
  
    // Timer Interval
    let timerIntervalId = null;
  
    // Audio context and buffers
    let audioContext;
    const audioBuffers = {
      main: null,
      reversed: null,
      buttonPress: null,
      stopButtonPress: null,
      fastWindTape: null,
    };
    let sourceNode = null;
    let fastWindTapeSource = null;
  
    // Playback state
    let isPlaying = false;
    let playbackRate = 1;
    let currentPosition = 0; // in seconds
    let startTime = 0;
    let direction = 1; // 1 for forward, -1 for reverse
  
    // Loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Loading...';
    Object.assign(loadingMessage.style, {
      color: 'white',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '1000',
    });
    document.body.appendChild(loadingMessage);
  
    // Function to update the timer display
    const updateTimerDisplay = () => {
      const totalDuration = audioBuffers.main ? audioBuffers.main.duration : 0;
      const currentPos = isPlaying
        ? Math.min(
            Math.max(currentPosition + (audioContext.currentTime - startTime) * playbackRate * direction, 0),
            totalDuration
          )
        : currentPosition;
      elements.timerDisplay.textContent = `${formatTime(currentPos)} / ${formatTime(totalDuration)}`;
    };
  
    // Functions to start and stop the timer interval
    const startTimer = () => {
      if (!timerIntervalId) {
        timerIntervalId = setInterval(updateTimerDisplay, 250);
      }
    };
  
    const stopTimer = () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
      }
    };
  
   
  
    // Function to start playback
    const startPlayback = async () => {
      if (isPlaying || !audioBuffers.main) return;
  
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
  
      sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = direction === 1 ? audioBuffers.main : audioBuffers.reversed;
      sourceNode.playbackRate.value = playbackRate;
      sourceNode.connect(audioContext.destination);
  
      const offset = direction === 1 ? currentPosition : audioBuffers.main.duration - currentPosition;
      sourceNode.start(0, offset);
      startTime = audioContext.currentTime;
      isPlaying = true;
      animationFrameId = requestAnimationFrame(animateSpools);
      startTimer();
  
      sourceNode.onended = () => {
        stopPlayback();
        deactivatePlaybackMode();
      };
    };
  
    // Function to stop playback
    const stopPlayback = () => {
      if (!isPlaying) return;
  
      if (sourceNode) {
        sourceNode.onended = null;
        sourceNode.stop();
        sourceNode.disconnect();
        sourceNode = null;
      }
  
      currentPosition += (audioContext.currentTime - startTime) * playbackRate * direction;
      currentPosition = Math.max(0, Math.min(currentPosition, audioBuffers.main.duration));
  
      isPlaying = false;
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
      stopTimer();
      updateTimerDisplay();
    };
  
    // Function to switch playback modes
    const switchPlayback = async (newDirection, newRate, activeButton) => {
      if (isPlaying && direction === newDirection && playbackRate === newRate) return;
  
      playSound(audioContext, audioBuffers.buttonPress);
  
      if (isPlaying) {
        stopPlayback();
      }
  
      stopFastWindTape();
  
      direction = newDirection;
      playbackRate = newRate;
  
      setActiveButton(activeButton);
  
      await startPlayback();
  
      if (playbackRate > 1) {
        startFastWindTape();
      }
    };
  
    // Function to set active button
    const setActiveButton = (activeBtn) => {
      [elements.playButton, elements.rewindButton, elements.fastForwardButton].forEach((btn) => {
        btn.classList.toggle('active', btn === activeBtn);
      });
    };
  
    // Function to deactivate playback mode
    const deactivatePlaybackMode = () => {
      [elements.playButton, elements.rewindButton, elements.fastForwardButton].forEach((btn) => {
        btn.classList.remove('active');
      });
      stopFastWindTape();
    };
  
    // Function to enable transport buttons
    const enableButtons = () => {
      transportButtons.forEach((btn) => btn && (btn.disabled = false));
    };
  
    // Function to load all audio buffers
    const loadAllAudio = async () => {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
        const [
          main,
          buttonPress,
          stopButtonPress,
          fastWindTape,
        ] = await Promise.all([
          loadAudioBuffer(
            audioContext,
            'https://ordinals.com/content/fad631362e445afc1b078cd06d1a59c11acd24ac400abff60ed05742d63bff50i0'
          ),
          loadAudioBuffer(audioContext, 'assets/buttonPress.mp3'),
          loadAudioBuffer(audioContext, 'assets/stopButtonPress.mp3'),
          loadAudioBuffer(audioContext, 'assets/fastWindTape.mp3'),
        ]);
  
        audioBuffers.main = main;
  
        // Create reversed buffer
        audioBuffers.reversed = audioContext.createBuffer(
          main.numberOfChannels,
          main.length,
          main.sampleRate
        );
        for (let i = 0; i < main.numberOfChannels; i++) {
          const channelData = main.getChannelData(i);
          audioBuffers.reversed.getChannelData(i).set([...channelData].reverse());
        }
  
        audioBuffers.buttonPress = buttonPress;
        audioBuffers.stopButtonPress = stopButtonPress;
        audioBuffers.fastWindTape = fastWindTape;
  
        enableButtons();
        loadingMessage.remove();
        updateTimerDisplay();
      } catch (error) {
        console.error('Error loading audio:', error);
        loadingMessage.textContent = 'Failed to load audio.';
      }
    };
  
    // Functions to handle FastWindTape sound
    const startFastWindTape = () => {
      if (!audioBuffers.fastWindTape || fastWindTapeSource) return;
      fastWindTapeSource = audioContext.createBufferSource();
      fastWindTapeSource.buffer = audioBuffers.fastWindTape;
      fastWindTapeSource.loop = true;
      fastWindTapeSource.connect(audioContext.destination);
      fastWindTapeSource.start(0);
    };
  
    const stopFastWindTape = () => {
      if (fastWindTapeSource) {
        fastWindTapeSource.stop();
        fastWindTapeSource.disconnect();
        fastWindTapeSource = null;
      }
    };
  
    // Event Handlers
    elements.playButton.addEventListener('click', () => {
      const rate = parseFloat(elements.playbackSpeedSelector.value) || 1;
      switchPlayback(1, rate, elements.playButton);
    });
  
    elements.stopButton.addEventListener('click', () => {
      playSound(audioContext, audioBuffers.stopButtonPress);
      if (isPlaying) {
        stopPlayback();
      }
      currentPosition = 0;
      updateTimerDisplay();
      deactivatePlaybackMode();
      stopFastWindTape();
    });
  
    elements.rewindButton.addEventListener('click', () => {
      switchPlayback(-1, 10, elements.rewindButton);
    });
  
    elements.fastForwardButton.addEventListener('click', () => {
      switchPlayback(1, 10, elements.fastForwardButton);
    });
  
    elements.playbackSpeedSelector.addEventListener('change', () => {
      const selectedRate = parseFloat(elements.playbackSpeedSelector.value) || 1;
      playbackRate = selectedRate;
      if (isPlaying && sourceNode) {
        sourceNode.playbackRate.setValueAtTime(playbackRate, audioContext.currentTime);
      }
    });
  
    // Ensure timer interval is stopped on page unload
    window.addEventListener('beforeunload', stopTimer);
  
    // Initial draw of spools
    drawSpools();
  
    // Start loading audio
    loadAllAudio();
  })();