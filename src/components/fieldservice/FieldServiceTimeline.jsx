import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FieldServiceReport from './FieldServiceReport';
import {
  ArrowLeft, MapPin, Cloud, X, Loader2, FileText, Camera,
} from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400',
  quoting: 'bg-blue-500/20 text-blue-400',
  paused: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-slate-500/20 text-slate-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtLongDate = (d) => {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(d + (d.includes('T') ? '' : 'T12:00:00')));
  } catch { return d; }
};

function getTasks(log) {
  const t = log?.tasks_completed;
  if (Array.isArray(t)) return t;
  if (typeof t === 'string') {
    const s = t.trim();
    if (s.startsWith('[')) {
      try { const p = JSON.parse(t); return Array.isArray(p) ? p : []; }
      catch { return t.split('\n').filter(Boolean); }
    }
    return t.split('\n').filter(Boolean);
  }
  return [];
}

export default function FieldServiceTimeline({ projectId, profile, onBack }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [reportLogId, setReportLogId] = useState(null);

  // ─── Query: Project ───────────────────────────
  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['fs-project-detail', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const list = await base44.entities.FSProject.filter({ id: projectId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!projectId,
  });

  // ─── Query: Logs ──────────────────────────────
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['fs-timeline-logs', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const list = await base44.entities.FSDailyLog.filter({ project_id: projectId });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!projectId,
  });

  // ─── Query: Materials for all logs ────────────
  const { data: allMaterials = [] } = useQuery({
    queryKey: ['fs-timeline-materials', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const list = await base44.entities.FSMaterialEntry.filter({ project_id: projectId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!projectId,
  });

  // ─── Query: Labor for all logs ────────────────
  const { data: allLabor = [] } = useQuery({
    queryKey: ['fs-timeline-labor', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const list = await base44.entities.FSLaborEntry.filter({ project_id: projectId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!projectId,
  });

  // ─── Query: Photos for all logs ───────────────
  const { data: allPhotos = [] } = useQuery({
    queryKey: ['fs-timeline-photos', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const list = await base44.entities.FSDailyPhoto.filter({ project_id: projectId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!projectId,
  });

  // ─── Derived: Per-log details ─────────────────
  const logDetails = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      const mats = allMaterials.filter((m) => m.daily_log_id === log.id);
      const labs = allLabor.filter((l) => l.daily_log_id === log.id);
      const photos = allPhotos.filter((p) => p.daily_log_id === log.id);
      const matSum = mats.reduce((s, m) => s + (m.total_cost || 0), 0);
      const labSum = labs.reduce((s, l) => s + (l.total_cost || 0), 0);
      map[log.id] = {
        materials: mats,
        labor: labs,
        photos,
        materialsTotal: matSum,
        laborTotal: labSum,
        dayTotal: matSum + labSum,
        laborHours: labs.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0),
      };
    });
    return map;
  }, [logs, allMaterials, allLabor, allPhotos]);

  const totals = useMemo(() => {
    const matTotal = allMaterials.reduce((s, m) => s + (m.total_cost || 0), 0);
    const labTotal = allLabor.reduce((s, l) => s + (l.total_cost || 0), 0);
    return { materials: matTotal, labor: labTotal };
  }, [allMaterials, allLabor]);

  const loading = projLoading || logsLoading;

  // If showing a report, delegate to FieldServiceReport
  if (reportLogId) {
    return (
      <FieldServiceReport
        logId={reportLogId}
        profile={profile}
        onBack={() => setReportLogId(null)}
      />
    );
  }

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No project selected.</p>
        {onBack && (
          <button type="button" onClick={onBack} className="text-amber-500 hover:text-amber-400 text-sm mt-4 min-h-[44px]">
            <ArrowLeft className="h-4 w-4 inline mr-1" /> Back to Projects
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Project not found.</p>
        {onBack && (
          <button type="button" onClick={onBack} className="text-amber-500 hover:text-amber-400 text-sm mt-4 min-h-[44px]">
            <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
          </button>
        )}
      </div>
    );
  }

  const grandTotal = totals.materials + totals.labor;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        {onBack && (
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm mb-3 min-h-[44px]">
            <ArrowLeft className="h-4 w-4" /> Back to project
          </button>
        )}
        <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
        {project.client_name && <p className="text-slate-400 text-sm mt-0.5">{project.client_name}</p>}
        {project.address && (
          <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{project.address}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Running totals */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-slate-400 text-sm">Total Materials</p>
          <p className="text-slate-100 text-lg font-bold">{fmt(totals.materials)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Total Labor</p>
          <p className="text-slate-100 text-lg font-bold">{fmt(totals.labor)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Grand Total</p>
          <p className="text-amber-500 text-lg font-bold">{fmt(grandTotal)}</p>
        </div>
      </div>

      {/* Budget progress */}
      {project.total_budget > 0 && (
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Budget Progress</span>
            <span className="text-slate-100">{fmt(grandTotal)} of {fmt(project.total_budget)}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${grandTotal > project.total_budget * 0.9 ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min((grandTotal / project.total_budget) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline Feed */}
      {logs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400">No daily logs yet.</p>
          <p className="text-slate-500 text-sm mt-1">Start logging from the Daily Log tab.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const detail = logDetails[log.id] || {};
            const photos = detail.photos || [];
            const photoUrls = photos
              .map((p) => (typeof p.photo === 'object' && p.photo?.url ? p.photo.url : (p.photo || '')))
              .filter(Boolean);
            const tasks = getTasks(log);
            const dayTotal = detail.dayTotal ?? 0;
            const matCount = (detail.materials || []).length;
            const laborHrs = detail.laborHours ?? 0;

            return (
              <article
                key={log.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-colors"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className="text-slate-400 text-sm">{fmtLongDate(log.date)}</p>
                  {log.day_number && (
                    <p className="text-slate-400 text-sm">
                      {String(log.day_number).startsWith('Day ') ? log.day_number : `Day ${log.day_number}`}
                    </p>
                  )}
                </div>

                {log.weather && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm mb-2">
                    <Cloud className="h-4 w-4" />
                    <span>{log.weather}</span>
                  </div>
                )}

                {/* Photos */}
                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {photoUrls.slice(0, 4).map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxPhoto(url)}
                        className="aspect-square rounded-lg overflow-hidden border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {photoUrls.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setLightboxPhoto(photoUrls[4])}
                        className="aspect-square rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm font-medium"
                      >
                        +{photoUrls.length - 4} more
                      </button>
                    )}
                  </div>
                )}

                {/* Tasks */}
                {tasks.length > 0 && (
                  <ul className="list-disc list-inside text-slate-300 text-sm space-y-0.5 mb-2">
                    {tasks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}

                {/* Costs */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300 text-sm mb-2">
                  {matCount > 0 && (
                    <span>Materials: {fmt(detail.materialsTotal)} ({matCount} items)</span>
                  )}
                  {(detail.labor || []).length > 0 && (
                    <span>Labor: {fmt(detail.laborTotal)} ({laborHrs} hrs)</span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReportLogId(log.id)}
                    className="text-slate-400 hover:text-amber-500 text-sm transition-colors flex items-center gap-1 min-h-[36px]"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Report
                  </button>
                  {dayTotal > 0 && (
                    <span className="text-amber-500 font-bold">{fmt(dayTotal)}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo full size"
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-amber-500 rounded-lg bg-slate-800/80 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxPhoto}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
