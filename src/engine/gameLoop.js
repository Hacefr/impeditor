/**
 * Game Engine Loop
 * Renders Player 1 (BF) and Player 2 (Opponent) Strumlines.
 * Supports Tap Notes, Hold/Sustain Trails, and calibrated scroll speed.
 */
import { generateProceduralTextures, playSynthesizedHitsound, NOTE_COLORS } from './proceduralAssets.js';
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

    // Falling Note Objects (Hold notes + Tap notes)
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
      backgroundColor: 0x0e0f12,
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
      spr.alpha = 0.75;
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
      if (this.playerReceptors[lane]) {
        this.playerReceptors[lane].scale.set(0.64);
      }
      this.checkPlayerNoteHit(lane);
    };

    inputManager.onKeyRelease = (lane) => {
      if (this.playerReceptors[lane]) {
        this.playerReceptors[lane].scale.set(0.72);
      }
      // Release holding notes
      for (const item of this.playerNoteSprites) {
        if (item.data.lane === lane && item.isHolding) {
          item.isHolding = false;
        }
      }
    };
  }

  loadSong(chartData, instBuffer, voicesBuffer = null) {
    this.chart = chartData;
    this.speed = chartData.speed || 2.0;

    this.clearNotes();
    audioManager.setTracks(instBuffer, voicesBuffer);
    this.spawnNotes();
  }

  clearNotes() {
    for (const item of this.playerNoteSprites) {
      if (item.trailGraphic) {
        this.app.stage.removeChild(item.trailGraphic);
        item.trailGraphic.destroy();
      }
      this.app.stage.removeChild(item.sprite);
      item.sprite.destroy();
    }
    for (const item of this.opponentNoteSprites) {
      if (item.trailGraphic) {
        this.app.stage.removeChild(item.trailGraphic);
        item.trailGraphic.destroy();
      }
      this.app.stage.removeChild(item.sprite);
      item.sprite.destroy();
    }
    this.playerNoteSprites = [];
    this.opponentNoteSprites = [];
  }

  start() {
    audioManager.play(0);
  }

  createSustainGraphic(lane, lengthMs, scrollFactor) {
    const g = new PIXI.Graphics();
    const trailHeight = lengthMs * scrollFactor;
    const trailWidth = 24;
    const hexColor = parseInt(NOTE_COLORS[lane].replace('#', ''), 16);

    g.beginFill(hexColor, 0.65);
    g.drawRoundedRect(-trailWidth / 2, 0, trailWidth, trailHeight, 10);
    g.endFill();
    g.visible = false;
    return g;
  }

  spawnNotes() {
    if (!this.chart) return;
    const scrollFactor = 0.22 * this.speed;

    // Spawn Player 1 Notes (BF)
    for (const note of this.chart.playerNotes) {
      let trailG = null;
      if (note.sustainLength > 60) {
        trailG = this.createSustainGraphic(note.lane, note.sustainLength, scrollFactor);
        this.app.stage.addChild(trailG); // Add trail behind note
      }

      const spr = new PIXI.Sprite(this.textures.notes[note.lane]);
      spr.anchor.set(0.5);
      spr.scale.set(0.72);
      spr.visible = false;
      this.app.stage.addChild(spr);

      this.playerNoteSprites.push({
        data: note,
        sprite: spr,
        trailGraphic: trailG,
        isHolding: false,
        holdProgressMs: 0
      });
    }

    // Spawn Player 2 Notes (Opponent)
    for (const note of this.chart.opponentNotes) {
      let trailG = null;
      if (note.sustainLength > 60) {
        trailG = this.createSustainGraphic(note.lane, note.sustainLength, scrollFactor);
        trailG.alpha = 0.55;
        this.app.stage.addChild(trailG);
      }

      const spr = new PIXI.Sprite(this.textures.notes[note.lane]);
      spr.anchor.set(0.5);
      spr.scale.set(0.72);
      spr.alpha = 0.75;
      spr.visible = false;
      this.app.stage.addChild(spr);

      this.opponentNoteSprites.push({
        data: note,
        sprite: spr,
        trailGraphic: trailG,
        isHolding: false
      });
    }
  }

  update() {
    if (!audioManager.isPlaying) return;

    const songTime = audioManager.getSongPositionMs();
    const strumY = 90;

    // Recalibrated scroll factor for comfortable readability
    const scrollFactor = 0.22 * this.speed;

    // ==========================================
    // 1. UPDATE PLAYER NOTES (BF)
    // ==========================================
    for (const item of this.playerNoteSprites) {
      const note = item.data;
      const spr = item.sprite;
      const trail = item.trailGraphic;

      if (note.hit && !item.isHolding) continue;

      const diff = note.strumTime - songTime;
      const targetX = this.playerReceptors[note.lane].x;

      if (!item.isHolding) {
        spr.y = strumY + (diff * scrollFactor);
        spr.x = targetX;
        spr.visible = spr.y > -100 && spr.y < 800;

        if (trail) {
          trail.x = targetX;
          trail.y = spr.y;
          trail.visible = spr.visible;
        }

        // Miss check
        if (diff < -this.windows.bad && !note.missed) {
          note.missed = true;
          spr.alpha = 0.25;
          if (trail) trail.alpha = 0.15;
          this.combo = 0;
          this.misses++;
        }
      } else {
        // HOLDING LOGIC: Head stays locked to receptor, trail shrinks
        spr.y = strumY;
        spr.x = targetX;
        spr.visible = true;

        const holdElapsed = songTime - note.strumTime;
        const remainingMs = Math.max(0, note.sustainLength - holdElapsed);

        if (trail) {
          trail.x = targetX;
          trail.y = strumY;
          trail.height = Math.max(0, remainingMs * scrollFactor);
        }

        if (remainingMs <= 0) {
          item.isHolding = false;
          note.hit = true;
          spr.visible = false;
          if (trail) trail.visible = false;
        }
      }
    }

    // ==========================================
    // 2. UPDATE OPPONENT NOTES (Lime Green - Botplay)
    // ==========================================
    for (const item of this.opponentNoteSprites) {
      const note = item.data;
      const spr = item.sprite;
      const trail = item.trailGraphic;

      if (note.hit && !item.isHolding) continue;

      const diff = note.strumTime - songTime;
      const targetX = this.opponentReceptors[note.lane].x;

      if (!item.isHolding) {
        spr.y = strumY + (diff * scrollFactor);
        spr.x = targetX;
        spr.visible = spr.y > -100 && spr.y < 800;

        if (trail) {
          trail.x = targetX;
          trail.y = spr.y;
          trail.visible = spr.visible;
        }

        // Opponent auto-hit trigger
        if (diff <= 0) {
          const rec = this.opponentReceptors[note.lane];
          rec.scale.set(0.64);

          if (note.sustainLength > 60) {
            item.isHolding = true;
          } else {
            note.hit = true;
            spr.visible = false;
            setTimeout(() => rec.scale.set(0.72), 110);
          }
        }
      } else {
        // Opponent auto-holding
        spr.y = strumY;
        spr.x = targetX;
        spr.visible = true;

        const holdElapsed = songTime - note.strumTime;
        const remainingMs = Math.max(0, note.sustainLength - holdElapsed);

        if (trail) {
          trail.x = targetX;
          trail.y = strumY;
          trail.height = Math.max(0, remainingMs * scrollFactor);
        }

        if (remainingMs <= 0) {
          item.isHolding = false;
          note.hit = true;
          spr.visible = false;
          if (trail) trail.visible = false;
          this.opponentReceptors[note.lane].scale.set(0.72);
        }
      }
    }
  }

  checkPlayerNoteHit(lane) {
    const songTime = audioManager.getSongPositionMs();

    const candidate = this.playerNoteSprites.find(item => {
      return item.data.lane === lane && !item.data.hit && !item.data.missed;
    });

    if (!candidate) return;

    const diff = Math.abs(candidate.data.strumTime - songTime);

    if (diff <= this.windows.bad) {
      playSynthesizedHitsound(audioManager.ctx);

      if (candidate.data.sustainLength > 60) {
        candidate.isHolding = true; // Enter sustain hold mode
      } else {
        candidate.data.hit = true;
        candidate.sprite.visible = false;
      }

      // Scoring
      if (diff <= this.windows.sick) this.score += 350;
      else if (diff <= this.windows.good) this.score += 200;
      else this.score += 50;

      this.combo++;
    }
  }
}
