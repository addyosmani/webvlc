import { useCallback, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { formatFileSize, getMediaType } from '../utils/fileUtils';
import styles from './Playlist.module.css';

export default function Playlist({ onAddFiles }) {
  const { state, dispatch } = usePlayer();
  const { playlist, currentIndex, isPlaying } = state;
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleItemClick = useCallback((index) => {
    dispatch({ type: 'SET_CURRENT_INDEX', payload: index });
  }, [dispatch]);

  const handleRemove = useCallback((e, index) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_FROM_PLAYLIST', payload: index });
  }, [dispatch]);

  const handleClear = useCallback(() => {
    dispatch({ type: 'CLEAR_PLAYLIST' });
  }, [dispatch]);

  // Drag and drop reordering
  const handleDragStart = useCallback((e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      dispatch({ type: 'MOVE_IN_PLAYLIST', payload: { from: dragIndex, to: toIndex } });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dispatch]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div className={styles.playlist}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Playlist
          {playlist.length > 0 && (
            <span className={styles.count}>{playlist.length} track{playlist.length !== 1 ? 's' : ''}</span>
          )}
        </h3>
        <div className={styles.headerActions}>
          {onAddFiles && (
            <button className={styles.headerBtn} onClick={onAddFiles} title="Add files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
          {playlist.length > 0 && (
            <button className={styles.headerBtn} onClick={handleClear} title="Clear playlist">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className={styles.list}>
        {playlist.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No tracks loaded</p>
            <p className={styles.emptyHint}>Drop files here or use Open to add media</p>
          </div>
        ) : (
          playlist.map((item, index) => {
            const isCurrent = index === currentIndex;
            const mediaType = getMediaType(item.name);
            return (
              <div
                key={`${item.name}-${index}`}
                className={`${styles.item} ${isCurrent ? styles.current : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
                onClick={() => handleItemClick(index)}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className={styles.itemIndex}>
                  {isCurrent && isPlaying ? (
                    <div className={styles.playingIndicator}>
                      <span /><span /><span />
                    </div>
                  ) : (
                    <span className={styles.indexNum}>{index + 1}</span>
                  )}
                </div>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName} title={item.name}>{item.name}</span>
                  <span className={styles.itemMeta}>
                    {mediaType === 'video' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4 }}>
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4 }}>
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    )}
                    {formatFileSize(item.size)}
                  </span>
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={(e) => handleRemove(e, index)}
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
