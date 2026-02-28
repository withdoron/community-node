import React from 'react';
import { BookOpen } from 'lucide-react';

export default function TeamPlaybook() {
  return (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-600" />
      <p className="text-slate-400 mb-1">Your playbook is empty</p>
      <p className="text-sm text-slate-500">Plays will be added in the next update. Get your paper plays ready!</p>
    </div>
  );
}
