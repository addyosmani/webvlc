import { useCallback, useRef, useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/fileUtils';
import styles from './Controls.module.css';

export default function Controls() {
  const { state, dispatch, mediaRef, getNextIndex } = usePlayer();
  const {
    isPlaying, volume, muted, currentTime, duration, buffered,
    playbackRate, repeatMode, shuffle, playlist, currentIndex,
    isVideo, subtitleFileName,
  } = state;
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const currentFile = playlist[currentIndex];

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (isPlaying) media.pause();
    else media.play();
  }, [isPlaying, mediaRef]);

  const stop = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.pause();
    media.currentTime = 0;
    dispatch({ type: 'SET_PLAYING', payload: false });
  }, [dispatch, mediaRef]);

  const skipPrev = useCallback(() => {
    const media = mediaRef.current;
    // If more than 3 seconds in, restart current track
    if (media && media.currentTime > 3) {
      media.currentTime = 0;
      return;
    }
    const prev = getNextIndex(-1);
    if (prev >= 0) dispatch({ type: 'SET_CURRENT_INDEX', payload: prev });
  }, [dispatch, getNextIndex, mediaRef]);

  const skipNext = useCallback(() => {
    const next = getNextIndex(1);
    if (next >= 0) dispatch({ type: 'SET_CURRENT_INDEX', payload: next });
  }, [dispatch, getNextIndex]);

  // Progress bar seeking
  const handleProgressInteraction = useCallback((e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pos * duration;
  }, [duration]);

  const handleProgressMouseDown = useCallback((e) => {
    setIsDragging(true);
    const time = handleProgressInteraction(e);
    if (mediaRef.current) mediaRef.current.currentTime = time;
  }, [handleProgressInteraction, mediaRef]);

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e) {
      const time = handleProgressInteraction(e);
      if (mediaRef.current) mediaRef.current.currentTime = time;
    }
    function handleMouseUp() {
      setIsDragging(false);
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleProgressInteraction, mediaRef]);

  const handleProgressHover = useCallback((e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    setHoverPos(e.clientX - rect.left);
  }, [duration]);

  // Volume
  const handleVolumeChange = useCallback((e) => {
    const rect = volumeRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    dispatch({ type: 'SET_VOLUME', payload: pos });
  }, [dispatch]);

  const toggleMute = useCallback(() => {
    dispatch({ type: 'SET_MUTED', payload: !muted });
  }, [dispatch, muted]);

  const toggleFullscreen = useCallback(() => {
    const container = document.querySelector('.player-viewport');
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (container) {
      container.requestFullscreen();
    }
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4];

  return (
    <div className={styles.controls}>
      {/* Progress Bar */}
      <div
        className={styles.progressContainer}
        ref={progressRef}
        onMouseDown={handleProgressMouseDown}
        onMouseMove={handleProgressHover}
        onMouseLeave={() => setHoverTime(null)}
      >
        <div className={styles.progressBar}>
          <div className={styles.progressBuffered} style={{ width: `${bufferedPercent}%` }} />
          <div className={styles.progressFilled} style={{ width: `${progressPercent}%` }}>
            <div className={styles.progressThumb} />
          </div>
        </div>
        {hoverTime !== null && (
          <div className={styles.progressTooltip} style={{ left: `${hoverPos}px` }}>
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Main Controls */}
      <div className={styles.controlsRow}>
        <div className={styles.leftControls}>
          {/* Shuffle */}
          <button
            className={`${styles.btn} ${shuffle ? styles.active : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
            title="Shuffle (S)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>

          {/* Previous */}
          <button className={styles.btn} onClick={skipPrev} title="Previous (P)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button className={`${styles.btn} ${styles.playBtn}`} onClick={togglePlay} title="Play/Pause (Space)">
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Stop */}
          <button className={styles.btn} onClick={stop} title="Stop">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
          </button>

          {/* Next */}
          <button className={styles.btn} onClick={skipNext} title="Next (N)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          {/* Repeat */}
          <button
            className={`${styles.btn} ${repeatMode !== 'off' ? styles.active : ''}`}
            onClick={() => dispatch({ type: 'TOGGLE_REPEAT' })}
            title={`Repeat: ${repeatMode} (L)`}
          >
            {repeatMode === 'one' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                <text x="12" y="15" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8" fontWeight="bold">1</text>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            )}
          </button>
        </div>

        <div className={styles.centerInfo}>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <span className={styles.timeSep}>/</span>
          <span className={styles.time}>{formatTime(duration)}</span>
          {currentFile && (
            <span className={styles.trackName} title={currentFile.name}>
              {currentFile.name}
            </span>
          )}
        </div>

        <div className={styles.rightControls}>
          {/* Playback Speed */}
          <div className={styles.speedContainer}>
            <button
              className={`${styles.btn} ${playbackRate !== 1 ? styles.active : ''}`}
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              title="Playback Speed"
            >
              <span className={styles.speedLabel}>{playbackRate}x</span>
            </button>
            {showSpeedMenu && (
              <div className={styles.speedMenu}>
                {speedOptions.map(speed => (
                  <button
                    key={speed}
                    className={`${styles.speedOption} ${playbackRate === speed ? styles.active : ''}`}
                    onClick={() => {
                      dispatch({ type: 'SET_PLAYBACK_RATE', payload: speed });
                      setShowSpeedMenu(false);
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subtitle indicator */}
          {subtitleFileName && (
            <span className={styles.subtitleIndicator} title={subtitleFileName}>
              CC
            </span>
          )}

          {/* Volume */}
          <button className={styles.btn} onClick={toggleMute} title="Mute (M)">
            {muted || volume === 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : volume < 0.5 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>

          <div
            className={styles.volumeSlider}
            ref={volumeRef}
            onClick={handleVolumeChange}
          >
            <div className={styles.volumeTrack}>
              <div
                className={styles.volumeFilled}
                style={{ width: `${muted ? 0 : volume * 100}%` }}
              />
            </div>
          </div>

          {/* Fullscreen (video only) */}
          {isVideo && (
            <button className={styles.btn} onClick={toggleFullscreen} title="Fullscreen (F)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
