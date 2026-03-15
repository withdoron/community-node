import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useFieldServiceClients({ profileId, currentUser }) {
  const queryClient = useQueryClient();
  const queryKey = ['fs-clients', profileId];

  const { data: clients = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.FSClient.filter({ workspace_id: profileId }),
    enabled: !!profileId,
  });

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients],
  );

  const getClient = (id) => clientMap[id] ?? null;

  const createClient = useMutation({
    mutationFn: (data) =>
      base44.entities.FSClient.create({
        ...data,
        workspace_id: profileId,
        user_id: currentUser?.id,
        status: 'active',
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Client created');
      return created;
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create client');
    },
  });

  const updateClient = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FSClient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Client updated');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to update client');
    },
  });

  const deleteClient = useMutation({
    mutationFn: (id) => base44.entities.FSClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Client deleted');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to delete client');
    },
  });

  return {
    clients,
    isLoading,
    clientMap,
    getClient,
    createClient,
    updateClient,
    deleteClient,
  };
}
