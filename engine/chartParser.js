/**
 * Chart Parser
 * Supports both base FNF and Psych Engine song JSON formats.
 */
export function parseFNFChart(rawJson) {
  const songData = rawJson.song ? rawJson.song : rawJson;

  const parsed = {
    songName: songData.song || 'Untitled',
    bpm: songData.bpm || 100,
    speed: songData.speed || 1.0,
    playerNotes: [],
    opponentNotes: []
  };

  if (!songData.notes || !Array.isArray(songData.notes)) {
    return parsed;
  }

  // Loop through all sections in the chart
  for (const section of songData.notes) {
    const mustHitSection = section.mustHitSection ?? true;

    if (!section.sectionNotes) continue;

    for (const note of section.sectionNotes) {
      const strumTime = Number(note[0]);
      const rawData = Number(note[1]);
      const sustainLength = Number(note[2]) || 0;
      const noteType = note[3] || '';

      // Lane mapping (0-3: Left, Down, Up, Right)
      const lane = rawData % 4;

      // Determine who hits the note based on section focus
      const isPlayerNote = mustHitSection ? rawData < 4 : rawData >= 4;

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

  // Sort notes sequentially by timestamp
  parsed.playerNotes.sort((a, b) => a.strumTime - b.strumTime);
  parsed.opponentNotes.sort((a, b) => a.strumTime - b.strumTime);

  return parsed;
}
