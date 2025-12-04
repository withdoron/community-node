import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Star, Zap, Crown, Sparkles, Store, Coins, Loader2, ChevronDown } from "lucide-react";

const tierConfig = {
  basic: { label: 'Basic', icon: Star, className: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' },
  standard: { label: 'Standard', icon: Zap, className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  partner: { label: 'Partner', icon: Crown, className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
};

export default function AdminBusinessTable({ businesses, onSelectBusiness, onUpdateBusiness, updatingId }) {
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

            const isUpdating = updatingId === business.id;

            return (
              <TableRow key={business.id} className={`hover:bg-slate-50 ${isUpdating ? 'opacity-70' : ''}`}>
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-900">{business.name}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{business.owner_email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600">{business.city || '—'}</TableCell>
                
                {/* Tier Dropdown */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${tier.className}`}>
                        <TierIcon className="h-3 w-3 mr-1" />
                        {tier.label}
                        <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {Object.entries(tierConfig).map(([tierId, config]) => {
                        const ItemIcon = config.icon;
                        return (
                          <DropdownMenuItem
                            key={tierId}
                            onClick={() => onUpdateBusiness(business.id, { subscription_tier: tierId })}
                            className={business.subscription_tier === tierId ? 'bg-slate-100' : ''}
                          >
                            <ItemIcon className="h-4 w-4 mr-2" />
                            {config.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                
                {/* Boosted Toggle */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Switch
                      checked={!!business.is_bumped}
                      onCheckedChange={(checked) => onUpdateBusiness(business.id, { is_bumped: checked })}
                      className="data-[state=checked]:bg-amber-500"
                    />
                    {business.is_bumped && <Sparkles className="h-3 w-3 text-amber-500" />}
                  </div>
                </TableCell>
                
                {/* Silver Toggle */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Switch
                      checked={!!business.accepts_silver}
                      onCheckedChange={(checked) => onUpdateBusiness(business.id, { accepts_silver: checked })}
                      className="data-[state=checked]:bg-amber-500"
                    />
                    {business.accepts_silver && <Coins className="h-3 w-3 text-amber-500" />}
                  </div>
                </TableCell>
                
                {/* Local Franchise Toggle */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Switch
                      checked={!!business.is_locally_owned_franchise}
                      onCheckedChange={(checked) => onUpdateBusiness(business.id, { is_locally_owned_franchise: checked })}
                      className="data-[state=checked]:bg-blue-500"
                    />
                    {business.is_locally_owned_franchise && <Store className="h-3 w-3 text-blue-500" />}
                  </div>
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