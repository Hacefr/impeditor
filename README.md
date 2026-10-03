# impeditor 🚀
> An in-browser, zero-install Friday Night Funkin' rhythm engine, stage director studio, and shareable package player.

ImpStudio provides a clean slate where players and creators can port songs, visually design cutscenes, and share self-contained rhythm game experiences without writing code.

---

## ✨ Features

- **Zero-Binary Architecture:** The core engine contains 0MB of external binary media files. All arrows, receptors, and sounds are generated programmatically via pure code.
- **The `.imp` Package Format:** Bundle full songs, stages, audio stems, charts, and triggers into a single lightweight, shareable ZIP package.
- **Geometry Dash-Style Director:** Visual triggers placed directly on an audio timeline:
  - Alpha/Opacity Tweens (transparent walls, hidden vents, UI fading)
  - Camera Crosshair Zoom & Pan
  - A-to-B Motion Paths for props and background characters
  - Screen Flashes and Audio SFX Triggers
- **Tap-to-Chart (Live Recorder):** Tap your keyboard to the music to build Psych Engine-compliant `.json` charts in real time.
- **Independent HUD:** Fade the rhythm UI during mid-song standoffs without interrupting the stage visuals.
- **Lineage Tracking:** Built-in "Forked from" credit banners and open template modes.

---

## 📁 Repository Structure

```text
impstudio/
├── index.html              # Main single-page application & UI markup
├── style.css               # Studio and menu styles
├── README.md               # Project documentation
└── src/
    ├── main.js             # Engine bootstrapper & module router
    ├── engine/             # Web Audio API, PixiJS renderer, input, hit detection
    ├── studio/             # Timeline, visual gizmos, trigger execution
    ├── storage/            # .imp packager and IndexedDB local database
    └── ui/                 # Freeplay menu, modals, and skin manager
