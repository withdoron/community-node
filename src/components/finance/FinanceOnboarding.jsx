import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CONTEXTS = {
  personal: { label: 'Personal', tax_schedule: 'none', is_active: true },
  rental: { label: 'Rental Property', tax_schedule: 'schedule_e', is_active: true },
  business: { label: 'Business', tax_schedule: 'schedule_c', is_active: true },
};

const DEFAULT_CATEGORIES = {
  personal: {
    income: ['Salary/Wages', 'Client Payment', 'Reimbursement', 'Gift', 'Government Benefits', 'Other Income'],
    expense: ['Housing', 'Food', 'Transportation', 'Healthcare', 'Children',
      'Education', 'Entertainment', 'Clothing', 'Giving/Tithing',
      'Debt Payments', 'Savings', 'Other'],
  },
  rental: {
    income: ['Rental Income', 'Late Fees', 'Other Income'],
    expense: ['Advertising', 'Auto/Travel', 'Cleaning', 'Commissions', 'Insurance',
      'Legal', 'Management Fees', 'Mortgage Interest', 'Repairs', 'Supplies',
      'Taxes', 'Utilities', 'Depreciation', 'Other'],
  },
  business: {
    income: ['Client Payment', 'Project Revenue', 'Consulting', 'Reimbursement', 'Other Income'],
    expense: ['Advertising', 'Car/Truck', 'Insurance', 'Legal', 'Office',
      'Supplies', 'Travel', 'Utilities', 'Software/Tools', 'Contractors', 'Other'],
  },
};

export default function FinanceOnboarding() {
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createProfile = useMutation({
    mutationFn: async () => {
      const profile = await base44.entities.FinancialProfile.create({
        user_id: currentUser.id,
        workspace_name: workspaceName.trim() || 'My Finances',
        contexts: DEFAULT_CONTEXTS,
        categories: DEFAULT_CATEGORIES,
        enough_number: null,
        enough_number_mode: 'auto',
      });
      return profile;
    },
    onSuccess: (profile) => {
      toast.success('Finance workspace created');
      navigate(createPageUrl('BusinessDashboard') + '?finance=' + profile.id);
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create finance workspace');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createProfile.mutate();
  };

  if (!currentUser?.id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Create a Finance Workspace</h1>
            <p className="text-sm text-slate-400">Track your income, expenses, and financial goals</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-slate-400">Workspace name</Label>
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1"
              placeholder="My Finances"
            />
            <p className="text-xs text-slate-500 mt-1">
              You can change this later in Settings.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-sm text-slate-300 font-medium">Your workspace will include:</p>
            <ul className="text-sm text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                3 default contexts: Personal, Rental Property, Business
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Pre-configured income &amp; expense categories for each context
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Enough Number tracking to know when you've covered essentials
              </li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg min-h-[44px]"
            disabled={createProfile.isPending}
          >
            {createProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create Workspace'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
