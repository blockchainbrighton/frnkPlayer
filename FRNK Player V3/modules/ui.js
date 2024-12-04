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

    // Timer Interval ID
    this.timerIntervalId = null;

    // Loading message element
    this.loadingMessage = this.createLoadingMessage();

    // Click timeout for stop button (to differentiate single and double clicks)
    this.stopClickTimeout = null;

    // Bind methods to maintain 'this' context
    this.handlePlaybackEnded = this.handlePlaybackEnded.bind(this);
    this.handlePlaybackStopped = this.handlePlaybackStopped.bind(this);
    this.handleStopButtonClick = this.handleStopButtonClick.bind(this);
    this.handleStopSingleClick = this.handleStopSingleClick.bind(this);
    this.handleStopDoubleClick = this.handleStopDoubleClick.bind(this);
  }

  /**
   * Create and display a loading message on the screen.
   * @returns {HTMLElement} The loading message element.
   */
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
      fontSize: '1.5em',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '20px',
      borderRadius: '8px',
    });
    document.body.appendChild(loadingMessage);
    return loadingMessage;
  }

  /**
   * Initialize the UI by loading audio, setting up animations, and attaching event listeners.
   */
  async init() {
    try {
      // Disable transport buttons initially
      this.disableTransportButtons();

      // Initialize Animation Manager
      this.animationManager.initResizeListener();
      this.animationManager.resizeCanvas();

      // Load all audio resources
      await this.audioManager.loadAllAudio();

      // Enable transport buttons after audio is loaded
      this.enableTransportButtons();

      // Remove loading message
      this.loadingMessage.remove();

      // Update timer display initially
      this.updateTimerDisplay();

      // Attach event listeners to UI elements
      this.attachEventListeners();

      // Listen to custom audio events
      window.addEventListener('playbackEnded', this.handlePlaybackEnded);
      window.addEventListener('playbackStopped', this.handlePlaybackStopped);
    } catch (error) {
      console.error('Initialization failed:', error);
      this.loadingMessage.textContent = 'Failed to load audio.';
      // Optionally, display an error message to the user
    }
  }

  /**
   * Disable transport control buttons.
   */
  disableTransportButtons() {
    const transportButtons = [
      this.elements.playButton,
      this.elements.stopButton,
      this.elements.rewindButton,
      this.elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => {
      if (btn) {
        btn.disabled = true;
        btn.classList.add('disabled');
      }
    });
  }

  /**
   * Enable transport control buttons.
   */
  enableTransportButtons() {
    const transportButtons = [
      this.elements.playButton,
      this.elements.stopButton,
      this.elements.rewindButton,
      this.elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('disabled');
      }
    });
  }

  /**
   * Attach event listeners to UI elements.
   */
  attachEventListeners() {
    // Play Button Click
    this.elements.playButton.addEventListener('click', () => {
      const rate = parseFloat(this.elements.playbackSpeedSelector.value) || 1;
      this.switchPlayback(1, rate, this.elements.playButton);
    });

    // Stop Button Click (handles single and double clicks)
    this.elements.stopButton.addEventListener('click', this.handleStopButtonClick);

    // Rewind Button Click
    this.elements.rewindButton.addEventListener('click', () => {
      this.switchPlayback(-1, 10, this.elements.rewindButton);
    });

    // Fast Forward Button Click
    this.elements.fastForwardButton.addEventListener('click', () => {
      this.switchPlayback(1, 10, this.elements.fastForwardButton);
    });

    // Playback Speed Selector Change
    this.elements.playbackSpeedSelector.addEventListener('change', () => {
      const selectedRate = parseFloat(this.elements.playbackSpeedSelector.value) || 1;
      this.audioManager.setPlaybackRate(selectedRate);

      // If playback is ongoing, update animation speed
      if (this.audioManager.isPlaying) {
        this.animationManager.updateAnimationSpeed(this.audioManager.playbackRate, this.audioManager.direction);
      }
    });

    // Ensure timer interval is stopped on page unload
    window.addEventListener('beforeunload', () => {
      this.stopTimerInterval();
    });
  }

  /**
   * Handle stop button clicks, differentiating between single and double clicks.
   */
  handleStopButtonClick() {
    const DOUBLE_CLICK_DELAY = 250; // milliseconds

    if (this.stopClickTimeout) {
      // Double Click Detected
      clearTimeout(this.stopClickTimeout);
      this.stopClickTimeout = null;
      this.handleStopDoubleClick();
    } else {
      // Single Click Detected (tentatively)
      this.stopClickTimeout = setTimeout(() => {
        this.handleStopSingleClick();
        this.stopClickTimeout = null;
      }, DOUBLE_CLICK_DELAY);
    }
  }

  /**
   * Handle single click on the stop button: stop playback without resetting.
   */
  handleStopSingleClick() {
    // Play stop button press sound
    this.audioManager.playStopButtonPress();

    if (this.audioManager.isPlaying) {
      this.audioManager.stopAudio();
      // Do not reset currentPosition
      this.updateTimerDisplay();
      this.deactivatePlaybackMode();
      this.audioManager.stopFastWindTape();
    }
  }

  /**
   * Handle double click on the stop button: stop playback and reset to beginning.
   */
  handleStopDoubleClick() {
    // Play stop button press sound (you can choose to play a different sound if desired)
    this.audioManager.playResetButtonPress();

    // Reset audio playback
    this.audioManager.resetAudio();
    this.updateTimerDisplay();
    this.deactivatePlaybackMode();
    this.audioManager.stopFastWindTape();
  }

  /**
   * Switch playback mode based on direction and rate.
   * @param {number} newDirection - 1 for forward, -1 for reverse.
   * @param {number} newRate - Playback rate.
   * @param {HTMLElement} activeButton - The button element that was activated.
   */
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

  /**
   * Set the active button's visual state.
   * @param {HTMLElement} activeBtn - The button to activate.
   */
  setActiveButton(activeBtn) {
    const transportButtons = [
      this.elements.playButton,
      this.elements.rewindButton,
      this.elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => {
      if (btn) {
        btn.classList.toggle('active', btn === activeBtn);
      }
    });
  }

  /**
   * Deactivate all playback modes and reset UI elements.
   */
  deactivatePlaybackMode() {
    const transportButtons = [
      this.elements.playButton,
      this.elements.rewindButton,
      this.elements.fastForwardButton,
    ];
    transportButtons.forEach((btn) => {
      if (btn) {
        btn.classList.remove('active');
      }
    });
    this.audioManager.stopFastWindTape();
    this.animationManager.stopAnimation();
    this.stopTimerInterval();
    this.updateTimerDisplay();
  }

  /**
   * Format time in MM:SS format.
   * @param {number} seconds - Time in seconds.
   * @returns {string} Formatted time string.
   */
  formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  /**
   * Update the timer display based on current playback position.
   */
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

  /**
   * Start the timer interval to update the timer display.
   */
  startTimerInterval() {
    if (!this.timerIntervalId) {
      this.timerIntervalId = setInterval(() => this.updateTimerDisplay(), 250);
    }
  }

  /**
   * Stop the timer interval.
   */
  stopTimerInterval() {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  /**
   * Handle the 'playbackEnded' custom event.
   */
  handlePlaybackEnded() {
    this.deactivatePlaybackMode();
  }

  /**
   * Handle the 'playbackStopped' custom event.
   */
  handlePlaybackStopped() {
    this.deactivatePlaybackMode();
  }
}

// Initialize the UI Manager when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const uiManager = new UIManager();
  uiManager.init();
});
