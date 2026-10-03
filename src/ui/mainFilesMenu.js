/**
 * Main Files (Engine Skins) Controller
 * Allows players to override base procedural arrows and hit sounds with custom assets.
 */
import { db } from '../storage/database.js';

export class MainFilesMenu {
  constructor() {
    this.btnOpen = document.getElementById('btn-open-main-files');
    this.bindEvents();
  }

  bindEvents() {
    this.btnOpen.addEventListener('click', () => this.showDialog());
  }

  showDialog() {
    const choice = prompt(
      "MENU > MAIN FILES\n\n" +
      "1: Export Current Engine Skin Pack\n" +
      "2: Reset to Pure-Code Procedural Arrows\n\n" +
      "Enter 1 or 2:"
    );

    if (choice === '2') {
      localStorage.removeItem('custom_note_skin');
      alert('Reset to pure procedural code-generated arrows!');
      window.location.reload();
    }
  }
}
