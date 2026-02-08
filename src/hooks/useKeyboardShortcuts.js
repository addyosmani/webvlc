import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

export function useKeyboardShortcuts() {
  const { state, dispatch, mediaRef, getNextIndex } = usePlayer();

  useEffect(() => {
    function handleKeyDown(e) {
      // Don't handle if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const media = mediaRef.current;
      if (!media && !['o', 'O'].includes(e.key)) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (state.isPlaying) media.pause();
          else media.play();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            media.currentTime = Math.max(0, media.currentTime - 3);
          } else {
            media.currentTime = Math.max(0, media.currentTime - 10);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            media.currentTime = Math.min(media.duration, media.currentTime + 3);
          } else {
            media.currentTime = Math.min(media.duration, media.currentTime + 10);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          dispatch({ type: 'SET_VOLUME', payload: Math.min(1, state.volume + 0.05) });
          break;

        case 'ArrowDown':
          e.preventDefault();
          dispatch({ type: 'SET_VOLUME', payload: Math.max(0, state.volume - 0.05) });
          break;

        case 'm':
        case 'M':
          dispatch({ type: 'SET_MUTED', payload: !state.muted });
          break;

        case 'f':
        case 'F':
          if (state.isVideo) {
            e.preventDefault();
            const container = document.querySelector('.player-viewport');
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else if (container) {
              container.requestFullscreen();
            }
          }
          break;

        case 'n':
        case 'N': {
          e.preventDefault();
          const next = getNextIndex(1);
          if (next >= 0) dispatch({ type: 'SET_CURRENT_INDEX', payload: next });
          break;
        }

        case 'p':
        case 'P': {
          e.preventDefault();
          const prev = getNextIndex(-1);
          if (prev >= 0) dispatch({ type: 'SET_CURRENT_INDEX', payload: prev });
          break;
        }

        case 'l':
        case 'L':
          dispatch({ type: 'TOGGLE_REPEAT' });
          break;

        case 's':
        case 'S':
          if (!e.ctrlKey && !e.metaKey) {
            dispatch({ type: 'TOGGLE_SHUFFLE' });
          }
          break;

        case '[':
          dispatch({
            type: 'SET_PLAYBACK_RATE',
            payload: Math.max(0.25, state.playbackRate - 0.25),
          });
          break;

        case ']':
          dispatch({
            type: 'SET_PLAYBACK_RATE',
            payload: Math.min(4, state.playbackRate + 0.25),
          });
          break;

        case '=':
          dispatch({ type: 'SET_PLAYBACK_RATE', payload: 1 });
          break;

        case 'Home':
          e.preventDefault();
          if (media) media.currentTime = 0;
          break;

        case 'End':
          e.preventDefault();
          if (media) media.currentTime = media.duration;
          break;

        default:
          // Number keys 0-9 for seeking to percentage
          if (e.key >= '0' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (media && media.duration) {
              media.currentTime = (parseInt(e.key) / 10) * media.duration;
            }
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, dispatch, mediaRef, getNextIndex]);
}
