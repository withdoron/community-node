import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban } from 'lucide-react';

export default function ActiveProjectsCard({ profile, onClick, onUrgency }) {
  const { data: projects = [] } = useQuery({
    queryKey: ['mylane-fs-projects', profile.id],
    queryFn: async () => {
      if (!profile.id) return [];
      try {
        const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile.id,
  });

  if (!profile) return null;

  const active = projects.filter((p) => p.status === 'active');
  const latest = active.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <FolderKanban className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">Active Projects</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{active.length}</div>
      <div className="text-xs text-muted-foreground mt-1 truncate">
        {latest ? latest.name || latest.title || 'Unnamed project' : 'No active projects'}
      </div>
    </div>
  );
}