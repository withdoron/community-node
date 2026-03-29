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

  return {
    trackCardTap,
    trackDrillTime,
    getCardOrder,
    getLastVisited,
    setLastVisited,
    cardInteractions: state.cardInteractions,
  };
}
