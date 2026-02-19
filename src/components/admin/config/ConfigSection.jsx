/**
 * Reusable config list section for Admin (Event Types, Networks, Age Groups, Durations, etc.).
 * Uses useConfig(domain, configType) and useConfigMutation to load/save.
 * List with Add / Edit / Delete; reorder via Move Up / Move Down buttons.
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConfig, useConfigMutation } from '@/hooks/useConfig';
import { Loader2, Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
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

  // Inline sort only — do NOT store in state; no useEffect watching items (avoids re-render loop)
  const sortedItems = [...(items || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const handleReorder = (index, direction) => {
    const sorted = [...(items || [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const updated = reordered.map((item, i) => ({ ...item, sort_order: i }));
    mutation.mutate(updated, {
      onSuccess: () => toast.success('Order updated'),
      onError: () => toast.error('Failed to reorder'),
    });
  };

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
    const valueToDelete = item.value ?? item.id;
    const updatedItems = items.filter((i) => (i.value ?? i.id) !== valueToDelete);
    mutation.mutate(updatedItems, {
      onSuccess: () => toast.success('Removed'),
      onError: () => toast.error('Failed to remove'),
    });
  };

  const handleAdd = () => {
    console.log('=== CONFIG SAVE DEBUG ===');
    console.log('Domain:', domain);
    console.log('Config type:', configType);
    console.log('New item:', newLabel, newValue);
    const value = (newValue || newLabel || '').trim().toLowerCase().replace(/\s+/g, '_') || `item_${Date.now()}`;
    const label = (newLabel || newValue || value).trim() || value;
    if (!label) return;
    const next = [...items, { value, label, active: true, sort_order: items.length }];
    console.log('CONFIG SAVE DEBUG: calling mutation.mutate with next (length):', next.length);
    mutation.mutate(next, {
      onSuccess: () => {
        console.log('CONFIG SAVE DEBUG: mutation onSuccess');
        setAdding(false);
        setNewValue('');
        setNewLabel('');
        toast.success('Added');
      },
      onError: (err) => {
        console.log('CONFIG SAVE DEBUG: mutation onError', err);
        toast.error('Failed to add');
      },
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="Label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white rounded px-3 py-1.5 text-sm w-full sm:w-40"
            />
            <input
              type="text"
              placeholder="Value (optional)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white rounded px-3 py-1.5 text-sm w-full sm:w-32"
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
        {sortedItems.map((item, index) => {
          const itemId = item.value ?? item.id;
          const isEditing = editingId === itemId;
          return (
            <li
              key={itemId}
              className={cn(
                'flex items-center gap-2 py-2 px-3 rounded-md border border-slate-700/50',
                isEditing ? 'bg-slate-800' : 'bg-slate-800/50'
              )}
            >
              <div className="flex flex-col gap-0">
                <button
                  type="button"
                  className="text-slate-500 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed p-1.5"
                  disabled={index === 0}
                  onClick={() => handleReorder(index, -1)}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="text-slate-500 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed p-1.5"
                  disabled={index === sortedItems.length - 1}
                  onClick={() => handleReorder(index, 1)}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 flex-1 max-w-xs"
                    autoFocus
                  />
                  <div className="flex gap-2 ml-2 flex-shrink-0">
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
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <span className="text-slate-200 truncate">{item.label}</span>
                  <span className="text-slate-500 text-sm font-mono mr-2 flex-shrink-0 hidden sm:inline">{item.value}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-amber-500 p-2 h-10 w-10"
                      onClick={() => {
                        setEditingId(itemId);
                        setEditLabel(item.label || '');
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400 p-2 h-10 w-10"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {items.length === 0 && !adding && (
        <p className="text-slate-500 text-sm py-4">No items yet. Add one above or they will use defaults.</p>
      )}
    </Card>
  );
}
