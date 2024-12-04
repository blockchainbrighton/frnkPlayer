// audioJsModules/soundEffects.js

export class SoundEffects {
    constructor(audioContext) {
      this.audioContext = audioContext;
  
      // Sound Effects State
      this.effectsEnabled = {
        crackle: false,
        gramophone: false,
        echo: false,
        wowAndFlutter: false,
        tapeSaturation: false,
        reversePlayback: false,
      };
  
      // Effect Nodes
      this.effectNodes = {
        crackle: null,
        gramophone: null,
        lowShelfFilter: null,
        echo: null,
        wowAndFlutter: null,
        tapeSaturation: null,
      };
  
      // Initialize effect state objects
      this.initializeEffectStateObjects();
  
      // Initialize all effects
      this.initializeEffects();
    }
  
    /**
     * Initialize effect state objects.
     */
    initializeEffectStateObjects() {
      // Crackle Effect Components
      this.crackle = {
        gain: null,
        source: null,
        started: false,
      };
  
      // Echo Effect Components
      this.echo = {
        delayNode: null,
        feedbackGain: null,
        wetGain: null,
        started: false,
      };
  
      // Wow and Flutter Effect Components
      this.wowAndFlutter = {
        delayNode: null,
        lfo: null,
        lfoGain: null,
        started: false,
      };
  
      // Tape Saturation Effect Components
      this.tapeSaturation = {
        waveshaper: null,
      };
  
      // Gramophone Effect Components
      this.gramophone = {
        peakingFilter: null,
        lowShelfFilter: null,
      };
    }
  
    /**
     * Initializes all audio effect nodes.
     */
    initializeEffects() {
      this.createCrackleEffect();
      this.createGramophoneEffect();
      this.createEchoEffect();
      this.createWowAndFlutterEffect();
      this.createTapeSaturationEffect();
      // Note: Reverse playback is typically handled differently
    }
  
    /**
     * Creates the crackle effect nodes.
     */
    createCrackleEffect() {
      // Create a buffer with white noise
      const bufferSize = 2 * this.audioContext.sampleRate;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
  
      for (let i = 0; i < bufferSize; i++) {
        // Generate random crackle
        output[i] = Math.random() * 2 - 1;
      }
  
      // Create a buffer source for the noise
      this.crackle.source = this.audioContext.createBufferSource();
      this.crackle.source.buffer = noiseBuffer;
      this.crackle.source.loop = true;
  
      // Create a bandpass filter to make it sound like crackle
      const bandpass = this.audioContext.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1000;
  
      // Create a gain node to control the volume
      this.crackle.gain = this.audioContext.createGain();
      this.crackle.gain.gain.value = 0.1; // Adjust the volume of the crackle
  
      // Connect the nodes
      this.crackle.source.connect(bandpass);
      bandpass.connect(this.crackle.gain);
  
      // Save the crackle gain node for later connection
      this.effectNodes.crackle = this.crackle.gain;
    }
  
    /**
         * Starts the crackle effect.
         */
    startCrackle() {
        if (this.crackle.started) return;

        // Start the crackle source
        try {
          this.crackle.source.start(0);
        } catch (error) {
          console.warn('Crackle source already started:', error);
        }
        this.crackle.started = true;

        // Connect the crackle gain to the destination
        this.crackle.gain.connect(this.audioContext.destination);
        console.log('Crackle Effect started.');
      }

      /**
       * Stops the crackle effect.
       */
      stopCrackle() {
        if (!this.crackle.started) return;

        // Disconnect the crackle gain from the destination
        this.crackle.gain.disconnect();
        this.crackle.started = false;

        // Stop the crackle source
        try {
          this.crackle.source.stop();
        } catch (error) {
          console.warn('Error stopping crackle source:', error);
        }

        // Recreate the crackle source for future use
        this.createCrackleEffect();
        console.log('Crackle Effect stopped.');
      }

       /**
         * Creates the gramophone effect nodes.
         */
       createGramophoneEffect() {
            const { audioContext } = this;

            // Create a peaking filter to boost mid frequencies
            this.gramophone.peakingFilter = audioContext.createBiquadFilter();
            this.gramophone.peakingFilter.type = 'peaking';
            this.gramophone.peakingFilter.frequency.value = 1000; // Boost mid frequencies
            this.gramophone.peakingFilter.Q.value = 1; // Quality factor
            this.gramophone.peakingFilter.gain.value = 6; // Gain in dB

            // Create a low-shelf filter to cut low end
            this.gramophone.lowShelfFilter = audioContext.createBiquadFilter();
            this.gramophone.lowShelfFilter.type = 'lowshelf';
            this.gramophone.lowShelfFilter.frequency.value = 200;
            this.gramophone.lowShelfFilter.gain.value = -6; // Reduced attenuation to prevent signal loss

            // Connect the filters in series: peakingFilter -> lowShelfFilter
            this.gramophone.peakingFilter.connect(this.gramophone.lowShelfFilter);

            // Save the final node for application
            this.effectNodes.gramophone = this.gramophone.lowShelfFilter;

            console.log('Gramophone effect created with peaking and low-shelf filters.');
        }

  
    /**
     * Creates the echo effect nodes.
     */
    createEchoEffect() {
      // Create a delay node
      this.echo.delayNode = this.audioContext.createDelay();
      this.echo.delayNode.delayTime.value = 0.3; // 300ms delay
  
      // Create a feedback gain node
      this.echo.feedbackGain = this.audioContext.createGain();
      this.echo.feedbackGain.gain.value = 0.4; // Feedback gain
  
      // Create a wet gain node
      this.echo.wetGain = this.audioContext.createGain();
      this.echo.wetGain.gain.value = 0.5; // Wet signal volume
  
      // Connect delay to feedback gain
      this.echo.delayNode.connect(this.echo.feedbackGain);
      this.echo.feedbackGain.connect(this.echo.delayNode);
  
      // Connect delay node to wet gain
      this.echo.delayNode.connect(this.echo.wetGain);
  
      // Save the wet gain node for application
      this.effectNodes.echo = this.echo.wetGain;
    }

         /**
         * Creates the wow and flutter effect nodes.
         */
         createWowAndFlutterEffect() {
            const { audioContext } = this;
  
            // Create a DelayNode to introduce slight pitch variations
            const delayNode = audioContext.createDelay();
            delayNode.delayTime.value = 0.002; // 2ms delay for subtle effect
  
            // Create a GainNode to control the depth of the modulation
            const modulationGain = audioContext.createGain();
            modulationGain.gain.value = 0.001; // Modulation depth
  
            // Create an OscillatorNode to act as LFO (Low-Frequency Oscillator)
            const lfo = audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.5; // 0.5 Hz for slow modulation
  
            // Connect the LFO to the modulationGain
            lfo.connect(modulationGain);
  
            // Connect the modulationGain to the delayNode's delayTime to modulate it
            modulationGain.connect(delayNode.delayTime);
  
            // Start the LFO
            lfo.start();
  
            // Assign nodes to the wowAndFlutter effect state
            this.wowAndFlutter.delayNode = delayNode;
            this.wowAndFlutter.lfo = lfo;
            this.wowAndFlutter.modulationGain = modulationGain;
            this.wowAndFlutter.started = false;
  
            console.log('Wow and Flutter effect created.');
          }
  
          /**
           * Creates the tape saturation effect nodes.
           */
          createTapeSaturationEffect() {
            const { audioContext } = this;
  
            // Create a WaveShaperNode for saturation/distortion
            const waveshaper = audioContext.createWaveShaper();
  
            // Define the saturation curve
            const curve = new Float32Array(65536);
            const k = 3; // Saturation amount
            for (let i = 0; i < curve.length; i++) {
              const x = (i * 2) / curve.length - 1;
              curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
            }
            waveshaper.curve = curve;
            waveshaper.oversample = '4x';
  
            // Create a GainNode to control the input level before saturation
            const inputGain = audioContext.createGain();
            inputGain.gain.value = 0.8; // Reduce input level to prevent excessive distortion
  
            // Create a GainNode to control the output level after saturation
            const outputGain = audioContext.createGain();
            outputGain.gain.value = 1.2; // Boost output level to compensate for input reduction
  
            // Connect the nodes: inputGain -> waveshaper -> outputGain
            inputGain.connect(waveshaper).connect(outputGain);
  
            // Assign nodes to the tapeSaturation effect state
            this.tapeSaturation.inputGain = inputGain;
            this.tapeSaturation.waveshaper = waveshaper;
            this.tapeSaturation.outputGain = outputGain;
  
            console.log('Tape Saturation effect created.');
          }
      
         /**
         * Applies the gramophone, echo, wowAndFlutter, and tapeSaturation effects to the source node.
         * @param {AudioNode} sourceNode - The source node to apply effects to.
         */
         applyEffects(sourceNode) {
            if (!sourceNode) return;
  
            sourceNode.disconnect();
            let lastNode = sourceNode;
  
            // Apply gramophone effect if enabled
            if (this.effectsEnabled.gramophone) {
              console.log('Applying Gramophone Effect with settings:', {
                peakingFilter: {
                  frequency: this.gramophone.peakingFilter.frequency.value,
                  Q: this.gramophone.peakingFilter.Q.value,
                  gain: this.gramophone.peakingFilter.gain.value,
                },
                lowShelfFilter: {
                  frequency: this.gramophone.lowShelfFilter.frequency.value,
                  gain: this.gramophone.lowShelfFilter.gain.value,
                },
              });
              lastNode.connect(this.gramophone.peakingFilter);
              lastNode = this.gramophone.lowShelfFilter;
            }
  
            // Apply echo effect if enabled
            if (this.effectsEnabled.echo) {
              console.log('Applying Echo Effect with settings:', {
                delayTime: this.echo.delayNode.delayTime.value,
                feedbackGain: this.echo.feedbackGain.gain.value,
                wetGain: this.echo.wetGain.gain.value,
              });
              lastNode.connect(this.echo.delayNode);
              lastNode = this.echo.wetGain;
            }
  
            // Apply wow and flutter effect if enabled
            if (this.effectsEnabled.wowAndFlutter) {
              console.log('Applying Wow and Flutter Effect.');
              lastNode.connect(this.wowAndFlutter.delayNode);
              lastNode = this.wowAndFlutter.delayNode;
            }
  
            // Apply tape saturation effect if enabled
            if (this.effectsEnabled.tapeSaturation) {
              console.log('Applying Tape Saturation Effect.');
              lastNode.connect(this.tapeSaturation.inputGain);
              lastNode = this.tapeSaturation.outputGain;
            }
  
            // Connect the last node to the destination
            lastNode.connect(this.audioContext.destination);
  
            // Start or stop echo effect based on its enabled state
            if (this.effectsEnabled.echo) {
              this.startEcho();
            } else {
              this.stopEcho();
            }
  
            console.log('Applied enabled effects to the audio chain.');
          }
  
          /**
           * Toggles a sound effect on or off.
           * @param {string} effectName - 'crackle', 'gramophone', 'echo', 'wowAndFlutter', 'tapeSaturation'
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
                // Reinitialize the gramophone effect to ensure proper connections
                if (this.effectsEnabled.gramophone) {
                  console.log('Gramophone effect enabled.');
                } else {
                  console.log('Gramophone effect disabled.');
                }
                break;
              case 'echo':
                this.effectsEnabled.echo ? this.startEcho() : this.stopEcho();
                break;
              case 'wowAndFlutter':
                this.effectsEnabled.wowAndFlutter ? this.startWowAndFlutter() : this.stopWowAndFlutter();
                break;
              case 'tapeSaturation':
                // Tape Saturation is a static effect; no start/stop required
                if (this.effectsEnabled.tapeSaturation) {
                  console.log('Tape Saturation effect enabled.');
                } else {
                  console.log('Tape Saturation effect disabled.');
                }
                break;
              default:
                break;
            }
  
            // After toggling, reapply effects to update the audio chain
            // Note: You need to provide the current source node when calling applyEffects
            // For example, if you have a method to set the current source, use it here
            // Example:
            // if (this.currentSource) {
            //   this.applyEffects(this.currentSource);
            // }
  
            console.log(`Effect "${effectName}" has been toggled.`);
          }
  
          /**
         * Starts the wow and flutter effect.
         */
          startWowAndFlutter() {
            if (this.wowAndFlutter.started) return;
  
            // Connect the wow and flutter delay node to the destination
            this.wowAndFlutter.delayNode.connect(this.audioContext.destination);
            this.wowAndFlutter.started = true;
  
            console.log('Wow and Flutter Effect started.');
          }
  
          /**
           * Stops the wow and flutter effect.
           */
          stopWowAndFlutter() {
            if (!this.wowAndFlutter.started) return;
  
            // Disconnect the wow and flutter delay node from the destination
            this.wowAndFlutter.delayNode.disconnect(this.audioContext.destination);
            this.wowAndFlutter.started = false;
  
            // Stop and recreate the LFO for future use
            try {
              this.wowAndFlutter.lfo.stop();
            } catch (error) {
              console.warn('Error stopping Wow and Flutter LFO:', error);
            }
            this.createWowAndFlutterEffect();
  
            console.log('Wow and Flutter Effect stopped.');
          }
  
          /**
           * Starts the echo effect.
           */
          startEcho() {
            if (this.echo.started) return;
  
            // Connect the echo wet gain to the destination
            this.echo.wetGain.connect(this.audioContext.destination);
            this.echo.started = true;
  
            console.log('Echo Effect started.');
          }
  
          /**
           * Stops the echo effect.
           */
          stopEcho() {
            if (!this.echo.started) return;
  
            // Disconnect the echo wet gain from the destination
            this.echo.wetGain.disconnect(this.audioContext.destination);
            this.echo.started = false;
  
            console.log('Echo Effect stopped.');
          }
      
        /**
         * Disconnects all effect nodes from the audio chain.
         */
        disconnectEffects() {
            // Disconnect gramophone effect
            if (this.gramophone.peakingFilter && this.gramophone.lowShelfFilter) {
              this.gramophone.peakingFilter.disconnect();
              this.gramophone.lowShelfFilter.disconnect();
            }
  
            // Disconnect echo effect
            if (this.echo.wetGain) {
              this.echo.wetGain.disconnect();
            }
  
            // Disconnect crackle effect
            if (this.crackle.gain) {
              this.crackle.gain.disconnect();
            }
  
            // Disconnect wow and flutter effect
            if (this.wowAndFlutter.delayNode) {
              this.wowAndFlutter.delayNode.disconnect();
            }
  
            // Disconnect tape saturation effect
            if (this.tapeSaturation.outputGain) {
              this.tapeSaturation.outputGain.disconnect();
            }
  
            // Stop LFOs if any
            if (this.wowAndFlutter.lfo) {
              try {
                this.wowAndFlutter.lfo.stop();
              } catch (error) {
                console.warn('Error stopping Wow and Flutter LFO:', error);
              }
            }
  
            console.log('All effects have been disconnected from the audio chain.');
          }

        }