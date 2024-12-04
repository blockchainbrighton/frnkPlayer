// soundEffects.js

export class SoundEffects {
    constructor(audioElement) {
      this.audioElement = audioElement;
      this.audioContext = null;
      this.sourceNode = null;
      this.effectNodes = {
        crackle: null,
        gramophone: null,
      };
      this.effectsEnabled = {
        crackle: false,
        gramophone: false,
      };
  
      this.init();
    }
  
    async init() {
      // Check if AudioContext is supported
      if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
        alert('Web Audio API is not supported in this browser');
        return;
      }
  
      // Create AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
      // Create source node from the audio element
      this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
  
      // Create effect nodes
      this.createCrackleEffect();
      this.createGramophoneEffect();
  
      // Connect nodes
      this.connectNodes();
    }
  
    connectNodes() {
      // Disconnect all nodes
      this.sourceNode.disconnect();
  
      // Start with the source node
      let lastNode = this.sourceNode;
  
      // If gramophone effect is enabled, connect its node
      if (this.effectsEnabled.gramophone) {
        lastNode.connect(this.effectNodes.gramophone);
        lastNode = this.effectNodes.gramophone;
      }
  
      // Connect to destination
      lastNode.connect(this.audioContext.destination);
  
      // If crackle effect is enabled, start it
      if (this.effectsEnabled.crackle) {
        this.startCrackle();
      } else {
        this.stopCrackle();
      }
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
      this.effectNodes.crackle = this.audioContext.createBufferSource();
      this.effectNodes.crackle.buffer = noiseBuffer;
      this.effectNodes.crackle.loop = true;
  
      // Create a bandpass filter to make it sound like crackle
      const bandpass = this.audioContext.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1000;
  
      // Create a gain node to control the volume
      this.crackleGain = this.audioContext.createGain();
      this.crackleGain.gain.value = 0.1; // Adjust the volume of the crackle
  
      // Connect the nodes
      this.effectNodes.crackle.connect(bandpass);
      bandpass.connect(this.crackleGain);
      this.crackleGain.connect(this.audioContext.destination);
    }
  
    startCrackle() {
      if (this.crackleStarted) return;
      this.createCrackleEffect();
      this.effectNodes.crackle.start(0);
      this.crackleStarted = true;
    }
  
    stopCrackle() {
      if (this.crackleStarted) {
        this.effectNodes.crackle.stop();
        this.crackleStarted = false;
      }
    }
  
    // Gramophone Effect
    createGramophoneEffect() {
      // Create a filter node
      this.effectNodes.gramophone = this.audioContext.createBiquadFilter();
      this.effectNodes.gramophone.type = 'peaking';
      this.effectNodes.gramophone.frequency.value = 1000; // Boost mid frequencies
      this.effectNodes.gramophone.Q.value = 1; // Quality factor
      this.effectNodes.gramophone.gain.value = 6; // Gain in dB
  
      // Create a low-shelf filter to cut low end
      this.lowShelfFilter = this.audioContext.createBiquadFilter();
      this.lowShelfFilter.type = 'lowshelf';
      this.lowShelfFilter.frequency.value = 200;
      this.lowShelfFilter.gain.value = -12; // Reduce low frequencies
  
      // Connect the filters in series
      this.effectNodes.gramophone.connect(this.lowShelfFilter);
      this.lowShelfFilter.connect(this.audioContext.destination);
    }
  
    toggleEffect(effectName) {
      this.effectsEnabled[effectName] = !this.effectsEnabled[effectName];
      this.connectNodes();
    }
  }
  