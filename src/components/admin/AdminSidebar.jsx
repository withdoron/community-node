/**
 * Admin sidebar navigation per ADMIN-ARCHITECTURE.md.
 * Sections: MANAGEMENT, PLATFORM, EVENTS, ONBOARDING.
 * Styling: bg-slate-900, border-r border-slate-700; active: bg-slate-800 border-l-2 border-amber-500.
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
      { to: `${ADMIN_BASE}/locations`, label: 'Locations', icon: MapPin },
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
    <aside className="w-64 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col">
      <nav className="p-3 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="text-slate-400 text-xs uppercase tracking-wider px-3 py-2 font-medium">
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
                      end={item.to === `${ADMIN_BASE}/businesses` ? false : undefined}
                      onClick={() => onItemClick?.()}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-slate-800 border-l-2 border-amber-500 text-white'
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border-l-2 border-transparent'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.placeholder && (
                        <span className="text-xs text-slate-500 ml-1">(soon)</span>
                      )}
                      {isFeedback && feedbackCount > 0 && (
                        <span className="ml-auto rounded-full bg-amber-500 text-slate-900 text-xs font-bold min-w-5 h-5 flex items-center justify-center px-1.5">
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
