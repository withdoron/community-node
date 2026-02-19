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
import { Star, Zap, Crown, Store, Coins, ChevronDown, ShieldAlert } from "lucide-react";

const tierConfig = {
  basic: { label: 'Basic', icon: Star, className: 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600' },
  standard: { label: 'Standard', icon: Zap, className: 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600' },
  partner: { label: 'Partner', icon: Crown, className: 'bg-amber-500 text-black border-amber-500 hover:bg-amber-400' },
};

export default function AdminBusinessTable({ businesses, onSelectBusiness, onUpdateBusiness, updatingId }) {
  return (
    <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-800/50 border-b border-slate-700">
            <TableHead className="font-semibold text-slate-400">Business</TableHead>
            <TableHead className="font-semibold text-slate-400">City</TableHead>
            <TableHead className="font-semibold text-slate-400">Tier</TableHead>
            <TableHead className="font-semibold text-center text-slate-400">Silver</TableHead>
            <TableHead className="font-semibold text-center text-slate-400">Local Franchise</TableHead>
            <TableHead className="font-semibold text-center text-slate-400">Status</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((business) => {
            const tier = tierConfig[business.subscription_tier] || tierConfig.basic;
            const TierIcon = tier.icon;

            const isUpdating = updatingId === business.id;

            return (
              <TableRow key={business.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${isUpdating ? 'opacity-70' : ''}`}>
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-100">
                      {business.name}
                      {business.concern_count > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-slate-500">
                          <ShieldAlert className="h-3 w-3" />
                          {business.concern_count}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{business.owner_email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{business.city || '—'}</TableCell>
                
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
                    <DropdownMenuContent align="start" className="bg-slate-900 border-slate-800">
                      {Object.entries(tierConfig).map(([tierId, config]) => {
                        const ItemIcon = config.icon;
                        return (
                          <DropdownMenuItem
                            key={tierId}
                            onClick={() => onUpdateBusiness(business.id, { subscription_tier: tierId })}
                            className={`${business.subscription_tier === tierId ? 'bg-slate-800' : ''} text-slate-300 hover:bg-slate-800 hover:text-white`}
                          >
                            <ItemIcon className="h-4 w-4 mr-2" />
                            {config.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                      className="data-[state=checked]:bg-amber-500"
                    />
                    {business.is_locally_owned_franchise && <Store className="h-3 w-3 text-amber-500" />}
                  </div>
                </TableCell>
                
                <TableCell className="text-center">
                  {business.is_active !== false ? (
                    <Badge className="bg-emerald-500/20 text-emerald-500 border-0">Active</Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-500 border-0">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSelectBusiness(business)}
                    className="bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500"
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