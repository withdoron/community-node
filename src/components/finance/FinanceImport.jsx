import React from 'react';
import { Upload } from 'lucide-react';

export default function FinanceImport({ profile }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Import</h2>
        </div>
        <p className="text-sm text-slate-400">
          Import bank statements. Upload CSV or OFX files to quickly add transactions.
        </p>
      </div>
    </div>
  );
}
