// modules_v2/uiModules/UIManager.js

import { AudioProcessor } from '../audioJsModules/audioProcessor.js';
import { AudioPlayer } from '../audioJsModules/audioPlayer.js';
import { AnimationManager } from '../animationModules/animation.js';
import { LoadingScreen } from './LoadingScreen.js';
import { TransportControls } from './TransportControls.js';
import { EffectControls } from './EffectControls.js';
import { VolumeControls } from './VolumeControls.js';
import { TimerDisplay } from './TimerDisplay.js';

class UIManager {
    constructor() {
        // Initialize AudioProcessor and AudioPlayer
        this.audioProcessor = new AudioProcessor();
        this.audioPlayer = new AudioPlayer(this.audioProcessor);
        this.animationManager = new AnimationManager(document.getElementById('spoolCanvas'));

        // Initialize UI Components
        this.loadingScreen = new LoadingScreen();

        this.transportControls = new TransportControls(
            this.getTransportElements(),
            this.audioPlayer,
            this.animationManager,
            null // TimerDisplay will be set later
        );

        this.effectControls = new EffectControls(
            this.getEffectElements(),
            this.audioPlayer
        );

        this.volumeControls = new VolumeControls(
            this.getVolumeElements(),
            this.audioProcessor
        );

        this.timerDisplay = new TimerDisplay(
            this.getTimerElement(),
            this.audioPlayer
        );

        // Assign TimerDisplay to TransportControls
        this.transportControls.timerDisplay = this.timerDisplay;

        // Bind event handlers for custom events
        this.handlePlaybackEnded = this.handlePlaybackEnded.bind(this);
        this.handlePlaybackStopped = this.handlePlaybackStopped.bind(this);
    }

    /**
     * Get transport control elements from the DOM.
     * @returns {Object}
     */
    getTransportElements() {
        return {
            playButton: document.getElementById('playButton'),
            stopButton: document.getElementById('stopButton'),
            rewindButton: document.getElementById('rewindButton'),
            fastForwardButton: document.getElementById('fastForwardButton'),
            playbackSpeedSelector: document.getElementById('playbackSpeedSelector'),
        };
    }

    /**
     * Get effect control elements from the DOM.
     * @returns {Object}
     */
    getEffectElements() {
        return {
            vinylCrackleButton: document.getElementById('effect-1-Button'),
            gramophoneButton: document.getElementById('effect-2-Button'),
            echoButton: document.getElementById('effect-3-Button'),
        };
    }

    /**
     * Get volume control elements from the DOM.
     * @returns {Object}
     */
    getVolumeElements() {
        return {
            masterVolumeSlider: document.getElementById('masterVolumeSlider'),
            // Additional volume controls can be added here
        };
    }

    /**
     * Get the timer display element from the DOM.
     * @returns {HTMLElement}
     */
    getTimerElement() {
        return document.getElementById('timerDisplay');
    }

    /**
     * Initialize the UI by loading audio, setting up animations, and initializing UI components.
     */
    async init() {
        try {
            console.log('Initializing UI Manager...');

            // Disable transport buttons initially
            this.disableTransportButtons();

            // Initialize Animation Manager
            this.animationManager.initResizeListener();
            this.animationManager.resizeCanvas();
            console.log('Animation Manager initialized.');

            // Initialize AudioPlayer (loads audio buffers)
            await this.audioPlayer.initialize();
            console.log('Audio Player initialized.');

            // Initialize UI Components
            this.transportControls.init();
            this.effectControls.init();
            this.volumeControls.init();
            this.timerDisplay.init();
            console.log('UI Components initialized.');

            // Enable transport buttons after audio is loaded
            this.enableTransportButtons();
            console.log('Transport buttons enabled.');

            // Remove loading message
            this.loadingScreen.remove();
            console.log('Loading screen removed.');

            // Attach event listeners to custom audio events
            window.addEventListener('playbackEnded', this.handlePlaybackEnded);
            window.addEventListener('playbackStopped', this.handlePlaybackStopped);
            console.log('Custom event listeners attached.');

            // Set up song selector event listener
            const songSelector = document.getElementById('songSelector');
            const currentSongDisplay = document.getElementById('currentSongDisplay');

            if (songSelector && currentSongDisplay) {
                songSelector.addEventListener('change', () => {
                    const selectedValue = songSelector.value;
                    this.audioPlayer.setCurrentSong(selectedValue);
                    currentSongDisplay.textContent = `Current Song: ${selectedValue === 'song_1' ? 'Song 1' : 'Song 2'}`;
                });
            }
            console.log('Song selector event listener set up.');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.loadingScreen.updateMessage('Failed to load audio.');
        }
    }

    /**
     * Disable transport control buttons.
     */
    disableTransportButtons() {
        const transportButtons = [
            this.transportControls.playButton,
            this.transportControls.stopButton,
            this.transportControls.rewindButton,
            this.transportControls.fastForwardButton,
        ];
        transportButtons.forEach((btn) => {
            if (btn) {
                btn.disabled = true;
                btn.classList.add('disabled');
            }
        });
        console.log('Transport control buttons disabled.');
    }

    /**
     * Enable transport control buttons.
     */
    enableTransportButtons() {
        const transportButtons = [
            this.transportControls.playButton,
            this.transportControls.stopButton,
            this.transportControls.rewindButton,
            this.transportControls.fastForwardButton,
        ];
        transportButtons.forEach((btn) => {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('disabled');
            }
        });
        console.log('Transport control buttons enabled.');
    }

    /**
     * Handle the 'playbackEnded' custom event.
     */
    handlePlaybackEnded() {
        console.log('Playback ended.');
        this.deactivatePlaybackMode();
    }

    /**
     * Handle the 'playbackStopped' custom event.
     */
    handlePlaybackStopped() {
        console.log('Playback stopped.');
        this.deactivatePlaybackMode();
    }

    /**
     * Deactivate all playback modes and reset UI elements.
     */
    deactivatePlaybackMode() {
        console.log('Deactivating playback mode...');
        this.transportControls.deactivatePlaybackMode();
        this.audioPlayer.stopFastWindTape();
        this.animationManager.stopAnimation();
        this.timerDisplay.stop();
        this.timerDisplay.update();
        console.log('Playback mode deactivated.');
    }
}

// Initialize the UI Manager when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded. Initializing UI Manager...');
    const uiManager = new UIManager();
    uiManager.init();
});