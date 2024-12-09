// modules_v2/audioJsModules/audioProcessor.js

import { SoundEffects } from './soundEffects.js';

export class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.buttonPressGain = null;
        this.tapeNoiseGain = null;
        this.isSuspended = false;

        console.log('Initializing AudioProcessor...');

        // Initialize the AudioContext
        this.initAudioContext();

        // Initialize GainNodes for volume control
        this.initGainNodes();

        // Initialize SoundEffects AFTER audioContext is initialized and masterGain is available
        this.soundEffects = new SoundEffects(this.audioContext, this.masterGain);

        console.log('AudioProcessor initialized.');
    }

    /**
     * Initializes the Audio Context.
     */
    initAudioContext() {
        if (!this.audioContext) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                console.error('Web Audio API is not supported in this browser.');
                return;
            }

            this.audioContext = new AudioCtx();

            console.log(`AudioContext created. State: ${this.audioContext.state}`);

            // Handle context state changes
            this.audioContext.onstatechange = () => {
                this.isSuspended = this.audioContext.state === 'suspended';
                if (this.isSuspended) {
                    console.warn('AudioContext is suspended.');
                } else if (this.audioContext.state === 'running') {
                    console.info('AudioContext is running.');
                } else {
                    console.log(`AudioContext state changed to: ${this.audioContext.state}`);
                }
            };
        }
    }

    /**
     * Initializes GainNodes for volume control.
     */
    initGainNodes() {
        if (!this.audioContext) {
            console.error('AudioContext not initialized.');
            return;
        }

        // Master gain node for overall volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 1; // Default volume
        this.masterGain.connect(this.audioContext.destination);
        console.log('Master GainNode created and connected to destination.');

        // Gain node for button press sounds
        this.buttonPressGain = this.audioContext.createGain();
        this.buttonPressGain.gain.value = 1; // Default volume
        this.buttonPressGain.connect(this.masterGain);
        console.log('ButtonPress GainNode created and connected to Master Gain.');

        // Gain node for tape noise sounds
        this.tapeNoiseGain = this.audioContext.createGain();
        this.tapeNoiseGain.gain.value = 1; // Default volume
        this.tapeNoiseGain.connect(this.masterGain);
        console.log('TapeNoise GainNode created and connected to Master Gain.');
    }

    /**
     * Sets the master volume.
     * @param {number} volume - Volume level between 0.0 (silent) and 1.0 (full volume).
     */
    setMasterVolume(volume) {
        const clampedVolume = Math.min(Math.max(volume, 0), 1);
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
            console.log(`Master Volume set to: ${clampedVolume}`);
        } else {
            console.error('Master GainNode not initialized.');
        }
    }

    /**
     * Sets the volume for button press sounds.
     * @param {number} volume - Volume level between 0.0 (silent) and 1.0 (full volume).
     */
    setButtonPressVolume(volume) {
        const clampedVolume = Math.min(Math.max(volume, 0), 1);
        if (this.buttonPressGain) {
            this.buttonPressGain.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
            console.log(`Button Press Volume set to: ${clampedVolume}`);
        } else {
            console.error('ButtonPress GainNode not initialized.');
        }
    }

    /**
     * Sets the volume for tape noise sounds.
     * @param {number} volume - Volume level between 0.0 (silent) and 1.0 (full volume).
     */
    setTapeNoiseVolume(volume) {
        const clampedVolume = Math.min(Math.max(volume, 0), 1);
        if (this.tapeNoiseGain) {
            this.tapeNoiseGain.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
            console.log(`Tape Noise Volume set to: ${clampedVolume}`);
        } else {
            console.error('TapeNoise GainNode not initialized.');
        }
    }

    /**
     * Toggles a sound effect on or off.
     * @param {string} effectName - The name of the effect to toggle.
     */
    toggleEffect(effectName) {
        this.soundEffects.toggleEffect(effectName);
        console.log(`AudioProcessor: Effect "${effectName}" toggled.`);
    }

    /**
     * Applies current effects to a given source node.
     * @param {AudioBufferSourceNode} sourceNode - The source node to apply effects to.
     */
    applyEffects(sourceNode) {
        this.soundEffects.applyEffects(sourceNode);
        console.log('AudioProcessor: Effects applied to source node.');
    }

    /**
     * Connects sound effects if enabled.
     */
    connectEffects() {
        // Not needed in refactored SoundEffects module as effects are always connected to masterGain
        console.log('AudioProcessor: connectEffects called.');
    }

    /**
     * Disconnects all sound effects.
     */
    disconnectEffects() {
        this.soundEffects.disconnectEffects();
        console.log('AudioProcessor: Effects disconnected.');
    }

    /**
     * Suspends the AudioContext.
     * @returns {Promise<void>}
     */
    suspendContext() {
        if (!this.audioContext) {
            console.error('AudioContext not initialized.');
            return;
        }

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
        if (!this.audioContext) {
            console.error('AudioContext not initialized.');
            return;
        }

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
        if (!this.audioContext) {
            console.error('AudioContext not initialized.');
            return;
        }

        return this.audioContext.close().then(() => {
            console.info('AudioContext closed.');
            this.audioContext = null;
        }).catch((error) => {
            console.error('Error closing AudioContext:', error);
        });
    }

    /**
     * Logs the current gain values for debugging purposes.
     */
    logCurrentGains() {
        if (this.masterGain && this.buttonPressGain && this.tapeNoiseGain) {
            console.log(`Current Gain Values:
                - Master Gain: ${this.masterGain.gain.value}
                - Button Press Gain: ${this.buttonPressGain.gain.value}
                - Tape Noise Gain: ${this.tapeNoiseGain.gain.value}
            `);
        } else {
            console.error('One or more GainNodes are not initialized.');
        }
    }
}