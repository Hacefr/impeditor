/**
 * Trigger Engine (Geometry Dash-style action system)
 * Handles Opacity tweens, Camera zooms, Screen flashes, SFX, and Cutscene pauses.
 */
import { audioManager } from '../engine/audio.js';

export class TriggerManager {
  constructor(gameEngine) {
    this.engine = gameEngine;
    this.triggers = [];
    this.activeTweens = [];
    this.triggeredSet = new Set();
  }

  setTriggers(triggerList) {
    this.triggers = (triggerList || []).sort((a, b) => a.timeMs - b.timeMs);
    this.reset();
  }

  reset() {
    this.triggeredSet.clear();
    this.activeTweens = [];
  }

  update(currentSongTimeMs) {
    // 1. Check for triggers ready to fire
    for (const trig of this.triggers) {
      if (currentSongTimeMs >= trig.timeMs && !this.triggeredSet.has(trig.id)) {
        this.triggeredSet.add(trig.id);
        this.fireTrigger(trig, currentSongTimeMs);
      }
    }

    // 2. Process running property tweens (e.g. smooth opacity/zoom transitions)
    const now = performance.now();
    for (let i = this.activeTweens.length - 1; i >= 0; i--) {
      const tween = this.activeTweens[i];
      const elapsed = (now - tween.startTime) / 1000;
      const progress = Math.min(1.0, elapsed / tween.duration);

      // Smooth Ease-Out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      tween.target[tween.property] = tween.startVal + (tween.endVal - tween.startVal) * eased;

      if (progress >= 1.0) {
        tween.target[tween.property] = tween.endVal;
        this.activeTweens.splice(i, 1);
      }
    }
  }

  fireTrigger(trig) {
    switch (trig.type) {
      case 'OPACITY': // e.g. transparent wall, disappearing prop, or HUD fade
        this.applyOpacityTrigger(trig);
        break;

      case 'CAMERA_ZOOM': // Target crosshair zoom
        this.applyCameraTrigger(trig);
        break;

      case 'FLASH': // Screen flash (red alert, white pop)
        this.applyFlashTrigger(trig);
        break;

      case 'SFX': // Knife stab, alarm siren, or "YEAH!"
        this.playSfx(trig.audioBuffer);
        break;

      case 'PAUSE': // Mid-song standoff freeze
        audioManager.pauseOffset = audioManager.getSongPositionMs();
        audioManager.stop();
        setTimeout(() => audioManager.play(audioManager.pauseOffset), trig.durationMs || 1000);
        break;
    }
  }

  applyOpacityTrigger(trig) {
    const target = trig.targetId === 'HUD' 
      ? this.engine.app.stage 
      : this.engine.app.stage.getChildByName(trig.targetId);

    if (target) {
      this.activeTweens.push({
        target,
        property: 'alpha',
        startVal: target.alpha,
        endVal: trig.value, // e.g. 0.3 for semi-transparent wall
        startTime: performance.now(),
        duration: trig.duration || 0.3
      });
    }
  }

  applyCameraTrigger(trig) {
    // Zoom in on target position
    this.activeTweens.push({
      target: this.engine.app.stage.scale,
      property: 'x',
      startVal: this.engine.app.stage.scale.x,
      endVal: trig.zoomLevel || 1.5,
      startTime: performance.now(),
      duration: trig.duration || 0.4
    });
    this.activeTweens.push({
      target: this.engine.app.stage.scale,
      property: 'y',
      startVal: this.engine.app.stage.scale.y,
      endVal: trig.zoomLevel || 1.5,
      startTime: performance.now(),
      duration: trig.duration || 0.4
    });
  }

  applyFlashTrigger(trig) {
    let overlay = this.engine.app.stage.getChildByName('__screen_flash__');
    if (!overlay) {
      overlay = new PIXI.Graphics();
      overlay.name = '__screen_flash__';
      this.engine.app.stage.addChild(overlay);
    }

    const hexColor = parseInt((trig.color || '#FFFFFF').replace('#', ''), 16);
    overlay.clear();
    overlay.beginFill(hexColor);
    overlay.drawRect(0, 0, 1280, 720);
    overlay.endFill();
    overlay.alpha = 1.0;

    this.activeTweens.push({
      target: overlay,
      property: 'alpha',
      startVal: 1.0,
      endVal: 0.0,
      startTime: performance.now(),
      duration: trig.duration || 0.3
    });
  }

  playSfx(buffer) {
    if (!buffer || !audioManager.ctx) return;
    const src = audioManager.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioManager.ctx.destination);
    src.start(0);
  }
}
