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
    <Card className="p-4 bg-slate-800/50 border-slate-700">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield className="h-4 w-4 text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white text-sm">{vouch.user_name}</span>
            <span className="text-xs text-amber-500 font-medium">Verified Vouch</span>
          </div>

          <p className="text-sm text-slate-400 mt-1">
            Used: {vouch.service_used}
            {vouchData.approximate_date && ` · ${vouchData.approximate_date}`}
          </p>

          {vouchData.relationship && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">
              {vouchData.relationship === 'customer' ? 'Customer' :
               vouchData.relationship === 'neighbor' ? 'Neighbor' :
               vouchData.relationship === 'business_owner' ? 'Fellow Business Owner' :
               'Community Member'}
            </span>
          )}

          {vouchData.statement && (
            <p className="text-sm text-slate-300 mt-2 italic">"{vouchData.statement}"</p>
          )}
        </div>
      </div>
    </Card>
  );
}
