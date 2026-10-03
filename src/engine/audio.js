/**
 * Audio Engine (Web Audio API)
 * Handles sample-accurate sync for music stems and sound effects.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.instBuffer = null;
    this.voicesBuffer = null;
    this.instSource = null;
    this.voicesSource = null;

    this.startTime = 0;
    this.pauseOffset = 0;
    this.isPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  async loadAudioFromBlob(blob) {
    this.init();
    const arrayBuffer = await blob.arrayBuffer();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  setTracks(instBuffer, voicesBuffer = null) {
    this.instBuffer = instBuffer;
    this.voicesBuffer = voicesBuffer;
  }

  play(startOffsetMs = 0) {
    if (!this.instBuffer) return;
    this.init();

    this.stop(); // Stop any existing playback

    const offsetSeconds = startOffsetMs / 1000;
    this.startTime = this.ctx.currentTime - offsetSeconds;

    // 1. Play Instrumental
    this.instSource = this.ctx.createBufferSource();
    this.instSource.buffer = this.instBuffer;
    this.instSource.connect(this.ctx.destination);
    this.instSource.start(0, offsetSeconds);

    // 2. Play Voices (in sync)
    if (this.voicesBuffer) {
      this.voicesSource = this.ctx.createBufferSource();
      this.voicesSource.buffer = this.voicesBuffer;
      this.voicesSource.connect(this.ctx.destination);
      this.voicesSource.start(0, offsetSeconds);
    }

    this.isPlaying = true;
  }

  stop() {
    if (this.instSource) {
      try { this.instSource.stop(); } catch (e) {}
      this.instSource.disconnect();
      this.instSource = null;
    }
    if (this.voicesSource) {
      try { this.voicesSource.stop(); } catch (e) {}
      this.voicesSource.disconnect();
      this.voicesSource = null;
    }
    this.isPlaying = false;
  }

  getSongPositionMs() {
    if (!this.isPlaying || !this.ctx) return this.pauseOffset;
    return (this.ctx.currentTime - this.startTime) * 1000;
  }
}

export const audioManager = new AudioManager();
