// audioPlayer.js

import { loadAllAudio, createReversedBuffer } from './bufferLoader.js';

export class AudioPlayer {
  constructor(audioProcessor) {
    this.processor = audioProcessor;
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

    // Initialize and load all audio buffers
    this.initialize();
  }

  /**
   * Initializes and loads all audio buffers.
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      const audioPaths = {
        main: 'https://ordinals.com/content/fad631362e445afc1b078cd06d1a59c11acd24ac400abff60ed05742d63bff50i0', // Replace with a valid URL or local path
        buttonPress: 'assets/buttonPress.mp3',
        stopButtonPress: 'assets/stopButtonPress.mp3',
        fastWindTape: 'assets/fastWindTape.mp3',
        resetButtonPress: 'assets/resetButtonPress.mp3',
      };

      // Load all audio buffers
      this.audioBuffers = await loadAllAudio(this.processor.audioContext, audioPaths);

      // Create reversed buffer if main audio is loaded
      if (this.audioBuffers.main) {
        this.audioBuffers.reversed = createReversedBuffer(this.processor.audioContext, this.audioBuffers.main);
      } else {
        console.warn('Main audio buffer is not loaded. Reversed buffer not created.');
      }
    } catch (error) {
      console.error('Error loading audio:', error);
      throw error;
    }
  }

   /**
   * Toggles a sound effect on or off.
   * @param {string} effectName - The name of the effect to toggle.
   */
   toggleEffect(effectName) {
    if (typeof this.processor.toggleEffect === 'function') {
      this.processor.toggleEffect(effectName);
    } else {
      console.error('toggleEffect method is not defined in AudioProcessor.');
    }
  }


  /**
 * Plays a specific AudioBuffer through a designated GainNode.
 * @param {AudioBuffer} buffer - The AudioBuffer to play.
 * @param {Object} [options] - Playback options.
 * @param {number} [options.offset=0] - Start time in seconds.
 * @param {number} [options.playbackRate=1] - Playback rate.
 * @param {boolean} [options.loop=false] - Whether to loop the audio.
 * @param {GainNode} [options.gainNode=null] - The GainNode to route the audio through.
 * @param {boolean} [options.useEffects=true] - Whether to apply SoundEffects.
 * @returns {AudioBufferSourceNode|null} - The source node if playback starts, else null.
 */
playSound(buffer, { offset = 0, playbackRate = 1, loop = false, gainNode = null, useEffects = true } = {}) {
    if (!buffer) {
      console.warn('Attempted to play a null or undefined buffer.');
      return null;
    }
  
    const source = this.processor.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.loop = loop;
  
    // Apply effects if required
    if (useEffects) {
      this.processor.applyEffects(source);
    } else if (gainNode) {
      source.connect(gainNode);
    } else {
      source.connect(this.processor.masterGain);
    }
  
    source.start(0, offset);
  
    if (!loop) {
      source.onended = () => {
        source.disconnect();
      };
    }
  
    console.log(`Playing sound: ${buffer.name || 'Unnamed Buffer'}, Use Effects: ${useEffects}`);
    return source;
  }

  /**
     * Plays the general button press sound.
     */
    playButtonPress() {
        this.playSound(this.audioBuffers.buttonPress, { 
        gainNode: this.processor.buttonPressGain,
        useEffects: false // Button presses should not be affected by SoundEffects
        });
    }
  

  /**
     * Plays the stop button press sound.
     */
    playStopButtonPress() {
        this.playSound(this.audioBuffers.stopButtonPress, { 
        gainNode: this.processor.buttonPressGain,
        useEffects: false
        });
    }
    
    /**
     * Plays the reset button press sound.
     */
    playResetButtonPress() {
        this.playSound(this.audioBuffers.resetButtonPress, { 
        gainNode: this.processor.buttonPressGain,
        useEffects: false
        });
    }
  
  /**
   * Starts playing the main audio based on the current direction and playback rate.
   */
  playAudio() {
    if (this.isPlaying || !this.audioBuffers.main) return;

    if (this.processor.audioContext.state === 'suspended') {
      this.processor.resumeContext()
        .then(() => this._startMainAudio())
        .catch((error) => {
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
    const buffer = this.direction === 1 ? this.audioBuffers.main : this.audioBuffers.reversed;
    this.sourceNode = this.processor.audioContext.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.playbackRate.value = this.playbackRate;
  
    // Apply effects to the source node
    this.processor.applyEffects(this.sourceNode);
  
    const offset = this.direction === 1
      ? this.currentPosition
      : this.audioBuffers.main.duration - this.currentPosition;
    this.sourceNode.start(0, offset);
    this.startTime = this.processor.audioContext.currentTime;
    this.isPlaying = true;
  
    // Handle Song End
    this.sourceNode.onended = () => {
      this.stopAudio();
      // Dispatch a custom event to notify that playback has ended
      window.dispatchEvent(new Event('playbackEnded'));
    };
  
    console.log('Main audio playback started with effects applied.');
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
    this.processor.disconnectEffects();

    // Update currentPosition
    const elapsed = this.processor.audioContext.currentTime - this.startTime;
    const deltaPosition = elapsed * this.playbackRate * this.direction;
    this.currentPosition += deltaPosition;
    this.currentPosition = Math.max(0, Math.min(this.currentPosition, this.audioBuffers.main.duration));

    this.isPlaying = false;

    // Dispatch a custom event to notify that playback has stopped
    window.dispatchEvent(new Event('playbackStopped'));
  }

  /**
   * Resets the playback position to the beginning.
   */
  resetAudio() {
    this.stopAudio(); // Stop if playing
    this.currentPosition = 0; // Reset position
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
    this.playSound(this.audioBuffers.buttonPress, { gainNode: this.processor.buttonPressGain });

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

    this.fastWindTapeSource = this.playSound(this.audioBuffers.fastWindTape, { loop: true, gainNode: this.processor.tapeNoiseGain });
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
   * Gets the current playback position in seconds.
   * @returns {number} - The current playback position.
   */
  getCurrentPosition() {
    if (!this.isPlaying) {
      return this.currentPosition;
    }

    const elapsed = this.processor.audioContext.currentTime - this.startTime;
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
      this.sourceNode.playbackRate.setValueAtTime(this.playbackRate, this.processor.audioContext.currentTime);
    }
  }

  /**
   * Pauses the audio playback.
   */
  pauseAudio() {
    if (!this.isPlaying) return;

    this.stopAudio();
    if (this.processor.audioContext.state === 'running') {
      this.processor.suspendContext();
    }
  }

  /**
   * Resumes the audio playback if it was suspended.
   */
  resumeAudio() {
    if (!this.processor.isSuspended) return;

    this.processor.resumeContext()
      .then(() => {
        if (this.isPlaying) {
          this.playAudio();
        }
      })
      .catch((error) => {
        console.error('Error resuming AudioContext:', error);
      });
  }

  /**
   * Destroys the AudioPlayer instance by stopping playback and clearing buffers.
   */
  destroy() {
    this.stopAudio();
    this.stopFastWindTape();
    this.processor.closeContext();
    this.audioBuffers = {};
  }
}
