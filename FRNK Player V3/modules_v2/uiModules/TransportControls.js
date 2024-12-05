// TransportControls.js

export class TransportControls {
    constructor(elements, audioPlayer, animationManager, timerDisplay) {
      this.playButton = elements.playButton;
      this.stopButton = elements.stopButton;
      this.rewindButton = elements.rewindButton;
      this.fastForwardButton = elements.fastForwardButton;
      this.playbackSpeedSelector = elements.playbackSpeedSelector;
  
      this.audioPlayer = audioPlayer;
      this.animationManager = animationManager;
      this.timerDisplay = timerDisplay;
  
      // Click timeout for stop button (to differentiate single and double clicks)
      this.stopClickTimeout = null;
  
      // Bind methods
      this.handlePlayClick = this.handlePlayClick.bind(this);
      this.handleStopButtonClick = this.handleStopButtonClick.bind(this);
      this.handleStopSingleClick = this.handleStopSingleClick.bind(this);
      this.handleStopDoubleClick = this.handleStopDoubleClick.bind(this);
      this.handleRewindClick = this.handleRewindClick.bind(this);
      this.handleFastForwardClick = this.handleFastForwardClick.bind(this);
      this.handlePlaybackSpeedChange = this.handlePlaybackSpeedChange.bind(this);
    }
  
    /**
     * Initialize event listeners for transport controls.
     */
    init() {
      // Play Button Click
      this.playButton.addEventListener('click', this.handlePlayClick);
  
      // Stop Button Click (handles single and double clicks)
      this.stopButton.addEventListener('click', this.handleStopButtonClick);
  
      // Rewind Button Click
      this.rewindButton.addEventListener('click', this.handleRewindClick);
  
      // Fast Forward Button Click
      this.fastForwardButton.addEventListener('click', this.handleFastForwardClick);
  
      // Playback Speed Selector Change
      this.playbackSpeedSelector.addEventListener('change', this.handlePlaybackSpeedChange);
    }
  
    /**
     * Handle Play button click.
     */
    handlePlayClick() {
      const rate = parseFloat(this.playbackSpeedSelector.value) || 1;
      this.switchPlayback(1, rate, this.playButton);
    }
  
    /**
     * Handle Stop button clicks, differentiating between single and double clicks.
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
     * Handle single click on the Stop button: stop playback without resetting.
     */
    handleStopSingleClick() {
      // Play stop button press sound
      this.audioPlayer.playStopButtonPress();
  
      if (this.audioPlayer.isPlaying) {
        this.audioPlayer.stopAudio();
        // Do not reset currentPosition
        this.timerDisplay.update();
        this.deactivatePlaybackMode();
        this.audioPlayer.stopFastWindTape();
      }
    }
  
    /**
     * Handle double click on the Stop button: stop playback and reset to beginning.
     */
    handleStopDoubleClick() {
      // Play reset button press sound
      this.audioPlayer.playResetButtonPress();
  
      // Reset audio playback
      this.audioPlayer.resetAudio();
      this.timerDisplay.update();
      this.deactivatePlaybackMode();
      this.audioPlayer.stopFastWindTape();
    }
  
    /**
     * Handle Rewind button click.
     */
    handleRewindClick() {
      this.switchPlayback(-1, 10, this.rewindButton);
    }
  
    /**
     * Handle Fast Forward button click.
     */
    handleFastForwardClick() {
      this.switchPlayback(1, 10, this.fastForwardButton);
    }
  
    /**
     * Handle Playback Speed Selector change.
     */
    handlePlaybackSpeedChange() {
      const selectedRate = parseFloat(this.playbackSpeedSelector.value) || 1;
      this.audioPlayer.setPlaybackRate(selectedRate);
  
      // If playback is ongoing, update animation speed
      if (this.audioPlayer.isPlaying) {
        this.animationManager.updateAnimationSpeed(this.audioPlayer.playbackRate, this.audioPlayer.direction);
      }
    }
  
    /**
     * Switch playback mode based on direction and rate.
     * @param {number} newDirection - 1 for forward, -1 for reverse.
     * @param {number} newRate - Playback rate.
     * @param {HTMLElement} activeButton - The button element that was activated.
     */
    switchPlayback(newDirection, newRate, activeButton) {
      // Play button press sound
      this.audioPlayer.playButtonPress();
  
      // Switch playback in AudioPlayer
      this.audioPlayer.switchPlayback(newDirection, newRate);
  
      // Update active button states
      this.setActiveButton(activeButton);
  
      // Start or stop animation based on playback state
      if (this.audioPlayer.isPlaying) {
        this.animationManager.startAnimation(this.audioPlayer.playbackRate, this.audioPlayer.direction);
        this.timerDisplay.start();
      } else {
        this.animationManager.stopAnimation();
        this.timerDisplay.stop();
      }
    }
  
    /**
     * Set the active button's visual state.
     * @param {HTMLElement} activeBtn - The button to activate.
     */
    setActiveButton(activeBtn) {
      const transportButtons = [
        this.playButton,
        this.rewindButton,
        this.fastForwardButton,
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
        this.playButton,
        this.rewindButton,
        this.fastForwardButton,
      ];
      transportButtons.forEach((btn) => {
        if (btn) {
          btn.classList.remove('active');
        }
      });
      this.audioPlayer.stopFastWindTape();
      this.animationManager.stopAnimation();
      this.timerDisplay.stop();
      this.timerDisplay.update();
    }
  }
  