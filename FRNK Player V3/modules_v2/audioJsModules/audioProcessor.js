// audioProcessor.js

import { SoundEffects } from './soundEffects.js';

export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.buttonPressGain = null;
    this.tapeNoiseGain = null;
    this.isSuspended = false;

    // Initialize the AudioContext
    this.initAudioContext();

    // Initialize SoundEffects AFTER audioContext is initialized
    this.soundEffects = new SoundEffects(this.audioContext);

    // Initialize GainNodes for volume control
    this.initGainNodes();
  }

  /**
   * Initializes the Audio Context.
   */
  initAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();

      // Handle context state changes
      this.audioContext.onstatechange = () => {
        this.isSuspended = this.audioContext.state === 'suspended';
        if (this.isSuspended) {
          console.warn('AudioContext is suspended.');
        } else if (this.audioContext.state === 'running') {
          console.info('AudioContext is running.');
        }
      };
    }
  }

  /**
   * Initializes GainNodes for volume control.
   */
  initGainNodes() {
    // Master gain node for overall volume control
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1; // Default volume
    this.masterGain.connect(this.audioContext.destination);

    // Gain nodes for specific sound categories
    this.buttonPressGain = this.audioContext.createGain();
    this.buttonPressGain.gain.value = 1; // Default button press volume
    this.buttonPressGain.connect(this.masterGain);

    this.tapeNoiseGain = this.audioContext.createGain();
    this.tapeNoiseGain.gain.value = 1; // Default tape noise volume
    this.tapeNoiseGain.connect(this.masterGain);

    // Initialize additional GainNodes here if needed
  }

  /**
   * Sets the master volume.
   * @param {number} volume - Volume level between 0.0 (silent) and 1.0 (full volume).
   */
  setMasterVolume(volume) {
    const clampedVolume = Math.min(Math.max(volume, 0), 1);
    this.masterGain.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
  }

  /**
   * Sets the volume for button press sounds.
   * @param {number} volume - Volume level between 0.0 (silent) and 1.0 (full volume).
   */
  setButtonPressVolume(volume) {
    const clampedVolume = Math.min(Math.max(volume, 0), 1);
    this.buttonPressGain.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
  }

  /**
   * Sets the volume for tape noise sounds.
   * @param {number} volume - Volume level between 0.0 (silent) and 1.0 (full volume).
   */
  setTapeNoiseVolume(volume) {
    const clampedVolume = Math.min(Math.max(volume, 0), 1);
    this.tapeNoiseGain.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
  }

  /**
   * Toggles a sound effect on or off.
   * @param {string} effectName - The name of the effect to toggle.
   */
  toggleEffect(effectName) {
    this.soundEffects.toggleEffect(effectName);
  }

  /**
   * Applies current effects to a given source node.
   * @param {AudioBufferSourceNode} sourceNode - The source node to apply effects to.
   */
  applyEffects(sourceNode) {
    this.soundEffects.applyEffects(sourceNode);
  }

  /**
   * Connects sound effects if enabled.
   */
  connectEffects() {
    if (this.soundEffects.effectsEnabled.crackle && this.soundEffects.crackleGain && this.soundEffects.crackleStarted) {
      this.soundEffects.connectCrackle();
    }
  }

  /**
   * Disconnects all sound effects.
   */
  disconnectEffects() {
    this.soundEffects.disconnectEffects();
  }

  /**
   * Suspends the AudioContext.
   * @returns {Promise<void>}
   */
  suspendContext() {
    return this.audioContext.suspend().then(() => {
      this.isSuspended = true;
      console.info('AudioContext suspended.');
    }).catch((error) => {
      console.error('Error suspending AudioContext:', error);
    });
  }

  /**
   * Resumes the AudioContext.
   * @returns {Promise<void>}
   */
  resumeContext() {
    return this.audioContext.resume().then(() => {
      this.isSuspended = false;
      console.info('AudioContext resumed.');
    }).catch((error) => {
      console.error('Error resuming AudioContext:', error);
    });
  }

  /**
   * Closes the AudioContext.
   * @returns {Promise<void>}
   */
  closeContext() {
    return this.audioContext.close().then(() => {
      console.info('AudioContext closed.');
      this.audioContext = null;
    }).catch((error) => {
      console.error('Error closing AudioContext:', error);
    });
  }
}
