import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VoiceInput from './VoiceInput';
import {
  Camera, Plus, X, ClipboardList, Package, Users, Cloud,
  Loader2, Save, Trash2, FolderOpen, Receipt, ChevronDown, Pencil,
} from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';
const LABEL_CLASS = 'block text-slate-300 text-sm font-medium mb-1';
const SECTION_CLASS = 'bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4';
const SECTION_HEADER_CLASS = 'text-lg font-bold text-slate-100 mb-3 flex items-center gap-2';
const UNITS = ['each', 'ft', 'sq ft', 'board', 'roll', 'box', 'bag', 'gal'];
const WEATHER_CHIPS = ['Sunny', 'Cloudy', 'Rain', 'Snow', 'Hot', 'Cold'];
const LAST_PROJECT_KEY = 'fs-last-project';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function parseWorkers(workersJson) {
  if (!workersJson) return [];
  if (Array.isArray(workersJson)) return workersJson;
  if (workersJson && typeof workersJson === 'object' && Array.isArray(workersJson.items)) return workersJson.items;
  if (typeof workersJson === 'string') {
    try { const p = JSON.parse(workersJson); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }
  return [];
}

function parsePhaseLabels(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  return null;
}

export default function FieldServiceLog({ profile, currentUser }) {
  const queryClient = useQueryClient();
  const photoInputRef = useRef(null);

  // ─── Queries ──────────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
      return (Array.isArray(list) ? list : list ? [list] : []).filter(
        (p) => p.status === 'active' || p.status === 'quoting'
      );
    },
    enabled: !!profile?.id,
  });

  // ─── Form state ───────────────────────────────
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayNumber, setDayNumber] = useState('');
  const [weather, setWeather] = useState('');
  const [tasksText, setTasksText] = useState('');
  const [notes, setNotes] = useState('');

  // Photos
  const [photos, setPhotos] = useState([]); // { file, preview, caption, phase }
  const [photoUploading, setPhotoUploading] = useState(false);

  // Materials
  const [materials, setMaterials] = useState([]);
  // Labor
  const [labor, setLabor] = useState([]);

  const [saving, setSaving] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);

  // Restore last project from localStorage
  useEffect(() => {
    const last = localStorage.getItem(LAST_PROJECT_KEY);
    if (last && projects.some((p) => String(p.id) === String(last))) {
      setProjectId(last);
    } else if (projects.length === 1) {
      setProjectId(String(projects[0].id));
    }
  }, [projects]);

  // Auto day number
  const { data: existingLogs = [] } = useQuery({
    queryKey: ['fs-logs-for-project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const list = await base44.entities.FSDailyLog.filter({ project_id: projectId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (projectId && existingLogs.length > 0) {
      const maxDay = existingLogs.reduce((max, l) => {
        const d = parseInt(String(l.day_number).replace('Day ', ''), 10);
        return d > max ? d : max;
      }, 0);
      setDayNumber(String(maxDay + 1));
    } else if (projectId) {
      setDayNumber('1');
    }
  }, [projectId, existingLogs]);

  const allWorkers = useMemo(() => parseWorkers(profile?.workers_json), [profile?.workers_json]);
  // Show workers assigned to selected project first, fall back to all workers
  const workers = useMemo(() => {
    if (!projectId) return allWorkers;
    const assigned = allWorkers.filter(
      (w) => Array.isArray(w.assigned_projects) && w.assigned_projects.includes(projectId)
    );
    return assigned.length > 0 ? assigned : allWorkers;
  }, [allWorkers, projectId]);
  const phases = useMemo(() => parsePhaseLabels(profile?.phase_labels) || ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final'], [profile?.phase_labels]);

  // ─── Photo capture ────────────────────────────
  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      phase: phases[0] || '',
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx]?.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updatePhoto = (idx, key, value) => {
    setPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  };

  // ─── Materials ────────────────────────────────
  const addMaterial = () => {
    setMaterials((prev) => [
      ...prev,
      { description: '', quantity: '1', unit: 'each', unit_cost: '', receipt_photo: null, receipt_preview: null },
    ]);
  };

  const updateMaterial = (idx, key, value) => {
    setMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
  };

  const removeMaterial = (idx) => {
    setMaterials((prev) => {
      if (prev[idx]?.receipt_preview) URL.revokeObjectURL(prev[idx].receipt_preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleReceiptPhoto = (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateMaterial(idx, 'receipt_photo', file);
    updateMaterial(idx, 'receipt_preview', URL.createObjectURL(file));
    e.target.value = '';
  };

  // ─── Labor ────────────────────────────────────
  const addLabor = () => {
    setLabor((prev) => [
      ...prev,
      {
        worker_name: workers[0]?.name || '',
        hours: '',
        hourly_rate: workers[0]?.hourly_rate?.toString() || profile?.hourly_rate?.toString() || '',
        description: '',
      },
    ]);
  };

  const updateLabor = (idx, key, value) => {
    setLabor((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [key]: value };
      // Auto-fill rate when worker changes
      if (key === 'worker_name') {
        const w = workers.find((w) => w.name === value);
        if (w) updated.hourly_rate = w.hourly_rate?.toString() || profile?.hourly_rate?.toString() || '';
      }
      return updated;
    }));
  };

  const removeLabor = (idx) => {
    setLabor((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Load log for editing ─────────────────────
  const loadLogForEditing = async (log) => {
    setEditingLogId(log.id);
    setProjectId(String(log.project_id));
    setDate(log.date || new Date().toISOString().split('T')[0]);
    setDayNumber(String(log.day_number || '').replace('Day ', ''));
    setWeather(log.weather || '');
    setNotes(log.notes || '');

    // Parse tasks
    const t = log.tasks_completed;
    if (Array.isArray(t)) {
      setTasksText(t.join('\n'));
    } else if (typeof t === 'string') {
      const s = t.trim();
      if (s.startsWith('[')) {
        try { const parsed = JSON.parse(s); setTasksText(Array.isArray(parsed) ? parsed.join('\n') : s); }
        catch { setTasksText(s); }
      } else {
        setTasksText(s);
      }
    } else {
      setTasksText('');
    }

    // Load associated materials
    try {
      const mats = await base44.entities.FSMaterialEntry.filter({ daily_log_id: log.id });
      const matList = Array.isArray(mats) ? mats : mats ? [mats] : [];
      setMaterials(matList.map((m) => ({
        id: m.id,
        description: m.description || '',
        quantity: String(m.quantity || 1),
        unit: m.unit || 'each',
        unit_cost: String(m.unit_cost || 0),
        receipt_photo: null,
        receipt_preview: typeof m.receipt_photo === 'object' && m.receipt_photo?.url ? m.receipt_photo.url : (m.receipt_photo || null),
      })));
    } catch { setMaterials([]); }

    // Load associated labor
    try {
      const labs = await base44.entities.FSLaborEntry.filter({ daily_log_id: log.id });
      const labList = Array.isArray(labs) ? labs : labs ? [labs] : [];
      setLabor(labList.map((l) => ({
        id: l.id,
        worker_name: l.worker_name || '',
        hours: String(l.hours || ''),
        hourly_rate: String(l.hourly_rate || ''),
        description: l.description || '',
      })));
    } catch { setLabor([]); }

    // Load existing photos as previews (not File objects — they're already uploaded)
    try {
      const existingPhotos = await base44.entities.FSDailyPhoto.filter({ daily_log_id: log.id });
      const photoList = Array.isArray(existingPhotos) ? existingPhotos : existingPhotos ? [existingPhotos] : [];
      setPhotos(photoList.map((p) => ({
        id: p.id,
        file: null, // already uploaded — no File object
        preview: typeof p.photo === 'object' && p.photo?.url ? p.photo.url : (p.photo || ''),
        caption: p.caption || '',
        phase: p.phase || '',
        _existing: true, // marker: skip re-upload on save
      })));
    } catch { setPhotos([]); }
  };

  const cancelEditing = () => {
    setEditingLogId(null);
    setTasksText('');
    setNotes('');
    setPhotos([]);
    setMaterials([]);
    setLabor([]);
    setWeather('');
  };

  // ─── Upload helper ────────────────────────────
  const uploadFile = async (file) => {
    // Base44 file upload via entity file field
    // Convert to base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ─── Submit ───────────────────────────────────
  const handleSubmit = async () => {
    if (!projectId) {
      toast.error('Select a project');
      return;
    }
    if (!date) {
      toast.error('Date is required');
      return;
    }

    setSaving(true);
    try {
      // Save last project
      localStorage.setItem(LAST_PROJECT_KEY, projectId);

      const tasksArray = tasksText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingLogId) {
        // ═══ UPDATE MODE ══════════════════════════
        await base44.entities.FSDailyLog.update(editingLogId, {
          date,
          day_number: dayNumber || null,
          weather: weather || null,
          tasks_completed: tasksArray.length > 0 ? JSON.stringify(tasksArray) : null,
          notes: notes || null,
        });

        // Upload only NEW photos (skip existing ones loaded during edit)
        for (const photo of photos) {
          if (photo._existing) continue; // already saved — skip
          try {
            const photoData = await uploadFile(photo.file);
            await base44.entities.FSDailyPhoto.create({
              profile_id: profile.id,
              user_id: currentUser?.id,
              project_id: projectId,
              daily_log_id: editingLogId,
              photo: photoData,
              caption: photo.caption || null,
              phase: photo.phase || null,
            });
          } catch (err) {
            console.error('Photo upload error:', err);
          }
        }

        // Update existing materials, create new ones
        for (const mat of materials) {
          if (!mat.description.trim()) continue;
          const qty = parseFloat(mat.quantity) || 1;
          const unitCost = parseFloat(mat.unit_cost) || 0;
          const matData = {
            description: mat.description.trim(),
            quantity: qty,
            unit: mat.unit || 'each',
            unit_cost: unitCost,
            total_cost: qty * unitCost,
          };
          if (mat.id) {
            await base44.entities.FSMaterialEntry.update(mat.id, matData);
          } else {
            await base44.entities.FSMaterialEntry.create({
              ...matData,
              profile_id: profile.id,
              user_id: currentUser?.id,
              project_id: projectId,
              daily_log_id: editingLogId,
            });
          }
        }

        // Update existing labor, create new ones
        for (const lab of labor) {
          if (!lab.worker_name.trim() || !lab.hours) continue;
          const hrs = parseFloat(lab.hours) || 0;
          const rate = parseFloat(lab.hourly_rate) || 0;
          const labData = {
            worker_name: lab.worker_name.trim(),
            hours: hrs,
            hourly_rate: rate,
            total_cost: hrs * rate,
            description: lab.description || null,
          };
          if (lab.id) {
            await base44.entities.FSLaborEntry.update(lab.id, labData);
          } else {
            await base44.entities.FSLaborEntry.create({
              ...labData,
              profile_id: profile.id,
              user_id: currentUser?.id,
              project_id: projectId,
              daily_log_id: editingLogId,
            });
          }
        }

        toast.success('Daily log updated');
        setEditingLogId(null);
      } else {
        // ═══ CREATE MODE ══════════════════════════
        const log = await base44.entities.FSDailyLog.create({
          profile_id: profile.id,
          user_id: currentUser?.id,
          project_id: projectId,
          date,
          day_number: dayNumber || null,
          weather: weather || null,
          tasks_completed: tasksArray.length > 0 ? JSON.stringify(tasksArray) : null,
          notes: notes || null,
        });

        // Upload photos
        for (const photo of photos) {
          try {
            const photoData = await uploadFile(photo.file);
            await base44.entities.FSDailyPhoto.create({
              profile_id: profile.id,
              user_id: currentUser?.id,
              project_id: projectId,
              daily_log_id: log.id,
              photo: photoData,
              caption: photo.caption || null,
              phase: photo.phase || null,
            });
          } catch (err) {
            console.error('Photo upload error:', err);
          }
        }

        // Create material entries
        for (const mat of materials) {
          if (!mat.description.trim()) continue;
          const qty = parseFloat(mat.quantity) || 1;
          const unitCost = parseFloat(mat.unit_cost) || 0;
          const createData = {
            profile_id: profile.id,
            user_id: currentUser?.id,
            project_id: projectId,
            daily_log_id: log.id,
            description: mat.description.trim(),
            quantity: qty,
            unit: mat.unit || 'each',
            unit_cost: unitCost,
            total_cost: qty * unitCost,
          };
          if (mat.receipt_photo) {
            try {
              createData.receipt_photo = await uploadFile(mat.receipt_photo);
            } catch (err) {
              console.error('Receipt upload error:', err);
            }
          }
          await base44.entities.FSMaterialEntry.create(createData);
        }

        // Create labor entries
        for (const lab of labor) {
          if (!lab.worker_name.trim() || !lab.hours) continue;
          const hrs = parseFloat(lab.hours) || 0;
          const rate = parseFloat(lab.hourly_rate) || 0;
          await base44.entities.FSLaborEntry.create({
            profile_id: profile.id,
            user_id: currentUser?.id,
            project_id: projectId,
            daily_log_id: log.id,
            worker_name: lab.worker_name.trim(),
            hours: hrs,
            hourly_rate: rate,
            total_cost: hrs * rate,
            description: lab.description || null,
          });
        }

        toast.success('Daily log saved');
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['fs-daily-logs-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-materials-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-labor-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-recent-logs'] });
      queryClient.invalidateQueries({ queryKey: ['fs-logs-for-project'] });

      // Cleanup previews
      photos.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview); });
      materials.forEach((m) => { if (m.receipt_preview) URL.revokeObjectURL(m.receipt_preview); });

      // Reset form
      setTasksText('');
      setNotes('');
      setPhotos([]);
      setMaterials([]);
      setLabor([]);
      setWeather('');

    } catch (err) {
      console.error('Save error:', err);
      toast.error(err?.message || 'Failed to save daily log');
    } finally {
      setSaving(false);
    }
  };

  // ─── Material totals ──────────────────────────
  const materialsTotal = materials.reduce((s, m) => {
    const qty = parseFloat(m.quantity) || 0;
    const cost = parseFloat(m.unit_cost) || 0;
    return s + qty * cost;
  }, 0);

  const laborTotal = labor.reduce((s, l) => {
    const hrs = parseFloat(l.hours) || 0;
    const rate = parseFloat(l.hourly_rate) || 0;
    return s + hrs * rate;
  }, 0);

  return (
    <div className="space-y-0 pb-24">
      {editingLogId && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-amber-500 font-medium">Editing log — {date}</span>
          <button type="button" onClick={cancelEditing}
            className="text-xs text-slate-400 hover:text-slate-200 min-h-[36px]">Cancel</button>
        </div>
      )}

      {/* Recent Logs for selected project */}
      {projectId && existingLogs.length > 0 && !editingLogId && (
        <div className={SECTION_CLASS}>
          <div className={SECTION_HEADER_CLASS}>
            <ClipboardList className="h-5 w-5 text-amber-500" />
            Recent Logs
          </div>
          <div className="space-y-2">
            {[...existingLogs]
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              .slice(0, 5)
              .map((log) => {
                const tasks = (() => {
                  const t = log.tasks_completed;
                  if (!t) return '';
                  if (Array.isArray(t)) return t.join(', ');
                  if (typeof t === 'string') {
                    const s = t.trim();
                    if (s.startsWith('[')) {
                      try { const p = JSON.parse(s); return Array.isArray(p) ? p.join(', ') : s; }
                      catch { return s; }
                    }
                    return s;
                  }
                  return '';
                })();
                return (
                  <div key={log.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-slate-500">
                          {log.date ? new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                        {log.day_number && (
                          <span className="text-xs text-slate-500">Day {String(log.day_number).replace('Day ', '')}</span>
                        )}
                      </div>
                      {tasks && <p className="text-sm text-slate-300 truncate">{tasks}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => loadLogForEditing(log)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Project + Date + Day */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <FolderOpen className="h-5 w-5 text-amber-500" />
          Project & Date
        </div>

        <div className="space-y-3">
          <div>
            <label className={LABEL_CLASS}>Project *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.client_name ? ` — ${p.client_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Day #</label>
              <input
                type="text"
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                className={INPUT_CLASS}
                placeholder="1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weather */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <Cloud className="h-5 w-5 text-amber-500" />
          Weather
        </div>
        <div className="flex flex-wrap gap-2">
          {WEATHER_CHIPS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeather((prev) => (prev === w ? '' : w))}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors min-h-[36px] ${
                weather === w
                  ? 'bg-amber-500 text-black font-medium'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <Camera className="h-5 w-5 text-amber-500" />
          Photos
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative">
                <img
                  src={photo.preview}
                  alt=""
                  className="w-full aspect-square object-cover rounded-lg border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mt-1 space-y-1">
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) => updatePhoto(idx, 'caption', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs placeholder:text-slate-500"
                    placeholder="Caption..."
                  />
                  <select
                    value={photo.phase}
                    onChange={(e) => updatePhoto(idx, 'phase', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs"
                  >
                    <option value="">No phase</option>
                    {phases.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handlePhotoCapture}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-xl py-4 text-slate-400 hover:text-amber-500 hover:border-amber-500/50 transition-colors min-h-[44px]"
        >
          <Camera className="h-5 w-5" />
          {photos.length > 0 ? 'Add More Photos' : 'Take Photo'}
        </button>
      </div>

      {/* Work Completed */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <ClipboardList className="h-5 w-5 text-amber-500" />
          Work Completed
        </div>
        <div className="flex gap-2 items-start">
          <textarea
            value={tasksText}
            onChange={(e) => setTasksText(e.target.value)}
            rows={4}
            className={`${INPUT_CLASS} resize-y`}
            placeholder="One task per line:&#10;Installed drywall in kitchen&#10;Ran electrical for island&#10;Framed bathroom doorway"
          />
          <VoiceInput
            onTranscript={(t) => setTasksText((prev) => (prev ? `${prev}\n${t}` : t))}
            className="mt-1"
          />
        </div>
      </div>

      {/* Materials */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <Package className="h-5 w-5 text-amber-500" />
          Materials
          {materialsTotal > 0 && (
            <span className="text-sm font-normal text-amber-500 ml-auto">{fmt(materialsTotal)}</span>
          )}
        </div>

        {materials.length > 0 && (
          <div className="space-y-3 mb-3">
            {materials.map((mat, idx) => {
              const lineTotal = (parseFloat(mat.quantity) || 0) * (parseFloat(mat.unit_cost) || 0);
              return (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mat.description}
                          onChange={(e) => updateMaterial(idx, 'description', e.target.value)}
                          className={INPUT_CLASS}
                          placeholder="Material description"
                        />
                        <VoiceInput onTranscript={(t) => updateMaterial(idx, 'description', t)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={mat.quantity}
                          onChange={(e) => updateMaterial(idx, 'quantity', e.target.value)}
                          onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateMaterial(idx, 'quantity', ''); }}
                          onBlur={(e) => { if (e.target.value === '') updateMaterial(idx, 'quantity', 0); }}
                          className={INPUT_CLASS}
                          placeholder="Qty"
                        />
                        <select
                          value={mat.unit}
                          onChange={(e) => updateMaterial(idx, 'unit', e.target.value)}
                          className={INPUT_CLASS}
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={mat.unit_cost}
                            onChange={(e) => updateMaterial(idx, 'unit_cost', e.target.value)}
                            onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateMaterial(idx, 'unit_cost', ''); }}
                            onBlur={(e) => { if (e.target.value === '') updateMaterial(idx, 'unit_cost', 0); }}
                            className={`${INPUT_CLASS} pl-6`}
                            placeholder="Cost"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMaterial(idx)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Receipt photo */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-500 cursor-pointer min-h-[36px]">
                        <Receipt className="h-3.5 w-3.5" />
                        {mat.receipt_preview ? 'Change receipt' : 'Add receipt'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleReceiptPhoto(idx, e)}
                          className="hidden"
                        />
                      </label>
                      {mat.receipt_preview && (
                        <img
                          src={mat.receipt_preview}
                          alt="Receipt"
                          className="h-8 w-8 object-cover rounded border border-slate-600"
                        />
                      )}
                    </div>
                    {lineTotal > 0 && (
                      <span className="text-sm text-amber-500 font-medium">{fmt(lineTotal)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={addMaterial}
          className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> Add Material
        </button>
      </div>

      {/* Labor */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <Users className="h-5 w-5 text-amber-500" />
          Labor
          {laborTotal > 0 && (
            <span className="text-sm font-normal text-amber-500 ml-auto">{fmt(laborTotal)}</span>
          )}
        </div>

        {labor.length > 0 && (
          <div className="space-y-3 mb-3">
            {labor.map((lab, idx) => {
              const lineTotal = (parseFloat(lab.hours) || 0) * (parseFloat(lab.hourly_rate) || 0);
              return (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* Worker picker */}
                        {workers.length > 0 ? (
                          <select
                            value={lab.worker_name}
                            onChange={(e) => updateLabor(idx, 'worker_name', e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">Select worker</option>
                            {workers.map((w) => (
                              <option key={w.name} value={w.name}>{w.name}</option>
                            ))}
                            <option value="_custom">Other...</option>
                          </select>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={lab.worker_name}
                              onChange={(e) => updateLabor(idx, 'worker_name', e.target.value)}
                              className={INPUT_CLASS}
                              placeholder="Worker name"
                            />
                            <VoiceInput onTranscript={(t) => updateLabor(idx, 'worker_name', t)} />
                          </div>
                        )}
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={lab.hours}
                          onChange={(e) => updateLabor(idx, 'hours', e.target.value)}
                          onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateLabor(idx, 'hours', ''); }}
                          onBlur={(e) => { if (e.target.value === '') updateLabor(idx, 'hours', 0); }}
                          className={INPUT_CLASS}
                          placeholder="Hours"
                        />
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$/hr</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={lab.hourly_rate}
                            onChange={(e) => updateLabor(idx, 'hourly_rate', e.target.value)}
                            onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateLabor(idx, 'hourly_rate', ''); }}
                            onBlur={(e) => { if (e.target.value === '') updateLabor(idx, 'hourly_rate', 0); }}
                            className={`${INPUT_CLASS} pl-10`}
                            placeholder="Rate"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={lab.description}
                          onChange={(e) => updateLabor(idx, 'description', e.target.value)}
                          className={INPUT_CLASS}
                          placeholder="Work description (optional)"
                        />
                        <VoiceInput onTranscript={(t) => updateLabor(idx, 'description', t)} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLabor(idx)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {lineTotal > 0 && (
                    <div className="text-right">
                      <span className="text-sm text-amber-500 font-medium">{fmt(lineTotal)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={addLabor}
          className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> Add Labor
        </button>
      </div>

      {/* Notes */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          Notes
        </div>
        <div className="flex gap-2 items-start">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${INPUT_CLASS} resize-y`}
            placeholder="Additional notes..."
          />
          <VoiceInput
            onTranscript={(t) => setNotes((prev) => (prev ? `${prev} ${t}` : t))}
            className="mt-1"
          />
        </div>
      </div>

      {/* Day Summary */}
      {(materialsTotal > 0 || laborTotal > 0) && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 mb-4">
          <div className="space-y-1 text-sm">
            {materialsTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Materials</span>
                <span className="text-slate-300">{fmt(materialsTotal)}</span>
              </div>
            )}
            {laborTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Labor</span>
                <span className="text-slate-300">{fmt(laborTotal)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-100 font-bold">Day Total</span>
              <span className="text-amber-500 font-bold text-lg">{fmt(materialsTotal + laborTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {editingLogId && (
        <div className="mb-4">
          <button
            type="button"
            onClick={cancelEditing}
            className="w-full flex items-center justify-center gap-2 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-transparent rounded-xl py-3 transition-colors text-sm min-h-[44px]"
          >
            <X className="h-4 w-4" /> Cancel Editing
          </button>
        </div>
      )}

      {/* Save Button — sticky at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 p-4 z-20">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !projectId || !date}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl py-4 transition-colors text-lg min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> {editingLogId ? 'Updating...' : 'Saving...'}</>
          ) : (
            <><Save className="h-5 w-5" /> {editingLogId ? 'Update Daily Log' : 'Save Daily Log'}</>
          )}
        </button>
      </div>
    </div>
  );
}
