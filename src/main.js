/**
 * ImpStudio - Master Application Controller
 * Boots the engine, handles screen transitions, and routes data between menus, engine, and Pixlr studio.
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
    this.studioSongName = document.getElementById('studio-song-name');

    // Core Systems
    this.gameEngine = new GameEngine('canvas-container');
    this.triggerManager = new TriggerManager(this.gameEngine);
    this.gizmos = null;
    this.timeline = null;

    this.currentSong = null;
    this.currentMode = 'FREEPLAY';
  }

  async init() {
    await db.init();

    this.addSongModal = new AddSongModal(async () => {
      await this.freeplayMenu.refresh();
    });

    this.songDetailsModal = new SongDetailsModal(
      async () => await this.freeplayMenu.refresh(),
      (song) => this.openStudio(song)
    );

    this.mainFilesMenu = new MainFilesMenu();

    this.freeplayMenu = new FreeplayMenu(
      (song, diff) => this.playSong(song, diff),
      (song) => this.songDetailsModal.open(song),
      (song) => this.openStudio(song)
    );

    await this.freeplayMenu.refresh();
    this.bindEvents();
  }

  bindEvents() {
    this.btnOpenAddSong.addEventListener('click', () => {
      this.addSongModal.open(this.freeplayMenu.currentFolderId);
    });

    this.btnExitStudio.addEventListener('click', () => {
      audioManager.stop();
      this.showScreen('FREEPLAY');
    });

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
  // 1. PLAY SONG (Gameplay)
  // =========================================================================
  async playSong(song, difficulty = 'HARD') {
    this.currentSong = song;
    this.showScreen('GAME');

    this.gameEngine.init();

    const instBuffer = await audioManager.loadAudioFromBlob(song.instBlob);
    let voicesBuffer = null;
    if (song.voicesBlob) {
      voicesBuffer = await audioManager.loadAudioFromBlob(song.voicesBlob);
    }

    const diffKey = difficulty.toLowerCase();
    const rawChart = (song.charts && song.charts[diffKey]) 
      ? song.charts[diffKey] 
      : Object.values(song.charts || {})[0];

    const parsedChart = parseFNFChart(rawChart);

    this.triggerManager.setTriggers(song.triggers || []);

    this.gameEngine.app.ticker.remove(this.tickTriggers, this);
    this.gameEngine.app.ticker.add(this.tickTriggers, this);

    this.gameEngine.loadSong(parsedChart, instBuffer, voicesBuffer);
    this.gameEngine.start();
  }

  tickTriggers() {
    if (audioManager.isPlaying) {
      this.triggerManager.update(audioManager.getSongPositionMs());
    }
  }

  // =========================================================================
  // 2. PIXLR-STYLE STUDIO / DIRECTOR WORKBENCH
  // =========================================================================
  async openStudio(song) {
    this.currentSong = song;
    this.showScreen('STUDIO');

    if (this.studioSongName) {
      this.studioSongName.textContent = song.title || 'Untitled Track';
    }

    this.gameEngine.init();

    const instBuffer = await audioManager.loadAudioFromBlob(song.instBlob);
    audioManager.setTracks(instBuffer);

    const songDurationMs = instBuffer.duration * 1000;

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

    if (!this.gizmos) {
      this.gizmos = new TransformGizmos(this.gameEngine.app, (obj, idName) => {
        this.updateInspector(obj, idName);
      });

      this.gameEngine.playerReceptors.forEach((rec, idx) => {
        this.gizmos.attach(rec, `Player_Receptor_${idx}`);
      });
      this.gameEngine.opponentReceptors.forEach((rec, idx) => {
        this.gizmos.attach(rec, `Opponent_Receptor_${idx}`);
      });
    }

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
      <div style="font-size:0.8rem;line-height:1.7;color:#eceff4;">
        <p style="color:#00d2ff;font-weight:bold;margin-bottom:6px;">${idName}</p>
        <p><strong>X:</strong> ${Math.round(displayObject.x)}px | <strong>Y:</strong> ${Math.round(displayObject.y)}px</p>
        <div style="margin-top:8px;">
          <label style="display:flex;justify-content:space-between;">Scale: <span id="val-scale">${displayObject.scale.x.toFixed(1)}</span></label>
          <input type="range" min="0.2" max="3" step="0.1" value="${displayObject.scale.x}" id="prop-scale" style="width:100%;margin-top:2px;" />
        </div>
        <div style="margin-top:8px;">
          <label style="display:flex;justify-content:space-between;">Opacity: <span id="val-alpha">${displayObject.alpha.toFixed(2)}</span></label>
          <input type="range" min="0" max="1" step="0.05" value="${displayObject.alpha}" id="prop-alpha" style="width:100%;margin-top:2px;" />
        </div>
      </div>
    `;

    document.getElementById('prop-scale').oninput = (e) => {
      const val = parseFloat(e.target.value);
      this.gizmos.setScale(val);
      document.getElementById('val-scale').textContent = val.toFixed(1);
    };

    document.getElementById('prop-alpha').oninput = (e) => {
      const val = parseFloat(e.target.value);
      this.gizmos.setOpacity(val);
      document.getElementById('val-alpha').textContent = val.toFixed(2);
    };
  }

  promptAddTrigger(timestampMs) {
    const type = prompt(
      `ADD TRIGGER @ ${Math.floor(timestampMs)}ms\n\n` +
      `Enter Trigger Type:\n` +
      `1: FLASH (Screen Flash)\n` +
      `2: OPACITY (Fade Wall / HUD)\n` +
      `3: CAMERA_ZOOM (Target Zoom)\n` +
      `4: PAUSE (Mid-Song Cutscene Freeze)`
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

const app = new App();
app.init();
