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
          gramophone: { peakingFilter: null, lowShelfFilter: null },
          echo: { delayNode: null, feedbackGain: null, wetGain: null, started: false },
      };
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

      const bandpass = this.createFilter('bandpass', { frequency: 1000 });
      const gain = this.createGainNode(0.1);

      source.connect(bandpass).connect(gain);
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
      crackle.gain.connect(this.audioContext.destination);
      crackle.started = true;
      console.log('Crackle Effect started.');
  }

  /**
   * Stops the Crackle Effect.
   */
  stopCrackle() {
      const crackle = this.effectStates.crackle;
      if (!crackle.started) return;
      crackle.gain.disconnect();
      try {
          crackle.source.stop();
      } catch (error) {
          console.warn('Error stopping crackle source:', error);
      }
      this.initCrackle();
      crackle.started = false;
      console.log('Crackle Effect stopped.');
  }

  /**
   * Initializes the Gramophone Effect.
   */
  initGramophone() {
      const peaking = this.createFilter('peaking', {
          frequency: 1000,
          Q: 1,
          gain: 6,
      });
      const lowShelf = this.createFilter('lowshelf', {
          frequency: 200,
          gain: -6,
      });
      peaking.connect(lowShelf);
      this.effectStates.gramophone = { peakingFilter: peaking, lowShelfFilter: lowShelf };
      console.log('Gramophone effect created with peaking and low-shelf filters.');
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
      this.effectStates.echo = { delayNode: delay, feedbackGain: feedback, wetGain: wet, started: false };
  }

  /**
   * Starts the Echo Effect.
   */
  startEcho() {
      const echo = this.effectStates.echo;
      if (echo.started) return;
      echo.wetGain.connect(this.audioContext.destination);
      echo.started = true;
      console.log('Echo Effect started.');
  }

  /**
   * Stops the Echo Effect.
   */
  stopEcho() {
      const echo = this.effectStates.echo;
      if (!echo.started) return;
      echo.wetGain.disconnect();
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
          const { peakingFilter, lowShelfFilter } = this.effectStates.gramophone;
          lastNode.connect(peakingFilter).connect(lowShelfFilter);
          lastNode = lowShelfFilter;
          console.log('Applying Gramophone Effect with settings:', {
              peakingFilter: {
                  frequency: peakingFilter.frequency.value,
                  Q: peakingFilter.Q.value,
                  gain: peakingFilter.gain.value,
              },
              lowShelfFilter: {
                  frequency: lowShelfFilter.frequency.value,
                  gain: lowShelfFilter.gain.value,
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

      lastNode.connect(this.audioContext.destination);

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
              console.log(this.effectsEnabled.gramophone ? 'Gramophone effect enabled.' : 'Gramophone effect disabled.');
              break;
          case 'echo':
              this.effectsEnabled.echo ? this.startEcho() : this.stopEcho();
              break;
      }

      console.log(`Effect "${effectName}" has been toggled.`);
  }

  /**
   * Disconnects all effect nodes from the audio chain.
   */
  disconnectEffects() {
      const { peakingFilter, lowShelfFilter } = this.effectStates.gramophone;
      peakingFilter?.disconnect();
      lowShelfFilter?.disconnect();

      const { wetGain } = this.effectStates.echo;
      wetGain?.disconnect();

      const { gain } = this.effectStates.crackle;
      gain?.disconnect();

      console.log('All effects have been disconnected from the audio chain.');
  }
}
