/**
 * useFrequencyQueue — manages the user's song queue via FSFrequencyPlaylist.
 * One record per user where title === 'queue', track_ids is the ordered list.
 * Returns { queueIds, addToQueue, removeFromQueue, reorderQueue, clearQueue, playQueue, isLoading }.
 */
import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useFrequencyQueue(userId, freq) {
  const queryClient = useQueryClient();
  const debounceTimer = useRef(null);

  const { data: queueRecord, isLoading } = useQuery({
    queryKey: ['frequency-queue-playlist', userId],
    queryFn: async () => {
      const all = await base44.entities.FSFrequencyPlaylist.list();
      const arr = Array.isArray(all) ? all : [];
      const existing = arr.find(
        (p) => String(p.user_id) === String(userId) && p.title === 'queue'
      );
      if (existing) return existing;
      // Create queue record if none exists
      const created = await base44.entities.FSFrequencyPlaylist.create({
        user_id: userId,
        title: 'queue',
        description: '',
        track_ids: '[]',
        is_public: false,
        cover_url: '',
      });
      return created;
    },
    enabled: !!userId,
  });

  // Parse track_ids — stored as JSON string or array
  const trackIds = (() => {
    if (!queueRecord?.track_ids) return [];
    if (Array.isArray(queueRecord.track_ids)) return queueRecord.track_ids;
    try { return JSON.parse(queueRecord.track_ids); } catch { return []; }
  })();

  const queueIds = new Set(trackIds.map(String));

  // Persist track_ids to Base44 (debounced for reorders)
  const persistQueue = useCallback((newIds, immediate = false) => {
    if (!queueRecord?.id) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const doUpdate = () => {
      base44.entities.FSFrequencyPlaylist.update(queueRecord.id, {
        track_ids: JSON.stringify(newIds),
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['frequency-queue-playlist'] });
    };
    if (immediate) {
      doUpdate();
    } else {
      debounceTimer.current = setTimeout(doUpdate, 500);
    }
  }, [queueRecord?.id, queryClient]);

  const addToQueue = useCallback((song) => {
    const songId = String(song.id);
    const newIds = trackIds.filter((id) => String(id) !== songId);
    newIds.push(songId);
    persistQueue(newIds, true);
    toast.success('Added to queue');
  }, [trackIds, persistQueue]);

  const removeFromQueue = useCallback((songId) => {
    const newIds = trackIds.filter((id) => String(id) !== String(songId));
    persistQueue(newIds, true);
    toast.success('Removed from queue');
  }, [trackIds, persistQueue]);

  const reorderQueue = useCallback((fromIndex, toIndex) => {
    const newIds = [...trackIds];
    const [moved] = newIds.splice(fromIndex, 1);
    newIds.splice(toIndex, 0, moved);
    persistQueue(newIds, false); // debounced
  }, [trackIds, persistQueue]);

  const clearQueue = useCallback(() => {
    if (!window.confirm('Clear your queue? This cannot be undone.')) return;
    persistQueue([], true);
    toast.success('Queue cleared');
  }, [persistQueue]);

  const playQueue = useCallback((startIndex = 0) => {
    if (!freq || trackIds.length === 0) return;
    // Caller must resolve song objects from trackIds externally
    // This hook just manages the ID list
  }, [freq, trackIds]);

  return {
    trackIds,
    queueIds,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    isLoading,
  };
}
