import { useCallback, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  isMedia, isSubtitle, isPlaylist, getExtension,
  parseM3U, parsePLS, srtToVttBlob, assToVttBlob,
} from '../utils/fileUtils';

export default function FileOpener({ children }) {
  const { state, dispatch } = usePlayer();
  const fileInputRef = useRef(null);
  const dirInputRef = useRef(null);
  const playlistRef = useRef(state.playlist);
  playlistRef.current = state.playlist;

  const processFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);
    const mediaFiles = [];
    const subtitleFiles = [];
    const playlistFiles = [];

    for (const file of files) {
      if (isMedia(file.name)) {
        mediaFiles.push({ file, name: file.name, size: file.size });
      } else if (isSubtitle(file.name)) {
        subtitleFiles.push(file);
      } else if (isPlaylist(file.name)) {
        playlistFiles.push(file);
      }
    }

    // Handle playlist files - try to match entries with provided files
    if (playlistFiles.length > 0 && mediaFiles.length > 0) {
      for (const plFile of playlistFiles) {
        const text = await plFile.text();
        const ext = getExtension(plFile.name);
        const entries = ext === 'pls' ? parsePLS(text) : parseM3U(text);

        // Try to reorder mediaFiles based on playlist order
        const orderedFiles = [];
        for (const entry of entries) {
          const entryName = entry.path.split('/').pop().split('\\').pop();
          const match = mediaFiles.find(mf =>
            mf.name === entryName || mf.name.includes(entryName) || entryName.includes(mf.name)
          );
          if (match && !orderedFiles.includes(match)) {
            orderedFiles.push(match);
          }
        }
        // Add any remaining files not in the playlist
        for (const mf of mediaFiles) {
          if (!orderedFiles.includes(mf)) {
            orderedFiles.push(mf);
          }
        }
        if (orderedFiles.length > 0) {
          dispatch({ type: 'SET_PLAYLIST', payload: { files: orderedFiles, startIndex: 0 } });
          break; // Only use first playlist file
        }
      }
    } else if (playlistFiles.length > 0) {
      // Standalone playlist file opened without media files — populate the
      // playlist with entry names. The user can then add the actual media
      // files via drag & drop, Open Directory, or Add to Playlist, and they
      // will be automatically matched to the playlist entries.
      const plFile = playlistFiles[0];
      const text = await plFile.text();
      const ext = getExtension(plFile.name);
      const entries = ext === 'pls' ? parsePLS(text) : parseM3U(text);

      if (entries.length > 0) {
        const playlistEntries = entries.map(entry => ({
          file: null,
          name: entry.path.split('/').pop().split('\\').pop(),
          size: 0,
        }));
        dispatch({ type: 'SET_PLAYLIST', payload: { files: playlistEntries, startIndex: 0 } });
      }
    } else if (mediaFiles.length > 0) {
      // Check if the current playlist has unresolved entries (from M3U loading)
      const hasUnresolved = playlistRef.current.some(item => !item.file);
      if (hasUnresolved) {
        // Use ADD_TO_PLAYLIST which resolves placeholder entries by filename
        dispatch({ type: 'ADD_TO_PLAYLIST', payload: mediaFiles });
      } else {
        // Sort by name for a natural order
        mediaFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        dispatch({ type: 'SET_PLAYLIST', payload: { files: mediaFiles, startIndex: 0 } });
      }
    }

    // Handle subtitle files
    if (subtitleFiles.length > 0) {
      const subFile = subtitleFiles[0]; // Use the first subtitle
      const text = await subFile.text();
      const ext = getExtension(subFile.name);
      let url;
      if (ext === 'vtt') {
        url = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
      } else if (ext === 'ass' || ext === 'ssa') {
        url = assToVttBlob(text);
      } else {
        url = srtToVttBlob(text);
      }
      dispatch({ type: 'SET_SUBTITLE', payload: { url, name: subFile.name } });
    }
  }, [dispatch]);

  const openFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openDirectory = useCallback(() => {
    dirInputRef.current?.click();
  }, []);

  const addFiles = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,video/*,.srt,.vtt,.ass,.ssa,.sub,.m3u,.m3u8,.pls,.mkv,.flac,.ogg,.opus,.mov,.m4v,.avi,.3gp,.aac,.aiff,.wma';
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      const mediaFiles = files.filter(f => isMedia(f.name))
        .map(f => ({ file: f, name: f.name, size: f.size }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      if (mediaFiles.length > 0) {
        dispatch({ type: 'ADD_TO_PLAYLIST', payload: mediaFiles });
      }
      // Also handle subtitles from the added files
      const subFiles = files.filter(f => isSubtitle(f.name));
      if (subFiles.length > 0) {
        subFiles[0].text().then(text => {
          const ext = getExtension(subFiles[0].name);
          let url;
          if (ext === 'vtt') {
            url = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
          } else if (ext === 'ass' || ext === 'ssa') {
            url = assToVttBlob(text);
          } else {
            url = srtToVttBlob(text);
          }
          dispatch({ type: 'SET_SUBTITLE', payload: { url, name: subFiles[0].name } });
        });
      }
    };
    input.click();
  }, [dispatch]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{ height: '100%', width: '100%' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.srt,.vtt,.ass,.ssa,.sub,.m3u,.m3u8,.pls,.mkv,.flac,.ogg,.opus,.mov,.m4v,.avi,.3gp,.aac,.aiff,.wma"
        style={{ display: 'none' }}
        onChange={(e) => processFiles(e.target.files)}
      />
      <input
        ref={dirInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={(e) => processFiles(e.target.files)}
      />
      {typeof children === 'function'
        ? children({ openFiles, openDirectory, addFiles })
        : children}
    </div>
  );
}
