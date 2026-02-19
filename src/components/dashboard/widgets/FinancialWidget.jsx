import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, Settings } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

export default function FinancialWidget({ business }) {
  const { tier, tierLevel, isPartner } = useOrganization(business);

  const tierLabels = {
    basic: 'Basic',
    standard: 'Standard',
    partner: 'Partner'
  };

  const tierLabel = tierLabels[tier] || 'Basic';

  return (
    <Card className="p-6 bg-slate-800 border border-slate-700">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Subscription & Billing</h2>
          <p className="text-sm text-slate-300">Manage your plan and payment methods</p>
        </div>
        <Button
          variant="outline"
          className="bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Plan
        </Button>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-300">Current Plan</p>
            <Badge className="bg-amber-500 text-black">{tierLabel}</Badge>
          </div>
          <p className="text-xs text-slate-400">
            {tierLevel === 1 && 'Upgrade to Standard or Partner to unlock more features'}
            {tierLevel === 2 && 'Joy Coins, multiple tickets, auto-publish events'}
            {tierLevel === 3 && 'Full features, dedicated node, priority support'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-slate-400">Revenue (Coming Soon)</p>
            </div>
            <p className="text-2xl font-bold text-white">$0</p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-slate-400">Growth</p>
            </div>
            <p className="text-2xl font-bold text-white">--</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Payment Method</p>
              <p className="text-xs text-slate-400 mt-1">No payment method on file</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}