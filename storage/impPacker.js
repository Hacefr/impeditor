/**
 * .IMP File Packer & Unpacker
 * Uses JSZip under the hood to bundle full playable tracksets into one file.
 */
export class ImpPacker {

  /**
   * Bundles a song object into a downloadable .imp file.
   */
  static async exportToImp(songData) {
    if (!window.JSZip) {
      throw new Error('JSZip library not found.');
    }

    const zip = new window.JSZip();

    // 1. Write the manifest (Metadata, Stage config, Triggers, Fork lineage)
    const manifest = {
      title: songData.title || 'Untitled',
      author: songData.author || 'Anonymous',
      version: '1.0',
      speed: songData.speed || 2.0,
      bpm: songData.bpm || 120,
      lineage: songData.lineage || {
        isFork: false,
        originalAuthor: songData.author || 'Anonymous',
        allowRemixesWithoutCredit: false
      },
      stage: songData.stage || {
        zoom: 1.0,
        playerPos: [760, 450],
        opponentPos: [200, 450],
        layers: []
      },
      triggers: songData.triggers || []
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 2. Add Charts (JSON)
    if (songData.charts) {
      const chartFolder = zip.folder('chart');
      for (const [diff, chartJson] of Object.entries(songData.charts)) {
        chartFolder.file(`${diff}.json`, JSON.stringify(chartJson));
      }
    }

    // 3. Add Audio Stems (Inst and optional Voices)
    const audioFolder = zip.folder('audio');
    if (songData.instBlob) {
      audioFolder.file('inst.ogg', songData.instBlob);
    }
    if (songData.voicesBlob) {
      audioFolder.file('voices.ogg', songData.voicesBlob);
    }

    // 4. Add Custom Icon & Banner (if present)
    if (songData.iconBlob) {
      zip.file('icon.png', songData.iconBlob);
    }
    if (songData.bannerBlob) {
      zip.file('banner.png', songData.bannerBlob);
    }

    // 5. Generate and download .imp
    const blob = await zip.generateAsync({ type: 'blob' });
    const fileName = `${manifest.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.imp`;

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = fileName;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  }

  /**
   * Unpacks a dropped .imp file into usable memory.
   */
  static async importFromImp(file) {
    if (!window.JSZip) {
      throw new Error('JSZip library not found.');
    }

    const zip = await window.JSZip.loadAsync(file);

    // 1. Read Manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid .imp file: manifest.json is missing.');
    }
    const manifest = JSON.parse(await manifestFile.async('text'));

    // 2. Read Audio Blobs
    let instBlob = null;
    let voicesBlob = null;

    const instEntry = zip.file('audio/inst.ogg');
    if (instEntry) {
      instBlob = await instEntry.async('blob');
    }

    const voicesEntry = zip.file('audio/voices.ogg');
    if (voicesEntry) {
      voicesBlob = await voicesEntry.async('blob');
    }

    // 3. Read Charts
    const charts = {};
    const chartFolder = zip.folder('chart');
    if (chartFolder) {
      const chartFiles = chartFolder.file(/.json$/);
      for (const cf of chartFiles) {
        const diffName = cf.name.replace('chart/', '').replace('.json', '');
        charts[diffName] = JSON.parse(await cf.async('text'));
      }
    }

    // 4. Read Graphics
    let iconBlob = null;
    let bannerBlob = null;

    const iconEntry = zip.file('icon.png');
    if (iconEntry) iconBlob = await iconEntry.async('blob');

    const bannerEntry = zip.file('banner.png');
    if (bannerEntry) bannerBlob = await bannerEntry.async('blob');

    return {
      id: 'song_' + Date.now(),
      title: manifest.title,
      author: manifest.author,
      speed: manifest.speed,
      bpm: manifest.bpm,
      lineage: manifest.lineage,
      stage: manifest.stage,
      triggers: manifest.triggers,
      charts,
      instBlob,
      voicesBlob,
      iconBlob,
      bannerBlob
    };
  }
}
