/**
 * Input Manager
 * Handles low-latency key down/up listeners.
 */
export class InputManager {
  constructor() {
    this.keyMap = {
      // D F J K mapping
      'KeyD': 0, 'KeyF': 1, 'KeyJ': 2, 'KeyK': 3,
      // Arrow keys mapping
      'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3
    };

    this.laneState = [false, false, false, false];
    this.onKeyPress = null;
    this.onKeyRelease = null;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const lane = this.keyMap[e.code];
      if (lane !== undefined) {
        this.laneState[lane] = true;
        if (this.onKeyPress) this.onKeyPress(lane);
      }
    });

    window.addEventListener('keyup', (e) => {
      const lane = this.keyMap[e.code];
      if (lane !== undefined) {
        this.laneState[lane] = false;
        if (this.onKeyRelease) this.onKeyRelease(lane);
      }
    });
  }
}

export const inputManager = new InputManager();
