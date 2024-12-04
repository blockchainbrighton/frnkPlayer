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
      this.isSuspended = false;

      // Sound Effects
      this.effectsEnabled = {
        crackle: false,
        gramophone: false,
      };
      this.effectNodes = {
        crackle: null,
        gramophone: null,
        lowShelfFilter: null,
      };
      this.crackleGain = null;
      this.crackleSource = null;
      this.crackleStarted = false;
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
    // Create effect nodes after audio buffers are loaded
    this.createEffectNodes();
  }

  /**
   * Creates the effect nodes for vinyl crackle and gramophone effects.
   */
  createEffectNodes() {
    // Vinyl Crackle Effect
    this.createCrackleEffect();

    // Gramophone Effect
    this.createGramophoneEffect();
  }

  // Vinyl Crackle Effect
  createCrackleEffect() {
    // Create a buffer with white noise
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(
      1,
      bufferSize,
      this.audioContext.sampleRate
    );
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Generate random crackle
      output[i] = Math.random() * 2 - 1;
    }

    // Create a buffer source for the noise
    this.crackleSource = this.audioContext.createBufferSource();
    this.crackleSource.buffer = noiseBuffer;
    this.crackleSource.loop = true;

    // Create a bandpass filter to make it sound like crackle
    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1000;

    // Create a gain node to control the volume
    this.crackleGain = this.audioContext.createGain();
    this.crackleGain.gain.value = 0.1; // Adjust the volume of the crackle

    // Connect the nodes
    this.crackleSource.connect(bandpass);
    bandpass.connect(this.crackleGain);

    // Save the crackle gain node for later connection
    this.effectNodes.crackle = this.crackleGain;
  }

  startCrackle() {
    if (this.crackleStarted) return;

    // Start the crackle source
    this.crackleSource.start(0);
    this.crackleStarted = true;

    // If audio is playing, connect the crackle effect
    if (this.isPlaying) {
      this.effectNodes.crackle.connect(this.audioContext.destination);
    }
  }

  stopCrackle() {
    if (!this.crackleStarted) return;

    // Disconnect the crackle effect
    this.effectNodes.crackle.disconnect();
    this.crackleStarted = false;

    // Stop the crackle source
    this.crackleSource.stop();
    // Recreate the crackle source for future use
    this.createCrackleEffect();
  }

  // Gramophone Effect
  createGramophoneEffect() {
    // Create a peaking filter to boost mid frequencies
    this.effectNodes.gramophone = this.audioContext.createBiquadFilter();
    this.effectNodes.gramophone.type = 'peaking';
    this.effectNodes.gramophone.frequency.value = 1000; // Boost mid frequencies
    this.effectNodes.gramophone.Q.value = 1; // Quality factor
    this.effectNodes.gramophone.gain.value = 6; // Gain in dB

    // Create a low-shelf filter to cut low end
    this.effectNodes.lowShelfFilter = this.audioContext.createBiquadFilter();
    this.effectNodes.lowShelfFilter.type = 'lowshelf';
    this.effectNodes.lowShelfFilter.frequency.value = 200;
    this.effectNodes.lowShelfFilter.gain.value = -12; // Reduce low frequencies

    // Connect the filters in series
    this.effectNodes.gramophone.connect(this.effectNodes.lowShelfFilter);
  }

  /**
   * Applies the effects to the audio playback chain.
   */
  applyEffects() {
    if (!this.isPlaying || !this.sourceNode) return;

    // Disconnect source node from destination
    this.sourceNode.disconnect();

    let lastNode = this.sourceNode;

    // Apply gramophone effect if enabled
    if (this.effectsEnabled.gramophone) {
      lastNode.connect(this.effectNodes.gramophone);
      lastNode = this.effectNodes.lowShelfFilter;
    }

    // Connect to destination
    lastNode.connect(this.audioContext.destination);
  }

  /**
   * Toggles a sound effect on or off.
   * @param {string} effectName - 'crackle' or 'gramophone'
   */
  toggleEffect(effectName) {
    this.effectsEnabled[effectName] = !this.effectsEnabled[effectName];

    if (effectName === 'crackle') {
      if (this.effectsEnabled.crackle) {
        this.startCrackle();
      } else {
        this.stopCrackle();
      }
    } else if (effectName === 'gramophone') {
      this.applyEffects();
    }
  }

  // Modify _startMainAudio to apply effects
  _startMainAudio() {
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.direction === 1 ? this.audioBuffers.main : this.audioBuffers.reversed;
    this.sourceNode.playbackRate.value = this.playbackRate;

    let lastNode = this.sourceNode;

    // Apply gramophone effect if enabled
    if (this.effectsEnabled.gramophone) {
      lastNode.connect(this.effectNodes.gramophone);
      lastNode = this.effectNodes.lowShelfFilter;
    }

    // Connect to destination
    lastNode.connect(this.audioContext.destination);

    const offset = this.direction === 1 ? this.currentPosition : this.audioBuffers.main.duration - this.currentPosition;
    this.sourceNode.start(0, offset);
    this.startTime = this.audioContext.currentTime;
    this.isPlaying = true;

    // If crackle effect is enabled, connect it to the destination
    if (this.effectsEnabled.crackle && this.crackleGain && this.crackleStarted) {
      this.effectNodes.crackle.connect(this.audioContext.destination);
    }

    // Handle Song End
    this.sourceNode.onended = () => {
      this.stopAudio();
      // Dispatch a custom event to notify that playback has ended
      window.dispatchEvent(new Event('playbackEnded'));
    };
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
              main: 'https://ordinals.com/content/fad631362e445afc1b078cd06d1a59c11acd24ac400abff60ed05742d63bff50i0', // Replace with a valid URL or local path
              buttonPress: 'assets/buttonPress.mp3',
              stopButtonPress: 'assets/stopButtonPress.mp3',
              fastWindTape: 'assets/fastWindTape.mp3',
              resetButtonPress: 'assets/resetButtonPress.mp3',
          };

          // Load all audio buffers concurrently
          const bufferEntries = await Promise.all(
              Object.entries(audioPaths).map(async ([key, path]) => {
                  const buffer = await this.loadAudioBuffer(path);
                  return [key, buffer];
              })
          );

          // Assign loaded buffers to audioBuffers
          bufferEntries.forEach(([key, buffer]) => {
              this.audioBuffers[key] = buffer;
          });

          // Create reversed buffer if main audio is loaded
          if (this.audioBuffers.main) {
              this.audioBuffers.reversed = this.createReversedBuffer(this.audioBuffers.main);
          } else {
              console.warn('Main audio buffer is not loaded. Reversed buffer not created.');
          }
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
      if (!buffer) {
          console.warn('Cannot create reversed buffer: Original buffer is null or undefined.');
          return null;
      }

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
  if (this.effectsEnabled.gramophone && this.effectNodes.gramophone) {
    this.effectNodes.gramophone.disconnect();
  }

  if (this.effectsEnabled.lowShelfFilter && this.effectNodes.lowShelfFilter) {
    this.effectNodes.lowShelfFilter.disconnect();
  }

  if (this.effectsEnabled.crackle && this.crackleGain) {
    this.effectNodes.crackle.disconnect();
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