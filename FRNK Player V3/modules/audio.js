// audio.js

// Exporting necessary functions and variables
export class AudioManager {
    constructor() {
      this.audioContext = null;
      this.audioBuffers = {
        main: null,
        reversed: null,
        buttonPress: null,
        stopButtonPress: null,
        fastWindTape: null,
      };
      this.sourceNode = null;
      this.fastWindTapeSource = null;
      this.isPlaying = false;
      this.playbackRate = 1;
      this.direction = 1; // 1 for forward, -1 for reverse
      this.currentPosition = 0; // in seconds
      this.startTime = 0;
    }
  
    // Initialize Audio Context
    initAudioContext() {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  
    // Helper function to load and decode audio buffers
    async loadAudioBuffer(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}`);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    }
  
    // Load all audio buffers
    async loadAllAudio() {
      try {
        this.initAudioContext();
  
        const [
          main,
          buttonPress,
          stopButtonPress,
          fastWindTape,
        ] = await Promise.all([
          this.loadAudioBuffer(
            'https://ordinals.com/content/fad631362e445afc1b078cd06d1a59c11acd24ac400abff60ed05742d63bff50i0'
          ),
          this.loadAudioBuffer('assets/buttonPress.mp3'),
          this.loadAudioBuffer('assets/stopButtonPress.mp3'),
          this.loadAudioBuffer('assets/fastWindTape.mp3'),
        ]);
  
        this.audioBuffers.main = main;
        this.audioBuffers.buttonPress = buttonPress;
        this.audioBuffers.stopButtonPress = stopButtonPress;
        this.audioBuffers.fastWindTape = fastWindTape;
  
        // Create reversed buffer
        this.audioBuffers.reversed = this.createReversedBuffer(main);
  
      } catch (error) {
        console.error('Error loading audio:', error);
        throw error;
      }
    }
  
    // Create reversed audio buffer
    createReversedBuffer(buffer) {
      const reversedBuffer = this.audioContext.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
      );
  
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channelData = buffer.getChannelData(i);
        const reversedData = new Float32Array(channelData.length);
        for (let j = 0; j < channelData.length; j++) {
          reversedData[j] = channelData[channelData.length - j - 1];
        }
        reversedBuffer.getChannelData(i).set(reversedData);
      }
  
      return reversedBuffer;
    }
  
    // Play a specific sound buffer
    playSound(buffer) {
      if (!buffer) return;
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      return source;
    }
  
    // Play main audio based on direction and playback rate
    playAudio() {
      if (this.isPlaying || !this.audioBuffers.main) return;
  
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
  
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.direction === 1 ? this.audioBuffers.main : this.audioBuffers.reversed;
      this.sourceNode.playbackRate.value = this.playbackRate;
      this.sourceNode.connect(this.audioContext.destination);
  
      const offset = this.direction === 1 ? this.currentPosition : this.audioBuffers.main.duration - this.currentPosition;
      this.sourceNode.start(0, offset);
      this.startTime = this.audioContext.currentTime;
      this.isPlaying = true;
  
      // Handle Song End
      this.sourceNode.onended = () => {
        this.stopAudio();
        // Dispatch a custom event to notify that playback has ended
        window.dispatchEvent(new Event('playbackEnded'));
      };
    }
  
    // Stop main audio playback
    stopAudio() {
      if (!this.isPlaying) return;
  
      if (this.sourceNode) {
        this.sourceNode.onended = null; // Prevent onended from firing
        this.sourceNode.stop();
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
  
      // Update currentPosition
      this.currentPosition += (this.audioContext.currentTime - this.startTime) * this.playbackRate * this.direction;
      this.currentPosition = Math.max(0, Math.min(this.currentPosition, this.audioBuffers.main.duration));
  
      this.isPlaying = false;
  
      // Dispatch a custom event to notify that playback has stopped
      window.dispatchEvent(new Event('playbackStopped'));
    }
  
    // Switch playback direction and rate
    switchPlayback(newDirection, newRate) {
      if (this.isPlaying && this.direction === newDirection && this.playbackRate === newRate) {
        return;
      }
  
      // Play button press sound
      this.playSound(this.audioBuffers.buttonPress);
  
      // Stop any ongoing playback
      if (this.isPlaying) {
        this.stopAudio();
      }
  
      // Update playback parameters
      this.direction = newDirection;
      this.playbackRate = newRate;
  
      // Play main audio with new settings
      this.playAudio();
  
      // Handle FastWindTape Sound Effects
      if (this.playbackRate > 1) {
        this.startFastWindTape();
      } else {
        this.stopFastWindTape();
      }
    }
  
    // Play FastWindTape sound
    startFastWindTape() {
      if (!this.audioBuffers.fastWindTape || this.fastWindTapeSource) return;
      this.fastWindTapeSource = this.audioContext.createBufferSource();
      this.fastWindTapeSource.buffer = this.audioBuffers.fastWindTape;
      this.fastWindTapeSource.loop = true;
      this.fastWindTapeSource.connect(this.audioContext.destination);
      this.fastWindTapeSource.start(0);
    }
  
    // Stop FastWindTape sound
    stopFastWindTape() {
      if (this.fastWindTapeSource) {
        this.fastWindTapeSource.stop();
        this.fastWindTapeSource.disconnect();
        this.fastWindTapeSource = null;
      }
    }
  
    // Play Button Press Sound
    playButtonPress() {
      this.playSound(this.audioBuffers.buttonPress);
    }
  
    // Play Stop Button Press Sound
    playStopButtonPress() {
      this.playSound(this.audioBuffers.stopButtonPress);
    }
  
    // Get current playback position
    getCurrentPosition() {
      if (!this.isPlaying) {
        return this.currentPosition;
      }
  
      const elapsed = this.audioContext.currentTime - this.startTime;
      const deltaPosition = elapsed * this.playbackRate * this.direction;
      let pos = this.currentPosition + deltaPosition;
      pos = Math.max(0, Math.min(pos, this.audioBuffers.main.duration));
      return pos;
    }
  
    // Set playback rate
    setPlaybackRate(rate) {
      this.playbackRate = rate;
      if (this.isPlaying && this.sourceNode) {
        this.sourceNode.playbackRate.setValueAtTime(this.playbackRate, this.audioContext.currentTime);
      }
    }
  }