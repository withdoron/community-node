import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, ChevronRight, Calendar, Users, Crown, Shield, UserCircle } from "lucide-react";

export default function BusinessCard({ business, userRole, eventCount = 0, onClick, workspaceTypeLabel }) {
  const roleConfig = {
    owner: {
      label: 'OWNER',
      icon: Crown,
      className: 'bg-primary text-primary-foreground font-bold border-primary',
    },
    'co-owner': {
      label: 'CO-OWNER',
      icon: Crown,
      className: 'border-primary text-primary',
    },
    staff: {
      label: 'TEAM',
      icon: UserCircle,
      className: 'border-primary text-primary',
    },
    none: {
      label: 'TEAM',
      icon: UserCircle,
      className: 'bg-surface text-foreground-soft border-border',
    },
    // Legacy keys for backward compatibility
    Owner: { label: 'OWNER', icon: Crown, className: 'bg-primary text-primary-foreground font-bold border-primary' },
    Manager: { label: 'MANAGER', icon: Shield, className: 'bg-surface text-foreground-soft border-border' },
    Instructor: { label: 'TEAM', icon: UserCircle, className: 'bg-surface text-foreground-soft border-border' },
    Editor: { label: 'TEAM', icon: UserCircle, className: 'bg-surface text-foreground-soft border-border' },
  };

  const role = roleConfig[userRole] || roleConfig.staff;
  const RoleIcon = role.icon;

  return (
    <Card 
      className="bg-card border border-border hover:border-primary/50 transition-colors duration-300 cursor-pointer overflow-hidden group"
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Business Logo/Icon */}
          <div className="flex-shrink-0">
            {business.photos?.[0] ? (
              <img 
                src={business.photos[0]} 
                alt={business.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>

          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-lg text-foreground truncate">
                {business.name}
              </h3>
              <Badge variant={userRole === 'staff' || userRole === 'co-owner' ? 'outline' : undefined} className={role.className}>
                <RoleIcon className="h-3 w-3 mr-1" />
                {role.label}
              </Badge>
              {workspaceTypeLabel && (
                <span className="text-xs text-muted-foreground/70 bg-secondary px-2 py-0.5 rounded-full">{workspaceTypeLabel}</span>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {business.city}, {business.state}
            </p>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {eventCount} Active Events
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {business.instructors?.length || 0} Staff
              </span>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </div>
    </Card>
  );
}