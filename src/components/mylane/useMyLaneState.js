/**
 * useMyLaneState — tracks card interactions for organic reordering.
 * Phase 3: localStorage persistence. Future: Base44 entity.
 * Admin-only beta data — session-level fallback if localStorage unavailable.
 */
import { useState, useCallback, useRef } from 'react';

const STORAGE_KEY = 'mylane_state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const DEFAULT_STATE = {
  cardInteractions: {},
  lastVisited: null,
  pinnedCards: [],
  hiddenCards: [],
  cardOrder: null,
};

export default function useMyLaneState() {
  const [state, setState] = useState(() => loadState() || DEFAULT_STATE);
  const drillStartRef = useRef({});

  const persist = useCallback((next) => {
    setState(next);
    saveState(next);
  }, []);

  /** Record a card tap */
  const trackCardTap = useCallback((cardId) => {
    drillStartRef.current[cardId] = Date.now();
    setState((prev) => {
      const interactions = { ...prev.cardInteractions };
      const existing = interactions[cardId] || { tapCount: 0, lastTapped: null, avgTimeInDrill: 0 };
      interactions[cardId] = {
        ...existing,
        tapCount: existing.tapCount + 1,
        lastTapped: new Date().toISOString(),
      };
      const next = { ...prev, cardInteractions: interactions };
      saveState(next);
      return next;
    });
  }, []);

  /** Record how long user spent in drill view */
  const trackDrillTime = useCallback((cardId) => {
    const start = drillStartRef.current[cardId];
    if (!start) return;
    const seconds = Math.round((Date.now() - start) / 1000);
    delete drillStartRef.current[cardId];
    if (seconds < 1) return;
    setState((prev) => {
      const interactions = { ...prev.cardInteractions };
      const existing = interactions[cardId] || { tapCount: 0, lastTapped: null, avgTimeInDrill: 0 };
      // Rolling average
      const count = existing.tapCount || 1;
      const newAvg = Math.round(((existing.avgTimeInDrill * (count - 1)) + seconds) / count);
      interactions[cardId] = { ...existing, avgTimeInDrill: newAvg };
      const next = { ...prev, cardInteractions: interactions };
      saveState(next);
      return next;
    });
  }, []);

  /**
   * Return card IDs sorted by relevance.
   * Score = tapCount * recencyWeight. More taps + more recent = higher.
   * Cards with urgency get a boost when within their urgency window.
   */
  const getCardOrder = useCallback((registryCards, urgencyBoosts = {}) => {
    const now = Date.now();
    const DAY_MS = 86400000;

    return [...registryCards].sort((a, b) => {
      const aData = state.cardInteractions[a.id] || { tapCount: 0, lastTapped: null };
      const bData = state.cardInteractions[b.id] || { tapCount: 0, lastTapped: null };

      // Recency weight: taps within last 3 days count 2x, last 7 days 1.5x
      const recencyWeight = (data) => {
        if (!data.lastTapped) return 1;
        const age = now - new Date(data.lastTapped).getTime();
        if (age < 3 * DAY_MS) return 2;
        if (age < 7 * DAY_MS) return 1.5;
        return 1;
      };

      let aScore = aData.tapCount * recencyWeight(aData);
      let bScore = bData.tapCount * recencyWeight(bData);

      // Urgency boost: time-sensitive cards get +10 when within window
      if (urgencyBoosts[a.id]) aScore += 10;
      if (urgencyBoosts[b.id]) bScore += 10;

      return bScore - aScore; // descending
    });
  }, [state.cardInteractions]);

  /** Get timestamp of last MyLane visit */
  const getLastVisited = useCallback(() => {
    return state.lastVisited;
  }, [state.lastVisited]);

  /** Record this visit */
  const setLastVisited = useCallback(() => {
    const prev = state;
    const next = { ...prev, lastVisited: new Date().toISOString() };
    persist(next);
  }, [state, persist]);

  /**
   * Compute vitality (opacity) for a card based on recency of interaction.
   * Returns a value between 0.35 (dormant) and 1.0 (bright).
   * Continuous curve — not binary tiers. The organism breathes.
   *
   * 0-3 days   → 1.0       (bright — just touched)
   * 3-7 days   → 0.85-1.0  (slightly fading)
   * 7-21 days  → 0.55-0.85 (dimming)
   * 21+ days   → 0.35-0.55 (dormant but alive)
   * never used → 0.55      (new cards get moderate visibility)
   */
  const getCardVitality = useCallback((cardId, isUrgent) => {
    // Urgency always overrides — urgent cards are fully bright
    if (isUrgent) return 1.0;

    const data = state.cardInteractions[cardId];
    if (!data?.lastTapped) return 0.55; // never tapped — moderate (new card)

    const ageMs = Date.now() - new Date(data.lastTapped).getTime();
    const ageDays = ageMs / 86400000;

    if (ageDays <= 3) return 1.0;
    if (ageDays <= 7) return 1.0 - ((ageDays - 3) / 4) * 0.15;   // 1.0 → 0.85
    if (ageDays <= 21) return 0.85 - ((ageDays - 7) / 14) * 0.30; // 0.85 → 0.55
    return Math.max(0.35, 0.55 - ((ageDays - 21) / 60) * 0.20);   // 0.55 → 0.35 over ~60 more days
  }, [state.cardInteractions]);

  return {
    trackCardTap,
    trackDrillTime,
    getCardOrder,
    getCardVitality,
    getLastVisited,
    setLastVisited,
    cardInteractions: state.cardInteractions,
  };
}
