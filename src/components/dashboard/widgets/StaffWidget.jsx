import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Mail } from "lucide-react";

export default function StaffWidget({ business }) {
  const instructorCount = business.instructors?.length || 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff & Instructors</h2>
          <p className="text-sm text-slate-600">Manage your team members</p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{business.owner_email}</p>
              <p className="text-xs text-slate-500">Owner</p>
            </div>
          </div>
          <Badge className="bg-amber-500/10 text-amber-600">Owner</Badge>
        </div>

        {instructorCount === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No instructors added yet</p>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Invite Instructor
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-600">{instructorCount} instructor(s) registered</p>
        )}
      </div>
    </Card>
  );
}