// modules/audio.js

import { songs } from './playback.js';

// Create an Audio object
const audio = new Audio(songs.song1);

// Function to play the audio at a specified speed
export function playAudio(speed = 1) {
    audio.playbackRate = speed;
    audio.play();
}

// Function to pause and reset the audio
export function pauseAudio() {
    audio.pause();
    audio.currentTime = 0; // Reset to the beginning
}

// Function to set the playback rate (for fast forward)
export function setPlaybackRate(rate) {
    audio.playbackRate = rate;
}
