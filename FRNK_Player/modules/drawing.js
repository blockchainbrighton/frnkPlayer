// modules/drawing.js

import { ctx } from './dom.js';

// Define and export spool properties
export const spools = {
  left: { xRatio: 0.33, yRatio: 0.55, radiusRatio: 0.07, angle: 0 },
  right: { xRatio: 0.67, yRatio: 0.55, radiusRatio: 0.07, angle: 0 },
};

// Function to draw a single spool
export function drawSpool(spool, width, height) {
  const x = width * spool.xRatio;
  const y = height * spool.yRatio;
  const radius = width * spool.radiusRatio;

  // Draw main spool
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();

  // Draw rotating white circumference with notches
  const notchCount = 3; // Number of notches
  const notchLength = radius * 0.15; // Length of each notch
  const notchWidth = radius * 0.05; // Width of the notches
  const outerRadius = radius - 5; // Position of the white border

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  // Draw the white border
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Draw the notches
  for (let i = 0; i < notchCount; i++) {
    const angle = spool.angle + (i * (2 * Math.PI)) / notchCount; // Rotate notches evenly
    const notchStartX = x + outerRadius * Math.cos(angle);
    const notchStartY = y + outerRadius * Math.sin(angle);
    const notchEndX = x + (outerRadius - notchLength) * Math.cos(angle);
    const notchEndY = y + (outerRadius - notchLength) * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(notchStartX, notchStartY);
    ctx.lineTo(notchEndX, notchEndY);
    ctx.lineWidth = notchWidth;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }
}

// Function to draw the entire tape deck
export function drawTapeDeck(spools, width, height) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw spools
  drawSpool(spools.left, width, height);
  drawSpool(spools.right, width, height);
}
