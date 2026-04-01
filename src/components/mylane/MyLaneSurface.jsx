/**
 * MyLaneSurface — the organism's living surface.
 * DEC-131: Spinner-based navigation replaces card grid.
 * Two spinners: horizontal (spaces), vertical (priorities within Home).
 * Horizontal spinner ALWAYS visible, even when inside a space.
 * Drill-through renders workspace views INSIDE Mylane — unchanged.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Home, UtensilsCrossed, HardHat, DollarSign, Users,
  Store, Search, Settings, Music,
} from 'lucide-react';
import MY_LANE_REGISTRY from '@/config/myLaneRegistry';
import MyLaneDrillView from './MyLaneDrillView';
import useMyLaneState from './useMyLaneState';
import SpaceSpinner from './SpaceSpinner';
import HomeFeed from './HomeFeed';
import DiscoverPosition from './DiscoverPosition';
import FrequencyStation, { FrequencyStationButton } from './FrequencyStation';
import { parseRenderInstruction } from './parseRenderInstruction';
import { renderEntityView } from './renderEntityView';

// Map workspace type IDs to spinner item config
const SPACE_CONFIG = {
  home:              { id: 'home',           label: 'Home',      icon: Home },
  'meal-prep':       { id: 'meal-prep',      label: 'Kitchen',   icon: UtensilsCrossed },
  'field-service':   { id: 'field-service',  label: 'Jobsite',   icon: HardHat },
  finance:           { id: 'finance',        label: 'Finances',  icon: DollarSign },
  team:              { id: 'team',           label: 'Team',      icon: Users },
  business:          { id: 'business',       label: 'Business',  icon: Store, dim: true },
  discover:          { id: 'discover',       label: 'Discover',  icon: Search, dim: true },
};

// Workspace label map for breadcrumbs
const WORKSPACE_LABELS = {
  'field-service': 'Field Service',
  'team': 'Team',
  'finance': 'Finance',
  'property-pulse': 'Property Pulse',
  'meal-prep': 'Meal Prep',
  'business': 'Business',
};

/**
 * Build spinner items from user's active workspace profiles.
 * Always includes Home (first) and Discover (last).
 * Dark Until Explored: zero-state = only Home + Discover.
 */
function buildSpinnerItems(profiles, businessProfiles = []) {
  const items = [SPACE_CONFIG.home]; // Home always first

  // Add active workspaces based on profiles
  if (profiles.mealPrepProfiles?.length > 0) {
    items.push(SPACE_CONFIG['meal-prep']);
  }
  if (profiles.fieldServiceProfiles?.length > 0) {
    items.push(SPACE_CONFIG['field-service']);
  }
  if (profiles.financeProfiles?.length > 0) {
    items.push(SPACE_CONFIG.finance);
  }
  if (profiles.allTeams?.length > 0) {
    items.push(SPACE_CONFIG.team);
  }
  if (businessProfiles.length > 0) {
    items.push({ ...SPACE_CONFIG.business, dim: false });
  }
  if (profiles.propertyMgmtProfiles?.length > 0) {
    items.push({ id: 'property-pulse', label: 'Property', icon: Store });
  }

  // Discover always last
  items.push(SPACE_CONFIG.discover);

  return items;
}

export default function MyLaneSurface({
  currentUser,
  financeProfiles = [],
  fieldServiceProfiles = [],
  allTeams = [],
  propertyMgmtProfiles = [],
  mealPrepProfiles = [],
  businessProfiles = [],
  agentMessageRef,
  onDoorOpen = null,
  warmEntryWizardPage = null,
}) {
  const navigate = useNavigate();
  const profiles = { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles, mealPrepProfiles };

  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [renderedData, setRenderedData] = useState(null);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [frequencyPlaying, setFrequencyPlaying] = useState(false);
  const drillStartRef = useRef(null);

  const {
    trackCardTap,
    trackDrillTime,
    trackMessage,
    getLastVisited,
    setLastVisited,
  } = useMyLaneState();

  // Record visit on mount
  useEffect(() => {
    const t = setTimeout(() => setLastVisited(), 500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispatch agent-active
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('agent-active', { detail: true }));
    return () => { window.dispatchEvent(new CustomEvent('agent-active', { detail: false })); };
  }, []);

  // Message frequency tracking
  useEffect(() => {
    const handler = () => trackMessage();
    window.addEventListener('mylane-user-message', handler);
    return () => window.removeEventListener('mylane-user-message', handler);
  }, [trackMessage]);

  // Build spinner items
  const spaceItems = useMemo(
    () => buildSpinnerItems(profiles, businessProfiles),
    [profiles, businessProfiles]
  );

  const currentSpace = spaceItems[spinnerIndex] || spaceItems[0];

  // Handle spinner navigation
  const handleSpinnerSelect = useCallback((idx) => {
    setSpinnerIndex(idx);
    setRenderedData(null);
    drillStartRef.current = Date.now();
  }, []);

  // Handle "Open [space]" from HomeFeed priority items
  const handleOpenSpace = useCallback((idx) => {
    if (idx >= 0 && idx < spaceItems.length) {
      handleSpinnerSelect(idx);
    }
  }, [spaceItems.length, handleSpinnerSelect]);

  // Return to Home
  const handleLogoClick = useCallback(() => {
    handleSpinnerSelect(0);
  }, [handleSpinnerSelect]);

  // Show raw entity data via universal renderer (agent messages)
  const showRenderedData = useCallback((dataSpec) => {
    setRenderedData(dataSpec);
  }, []);

  // Handle agent messages — render instructions
  const lastProcessedRef = useRef(null);
  const handleAgentMessage = useCallback((msg) => {
    if (!msg?.content || msg.id === lastProcessedRef.current) return;
    const result = parseRenderInstruction(msg.content);
    if (!result.hasRender) return;
    lastProcessedRef.current = msg.id;
    if (result.type === 'data') {
      showRenderedData({ entity: result.entity, workspace: result.workspace, data: result.data, displayHint: result.displayHint });
    } else {
      // Find spinner index for workspace and spin to it
      const targetIdx = spaceItems.findIndex((s) => s.id === result.workspace);
      if (targetIdx >= 0) handleSpinnerSelect(targetIdx);
    }
  }, [spaceItems, handleSpinnerSelect, showRenderedData]);

  useEffect(() => {
    if (agentMessageRef) agentMessageRef.current = handleAgentMessage;
  }, [agentMessageRef, handleAgentMessage]);

  // Active space IDs for Discover filtering
  const activeSpaceIds = useMemo(() => spaceItems.map((s) => s.id), [spaceItems]);

  // Neighbor count (placeholder — could be fetched from community data)
  const neighborCount = 22; // TODO: pull from actual data

  // Render the content area based on current spinner position
  const renderContent = () => {
    // Agent rendered data takes priority
    if (renderedData) {
      return renderEntityView({
        data: renderedData.data,
        entity: renderedData.entity,
        workspace: renderedData.workspace,
        displayHint: renderedData.displayHint,
      });
    }

    const space = currentSpace;

    // Home position — tabbed vertical spinner
    if (space.id === 'home') {
      return (
        <HomeFeed
          profiles={profiles}
          spaceItems={spaceItems}
          onOpenSpace={handleOpenSpace}
          neighborCount={neighborCount}
        />
      );
    }

    // Discover position
    if (space.id === 'discover') {
      return <DiscoverPosition activeSpaceIds={activeSpaceIds} />;
    }

    // Workspace drill-through — renders workspace tabs inside Mylane
    return (
      <MyLaneDrillView
        drilledView={{ workspace: space.id, view: 'home', tab: 'home' }}
        currentUser={currentUser}
        fieldServiceProfiles={fieldServiceProfiles}
        financeProfiles={financeProfiles}
        allTeams={allTeams}
        propertyMgmtProfiles={propertyMgmtProfiles}
        mealPrepProfiles={mealPrepProfiles}
        businessProfiles={businessProfiles}
      />
    );
  };

  return (
    <div
      className="flex flex-col relative"
      style={{
        background: '#020617',
        borderRadius: 26,
        minHeight: 660,
        overflow: 'hidden',
      }}
    >
      {/* ─── Header ─── */}
      <div
        className="flex justify-between items-center"
        style={{ padding: '6px 20px 8px' }}
      >
        <div
          className="cursor-pointer select-none active:opacity-60"
          onClick={handleLogoClick}
          style={{ fontSize: 15, fontWeight: 500, color: '#f8fafc' }}
        >
          <span style={{ color: '#f59e0b', fontWeight: 500 }}>Local</span> Lane
        </div>
        <div className="flex items-center gap-3">
          <FrequencyStationButton
            isPlaying={frequencyPlaying}
            onTogglePlay={() => setFrequencyPlaying(!frequencyPlaying)}
            onToggleShade={() => setFrequencyOpen(!frequencyOpen)}
          />
          <span
            className="cursor-pointer hover:text-slate-300"
            style={{ fontSize: 11, color: '#64748b', padding: '4px 0' }}
            onClick={() => navigate(createPageUrl('Directory'))}
          >
            Directory
          </span>
          <span
            className="cursor-pointer hover:text-slate-300"
            style={{ fontSize: 11, color: '#64748b', padding: '4px 0' }}
            onClick={() => navigate(createPageUrl('Events'))}
          >
            Events
          </span>
          <span
            className="cursor-pointer hover:text-slate-300"
            onClick={() => navigate(createPageUrl('Settings'))}
          >
            <Settings style={{ width: 14, height: 14, color: '#64748b' }} strokeWidth={1.5} />
          </span>
        </div>
      </div>

      {/* ─── Frequency Station (shade overlay — drops over content) ─── */}
      <FrequencyStation
        isOpen={frequencyOpen}
        onClose={() => setFrequencyOpen(false)}
        isPlaying={frequencyPlaying}
        onTogglePlay={() => setFrequencyPlaying(!frequencyPlaying)}
      />

      {/* ─── Separator ─── */}
      <div style={{ height: 1, background: '#111827' }} />

      {/* ─── Horizontal Space Spinner (ALWAYS VISIBLE) ─── */}
      <SpaceSpinner
        items={spaceItems}
        currentIndex={spinnerIndex}
        onSelect={handleSpinnerSelect}
      />

      {/* ─── Content area ─── */}
      <div
        className="flex flex-col"
        style={{ flex: 1, padding: '0 0 58px', overflow: 'hidden' }}
      >
        {renderContent()}
      </div>

      {/* ─── Copilot (always docked bottom) ─── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-2"
        style={{
          background: '#080d18',
          borderTop: '1px solid #111827',
          padding: '8px 16px',
        }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1.5px solid #f59e0b',
          }}
        >
          {/* Mushroom icon */}
          <svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }} stroke="#f59e0b" fill="none" strokeWidth={1.5}>
            <circle cx="12" cy="10" r="6" />
            <line x1="12" y1="16" x2="12" y2="22" />
            <line x1="9" y1="19" x2="12" y2="16" />
            <line x1="15" y1="19" x2="12" y2="16" />
          </svg>
        </div>
        <div
          style={{
            flex: 1,
            background: '#0f1520',
            border: '1px solid #1e293b',
            borderRadius: 16,
            padding: '6px 12px',
            fontSize: 11,
            color: '#475569',
          }}
        >
          Ask Mylane anything...
        </div>
      </div>
    </div>
  );
}
