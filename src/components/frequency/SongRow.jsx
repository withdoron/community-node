/**
 * SongRow — shared one-line expandable row for songs across Frequency Station.
 * Used by My Songs, My Favorites, My Queue, and Explore.
 * Tap title to expand/collapse inline details. Play button always visible.
 */
import React, { useState, useCallback } from 'react';
import { useFrequency } from '@/contexts/FrequencyContext';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Play, Pause, Heart, ListPlus, X, Eye, EyeOff, Trash2,
  ChevronDown, ChevronUp, Headphones, Link2, ArrowUp, ArrowDown, Loader2,
} from 'lucide-react';

export default function SongRow({
  song,
  context = 'explore', // 'owned' | 'favorite' | 'queue' | 'explore'
  isFavorited = false,
  isOwned = false,
  onHeart,
  onAddToQueue,
  onRemoveFromQueue,
  onTogglePublic,
  onDelete,
  onMoveUp,
  onMoveDown,
  showQueueControls = false,
}) {
  const freq = useFrequency();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const isThisSong = freq?.currentSong?.id === song.id;
  const isPlaying = isThisSong && freq?.isPlaying;

  const handlePlay = useCallback((e) => {
    e.stopPropagation();
    if (isPlaying) {
      freq.pause();
    } else {
      freq.setSong({
        id: song.id,
        title: song.title || 'Unknown',
        artist: song.credit_line || '',
        audioUrl: song.audio_url,
        coverUrl: song.cover_image_url || '',
        slug: song.slug || '',
      });
    }
  }, [isPlaying, freq, song]);

  const handleShare = useCallback((e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/frequency/${song.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied!');
      base44.entities.FrequencySong.update(song.id, {
        share_count: (song.share_count || 0) + 1,
      }).catch(() => {});
    }).catch(() => toast.error('Could not copy link'));
  }, [song]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Main row — always visible */}
      <div className="flex items-center gap-3 p-3">
        {/* Play button */}
        <button
          type="button"
          onClick={handlePlay}
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>

        {/* Title + artist — tap to expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
            {isOwned && context !== 'owned' && (
              <span className="shrink-0 text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">yours</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{song.credit_line || ''}</p>
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Queue reorder controls */}
          {showQueueControls && (
            <>
              {onMoveUp && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                  className="p-1 text-muted-foreground/50 hover:text-foreground transition-colors">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
              {onMoveDown && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                  className="p-1 text-muted-foreground/50 hover:text-foreground transition-colors">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}

          {/* Heart */}
          {onHeart && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onHeart(song); }}
              className={`p-1 transition-colors ${isFavorited ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground/40 hover:text-red-400'}`}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className="h-3.5 w-3.5" fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
          )}

          {/* Add to queue */}
          {onAddToQueue && context !== 'queue' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddToQueue(song); }}
              className="p-1 text-muted-foreground/40 hover:text-primary transition-colors"
              title="Add to queue"
            >
              <ListPlus className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Remove from queue */}
          {onRemoveFromQueue && context === 'queue' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemoveFromQueue(song.id); }}
              className="p-1 text-muted-foreground/40 hover:text-red-400 transition-colors"
              title="Remove from queue"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Owned-only: public/private toggle */}
          {context === 'owned' && onTogglePublic && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTogglePublic(song); }}
              className={`p-1 transition-colors ${song.is_public ? 'text-emerald-400 hover:text-emerald-300' : 'text-muted-foreground/40 hover:text-foreground'}`}
              title={song.is_public ? 'Public' : 'Private'}
            >
              {song.is_public ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Owned-only: delete */}
          {context === 'owned' && onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(song.id); }}
              className="p-1 text-muted-foreground/30 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Expand indicator */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-muted-foreground/30 hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border space-y-2">
          {song.lyrics && (
            <p className="text-xs text-foreground-soft whitespace-pre-wrap line-clamp-4 font-serif mt-2">
              {song.lyrics}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            {song.style_genre && <span className="bg-secondary px-2 py-0.5 rounded">{song.style_genre}</span>}
            <span className="flex items-center gap-1">
              <Headphones className="h-3 w-3" /> {song.listen_count || 0}
            </span>
            <button type="button" onClick={handleShare}
              className="flex items-center gap-1 hover:text-primary transition-colors">
              <Link2 className="h-3 w-3" /> Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

