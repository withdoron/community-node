import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

export default function ConcernForm({ businessId, businessName, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [approximateDate, setApproximateDate] = useState('');
  const [desiredResolution, setDesiredResolution] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const submitConcern = useMutation({
    mutationFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: businessId });
      const business = businesses[0];

      await base44.entities.Concern.create({
        business_id: businessId,
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
        description: description.trim(),
        desired_resolution: desiredResolution.trim() || undefined,
        approximate_date: approximateDate.trim() || undefined,
        status: 'new'
      });

      await base44.functions.invoke('updateBusiness', {
        action: 'update_counters',
        business_id: businessId,
        data: { concern_count: (business?.concern_count || 0) + 1 },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses-for-concerns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-concerns'] });
      onSuccess?.();
    }
  });

  if (!currentUser) {
    return (
      <Card className="p-6 sm:p-8 bg-slate-900 border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="h-6 w-6 text-slate-400" />
          <h2 className="text-xl font-bold text-white">Share a Concern</h2>
        </div>
        <p className="text-slate-400 mb-4">Sign in to submit a concern. Your feedback helps us maintain community trust.</p>
        <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold" onClick={() => base44.auth.signIn()}>
          Sign In
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8 bg-slate-900 border-slate-800">
      <div className="flex items-center gap-3 mb-2">
        <ShieldAlert className="h-6 w-6 text-slate-400" />
        <h2 className="text-xl font-bold text-white">Share a Concern</h2>
      </div>
      <p className="text-slate-400 text-sm mb-1">This goes directly to LocalLane — it won't be posted publicly.</p>
      <p className="text-slate-500 text-sm mb-6">Your concern helps us maintain community trust.</p>

      <div className="space-y-4">
        <div>
          <Label className="text-slate-100">What happened? <span className="text-red-500">*</span></Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your experience..."
            className="mt-2 min-h-[100px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            required
          />
        </div>

        <div>
          <Label className="text-slate-100">When did this happen? (optional)</Label>
          <Input
            value={approximateDate}
            onChange={(e) => setApproximateDate(e.target.value)}
            placeholder="e.g., Last Tuesday, January 15th"
            className="mt-2 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        <div>
          <Label className="text-slate-100">What would you like to happen? (optional)</Label>
          <Textarea
            value={desiredResolution}
            onChange={(e) => setDesiredResolution(e.target.value)}
            placeholder="e.g., A refund, an apology, just want LocalLane to know"
            className="mt-2 min-h-[80px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={() => submitConcern.mutate()}
            disabled={!description.trim() || submitConcern.isPending}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            {submitConcern.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
