import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUpdateConcern } from '@/functions/adminUpdateConcern';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { format } from 'date-fns';

const STATUS_OPTIONS = ['new', 'reviewing', 'resolved', 'dismissed'];

export default function AdminConcernsPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: concerns = [], isLoading } = useQuery({
    queryKey: ['admin-concerns'],
    queryFn: () => base44.entities.Concern.filter({}, '-created_date', 100)
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['admin-businesses-for-concerns'],
    queryFn: () => base44.entities.Business.list('-created_date', 500)
  });

  const businessMap = useMemo(() => {
    const map = {};
    businesses.forEach(b => { map[b.id] = b; });
    return map;
  }, [businesses]);

  const filteredConcerns = useMemo(() => {
    if (statusFilter === 'all') return concerns;
    return concerns.filter(c => c.status === statusFilter);
  }, [concerns, statusFilter]);

  const newCount = concerns.filter(c => c.status === 'new').length;

  const updateConcern = useMutation({
    mutationFn: async ({ id, status, admin_notes }) => {
      const updates = { status, admin_notes };
      if (status === 'resolved') {
        updates.resolved_date = new Date().toISOString();
      }
      await adminUpdateConcern(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-concerns']);
      setSelectedConcern(null);
      setAdminNotes('');
    }
  });

  const openDetail = (concern) => {
    setSelectedConcern(concern);
    setAdminNotes(concern.admin_notes || '');
  };

  const saveChanges = () => {
    if (!selectedConcern) return;
    updateConcern.mutate({
      id: selectedConcern.id,
      status: selectedConcern.status,
      admin_notes: adminNotes
    });
  };

  const updateStatus = (status) => {
    setSelectedConcern(prev => prev ? { ...prev, status } : null);
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'new': return 'bg-primary/20 text-primary';
      case 'reviewing': return 'bg-blue-500/20 text-blue-400';
      case 'resolved': return 'bg-emerald-500/20 text-emerald-500';
      case 'dismissed': return 'bg-surface text-muted-foreground';
      default: return 'bg-surface text-muted-foreground';
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Concerns</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
          {concerns.length}
        </span>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'new', 'reviewing', 'resolved', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-2 rounded-full text-sm font-medium capitalize ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground-soft hover:bg-surface'
            }`}
          >
            {status}
            {status === 'new' && newCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-primary/30 text-primary-foreground">
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredConcerns.length === 0 ? (
        <div className="text-center py-16">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No Concerns</h3>
          <p className="text-muted-foreground mt-2">All clear — no concerns have been submitted yet.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground text-xs uppercase font-medium">Status</th>
                <th className="text-left py-3 px-4 text-muted-foreground text-xs uppercase font-medium">Business</th>
                <th className="text-left py-3 px-4 text-muted-foreground text-xs uppercase font-medium">Submitted By</th>
                <th className="text-left py-3 px-4 text-muted-foreground text-xs uppercase font-medium">Date</th>
                <th className="text-left py-3 px-4 text-muted-foreground text-xs uppercase font-medium">Description</th>
                <th className="text-right py-3 px-4 text-muted-foreground text-xs uppercase font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConcerns.map((concern) => {
                const business = businessMap[concern.business_id];
                return (
                  <tr
                    key={concern.id}
                    className="border-b border-border hover:bg-secondary/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(concern.status)}`}>
                        {concern.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {business?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-foreground-soft">{concern.user_name || '—'}</td>
                    <td className="py-3 px-4 text-muted-foreground text-sm">
                      {concern.created_date ? format(new Date(concern.created_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="py-3 px-4 text-foreground-soft text-sm max-w-[200px] truncate">
                      {concern.description ? (concern.description.length > 80 ? concern.description.slice(0, 80) + '...' : concern.description) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(concern)}
                        className="border-border text-foreground-soft hover:border-primary hover:text-primary"
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedConcern} onOpenChange={(open) => !open && setSelectedConcern(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Concern Details</DialogTitle>
          </DialogHeader>

          {selectedConcern && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Business: <span className="text-foreground">{businessMap[selectedConcern.business_id]?.name || '—'}</span>
              </div>

              <div className="text-sm text-muted-foreground">
                Submitted by <span className="text-foreground-soft">{selectedConcern.user_name}</span>
                {' '}on {selectedConcern.created_date ? format(new Date(selectedConcern.created_date), 'MMM d, yyyy') : '—'}
              </div>

              {selectedConcern.approximate_date && (
                <div className="text-sm text-muted-foreground">
                  Approximate date: <span className="text-foreground-soft">{selectedConcern.approximate_date}</span>
                </div>
              )}

              <div>
                <Label className="text-sm text-muted-foreground">What happened</Label>
                <p className="mt-1 text-foreground text-sm leading-relaxed">{selectedConcern.description}</p>
              </div>

              {selectedConcern.desired_resolution && (
                <div>
                  <Label className="text-sm text-muted-foreground">Desired resolution</Label>
                  <p className="mt-1 text-foreground-soft text-sm">{selectedConcern.desired_resolution}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          (selectedConcern.status === s)
                            ? s === 'new' ? 'bg-primary text-primary-foreground'
                            : s === 'reviewing' ? 'bg-blue-500 text-white'
                            : s === 'resolved' ? 'bg-emerald-500 text-foreground'
                            : 'bg-surface text-foreground'
                            : 'bg-secondary text-muted-foreground hover:bg-surface'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this concern..."
                    className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground/70"
                  />
                </div>

                <Button
                  onClick={saveChanges}
                  disabled={updateConcern.isPending}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                >
                  {updateConcern.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
