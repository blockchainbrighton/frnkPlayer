// VolumeControls.js

export class VolumeControls {
  constructor(elements, audioProcessor) {
      this.masterVolumeSlider = elements.masterVolumeSlider;
      this.audioProcessor = audioProcessor;

      // Bind methods
      this.handleMasterVolumeChange = this.handleMasterVolumeChange.bind(this);

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
  }

  /**
   * Handle changes to the Master Volume slider.
   * @param {Event} event 
   */
  handleMasterVolumeChange(event) {
      const volume = parseFloat(event.target.value);
      console.group('Master Volume Change');
      console.log(`Slider Value: ${event.target.value}`);
      console.log(`Parsed Volume: ${volume}`);

      if (isNaN(volume)) {
          console.error('Invalid volume value:', event.target.value);
          console.groupEnd();
          return;
      }

      this.audioProcessor.setMasterVolume(volume);
      this.audioProcessor.logCurrentGains(); // Log current gain values for debugging
      console.groupEnd();
  }
}