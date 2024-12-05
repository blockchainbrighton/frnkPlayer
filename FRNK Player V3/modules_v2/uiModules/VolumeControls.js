// VolumeControls.js

export class VolumeControls {
    constructor(elements, audioProcessor) {
      this.masterVolumeSlider = elements.masterVolumeSlider;
      this.buttonPressVolumeSlider = elements.buttonPressVolumeSlider;
      this.tapeNoiseVolumeSlider = elements.tapeNoiseVolumeSlider;
  
      this.audioProcessor = audioProcessor;
  
      // Bind methods
      this.handleMasterVolumeChange = this.handleMasterVolumeChange.bind(this);
      this.handleButtonPressVolumeChange = this.handleButtonPressVolumeChange.bind(this);
      this.handleTapeNoiseVolumeChange = this.handleTapeNoiseVolumeChange.bind(this);
    }
  
    /**
     * Initialize event listeners for volume controls.
     */
    init() {
      if (this.masterVolumeSlider) {
        this.masterVolumeSlider.addEventListener('input', this.handleMasterVolumeChange);
      }
  
      if (this.buttonPressVolumeSlider) {
        this.buttonPressVolumeSlider.addEventListener('input', this.handleButtonPressVolumeChange);
      }
  
      if (this.tapeNoiseVolumeSlider) {
        this.tapeNoiseVolumeSlider.addEventListener('input', this.handleTapeNoiseVolumeChange);
      }
    }
  
    /**
     * Handle changes to the Master Volume slider.
     * @param {Event} event 
     */
    handleMasterVolumeChange(event) {
      const volume = parseFloat(event.target.value) || 1;
      this.audioProcessor.setMasterVolume(volume);
    }
  
    /**
     * Handle changes to the Button Press Volume slider.
     * @param {Event} event 
     */
    handleButtonPressVolumeChange(event) {
      const volume = parseFloat(event.target.value) || 1;
      this.audioProcessor.setButtonPressVolume(volume);
    }
  
    /**
     * Handle changes to the Tape Noise Volume slider.
     * @param {Event} event 
     */
    handleTapeNoiseVolumeChange(event) {
      const volume = parseFloat(event.target.value) || 1;
      this.audioProcessor.setTapeNoiseVolume(volume);
    }
  }
  