// audioManager.js

import { loadAllAudio, createReversedBuffer } from './bufferLoader.js';
import { SoundEffects } from './soundEffects.js';

export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.audioBuffers = {
      main: null,
      reversed: null,
      buttonPress: null,
      stopButtonPress: null,
      fastWindTape: null,
      resetButtonPress: null,
    };
    this.sourceNode = null;
    this.fastWindTapeSource = null;
    this.isPlaying = false;
    this.playbackRate = 1;
    this.direction = 1; // 1 for forward, -1 for reverse
    this.currentPosition = 0; // in seconds
    this.startTime = 0;
    this.isSuspended = false;

    // Initialize the AudioContext
    this.initAudioContext();

    // Initialize SoundEffects
    this.soundEffects = new SoundEffects(this.audioContext);
  }

  /**
   * Initializes the Audio Context.
   */
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Handle context state changes
      this.audioContext.onstatechange = () => {
        if (this.audioContext.state === 'suspended') {
          this.isSuspended = true;
          console.warn('AudioContext is suspended.');
        } else if (this.audioContext.state === 'running') {
          this.isSuspended = false;
          console.info('AudioContext is running.');
        }
      };
    }
  }

  /**
   * Resets the playback position to the beginning.
   */
  resetAudio() {
    this.stopAudio(); // Stop if playing
    this.currentPosition = 0; // Reset position
  }

  /**
   * Initializes and loads all audio buffers.
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.loadAllAudio();
  }

  /**
   * Loads all required audio buffers.
   * @returns {Promise<void>}
   */
  async loadAllAudio() {
    try {
      const audioPaths = {
        main: 'https://ordinals.com/content/fad631362e445afc1b078cd06d1a59c11acd24ac400abff60ed05742d63bff50i0', // Replace with a valid URL or local path
        buttonPress: 'assets/buttonPress.mp3',
        stopButtonPress: 'assets/stopButtonPress.mp3',
        fastWindTape: 'assets/fastWindTape.mp3',
        resetButtonPress: 'assets/resetButtonPress.mp3',
      };

      // Load all audio buffers
      this.audioBuffers = await loadAllAudio(this.audioContext, audioPaths);

      // Create reversed buffer if main audio is loaded
      if (this.audioBuffers.main) {
        this.audioBuffers.reversed = createReversedBuffer(this.audioContext, this.audioBuffers.main);
      } else {
        console.warn('Main audio buffer is not loaded. Reversed buffer not created.');
      }
    } catch (error) {
      console.error('Error loading audio:', error);
      throw error;
    }
  }

  /**
   * Plays a specific AudioBuffer.
   * @param {AudioBuffer} buffer - The AudioBuffer to play.
   * @param {Object} [options] - Playback options.
   * @param {number} [options.offset=0] - Start time in seconds.
   * @param {number} [options.playbackRate=1] - Playback rate.
   * @param {boolean} [options.loop=false] - Whether to loop the audio.
   * @returns {AudioBufferSourceNode|null} - The source node if playback starts, else null.
   */
  playSound(buffer, options = {}) {
    const { offset = 0, playbackRate = 1, loop = false } = options;

    if (!buffer) {
      console.warn('Attempted to play a null or undefined buffer.');
      return null;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.loop = loop;
    source.connect(this.audioContext.destination);
    source.start(0, offset);

    // Optional: Handle end of playback if not looping
    if (!loop) {
      source.onended = () => {
        source.disconnect();
      };
    }

    return source;
  }

  /**
   * Starts playing the main audio based on the current direction and playback rate.
   */
  playAudio() {
    if (this.isPlaying || !this.audioBuffers.main) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this._startMainAudio();
      }).catch((error) => {
        console.error('Error resuming AudioContext:', error);
      });
    } else {
      this._startMainAudio();
    }
  }

  /**
   * Internal method to start the main audio playback.
   * @private
   */
  _startMainAudio() {
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.direction === 1 ? this.audioBuffers.main : this.audioBuffers.reversed;
    this.sourceNode.playbackRate.value = this.playbackRate;

    let lastNode = this.sourceNode;

    // Apply gramophone effect if enabled
    if (this.soundEffects.effectsEnabled.gramophone) {
      lastNode.connect(this.soundEffects.effectNodes.gramophone);
      lastNode = this.soundEffects.effectNodes.lowShelfFilter;
    }

    // Connect to destination
    lastNode.connect(this.audioContext.destination);

    const offset = this.direction === 1 ? this.currentPosition : this.audioBuffers.main.duration - this.currentPosition;
    this.sourceNode.start(0, offset);
    this.startTime = this.audioContext.currentTime;
    this.isPlaying = true;

    // If crackle effect is enabled, connect it to the destination
    if (this.soundEffects.effectsEnabled.crackle && this.soundEffects.crackleGain && this.soundEffects.crackleStarted) {
      this.soundEffects.connectCrackle();
    }

    // Handle Song End
    this.sourceNode.onended = () => {
      this.stopAudio();
      // Dispatch a custom event to notify that playback has ended
      window.dispatchEvent(new Event('playbackEnded'));
    };
  }

  /**
   * Stops the main audio playback and disconnects effects.
   */
  stopAudio() {
    if (!this.isPlaying) return;

    if (this.sourceNode) {
      this.sourceNode.onended = null; // Prevent onended from firing
      try {
        this.sourceNode.stop();
      } catch (error) {
        console.warn('Error stopping sourceNode:', error);
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Disconnect effects
    this.soundEffects.disconnectEffects();

    // Update currentPosition
    const elapsed = this.audioContext.currentTime - this.startTime;
    const deltaPosition = elapsed * this.playbackRate * this.direction;
    this.currentPosition += deltaPosition;
    this.currentPosition = Math.max(0, Math.min(this.currentPosition, this.audioBuffers.main.duration));

    this.isPlaying = false;

    // Dispatch a custom event to notify that playback has stopped
    window.dispatchEvent(new Event('playbackStopped'));
  }

  /**
   * Switches the playback direction and rate, and manages related sound effects.
   * @param {number} newDirection - The new playback direction (1 for forward, -1 for reverse).
   * @param {number} newRate - The new playback rate.
   */
  switchPlayback(newDirection, newRate) {
    if (this.isPlaying && this.direction === newDirection && this.playbackRate === newRate) {
      return;
    }

    // Play button press sound
    this.playSound(this.audioBuffers.buttonPress);

    // Stop any ongoing playback
    if (this.isPlaying) {
      this.stopAudio();
    }

    // Update playback parameters
    this.direction = newDirection;
    this.playbackRate = newRate;

    // Play main audio with new settings
    this.playAudio();

    // Handle FastWindTape Sound Effects
    if (this.playbackRate > 1) {
      this.startFastWindTape();
    } else {
      this.stopFastWindTape();
    }
  }

  /**
   * Starts playing the FastWindTape sound in a loop.
   */
  startFastWindTape() {
    if (!this.audioBuffers.fastWindTape || this.fastWindTapeSource) return;

    this.fastWindTapeSource = this.playSound(this.audioBuffers.fastWindTape, { loop: true });
  }

  /**
   * Stops the FastWindTape sound playback.
   */
  stopFastWindTape() {
    if (this.fastWindTapeSource) {
      try {
        this.fastWindTapeSource.stop();
      } catch (error) {
        console.warn('Error stopping fastWindTapeSource:', error);
      }
      this.fastWindTapeSource.disconnect();
      this.fastWindTapeSource = null;
    }
  }

  /**
   * Plays the general button press sound.
   */
  playButtonPress() {
    this.playSound(this.audioBuffers.buttonPress);
  }

  /**
   * Plays the stop button press sound.
   */
  playStopButtonPress() {
    this.playSound(this.audioBuffers.stopButtonPress);
  }

  /**
   * Plays the reset button press sound.
   */
  playResetButtonPress() {
    this.playSound(this.audioBuffers.resetButtonPress);
  }

  /**
   * Gets the current playback position in seconds.
   * @returns {number} - The current playback position.
   */
  getCurrentPosition() {
    if (!this.isPlaying) {
      return this.currentPosition;
    }

    const elapsed = this.audioContext.currentTime - this.startTime;
    const deltaPosition = elapsed * this.playbackRate * this.direction;
    let pos = this.currentPosition + deltaPosition;
    pos = Math.max(0, Math.min(pos, this.audioBuffers.main.duration));
    return pos;
  }

  /**
   * Sets the playback rate and updates the source node if playing.
   * @param {number} rate - The desired playback rate.
   */
  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.isPlaying && this.sourceNode) {
      this.sourceNode.playbackRate.setValueAtTime(this.playbackRate, this.audioContext.currentTime);
    }
  }

  /**
   * Toggles a sound effect on or off.
   * @param {string} effectName - 'crackle' or 'gramophone'
   */
  toggleEffect(effectName) {
    this.soundEffects.toggleEffect(effectName);

    // If gramophone effect is toggled while playing, apply or remove effect
    if (effectName === 'gramophone') {
      if (this.isPlaying && this.sourceNode) {
        this.soundEffects.applyEffects(this.sourceNode);
      }
    }
  }

  /**
   * Pauses the audio playback.
   */
  pauseAudio() {
    if (!this.isPlaying) return;

    this.stopAudio();
    if (this.audioContext.state === 'running') {
      this.audioContext.suspend().then(() => {
        this.isSuspended = true;
        console.info('AudioContext suspended.');
      }).catch((error) => {
        console.error('Error suspending AudioContext:', error);
      });
    }
  }

  /**
   * Resumes the audio playback if it was suspended.
   */
  resumeAudio() {
    if (!this.isSuspended) return;

    this.audioContext.resume().then(() => {
      this.isSuspended = false;
      console.info('AudioContext resumed.');
      if (this.isPlaying) {
        this.playAudio();
      }
    }).catch((error) => {
      console.error('Error resuming AudioContext:', error);
    });
  }

  /**
   * Destroys the AudioManager instance by stopping playback and closing the AudioContext.
   */
  destroy() {
    this.stopAudio();
    this.stopFastWindTape();
    if (this.audioContext) {
      this.audioContext.close().then(() => {
        console.info('AudioContext closed.');
      }).catch((error) => {
        console.error('Error closing AudioContext:', error);
      });
      this.audioContext = null;
    }
    this.audioBuffers = {};
  }
}
