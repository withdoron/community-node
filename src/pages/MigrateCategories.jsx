import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { migrateCategories } from '@/components/categories/migrateCategoriesScript';
import { cleanupAllDuplicates } from '@/components/categories/cleanupDuplicates';
import { Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react";

export default function MigrateCategories() {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [cleanupStatus, setCleanupStatus] = useState('idle');
  const [cleanupMessage, setCleanupMessage] = useState('');

  const handleMigrate = async () => {
    setStatus('loading');
    setMessage('');
    
    const result = await migrateCategories();
    
    if (result.success) {
      setStatus('success');
      setMessage(result.message);
    } else {
      setStatus('error');
      setMessage(result.error);
    }
  };

  const handleCleanup = async () => {
    setCleanupStatus('loading');
    setCleanupMessage('');
    
    const result = await cleanupAllDuplicates();
    
    if (result.success) {
      setCleanupStatus('success');
      setCleanupMessage(result.message);
    } else {
      setCleanupStatus('error');
      setCleanupMessage(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 bg-slate-900 border-slate-800">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">
            Migrate Categories to Database
          </h1>
          <p className="text-slate-400 mb-6">
            This will populate the Archetype, CategoryGroup, and SubCategory entities
            from the hardcoded ARCHETYPE_CATEGORIES object.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleMigrate}
              disabled={status === 'loading' || status === 'success'}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {status === 'loading' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-4 w-4 mr-2" />}
              {status === 'loading' ? 'Migrating...' : status === 'success' ? 'Migration Complete' : 'Run Migration'}
            </Button>

            <Button
              onClick={handleCleanup}
              disabled={cleanupStatus === 'loading'}
              variant="outline"
              className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              {cleanupStatus === 'loading' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {cleanupStatus === 'success' && <CheckCircle className="h-4 w-4 mr-2" />}
              <Trash2 className="h-4 w-4 mr-2" />
              {cleanupStatus === 'loading' ? 'Cleaning...' : 'Remove Duplicates'}
            </Button>
          </div>

          {status === 'success' && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-green-400 font-medium">Success!</p>
                <p className="text-slate-300 text-sm mt-1">{message}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-slate-300 text-sm mt-1">{message}</p>
              </div>
            </div>
          )}

          {cleanupStatus === 'success' && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-green-400 font-medium">Cleanup Complete!</p>
                <p className="text-slate-300 text-sm mt-1">{cleanupMessage}</p>
              </div>
            </div>
          )}

          {cleanupStatus === 'error' && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Cleanup Error</p>
                <p className="text-slate-300 text-sm mt-1">{cleanupMessage}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}