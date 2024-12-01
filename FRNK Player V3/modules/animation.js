// animation.js

// Exporting necessary functions and variables
export class AnimationManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    // Spool properties
    this.spools = {
      left: { xRatio: 0.33, yRatio: 0.55, radiusRatio: 0.05, angle: 0 },
      right: { xRatio: 0.67, yRatio: 0.55, radiusRatio: 0.05, angle: 0 },
    };

    // Animation variables
    this.spoolSpeed = Math.PI; // Radians per second
    this.animationFrameId = null;
    this.lastTimestamp = null;

    // Bind the animate function to maintain 'this' context
    this.animate = this.animate.bind(this);

    // Initial draw
    this.drawSpools();
  }

  // Resize canvas to match its display size
  resizeCanvas() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.drawSpools();
  }

  // Draw a single spool
  drawSpool(spool, width, height) {
    const { xRatio, yRatio, radiusRatio, angle } = spool;
    const x = width * xRatio;
    const y = height * yRatio;
    const radius = Math.max(1.5, width * radiusRatio);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    // Main spool
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#000';
    this.ctx.fill();

    // Notches and border
    const notchCount = 3;
    const notchLength = radius * 0.15;
    const notchWidth = radius * 0.05;
    const outerRadius = Math.max(0, radius - 1.5);

    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    for (let i = 0; i < notchCount; i++) {
      const notchAngle = angle + (i * 2 * Math.PI) / notchCount;
      const startX = outerRadius * Math.cos(notchAngle);
      const startY = outerRadius * Math.sin(notchAngle);
      const endX = (outerRadius - notchLength) * Math.cos(notchAngle);
      const endY = (outerRadius - notchLength) * Math.sin(notchAngle);

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.lineWidth = notchWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // Draw all spools
  drawSpools() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    Object.values(this.spools).forEach((spool) => this.drawSpool(spool, width, height));
  }

  // Update spool angles based on playback rate and direction
  updateSpools(rotation) {
    Object.values(this.spools).forEach((spool) => {
      spool.angle += rotation;
    });
  }

  // Animation loop
  animate(timestamp, playbackRate, direction) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
    this.lastTimestamp = timestamp;

    const rotation = deltaTime * this.spoolSpeed * playbackRate * direction;
    this.updateSpools(rotation);

    this.drawSpools();

    if (this.isAnimating) {
      this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts, playbackRate, direction));
    }
  }

  // Start animation
  startAnimation(playbackRate, direction) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.lastTimestamp = null;
    this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts, playbackRate, direction));
  }

  // Stop animation
  stopAnimation() {
    if (!this.isAnimating) return;
    this.isAnimating = false;
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  // Initialize resize listener
  initResizeListener() {
    window.addEventListener('resize', () => this.resizeCanvas());
  }
}