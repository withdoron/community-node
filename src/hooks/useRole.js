import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Role hook for feature gating. Exposes isAdmin (platform admin or app owner).
 * Uses same currentUser source as Layout, Admin, etc.
 */
export function useRole() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });
  return {
    isAdmin: currentUser?.role === 'admin',
    isAppAdmin: currentUser?.role === 'admin',
  };
}
