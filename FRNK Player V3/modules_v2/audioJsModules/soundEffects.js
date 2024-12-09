// modules_v2/audioJsModules/soundEffects.js

export class SoundEffects {
    constructor(audioContext, masterGain) {
        this.audioContext = audioContext;
        this.masterGain = masterGain; // Use the masterGain from AudioProcessor
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

        console.log('SoundEffects: Initializing with external masterGain.');

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
        gain.connect(this.masterGain); // Connect crackle to external masterGain
        this.effectStates.crackle = { gain, source, started: false };

        console.log('SoundEffects: Crackle Effect initialized and connected to masterGain.');
    }

    /**
     * Starts the Crackle Effect.
     */
    startCrackle() {
        const crackle = this.effectStates.crackle;
        if (crackle.started) return;
        try {
            crackle.source.start(0);
            console.log('SoundEffects: Crackle Effect started.');
        } catch (error) {
            console.warn('SoundEffects: Crackle source already started:', error);
        }
        crackle.started = true;
    }

    /**
     * Stops the Crackle Effect.
     */
    stopCrackle() {
        const crackle = this.effectStates.crackle;
        if (!crackle.started) return;
        try {
            crackle.source.stop();
            console.log('SoundEffects: Crackle Effect stopped.');
        } catch (error) {
            console.warn('SoundEffects: Error stopping crackle source:', error);
        }
        crackle.gain.disconnect();
        this.initCrackle();
        crackle.started = false;
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

        // Connect gramophone effect to external masterGain
        gainNode.connect(this.masterGain);

        this.effectStates.gramophone = { peakingFilter: peaking, lowShelfFilter: lowShelf, highShelfFilter: highShelf, gainNode };
        console.log('SoundEffects: Gramophone Effect initialized and connected to masterGain.');
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
        wet.connect(this.masterGain); // Connect echo to external masterGain
        this.effectStates.echo = { delayNode: delay, feedbackGain: feedback, wetGain: wet, started: false };

        console.log('SoundEffects: Echo Effect initialized and connected to masterGain.');
    }

    /**
     * Starts the Echo Effect.
     */
    startEcho() {
        const echo = this.effectStates.echo;
        if (echo.started) return;
        echo.started = true;
        console.log('SoundEffects: Echo Effect started.');
    }

    /**
     * Stops the Echo Effect.
     */
    stopEcho() {
        const echo = this.effectStates.echo;
        if (!echo.started) return;
        echo.started = false;
        console.log('SoundEffects: Echo Effect stopped.');
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
            console.log('SoundEffects: Applying Gramophone Effect with enhanced settings:', {
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
            console.log('SoundEffects: Applying Echo Effect with settings:', {
                delayTime: delayNode.delayTime.value,
                feedbackGain: feedbackGain.gain.value,
                wetGain: wetGain.gain.value,
            });
        }

        lastNode.connect(this.masterGain);

        if (this.effectsEnabled.echo) this.startEcho();
        else this.stopEcho();

        console.log('SoundEffects: Applied enabled effects to the audio chain.');
    }

    /**
     * Toggles a sound effect on or off.
     * @param {string} effectName - 'crackle', 'gramophone', 'echo'
     */
    toggleEffect(effectName) {
        if (!(effectName in this.effectsEnabled)) {
            console.warn(`SoundEffects: Effect "${effectName}" is not defined.`);
            return;
        }

        this.effectsEnabled[effectName] = !this.effectsEnabled[effectName];
        console.log(`SoundEffects: Toggling "${effectName}" Effect. New State: ${this.effectsEnabled[effectName]}`);

        switch (effectName) {
            case 'crackle':
                this.effectsEnabled.crackle ? this.startCrackle() : this.stopCrackle();
                break;
            case 'gramophone':
                if (this.effectsEnabled.gramophone) {
                    console.log('SoundEffects: Gramophone Effect enabled.');
                } else {
                    console.log('SoundEffects: Gramophone Effect disabled.');
                }
                break;
            case 'echo':
                this.effectsEnabled.echo ? this.startEcho() : this.stopEcho();
                break;
        }

        // Re-apply effects to all active sources
        this.reapplyEffects();
        console.log(`SoundEffects: Effect "${effectName}" has been toggled.`);
    }

    /**
     * Re-applies effects to all active sources.
     */
    reapplyEffects() {
        console.log('SoundEffects: Reapplying effects to all active sources.');
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

        console.log('SoundEffects: All effects have been disconnected from masterGain.');
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
            console.log('SoundEffects: Source ended and removed from active sources.');
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
            console.log('SoundEffects: Source removed from active sources.');
        }
    }

    /**
     * Sets the master gain value.
     * @param {number} value - The gain value.
     */
    setMasterGain(value) {
        this.masterGain.gain.value = value;
        console.log(`SoundEffects: Master gain set to ${value}.`);
    }

    /**
     * Closes the audio context and cleans up resources.
     */
    closeContext() {
        this.disconnectEffects();
        this.masterGain.disconnect();
        this.audioContext.close();
        console.log('SoundEffects: Audio context closed and resources cleaned up.');
    }
}