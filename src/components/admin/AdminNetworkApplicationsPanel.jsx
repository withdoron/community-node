import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Check, X, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNetworkApplicationsPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [declineNotes, setDeclineNotes] = useState({});
  const [showNotesFor, setShowNotesFor] = useState(null);

  // .list() then client-side filter — Base44 .filter() quirk
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['admin-network-applications'],
    queryFn: async () => {
      const all = await base44.entities.NetworkApplication.list();
      return Array.isArray(all) ? all : [];
    },
  });

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const pendingCount = useMemo(
    () => applications.filter((a) => a.status === 'pending').length,
    [applications]
  );

  const reviewMutation = useMutation({
    mutationFn: async ({ applicationId, decision, notes }) => {
      await base44.functions.invoke('manageNetworkApplication', {
        action: 'review',
        data: { application_id: applicationId, decision, notes },
      });
    },
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-network-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success(decision === 'approved' ? 'Application approved!' : 'Application declined.');
      setShowNotesFor(null);
    },
    onError: () => toast.error('Failed to review application'),
  });

  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-500',
    approved: 'bg-emerald-500/20 text-emerald-500',
    declined: 'bg-red-500/20 text-red-400',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Network Applications</h2>
        <p className="text-sm text-slate-400 mt-1">Review and manage network membership applications</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'declined', 'all'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-amber-500 text-black'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-600 text-white rounded-full text-xs px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-700 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Business</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Network</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Applied</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Message</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No {statusFilter === 'all' ? '' : statusFilter} applications
                </td>
              </tr>
            ) : (
              filtered.map((app) => (
                <tr key={app.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-slate-100">{app.business_name || app.business_id}</td>
                  <td className="py-3 px-4 text-sm text-slate-300">
                    {(app.network_slug || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400 max-w-[200px] truncate">
                    {app.applicant_message || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[app.status] || 'bg-slate-800 text-slate-400'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {app.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => reviewMutation.mutate({ applicationId: app.id, decision: 'approved' })}
                          disabled={reviewMutation.isPending}
                          className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs px-3 py-1"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        {showNotesFor === app.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={declineNotes[app.id] || ''}
                              onChange={(e) => setDeclineNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                              placeholder="Reason..."
                              className="h-8 w-32 bg-slate-800 border-slate-600 text-white text-xs"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                reviewMutation.mutate({
                                  applicationId: app.id,
                                  decision: 'declined',
                                  notes: declineNotes[app.id] || '',
                                })
                              }
                              disabled={reviewMutation.isPending}
                              className="text-red-400 border-red-400/50 hover:bg-red-500/10 text-xs px-2 py-1"
                            >
                              Decline
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowNotesFor(app.id)}
                            className="text-red-400 border-red-400/50 hover:bg-red-500/10 text-xs px-3 py-1"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                        )}
                      </div>
                    )}
                    {app.status !== 'pending' && app.reviewer_notes && (
                      <span className="text-xs text-slate-500">{app.reviewer_notes}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
