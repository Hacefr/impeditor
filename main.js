/**
 * ImpStudio - Master Application Controller
 * Boots the engine, handles screen transitions, and routes data between menus, engine, and studio.
 */

import { db } from './storage/database.js';
import { audioManager } from './engine/audio.js';
import { parseFNFChart } from './engine/chartParser.js';
import { GameEngine } from './engine/gameLoop.js';

import { FreeplayMenu } from './ui/freeplayMenu.js';
import { AddSongModal } from './ui/addSongModal.js';
import { SongDetailsModal } from './ui/songDetailsModal.js';
import { MainFilesMenu } from './ui/mainFilesMenu.js';

import { TriggerManager } from './studio/triggers.js';
import { StudioTimeline } from './studio/timeline.js';
import { TransformGizmos } from './studio/gizmos.js';

class App {
  constructor() {
    this.screenFreeplay = document.getElementById('screen-freeplay');
    this.screenGame = document.getElementById('screen-game');
    this.studioUi = document.getElementById('studio-ui');
    this.btnExitStudio = document.getElementById('btn-exit-studio');
    this.btnOpenAddSong = document.getElementById('btn-open-add-song');
    this.inspectorContent = document.getElementById('inspector-content');

    // Core Systems
    this.gameEngine = new GameEngine('canvas-container');
    this.triggerManager = new TriggerManager(this.gameEngine);
    this.gizmos = null;
    this.timeline = null;

    this.currentSong = null;
    this.currentMode = 'FREEPLAY'; // 'FREEPLAY' | 'GAME' | 'STUDIO'
  }

  async init() {
    // 1. Initialize Database
    await db.init();

    // 2. Initialize UI Modals
    this.addSongModal = new AddSongModal(async () => {
      await this.freeplayMenu.refresh();
    });

    this.songDetailsModal = new SongDetailsModal(
      async () => await this.freeplayMenu.refresh(),
      (song) => this.openStudio(song)
    );

    this.mainFilesMenu = new MainFilesMenu();

    // 3. Initialize Freeplay Menu
    this.freeplayMenu = new FreeplayMenu(
      (song, diff) => this.playSong(song, diff),
      (song) => this.songDetailsModal.open(song),
      (song) => this.openStudio(song)
    );

    await this.freeplayMenu.refresh();

    // 4. Bind Global Navigation Events
    this.bindEvents();
  }

  bindEvents() {
    // Open Add Song Modal
    this.btnOpenAddSong.addEventListener('click', () => {
      this.addSongModal.open(this.freeplayMenu.currentFolderId);
    });

    // Exit Studio Mode
    this.btnExitStudio.addEventListener('click', () => {
      audioManager.stop();
      this.showScreen('FREEPLAY');
    });

    // Global Keylistener: ESC to return to Freeplay
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentMode === 'GAME') {
        audioManager.stop();
        this.showScreen('FREEPLAY');
      }
    });
  }

  showScreen(mode) {
    this.currentMode = mode;

    this.screenFreeplay.classList.remove('active');
    this.screenGame.classList.remove('active');
    this.studioUi.classList.add('hidden');

    if (mode === 'FREEPLAY') {
      this.screenFreeplay.classList.add('active');
      this.freeplayMenu.refresh();
    } else if (mode === 'GAME') {
      this.screenGame.classList.add('active');
    } else if (mode === 'STUDIO') {
      this.screenGame.classList.add('active');
      this.studioUi.classList.remove('hidden');
    }
  }

  // =========================================================================
  // 1. PLAY SONG (Standard Rhythm Gameplay)
  // =========================================================================
  async playSong(song, difficulty = 'HARD') {
    this.currentSong = song;
    this.showScreen('GAME');

    // Initialize PixiJS canvas if not ready
    this.gameEngine.init();

    // Decode Audio
    const instBuffer = await audioManager.loadAudioFromBlob(song.instBlob);
    let voicesBuffer = null;
    if (song.voicesBlob) {
      voicesBuffer = await audioManager.loadAudioFromBlob(song.voicesBlob);
    }

    // Load Chart for selected difficulty
    const diffKey = difficulty.toLowerCase();
    const rawChart = (song.charts && song.charts[diffKey]) 
      ? song.charts[diffKey] 
      : Object.values(song.charts || {})[0];

    const parsedChart = parseFNFChart(rawChart);

    // Setup Triggers (Flashes, Zooms, Opacity)
    this.triggerManager.setTriggers(song.triggers || []);

    // Hook Trigger Manager into GameEngine Ticker
    this.gameEngine.app.ticker.remove(this.tickTriggers, this);
    this.gameEngine.app.ticker.add(this.tickTriggers, this);

    // Start Song
    this.gameEngine.loadSong(parsedChart, instBuffer, voicesBuffer);
    this.gameEngine.start();
  }

  tickTriggers() {
    if (audioManager.isPlaying) {
      this.triggerManager.update(audioManager.getSongPositionMs());
    }
  }

  // =========================================================================
  // 2. STUDIO / DIRECTOR MODE (GD-Style Editor)
  // =========================================================================
  async openStudio(song) {
    this.currentSong = song;
    this.showScreen('STUDIO');

    this.gameEngine.init();

    // Decode Audio for Scrubber
    const instBuffer = await audioManager.loadAudioFromBlob(song.instBlob);
    audioManager.setTracks(instBuffer);

    const songDurationMs = instBuffer.duration * 1000;

    // Setup Timeline
    if (!this.timeline) {
      this.timeline = new StudioTimeline(
        (timestampMs) => this.promptAddTrigger(timestampMs),
        (seekTimeMs) => {
          if (audioManager.isPlaying) {
            audioManager.play(seekTimeMs);
          } else {
            audioManager.pauseOffset = seekTimeMs;
          }
        }
      );
    }

    this.timeline.setDuration(songDurationMs);
    this.timeline.renderTriggerMarkers(this.currentSong.triggers || []);

    // Setup Transform Gizmos for Characters & Props
    if (!this.gizmos) {
      this.gizmos = new TransformGizmos(this.gameEngine.app, (obj, idName) => {
        this.updateInspector(obj, idName);
      });

      // Attach gizmos to visual elements
      this.gameEngine.receptors.forEach((rec, idx) => {
        this.gizmos.attach(rec, `Receptor_Lane_${idx}`);
      });
    }

    // Timeline Playhead Update Loop
    this.gameEngine.app.ticker.add(() => {
      if (this.currentMode === 'STUDIO') {
        const timeMs = audioManager.getSongPositionMs();
        this.timeline.updatePlayhead(timeMs);
        this.triggerManager.update(timeMs);
      }
    });
  }

  updateInspector(displayObject, idName) {
    this.inspectorContent.innerHTML = `
      <div style="font-size:0.85rem;line-height:1.8;">
        <p><strong>Selected:</strong> ${idName}</p>
        <p><strong>X:</strong> ${Math.round(displayObject.x)} | <strong>Y:</strong> ${Math.round(displayObject.y)}</p>
        <label>Scale: 
          <input type="range" min="0.2" max="3" step="0.1" value="${displayObject.scale.x}" id="prop-scale" />
        </label><br/>
        <label>Opacity: 
          <input type="range" min="0" max="1" step="0.05" value="${displayObject.alpha}" id="prop-alpha" />
        </label>
      </div>
    `;

    document.getElementById('prop-scale').oninput = (e) => {
      this.gizmos.setScale(parseFloat(e.target.value));
    };

    document.getElementById('prop-alpha').oninput = (e) => {
      this.gizmos.setOpacity(parseFloat(e.target.value));
    };
  }

  promptAddTrigger(timestampMs) {
    const type = prompt(
      `ADD TRIGGER @ ${Math.floor(timestampMs)}ms\n\n` +
      `Enter Trigger Type:\n` +
      `1: FLASH (Screen Flash)\n` +
      `2: OPACITY (Fade Wall / HUD)\n` +
      `3: CAMERA_ZOOM (Target Zoom)\n` +
      `4: PAUSE (Mid-Song Standoff Freeze)`
    );

    let newTrigger = null;

    if (type === '1') {
      const color = prompt('Flash Color (Hex):', '#FF0000') || '#FF0000';
      newTrigger = { id: 'trig_' + Date.now(), timeMs: timestampMs, type: 'FLASH', color, duration: 0.3 };
    } else if (type === '2') {
      const targetId = prompt('Target ID (e.g. HUD or prop name):', 'HUD');
      const val = parseFloat(prompt('Target Opacity (0.0 to 1.0):', '0.3'));
      newTrigger = { id: 'trig_' + Date.now(), timeMs: timestampMs, type: 'OPACITY', targetId, value: val, duration: 0.4 };
    } else if (type === '3') {
      const zoom = parseFloat(prompt('Zoom Level (e.g. 1.5):', '1.5'));
      newTrigger = { id: 'trig_' + Date.now(), timeMs: timestampMs, type: 'CAMERA_ZOOM', zoomLevel: zoom, duration: 0.4 };
    } else if (type === '4') {
      const dur = parseFloat(prompt('Pause Duration in Seconds:', '2.0'));
      newTrigger = { id: 'trig_' + Date.now(), timeMs: timestampMs, type: 'PAUSE', durationMs: dur * 1000 };
    }

    if (newTrigger) {
      if (!this.currentSong.triggers) this.currentSong.triggers = [];
      this.currentSong.triggers.push(newTrigger);
      db.saveSong(this.currentSong);
      this.timeline.renderTriggerMarkers(this.currentSong.triggers);
      alert('Trigger Added!');
    }
  }
}

// Boot the application on page load
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
