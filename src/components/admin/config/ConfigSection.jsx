/**
 * Reusable config list section for Admin (Event Types, Networks, Age Groups, Durations, etc.).
 * Uses useConfig(domain, configType) and useConfigMutation to load/save.
 * List with Add / Edit / Delete; reorder via Move Up / Move Down buttons.
 */

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConfig, useConfigMutation } from '@/hooks/useConfig';
import { Loader2, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const isNetworks = (d, t) => d === 'platform' && t === 'networks';

export default function ConfigSection({ domain, configType, title }) {
  const { data: items = [], isLoading } = useConfig(domain, configType);
  const mutation = useConfigMutation(domain, configType);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const networkImageInputRef = useRef(null);
  const [editGallery, setEditGallery] = useState([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInputRef = useRef(null);
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
    const next = items.map((item) => {
      if (item.value !== editingId && item.id !== editingId) return item;
      const updated = { ...item, label: editLabel.trim() };
      if (isNetworks(domain, configType)) {
        updated.tagline = editTagline?.trim() || undefined;
        updated.description = editDescription?.trim() || undefined;
        updated.image = editImage?.trim() || undefined;
        updated.gallery = Array.isArray(editGallery) ? editGallery : [];
      }
      return updated;
    });
    mutation.mutate(next, {
      onSuccess: () => {
        setEditingId(null);
        setEditLabel('');
        setEditTagline('');
        setEditDescription('');
        setEditImage('');
        setEditGallery([]);
        toast.success('Updated');
      },
      onError: () => toast.error('Failed to save'),
    });
  };

  const handleNetworkImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url ?? result?.url;
      if (url) {
        setEditImage(url);
        toast.success('Image uploaded');
      } else {
        toast.error('Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingImage(false);
      if (networkImageInputRef.current) networkImageInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGallery(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url ?? result?.url;
      if (url) {
        setEditGallery((prev) => [...prev, url]);
        toast.success('Photo added');
      } else {
        toast.error('Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
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
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Label (name)"
                      className="bg-slate-800 border border-slate-600 text-white rounded px-2 py-1 flex-1 min-w-0 max-w-xs"
                      autoFocus
                    />
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black" onClick={handleSaveEdit}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                        onClick={() => { setEditingId(null); setEditLabel(''); setEditTagline(''); setEditDescription(''); setEditImage(''); setEditGallery([]); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  {isNetworks(domain, configType) && (
                    <>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Tagline (optional)</label>
                        <input
                          type="text"
                          value={editTagline}
                          onChange={(e) => setEditTagline(e.target.value)}
                          placeholder="e.g., Move your body, build your crew"
                          className="w-full bg-slate-800 border border-slate-600 text-white rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Description (optional)</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="2–3 sentences about what this network is"
                          rows={3}
                          className="w-full bg-slate-800 border border-slate-600 text-white rounded px-2 py-1.5 text-sm resize-y"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Network Image</label>
                        {editImage ? (
                          <div className="space-y-2">
                            <img
                              src={editImage}
                              alt="Network"
                              className="h-24 w-24 rounded-lg object-cover border border-slate-600"
                            />
                            <div className="flex flex-wrap gap-2 items-center">
                              <input
                                type="url"
                                value={editImage}
                                onChange={(e) => setEditImage(e.target.value)}
                                placeholder="Image URL"
                                className="flex-1 min-w-0 bg-slate-800 border border-slate-600 text-white rounded px-2 py-1.5 text-sm max-w-xs"
                              />
                              <input
                                ref={networkImageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleNetworkImageUpload}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300"
                                onClick={() => networkImageInputRef.current?.click()}
                                disabled={uploadingImage}
                              >
                                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                Replace
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 items-center">
                            <input
                              type="url"
                              value={editImage}
                              onChange={(e) => setEditImage(e.target.value)}
                              placeholder="Image URL (or upload below)"
                              className="flex-1 min-w-0 bg-slate-800 border border-slate-600 text-white rounded px-2 py-1.5 text-sm"
                            />
                            <input
                              ref={networkImageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleNetworkImageUpload}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => networkImageInputRef.current?.click()}
                              disabled={uploadingImage}
                            >
                              {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                              Upload
                            </Button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Gallery Images</label>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {(editGallery || []).map((url) => (
                            <div key={url} className="relative w-20 aspect-square rounded border border-slate-600 overflow-hidden">
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                className="absolute top-0 right-0 bg-red-600 rounded-full w-5 h-5 text-xs flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                onClick={() => setEditGallery((prev) => prev.filter((u) => u !== url))}
                                aria-label="Remove photo"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <input
                          ref={galleryInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleGalleryUpload}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                          onClick={() => galleryInputRef.current?.click()}
                          disabled={uploadingGallery}
                        >
                          {uploadingGallery ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                          Add Photo
                        </Button>
                      </div>
                    </>
                  )}
                </div>
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
                        setEditTagline(item.tagline || '');
                        setEditDescription(item.description || '');
                        setEditImage(item.image || '');
                        setEditGallery(Array.isArray(item.gallery) ? item.gallery : []);
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
