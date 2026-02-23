// Supported media formats
export const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus', 'webm', 'aiff',
]);

export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'ogv', 'mkv', 'avi', 'mov', 'm4v', '3gp',
]);

export const SUBTITLE_EXTENSIONS = new Set([
  'srt', 'vtt', 'sub', 'ass', 'ssa',
]);

export const PLAYLIST_EXTENSIONS = new Set([
  'm3u', 'm3u8', 'pls',
]);

export function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function isAudio(filename) {
  return AUDIO_EXTENSIONS.has(getExtension(filename));
}

export function isVideo(filename) {
  return VIDEO_EXTENSIONS.has(getExtension(filename));
}

export function isMedia(filename) {
  return isAudio(filename) || isVideo(filename);
}

export function isSubtitle(filename) {
  return SUBTITLE_EXTENSIONS.has(getExtension(filename));
}

export function isPlaylist(filename) {
  return PLAYLIST_EXTENSIONS.has(getExtension(filename));
}

export function getMediaType(filename) {
  if (isVideo(filename)) return 'video';
  if (isAudio(filename)) return 'audio';
  return 'unknown';
}

// Map file extensions to MIME types for better browser codec negotiation
const MIME_TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  '3gp': 'video/3gpp',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  wma: 'audio/x-ms-wma',
  opus: 'audio/opus',
  aiff: 'audio/aiff',
};

export function getMimeType(filename) {
  return MIME_TYPES[getExtension(filename)] || '';
}

/**
 * Create a blob URL with the correct MIME type for the given file.
 * Some browsers/OS combos set an empty or incorrect MIME type on the File
 * object (common for .mov, .mkv, .avi, .m4v). Re-wrapping in a Blob with
 * the right type lets the browser's media stack identify the container.
 */
export function createMediaObjectURL(file, filename) {
  if (file.type) return URL.createObjectURL(file);
  const mime = getMimeType(filename);
  if (mime) {
    return URL.createObjectURL(new Blob([file], { type: mime }));
  }
  return URL.createObjectURL(file);
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Parse SRT subtitle format to VTT cues
export function parseSRT(text) {
  const cues = [];
  const blocks = text.trim().replace(/\r\n/g, '\n').split('\n\n');

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;

    // Find the timing line
    let timingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timingIdx = i;
        break;
      }
    }
    if (timingIdx === -1) continue;

    const timeParts = lines[timingIdx].split('-->').map(s => s.trim());
    if (timeParts.length !== 2) continue;

    const startTime = parseSRTTime(timeParts[0]);
    const endTime = parseSRTTime(timeParts[1]);
    const content = lines.slice(timingIdx + 1).join('\n').trim();

    if (startTime !== null && endTime !== null && content) {
      cues.push({ startTime, endTime, text: content });
    }
  }
  return cues;
}

function parseSRTTime(timeStr) {
  // Format: HH:MM:SS,mmm or HH:MM:SS.mmm
  const match = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return null;
  return (
    parseInt(match[1]) * 3600 +
    parseInt(match[2]) * 60 +
    parseInt(match[3]) +
    parseInt(match[4]) / 1000
  );
}

// Convert SRT text to a Blob URL for a VTT track
export function srtToVttBlob(srtText) {
  const cues = parseSRT(srtText);
  let vtt = 'WEBVTT\n\n';
  for (const cue of cues) {
    const start = formatVTTTime(cue.startTime);
    const end = formatVTTTime(cue.endTime);
    vtt += `${start} --> ${end}\n${cue.text}\n\n`;
  }
  return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
}

function formatVTTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// Parse ASS/SSA subtitle format
export function parseASS(text) {
  const cues = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let inEvents = false;
  let formatFields = [];

  for (const line of lines) {
    if (line.trim() === '[Events]') {
      inEvents = true;
      continue;
    }
    if (line.trim().startsWith('[') && line.trim() !== '[Events]') {
      inEvents = false;
      continue;
    }

    if (inEvents && line.startsWith('Format:')) {
      formatFields = line.substring(7).split(',').map(f => f.trim().toLowerCase());
      continue;
    }

    if (inEvents && line.startsWith('Dialogue:')) {
      const values = line.substring(9).split(',');
      const startIdx = formatFields.indexOf('start');
      const endIdx = formatFields.indexOf('end');
      const textIdx = formatFields.indexOf('text');

      if (startIdx >= 0 && endIdx >= 0 && textIdx >= 0) {
        const startTime = parseASSTime(values[startIdx]?.trim());
        const endTime = parseASSTime(values[endIdx]?.trim());
        // Text field may contain commas, so join remaining fields
        const content = values.slice(textIdx).join(',').trim()
          .replace(/\{[^}]*\}/g, '') // Remove ASS style tags
          .replace(/\\N/g, '\n')     // Convert \N to newlines
          .replace(/\\n/g, '\n');

        if (startTime !== null && endTime !== null && content) {
          cues.push({ startTime, endTime, text: content });
        }
      }
    }
  }
  return cues;
}

function parseASSTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/);
  if (!match) return null;
  return (
    parseInt(match[1]) * 3600 +
    parseInt(match[2]) * 60 +
    parseInt(match[3]) +
    parseInt(match[4]) / 100
  );
}

export function assToVttBlob(assText) {
  const cues = parseASS(assText);
  let vtt = 'WEBVTT\n\n';
  for (const cue of cues) {
    const start = formatVTTTime(cue.startTime);
    const end = formatVTTTime(cue.endTime);
    vtt += `${start} --> ${end}\n${cue.text}\n\n`;
  }
  return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
}

// Generate a valid M3U playlist from a list of playlist entries
export function generateM3U(playlist) {
  let m3u = '#EXTM3U\n';
  for (const item of playlist) {
    const title = item.name || 'Unknown';
    m3u += `#EXTINF:-1,${title}\n`;
    m3u += `${item.name}\n`;
  }
  return m3u;
}

// Trigger a download of the current playlist as an M3U file
export function savePlaylistAsM3U(playlist) {
  if (!playlist || playlist.length === 0) return;
  const content = generateM3U(playlist);
  const blob = new Blob([content], { type: 'audio/x-mpegurl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'playlist.m3u';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parse M3U/M3U8 playlist files - returns array of filenames
export function parseM3U(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const entries = [];
  let nextTitle = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '#EXTM3U') continue;
    if (trimmed.startsWith('#EXTINF:')) {
      const commaIdx = trimmed.indexOf(',');
      nextTitle = commaIdx >= 0 ? trimmed.substring(commaIdx + 1).trim() : '';
      continue;
    }
    if (trimmed.startsWith('#')) continue;
    entries.push({ path: trimmed, title: nextTitle || trimmed });
    nextTitle = '';
  }
  return entries;
}

// Parse PLS playlist files
export function parsePLS(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const entries = {};

  for (const line of lines) {
    const match = line.match(/^(File|Title)(\d+)=(.+)/i);
    if (match) {
      const type = match[1].toLowerCase();
      const num = match[2];
      const val = match[3].trim();
      if (!entries[num]) entries[num] = {};
      entries[num][type] = val;
    }
  }

  return Object.values(entries)
    .filter(e => e.file)
    .map(e => ({ path: e.file, title: e.title || e.file }));
}
