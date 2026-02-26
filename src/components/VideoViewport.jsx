import { useEffect, useRef, useCallback, useState } from 'react';
import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import customPresets from '../../custom-presets';
import { usePlayer } from '../context/PlayerContext';
import styles from './VideoViewport.module.css';

function getPresets() {
  const presets = { ...customPresets, ...butterchurnPresets };
  const keys = Object.keys(presets).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const sorted = {};
  for (const k of keys) sorted[k] = presets[k];
  return sorted;
}

const allPresets = getPresets();
const presetKeys = Object.keys(allPresets);

export default function VideoViewport() {
  const { state, dispatch, mediaRef } = usePlayer();
  const { isVideo, isPlaying, playlist, currentIndex, mediaError, subtitleUrl } = state;
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const visualizerRef = useRef(null);
  const presetIndexRef = useRef(-1);
  const presetIndexHistRef = useRef([]);
  const cycleIntervalRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const [showPresetSelect, setShowPresetSelect] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState('');
  const hideTimerRef = useRef(null);

  const currentFile = playlist[currentIndex];

  // Fullscreen change handler
  useEffect(() => {
    function handleFullscreenChange() {
      dispatch({ type: 'SET_FULLSCREEN', payload: !!document.fullscreenElement });
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [dispatch]);

  const loadPreset = useCallback((index, blendTime = 5.7) => {
    if (!visualizerRef.current || index < 0 || index >= presetKeys.length) return;
    presetIndexRef.current = index;
    const key = presetKeys[index];
    try {
      visualizerRef.current.loadPreset(allPresets[key], blendTime);
    } catch {
      // Some presets may fail to load; skip silently
      return;
    }
    dispatch({ type: 'SET_PRESET_NAME', payload: key });
  }, [dispatch]);

  const nextPreset = useCallback((blendTime = 5.7) => {
    presetIndexHistRef.current.push(presetIndexRef.current);
    let next;
    if (state.presetRandom) {
      next = Math.floor(Math.random() * presetKeys.length);
    } else {
      next = (presetIndexRef.current + 1) % presetKeys.length;
    }
    loadPreset(next, blendTime);
  }, [state.presetRandom, loadPreset]);

  const prevPreset = useCallback((blendTime = 5.7) => {
    let prev;
    if (presetIndexHistRef.current.length > 0) {
      prev = presetIndexHistRef.current.pop();
    } else {
      prev = ((presetIndexRef.current - 1) + presetKeys.length) % presetKeys.length;
    }
    loadPreset(prev, blendTime);
  }, [loadPreset]);

  // Preset cycling
  useEffect(() => {
    if (cycleIntervalRef.current) {
      clearInterval(cycleIntervalRef.current);
      cycleIntervalRef.current = null;
    }

    if (state.presetCycle && state.audioVisualization && !isVideo) {
      cycleIntervalRef.current = setInterval(() => nextPreset(2.7), state.presetCycleLength * 1000);
    }

    return () => {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
      }
    };
  }, [state.presetCycle, state.presetCycleLength, state.audioVisualization, isVideo, nextPreset]);

  // Keyboard shortcuts for preset navigation
  useEffect(() => {
    if (isVideo || !state.audioVisualization) return;

    function handleKeyDown(e) {
      if (e.key === 'ArrowRight' && e.shiftKey) {
        nextPreset();
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        prevPreset();
      } else if (e.key === 'h' || e.key === 'H') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          nextPreset(0);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVideo, state.audioVisualization, nextPreset, prevPreset]);

  // Butterchurn visualization
  useEffect(() => {
    if (isVideo || !state.audioVisualization) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const media = mediaRef.current;
    const canvas = canvasRef.current;
    if (!media || !canvas || !currentFile) return;

    // Setup audio context
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return;
      }
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (!sourceRef.current) {
      try {
        sourceRef.current = ctx.createMediaElementSource(media);
        sourceRef.current.connect(ctx.destination);
      } catch {
        // Already connected
      }
    }

    // Recreate butterchurn visualizer on every track change to reset
    // internal WASM state and prevent "float unrepresentable" crashes
    try {
      visualizerRef.current = butterchurn.createVisualizer(ctx, canvas, {
        width: canvas.width || 800,
        height: canvas.height || 600,
        pixelRatio: window.devicePixelRatio || 1,
        textureRatio: 1,
      });
      visualizerRef.current.connectAudio(sourceRef.current);
      const initialIndex = presetIndexRef.current >= 0
        ? presetIndexRef.current
        : Math.floor(Math.random() * presetKeys.length);
      loadPreset(initialIndex, 0);
    } catch {
      return;
    }

    let cancelled = false;

    function render() {
      if (cancelled) return;
      animFrameRef.current = requestAnimationFrame(render);
      try {
        visualizerRef.current.render();
      } catch {
        // Butterchurn can throw "float unrepresentable in integer range"
        // from WASM during certain presets or audio transitions.
        // Recover by loading a new preset with no blend.
        try {
          const safeIndex = (presetIndexRef.current + 1) % presetKeys.length;
          loadPreset(safeIndex, 0);
        } catch {
          // If recovery also fails, stop rendering
          cancelled = true;
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isVideo, state.audioVisualization, currentFile, mediaRef, loadPreset]);

  // Resize canvas and update visualizer dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        if (visualizerRef.current) {
          visualizerRef.current.setRendererSize(container.clientWidth, container.clientHeight);
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isVideo]);

  // Listen for subtitle cue changes on the audio element
  useEffect(() => {
    if (isVideo || !subtitleUrl) {
      return () => setActiveSubtitle('');
    }

    const media = mediaRef.current;
    if (!media) {
      return () => setActiveSubtitle('');
    }

    function findSubtitleTrack() {
      for (let i = 0; i < media.textTracks.length; i++) {
        if (media.textTracks[i].kind === 'subtitles') return media.textTracks[i];
      }
      return null;
    }

    function handleCueChange() {
      const track = findSubtitleTrack();
      if (track && track.activeCues && track.activeCues.length > 0) {
        const texts = Array.from(track.activeCues).map(cue => cue.text);
        setActiveSubtitle(texts.join('\n'));
      } else {
        setActiveSubtitle('');
      }
    }

    // Wait for the text track to be available
    function attachTrackListener() {
      const track = findSubtitleTrack();
      if (track) {
        track.mode = 'hidden'; // hidden so we render manually, but cues still fire
        track.addEventListener('cuechange', handleCueChange);
        return () => track.removeEventListener('cuechange', handleCueChange);
      }
      return undefined;
    }

    let cleanup = attachTrackListener();

    // If track isn't loaded yet, listen for addtrack event
    function handleAddTrack() {
      if (cleanup) cleanup();
      cleanup = attachTrackListener();
    }

    media.textTracks.addEventListener('addtrack', handleAddTrack);

    return () => {
      if (cleanup) cleanup();
      media.textTracks.removeEventListener('addtrack', handleAddTrack);
      setActiveSubtitle('');
    };
  }, [isVideo, subtitleUrl, mediaRef, currentIndex]);

  // Handle mouse movement for auto-hiding controls in video mode
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isVideo && isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isVideo, isPlaying]);

  const handleDoubleClick = useCallback(() => {
    if (!isVideo) return;
    const container = containerRef.current;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (container) {
      container.requestFullscreen();
    }
  }, [isVideo]);

  const handleClick = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (isPlaying) media.pause();
    else media.play();
  }, [isPlaying, mediaRef]);

  if (!currentFile) {
    return (
      <div className={styles.viewport}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <h2>WebVLC</h2>
          <p>Drop media files here or use the menu to open files</p>
          <div className={styles.shortcuts}>
            <span>Drag & drop files or folders</span>
            <span>Supports MP4, WebM, MP3, FLAC, OGG, and more</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.viewport} player-viewport`}
      onMouseMove={handleMouseMove}
      style={{ cursor: isVideo && !showControls ? 'none' : 'default' }}
    >
      {isVideo ? (
        <video
          ref={mediaRef}
          className={styles.video}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          playsInline
          crossOrigin="anonymous"
        />
      ) : (
        <div className={styles.audioContainer} onClick={handleClick}>
          <canvas ref={canvasRef} className={styles.visualizer} />
          {state.showTrackTitle && (
            <div className={styles.audioOverlay}>
              <div className={styles.audioTitle}>{currentFile.name}</div>
            </div>
          )}
          {state.audioVisualization && state.showPresetControls && (
            <div className={styles.presetControls} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.presetNavBtn}
                onClick={prevPreset}
                title="Previous preset (Shift+←)"
              >◀</button>
              <button
                className={styles.presetToggle}
                onClick={() => setShowPresetSelect(!showPresetSelect)}
                title="Select preset"
              >
                {state.currentPresetName || 'Select Preset'}
              </button>
              <button
                className={styles.presetNavBtn}
                onClick={() => nextPreset()}
                title="Next preset (Shift+→)"
              >▶</button>
              {showPresetSelect && (
                <div className={styles.presetDropdown}>
                  <div className={styles.presetDropdownHeader}>
                    <span>Presets ({presetKeys.length})</span>
                    <button onClick={() => setShowPresetSelect(false)}>✕</button>
                  </div>
                  <div className={styles.presetList}>
                    {presetKeys.map((key, i) => (
                      <button
                        key={key}
                        className={`${styles.presetItem} ${key === state.currentPresetName ? styles.presetItemActive : ''}`}
                        onClick={() => {
                          presetIndexHistRef.current.push(presetIndexRef.current);
                          loadPreset(i, 5.7);
                          setShowPresetSelect(false);
                        }}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeSubtitle && (
            <div className={styles.subtitleOverlay}>
              <span className={styles.subtitleText}>{activeSubtitle}</span>
            </div>
          )}
          <audio ref={mediaRef} crossOrigin="anonymous" />
        </div>
      )}
      {mediaError && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorMessage}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{mediaError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
