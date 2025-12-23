import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, Settings } from "lucide-react";

export default function FinancialWidget({ business }) {
  const tierLabels = {
    free: 'Free',
    silver: 'Silver',
    gold: 'Gold'
  };

  const tierLabel = tierLabels[business.subscription_tier] || 'Free';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Subscription & Billing</h2>
          <p className="text-sm text-slate-600">Manage your plan and payment methods</p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Manage Plan
        </Button>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Current Plan</p>
            <Badge className="bg-amber-500 text-slate-900">{tierLabel}</Badge>
          </div>
          <p className="text-xs text-slate-600">
            {business.subscription_tier === 'free' && 'Upgrade to unlock more features'}
            {business.subscription_tier === 'silver' && 'Get 2 boost credits per month'}
            {business.subscription_tier === 'gold' && 'Unlimited boosts & priority support'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-slate-600">Revenue (Coming Soon)</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">$0</p>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-slate-600">Growth</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">--</p>
          </div>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Payment Method</p>
              <p className="text-xs text-slate-500 mt-1">No payment method on file</p>
            </div>
            <Button size="sm" variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}