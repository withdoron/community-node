import React from 'react';
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function VouchCard({ vouch }) {
  let vouchData = {};
  try {
    vouchData = JSON.parse(vouch.content || '{}');
  } catch {
    vouchData = {};
  }

  return (
    <Card className="p-4 bg-secondary/50 border-border">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground text-sm">{vouch.user_name}</span>
            <span className="text-xs text-primary font-medium">Verified Vouch</span>
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            Used: {vouch.service_used}
            {vouchData.approximate_date && ` · ${vouchData.approximate_date}`}
          </p>

          {vouchData.relationship && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs bg-surface text-foreground-soft">
              {vouchData.relationship === 'customer' ? 'Customer' :
               vouchData.relationship === 'neighbor' ? 'Neighbor' :
               vouchData.relationship === 'business_owner' ? 'Fellow Business Owner' :
               'Community Member'}
            </span>
          )}

          {vouchData.statement && (
            <p className="text-sm text-foreground-soft mt-2 italic">"{vouchData.statement}"</p>
          )}
        </div>
      </div>
    </Card>
  );
}
