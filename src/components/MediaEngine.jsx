import { useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getMediaType, getMimeType, createMediaObjectURL } from '../utils/fileUtils';

export default function MediaEngine() {
  const { state, dispatch, mediaRef, getNextIndex } = usePlayer();
  const {
    playlist, currentIndex, volume, muted, playbackRate,
    subtitleUrl, isVideo,
  } = state;
  const objectUrlRef = useRef(null);
  const pendingPlayRef = useRef(false);

  const currentFile = playlist[currentIndex];

  // Create/revoke object URLs and set media type for current file
  useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!currentFile) return;

    const url = createMediaObjectURL(currentFile.file, currentFile.name);
    objectUrlRef.current = url;

    const mediaType = getMediaType(currentFile.name);
    dispatch({ type: 'SET_IS_VIDEO', payload: mediaType === 'video' });
    dispatch({ type: 'SET_MEDIA_ERROR', payload: null });
    pendingPlayRef.current = true;

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [currentFile, dispatch]);

  // Set source on the media element after the correct element is rendered
  useEffect(() => {
    const media = mediaRef.current;
    const url = objectUrlRef.current;
    if (!media || !url || !currentFile) return;
    if (!pendingPlayRef.current) return;
    pendingPlayRef.current = false;

    // Remove any previous <source> elements
    while (media.firstChild && media.firstChild.tagName === 'SOURCE') {
      media.removeChild(media.firstChild);
    }
    media.querySelectorAll('source').forEach(s => s.remove());
    media.removeAttribute('src');

    // Use a <source> element with explicit MIME type so the browser can
    // correctly identify the container format for .mov, .mkv, .avi, etc.
    const mime = getMimeType(currentFile.name);
    const source = document.createElement('source');
    source.src = url;
    if (mime) source.type = mime;
    // When using <source> elements, error events fire on the source
    source.addEventListener('error', () => {
      dispatch({
        type: 'SET_MEDIA_ERROR',
        payload: 'The media format or codec is not supported by this browser.',
      });
    });
    // Insert <source> before any existing children (e.g. <track>)
    media.insertBefore(source, media.firstChild);

    media.load();
    // Auto-play when switching tracks
    const playPromise = media.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay may be blocked
      });
    }
  }, [currentFile, isVideo, mediaRef, dispatch]);

  // Apply volume
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [volume, mediaRef]);

  // Apply muted
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.muted = muted;
    }
  }, [muted, mediaRef]);

  // Apply playback rate
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, mediaRef]);

  // Handle track ended
  const handleEnded = useCallback(() => {
    const nextIndex = getNextIndex(1);
    if (nextIndex >= 0) {
      dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
    } else {
      dispatch({ type: 'SET_PLAYING', payload: false });
    }
  }, [dispatch, getNextIndex]);

  // Time update handler
  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      dispatch({ type: 'SET_CURRENT_TIME', payload: media.currentTime });
    }
  }, [dispatch, mediaRef]);

  // Duration change handler
  const handleDurationChange = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      dispatch({ type: 'SET_DURATION', payload: media.duration });
    }
  }, [dispatch, mediaRef]);

  // Progress (buffered) handler
  const handleProgress = useCallback(() => {
    const media = mediaRef.current;
    if (media && media.buffered.length > 0) {
      dispatch({
        type: 'SET_BUFFERED',
        payload: media.buffered.end(media.buffered.length - 1),
      });
    }
  }, [dispatch, mediaRef]);

  const handlePlay = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: true });
  }, [dispatch]);

  const handlePause = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: false });
  }, [dispatch]);

  // Handle media errors (unsupported codec, corrupt file, etc.)
  const handleError = useCallback(() => {
    const media = mediaRef.current;
    if (!media?.error) return;
    const err = media.error;
    const messages = {
      [MediaError.MEDIA_ERR_ABORTED]: 'Playback was aborted.',
      [MediaError.MEDIA_ERR_NETWORK]: 'A network error occurred while loading the media.',
      [MediaError.MEDIA_ERR_DECODE]: 'The media file could not be decoded. The codec may not be supported by this browser.',
      [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'The media format or codec is not supported by this browser.',
    };
    dispatch({
      type: 'SET_MEDIA_ERROR',
      payload: messages[err.code] || 'An unknown playback error occurred.',
    });
  }, [dispatch, mediaRef]);

  // Attach event listeners to the media element
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('durationchange', handleDurationChange);
    media.addEventListener('progress', handleProgress);
    media.addEventListener('ended', handleEnded);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('error', handleError);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('durationchange', handleDurationChange);
      media.removeEventListener('progress', handleProgress);
      media.removeEventListener('ended', handleEnded);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('error', handleError);
    };
  }, [currentFile, isVideo, mediaRef, handleTimeUpdate, handleDurationChange, handleProgress, handleEnded, handlePlay, handlePause, handleError]);

  // Apply subtitle track
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    // Remove existing tracks
    while (media.firstChild && media.firstChild.tagName === 'TRACK') {
      media.removeChild(media.firstChild);
    }
    // Also remove any <track> elements that might be there
    const tracks = media.querySelectorAll('track');
    tracks.forEach(t => t.remove());

    if (subtitleUrl) {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'Subtitles';
      track.srclang = 'en';
      track.src = subtitleUrl;
      track.default = true;
      media.appendChild(track);

      // Force the track to show
      media.textTracks[0].mode = 'showing';
    }
  }, [subtitleUrl, mediaRef, currentIndex]);

  return null; // This is a logic-only component
}
