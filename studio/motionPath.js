/**
 * Motion Path System (Pin A to Pin B)
 * Moves props across custom trajectories with customizable speed and loops.
 */
export class MotionPath {
  constructor(displayObject, config) {
    this.target = displayObject;
    this.pinA = config.pinA || { x: -200, y: 300 }; // Default: Off-screen left
    this.pinB = config.pinB || { x: 1400, y: 300 }; // Default: Off-screen right
    this.durationMs = (config.durationSeconds || 4.0) * 1000;
    this.loopType = config.loopType || 'ONE_SHOT'; // 'ONE_SHOT' | 'LOOP' | 'PING_PONG'

    this.startTime = null;
    this.isActive = false;
  }

  start(currentTimeMs) {
    this.startTime = currentTimeMs;
    this.isActive = true;
    this.target.visible = true;
    this.target.x = this.pinA.x;
    this.target.y = this.pinA.y;
  }

  update(currentTimeMs) {
    if (!this.isActive || this.startTime === null) return;

    const elapsed = currentTimeMs - this.startTime;
    let progress = elapsed / this.durationMs;

    if (progress >= 1.0) {
      if (this.loopType === 'LOOP') {
        this.startTime = currentTimeMs;
        progress = 0;
      } else if (this.loopType === 'PING_PONG') {
        // Swap pins
        const temp = { ...this.pinA };
        this.pinA = { ...this.pinB };
        this.pinB = temp;
        this.startTime = currentTimeMs;
        progress = 0;
      } else {
        // ONE_SHOT: Despawn
        this.isActive = false;
        this.target.visible = false;
        return;
      }
    }

    // Linear translation along vector
    this.target.x = this.pinA.x + (this.pinB.x - this.pinA.x) * progress;
    this.target.y = this.pinA.y + (this.pinB.y - this.pinA.y) * progress;
  }
}
