import { createContext, useContext, useReducer, useCallback, useRef } from 'react';

const PlayerContext = createContext(null);

const REPEAT_MODES = ['off', 'all', 'one'];

const initialState = {
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  volume: 1,
  muted: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  playbackRate: 1,
  repeatMode: 'off', // 'off', 'all', 'one'
  shuffle: false,
  shuffleOrder: [],
  subtitleUrl: null,
  subtitleFileName: null,
  isVideo: false,
  isFullscreen: false,
  audioVisualization: true,
  presetCycle: true,
  presetCycleLength: 15,
  presetRandom: true,
  currentPresetName: '',
  mediaError: null,
  showTrackTitle: true,
  showPresetControls: true,
};

function playerReducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYLIST':
      return {
        ...state,
        playlist: action.payload.files,
        currentIndex: action.payload.startIndex ?? 0,
        shuffleOrder: generateShuffleOrder(action.payload.files.length),
        mediaError: null,
      };

    case 'ADD_TO_PLAYLIST': {
      // When adding files, try to resolve any existing placeholder entries
      // (from standalone M3U loading) by matching filenames.
      const incoming = action.payload;
      const resolved = state.playlist.map(item => {
        if (item.file) return item; // Already has file data
        const match = incoming.find(f => f.name === item.name);
        return match || item;
      });
      // Collect incoming files that weren't used to resolve placeholders
      const resolvedNames = new Set(resolved.filter(i => i.file).map(i => i.name));
      const extras = incoming.filter(f => !resolvedNames.has(f.name));
      const newPlaylist = [...resolved, ...extras];
      return {
        ...state,
        playlist: newPlaylist,
        currentIndex: state.currentIndex === -1 ? 0 : state.currentIndex,
        shuffleOrder: generateShuffleOrder(newPlaylist.length),
      };
    }

    case 'REMOVE_FROM_PLAYLIST': {
      const filtered = state.playlist.filter((_, i) => i !== action.payload);
      let newIndex = state.currentIndex;
      if (action.payload < state.currentIndex) newIndex--;
      else if (action.payload === state.currentIndex) newIndex = Math.min(newIndex, filtered.length - 1);
      return {
        ...state,
        playlist: filtered,
        currentIndex: filtered.length === 0 ? -1 : newIndex,
        shuffleOrder: generateShuffleOrder(filtered.length),
      };
    }

    case 'CLEAR_PLAYLIST':
      return {
        ...state,
        playlist: [],
        currentIndex: -1,
        isPlaying: false,
        subtitleUrl: null,
        subtitleFileName: null,
      };

    case 'MOVE_IN_PLAYLIST': {
      const { from, to } = action.payload;
      const items = [...state.playlist];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      let idx = state.currentIndex;
      if (idx === from) idx = to;
      else if (from < idx && to >= idx) idx--;
      else if (from > idx && to <= idx) idx++;
      return { ...state, playlist: items, currentIndex: idx };
    }

    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload, mediaError: null };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_VOLUME':
      return { ...state, volume: action.payload, muted: action.payload === 0 };

    case 'SET_MUTED':
      return { ...state, muted: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_DURATION':
      return { ...state, duration: action.payload };

    case 'SET_BUFFERED':
      return { ...state, buffered: action.payload };

    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.payload };

    case 'TOGGLE_REPEAT': {
      const idx = REPEAT_MODES.indexOf(state.repeatMode);
      return { ...state, repeatMode: REPEAT_MODES[(idx + 1) % REPEAT_MODES.length] };
    }

    case 'TOGGLE_SHUFFLE':
      return {
        ...state,
        shuffle: !state.shuffle,
        shuffleOrder: !state.shuffle ? generateShuffleOrder(state.playlist.length) : state.shuffleOrder,
      };

    case 'SET_SUBTITLE': {
      return {
        ...state,
        subtitleUrl: action.payload.url,
        subtitleFileName: action.payload.name,
      };
    }

    case 'CLEAR_SUBTITLE':
      return { ...state, subtitleUrl: null, subtitleFileName: null };

    case 'SET_IS_VIDEO':
      return { ...state, isVideo: action.payload };

    case 'SET_MEDIA_ERROR':
      return { ...state, mediaError: action.payload };

    case 'SET_FULLSCREEN':
      return { ...state, isFullscreen: action.payload };

    case 'TOGGLE_VISUALIZATION':
      return { ...state, audioVisualization: !state.audioVisualization };

    case 'SET_PRESET_NAME':
      return { ...state, currentPresetName: action.payload };

    case 'TOGGLE_PRESET_CYCLE':
      return { ...state, presetCycle: !state.presetCycle };

    case 'SET_PRESET_CYCLE_LENGTH':
      return { ...state, presetCycleLength: action.payload };

    case 'TOGGLE_PRESET_RANDOM':
      return { ...state, presetRandom: !state.presetRandom };

    case 'TOGGLE_TRACK_TITLE':
      return { ...state, showTrackTitle: !state.showTrackTitle };

    case 'TOGGLE_PRESET_CONTROLS':
      return { ...state, showPresetControls: !state.showPresetControls };

    default:
      return state;
  }
}

function generateShuffleOrder(length) {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const mediaRef = useRef(null);

  const getNextIndex = useCallback((direction = 1) => {
    const { playlist, currentIndex, repeatMode, shuffle, shuffleOrder } = state;
    if (playlist.length === 0) return -1;

    if (repeatMode === 'one') return currentIndex;

    if (shuffle) {
      const currentShufflePos = shuffleOrder.indexOf(currentIndex);
      let nextShufflePos = currentShufflePos + direction;
      if (nextShufflePos >= shuffleOrder.length) {
        return repeatMode === 'all' ? shuffleOrder[0] : -1;
      }
      if (nextShufflePos < 0) {
        return repeatMode === 'all' ? shuffleOrder[shuffleOrder.length - 1] : shuffleOrder[0];
      }
      return shuffleOrder[nextShufflePos];
    }

    let nextIndex = currentIndex + direction;
    if (nextIndex >= playlist.length) {
      return repeatMode === 'all' ? 0 : -1;
    }
    if (nextIndex < 0) {
      return repeatMode === 'all' ? playlist.length - 1 : 0;
    }
    return nextIndex;
  }, [state]);

  return (
    <PlayerContext.Provider value={{ state, dispatch, mediaRef, getNextIndex }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
}
