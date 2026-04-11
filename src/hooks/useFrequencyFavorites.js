/**
 * useFrequencyFavorites — manages FSFrequencyFavorite records for the current user.
 * Returns { favoriteIds (Set), toggleFavorite(song), isLoading }.
 */
import { useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useFrequencyFavorites(userId) {
  const queryClient = useQueryClient();
  const favoritesRef = useRef([]);

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['frequency-favorites', userId],
    queryFn: async () => {
      const all = await base44.entities.FSFrequencyFavorite.list();
      return (Array.isArray(all) ? all : []).filter(
        (f) => String(f.user_id) === String(userId)
      );
    },
    enabled: !!userId,
  });

  // Keep ref in sync so toggleFavorite never has a stale closure
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);

  // Set of favorited song IDs for fast lookup
  const favoriteIds = new Set(favorites.map((f) => String(f.track_id)));

  const toggleFavorite = useCallback(async (song) => {
    if (!userId) return;
    // Read from ref to avoid stale closure
    const currentFavorites = favoritesRef.current;
    const existing = currentFavorites.find((f) => String(f.track_id) === String(song.id));
    try {
      if (existing) {
        await base44.entities.FSFrequencyFavorite.delete(existing.id);
        toast.success('Removed from favorites');
      } else {
        await base44.entities.FSFrequencyFavorite.create({
          user_id: userId,
          track_id: String(song.id),
          track_title: song.title || '',
          track_artist: song.credit_line || '',
          notes: '',
        });
        toast.success('Added to favorites');
      }
      queryClient.invalidateQueries({ queryKey: ['frequency-favorites'] });
    } catch {
      toast.error('Could not update favorites');
    }
  }, [userId, queryClient]);

  return { favorites, favoriteIds, toggleFavorite, isLoading };
}
