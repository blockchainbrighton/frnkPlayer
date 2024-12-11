// modules_v2/audioJsModules/audioPlayer.js

import { loadAllAudio, createReversedBuffer } from './bufferLoader.js';

export class AudioPlayer {
    constructor(audioProcessor) {
        this.processor = audioProcessor;
        this.audioBuffers = {
            song_1: null,
            song_1_reversed: null,
            song_2: null,
            song_2_reversed: null,
            buttonPress: null,
            stopButtonPress: null,
            fastWindTape: null,
            resetButtonPress: null,
        };
        this.sourceNode = null;
        this.fastWindTapeSource = null;
        this.isPlaying = false;
        this.playbackRate = 1;
        this.direction = 1; // 1 for forward, -1 for reverse
        this.currentPosition = 0; // in seconds
        this.startTime = 0;

        // The currently selected song. Defaults to 'song_1'.
        this.currentSongKey = 'song_1';

        console.log('Initializing AudioPlayer...');

        // Initialize and load all audio buffers
        this.initialize();
    }

    /**
     * Initializes and loads all audio buffers.
     * If any of the audio files are MP4, the bufferLoader will automatically
     * decode and convert them into a playable PCM buffer.
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const audioPaths = {
                song_1: 'https://ordinals.com/content/ff02c063f034915999e115d79019e6e7a65daf8603df105e20dc409846c98582i1', 
                song_2: 'https://ordinals.com/content/ff02c063f034915999e115d79019e6e7a65daf8603df105e20dc409846c98582i0',
                buttonPress: 'assets/buttonPress.mp3',
                stopButtonPress: 'assets/stopButtonPress.mp3',
                fastWindTape: 'assets/fastWindTape.mp3',
                resetButtonPress: 'assets/resetButtonPress.mp3',
            };

            console.log('AudioPlayer: Loading all audio buffers...');
            this.audioBuffers = await loadAllAudio(this.processor.audioContext, audioPaths);
            console.log('AudioPlayer: All audio buffers loaded.');

            // Create reversed buffers for each loaded song
            if (this.audioBuffers.song_1) {
                this.audioBuffers.song_1_reversed = createReversedBuffer(this.processor.audioContext, this.audioBuffers.song_1);
                console.log('AudioPlayer: Reversed buffer created for song_1.');
            } else {
                console.warn('AudioPlayer: song_1 audio buffer is not loaded. Reversed buffer not created.');
            }

            if (this.audioBuffers.song_2) {
                this.audioBuffers.song_2_reversed = createReversedBuffer(this.processor.audioContext, this.audioBuffers.song_2);
                console.log('AudioPlayer: Reversed buffer created for song_2.');
            } else {
                console.warn('AudioPlayer: song_2 audio buffer is not loaded. Reversed buffer not created.');
            }

        } catch (error) {
            console.error('AudioPlayer: Error loading audio:', error);
            throw error;
        }
    }



    /**
     * Sets the currently active song to the given song key.
     * If the song is currently playing, it will stop and restart the chosen song.
     * @param {string} songKey - The key of the song (e.g., 'song_1', 'song_2').
     */
    setCurrentSong(songKey) {
        if (!this.audioBuffers[songKey]) {
            console.warn(`AudioPlayer: The requested song "${songKey}" is not loaded.`);
            return;
        }

        // Update the current song
        this.currentSongKey = songKey;

        // Update echo delay time for the new song
        if (typeof this.processor.soundEffects.updateEchoDelayForSong === 'function') {
            this.processor.soundEffects.updateEchoDelayForSong(songKey);
        } else {
            console.warn('AudioPlayer: updateEchoDelayForSong function not found in SoundEffects.');
        }

        // If playing, restart playback with the new song
        if (this.isPlaying) {
            this.stopAudio();
            this.currentPosition = 0; // Reset position for the new song
            this.playAudio();
        }
    }

    /**
     * Toggles a sound effect on or off.
     * @param {string} effectName - The name of the effect to toggle.
     */
    toggleEffect(effectName) {
        if (typeof this.processor.toggleEffect === 'function') {
            this.processor.toggleEffect(effectName);
            console.log(`AudioPlayer: Toggled effect "${effectName}".`);
        } else {
            console.error('AudioPlayer: toggleEffect method is not defined in AudioProcessor.');
        }
    }

    /**
     * Plays a specific AudioBuffer through a designated GainNode.
     * @param {AudioBuffer} buffer - The AudioBuffer to play.
     * @param {Object} [options] - Playback options.
     * @param {number} [options.offset=0] - Start time in seconds.
     * @param {number} [options.playbackRate=1] - Playback rate.
     * @param {boolean} [options.loop=false] - Whether to loop the audio.
     * @param {GainNode} [options.gainNode=null] - The GainNode to route the audio through.
     * @param {boolean} [options.useEffects=true] - Whether to apply SoundEffects.
     * @returns {AudioBufferSourceNode|null} - The source node if playback starts, else null.
     */
    playSound(buffer, { offset = 0, playbackRate = 1, loop = false, gainNode = null, useEffects = true } = {}) {
        if (!buffer) {
            console.warn('AudioPlayer: Attempted to play a null or undefined buffer.');
            return null;
        }

        const source = this.processor.audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        source.loop = loop;

        // Apply effects if required
        if (useEffects) {
            this.processor.applyEffects(source);
            console.log('AudioPlayer: Effects applied to source node.');
        } else if (gainNode) {
            source.connect(gainNode);
            console.log('AudioPlayer: Source connected to provided GainNode.');
        } else {
            source.connect(this.processor.masterGain);
            console.log('AudioPlayer: Source connected directly to masterGain.');
        }

        // Register the source with SoundEffects for management
        if (useEffects) {
            this.processor.soundEffects.addActiveSource(source);
            console.log('AudioPlayer: Source registered with SoundEffects.');
        }

        source.start(0, offset);
        console.log(`AudioPlayer: Started playing buffer "${buffer.name || 'Unnamed Buffer'}" with options:`, { offset, playbackRate, loop, useEffects });

        if (!loop) {
            source.onended = () => {
                source.disconnect();
                console.log('AudioPlayer: Playback ended and source disconnected.');
                if (useEffects) {
                    this.processor.soundEffects.removeActiveSource(source);
                    console.log('AudioPlayer: Source deregistered from SoundEffects.');
                }
            };
        }

        return source;
    }

    /**
     * Plays the general button press sound.
     */
    playButtonPress() {
        this.playSound(this.audioBuffers.buttonPress, { 
            gainNode: this.processor.buttonPressGain,
            useEffects: false
        });
        console.log('AudioPlayer: Button press sound played.');
    }

    /**
     * Plays the stop button press sound.
     */
    playStopButtonPress() {
        this.playSound(this.audioBuffers.stopButtonPress, { 
            gainNode: this.processor.buttonPressGain,
            useEffects: false
        });
        console.log('AudioPlayer: Stop button press sound played.');
    }
    
    /**
     * Plays the reset button press sound.
     */
    playResetButtonPress() {
        this.playSound(this.audioBuffers.resetButtonPress, { 
            gainNode: this.processor.buttonPressGain,
            useEffects: false
        });
        console.log('AudioPlayer: Reset button press sound played.');
    }

    /**
     * Starts playing the currently selected song based on the current direction and playback rate.
     */
    playAudio() {
        const mainBuffer = this.audioBuffers[this.currentSongKey];
        if (this.isPlaying || !mainBuffer) {
            console.warn(`AudioPlayer: Cannot play audio. Either already playing or ${this.currentSongKey} audio buffer is missing.`);
            return;
        }

        console.log(`AudioPlayer: Attempting to play audio. AudioContext state: ${this.processor.audioContext.state}`);

        if (this.processor.audioContext.state === 'suspended') {
            console.log('AudioPlayer: AudioContext is suspended. Attempting to resume.');
            this.processor.resumeContext()
                .then(() => {
                    console.log('AudioPlayer: AudioContext resumed successfully.');
                    this._startMainAudio();
                })
                .catch((error) => {
                    console.error('AudioPlayer: Error resuming AudioContext:', error);
                });
        } else {
            this._startMainAudio();
        }
    }

    /**
     * Internal method to start the main audio playback.
     * @private
     */
    _startMainAudio() {
        const mainBuffer = this.audioBuffers[this.currentSongKey];
        const reversedBuffer = this.audioBuffers[`${this.currentSongKey}_reversed`];
        const buffer = this.direction === 1 ? mainBuffer : reversedBuffer;

        this.sourceNode = this.processor.audioContext.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.playbackRate.value = this.playbackRate;

        // Apply effects to the source node
        this.processor.applyEffects(this.sourceNode);
        console.log('AudioPlayer: Effects applied to main audio source node.');

        const offset = this.direction === 1
            ? this.currentPosition
            : mainBuffer.duration - this.currentPosition;
        this.sourceNode.start(0, offset);
        this.startTime = this.processor.audioContext.currentTime;
        this.isPlaying = true;

        console.log(`AudioPlayer: Main audio playback started for ${this.currentSongKey}. Direction: ${this.direction === 1 ? 'Forward' : 'Reverse'}, Playback Rate: ${this.playbackRate}, Offset: ${offset}s`);

        // Register the source with SoundEffects
        this.processor.soundEffects.addActiveSource(this.sourceNode);
        console.log('AudioPlayer: Main audio source registered with SoundEffects.');

        // Handle Song End
        this.sourceNode.onended = () => {
            this.stopAudio();
            // Dispatch a custom event to notify that playback has ended
            window.dispatchEvent(new Event('playbackEnded'));
            console.log('AudioPlayer: Playback ended event dispatched.');
        };
    }

    /**
     * Stops the current audio playback and disconnects effects.
     */
    stopAudio() {
        if (!this.isPlaying) {
            console.warn('AudioPlayer: Cannot stop audio. No audio is currently playing.');
            return;
        }

        if (this.sourceNode) {
            this.sourceNode.onended = null; // Prevent onended from firing
            try {
                this.sourceNode.stop();
                console.log('AudioPlayer: Main audio playback stopped.');
            } catch (error) {
                console.warn('AudioPlayer: Error stopping sourceNode:', error);
            }
            this.sourceNode.disconnect();
            console.log('AudioPlayer: Main audio source node disconnected.');

            // Deregister the source from SoundEffects
            this.processor.soundEffects.removeActiveSource(this.sourceNode);
            console.log('AudioPlayer: Main audio source deregistered from SoundEffects.');

            this.sourceNode = null;
        }

        // Disconnect effects
        this.processor.disconnectEffects();
        console.log('AudioPlayer: Effects disconnected.');

        // Update currentPosition
        const mainBuffer = this.audioBuffers[this.currentSongKey];
        const elapsed = this.processor.audioContext.currentTime - this.startTime;
        const deltaPosition = elapsed * this.playbackRate * this.direction;
        this.currentPosition += deltaPosition;
        this.currentPosition = Math.max(0, Math.min(this.currentPosition, mainBuffer.duration));
        console.log(`AudioPlayer: Current playback position updated to ${this.currentPosition.toFixed(2)}s`);

        this.isPlaying = false;

        // Dispatch a custom event to notify that playback has stopped
        window.dispatchEvent(new Event('playbackStopped'));
        console.log('AudioPlayer: Playback stopped event dispatched.');
    }

    /**
     * Resets the playback position to the beginning of the current song.
     */
    resetAudio() {
        this.stopAudio(); // Stop if playing
        this.currentPosition = 0; // Reset position
        console.log('AudioPlayer: Audio playback reset to the beginning.');
    }

    /**
     * Switches the playback direction and rate, and manages related sound effects.
     * @param {number} newDirection - The new playback direction (1 for forward, -1 for reverse).
     * @param {number} newRate - The new playback rate.
     */
    switchPlayback(newDirection, newRate) {
        if (this.isPlaying && this.direction === newDirection && this.playbackRate === newRate) {
            console.log('AudioPlayer: Playback parameters unchanged. No action taken.');
            return;
        }

        // Play button press sound
        this.playSound(this.audioBuffers.buttonPress, { gainNode: this.processor.buttonPressGain });
        console.log('AudioPlayer: Button press sound played for switching playback.');

        // Stop any ongoing playback
        if (this.isPlaying) {
            this.stopAudio();
        }

        // Update playback parameters
        this.direction = newDirection;
        this.playbackRate = newRate;
        console.log(`AudioPlayer: Playback direction set to ${this.direction === 1 ? 'Forward' : 'Reverse'}, Playback rate set to ${this.playbackRate}`);

        // Play current song audio with new settings
        this.playAudio();

        // Handle FastWindTape Sound Effects
        if (this.playbackRate > 1) {
            this.startFastWindTape();
            console.log('AudioPlayer: FastWindTape sound started.');
        } else {
            this.stopFastWindTape();
            console.log('AudioPlayer: FastWindTape sound stopped.');
        }
    }

    /**
     * Starts playing the FastWindTape sound in a loop.
     */
    startFastWindTape() {
        if (!this.audioBuffers.fastWindTape) {
            console.warn('AudioPlayer: FastWindTape audio buffer is not loaded.');
            return;
        }

        if (this.fastWindTapeSource) {
            console.warn('AudioPlayer: FastWindTape sound is already playing.');
            return;
        }

        this.fastWindTapeSource = this.playSound(this.audioBuffers.fastWindTape, { 
            loop: true, 
            gainNode: this.processor.tapeNoiseGain 
        });
        console.log('AudioPlayer: FastWindTape sound playback started.');
    }

    /**
     * Stops the FastWindTape sound playback.
     */
    stopFastWindTape() {
        if (this.fastWindTapeSource) {
            try {
                this.fastWindTapeSource.stop();
                console.log('AudioPlayer: FastWindTape sound playback stopped.');
            } catch (error) {
                console.warn('AudioPlayer: Error stopping fastWindTapeSource:', error);
            }
            this.fastWindTapeSource.disconnect();
            console.log('AudioPlayer: FastWindTape source node disconnected.');
            this.fastWindTapeSource = null;
        }
    }

    /**
     * Gets the current playback position in seconds.
     * @returns {number} - The current playback position.
     */
    getCurrentPosition() {
        const mainBuffer = this.audioBuffers[this.currentSongKey];
        if (!this.isPlaying) {
            return this.currentPosition;
        }

        const elapsed = this.processor.audioContext.currentTime - this.startTime;
        const deltaPosition = elapsed * this.playbackRate * this.direction;
        let pos = this.currentPosition + deltaPosition;
        pos = Math.max(0, Math.min(pos, mainBuffer.duration));
        return pos;
    }

    /**
     * Sets the playback rate and updates the source node if playing.
     * @param {number} rate - The desired playback rate.
     */
    setPlaybackRate(rate) {
        this.playbackRate = rate;
        if (this.isPlaying && this.sourceNode) {
            this.sourceNode.playbackRate.setValueAtTime(this.playbackRate, this.processor.audioContext.currentTime);
            console.log(`AudioPlayer: Playback rate set to ${this.playbackRate}`);
        } else {
            console.warn('AudioPlayer: No audio is currently playing to set playback rate.');
        }
    }

    /**
     * Pauses the audio playback.
     */
    pauseAudio() {
        if (!this.isPlaying) {
            console.warn('AudioPlayer: Cannot pause. No audio is currently playing.');
            return;
        }

        this.stopAudio();
        if (this.processor.audioContext.state === 'running') {
            this.processor.suspendContext();
            console.log('AudioPlayer: AudioContext suspended after pausing.');
        }
    }

    /**
     * Resumes the audio playback if it was suspended.
     */
    resumeAudio() {
        if (!this.processor.isSuspended) {
            console.warn('AudioPlayer: AudioContext is not suspended. Cannot resume.');
            return;
        }

        this.processor.resumeContext()
            .then(() => {
                console.log('AudioPlayer: AudioContext resumed. Resuming playback.');
                if (this.isPlaying) {
                    this.playAudio();
                }
            })
            .catch((error) => {
                console.error('AudioPlayer: Error resuming AudioContext:', error);
            });
    }

    /**
     * Destroys the AudioPlayer instance by stopping playback and clearing buffers.
     */
    destroy() {
        this.stopAudio();
        this.stopFastWindTape();
        this.processor.closeContext();
        this.audioBuffers = {};
        console.log('AudioPlayer: AudioPlayer instance destroyed.');
    }
}