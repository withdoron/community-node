/**
 * HomeFeed — Home position content with tabbed vertical spinner.
 * Three tabs: Attention | This week | Spaces
 * Each tab feeds a PrioritySpinner.
 * Data recomposed from existing workspace profiles + urgency signals.
 *
 * Props:
 *   profiles — { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles, mealPrepProfiles }
 *   spaceItems — spinner items array (for "Open [space]" links mapping to spinner indices)
 *   onOpenSpace(spinnerIndex) — callback to spin horizontal to a space
 *   neighborCount — number for subtitle
 */
import React, { useState, useCallback, useMemo } from 'react';
import PrioritySpinner from './PrioritySpinner';

const TABS = [
  { id: 'attn', label: 'Attention' },
  { id: 'week', label: 'This week' },
  { id: 'spaces', label: 'Spaces' },
];

/**
 * Build attention items from profile data.
 * Red bar = urgent (overdue, critical). Amber bar = action needed.
 */
function buildAttentionItems(profiles, spaceItems) {
  const items = [];

  // Finance: check enough number urgency (last 7 days of month)
  const financeProfile = profiles.financeProfiles?.[0];
  if (financeProfile) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    if (daysInMonth - dayOfMonth <= 7) {
      const enoughNumber = financeProfile.enough_number || financeProfile.monthly_target || 0;
      if (enoughNumber > 0) {
        items.push({
          title: `Enough number check — ${daysInMonth - dayOfMonth} days left`,
          subtitle: `$${enoughNumber} target`,
          barColor: 'ac',
          spaceIndex: findSpaceIndex(spaceItems, 'finance'),
          spaceName: 'Finances',
        });
      }
    }
  }

  // Field Service: pending estimates
  const fsProfile = profiles.fieldServiceProfiles?.[0];
  if (fsProfile) {
    // We can't query FSEstimate from here (no entity access in component),
    // but we signal that estimates exist via the profile.
    items.push({
      title: 'Estimate awaiting signature',
      subtitle: 'Check pending estimates',
      barColor: 'ac',
      spaceIndex: findSpaceIndex(spaceItems, 'field-service'),
      spaceName: 'Jobsite',
    });
  }

  // Team: check game readiness
  const team = profiles.allTeams?.[0];
  if (team) {
    items.push({
      title: 'Game day readiness',
      subtitle: 'Check roster status',
      barColor: 'ac',
      spaceIndex: findSpaceIndex(spaceItems, 'team'),
      spaceName: 'Team',
    });
  }

  // Property: vacancy check
  const pmProfile = profiles.propertyMgmtProfiles?.[0];
  if (pmProfile) {
    items.push({
      title: 'Property status check',
      subtitle: 'Review properties',
      barColor: 'ac',
      spaceIndex: findSpaceIndex(spaceItems, 'property-pulse'),
      spaceName: 'Property',
    });
  }

  return items;
}

/**
 * Build this-week items.
 * Blue bar = scheduled events. Green bar = life activities.
 */
function buildWeekItems(profiles, spaceItems) {
  const items = [];

  // Team events
  const team = profiles.allTeams?.[0];
  if (team) {
    items.push({
      title: 'Practice',
      subtitle: 'Check team schedule',
      barColor: 'ev',
      spaceIndex: findSpaceIndex(spaceItems, 'team'),
      spaceName: 'Team',
    });
  }

  // Meal prep
  const mpProfile = profiles.mealPrepProfiles?.[0];
  if (mpProfile) {
    items.push({
      title: 'Meal prep',
      subtitle: 'Plan your week',
      barColor: 'lf',
      spaceIndex: findSpaceIndex(spaceItems, 'meal-prep'),
      spaceName: 'Kitchen',
    });
  }

  // Finance
  const financeProfile = profiles.financeProfiles?.[0];
  if (financeProfile) {
    items.push({
      title: 'Budget review',
      subtitle: 'Weekly spending check',
      barColor: 'lf',
      spaceIndex: findSpaceIndex(spaceItems, 'finance'),
      spaceName: 'Finances',
    });
  }

  return items;
}

/**
 * Build spaces overview items.
 * Quick-glance stat per active workspace. Tap = spin to that space.
 */
function buildSpacesItems(profiles, spaceItems) {
  const items = [];

  const financeProfile = profiles.financeProfiles?.[0];
  if (financeProfile) {
    const enoughNumber = financeProfile.enough_number || financeProfile.monthly_target || 0;
    items.push({
      title: 'Enough number',
      subtitle: enoughNumber > 0 ? `$${enoughNumber} target` : 'Set up your target',
      barColor: 'ac',
      spaceIndex: findSpaceIndex(spaceItems, 'finance'),
      spaceName: 'Finances',
    });
  }

  const team = profiles.allTeams?.[0];
  if (team) {
    items.push({
      title: 'Roster',
      subtitle: `${team.team_name || 'Team'}`,
      barColor: 'ev',
      spaceIndex: findSpaceIndex(spaceItems, 'team'),
      spaceName: 'Team',
    });
  }

  const fsProfile = profiles.fieldServiceProfiles?.[0];
  if (fsProfile) {
    items.push({
      title: 'Estimates',
      subtitle: 'Review pending',
      barColor: 'ac',
      spaceIndex: findSpaceIndex(spaceItems, 'field-service'),
      spaceName: 'Jobsite',
    });
  }

  const mpProfile = profiles.mealPrepProfiles?.[0];
  if (mpProfile) {
    items.push({
      title: 'Recipe book',
      subtitle: 'Your recipes',
      barColor: 'lf',
      spaceIndex: findSpaceIndex(spaceItems, 'meal-prep'),
      spaceName: 'Kitchen',
    });
  }

  const pmProfile = profiles.propertyMgmtProfiles?.[0];
  if (pmProfile) {
    items.push({
      title: 'Properties',
      subtitle: 'Management overview',
      barColor: 'ev',
      spaceIndex: findSpaceIndex(spaceItems, 'property-pulse'),
      spaceName: 'Property',
    });
  }

  return items;
}

function findSpaceIndex(spaceItems, spaceId) {
  const idx = spaceItems.findIndex((s) => s.id === spaceId);
  return idx >= 0 ? idx : null;
}

export default function HomeFeed({ profiles = {}, spaceItems = [], onOpenSpace, neighborCount = 0 }) {
  const [activeTab, setActiveTab] = useState('attn');
  const [verticalIndex, setVerticalIndex] = useState(0);

  // Reset vertical index when switching tabs
  const handleTabSwitch = useCallback((tabId) => {
    setActiveTab(tabId);
    setVerticalIndex(0);
  }, []);

  const attentionItems = useMemo(() => buildAttentionItems(profiles, spaceItems), [profiles, spaceItems]);
  const weekItems = useMemo(() => buildWeekItems(profiles, spaceItems), [profiles, spaceItems]);
  const spacesItems = useMemo(() => buildSpacesItems(profiles, spaceItems), [profiles, spaceItems]);

  const currentItems = activeTab === 'attn' ? attentionItems : activeTab === 'week' ? weekItems : spacesItems;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col" style={{ flex: 1, overflow: 'hidden' }}>
      {/* Date header */}
      <div style={{ fontSize: 15, fontWeight: 500, color: '#f8fafc', padding: '6px 20px 0' }}>
        {today}
      </div>
      <div style={{ fontSize: 10, color: '#475569', padding: '0 20px 8px' }}>
        {neighborCount > 0 ? `${neighborCount} neighbors connected` : 'Your spaces'}
      </div>

      {/* Tab selector */}
      <div
        className="flex"
        style={{ padding: '0 20px', borderBottom: '1px solid #111827', gap: 0 }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabSwitch(tab.id)}
            className="cursor-pointer"
            style={{
              padding: '6px 14px',
              fontSize: 11,
              color: activeTab === tab.id ? '#f59e0b' : '#475569',
              borderBottom: `2px solid ${activeTab === tab.id ? '#f59e0b' : 'transparent'}`,
              fontWeight: activeTab === tab.id ? 500 : 400,
              transition: 'all 0.2s',
              background: 'none',
              border: 'none',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: activeTab === tab.id ? '#f59e0b' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vertical spinner */}
      <PrioritySpinner
        items={currentItems}
        currentIndex={verticalIndex}
        onSelect={setVerticalIndex}
        onOpenSpace={onOpenSpace}
      />
    </div>
  );
}
