/**
 * Chart Parser
 * Supports legacy FNF, modern Psych Engine, and VS Impostor (nmv2) formats.
 */
export function parseFNFChart(rawJson) {
  const songData = rawJson.song ? rawJson.song : rawJson;

  const parsed = {
    songName: songData.song || 'Untitled',
    bpm: songData.bpm || 150,
    speed: songData.speed || 2.0,
    player1: songData.player1 || 'bf',
    player2: songData.player2 || 'dad',
    playerNotes: [],
    opponentNotes: []
  };

  if (!songData.notes || !Array.isArray(songData.notes)) {
    return parsed;
  }

  // Detect modern Psych / NMV2 format (used by VS Impostor V4 / Legacy)
  // In Psych/NMV2: 0-3 is ALWAYS Player 1, 4-7 is ALWAYS Opponent (Player 2).
  let isModernFormat = songData.format === 'nmv2' || songData.format === 'psych_v1';
  if (!isModernFormat) {
    for (const sec of songData.notes) {
      if (sec.mustHitSection === false && sec.sectionNotes) {
        if (sec.sectionNotes.some(n => Number(n[1]) >= 4)) {
          isModernFormat = true;
          break;
        }
      }
    }
  }

  // Process sections
  for (const section of songData.notes) {
    const mustHitSection = section.mustHitSection ?? true;
    if (!section.sectionNotes) continue;

    for (const note of section.sectionNotes) {
      const strumTime = Number(note[0]);
      const rawData = Number(note[1]);
      const sustainLength = Number(note[2]) || 0;
      const noteType = note[3] || '';

      const lane = rawData % 4;

      let isPlayerNote = false;
      if (isModernFormat) {
        // Modern: 0..3 = Player (BF), 4..7 = Opponent (Lime Green)
        isPlayerNote = rawData < 4;
      } else {
        // Legacy: mustHitSection swaps who hits 0..3 and 4..7
        isPlayerNote = mustHitSection ? rawData < 4 : rawData >= 4;
      }

      const noteObj = {
        strumTime,
        lane,
        sustainLength,
        noteType,
        hit: false,
        missed: false
      };

      if (isPlayerNote) {
        parsed.playerNotes.push(noteObj);
      } else {
        parsed.opponentNotes.push(noteObj);
      }
    }
  }

  // Sort notes chronologically
  parsed.playerNotes.sort((a, b) => a.strumTime - b.strumTime);
  parsed.opponentNotes.sort((a, b) => a.strumTime - b.strumTime);

  return parsed;
}
