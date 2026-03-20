// useWorkspaceInit — Universal workspace initialization hook.
// Calls initializeWorkspace server function once per session to seed default data.
// Idempotent: the server checks for existing records before creating anything.
//
// Usage in any workspace home component:
//   const { data: initResult } = useWorkspaceInit('field_service', profileId);
//   // initResult?.templates_created > 0 means templates were just seeded

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useWorkspaceInit(workspaceType, profileId) {
  return useQuery({
    queryKey: ['workspace-init', profileId, workspaceType],
    queryFn: async () => {
      const result = await base44.functions.invoke('initializeWorkspace', {
        action: 'initialize',
        workspace_type: workspaceType,
        profile_id: profileId,
      });
      return result;
    },
    enabled: !!profileId && !!workspaceType,
    staleTime: Infinity, // only run once per session
    retry: 1,
  });
}
