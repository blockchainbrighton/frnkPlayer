// audio.js

/**
 * AudioManager Class
 * Handles audio loading, playback, and control functionalities.
 */
export class AudioManager {
  /**
   * Initializes the AudioManager with default settings.
   */
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
  }

  /**
   * Initializes the Audio Context.
   */
  initAudioContext() {
      if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
   * Loads and decodes an audio buffer from a given URL.
   * @param {string} url - The URL of the audio file.
   * @returns {Promise<AudioBuffer>} - The decoded AudioBuffer.
   */
  async loadAudioBuffer(url) {
      try {
          const response = await fetch(url);
          if (!response.ok) {
              throw new Error(`Failed to load audio from ${url}: ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          return await this.audioContext.decodeAudioData(arrayBuffer);
      } catch (error) {
          console.error(`Error loading audio buffer from ${url}:`, error);
          throw error;
      }
  }

  /**
   * Loads all required audio buffers.
   * @returns {Promise<void>}
   */
  async loadAllAudio() {
      try {
          this.initAudioContext();

          const audioPaths = {
              main: 'https://ordinals.com/content/fad631362e445afc1b078cd06d1a59c11acd24ac400abff60ed05742d63bff50i0',
              buttonPress: 'assets/buttonPress.mp3',
              stopButtonPress: 'assets/stopButtonPress.mp3',
              fastWindTape: 'assets/fastWindTape.mp3',
              resetButtonPress: 'assets/resetButtonPress.mp3',
          };

          const bufferEntries = await Promise.all(
              Object.entries(audioPaths).map(async ([key, path]) => [key, await this.loadAudioBuffer(path)])
          );

          bufferEntries.forEach(([key, buffer]) => {
              this.audioBuffers[key] = buffer;
          });

          // Create reversed buffer
          this.audioBuffers.reversed = this.createReversedBuffer(this.audioBuffers.main);
      } catch (error) {
          console.error('Error loading audio:', error);
          throw error;
      }
  }

  /**
   * Creates a reversed version of a given AudioBuffer.
   * @param {AudioBuffer} buffer - The original AudioBuffer.
   * @returns {AudioBuffer} - The reversed AudioBuffer.
   */
  createReversedBuffer(buffer) {
      const reversedBuffer = this.audioContext.createBuffer(
          buffer.numberOfChannels,
          buffer.length,
          buffer.sampleRate
      );

      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          const reversedData = reversedBuffer.getChannelData(channel);
          for (let i = 0; i < channelData.length; i++) {
              reversedData[i] = channelData[channelData.length - i - 1];
          }
      }

      return reversedBuffer;
  }

  /**
   * Plays a specific AudioBuffer.
   * @param {AudioBuffer} buffer - The AudioBuffer to play.
   * @returns {AudioBufferSourceNode|null} - The source node if playback starts, else null.
   */
  playSound(buffer) {
      if (!buffer) {
          console.warn('Attempted to play a null or undefined buffer.');
          return null;
      }
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      return source;
  }

  /**
   * Starts playing the main audio based on the current direction and playback rate.
   */
  playAudio() {
      if (this.isPlaying || !this.audioBuffers.main) return;

      if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.direction === 1 ? this.audioBuffers.main : this.audioBuffers.reversed;
      this.sourceNode.playbackRate.value = this.playbackRate;
      this.sourceNode.connect(this.audioContext.destination);

      const offset = this.direction === 1 ? this.currentPosition : this.audioBuffers.main.duration - this.currentPosition;
      this.sourceNode.start(0, offset);
      this.startTime = this.audioContext.currentTime;
      this.isPlaying = true;

      // Handle Song End
      this.sourceNode.onended = () => {
          this.stopAudio();
          // Dispatch a custom event to notify that playback has ended
          window.dispatchEvent(new Event('playbackEnded'));
      };
  }

  /**
   * Stops the main audio playback and updates the current position.
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

      this.fastWindTapeSource = this.audioContext.createBufferSource();
      this.fastWindTapeSource.buffer = this.audioBuffers.fastWindTape;
      this.fastWindTapeSource.loop = true;
      this.fastWindTapeSource.connect(this.audioContext.destination);
      this.fastWindTapeSource.start(0);
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
   * Initializes and loads all audio buffers.
   * @returns {Promise<void>}
   */
  async initialize() {
      await this.loadAllAudio();
  }
}