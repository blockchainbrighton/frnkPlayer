// ui.js

import { AudioManager } from './audio.js';
import { AnimationManager } from './animation.js';

class UIManager {
  constructor() {
    // Initialize Audio and Animation Managers
    this.audioManager = new AudioManager();
    this.animationManager = new AnimationManager(document.getElementById('spoolCanvas'));

    // Get references to DOM elements
    this.elements = {
      playButton: document.getElementById('playButton'),
      stopButton: document.getElementById('stopButton'),
      rewindButton: document.getElementById('rewindButton'),
      fastForwardButton: document.getElementById('fastForwardButton'),
      playbackSpeedSelector: document.getElementById('playbackSpeedSelector'),
      timerDisplay: document.getElementById('timerDisplay'),
      spoolCanvas: document.getElementById('spoolCanvas'),
    };

    // Timer Interval
    this.timerIntervalId = null;

    // Loading message
    this.loadingMessage = this.createLoadingMessage();

    // Bind methods
    this.handlePlaybackEnded = this.handlePlaybackEnded.bind(this);
    this.handlePlaybackStopped = this.handlePlaybackStopped.bind(this);
  }

  // Create and display loading message
  createLoadingMessage() {
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
    return loadingMessage;
  }

  // Initialize UI
  async init() {
    try {
      // Disable buttons initially
      this.disableTransportButtons();

      // Initialize Animation
      this.animationManager.initResizeListener();
      this.animationManager.resizeCanvas();

      // Load all audio
      await this.audioManager.loadAllAudio();

      // Enable buttons after loading
      this.enableTransportButtons();

      // Remove loading message
      this.loadingMessage.remove();

      // Update timer display
      this.updateTimerDisplay();

      // Attach Event Listeners
      this.attachEventListeners();

      // Listen to custom audio events
      window.addEventListener('playbackEnded', this.handlePlaybackEnded);
      window.addEventListener('playbackStopped', this.handlePlaybackStopped);
    } catch (error) {
      console.error('Initialization failed:', error);
      this.loadingMessage.textContent = 'Failed to load audio.';
    }
  }

  // Disable transport buttons
  disableTransportButtons() {
    const transportButtons = [
      this.elements.playButton,
      this.elements.stopButton,
      this.elements.rewindButton,
      this.elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => btn && (btn.disabled = true));
  }

  // Enable transport buttons
  enableTransportButtons() {
    const transportButtons = [
      this.elements.playButton,
      this.elements.stopButton,
      this.elements.rewindButton,
      this.elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => btn && (btn.disabled = false));
  }

  // Attach event listeners to buttons and selectors
  attachEventListeners() {
    this.elements.playButton.addEventListener('click', () => {
      const rate = parseFloat(this.elements.playbackSpeedSelector.value) || 1;
      this.switchPlayback(1, rate, this.elements.playButton);
    });

    this.elements.stopButton.addEventListener('click', () => {
      this.audioManager.playStopButtonPress();
      if (this.audioManager.isPlaying) {
        this.audioManager.stopAudio();
      }
      this.audioManager.currentPosition = 0;
      this.updateTimerDisplay();
      this.deactivatePlaybackMode();
      this.audioManager.stopFastWindTape();
    });

    this.elements.rewindButton.addEventListener('click', () => {
      this.switchPlayback(-1, 10, this.elements.rewindButton);
    });

    this.elements.fastForwardButton.addEventListener('click', () => {
      this.switchPlayback(1, 10, this.elements.fastForwardButton);
    });

    this.elements.playbackSpeedSelector.addEventListener('change', () => {
      const selectedRate = parseFloat(this.elements.playbackSpeedSelector.value) || 1;
      this.audioManager.setPlaybackRate(selectedRate);

      if (this.audioManager.isPlaying && this.audioManager.direction === 1) {
        // Playback rate already updated in audio manager
      }

      // If in Fast Forward or Rewind, playback rate is handled by transport mode
    });

    // Ensure timer interval is stopped on page unload
    window.addEventListener('beforeunload', () => {
      this.stopTimerInterval();
    });
  }

  // Switch playback mode
  switchPlayback(newDirection, newRate, activeButton) {
    // Play button press sound
    this.audioManager.playButtonPress();

    // Switch playback in Audio Manager
    this.audioManager.switchPlayback(newDirection, newRate);

    // Update active button states
    this.setActiveButton(activeButton);

    // Start or stop animation based on playback state
    if (this.audioManager.isPlaying) {
      this.animationManager.startAnimation(this.audioManager.playbackRate, this.audioManager.direction);
      this.startTimerInterval();
    } else {
      this.animationManager.stopAnimation();
      this.stopTimerInterval();
    }
  }

  // Set active button
  setActiveButton(activeBtn) {
    const transportButtons = [
      this.elements.playButton,
      this.elements.rewindButton,
      this.elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => {
      btn.classList.toggle('active', btn === activeBtn);
    });
  }

  // Deactivate playback mode
  deactivatePlaybackMode() {
    const transportButtons = [
      this.elements.playButton,
      this.elements.rewindButton,
      this.elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => {
      btn.classList.remove('active');
    });
    this.audioManager.stopFastWindTape();
    this.animationManager.stopAnimation();
    this.stopTimerInterval();
    this.updateTimerDisplay();
  }

  // Format time in MM:SS
  formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  // Update the timer display
  updateTimerDisplay() {
    const totalDuration = this.audioManager.audioBuffers.main
      ? this.audioManager.audioBuffers.main.duration
      : 0;
    const currentPos = this.audioManager.isPlaying
      ? Math.min(
          Math.max(
            this.audioManager.currentPosition +
              (this.audioManager.audioContext.currentTime - this.audioManager.startTime) *
                this.audioManager.playbackRate *
                this.audioManager.direction,
            0
          ),
          totalDuration
        )
      : this.audioManager.currentPosition;
    this.elements.timerDisplay.textContent = `${this.formatTime(
      currentPos
    )} / ${this.formatTime(totalDuration)}`;
  }

  // Start the timer interval
  startTimerInterval() {
    if (!this.timerIntervalId) {
      this.timerIntervalId = setInterval(() => this.updateTimerDisplay(), 250);
    }
  }

  // Stop the timer interval
  stopTimerInterval() {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  // Handle playback ended event
  handlePlaybackEnded() {
    this.deactivatePlaybackMode();
  }

  // Handle playback stopped event
  handlePlaybackStopped() {
    this.deactivatePlaybackMode();
  }
}

// Initialize the UI Manager when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const uiManager = new UIManager();
  uiManager.init();
});