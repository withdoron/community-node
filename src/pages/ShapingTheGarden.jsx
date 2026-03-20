import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import IdeasBoard from '@/components/dashboard/IdeasBoard';

export default function ShapingTheGarden() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <IdeasBoard currentUser={currentUser} />
    </div>
  );
}
