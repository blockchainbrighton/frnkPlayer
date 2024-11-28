// modules/dom.js

// Select and export DOM elements
export const container = document.getElementById("container");
export const image = document.getElementById("tapeDeckImage");
export const canvas = document.getElementById("spoolCanvas");
export const ctx = canvas.getContext("2d");
export const playButton = document.getElementById("playButton");
export const recordButton = document.getElementById("recordButton");
export const stopButton = document.getElementById("stopButton");
export const rewindButton = document.getElementById("rewindButton");
export const fastForwardButton = document.getElementById("fastForwardButton");

// Function to handle canvas resizing
export function resizeCanvas(drawCallback) {
  const { width, height } = container.getBoundingClientRect();
  canvas.width = width;
  canvas.height = height;

  if (drawCallback) {
    drawCallback(width, height);
  }
}