/**
 * Add Song Modal Controller
 * Fast, two-step ingestion for .imp archives or loose .ogg/.json files.
 */
import { db } from '../storage/database.js';
import { ImpPacker } from '../storage/impPacker.js';

export class AddSongModal {
  constructor(onSongAdded) {
    this.onSongAdded = onSongAdded;

    this.modalEl = document.getElementById('modal-add-song');
    this.folderSelectEl = document.getElementById('add-song-folder-select');
    this.btnQuickAddFolder = document.getElementById('btn-quick-add-folder');
    this.dropZone = document.getElementById('drop-zone-add-song');
    this.fileInput = document.getElementById('file-input-add-song');
    this.checkListEl = document.getElementById('file-check-list');

    this.btnDone = document.getElementById('btn-add-song-done');
    this.btnCancel = document.getElementById('btn-add-song-cancel');

    this.stagedFiles = {
      inst: null,
      voices: null,
      chart: null,
      imp: null
    };

    this.bindEvents();
  }

  bindEvents() {
    // Quick add folder inside modal
    this.btnQuickAddFolder.addEventListener('click', async () => {
      const name = prompt('New folder name:');
      if (name && name.trim()) {
        const id = 'folder_' + Date.now();
        await db.saveFolder({ id, name: name.trim() });
        await this.populateFolders();
        this.folderSelectEl.value = id;
      }
    });

    // Drop zone click triggers file picker
    this.dropZone.addEventListener('click', () => this.fileInput.click());

    // File drag & drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('dragover');
    });

    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('dragover'));

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('dragover');
      this.handleFiles(e.dataTransfer.files);
    });

    this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

    // Done & Cancel buttons
    this.btnCancel.addEventListener('click', () => this.close());
    this.btnDone.addEventListener('click', () => this.saveAndFinish());
  }

  async open(defaultFolderId = 'DEFAULT') {
    await this.populateFolders();
    this.folderSelectEl.value = defaultFolderId;
    this.stagedFiles = { inst: null, voices: null, chart: null, imp: null };
    this.checkListEl.innerHTML = '';
    this.modalEl.classList.remove('hidden');
  }

  close() {
    this.modalEl.classList.add('hidden');
  }

  async populateFolders() {
    const folders = await db.getFolders();
    this.folderSelectEl.innerHTML = '';
    folders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      this.folderSelectEl.appendChild(opt);
    });
  }

  async handleFiles(fileList) {
    for (const file of fileList) {
      const name = file.name.toLowerCase();

      if (name.endsWith('.imp') || name.endsWith('.zip')) {
        this.stagedFiles.imp = file;
        this.checkListEl.innerHTML = `<p style="color:#008800;">✓ .IMP Bundle Detected: <strong>${file.name}</strong></p>`;
        return;
      }

      if (name.includes('inst') && (name.endsWith('.ogg') || name.endsWith('.mp3'))) {
        this.stagedFiles.inst = file;
      } else if (name.includes('voices') && (name.endsWith('.ogg') || name.endsWith('.mp3'))) {
        this.stagedFiles.voices = file;
      } else if (name.endsWith('.json')) {
        this.stagedFiles.chart = file;
      }
    }

    this.updateCheckList();
  }

  updateCheckList() {
    this.checkListEl.innerHTML = `
      <div style="font-size:0.85rem;margin-top:8px;text-align:left;">
        <p>${this.stagedFiles.inst ? '✓ Inst: ' + this.stagedFiles.inst.name : '✗ Missing Inst.ogg'}</p>
        <p>${this.stagedFiles.voices ? '✓ Voices: ' + this.stagedFiles.voices.name : '○ Voices: None (Optional)'}</p>
        <p>${this.stagedFiles.chart ? '✓ Chart: ' + this.stagedFiles.chart.name : '✗ Missing Chart .json'}</p>
      </div>
    `;
  }

  async saveAndFinish() {
    const folderId = this.folderSelectEl.value;

    // 1. If dropped a .imp file, unpack and save directly
    if (this.stagedFiles.imp) {
      const songData = await ImpPacker.importFromImp(this.stagedFiles.imp);
      songData.folderId = folderId;
      await db.saveSong(songData);
      this.close();
      if (this.onSongAdded) this.onSongAdded();
      return;
    }

    // 2. If dropped loose files, ensure at least Inst and Chart exist
    if (!this.stagedFiles.inst || !this.stagedFiles.chart) {
      alert('Please upload at least an Instrumental (.ogg) and a Chart (.json)!');
      return;
    }

    const chartText = await this.stagedFiles.chart.text();
    const chartJson = JSON.parse(chartText);
    const rawSong = chartJson.song || chartJson;

    const newSong = {
      id: 'song_' + Date.now(),
      folderId: folderId,
      title: rawSong.song || 'New Track',
      author: 'Anonymous',
      speed: rawSong.speed || 2.0,
      bpm: rawSong.bpm || 120,
      instBlob: this.stagedFiles.inst,
      voicesBlob: this.stagedFiles.voices || null,
      charts: {
        hard: chartJson
      },
      stage: {
        zoom: 1.0,
        playerPos: [760, 450],
        opponentPos: [200, 450],
        layers: []
      },
      triggers: []
    };

    await db.saveSong(newSong);
    this.close();
    if (this.onSongAdded) this.onSongAdded();
  }
}
