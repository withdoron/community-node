/**
 * useActiveBusiness — single source of truth for "which business am I operating as."
 *
 * Scope (Round 1): the list is businesses the current user owns. When authority
 * lands (Round 3+), the query widens without changing the hook's contract, so
 * every consumer inherits the change for free (Living Feet, DEC-146).
 *
 * Persistence: `localStorage` key `locallane.activeBusinessId`. Validated
 * against the live owned list on every render — if the stored id is stale
 * (business removed, ownership lost), falls back to the oldest owned business
 * by `created_date` ascending. Cross-component updates propagate via a
 * custom event, so two consumers in the same tree stay in sync.
 *
 * Server-authoritative identity (DEC-139): `localStorage` is UI convenience,
 * not a security claim. Server actions that scope by business must resolve
 * from request context, not trust this value.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'locallane.activeBusinessId';
const CHANGE_EVENT = 'locallane-active-business-change';

function readStoredId() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function useActiveBusiness(currentUser) {
  const { data: ownedBusinesses = [], isLoading } = useQuery({
    queryKey: ['ownedBusinesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const owned = await base44.entities.Business.filter(
        { owner_user_id: currentUser.id },
        'created_date',
        100,
      );
      return (Array.isArray(owned) ? owned : owned ? [owned] : []).filter(
        (b) => !b.is_deleted && b.status !== 'deleted',
      );
    },
    enabled: !!currentUser?.id,
  });

  const [storedId, setStoredId] = useState(readStoredId);

  useEffect(() => {
    const handler = (e) => setStoredId(e.detail ?? null);
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const activeBusiness = useMemo(() => {
    if (!ownedBusinesses.length) return null;
    if (storedId) {
      const match = ownedBusinesses.find((b) => b.id === storedId);
      if (match) return match;
    }
    return ownedBusinesses[0];
  }, [ownedBusinesses, storedId]);

  const setActiveBusiness = useCallback((businessId) => {
    try {
      if (businessId) localStorage.setItem(STORAGE_KEY, businessId);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setStoredId(businessId ?? null);
    try {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: businessId ?? null }));
    } catch {}
  }, []);

  return {
    activeBusiness,
    setActiveBusiness,
    ownedBusinesses,
    isMultiBusiness: ownedBusinesses.length >= 2,
    isLoading,
  };
}
