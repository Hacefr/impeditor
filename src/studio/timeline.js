/**
 * Studio Timeline & Audio Scrubber
 * Allows scrubbing audio and dropping triggers onto exact beats.
 */
import { audioManager } from '../engine/audio.js';

export class StudioTimeline {
  constructor(onAddTriggerRequest, onSeek) {
    this.onAddTriggerRequest = onAddTriggerRequest;
    this.onSeek = onSeek;

    this.container = document.querySelector('.timeline-container');
    this.track = document.getElementById('timeline-track');
    this.playhead = document.getElementById('timeline-playhead');
    this.timeLabel = document.getElementById('timeline-time');
    this.btnPlay = document.getElementById('timeline-play');
    this.btnAddTrigger = document.getElementById('btn-add-trigger');

    this.totalDurationMs = 180000; // Default 3 mins fallback
    this.bindEvents();
  }

  bindEvents() {
    // Play / Pause toggle
    this.btnPlay.addEventListener('click', () => {
      if (audioManager.isPlaying) {
        audioManager.pauseOffset = audioManager.getSongPositionMs();
        audioManager.stop();
        this.btnPlay.textContent = '▶';
      } else {
        audioManager.play(audioManager.pauseOffset || 0);
        this.btnPlay.textContent = '⏸';
      }
    });

    // Scrubbing on track
    this.track.addEventListener('click', (e) => {
      const rect = this.track.getBoundingClientRect();
      const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTimeMs = clickRatio * this.totalDurationMs;

      if (this.onSeek) this.onSeek(targetTimeMs);
      this.updatePlayhead(targetTimeMs);
    });

    // Add trigger at current timestamp
    this.btnAddTrigger.addEventListener('click', () => {
      const currentMs = audioManager.getSongPositionMs();
      if (this.onAddTriggerRequest) {
        this.onAddTriggerRequest(currentMs);
      }
    });
  }

  setDuration(durationMs) {
    this.totalDurationMs = durationMs || 180000;
  }

  updatePlayhead(currentMs) {
    const ratio = Math.max(0, Math.min(1, currentMs / this.totalDurationMs));
    this.playhead.style.left = `${ratio * 100}%`;

    // Format mm:ss.ms
    const totalSecs = Math.floor(currentMs / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    const ms = Math.floor(currentMs % 1000).toString().padStart(3, '0');
    this.timeLabel.textContent = `${mins}:${secs}.${ms}`;
  }

  renderTriggerMarkers(triggers) {
    // Clear old markers except playhead
    const oldMarkers = this.track.querySelectorAll('.trigger-marker');
    oldMarkers.forEach(m => m.remove());

    triggers.forEach(t => {
      const marker = document.createElement('div');
      marker.className = 'trigger-marker';
      marker.style.position = 'absolute';
      marker.style.top = '0';
      marker.style.width = '6px';
      marker.style.height = '100%';
      marker.style.backgroundColor = t.type === 'FLASH' ? (t.color || '#ff0000') : '#00ffff';
      marker.style.left = `${(t.timeMs / this.totalDurationMs) * 100}%`;
      marker.title = `${t.type} @ ${Math.floor(t.timeMs)}ms`;
      this.track.appendChild(marker);
    });
  }
}
