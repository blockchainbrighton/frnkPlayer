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
 * Creates a WaveShaper node for soft clipping.
 * @param {number} amount - The amount of distortion.
 * @returns {WaveShaperNode}
 */
createWaveShaper(amount) {
    const curve = new Float32Array(amount);
    const deg = Math.PI / 180;
    for (let i = 0; i < amount; i++) {
        const x = (i * 2) / amount - 1;
        curve[i] = ((3 + x) * x * 20 * deg) / (Math.PI + 20 * deg * Math.abs(x));
    }
    const waveShaper = this.audioContext.createWaveShaper();
    waveShaper.curve = curve;
    waveShaper.oversample = '4x';
    return waveShaper;
}

    /**
 * Initializes the Enhanced Gramophone Effect.
 */
initGramophone() {
    // ---------------------------
    // 1. Frequency Filtering
    // ---------------------------

    // Peaking Filter: Emphasizes mid frequencies for vocal clarity
    const peaking = this.createFilter('peaking', {
        frequency: 800, // Lowered frequency for better mid emphasis
        Q: 1.5,          // Increased Q for a narrower peak
        gain: 12,        // Increased gain for more pronounced effect
    });

    // Low Shelf Filter: Cuts lower frequencies to reduce low-end
    const lowShelf = this.createFilter('lowshelf', {
        frequency: 150, // Lowered frequency to cut more bass
        gain: -12,       // Increased cut for vintage feel
    });

    // High Shelf Filter: Reduces high frequencies to soften treble
    const highShelf = this.createFilter('highshelf', {
        frequency: 3000, // Frequency to start high cut
        gain: -9,         // High frequencies cut
    });

    // ---------------------------
    // 2. Mechanical Warble Simulation
    // ---------------------------

    // Create an LFO (Low-Frequency Oscillator) to modulate the pitch slightly
    const warbleLFO = this.audioContext.createOscillator();
    warbleLFO.type = 'sine';
    warbleLFO.frequency.value = 0.5; // Slow warble at 0.5 Hz

    // Create a Gain Node to control the depth of the warble
    const warbleGain = this.audioContext.createGain();
    warbleGain.gain.value = 0.002; // Pitch modulation depth

    // Connect LFO to warble gain
    warbleLFO.connect(warbleGain);
    warbleLFO.start(); // Start LFO immediately but it will only affect when connected

    // Create a Pitch Shifter using a ConstantSourceNode and DelayNode
    const pitchShifter = this.audioContext.createDelay();
    pitchShifter.delayTime.value = 0; // No initial delay

    // Connect warble gain to pitch shifter's delayTime to modulate pitch
    warbleGain.connect(pitchShifter.delayTime);

    // ---------------------------
    // 3. Additional Vinyl Crackle Noise
    // ---------------------------

    // Create a noise buffer
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    // Create a Noise Source
    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Create a Gain Node for additional crackle level
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.value = 0.015; // Low level to simulate subtle crackle

    // Connect noise source to gain
    noiseSource.connect(noiseGain);
    // Note: We'll connect noiseGain to masterGain only when the effect is enabled

    // ---------------------------
    // 4. Subtle Distortion
    // ---------------------------

    // Create a WaveShaper Node for soft clipping
    const distortion = this.createWaveShaper(400); // Curve shaping for gentle distortion

    // ---------------------------
    // 5. Gain Node: Amplify the Processed Signal
    // ---------------------------

    const gainNode = this.createGainNode(1.5); // Increased gain to boost effect

    // ---------------------------
    // 6. Store All Nodes Without Connecting to masterGain
    // ---------------------------

    peaking.connect(lowShelf).connect(highShelf).connect(pitchShifter).connect(distortion).connect(gainNode);
    // Do NOT connect gainNode to masterGain here

    // Connect distortion to pitch shifter for warble effect
    // Alternatively, if using a different approach, adjust connections accordingly

    this.effectStates.gramophone = { 
        peakingFilter: peaking, 
        lowShelfFilter: lowShelf, 
        highShelfFilter: highShelf, 
        gainNode: gainNode,
        warbleLFO: warbleLFO,
        warbleGain: warbleGain,
        pitchShifter: pitchShifter,
        distortion: distortion,
        noiseSource: noiseSource,
        noiseGain: noiseGain,
    };

    console.log('SoundEffects: Enhanced Gramophone Effect initialized without connecting to masterGain.');
}

/**
 * Starts the Gramophone Effect by connecting nodes to masterGain and starting necessary sources.
 */
startGramophone() {
    const gramophone = this.effectStates.gramophone;
    if (!gramophone) {
        console.error('SoundEffects: Gramophone effect not initialized.');
        return;
    }

    // Connect the gramophone effect chain to masterGain
    gramophone.gainNode.connect(this.masterGain);

    // Connect additional crackle noise
    gramophone.noiseGain.connect(this.masterGain);

    // Start the noise source
    if (!gramophone.noiseSource.started) {
        gramophone.noiseSource.start(0);
        gramophone.noiseSource.started = true;
        console.log('SoundEffects: Gramophone additional crackle started.');
    }

    console.log('SoundEffects: Gramophone Effect connected to masterGain.');
}

/**
 * Stops the Gramophone Effect by disconnecting nodes from masterGain and stopping necessary sources.
 */
stopGramophone() {
    const gramophone = this.effectStates.gramophone;
    if (!gramophone) {
        console.error('SoundEffects: Gramophone effect not initialized.');
        return;
    }

    // Disconnect the gramophone effect chain from masterGain
    gramophone.gainNode.disconnect(this.masterGain);

    // Disconnect additional crackle noise
    gramophone.noiseGain.disconnect(this.masterGain);

    // Stop the noise source
    if (gramophone.noiseSource.started) {
        try {
            gramophone.noiseSource.stop();
            gramophone.noiseSource.started = false;
            // Reinitialize noise source for future use
            gramophone.noiseSource = this.audioContext.createBufferSource();
            gramophone.noiseSource.buffer = this.createNoiseBuffer();
            gramophone.noiseSource.loop = true;
            gramophone.noiseSource.connect(gramophone.noiseGain);
            console.log('SoundEffects: Gramophone additional crackle stopped.');
        } catch (error) {
            console.warn('SoundEffects: Gramophone noise source already stopped:', error);
        }
    }

    console.log('SoundEffects: Gramophone Effect disconnected from masterGain.');
}

   /**
 * Initializes the Echo Effect.
 */
initEcho() {
    // Default to Song 1 timing
    this.effectStates.echo = {
        delayNode: this.audioContext.createDelay(4),
        feedbackGain: this.createGainNode(0.4),
        wetGain: this.createGainNode(0.5),
        started: false
    };

    // Default to Song 1 BPM setting
    this.effectStates.echo.delayNode.delayTime.value = 1.034;

    const { delayNode, feedbackGain, wetGain } = this.effectStates.echo;
    delayNode.connect(feedbackGain).connect(delayNode);
    delayNode.connect(wetGain);
    wetGain.connect(this.masterGain);

    console.log('SoundEffects: Echo Effect initialized with Song 1 settings.');
}

/**
 * Updates the Echo delay time based on the current song.
 * @param {string} songKey - The currently playing song key (e.g., 'song_1', 'song_2').
 */
updateEchoDelayForSong(songKey) {
    const echo = this.effectStates.echo;
    if (!echo) return;

    let newDelayTime;
    // Check which song is playing and set delayTime accordingly
    if (songKey === 'song_1') {
        // Song 1 BPM: 116, 4 beats = 2.068s
        newDelayTime = 1.034;
    } else if (songKey === 'song_2') {
        // Song 2 BPM: 70, 4 beats ≈ 3.428s
        newDelayTime = 1.714;
    } else {
        // Default fallback if more songs added later without defined BPM
        newDelayTime = 1.034;
        console.warn(`SoundEffects: No specific echo setting for "${songKey}", defaulting to Song 1 delay time.`);
    }

    echo.delayNode.delayTime.value = newDelayTime;
    console.log(`SoundEffects: Echo delay time updated for ${songKey} to ${newDelayTime}s.`);
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
    if (!echo || !echo.started) return;
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
                    this.startGramophone();
                    console.log('SoundEffects: Gramophone Effect enabled.');
                } else {
                    this.stopGramophone();
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


    setCrackleVolume(volume) {
        if (this.effectStates.crackle && this.effectStates.crackle.gain) {
            this.effectStates.crackle.gain.gain.value = volume;
            console.log(`SoundEffects: Crackle volume set to ${volume}.`);
        } else {
            console.error('SoundEffects: Crackle gain node not initialized.');
        }
    }

    setGramophoneVolume(volume) {
        if (this.effectStates.gramophone && this.effectStates.gramophone.gainNode) {
            this.effectStates.gramophone.gainNode.gain.value = volume;
            console.log(`SoundEffects: Gramophone volume set to ${volume}.`);
        } else {
            console.error('SoundEffects: Gramophone gain node not initialized.');
        }
    }

    setEchoVolume(volume) {
        if (this.effectStates.echo && this.effectStates.echo.wetGain) {
            this.effectStates.echo.wetGain.gain.value = volume;
            console.log(`SoundEffects: Echo volume set to ${volume}.`);
        } else {
            console.error('SoundEffects: Echo wetGain node not initialized.');
        }
    }





}