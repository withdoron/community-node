import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function useAccessWindows(businessId) {
  const [windows, setWindows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWindows = useCallback(async () => {
    if (!businessId) return;
    try {
      setIsLoading(true);
      const AccessWindow = base44.entities.AccessWindow;
      if (!AccessWindow) {
        setWindows([]);
        return;
      }
      const all = await AccessWindow.filter({ business_id: businessId });
      const sorted = (all || []).sort((a, b) => {
        const dayDiff = DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week);
        if (dayDiff !== 0) return dayDiff;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
      setWindows(sorted);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch access windows:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  const createWindow = useCallback(async (data) => {
    const AccessWindow = base44.entities.AccessWindow;
    const created = await AccessWindow.create({
      ...data,
      business_id: businessId,
      is_active: true
    });
    // Auto-sync: flip accepts_joy_coins to true if this is the first window
    try {
      if (windows.length === 0) {
        await base44.entities.Business.update(businessId, { accepts_joy_coins: true });
      }
    } catch (err) {
      console.error('[useAccessWindows] Failed to sync accepts_joy_coins:', err);
    }
    await fetchWindows();
    return created;
  }, [businessId, fetchWindows, windows.length]);

  const updateWindow = useCallback(async (id, data) => {
    const AccessWindow = base44.entities.AccessWindow;
    const updated = await AccessWindow.update(id, data);
    await fetchWindows();
    return updated;
  }, [fetchWindows]);

  const deleteWindow = useCallback(async (id) => {
    const AccessWindow = base44.entities.AccessWindow;
    await AccessWindow.delete(id);
    // Auto-sync: flip accepts_joy_coins to false if no active windows remain
    try {
      const remaining = windows.filter(w => w.id !== id);
      if (remaining.length === 0) {
        await base44.entities.Business.update(businessId, { accepts_joy_coins: false });
      }
    } catch (err) {
      console.error('[useAccessWindows] Failed to sync accepts_joy_coins:', err);
    }
    await fetchWindows();
  }, [businessId, fetchWindows, windows]);

  const toggleWindow = useCallback(async (id) => {
    const window = windows.find(w => w.id === id);
    if (!window) return;
    return updateWindow(id, { is_active: !window.is_active });
  }, [windows, updateWindow]);

  return {
    windows,
    activeWindows: windows.filter(w => w.is_active),
    isLoading,
    error,
    createWindow,
    updateWindow,
    deleteWindow,
    toggleWindow,
    refresh: fetchWindows
  };
}
