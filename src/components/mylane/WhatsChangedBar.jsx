/**
 * WhatsChangedBar — a whisper showing what changed since last visit.
 * Renders only when there are meaningful changes. Dismissible.
 * Not a notification. A gentle awareness.
 */
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';

export default function WhatsChangedBar({
  lastVisited,
  fieldServiceProfiles = [],
  propertyMgmtProfiles = [],
}) {
  const [dismissed, setDismissed] = useState(false);

  // Don't render if no last visit recorded or dismissed
  const enabled = !!lastVisited && !dismissed;

  // New estimates since last visit
  const fsProfileId = fieldServiceProfiles[0]?.id;
  const { data: newEstimates = [] } = useQuery({
    queryKey: ['mylane-changed-estimates', fsProfileId, lastVisited],
    queryFn: async () => {
      if (!fsProfileId) return [];
      try {
        const list = await base44.entities.FSEstimate.filter({ profile_id: fsProfileId });
        const all = Array.isArray(list) ? list : list ? [list] : [];
        return all.filter((e) => e.created_date > lastVisited);
      } catch { return []; }
    },
    enabled: enabled && !!fsProfileId,
    staleTime: 5 * 60 * 1000,
  });

  // New maintenance requests since last visit
  const pmProfileId = propertyMgmtProfiles[0]?.id;
  const { data: newMaintenance = [] } = useQuery({
    queryKey: ['mylane-changed-maintenance', pmProfileId, lastVisited],
    queryFn: async () => {
      if (!pmProfileId) return [];
      try {
        const list = await base44.entities.PMMaintenanceRequest.filter({ profile_id: pmProfileId });
        const all = Array.isArray(list) ? list : list ? [list] : [];
        return all.filter((r) => r.created_date > lastVisited);
      } catch { return []; }
    },
    enabled: enabled && !!pmProfileId,
    staleTime: 5 * 60 * 1000,
  });

  // New feedback since last visit
  const { data: newFeedback = [] } = useQuery({
    queryKey: ['mylane-changed-feedback', lastVisited],
    queryFn: async () => {
      try {
        const list = await base44.entities.ServiceFeedback.list();
        const all = Array.isArray(list) ? list : list ? [list] : [];
        return all.filter((f) => f.created_date > lastVisited);
      } catch { return []; }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Build change summary
  const changes = useMemo(() => {
    const items = [];
    if (newEstimates.length > 0) {
      items.push({ count: newEstimates.length, label: `new estimate${newEstimates.length > 1 ? 's' : ''}` });
    }
    if (newMaintenance.length > 0) {
      items.push({ count: newMaintenance.length, label: `maintenance request${newMaintenance.length > 1 ? 's' : ''}` });
    }
    if (newFeedback.length > 0) {
      items.push({ count: newFeedback.length, label: `feedback item${newFeedback.length > 1 ? 's' : ''}` });
    }
    return items;
  }, [newEstimates, newMaintenance, newFeedback]);

  if (!enabled || changes.length === 0) return null;

  // Build the whisper text
  const whisper = changes
    .map((c) => `${c.count} ${c.label}`)
    .join(', ')
    + ' since your last visit';

  return (
    <div className="bg-card/50 border-b border-border px-4 py-2.5 mb-4 rounded-lg flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {changes.map((c, i) => (
          <span key={i}>
            {i > 0 && ', '}
            <span className="text-primary font-medium">{c.count}</span>{' '}
            {c.label}
          </span>
        ))}
        <span> since your last visit</span>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 text-muted-foreground/70 hover:text-foreground-soft transition-colors flex-shrink-0 ml-3"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
