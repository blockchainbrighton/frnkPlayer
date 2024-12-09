// audioJsModules/soundEffects.js

export class SoundEffects {
  constructor(audioContext) {
      this.audioContext = audioContext;
      this.effectsEnabled = {
          crackle: false,
          gramophone: false,
          echo: false,
      };
      this.effectStates = {
          crackle: { gain: null, source: null, started: false },
          gramophone: { peakingFilter: null, lowShelfFilter: null, highShelfFilter: null, gainNode: null },
          echo: { delayNode: null, feedbackGain: null, wetGain: null, started: false },
      };
      this.activeSources = new Set(); // Track active sources
      this.masterGain = this.createGainNode(1); // Initialize master gain
      this.masterGain.connect(this.audioContext.destination); // Connect master gain to destination
      this.initializeEffects();
  }

  /**
   * Helper method to create BiquadFilter with proper AudioParam assignments.
   * @param {string} type - The type of BiquadFilter.
   * @param {Object} options - The options to set on the filter.
   * @returns {BiquadFilterNode}
   */
  createFilter(type, options = {}) {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = type;

      for (const [key, value] of Object.entries(options)) {
          if (filter[key] instanceof AudioParam) {
              filter[key].value = value;
          } else {
              filter[key] = value;
          }
      }

      return filter;
  }

  /**
   * Helper method to create GainNode with a specified gain value.
   * @param {number} value - The gain value.
   * @returns {GainNode}
   */
  createGainNode(value = 1) {
      const gain = this.audioContext.createGain();
      gain.gain.value = value;
      return gain;
  }

  /**
   * Helper method to create a BufferSource with white noise.
   * @returns {AudioBuffer}
   */
  createNoiseBuffer() {
      const bufferSize = 2 * this.audioContext.sampleRate;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
      }

      return noiseBuffer;
  }

  /**
   * Initializes all audio effect nodes.
   */
  initializeEffects() {
      this.initCrackle();
      this.initGramophone();
      this.initEcho();
  }

  /**
   * Initializes the Crackle Effect.
   */
  initCrackle() {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.createNoiseBuffer();
      source.loop = true;

      const bandpass = this.createFilter('bandpass', { frequency: 1000, Q: 1 });
      const gain = this.createGainNode(0.2); // Increased gain for more audible crackle

      source.connect(bandpass).connect(gain);
      gain.connect(this.masterGain); // Connect crackle to masterGain
      this.effectStates.crackle = { gain, source, started: false };
  }

  /**
   * Starts the Crackle Effect.
   */
  startCrackle() {
      const crackle = this.effectStates.crackle;
      if (crackle.started) return;
      try {
          crackle.source.start(0);
      } catch (error) {
          console.warn('Crackle source already started:', error);
      }
      crackle.started = true;
      console.log('Crackle Effect started.');
  }

  /**
   * Stops the Crackle Effect.
   */
  stopCrackle() {
      const crackle = this.effectStates.crackle;
      if (!crackle.started) return;
      try {
          crackle.source.stop();
      } catch (error) {
          console.warn('Error stopping crackle source:', error);
      }
      crackle.gain.disconnect();
      this.initCrackle();
      crackle.started = false;
      console.log('Crackle Effect stopped.');
  }

  /**
   * Initializes the Gramophone Effect.
   */
  initGramophone() {
      // Peaking Filter: Enhanced mid frequencies
      const peaking = this.createFilter('peaking', {
          frequency: 800, // Lowered frequency for better mid emphasis
          Q: 1.5,          // Increased Q for a narrower peak
          gain: 12,        // Increased gain for more pronounced effect
      });

      // Low Shelf Filter: Deeper bass cut
      const lowShelf = this.createFilter('lowshelf', {
          frequency: 150, // Lowered frequency to cut more bass
          gain: -12,      // Increased cut for vintage feel
      });

      // High Shelf Filter: Additional high frequency reduction
      const highShelf = this.createFilter('highshelf', {
          frequency: 3000, // Frequency to start high cut
          gain: -9,         // High frequencies cut
      });

      // Gain Node: Amplify the processed signal
      const gainNode = this.createGainNode(1.5); // Increased gain to boost effect

      // Connect filters in series
      peaking.connect(lowShelf).connect(highShelf).connect(gainNode);

      // Connect gramophone effect to masterGain
      gainNode.connect(this.masterGain);

      this.effectStates.gramophone = { peakingFilter: peaking, lowShelfFilter: lowShelf, highShelfFilter: highShelf, gainNode };
      console.log('Gramophone effect initialized with enhanced filters.');
  }

  /**
   * Initializes the Echo Effect.
   */
  initEcho() {
      const delay = this.audioContext.createDelay();
      delay.delayTime.value = 0.3;

      const feedback = this.createGainNode(0.4);
      const wet = this.createGainNode(0.5);

      delay.connect(feedback).connect(delay);
      delay.connect(wet);
      wet.connect(this.masterGain); // Connect echo to masterGain
      this.effectStates.echo = { delayNode: delay, feedbackGain: feedback, wetGain: wet, started: false };
  }

  /**
   * Starts the Echo Effect.
   */
  startEcho() {
      const echo = this.effectStates.echo;
      if (echo.started) return;
      echo.started = true;
      console.log('Echo Effect started.');
  }

  /**
   * Stops the Echo Effect.
   */
  stopEcho() {
      const echo = this.effectStates.echo;
      if (!echo.started) return;
      echo.started = false;
      console.log('Echo Effect stopped.');
  }

  /**
   * Applies the enabled effects to the provided source node.
   * @param {AudioNode} sourceNode - The source node to apply effects to.
   */
  applyEffects(sourceNode) {
      if (!sourceNode) return;
      sourceNode.disconnect();
      let lastNode = sourceNode;

      if (this.effectsEnabled.gramophone) {
          const { peakingFilter, lowShelfFilter, highShelfFilter, gainNode } = this.effectStates.gramophone;
          lastNode.connect(peakingFilter).connect(lowShelfFilter).connect(highShelfFilter).connect(gainNode);
          lastNode = gainNode;
          console.log('Applying Gramophone Effect with enhanced settings:', {
              peakingFilter: {
                  frequency: peakingFilter.frequency.value,
                  Q: peakingFilter.Q.value,
                  gain: peakingFilter.gain.value,
              },
              lowShelfFilter: {
                  frequency: lowShelfFilter.frequency.value,
                  gain: lowShelfFilter.gain.value,
              },
              highShelfFilter: {
                  frequency: highShelfFilter.frequency.value,
                  gain: highShelfFilter.gain.value,
              },
              gainNode: {
                  gain: gainNode.gain.value,
              },
          });
      }

      if (this.effectsEnabled.echo) {
          const { delayNode, feedbackGain, wetGain } = this.effectStates.echo;
          lastNode.connect(delayNode).connect(feedbackGain).connect(delayNode);
          lastNode.connect(wetGain);
          lastNode = wetGain;
          console.log('Applying Echo Effect with settings:', {
              delayTime: delayNode.delayTime.value,
              feedbackGain: feedbackGain.gain.value,
              wetGain: wetGain.gain.value,
          });
      }

      lastNode.connect(this.masterGain);

      if (this.effectsEnabled.echo) this.startEcho();
      else this.stopEcho();

      console.log('Applied enabled effects to the audio chain.');
  }

  /**
   * Toggles a sound effect on or off.
   * @param {string} effectName - 'crackle', 'gramophone', 'echo'
   */
  toggleEffect(effectName) {
      if (!(effectName in this.effectsEnabled)) {
          console.warn(`Effect "${effectName}" is not defined.`);
          return;
      }

      this.effectsEnabled[effectName] = !this.effectsEnabled[effectName];
      console.log(`Toggling ${effectName} Effect. New State: ${this.effectsEnabled[effectName]}`);

      switch (effectName) {
          case 'crackle':
              this.effectsEnabled.crackle ? this.startCrackle() : this.stopCrackle();
              break;
          case 'gramophone':
              if (this.effectsEnabled.gramophone) {
                  console.log('Gramophone effect enabled.');
              } else {
                  console.log('Gramophone effect disabled.');
              }
              break;
          case 'echo':
              this.effectsEnabled.echo ? this.startEcho() : this.stopEcho();
              break;
      }

      // Re-apply effects to all active sources
      this.reapplyEffects();
      console.log(`Effect "${effectName}" has been toggled.`);
  }

  /**
   * Re-applies effects to all active sources.
   */
  reapplyEffects() {
      console.log('Reapplying effects to all active sources.');
      this.activeSources.forEach((source) => {
          this.applyEffects(source);
      });
  }

  /**
   * Disconnects all effect nodes from the audio chain.
   */
  disconnectEffects() {
      const { peakingFilter, lowShelfFilter, highShelfFilter, gainNode } = this.effectStates.gramophone;
      peakingFilter?.disconnect();
      lowShelfFilter?.disconnect();
      highShelfFilter?.disconnect();
      gainNode?.disconnect();

      const { wetGain } = this.effectStates.echo;
      wetGain?.disconnect();

      const { gain } = this.effectStates.crackle;
      gain?.disconnect();

      console.log('All effects have been disconnected from the audio chain.');
  }

  /**
   * Adds a source to the activeSources set.
   * @param {AudioBufferSourceNode} source - The source node to add.
   */
  addActiveSource(source) {
      this.activeSources.add(source);
      source.onended = () => {
          this.activeSources.delete(source);
          source.disconnect();
          console.log('Source ended and removed from active sources.');
      };
  }

  /**
   * Removes a source from the activeSources set.
   * @param {AudioBufferSourceNode} source - The source node to remove.
   */
  removeActiveSource(source) {
      if (this.activeSources.has(source)) {
          this.activeSources.delete(source);
          source.disconnect();
          console.log('Source removed from active sources.');
      }
  }

  /**
   * Sets the master gain value.
   * @param {number} value - The gain value.
   */
  setMasterGain(value) {
      this.masterGain.gain.value = value;
      console.log(`Master gain set to ${value}.`);
  }

  /**
   * Closes the audio context and cleans up resources.
   */
  closeContext() {
      this.disconnectEffects();
      this.masterGain.disconnect();
      this.audioContext.close();
      console.log('Audio context closed and resources cleaned up.');
  }
}
