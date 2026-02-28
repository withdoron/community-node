import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function TeamMessages() {
  return (
    <div className="text-center py-12">
      <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-600" />
      <p className="text-slate-400 mb-1">Team messages coming soon</p>
      <p className="text-sm text-slate-500">Coach announcements and team discussion will live here.</p>
    </div>
  );
}
