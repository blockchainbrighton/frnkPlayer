// soundEffects.js

export class SoundEffects {
    constructor(audioContext) {
      this.audioContext = audioContext;
  
      // Sound Effects State
      this.effectsEnabled = {
        crackle: false,
        gramophone: false,
      };
  
      // Effect Nodes
      this.effectNodes = {
        crackle: null,
        gramophone: null,
        lowShelfFilter: null,
      };
  
      // Crackle Effect Components
      this.crackleGain = null;
      this.crackleSource = null;
      this.crackleStarted = false;
  
      // Create effect nodes
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
  
    /**
     * Creates the vinyl crackle effect nodes.
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
  
   /**
     * Starts the vinyl crackle effect.
     */
    startCrackle() {
        if (this.crackleStarted) return;
    
        // Log effect application
        console.log('Applying Crackle Effect with settings:', {
        gain: this.crackleGain.gain.value,
        bandpassFrequency: this.effectNodes.crackle.context.createBiquadFilter().frequency.value,
        });
    
        // Start the crackle source
        this.crackleSource.start(0);
        this.crackleStarted = true;
    
        // Connect the crackle effect to the destination
        this.effectNodes.crackle.connect(this.audioContext.destination);
    }
    
    /**
     * Stops the vinyl crackle effect.
     */
    stopCrackle() {
        if (!this.crackleStarted) return;
    
        // Log effect removal
        console.log('Crackle Effect stopped.');
    
        // Disconnect the crackle effect
        this.effectNodes.crackle.disconnect();
        this.crackleStarted = false;
    
        // Stop the crackle source
        this.crackleSource.stop();
        // Recreate the crackle source for future use
        this.createCrackleEffect();
    }
    
    /**
     * Applies the gramophone effect to the audio playback chain.
     * @param {AudioNode} sourceNode - The source node to apply effects to.
     */
    applyEffects(sourceNode) {
        if (!sourceNode) return;
    
        // Disconnect source node from destination
        sourceNode.disconnect();
    
        let lastNode = sourceNode;
    
        // Apply gramophone effect if enabled
        if (this.effectsEnabled.gramophone) {
        console.log('Applying Gramophone Effect with settings:', {
            frequency: this.effectNodes.gramophone.frequency.value,
            gain: this.effectNodes.gramophone.gain.value,
            Q: this.effectNodes.gramophone.Q.value,
        });
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
        console.log(`Toggling ${effectName} Effect. New State: ${this.effectsEnabled[effectName]}`);
    
        if (effectName === 'crackle') {
        if (this.effectsEnabled.crackle) {
            this.startCrackle();
        } else {
            this.stopCrackle();
        }
        }
    }
  
  
    /**
     * Creates the gramophone effect nodes.
     */
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
     * Connects the crackle effect to the destination if enabled.
     */
    connectCrackle() {
      if (this.effectsEnabled.crackle && this.crackleGain && this.crackleStarted) {
        this.effectNodes.crackle.connect(this.audioContext.destination);
      }
    }
  
    /**
     * Disconnects all effect nodes from the audio chain.
     */
    disconnectEffects() {
      // Disconnect gramophone effect
      if (this.effectNodes.gramophone && this.effectNodes.lowShelfFilter) {
        this.effectNodes.gramophone.disconnect();
        this.effectNodes.lowShelfFilter.disconnect();
      }
  
      // Disconnect crackle effect
      if (this.effectNodes.crackle) {
        this.effectNodes.crackle.disconnect();
      }
    }
  }
  