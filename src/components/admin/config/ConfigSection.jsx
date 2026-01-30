/**
 * Reusable config list section for Admin (Event Types, Networks, Age Groups, Durations, etc.).
 * Uses useConfig(domain, configType) and useConfigMutation to load/save.
 * List with Add / Edit / Delete; drag-to-reorder optional for later.
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConfig, useConfigMutation } from '@/hooks/useConfig';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ConfigSection({ domain, configType, title }) {
  const { data: items = [], isLoading } = useConfig(domain, configType);
  const mutation = useConfigMutation(domain, configType);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const handleSaveEdit = () => {
    if (editingId == null || !editLabel?.trim()) return;
    const next = items.map((item) =>
      item.value === editingId || item.id === editingId
        ? { ...item, label: editLabel.trim() }
        : item
    );
    mutation.mutate(next, {
      onSuccess: () => {
        setEditingId(null);
        setEditLabel('');
        toast.success('Updated');
      },
      onError: () => toast.error('Failed to save'),
    });
  };

  const handleDelete = (item) => {
    const next = items.filter(
      (i) => (i.value !== item.value && i.id !== item.id)
    );
    mutation.mutate(next, {
      onSuccess: () => toast.success('Removed'),
      onError: () => toast.error('Failed to remove'),
    });
  };

  const handleAdd = () => {
    const value = (newValue || newLabel || '').trim().toLowerCase().replace(/\s+/g, '_') || `item_${Date.now()}`;
    const label = (newLabel || newValue || value).trim() || value;
    if (!label) return;
    const next = [...items, { value, label, active: true, sort_order: items.length }];
    mutation.mutate(next, {
      onSuccess: () => {
        setAdding(false);
        setNewValue('');
        setNewLabel('');
        toast.success('Added');
      },
      onError: () => toast.error('Failed to add'),
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-700">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-slate-900 border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {!adding ? (
          <Button
            type="button"
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white rounded px-3 py-1.5 text-sm w-40"
            />
            <input
              type="text"
              placeholder="Value (optional)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white rounded px-3 py-1.5 text-sm w-32"
            />
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black" onClick={handleAdd}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300"
              onClick={() => { setAdding(false); setNewValue(''); setNewLabel(''); }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.value || item.id}
            className={cn(
              'flex items-center justify-between py-2 px-3 rounded-md border border-slate-700/50',
              editingId === (item.value ?? item.id) ? 'bg-slate-800' : 'bg-slate-800/50'
            )}
          >
            {editingId === (item.value ?? item.id) ? (
              <>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 flex-1 max-w-xs"
                  autoFocus
                />
                <div className="flex gap-2 ml-2">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black" onClick={handleSaveEdit}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                    onClick={() => { setEditingId(null); setEditLabel(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="text-slate-200">{item.label}</span>
                <span className="text-slate-500 text-sm font-mono mr-2">{item.value}</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-amber-500 p-1 h-8 w-8"
                    onClick={() => {
                      setEditingId(item.value ?? item.id);
                      setEditLabel(item.label || '');
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-red-400 p-1 h-8 w-8"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 && !adding && (
        <p className="text-slate-500 text-sm py-4">No items yet. Add one above or they will use defaults.</p>
      )}
    </Card>
  );
}
