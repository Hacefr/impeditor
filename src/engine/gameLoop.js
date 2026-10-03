/**
 * Game Engine Loop
 * Renders both Player 1 (BF) and Player 2 (Opponent) Strumlines.
 * Handles note scrolling, botplay for Opponent, and input judgement for Player.
 */
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

    // Both Player 1 and Player 2 Receptors
    this.playerReceptors = [];
    this.opponentReceptors = [];

    // Falling Note Sprites
    this.playerNoteSprites = [];
    this.opponentNoteSprites = [];

    // Score & Judgement
    this.score = 0;
    this.combo = 0;
    this.misses = 0;

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

    this.setupStrumlines();
    this.setupInput();

    // Start tick update loop
    this.app.ticker.add(() => this.update());
  }

  setupStrumlines() {
    const spacing = 105;
    const y = 90;

    // 1. OPPONENT STRUMline (Player 2: Lime Green) - Left Side
    const oppStartX = 120;
    for (let i = 0; i < 4; i++) {
      const spr = new PIXI.Sprite(this.textures.receptors[i]);
      spr.anchor.set(0.5);
      spr.x = oppStartX + (i * spacing);
      spr.y = y;
      spr.scale.set(0.72);
      spr.alpha = 0.8;
      this.app.stage.addChild(spr);
      this.opponentReceptors.push(spr);
    }

    // 2. PLAYER STRUMline (Player 1: Boyfriend) - Right Side
    const playerStartX = 780;
    for (let i = 0; i < 4; i++) {
      const spr = new PIXI.Sprite(this.textures.receptors[i]);
      spr.anchor.set(0.5);
      spr.x = playerStartX + (i * spacing);
      spr.y = y;
      spr.scale.set(0.72);
      this.app.stage.addChild(spr);
      this.playerReceptors.push(spr);
    }
  }

  setupInput() {
    inputManager.onKeyPress = (lane) => {
      // Glow player receptor
      if (this.playerReceptors[lane]) {
        this.playerReceptors[lane].scale.set(0.64);
      }
      this.checkPlayerNoteHit(lane);
    };

    inputManager.onKeyRelease = (lane) => {
      if (this.playerReceptors[lane]) {
        this.playerReceptors[lane].scale.set(0.72);
      }
    };
  }

  loadSong(chartData, instBuffer, voicesBuffer = null) {
    this.chart = chartData;
    // Calibrate scroll speed (Stargazer 2.9 is readable with balanced scaling)
    this.speed = chartData.speed || 2.0;

    // Reset notes
    this.clearNotes();

    audioManager.setTracks(instBuffer, voicesBuffer);
    this.spawnNotes();
  }

  clearNotes() {
    for (const item of this.playerNoteSprites) {
      this.app.stage.removeChild(item.sprite);
      item.sprite.destroy();
    }
    for (const item of this.opponentNoteSprites) {
      this.app.stage.removeChild(item.sprite);
      item.sprite.destroy();
    }
    this.playerNoteSprites = [];
    this.opponentNoteSprites = [];
  }

  start() {
    audioManager.play(0);
  }

  spawnNotes() {
    if (!this.chart) return;

    // Spawn Player 1 Notes (Boyfriend)
    for (const note of this.chart.playerNotes) {
      const spr = new PIXI.Sprite(this.textures.notes[note.lane]);
      spr.anchor.set(0.5);
      spr.scale.set(0.72);
      spr.visible = false;
      this.app.stage.addChild(spr);

      this.playerNoteSprites.push({
        data: note,
        sprite: spr
      });
    }

    // Spawn Player 2 Notes (Opponent / Lime Green)
    for (const note of this.chart.opponentNotes) {
      const spr = new PIXI.Sprite(this.textures.notes[note.lane]);
      spr.anchor.set(0.5);
      spr.scale.set(0.72);
      spr.alpha = 0.75;
      spr.visible = false;
      this.app.stage.addChild(spr);

      this.opponentNoteSprites.push({
        data: note,
        sprite: spr
      });
    }
  }

  update() {
    if (!audioManager.isPlaying) return;

    const songTime = audioManager.getSongPositionMs();
    const strumY = 90;
    // Standard calibrated scroll speed formula
    const scrollFactor = 0.45 * (this.speed / 1.1);

    // ==========================================
    // 1. UPDATE PLAYER NOTES (BF)
    // ==========================================
    for (const item of this.playerNoteSprites) {
      const note = item.data;
      const spr = item.sprite;

      if (note.hit) continue;

      const diff = note.strumTime - songTime;
      spr.y = strumY + (diff * scrollFactor);
      spr.x = this.playerReceptors[note.lane].x;

      spr.visible = spr.y > -100 && spr.y < 800;

      // Miss check (Arrow passed strumline by 140ms)
      if (diff < -this.windows.bad && !note.missed) {
        note.missed = true;
        spr.alpha = 0.3;
        this.combo = 0;
        this.misses++;
      }
    }

    // ==========================================
    // 2. UPDATE OPPONENT NOTES (Lime Green - Botplay)
    // ==========================================
    for (const item of this.opponentNoteSprites) {
      const note = item.data;
      const spr = item.sprite;

      if (note.hit) continue;

      const diff = note.strumTime - songTime;
      spr.y = strumY + (diff * scrollFactor);
      spr.x = this.opponentReceptors[note.lane].x;

      spr.visible = spr.y > -100 && spr.y < 800;

      // Opponent Auto-Hit on exact timestamp
      if (diff <= 0) {
        note.hit = true;
        spr.visible = false;

        // Bop/Glow opponent receptor
        const rec = this.opponentReceptors[note.lane];
        rec.scale.set(0.64);
        setTimeout(() => rec.scale.set(0.72), 120);
      }
    }
  }

  checkPlayerNoteHit(lane) {
    const songTime = audioManager.getSongPositionMs();

    // Find closest unhit note in the pressed lane
    const candidate = this.playerNoteSprites.find(item => {
      return item.data.lane === lane && !item.data.hit && !item.data.missed;
    });

    if (!candidate) return;

    const diff = Math.abs(candidate.data.strumTime - songTime);

    if (diff <= this.windows.bad) {
      candidate.data.hit = true;
      candidate.sprite.visible = false;

      // Synthesized tick hitsound
      playSynthesizedHitsound(audioManager.ctx);

      // Judgements
      if (diff <= this.windows.sick) this.score += 350;
      else if (diff <= this.windows.good) this.score += 200;
      else this.score += 50;

      this.combo++;
    }
  }
}
