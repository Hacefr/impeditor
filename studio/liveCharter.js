/**
 * Tap-to-Chart (Live Recorder)
 * Converts live finger taps into a Psych Engine-compliant chart JSON.
 */
import { audioManager } from '../engine/audio.js';

export class LiveCharter {
  constructor(bpm = 120) {
    this.bpm = bpm;
    this.isRecording = false;
    this.activeKeyTimes = [null, null, null, null]; // Tracks hold start times
    this.recordedNotes = []; // StrumTime, Lane, SustainLength

    this.keyMap = {
      'KeyD': 0, 'KeyF': 1, 'KeyJ': 2, 'KeyK': 3,
      'ArrowLeft': 0, 'ArrowDown': 1, 'ArrowUp': 2, 'ArrowRight': 3
    };

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.isRecording || e.repeat) return;
      const lane = this.keyMap[e.code];
      if (lane !== undefined && this.activeKeyTimes[lane] === null) {
        this.activeKeyTimes[lane] = audioManager.getSongPositionMs();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isRecording) return;
      const lane = this.keyMap[e.code];
      if (lane !== undefined && this.activeKeyTimes[lane] !== null) {
        const pressTime = this.activeKeyTimes[lane];
        const releaseTime = audioManager.getSongPositionMs();
        const duration = Math.max(0, releaseTime - pressTime);

        // Auto-quantize (snap to 1/16th beat)
        const stepMs = (60000 / this.bpm) / 4;
        const snappedStrum = Math.round(pressTime / stepMs) * stepMs;
        const sustainLength = duration > 150 ? duration : 0;

        this.recordedNotes.push([snappedStrum, lane, sustainLength, '']);
        this.activeKeyTimes[lane] = null;
      }
    });
  }

  start() {
    this.recordedNotes = [];
    this.activeKeyTimes = [null, null, null, null];
    this.isRecording = true;
    audioManager.play(0);
  }

  stop() {
    this.isRecording = false;
    audioManager.stop();
  }

  /**
   * Compiles recorded notes into standard FNF section notes JSON format.
   */
  exportToChartJson(songTitle = 'My Track', speed = 2.0) {
    this.recordedNotes.sort((a, b) => a[0] - b[0]);

    return {
      song: {
        song: songTitle,
        bpm: this.bpm,
        speed: speed,
        notes: [
          {
            mustHitSection: true,
            sectionNotes: this.recordedNotes
          }
        ]
      }
    };
  }
}
