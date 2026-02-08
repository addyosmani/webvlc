import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

// Integrate with the browser's Media Session API for OS-level media controls
export function useMediaSession() {
  const { state, dispatch, mediaRef, getNextIndex } = usePlayer();
  const { playlist, currentIndex, isPlaying } = state;

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const currentFile = playlist[currentIndex];
    if (!currentFile) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentFile.name,
      artist: 'WebVLC',
      album: 'Local Media',
    });
  }, [playlist, currentIndex]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers = {
      play: () => mediaRef.current?.play(),
      pause: () => mediaRef.current?.pause(),
      previoustrack: () => {
        const prevIndex = getNextIndex(-1);
        if (prevIndex >= 0) dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex });
      },
      nexttrack: () => {
        const nextIndex = getNextIndex(1);
        if (nextIndex >= 0) dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
      },
      seekto: (details) => {
        if (mediaRef.current && details.seekTime != null) {
          mediaRef.current.currentTime = details.seekTime;
        }
      },
      seekbackward: (details) => {
        if (mediaRef.current) {
          mediaRef.current.currentTime = Math.max(0, mediaRef.current.currentTime - (details.seekOffset || 10));
        }
      },
      seekforward: (details) => {
        if (mediaRef.current) {
          mediaRef.current.currentTime = Math.min(
            mediaRef.current.duration,
            mediaRef.current.currentTime + (details.seekOffset || 10)
          );
        }
      },
    };

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some handlers may not be supported
      }
    }

    return () => {
      for (const action of Object.keys(handlers)) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore
        }
      }
    };
  }, [dispatch, mediaRef, getNextIndex]);
}
