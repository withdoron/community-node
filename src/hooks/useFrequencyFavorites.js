/**
 * useFrequencyFavorites — manages FSFrequencyFavorite records for the current user.
 * Returns { favoriteIds (Set), toggleFavorite(song), isLoading }.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useFrequencyFavorites(userId) {
  const queryClient = useQueryClient();

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

  // Set of favorited song IDs for fast lookup
  const favoriteIds = new Set(favorites.map((f) => String(f.track_id)));

  // Find the favorite record for a song
  const getFavoriteRecord = (songId) =>
    favorites.find((f) => String(f.track_id) === String(songId));

  const toggleFavorite = useCallback(async (song) => {
    if (!userId) return;
    const existing = getFavoriteRecord(song.id);
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
  }, [userId, favorites, queryClient]);

  return { favorites, favoriteIds, toggleFavorite, isLoading };
}
