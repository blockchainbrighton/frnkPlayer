// modules_v2/audioJsModules/bufferLoader.js

/**
 * Loads and decodes an audio buffer from a given URL.
 * @param {AudioContext} audioContext - The AudioContext instance.
 * @param {string} url - The URL of the audio file.
 * @returns {Promise<AudioBuffer>} - The decoded AudioBuffer.
 */
export async function loadAudioBuffer(audioContext, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load audio from ${url}: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error(`Error loading audio buffer from ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * Loads all required audio buffers.
   * @param {AudioContext} audioContext - The AudioContext instance.
   * @param {Object} audioPaths - An object mapping keys to audio file URLs.
   * @returns {Promise<Object>} - An object mapping keys to decoded AudioBuffers.
   */
  export async function loadAllAudio(audioContext, audioPaths) {
    try {
      const bufferEntries = await Promise.all(
        Object.entries(audioPaths).map(async ([key, path]) => {
          const buffer = await loadAudioBuffer(audioContext, path);
          return [key, buffer];
        })
      );
  
      const audioBuffers = {};
      bufferEntries.forEach(([key, buffer]) => {
        audioBuffers[key] = buffer;
      });
  
      return audioBuffers;
    } catch (error) {
      console.error('Error loading audio:', error);
      throw error;
    }
  }
  
  /**
   * Creates a reversed version of a given AudioBuffer.
   * @param {AudioContext} audioContext - The AudioContext instance.
   * @param {AudioBuffer} buffer - The original AudioBuffer.
   * @returns {AudioBuffer} - The reversed AudioBuffer.
   */
  export function createReversedBuffer(audioContext, buffer) {
    if (!buffer) {
      console.warn('Cannot create reversed buffer: Original buffer is null or undefined.');
      return null;
    }
  
    const reversedBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
  
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const reversedData = reversedBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        reversedData[i] = channelData[channelData.length - i - 1];
      }
    }
  
    return reversedBuffer;
  }
  