/**
 * Admin sidebar navigation per ADMIN-ARCHITECTURE.md.
 * Sections: MANAGEMENT, PLATFORM, WORKSPACES, EVENTS, ONBOARDING.
 * Styling: bg-card, border-r border-border; active: bg-secondary border-l-2 border-primary.
 */

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Building2,
  Users,
  MapPin,
  Network,
  Globe,
  CreditCard,
  Settings,
  Calendar,
  Clock,
  UsersRound,
  Layout,
  User,
  Accessibility,
  ShieldAlert,
  Coins,
  MessageSquarePlus,
  Mail,
  Layers,
  Wrench,
  Home,
  Calculator,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_BASE = '/Admin';

const sections = [
  {
    label: 'MANAGEMENT',
    items: [
      { to: `${ADMIN_BASE}/businesses`, label: 'Businesses', icon: Building2 },
      { to: `${ADMIN_BASE}/concerns`, label: 'Concerns', icon: ShieldAlert },
      { to: `${ADMIN_BASE}/feedback`, label: 'Feedback', icon: MessageSquarePlus },
      { to: `${ADMIN_BASE}/users`, label: 'Users', icon: Users },
      { to: `${ADMIN_BASE}/newsletter`, label: 'Newsletter', icon: Mail },
      { to: `${ADMIN_BASE}/locations`, label: 'Locations', icon: MapPin },
      { to: `${ADMIN_BASE}/marketplace`, label: 'Marketplace', icon: ShoppingBag },
      { to: `${ADMIN_BASE}/partners`, label: 'Partners', icon: Network },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { to: `${ADMIN_BASE}/networks`, label: 'Networks', icon: Globe },
      { to: `${ADMIN_BASE}/joy-coins`, label: 'Joy Coins', icon: Coins },
      { to: `${ADMIN_BASE}/tiers`, label: 'Tiers', icon: CreditCard, placeholder: true },
      { to: `${ADMIN_BASE}/settings`, label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'WORKSPACES',
    items: [
      { to: `${ADMIN_BASE}/workspaces`, label: 'All Workspaces', icon: Layers },
      { to: `${ADMIN_BASE}/workspaces/field-service`, label: 'Field Service', icon: Wrench },
      { to: `${ADMIN_BASE}/workspaces/property-management`, label: 'Property Mgmt', icon: Home },
      { to: `${ADMIN_BASE}/workspaces/team`, label: 'Team', icon: Users },
      { to: `${ADMIN_BASE}/workspaces/finance`, label: 'Finance', icon: Calculator },
    ],
  },
  {
    label: 'EVENTS',
    items: [
      { to: `${ADMIN_BASE}/events/types`, label: 'Event Types', icon: Calendar },
      { to: `${ADMIN_BASE}/events/age-groups`, label: 'Age Groups', icon: UsersRound },
      { to: `${ADMIN_BASE}/events/durations`, label: 'Durations', icon: Clock },
      { to: `${ADMIN_BASE}/events/accessibility`, label: 'Accessibility', icon: Accessibility },
    ],
  },
  {
    label: 'ONBOARDING',
    items: [
      { to: `${ADMIN_BASE}/onboarding/business`, label: 'Business', icon: Layout, placeholder: true },
      { to: `${ADMIN_BASE}/onboarding/user`, label: 'User', icon: User, placeholder: true },
    ],
  },
];

export default function AdminSidebar({ onItemClick }) {
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    const loadFeedbackCount = async () => {
      try {
        const list = await base44.entities.FeedbackLog.list();
        const items = Array.isArray(list) ? list : [];
        setFeedbackCount(items.length);
      } catch {
        setFeedbackCount(0);
      }
    };
    loadFeedbackCount();
    const interval = setInterval(loadFeedbackCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 shrink-0 bg-card border-r border-border flex flex-col">
      <nav className="p-3 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="text-muted-foreground text-xs uppercase tracking-wider px-3 py-2 font-medium">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isFeedback = item.to === `${ADMIN_BASE}/feedback`;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === `${ADMIN_BASE}/businesses` || item.to === `${ADMIN_BASE}/workspaces` ? false : undefined}
                      onClick={() => onItemClick?.()}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-secondary border-l-2 border-primary text-foreground'
                            : 'text-foreground-soft hover:bg-secondary/50 hover:text-foreground border-l-2 border-transparent'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.placeholder && (
                        <span className="text-xs text-muted-foreground/70 ml-1">(soon)</span>
                      )}
                      {isFeedback && feedbackCount > 0 && (
                        <span className="ml-auto rounded-full bg-primary text-primary-foreground text-xs font-bold min-w-5 h-5 flex items-center justify-center px-1.5">
                          {feedbackCount > 99 ? '99+' : feedbackCount}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
