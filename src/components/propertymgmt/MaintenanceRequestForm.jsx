import React, { useState, useEffect, useRef, useMemo } from 'react';
import { sanitizeText } from '@/utils/sanitize';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const inputClass =
  'w-full rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';
const labelClass = 'text-slate-300 text-sm font-medium block mb-1';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'emergency', label: 'Emergency' },
];

const STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'cancelled', label: 'Cancelled' },
];

const safeParseJSON = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

export default function MaintenanceRequestForm({
  open,
  onClose,
  request,
  properties,
  groups,
  workerNames,
  onSave,
}) {
  const fileInputRef = useRef(null);
  const completionFileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    property_id: '',
    priority: 'medium',
    status: 'submitted',
    reported_date: new Date().toISOString().slice(0, 10),
    assigned_to: '',
    estimated_cost: '',
    actual_cost: '',
    completed_date: '',
    notes: '',
  });
  const [photos, setPhotos] = useState([]);
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const groupsById = useMemo(() => {
    const m = {};
    (groups || []).forEach((g) => { m[g.id] = g; });
    return m;
  }, [groups]);

  const propertyOptions = useMemo(() => {
    return (properties || []).map((p) => ({
      id: p.id,
      label: `${groupsById[p.group_id]?.name || '—'} — ${p.name}`,
    }));
  }, [properties, groupsById]);

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.title || !form.title.trim()) newErrors.title = 'Title is required';
    if (!form.description || form.description.trim().length < 10) newErrors.description = 'Description is required (min 10 characters)';
    if (!form.property_id) newErrors.property_id = 'Please select a property';
    if (!form.priority) newErrors.priority = 'Priority is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (open) {
      setErrors({});
      const today = new Date().toISOString().slice(0, 10);
      if (request) {
        setForm({
          title: request.title || '',
          description: request.description || '',
          property_id: request.property_id || '',
          priority: request.priority || 'medium',
          status: request.status || 'submitted',
          reported_date: request.reported_date || today,
          assigned_to: request.assigned_to || '',
          estimated_cost: request.estimated_cost ?? '',
          actual_cost: request.actual_cost ?? '',
          completed_date: request.completed_date || '',
          notes: request.notes || '',
        });
        setPhotos(safeParseJSON(request.photos));
        setCompletionPhotos(safeParseJSON(request.completion_photos));
      } else {
        setForm({
          title: '',
          description: '',
          property_id: '',
          priority: 'medium',
          status: 'submitted',
          reported_date: today,
          assigned_to: '',
          estimated_cost: '',
          actual_cost: '',
          completed_date: '',
          notes: '',
        });
        setPhotos([]);
        setCompletionPhotos([]);
      }
    }
  }, [request, open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // TODO: Replace base64 with file upload API when available
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const uploadFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePhotoAdd = async (e, target) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Validate size and type
    for (const file of files) {
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`"${file.name}" is too large. Photos must be under 5MB.`);
        e.target.value = '';
        return;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported format. Use JPEG, PNG, or WebP.`);
        e.target.value = '';
        return;
      }
    }
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadFile));
      if (target === 'photos') {
        setPhotos((prev) => [...prev, ...urls]);
      } else {
        setCompletionPhotos((prev) => [...prev, ...urls]);
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (target, index) => {
    if (target === 'photos') {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      setCompletionPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      title: sanitizeText(form.title.trim()),
      description: sanitizeText(form.description.trim()) || null,
      property_id: form.property_id,
      priority: form.priority,
      status: form.status,
      reported_date: form.reported_date,
      assigned_to: sanitizeText(form.assigned_to.trim()) || null,
      estimated_cost: form.estimated_cost !== '' ? Number(form.estimated_cost) : null,
      actual_cost: form.actual_cost !== '' ? Number(form.actual_cost) : null,
      completed_date: form.completed_date || null,
      notes: sanitizeText(form.notes.trim()) || null,
      photos: photos.length > 0 ? JSON.stringify(photos) : null,
      completion_photos: completionPhotos.length > 0 ? JSON.stringify(completionPhotos) : null,
    };
    onSave(payload);
  };

  const isEdit = !!request;
  const isComplete = form.status === 'complete';

  const resolveUrl = (url) =>
    typeof url === 'object' && url?.url ? url.url : (url || '');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEdit ? 'Edit Maintenance Request' : 'New Maintenance Request'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              className={inputClass}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Brief description of the issue"
              required
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              className={inputClass + ' min-h-[80px]'}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Detailed description of what needs to be fixed"
              rows={3}
              required
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Property */}
          <div>
            <label className={labelClass}>Property *</label>
            <select
              className={inputClass}
              value={form.property_id}
              onChange={(e) => set('property_id', e.target.value)}
              required
            >
              <option value="">Select property</option>
              {propertyOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.property_id && <p className="text-red-400 text-xs mt-1">{errors.property_id}</p>}
          </div>

          {/* Priority + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Priority *</label>
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                required
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {errors.priority && <p className="text-red-400 text-xs mt-1">{errors.priority}</p>}
            </div>
            <div>
              <label className={labelClass}>Reported date *</label>
              <input
                type="date"
                className={inputClass}
                value={form.reported_date}
                onChange={(e) => set('reported_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className={labelClass}>Status *</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  set('status', newStatus);
                  if (newStatus === 'complete' && !form.completed_date) {
                    set('completed_date', new Date().toISOString().slice(0, 10));
                  }
                }}
                required
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Assigned to (edit only) */}
          {isEdit && (
            <div>
              <label className={labelClass}>Assigned to</label>
              <input
                type="text"
                list="worker-names-maint"
                className={inputClass}
                value={form.assigned_to}
                onChange={(e) => set('assigned_to', e.target.value)}
                placeholder="Worker name"
              />
              {workerNames && workerNames.length > 0 && (
                <datalist id="worker-names-maint">
                  {workerNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              )}
            </div>
          )}

          {/* Cost fields */}
          {isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Estimated cost</label>
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  className={inputClass}
                  value={form.estimated_cost}
                  onChange={(e) => set('estimated_cost', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Actual cost</label>
                <input
                  type="number"
                  step={0.01}
                  min={0}
                  className={inputClass}
                  value={form.actual_cost}
                  onChange={(e) => set('actual_cost', e.target.value)}
                  disabled={!isComplete}
                />
              </div>
            </div>
          )}

          {/* Completed date */}
          {isEdit && isComplete && (
            <div>
              <label className={labelClass}>Completed date</label>
              <input
                type="date"
                className={inputClass}
                value={form.completed_date}
                onChange={(e) => set('completed_date', e.target.value)}
              />
            </div>
          )}

          {/* Photos */}
          <div>
            <label className={labelClass}>Photos</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Add Photos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoAdd(e, 'photos')}
                className="hidden"
              />
            </div>
            {photos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {photos.map((url, i) => (
                  <div key={i} className="relative">
                    <img
                      src={resolveUrl(url)}
                      alt={`Photo ${i + 1}`}
                      className="h-12 w-12 rounded border border-slate-700 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto('photos', i)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completion photos (edit only) */}
          {isEdit && (
            <div>
              <label className={labelClass}>Completion Photos</label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => completionFileInputRef.current?.click()}
                  disabled={uploading}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Add After Photos
                </Button>
                <input
                  ref={completionFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoAdd(e, 'completion')}
                  className="hidden"
                />
              </div>
              {completionPhotos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {completionPhotos.map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={resolveUrl(url)}
                        alt={`After ${i + 1}`}
                        className="h-12 w-12 rounded border border-slate-700 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto('completion', i)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes (edit only) */}
          {isEdit && (
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                className={inputClass + ' min-h-[80px]'}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Manager notes or resolution details"
                rows={3}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 hover:bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
