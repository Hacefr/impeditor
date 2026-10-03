import { generateProceduralTextures, playSynthesizedHitsound } from './proceduralAssets.js';
import { audioManager } from './audio.js';
import { inputManager } from './input.js';

export class GameEngine {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    this.app = null;
    this.textures = null;

    this.chart = null;
    this.speed = 2.0;

    // Visual Strumline
    this.receptors = [];
    this.activeNoteSprites = [];

    // Score & Judgement
    this.score = 0;
    this.combo = 0;

    // Timing Windows (milliseconds)
    this.windows = {
      sick: 45,
      good: 90,
      bad: 135
    };
  }

  init() {
    if (this.app) return;

    this.app = new PIXI.Application({
      width: 1280,
      height: 720,
      backgroundColor: 0x111111,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    this.container.appendChild(this.app.view);
    this.textures = generateProceduralTextures();

    this.setupStrumline();
    this.setupInput();

    // Start tick update
    this.app.ticker.add(() => this.update());
  }

  setupStrumline() {
    const startX = 760; // Player side (Right half of screen)
    const spacing = 110;
    const y = 100;

    for (let i = 0; i < 4; i++) {
      const spr = new PIXI.Sprite(this.textures.receptors[i]);
      spr.anchor.set(0.5);
      spr.x = startX + (i * spacing);
      spr.y = y;
      spr.scale.set(0.8);
      this.app.stage.addChild(spr);
      this.receptors.push(spr);
    }
  }

  setupInput() {
    inputManager.onKeyPress = (lane) => {
      // Glow receptor
      this.receptors[lane].scale.set(0.7);

      // Check hit note
      this.checkNoteHit(lane);
    };

    inputManager.onKeyRelease = (lane) => {
      // Reset receptor scale
      this.receptors[lane].scale.set(0.8);
    };
  }

  loadSong(chartData, instBuffer, voicesBuffer = null) {
    this.chart = chartData;
    this.speed = chartData.speed || 2.0;
    audioManager.setTracks(instBuffer, voicesBuffer);
    this.spawnNotes();
  }

  start() {
    audioManager.play(0);
  }

  spawnNotes() {
    if (!this.chart) return;

    for (const note of this.chart.playerNotes) {
      const spr = new PIXI.Sprite(this.textures.notes[note.lane]);
      spr.anchor.set(0.5);
      spr.scale.set(0.8);
      spr.visible = false;
      this.app.stage.addChild(spr);

      this.activeNoteSprites.push({
        data: note,
        sprite: spr
      });
    }
  }

  update() {
    if (!audioManager.isPlaying) return;

    const songTime = audioManager.getSongPositionMs();
    const strumY = 100;
    const scrollFactor = 0.45 * this.speed;

    for (const item of this.activeNoteSprites) {
      const note = item.data;
      const spr = item.sprite;

      if (note.hit) continue;

      // Note Y position math
      const diff = note.strumTime - songTime;
      spr.y = strumY + (diff * scrollFactor);
      spr.x = this.receptors[note.lane].x;

      // Only show when near viewport
      spr.visible = spr.y > -100 && spr.y < 800;

      // Check for Miss (Arrow passed strumline by 150ms)
      if (diff < -this.windows.bad && !note.missed) {
        note.missed = true;
        spr.alpha = 0.3;
        this.combo = 0;
      }
    }
  }

  checkNoteHit(lane) {
    const songTime = audioManager.getSongPositionMs();

    // Find closest unhit note in lane
    const candidate = this.activeNoteSprites.find(item => {
      return item.data.lane === lane && !item.data.hit && !item.data.missed;
    });

    if (!candidate) return;

    const diff = Math.abs(candidate.data.strumTime - songTime);

    if (diff <= this.windows.bad) {
      candidate.data.hit = true;
      candidate.sprite.visible = false;

      // Play synthesized tick hitsound
      playSynthesizedHitsound(audioManager.ctx);

      // Score judgement
      if (diff <= this.windows.sick) this.score += 350;
      else if (diff <= this.windows.good) this.score += 200;
      else this.score += 50;

      this.combo++;
    }
  }
}
