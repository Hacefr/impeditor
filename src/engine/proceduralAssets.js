/**
 * Procedural Asset Generator
 * Generates all base note textures and synthesized sound effects via pure code.
 */

// Standard FNF note colors: Left (Purple), Down (Cyan), Up (Green), Right (Red)
export const NOTE_COLORS = ['#C24B99', '#00FFFF', '#12FA05', '#F9393F'];
export const NOTE_DIRECTIONS = ['left', 'down', 'up', 'right'];

/**
 * Draws an arrow path onto an HTML5 2D Canvas context.
 */
function drawArrowPath(ctx, cx, cy, size, angleRad, fillColor, strokeColor) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);

  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, -s);           // Tip
  ctx.lineTo(s * 0.9, s * 0.2); // Right wing tip
  ctx.lineTo(s * 0.45, s * 0.2);// Right indent
  ctx.lineTo(s * 0.45, s * 0.9);// Bottom right
  ctx.lineTo(-s * 0.45, s * 0.9);// Bottom left
  ctx.lineTo(-s * 0.45, s * 0.2);// Left indent
  ctx.lineTo(-s * 0.9, s * 0.2);// Left wing tip
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (strokeColor) {
    ctx.lineWidth = size * 0.08;
    ctx.strokeStyle = strokeColor;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Generates base PixiJS textures for receptors and falling notes.
 */
export function generateProceduralTextures() {
  const size = 128; // High-res texture canvas
  const angles = [-Math.PI / 2, 0, Math.PI, Math.PI / 2]; // Left, Down, Up, Right

  const receptors = [];
  const notes = [];

  for (let i = 0; i < 4; i++) {
    // 1. Generate Receptor Texture (Gray Outline)
    const recCanvas = document.createElement('canvas');
    recCanvas.width = size;
    recCanvas.height = size;
    const recCtx = recCanvas.getContext('2d');
    drawArrowPath(recCtx, size / 2, size / 2, size * 0.75, angles[i], 'rgba(0, 0, 0, 0.4)', '#888888');
    receptors.push(PIXI.Texture.from(recCanvas));

    // 2. Generate Falling Note Texture (Colored with Dark Border)
    const noteCanvas = document.createElement('canvas');
    noteCanvas.width = size;
    noteCanvas.height = size;
    const noteCtx = noteCanvas.getContext('2d');
    drawArrowPath(noteCtx, size / 2, size / 2, size * 0.75, angles[i], NOTE_COLORS[i], '#111111');
    notes.push(PIXI.Texture.from(noteCanvas));
  }

  return { receptors, notes };
}

/**
 * Synthesizes a crisp rhythm hitsound (tick) out of pure math using Web Audio API.
 * No .mp3 or .wav required!
 */
export function playSynthesizedHitsound(audioCtx) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  // Rapid pitch drop creates a sharp percussion "woodblock/tick" click
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.04);

  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.04);
}
