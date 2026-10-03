/**
 * Freeplay Menu Controller
 * Handles folder categories, dynamic song capsules, and the showcase card.
 */
import { db } from '../storage/database.js';

export class FreeplayMenu {
  constructor(onPlaySong, onModifySong, onOpenStudio) {
    this.onPlaySong = onPlaySong;
    this.onModifySong = onModifySong;
    this.onOpenStudio = onOpenStudio;

    this.currentFolderId = 'DEFAULT';
    this.selectedSong = null;
    this.difficulties = ['EASY', 'NORMAL', 'HARD'];
    this.currentDiffIndex = 2; // Default: HARD

    // DOM Elements
    this.folderListEl = document.getElementById('folder-list');
    this.songListEl = document.getElementById('song-list');
    this.btnAddFolder = document.getElementById('btn-add-folder');
    this.showcaseBanner = document.getElementById('showcase-banner');
    this.diffLabel = document.getElementById('diff-label');
    this.btnPlay = document.getElementById('btn-play-song');
    this.btnModify = document.getElementById('btn-modify-song');

    this.bindEvents();
  }

  bindEvents() {
    // Add new folder tab
    this.btnAddFolder.addEventListener('click', async () => {
      const name = prompt('Enter new folder/square name:');
      if (name && name.trim()) {
        const id = 'folder_' + Date.now();
        await db.saveFolder({ id, name: name.trim() });
        this.currentFolderId = id;
        await this.refresh();
      }
    });

    // Difficulty Prev / Next (< / >)
    document.getElementById('diff-prev').addEventListener('click', () => {
      this.currentDiffIndex = (this.currentDiffIndex - 1 + this.difficulties.length) % this.difficulties.length;
      this.updateDifficultyDisplay();
    });

    document.getElementById('diff-next').addEventListener('click', () => {
      this.currentDiffIndex = (this.currentDiffIndex + 1) % this.difficulties.length;
      this.updateDifficultyDisplay();
    });

    // Action buttons
    this.btnPlay.addEventListener('click', () => {
      if (this.selectedSong && this.onPlaySong) {
        this.onPlaySong(this.selectedSong, this.difficulties[this.currentDiffIndex]);
      }
    });

    this.btnModify.addEventListener('click', () => {
      if (this.selectedSong && this.onModifySong) {
        this.onModifySong(this.selectedSong);
      }
    });
  }

  async refresh() {
    await this.renderFolders();
    await this.renderSongs();
  }

  async renderFolders() {
    const folders = await db.getFolders();
    this.folderListEl.innerHTML = '';

    folders.forEach(folder => {
      const btn = document.createElement('button');
      btn.className = `folder-tab ${folder.id === this.currentFolderId ? 'active' : ''}`;
      btn.textContent = folder.name;
      btn.addEventListener('click', () => {
        this.currentFolderId = folder.id;
        this.renderFolders();
        this.renderSongs();
      });
      this.folderListEl.appendChild(btn);
    });
  }

  async renderSongs() {
    const songs = await db.getSongsByFolder(this.currentFolderId);
    this.songListEl.innerHTML = '';

    if (songs.length === 0) {
      this.selectedSong = null;
      this.updateShowcase();
      return;
    }

    // Default select first song if none selected
    if (!this.selectedSong || !songs.find(s => s.id === this.selectedSong.id)) {
      this.selectedSong = songs[0];
    }

    songs.forEach(song => {
      const capsule = document.createElement('div');
      const isSelected = this.selectedSong && this.selectedSong.id === song.id;
      capsule.className = `btn-capsule ${isSelected ? 'selected' : ''}`;

      const titleSpan = document.createElement('span');
      titleSpan.textContent = song.title || 'Untitled';

      const iconImg = document.createElement('div');
      iconImg.className = 'mini-icon-placeholder';
      if (song.iconBlob) {
        const url = URL.createObjectURL(song.iconBlob);
        iconImg.innerHTML = `<img src="${url}" style="width:32px;height:32px;object-fit:contain;"/>`;
      } else {
        iconImg.textContent = '★';
      }

      capsule.appendChild(titleSpan);
      capsule.appendChild(iconImg);

      capsule.addEventListener('click', () => {
        this.selectedSong = song;
        this.renderSongs();
        this.updateShowcase();
      });

      this.songListEl.appendChild(capsule);
    });

    this.updateShowcase();
  }

  updateShowcase() {
    if (!this.selectedSong) {
      this.showcaseBanner.innerHTML = '<span class="banner-placeholder">No Song Selected</span>';
      this.btnPlay.disabled = true;
      this.btnModify.disabled = true;
      return;
    }

    this.btnPlay.disabled = false;
    this.btnModify.disabled = false;

    // Banner Image or Fallback Stats
    if (this.selectedSong.bannerBlob) {
      const url = URL.createObjectURL(this.selectedSong.bannerBlob);
      this.showcaseBanner.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;"/>`;
    } else {
      this.showcaseBanner.innerHTML = `
        <div style="font-size:0.9rem;line-height:1.6;">
          <h2 style="font-size:1.5rem;font-weight:900;">${this.selectedSong.title}</h2>
          <p>By ${this.selectedSong.author || 'Anonymous'}</p>
          <hr style="margin:8px 0;border:1px solid #555;"/>
          <p><strong>BPM:</strong> ${this.selectedSong.bpm || 120}</p>
          <p><strong>Scroll Speed:</strong> ${this.selectedSong.speed || 2.0}</p>
          ${this.selectedSong.lineage?.isFork ? `<p style="color:#d83434;margin-top:4px;">🍴 Forked from @${this.selectedSong.lineage.originalAuthor}</p>` : ''}
        </div>
      `;
    }

    this.updateDifficultyDisplay();
  }

  updateDifficultyDisplay() {
    this.diffLabel.textContent = this.difficulties[this.currentDiffIndex];
  }
}
