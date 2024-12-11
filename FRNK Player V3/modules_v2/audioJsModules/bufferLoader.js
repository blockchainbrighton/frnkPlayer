// modules_v2/audioJsModules/bufferLoader.js

/**
 * Determines if a file is MP4 based on its extension.
 * @param {string} url - The URL or file path.
 * @returns {boolean} - True if the file has an MP4 extension, false otherwise.
 */
function isMp4File(url) {
  const extension = url.split('.').pop().toLowerCase();
  return extension === 'mp4';
}

/**
 * Converts an AudioBuffer into a playable PCM buffer (raw audio data).
 * This step effectively "normalizes" any supported audio format (like MP4) into
 * a raw playable format compatible with the Web Audio API. The returned AudioBuffer
 * is what the rest of the program can use to play audio.
 * @param {AudioBuffer} audioBuffer - The decoded AudioBuffer.
 * @returns {AudioBuffer} - A new AudioBuffer containing PCM data ready for playback.
 */
function convertToPlayableBuffer(audioContext, audioBuffer) {
  // The decoded AudioBuffer is already a PCM-based playable buffer that can be used
  // directly. Here, we return it as-is. If further conversion were needed (e.g., to a
  // different sample rate or channel configuration), this is where we'd do it.
  // Since the goal is just to ensure a playable format, the returned buffer suffices.
  
  // Create a new AudioBuffer identical to the original to illustrate "conversion".
  const convertedBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    convertedBuffer.copyToChannel(audioBuffer.getChannelData(channel), channel);
  }

  return convertedBuffer;
}

/**
 * Loads and decodes an audio buffer from a given URL. If the file is MP4, the
 * decoded audio is then converted into a playable PCM buffer before returning.
 * @param {AudioContext} audioContext - The AudioContext instance.
 * @param {string} url - The URL of the audio file.
 * @returns {Promise<AudioBuffer>} - The decoded and possibly converted AudioBuffer.
 */
export async function loadAudioBuffer(audioContext, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load audio from ${url}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // If this is an MP4 file, we "convert" it into a playable PCM buffer.
    if (isMp4File(url)) {
      return convertToPlayableBuffer(audioContext, decodedBuffer);
    }

    // If it's not MP4, decodedBuffer is already a playable format.
    return decodedBuffer;
  } catch (error) {
    console.error(`Error loading audio buffer from ${url}:`, error);
    throw error;
  }
}

/**
 * Loads all required audio buffers. Each file is decoded, and if any is MP4,
 * it will be converted into a playable PCM buffer before returning.
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