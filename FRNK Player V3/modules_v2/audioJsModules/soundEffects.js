// modules_v2/audioJsModules/soundEffects.js

export class SoundEffects {
    constructor(audioContext, masterGain) {
        this.audioContext = audioContext;
        this.masterGain = masterGain;
        this.effectsEnabled = { crackle: false, gramophone: false, echo: false };
        this.effectStates = {
            crackle: { gain: null, source: null, started: false, lfo: null, lfoGain: null },
            gramophone: { peakingFilter: null, lowShelfFilter: null, highShelfFilter: null, gainNode: null },
            echo: { delayNode: null, feedbackGain: null, wetGain: null, started: false }
        };
        this.activeSources = new Set();

        console.log('SoundEffects: Initializing with external masterGain.');
        this.initializeEffects();
    }

    createFilter(type, options = {}) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = type;
        for (const [key, value] of Object.entries(options)) {
            if (filter[key] instanceof AudioParam) filter[key].value = value; 
            else filter[key] = value;
        }
        return filter;
    }

    createGainNode(value = 1) {
        const gain = this.audioContext.createGain();
        gain.gain.value = value;
        return gain;
    }

    createNoiseBuffer() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        return noiseBuffer;
    }

    initializeEffects() {
        this.initCrackle();
        this.initGramophone();
        this.initEcho();
    }

    // Enhanced Crackle (Tape Hiss) - Add subtle amplitude modulation
    initCrackle() {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.createNoiseBuffer();
        source.loop = true;

        const bandpass = this.createFilter('bandpass', { frequency: 10000, Q: 0.7 }); 
        // More "hiss"-like: higher freq focus

        const gain = this.createGainNode(0.1); 
        // Lower base level, will modulate upward slightly

        // LFO for subtle amplitude modulation of hiss (simulate tape fluctuations)
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.value = 0.2; // slow fluctuation
        const lfoGain = this.createGainNode(0.05); 
        // Small modulation depth to avoid big volume changes
        lfo.connect(lfoGain).connect(gain.gain);
        lfo.start();

        source.connect(bandpass).connect(gain).connect(this.masterGain);
        this.effectStates.crackle = { gain, source, started: false, lfo, lfoGain };

        console.log('SoundEffects: Crackle (Tape Hiss) initialized with subtle modulation.');
    }

    startCrackle() {
        const c = this.effectStates.crackle;
        if (c.started) return;
        try { c.source.start(0); } catch {}
        c.started = true;
        console.log('SoundEffects: Crackle Effect started.');
    }

    stopCrackle() {
        const c = this.effectStates.crackle;
        if (!c.started) return;
        try { c.source.stop(); } catch {}
        c.gain.disconnect();
        this.initCrackle();
        c.started = false;
        console.log('SoundEffects: Crackle Effect stopped and reinitialized.');
    }

    createWaveShaper(amount) {
        const curve = new Float32Array(amount);
        const deg = Math.PI / 180;
        for (let i = 0; i < amount; i++) {
            const x = (i * 2) / amount - 1;
            curve[i] = ((3 + x) * x * 20 * deg) / (Math.PI + 20 * deg * Math.abs(x));
        }
        const ws = this.audioContext.createWaveShaper();
        ws.curve = curve;
        ws.oversample = '4x';
        return ws;
    }

    // Gramophone: Reduce final gain & EQ boost to avoid volume jumps
    initGramophone() {
        const peaking = this.createFilter('peaking', { frequency: 800, Q: 1.5, gain: 6 }); 
        // Reduced gain from 12 to 6dB
        const lowShelf = this.createFilter('lowshelf', { frequency: 150, gain: -12 });
        const highShelf = this.createFilter('highshelf', { frequency: 3000, gain: -9 });

        const warbleLFO = this.audioContext.createOscillator();
        warbleLFO.type = 'sine';
        warbleLFO.frequency.value = 0.5;
        const warbleGain = this.createGainNode(0.002);
        warbleLFO.connect(warbleGain);
        warbleLFO.start();

        const pitchShifter = this.audioContext.createDelay();
        pitchShifter.delayTime.value = 0;
        warbleGain.connect(pitchShifter.delayTime);

        const noiseBuffer = this.createNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        const noiseGain = this.createGainNode(0.015);

        noiseSource.connect(noiseGain);

        const distortion = this.createWaveShaper(400);

        // Reduce final gain node to unity (1.0) for less volume jump
        const gainNode = this.createGainNode(1.0);

        peaking.connect(lowShelf).connect(highShelf).connect(pitchShifter).connect(distortion).connect(gainNode);

        this.effectStates.gramophone = { 
            peakingFilter: peaking, lowShelfFilter: lowShelf, highShelfFilter: highShelf, gainNode,
            warbleLFO, warbleGain, pitchShifter, distortion, noiseSource, noiseGain
        };

        console.log('SoundEffects: Gramophone Effect initialized with less boost, to maintain consistent volume.');
    }

    startGramophone() {
        const g = this.effectStates.gramophone;
        if (!g) return;
        g.gainNode.connect(this.masterGain);
        g.noiseGain.connect(this.masterGain);
        if (!g.noiseSource.started) {
            g.noiseSource.start(0);
            g.noiseSource.started = true;
        }
        console.log('SoundEffects: Gramophone Effect enabled without volume jump.');
    }

    stopGramophone() {
        const g = this.effectStates.gramophone;
        if (!g) return;
        g.gainNode.disconnect(this.masterGain);
        g.noiseGain.disconnect(this.masterGain);
        if (g.noiseSource.started) {
            try { g.noiseSource.stop(); } catch {}
            g.noiseSource.started = false;
            g.noiseSource = this.audioContext.createBufferSource();
            g.noiseSource.buffer = this.createNoiseBuffer();
            g.noiseSource.loop = true;
            g.noiseSource.connect(g.noiseGain);
        }
        console.log('SoundEffects: Gramophone Effect disabled.');
    }

    // Echo: Run in parallel so the dry level remains constant
    initEcho() {
        this.effectStates.echo = {
            delayNode: this.audioContext.createDelay(4),
            feedbackGain: this.createGainNode(0.4),
            wetGain: this.createGainNode(0.3), // Slightly lower wet to avoid volume jumps
            started: false
        };

        this.effectStates.echo.delayNode.delayTime.value = 1.034;
        const { delayNode, feedbackGain, wetGain } = this.effectStates.echo;
        delayNode.connect(feedbackGain).connect(delayNode);
        delayNode.connect(wetGain);
        wetGain.connect(this.masterGain);
        console.log('SoundEffects: Echo initialized in parallel mode with reduced wet level.');
    }

    updateEchoDelayForSong(songKey) {
        const echo = this.effectStates.echo;
        if (!echo) return;
        let newDelayTime;
        if (songKey === 'song_1') newDelayTime = 1.034; 
        else if (songKey === 'song_2') newDelayTime = 1.714; 
        else {
            newDelayTime = 1.034;
            console.warn(`SoundEffects: No echo setting for "${songKey}", defaulting to Song 1.`);
        }
        echo.delayNode.delayTime.value = newDelayTime;
        console.log(`SoundEffects: Echo delay updated for ${songKey} to ${newDelayTime}s.`);
    }

    startEcho() {
        const e = this.effectStates.echo;
        if (e.started) return;
        e.started = true;
        console.log('SoundEffects: Echo started.');
    }

    stopEcho() {
        const e = this.effectStates.echo;
        if (!e || !e.started) return;
        e.started = false;
        console.log('SoundEffects: Echo stopped.');
    }

    /**
     * Applies enabled effects to the provided source node.
     * We keep dry signal stable by always connecting source directly to masterGain,
     * and adding echo in parallel rather than replacing the dry signal.
     */
    applyEffects(sourceNode) {
        if (!sourceNode) return;
        sourceNode.disconnect();
        let lastNode = sourceNode;

        // Dry path always direct to masterGain for stable level
        const dryGain = this.createGainNode(1.0);
        sourceNode.connect(dryGain).connect(this.masterGain);

        // Gramophone: A full-chain effect, we process the entire signal. To avoid volume jumps,
        // we've balanced the EQ and final gain. This is a "coloration" effect, so we won't parallel it.
        if (this.effectsEnabled.gramophone) {
            const { peakingFilter, lowShelfFilter, highShelfFilter, gainNode } = this.effectStates.gramophone;
            lastNode = peakingFilter;
            sourceNode.connect(peakingFilter).connect(lowShelfFilter).connect(highShelfFilter).connect(gainNode);
            gainNode.connect(this.masterGain);
            console.log('SoundEffects: Gramophone applied with balanced gain.');
        }

        // Echo: Add in parallel, so we don't alter the dry level
        if (this.effectsEnabled.echo) {
            const { delayNode, feedbackGain, wetGain } = this.effectStates.echo;
            sourceNode.connect(delayNode).connect(feedbackGain).connect(delayNode);
            // Only echo (wet) to master, dry already passed through above
            // This ensures echo is "behind" dry without changing dry volume
            // (Already connected in initEcho)
            console.log('SoundEffects: Echo applied in parallel.');
            this.startEcho();
        } else {
            this.stopEcho();
        }

        if (this.effectsEnabled.crackle) {
            console.log('SoundEffects: Crackle running. Volume modulated above.');
        }

        console.log('SoundEffects: Effects applied without altering dry signal level significantly.');
    }

    toggleEffect(effectName) {
        if (!(effectName in this.effectsEnabled)) {
            console.warn(`SoundEffects: Effect "${effectName}" not defined.`);
            return;
        }

        this.effectsEnabled[effectName] = !this.effectsEnabled[effectName];
        console.log(`SoundEffects: Toggling "${effectName}". State: ${this.effectsEnabled[effectName]}`);

        switch (effectName) {
            case 'crackle':
                this.effectsEnabled.crackle ? this.startCrackle() : this.stopCrackle();
                break;
            case 'gramophone':
                this.effectsEnabled.gramophone ? this.startGramophone() : this.stopGramophone();
                break;
            case 'echo':
                this.effectsEnabled.echo ? this.startEcho() : this.stopEcho();
                break;
        }

        this.reapplyEffects();
        console.log(`SoundEffects: "${effectName}" toggled and effects reapplied.`);
    }

    reapplyEffects() {
        console.log('SoundEffects: Reapplying effects to all active sources.');
        this.activeSources.forEach((source) => this.applyEffects(source));
    }

    disconnectEffects() {
        const g = this.effectStates.gramophone;
        g?.peakingFilter?.disconnect();
        g?.lowShelfFilter?.disconnect();
        g?.highShelfFilter?.disconnect();
        g?.gainNode?.disconnect();

        const e = this.effectStates.echo;
        e?.wetGain?.disconnect();

        const c = this.effectStates.crackle;
        c?.gain?.disconnect();

        console.log('SoundEffects: All effects disconnected from masterGain.');
    }

    addActiveSource(source) {
        this.activeSources.add(source);
        source.onended = () => {
            this.activeSources.delete(source);
            source.disconnect();
            console.log('SoundEffects: Source ended and removed from active sources.');
        };
    }

    removeActiveSource(source) {
        if (this.activeSources.has(source)) {
            this.activeSources.delete(source);
            source.disconnect();
            console.log('SoundEffects: Source removed from active sources.');
        }
    }

    setMasterGain(value) {
        this.masterGain.gain.value = value;
        console.log(`SoundEffects: Master gain set to ${value}.`);
    }

    closeContext() {
        this.disconnectEffects();
        this.masterGain.disconnect();
        this.audioContext.close();
        console.log('SoundEffects: Context closed and resources cleaned up.');
    }

    setCrackleVolume(volume) {
        const c = this.effectStates.crackle;
        if (c && c.gain) {
            c.gain.gain.value = volume;
            console.log(`SoundEffects: Crackle volume set to ${volume}.`);
        } else console.error('SoundEffects: Crackle gain not initialized.');
    }

    setGramophoneVolume(volume) {
        const g = this.effectStates.gramophone;
        if (g && g.gainNode) {
            g.gainNode.gain.value = volume;
            console.log(`SoundEffects: Gramophone volume set to ${volume}.`);
        } else console.error('SoundEffects: Gramophone gain node not initialized.');
    }

    setEchoVolume(volume) {
        const e = this.effectStates.echo;
        if (e && e.wetGain) {
            e.wetGain.gain.value = volume;
            console.log(`SoundEffects: Echo volume set to ${volume}.`);
        } else console.error('SoundEffects: Echo wetGain node not initialized.');
    }
}