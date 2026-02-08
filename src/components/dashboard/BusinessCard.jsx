import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, ChevronRight, Calendar, Users, Crown, Shield, UserCircle } from "lucide-react";

export default function BusinessCard({ business, userRole, eventCount = 0, onClick }) {
  const roleConfig = {
    owner: {
      label: 'OWNER',
      icon: Crown,
      className: 'bg-amber-500 text-black font-bold border-amber-500',
    },
    'co-owner': {
      label: 'CO-OWNER',
      icon: Crown,
      className: 'border-amber-500 text-amber-500',
    },
    staff: {
      label: 'TEAM',
      icon: UserCircle,
      className: 'border-amber-500 text-amber-500',
    },
    none: {
      label: 'TEAM',
      icon: UserCircle,
      className: 'bg-slate-700 text-slate-300 border-slate-700',
    },
    // Legacy keys for backward compatibility
    Owner: { label: 'OWNER', icon: Crown, className: 'bg-amber-500 text-black font-bold border-amber-500' },
    Manager: { label: 'MANAGER', icon: Shield, className: 'bg-slate-700 text-slate-300 border-slate-700' },
    Instructor: { label: 'TEAM', icon: UserCircle, className: 'bg-slate-700 text-slate-300 border-slate-700' },
    Editor: { label: 'TEAM', icon: UserCircle, className: 'bg-slate-700 text-slate-300 border-slate-700' },
  };

  const role = roleConfig[userRole] || roleConfig.staff;
  const RoleIcon = role.icon;

  return (
    <Card 
      className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors duration-300 cursor-pointer overflow-hidden group"
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
              <div className="w-14 h-14 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-amber-500" />
              </div>
            )}
          </div>

          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-lg text-slate-100 truncate">
                {business.name}
              </h3>
              <Badge variant={userRole === 'staff' || userRole === 'co-owner' ? 'outline' : undefined} className={role.className}>
                <RoleIcon className="h-3 w-3 mr-1" />
                {role.label}
              </Badge>
            </div>

            <p className="text-sm text-slate-400 mb-3">
              {business.city}, {business.state}
            </p>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
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
          <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-amber-500 transition-colors flex-shrink-0" />
        </div>
      </div>
    </Card>
  );
}