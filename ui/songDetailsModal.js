/**
 * Song Details Modal Controller
 * Modifies song files, difficulties, icons, and links to the visual stage studio.
 */
import { db } from '../storage/database.js';

export class SongDetailsModal {
  constructor(onSaved, onOpenStudio) {
    this.onSaved = onSaved;
    this.onOpenStudio = onOpenStudio;

    this.currentSong = null;

    // DOM Elements
    this.modalEl = document.getElementById('modal-modify-song');
    this.folderNameEl = document.getElementById('mod-folder-name');
    this.btnChangeFolder = document.getElementById('btn-change-folder');
    this.btnGotoStudio = document.getElementById('btn-goto-studio');
    this.filesListEl = document.getElementById('mod-files-list');
    this.nameInput = document.getElementById('mod-song-name-input');
    this.iconBtn = document.getElementById('mod-song-icon-btn');
    this.btnDone = document.getElementById('btn-mod-done');
    this.btnBack = document.getElementById('btn-mod-back');

    this.bindEvents();
  }

  bindEvents() {
    this.btnBack.addEventListener('click', () => this.close());

    // Save modifications
    this.btnDone.addEventListener('click', async () => {
      if (this.currentSong) {
        this.currentSong.title = this.nameInput.value.trim() || 'Untitled';
        await db.saveSong(this.currentSong);
        this.close();
        if (this.onSaved) this.onSaved();
      }
    });

    // Reassign Folder
    this.btnChangeFolder.addEventListener('click', async () => {
      const folders = await db.getFolders();
      const folderNames = folders.map(f => f.name).join(', ');
      const choice = prompt(`Choose folder (${folderNames}):`);
      const found = folders.find(f => f.name.toLowerCase() === (choice || '').toLowerCase());
      if (found) {
        this.currentSong.folderId = found.id;
        this.folderNameEl.textContent = `'${found.name}'`;
      }
    });

    // Upload custom icon
    this.iconBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          this.currentSong.iconBlob = file;
          this.updateIconDisplay();
        }
      };
      input.click();
    });

    // Launch Stage / Director Studio
    this.btnGotoStudio.addEventListener('click', () => {
      this.close();
      if (this.onOpenStudio && this.currentSong) {
        this.onOpenStudio(this.currentSong);
      }
    });
  }

  async open(song) {
    this.currentSong = song;
    this.nameInput.value = song.title || '';

    // Folder name resolution
    const folders = await db.getFolders();
    const currentFolder = folders.find(f => f.id === song.folderId);
    this.folderNameEl.textContent = `'${currentFolder ? currentFolder.name : 'UNKNOWN'}'`;

    this.updateIconDisplay();
    this.renderFilesList();

    this.modalEl.classList.remove('hidden');
  }

  close() {
    this.modalEl.classList.add('hidden');
  }

  updateIconDisplay() {
    if (this.currentSong.iconBlob) {
      const url = URL.createObjectURL(this.currentSong.iconBlob);
      this.iconBtn.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;"/>`;
    } else {
      this.iconBtn.textContent = 'X';
    }
  }

  renderFilesList() {
    this.filesListEl.innerHTML = '';

    const files = [];
    if (this.currentSong.instBlob) files.push('audio/inst.ogg');
    if (this.currentSong.voicesBlob) files.push('audio/voices.ogg');
    if (this.currentSong.charts) {
      for (const diff of Object.keys(this.currentSong.charts)) {
        files.push(`chart/${diff}.json`);
      }
    }

    files.forEach(f => {
      const item = document.createElement('div');
      item.style.padding = '4px 8px';
      item.style.borderBottom = '1px solid #aaa';
      item.style.fontSize = '0.9rem';
      item.textContent = f;
      this.filesListEl.appendChild(item);
    });
  }
}
