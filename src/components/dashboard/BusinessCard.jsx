import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, ChevronRight, Calendar, Users, Crown, Shield, UserCircle } from "lucide-react";

export default function BusinessCard({ business, userRole, eventCount = 0, onClick }) {
  const roleConfig = {
    Owner: { 
      label: 'OWNER', 
      icon: Crown, 
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
    },
    Manager: { 
      label: 'MANAGER', 
      icon: Shield, 
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
    },
    Instructor: { 
      label: 'STAFF', 
      icon: UserCircle, 
      className: 'bg-purple-500/20 text-purple-400 border-purple-500/50' 
    },
    Editor: { 
      label: 'STAFF', 
      icon: UserCircle, 
      className: 'bg-purple-500/20 text-purple-400 border-purple-500/50' 
    }
  };

  const role = roleConfig[userRole] || roleConfig.Editor;
  const RoleIcon = role.icon;

  return (
    <Card 
      className="bg-slate-800 border-slate-700 hover:border-slate-600 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group"
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
              <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center">
                <Store className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>

          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-lg text-white truncate">
                {business.name}
              </h3>
              <Badge variant="outline" className={role.className}>
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
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
        </div>
      </div>
    </Card>
  );
}