import { useState, useCallback } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import FileOpener from './components/FileOpener';
import Toolbar from './components/Toolbar';
import VideoViewport from './components/VideoViewport';
import Controls from './components/Controls';
import Playlist from './components/Playlist';
import MediaEngine from './components/MediaEngine';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMediaSession } from './hooks/useMediaSession';
import './App.css';

function AppInner() {
  const [showPlaylist, setShowPlaylist] = useState(true);

  useKeyboardShortcuts();
  useMediaSession();

  const togglePlaylist = useCallback(() => {
    setShowPlaylist(prev => !prev);
  }, []);

  return (
    <FileOpener>
      {({ openFiles, openDirectory, addFiles }) => (
        <div className="app-layout">
          <Toolbar
            onOpenFiles={openFiles}
            onOpenDirectory={openDirectory}
            onAddFiles={addFiles}
            showPlaylist={showPlaylist}
            onTogglePlaylist={togglePlaylist}
          />
          <div className="app-main">
            <div className="app-player">
              <VideoViewport />
              <Controls />
            </div>
            {showPlaylist && <Playlist onAddFiles={addFiles} />}
          </div>
          <MediaEngine />
        </div>
      )}
    </FileOpener>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppInner />
    </PlayerProvider>
  );
}
