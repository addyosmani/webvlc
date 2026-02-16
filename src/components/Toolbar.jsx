import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { isSubtitle, getExtension, srtToVttBlob, assToVttBlob } from '../utils/fileUtils';
import styles from './Toolbar.module.css';

export default function Toolbar({ onOpenFiles, onOpenDirectory, onAddFiles, showPlaylist, onTogglePlaylist }) {
  const { state, dispatch } = usePlayer();
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const handleClickOutside = useCallback((e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setOpenMenu(null);
    }
  }, []);

  useEffect(() => {
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu, handleClickOutside]);

  const handleSubtitleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt,.vtt,.ass,.ssa,.sub';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const ext = getExtension(file.name);
      let url;
      if (ext === 'vtt') {
        url = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
      } else if (ext === 'ass' || ext === 'ssa') {
        url = assToVttBlob(text);
      } else {
        url = srtToVttBlob(text);
      }
      dispatch({ type: 'SET_SUBTITLE', payload: { url, name: file.name } });
    };
    input.click();
    setOpenMenu(null);
  }, [dispatch]);

  const handleClearSubtitle = useCallback(() => {
    dispatch({ type: 'CLEAR_SUBTITLE' });
    setOpenMenu(null);
  }, [dispatch]);

  const menuAction = (fn) => () => {
    fn();
    setOpenMenu(null);
  };

  return (
    <div className={styles.toolbar} ref={menuRef}>
      <div className={styles.menuBar}>
        {/* Media Menu */}
        <div className={styles.menuItem}>
          <button
            className={`${styles.menuBtn} ${openMenu === 'media' ? styles.active : ''}`}
            onClick={() => setOpenMenu(openMenu === 'media' ? null : 'media')}
          >
            Media
          </button>
          {openMenu === 'media' && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={menuAction(onOpenFiles)}>
                <span>Open File(s)...</span>
                <span className={styles.shortcut}>Ctrl+O</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(onOpenDirectory)}>
                <span>Open Directory...</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(onAddFiles)}>
                <span>Add to Playlist...</span>
              </button>
              <div className={styles.separator} />
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'CLEAR_PLAYLIST' }))}>
                <span>Clear Playlist</span>
              </button>
            </div>
          )}
        </div>

        {/* Playback Menu */}
        <div className={styles.menuItem}>
          <button
            className={`${styles.menuBtn} ${openMenu === 'playback' ? styles.active : ''}`}
            onClick={() => setOpenMenu(openMenu === 'playback' ? null : 'playback')}
          >
            Playback
          </button>
          {openMenu === 'playback' && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={menuAction(() => {
                const media = document.querySelector('video, audio');
                if (media) { if (media.paused) media.play(); else media.pause(); }
              })}>
                <span>{state.isPlaying ? 'Pause' : 'Play'}</span>
                <span className={styles.shortcut}>Space</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(() => {
                const media = document.querySelector('video, audio');
                if (media) { media.pause(); media.currentTime = 0; }
              })}>
                <span>Stop</span>
              </button>
              <div className={styles.separator} />
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'TOGGLE_REPEAT' }))}>
                <span>Repeat: {state.repeatMode}</span>
                <span className={styles.shortcut}>L</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'TOGGLE_SHUFFLE' }))}>
                <span>{state.shuffle ? '✓ ' : ''}Shuffle</span>
                <span className={styles.shortcut}>S</span>
              </button>
              <div className={styles.separator} />
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'SET_PLAYBACK_RATE', payload: Math.max(0.25, state.playbackRate - 0.25) }))}>
                <span>Slower</span>
                <span className={styles.shortcut}>[</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'SET_PLAYBACK_RATE', payload: 1 }))}>
                <span>Normal Speed</span>
                <span className={styles.shortcut}>=</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'SET_PLAYBACK_RATE', payload: Math.min(4, state.playbackRate + 0.25) }))}>
                <span>Faster</span>
                <span className={styles.shortcut}>]</span>
              </button>
            </div>
          )}
        </div>

        {/* Audio Menu */}
        <div className={styles.menuItem}>
          <button
            className={`${styles.menuBtn} ${openMenu === 'audio' ? styles.active : ''}`}
            onClick={() => setOpenMenu(openMenu === 'audio' ? null : 'audio')}
          >
            Audio
          </button>
          {openMenu === 'audio' && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'SET_MUTED', payload: !state.muted }))}>
                <span>{state.muted ? '✓ ' : ''}Mute</span>
                <span className={styles.shortcut}>M</span>
              </button>
              <div className={styles.separator} />
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'SET_VOLUME', payload: Math.min(1, state.volume + 0.1) }))}>
                <span>Volume Up</span>
                <span className={styles.shortcut}>↑</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'SET_VOLUME', payload: Math.max(0, state.volume - 0.1) }))}>
                <span>Volume Down</span>
                <span className={styles.shortcut}>↓</span>
              </button>
              <div className={styles.separator} />
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'TOGGLE_VISUALIZATION' }))}>
                <span>{state.audioVisualization ? '✓ ' : ''}Audio Visualization</span>
              </button>
              {state.audioVisualization && (
                <>
                  <div className={styles.separator} />
                  <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'TOGGLE_PRESET_CYCLE' }))}>
                    <span>{state.presetCycle ? '✓ ' : ''}Cycle Presets</span>
                  </button>
                  <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'TOGGLE_PRESET_RANDOM' }))}>
                    <span>{state.presetRandom ? '✓ ' : ''}Random Presets</span>
                  </button>
                  <div className={styles.dropdownInfo}>
                    Cycle: {state.presetCycleLength}s
                    {' · '}
                    <button className={styles.inlineBtn} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_PRESET_CYCLE_LENGTH', payload: Math.max(5, state.presetCycleLength - 5) }); }}>−</button>
                    {' '}
                    <button className={styles.inlineBtn} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_PRESET_CYCLE_LENGTH', payload: Math.min(120, state.presetCycleLength + 5) }); }}>+</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Subtitle Menu */}
        <div className={styles.menuItem}>
          <button
            className={`${styles.menuBtn} ${openMenu === 'subtitle' ? styles.active : ''}`}
            onClick={() => setOpenMenu(openMenu === 'subtitle' ? null : 'subtitle')}
          >
            Subtitle
          </button>
          {openMenu === 'subtitle' && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={handleSubtitleOpen}>
                <span>Load Subtitle File...</span>
              </button>
              {state.subtitleFileName && (
                <>
                  <div className={styles.separator} />
                  <div className={styles.dropdownInfo}>
                    Active: {state.subtitleFileName}
                  </div>
                  <button className={styles.dropdownItem} onClick={handleClearSubtitle}>
                    <span>Disable Subtitles</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className={styles.menuItem}>
          <button
            className={`${styles.menuBtn} ${openMenu === 'view' ? styles.active : ''}`}
            onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={menuAction(onTogglePlaylist)}>
                <span>{showPlaylist ? '✓ ' : ''}Playlist</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'TOGGLE_TRACK_TITLE' }))}>
                <span>{state.showTrackTitle ? '✓ ' : ''}Track Title</span>
              </button>
              <button className={styles.dropdownItem} onClick={menuAction(() => dispatch({ type: 'TOGGLE_PRESET_CONTROLS' }))}>
                <span>{state.showPresetControls ? '✓ ' : ''}Preset Controls</span>
              </button>
              {state.isVideo && (
                <>
                  <div className={styles.separator} />
                  <button className={styles.dropdownItem} onClick={menuAction(() => {
                    const container = document.querySelector('.player-viewport');
                    if (document.fullscreenElement) document.exitFullscreen();
                    else if (container) container.requestFullscreen();
                  })}>
                    <span>Fullscreen</span>
                    <span className={styles.shortcut}>F</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.rightSection}>
        <span className={styles.brand}>WebVLC</span>
      </div>
    </div>
  );
}
