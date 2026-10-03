/**
 * Local IndexedDB Storage
 * Persists all folders, songs, and presets client-side without a backend.
 */
const DB_NAME = 'ImpStudioDB';
const DB_VERSION = 1;

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 1. Folders Store (e.g. "MAIN", "POLUS", "DEFEAT")
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }

        // 2. Songs Store (Holds metadata, chart JSON, audio Blobs, icon Blobs)
        if (!db.objectStoreNames.contains('songs')) {
          const songStore = db.createObjectStore('songs', { keyPath: 'id' });
          songStore.createIndex('folderId', 'folderId', { unique: false });
        }

        // 3. Global Engine Settings & Custom Skins (menu > main files)
        if (!db.objectStoreNames.contains('mainFiles')) {
          db.createObjectStore('mainFiles', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  // --- FOLDERS ---
  async getFolders() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('folders', 'readonly');
      const store = tx.objectStore('folders');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.length ? req.result : [{ id: 'DEFAULT', name: 'MAIN' }]);
      req.onerror = () => reject(req.error);
    });
  }

  async saveFolder(folderObj) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const req = store.put(folderObj);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // --- SONGS ---
  async getSongsByFolder(folderId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('songs', 'readonly');
      const store = tx.objectStore('songs');
      const index = store.index('folderId');
      const req = index.getAll(folderId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getSong(songId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('songs', 'readonly');
      const store = tx.objectStore('songs');
      const req = store.get(songId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveSong(songObj) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      const req = store.put(songObj);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSong(songId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      const req = store.delete(songId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const db = new Database();
