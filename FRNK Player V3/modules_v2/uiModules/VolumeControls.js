// VolumeControls.js

export class VolumeControls {
  constructor(elements, audioProcessor) {
    this.masterVolumeSlider = elements.masterVolumeSlider;
    this.buttonPressVolumeSlider = elements.buttonPressVolumeSlider;
    this.tapeNoiseVolumeSlider = elements.tapeNoiseVolumeSlider;
    this.crackleVolumeSlider = elements.crackleVolumeSlider;
    this.gramophoneVolumeSlider = elements.gramophoneVolumeSlider;
    this.echoVolumeSlider = elements.echoVolumeSlider;

    this.audioProcessor = audioProcessor;

    // Bind methods
    this.handleMasterVolumeChange = this.handleMasterVolumeChange.bind(this);
    this.handleButtonPressVolumeChange = this.handleButtonPressVolumeChange.bind(this);
    this.handleTapeNoiseVolumeChange = this.handleTapeNoiseVolumeChange.bind(this);
    this.handleCrackleVolumeChange = this.handleCrackleVolumeChange.bind(this);
    this.handleGramophoneVolumeChange = this.handleGramophoneVolumeChange.bind(this);
    this.handleEchoVolumeChange = this.handleEchoVolumeChange.bind(this);

    console.log('VolumeControls initialized with elements:', elements);
  }

  /**
   * Initialize event listeners for volume controls.
   */
  init() {
    if (this.masterVolumeSlider) {
      this.masterVolumeSlider.addEventListener('input', this.handleMasterVolumeChange);
      console.log('Master Volume Slider event listener added.');
    } else {
      console.warn('Master Volume Slider element not found.');
    }

    if (this.buttonPressVolumeSlider) {
      this.buttonPressVolumeSlider.addEventListener('input', this.handleButtonPressVolumeChange);
      console.log('Button Press Volume Slider event listener added.');
    }

    if (this.tapeNoiseVolumeSlider) {
      this.tapeNoiseVolumeSlider.addEventListener('input', this.handleTapeNoiseVolumeChange);
      console.log('Tape Noise Volume Slider event listener added.');
    }

    if (this.crackleVolumeSlider) {
      this.crackleVolumeSlider.addEventListener('input', this.handleCrackleVolumeChange);
      console.log('Crackle Volume Slider event listener added.');
    }

    if (this.gramophoneVolumeSlider) {
      this.gramophoneVolumeSlider.addEventListener('input', this.handleGramophoneVolumeChange);
      console.log('Gramophone Volume Slider event listener added.');
    }

    if (this.echoVolumeSlider) {
      this.echoVolumeSlider.addEventListener('input', this.handleEchoVolumeChange);
      console.log('Echo Volume Slider event listener added.');
    }
  }

  /**
   * Generic slider value parsing and logging.
   */
  parseVolumeValue(event) {
    const volume = parseFloat(event.target.value);
    if (isNaN(volume)) {
      console.error('Invalid volume value:', event.target.value);
      return null;
    }
    return volume;
  }

  handleMasterVolumeChange(event) {
    const volume = this.parseVolumeValue(event);
    if (volume === null) return;

    console.group('Master Volume Change');
    this.audioProcessor.setMasterVolume(volume);
    this.audioProcessor.logCurrentGains();
    console.groupEnd();
  }

  handleButtonPressVolumeChange(event) {
    const volume = this.parseVolumeValue(event);
    if (volume === null) return;
    this.audioProcessor.setButtonPressVolume(volume);
    console.log(`Button Press Volume set to ${volume}`);
  }

  handleTapeNoiseVolumeChange(event) {
    const volume = this.parseVolumeValue(event);
    if (volume === null) return;
    this.audioProcessor.setTapeNoiseVolume(volume);
    console.log(`Tape Noise Volume set to ${volume}`);
  }

  handleCrackleVolumeChange(event) {
    const volume = this.parseVolumeValue(event);
    if (volume === null) return;
    // Access soundEffects through audioProcessor
    this.audioProcessor.soundEffects.setCrackleVolume(volume);
    console.log(`Crackle Volume set to ${volume}`);
  }

  handleGramophoneVolumeChange(event) {
    const volume = this.parseVolumeValue(event);
    if (volume === null) return;
    this.audioProcessor.soundEffects.setGramophoneVolume(volume);
    console.log(`Gramophone Volume set to ${volume}`);
  }

  handleEchoVolumeChange(event) {
    const volume = this.parseVolumeValue(event);
    if (volume === null) return;
    this.audioProcessor.soundEffects.setEchoVolume(volume);
    console.log(`Echo Volume set to ${volume}`);
  }
}