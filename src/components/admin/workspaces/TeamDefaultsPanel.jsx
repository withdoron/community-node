import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';

export default function TeamDefaultsPanel({ isAdmin }) {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-team-profiles'],
    queryFn: async () => {
      try {
        const list = await base44.entities.TeamProfile.list('-created_date', 500);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    enabled: isAdmin,
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Team Defaults
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Platform-wide defaults for new Team workspaces.
        </p>
      </div>

      <Card className="p-4 bg-secondary border-border inline-block">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <p className="text-2xl font-bold text-primary-hover">{profiles.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Team Workspaces</p>
          </>
        )}
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold text-foreground mb-2">Team Defaults</h3>
        <p className="text-muted-foreground text-sm">
          Sport types, position configs, roster templates. Coming soon.
        </p>
      </Card>
    </div>
  );
}
