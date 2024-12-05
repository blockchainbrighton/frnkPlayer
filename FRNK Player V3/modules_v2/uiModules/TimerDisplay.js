// TimerDisplay.js

export class TimerDisplay {
    constructor(timerElement, audioPlayer) {
      this.timerElement = timerElement;
      this.audioPlayer = audioPlayer;
  
      this.intervalId = null;
  
      // Bind methods
      this.update = this.update.bind(this);
    }
  
    /**
     * Initialize the timer display.
     */
    init() {
      this.update();
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
    update() {
      const totalDuration = this.audioPlayer.audioBuffers.main
        ? this.audioPlayer.audioBuffers.main.duration
        : 0;
      const currentPos = this.audioPlayer.getCurrentPosition();
      this.timerElement.textContent = `${this.formatTime(
        currentPos
      )} / ${this.formatTime(totalDuration)}`;
    }
  
    /**
     * Start the timer interval to update the timer display.
     */
    start() {
      if (!this.intervalId) {
        this.intervalId = setInterval(this.update, 250);
      }
    }
  
    /**
     * Stop the timer interval.
     */
    stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }
  }
  