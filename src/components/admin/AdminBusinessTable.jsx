import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Zap, Crown, Check, X, Sparkles, Store, Coins } from "lucide-react";

const tierConfig = {
  basic: { label: 'Basic', icon: Star, className: 'bg-slate-100 text-slate-700 border-slate-200' },
  standard: { label: 'Standard', icon: Zap, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  partner: { label: 'Partner', icon: Crown, className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function AdminBusinessTable({ businesses, onSelectBusiness }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold">Business</TableHead>
            <TableHead className="font-semibold">City</TableHead>
            <TableHead className="font-semibold">Tier</TableHead>
            <TableHead className="font-semibold text-center">Boosted</TableHead>
            <TableHead className="font-semibold text-center">Silver</TableHead>
            <TableHead className="font-semibold text-center">Local Franchise</TableHead>
            <TableHead className="font-semibold text-center">Status</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((business) => {
            const tier = tierConfig[business.subscription_tier] || tierConfig.basic;
            const TierIcon = tier.icon;

            return (
              <TableRow key={business.id} className="hover:bg-slate-50">
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-900">{business.name}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{business.owner_email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600">{business.city || '—'}</TableCell>
                <TableCell>
                  <Badge className={`${tier.className} border`}>
                    <TierIcon className="h-3 w-3 mr-1" />
                    {tier.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {business.is_bumped ? (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Yes
                    </Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {business.accepts_silver ? (
                    <Coins className="h-4 w-4 text-amber-500 mx-auto" />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {business.is_locally_owned_franchise ? (
                    <Store className="h-4 w-4 text-blue-500 mx-auto" />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {business.is_active !== false ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 border-red-200">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSelectBusiness(business)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}