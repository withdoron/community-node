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
  basic: { label: 'Basic', icon: Star, className: 'bg-surface text-foreground-soft border-border hover:bg-surface' },
  standard: { label: 'Standard', icon: Zap, className: 'bg-surface text-foreground-soft border-border hover:bg-surface' },
  partner: { label: 'Partner', icon: Crown, className: 'bg-primary text-primary-foreground border-primary hover:bg-primary-hover' },
};

export default function AdminBusinessTable({ businesses, onSelectBusiness, onUpdateBusiness, updatingId }) {
  return (
    <div className="border border-border rounded-xl overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 border-b border-border">
            <TableHead className="font-semibold text-muted-foreground">Business</TableHead>
            <TableHead className="font-semibold text-muted-foreground">Owner</TableHead>
            <TableHead className="font-semibold text-muted-foreground">City</TableHead>
            <TableHead className="font-semibold text-muted-foreground">Tier</TableHead>
            <TableHead className="font-semibold text-center text-muted-foreground">Silver</TableHead>
            <TableHead className="font-semibold text-center text-muted-foreground">Local Franchise</TableHead>
            <TableHead className="font-semibold text-center text-muted-foreground">Status</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((business) => {
            const tier = tierConfig[business.subscription_tier] || tierConfig.basic;
            const TierIcon = tier.icon;

            const isUpdating = updatingId === business.id;

            return (
              <TableRow key={business.id} className={`border-b border-border hover:bg-secondary/50 transition-colors ${isUpdating ? 'opacity-70' : ''}`}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">
                      {business.name}
                      {business.concern_count > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                          <ShieldAlert className="h-3 w-3" />
                          {business.concern_count}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground/70 truncate max-w-[200px]">{business.owner_email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {business.owner_user_id ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Claimed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary-hover border border-primary/30">
                      Unclaimed
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-foreground-soft">{business.city || '—'}</TableCell>
                
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
                    <DropdownMenuContent align="start" className="bg-card border-border">
                      {Object.entries(tierConfig).map(([tierId, config]) => {
                        const ItemIcon = config.icon;
                        return (
                          <DropdownMenuItem
                            key={tierId}
                            onClick={() => onUpdateBusiness(business.id, { subscription_tier: tierId })}
                            className={`${business.subscription_tier === tierId ? 'bg-secondary' : ''} text-foreground-soft hover:bg-secondary hover:text-foreground`}
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
                      className="data-[state=checked]:bg-primary"
                    />
                    {business.accepts_silver && <Coins className="h-3 w-3 text-primary" />}
                  </div>
                </TableCell>
                
                {/* Local Franchise Toggle */}
                <TableCell className="text-center">
                  <div className="min-h-[44px] flex items-center justify-center gap-2">
                    <Switch
                      checked={!!business.is_locally_owned_franchise}
                      onCheckedChange={(checked) => onUpdateBusiness(business.id, { is_locally_owned_franchise: checked })}
                      className="data-[state=checked]:bg-primary"
                    />
                    {business.is_locally_owned_franchise && <Store className="h-3 w-3 text-primary" />}
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
                    className="bg-transparent border-border text-foreground-soft hover:bg-transparent hover:border-primary hover:text-primary"
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