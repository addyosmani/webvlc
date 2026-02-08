import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import styles from './VideoViewport.module.css';

export default function VideoViewport() {
  const { state, dispatch, mediaRef } = usePlayer();
  const { isVideo, isPlaying, playlist, currentIndex, subtitleUrl, mediaError } = state;
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
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

  // Audio visualization
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

    // Setup audio context and analyser
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
      } catch {
        // Already connected
      }
    }

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current?.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvas.getContext('2d');

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      canvasCtx.fillStyle = '#1e1e1e';
      canvasCtx.fillRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.85;
        const hue = (i / bufferLength) * 30 + 15; // Orange gradient
        const lightness = 40 + (dataArray[i] / 255) * 20;
        canvasCtx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
        canvasCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    }

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isVideo, state.audioVisualization, currentFile, mediaRef]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isVideo]);

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
          <div className={styles.audioOverlay}>
            <div className={styles.audioIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div className={styles.audioTitle}>{currentFile.name}</div>
          </div>
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
