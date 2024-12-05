// EffectControls.js

export class EffectControls {
    constructor(elements, audioPlayer) {
      this.vinylCrackleButton = elements.vinylCrackleButton;
      this.gramophoneButton = elements.gramophoneButton;
      this.echoButton = elements.echoButton;
  
      this.audioPlayer = audioPlayer;
  
      // Bind methods
      this.handleVinylCrackleToggle = this.handleVinylCrackleToggle.bind(this);
      this.handleGramophoneToggle = this.handleGramophoneToggle.bind(this);
      this.handleEchoToggle = this.handleEchoToggle.bind(this);
    }
  
    /**
     * Initialize event listeners for effect controls.
     */
    init() {
      this.vinylCrackleButton.addEventListener('click', this.handleVinylCrackleToggle);
      this.gramophoneButton.addEventListener('click', this.handleGramophoneToggle);
      this.echoButton.addEventListener('click', this.handleEchoToggle);
    }
  
    /**
     * Handle Vinyl Crackle effect toggle.
     */
    handleVinylCrackleToggle() {
      this.audioPlayer.toggleEffect('crackle');
      this.vinylCrackleButton.classList.toggle('active');
    }
  
    /**
     * Handle Gramophone effect toggle.
     */
    handleGramophoneToggle() {
      this.audioPlayer.toggleEffect('gramophone');
      this.gramophoneButton.classList.toggle('active');
    }
  
    /**
     * Handle Echo effect toggle.
     */
    handleEchoToggle() {
      this.audioPlayer.toggleEffect('echo');
      this.echoButton.classList.toggle('active');
    }
  }
  