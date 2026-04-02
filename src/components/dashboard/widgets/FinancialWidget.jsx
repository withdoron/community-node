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
    <Card className="p-6 bg-secondary border border-border">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Subscription & Billing</h2>
          <p className="text-sm text-foreground-soft">Manage your plan and payment methods</p>
        </div>
        <Button
          variant="outline"
          className="bg-transparent border-border text-foreground-soft hover:bg-transparent hover:border-primary hover:text-primary"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Plan
        </Button>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground-soft">Current Plan</p>
            <Badge className="bg-primary text-primary-foreground">{tierLabel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {tierLevel === 1 && 'More features coming soon.'}
            {tierLevel === 2 && 'Joy Coins, multiple tickets, auto-publish events'}
            {tierLevel === 3 && 'Full features, dedicated node, priority support'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Revenue (Coming Soon)</p>
            </div>
            <p className="text-2xl font-bold text-foreground">$0</p>
          </div>

          <div className="p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Growth</p>
            </div>
            <p className="text-2xl font-bold text-foreground">--</p>
          </div>
        </div>

        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Payment Method</p>
              <p className="text-xs text-muted-foreground mt-1">No payment method on file</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent border-border text-foreground-soft hover:bg-transparent hover:border-primary hover:text-primary"
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