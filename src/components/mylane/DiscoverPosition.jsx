/**
 * DiscoverPosition — Discover space in the spinner.
 * Available spaces the user doesn't have yet + invite key input.
 * CSS values from MOCKUP-SPINNER-V6-FINAL.html.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

// Spaces available for discovery
const DISCOVERABLE_SPACES = [
  {
    id: 'property_management',
    label: 'Property management',
    description: 'Rentals, tenants, maintenance',
    wizardPage: 'PropertyManagementOnboarding',
  },
  {
    id: 'recess',
    label: 'Recess',
    description: 'Movement, play, family activities',
    wizardPage: null, // not yet built
  },
  {
    id: 'harvest',
    label: 'Harvest network',
    description: 'Local food and farmers market',
    wizardPage: null, // not yet built
  },
  {
    id: 'finance',
    label: 'Personal finance',
    description: 'Income, expenses, bills, Enough Number',
    wizardPage: 'FinanceOnboarding',
  },
  {
    id: 'fieldservice',
    label: 'Field service',
    description: 'Clients, estimates, projects, daily logs',
    wizardPage: 'FieldServiceOnboarding',
  },
  {
    id: 'team',
    label: 'Team / Playmaker',
    description: 'Playbook, roster, schedule, game day',
    wizardPage: 'TeamOnboarding',
  },
  {
    id: 'meal_prep',
    label: 'Kitchen',
    description: 'Recipes, meal planning, grocery lists',
    wizardPage: 'MealPrepOnboarding',
  },
];

export default function DiscoverPosition({ activeSpaceIds = [] }) {
  const navigate = useNavigate();
  const [keyCode, setKeyCode] = useState('');

  // Filter out spaces the user already has
  const available = DISCOVERABLE_SPACES.filter(
    (s) => !activeSpaceIds.includes(s.id)
  );

  const handleUnlock = () => {
    if (!keyCode.trim()) return;
    // Invite codes route to the team join flow (most common)
    // The join page handles invalid codes gracefully
    navigate(`/join/${keyCode.trim()}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div style={{ flex: 1, padding: '8px 20px 0', overflowY: 'auto' }}>
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ll-text-primary)', marginBottom: 1 }}>
        Discover
      </div>
      <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)', marginBottom: 10 }}>
        Grow your organism
      </div>

      {/* Section label */}
      <div
        style={{
          fontSize: 9,
          color: 'var(--ll-text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          margin: '10px 0 6px',
          fontWeight: 500,
        }}
      >
        Open spaces
      </div>

      {/* Available spaces */}
      {available.map((space) => (
        <div
          key={space.id}
          onClick={() => {
            if (space.wizardPage) {
              navigate(createPageUrl(space.wizardPage));
            } else {
              toast('Coming soon', { description: `${space.label} is not yet available.` });
            }
          }}
          className="cursor-pointer"
          style={{
            background: 'var(--ll-bg-elevated)',
            border: '1px solid var(--ll-border)',
            borderRadius: 8,
            padding: 11,
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ll-text-primary)' }}>
            {space.label}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)', marginTop: 1 }}>
            {space.description}
          </div>
        </div>
      ))}

      {/* Invite key box */}
      <div
        style={{
          background: 'var(--ll-bg-elevated)',
          border: '1px solid var(--ll-border)',
          borderRadius: 8,
          padding: 14,
          marginTop: 10,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--ll-text-muted)', marginBottom: 8 }}>
          Have a key?
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <input
            type="text"
            value={keyCode}
            onChange={(e) => setKeyCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter code"
            maxLength={8}
            style={{
              background: 'var(--ll-bg-base)',
              border: '1px solid var(--ll-border-hover)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              color: 'var(--ll-text-secondary)',
              width: 140,
              textAlign: 'center',
              fontFamily: 'var(--font-mono, monospace)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleUnlock}
            style={{
              background: 'var(--ll-accent)',
              color: 'var(--ll-bg-base)',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
