import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Mail, UserPlus } from "lucide-react";

export default function StaffWidget({ business }) {
  const instructorCount = business.instructors?.length || 0;

  return (
    <Card className="p-6 bg-slate-900 border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Staff & Instructors</h2>
          <p className="text-sm text-slate-400">Manage your team members</p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-slate-100">{business.owner_email}</p>
              <p className="text-xs text-slate-500">Owner</p>
            </div>
          </div>
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">Owner</Badge>
        </div>

        {instructorCount === 0 ? (
          <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-lg p-8 text-center transition-all group">
            <div className="flex flex-col items-center">
              <div className="h-14 w-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <UserPlus className="h-7 w-7 text-amber-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-1">Invite your team</h3>
              <p className="text-sm text-slate-400 mb-4">Give permissions to managers or door staff</p>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-500 hover:text-amber-400"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Invite
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">{instructorCount} instructor(s) registered</p>
        )}
      </div>
    </Card>
  );
}