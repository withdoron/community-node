import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, X, Loader2, Camera, Shield, MessageSquare, Send } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
};

function parseJSON(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

export default function FieldServiceClientPortal({ project, profile, onBack }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const brandColor = profile?.brand_color || '#f59e0b';

  // ─── Queries ────────────────────────────────────
  const { data: payments = [] } = useQuery({
    queryKey: ['fs-payments', project?.id],
    queryFn: async () => {
      const list = await base44.entities.FSPayment.filter({ project_id: project.id });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!project?.id,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['fs-client-photos', project?.id],
    queryFn: async () => {
      const list = await base44.entities.FSDailyPhoto.filter({ project_id: project.id });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!project?.id,
  });

  const { data: permits = [] } = useQuery({
    queryKey: ['fs-permits', project?.id],
    queryFn: async () => {
      const list = await base44.entities.FSPermit.filter({ project_id: project.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!project?.id,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['fs-client-logs', project?.id],
    queryFn: async () => {
      const list = await base44.entities.FSDailyLog.filter({ project_id: project.id });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!project?.id,
  });

  const { data: estimate } = useQuery({
    queryKey: ['fs-client-estimate', project?.estimate_id],
    queryFn: async () => {
      if (!project?.estimate_id) return null;
      const list = await base44.entities.FSEstimate.filter({ id: project.estimate_id });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!project?.estimate_id,
  });

  // ─── Derived ────────────────────────────────────
  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === 'received' || p.status === 'cleared')
      .reduce((s, p) => s + (p.amount || 0), 0),
    [payments]
  );
  const referenceTotal = estimate?.total || project?.total_budget || 0;
  const balance = referenceTotal - totalPaid;
  const paidPct = referenceTotal > 0 ? Math.min(100, (totalPaid / referenceTotal) * 100) : 0;

  const dayCount = logs.length;
  const firstLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const daysSinceStart = firstLog?.date
    ? Math.ceil((Date.now() - new Date(firstLog.date + 'T12:00:00').getTime()) / 86400000)
    : 0;

  const photoUrls = useMemo(() =>
    photos.map((p) => ({
      ...p,
      url: typeof p.photo === 'object' && p.photo?.url ? p.photo.url : (p.photo || ''),
    })).filter((p) => p.url),
    [photos]
  );

  const PERMIT_STATUS = {
    not_applied: 'Not Applied', applied: 'Applied', issued: 'Issued', expired: 'Expired',
  };

  if (!project) return null;

  return (
    <div className="space-y-4 pb-8">
      {/* Toolbar (hidden in print) */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Back to Project
        </button>
        <button type="button" onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 transition-colors text-sm min-h-[44px]">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {/* Client Portal Content */}
      <div className="bg-white text-slate-900 rounded-xl overflow-hidden print:rounded-none print:shadow-none">
        <style>{`@media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }`}</style>

        {/* Branded Header */}
        <div className="p-6 sm:p-8" style={{ borderBottom: `3px solid ${brandColor}` }}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt={profile?.business_name || ''} className="max-h-16 max-w-[200px] object-contain" />
              ) : null}
              <div>
                <h1 className="text-2xl font-bold" style={{ color: brandColor }}>
                  {profile?.business_name || 'Contractor'}
                </h1>
                {profile?.license_number && <p className="text-sm text-slate-500">Lic# {profile.license_number}</p>}
              </div>
            </div>
            <div className="text-right text-sm text-slate-600">
              {profile?.phone && <p><a href={`tel:${profile.phone.replace(/\D/g, '')}`} className="hover:text-slate-900 underline">{profile.phone}</a></p>}
              {profile?.email && <p><a href={`mailto:${profile.email}`} className="hover:text-slate-900 underline">{profile.email}</a></p>}
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="px-6 sm:px-8 py-6">
          <h2 className="text-xl font-bold text-slate-900">{project.name}</h2>
          {project.address && <p className="text-sm text-slate-500 mt-1">{project.address}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 capitalize">
              {project.status}
            </span>
            {daysSinceStart > 0 && (
              <span className="text-xs text-slate-500">Day {daysSinceStart} &middot; {dayCount} logs</span>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="px-6 sm:px-8 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Budget Progress */}
          {referenceTotal > 0 && (
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Budget Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Estimate Total</span>
                  <span className="font-bold">{fmt(referenceTotal)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${paidPct}%`, backgroundColor: brandColor }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{Math.round(paidPct)}% complete</span>
                  <span>{fmt(balance)} remaining</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          {payments.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Paid</span>
                  <span className="font-bold text-emerald-600">{fmt(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Balance</span>
                  <span className="font-bold" style={{ color: brandColor }}>{fmt(balance)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                  {payments.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex justify-between text-xs text-slate-500">
                      <span>{fmtDate(p.date)} &middot; <span className="capitalize">{p.type?.replace('_', ' ')}</span></span>
                      <span className="font-medium text-slate-700">{fmt(p.amount)}</span>
                    </div>
                  ))}
                  {payments.length > 4 && (
                    <p className="text-xs text-slate-400 text-center pt-1">+ {payments.length - 4} more payments</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Photos */}
          {photoUrls.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-5 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4" style={{ color: brandColor }} />
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Latest Photos</h3>
                <span className="text-xs text-slate-400 ml-auto">{photos.length} total</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {photoUrls.slice(0, 6).map((p, i) => (
                  <button key={p.id || i} type="button" onClick={() => setLightboxPhoto(p.url)}
                    className="aspect-square rounded-lg overflow-hidden border border-slate-200 relative">
                    <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                    {p.phase && (
                      <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1 py-0.5 rounded">
                        {p.phase}
                      </span>
                    )}
                  </button>
                ))}
                {photoUrls.length > 6 && (
                  <div className="aspect-square rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-medium text-slate-400">
                    +{photoUrls.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permits */}
          {permits.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4" style={{ color: brandColor }} />
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Permits</h3>
              </div>
              <div className="space-y-2">
                {permits.map((permit) => {
                  const inspections = parseJSON(permit.inspections);
                  const lastInsp = inspections.length > 0 ? inspections[inspections.length - 1] : null;
                  return (
                    <div key={permit.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium capitalize">{permit.permit_type}</span>
                        {permit.permit_number && <span className="text-xs text-slate-400 ml-1">#{permit.permit_number}</span>}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          permit.status === 'issued' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {PERMIT_STATUS[permit.status] || permit.status}
                        </span>
                        {lastInsp && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Last: {lastInsp.type} — {lastInsp.status}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Updates */}
          {logs.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Recent Updates</h3>
              <div className="space-y-3">
                {logs.slice(0, 5).map((log) => {
                  const taskPreview = (() => {
                    const t = log.tasks_completed;
                    if (!t) return '';
                    if (Array.isArray(t)) return t.join(', ').slice(0, 100);
                    if (typeof t === 'string') {
                      const s = t.trim();
                      if (s.startsWith('[')) {
                        try { const p = JSON.parse(s); return Array.isArray(p) ? p.join(', ').slice(0, 100) : s.slice(0, 100); }
                        catch { return s.slice(0, 100); }
                      }
                      return s.slice(0, 100);
                    }
                    return '';
                  })();
                  const logPhotos = photos.filter((p) => p.daily_log_id === log.id);
                  return (
                    <div key={log.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-500">{fmtDate(log.date)}</span>
                        {logPhotos.length > 0 && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Camera className="h-3 w-3" /> {logPhotos.length}
                          </span>
                        )}
                      </div>
                      {taskPreview && (
                        <p className="text-sm text-slate-600 line-clamp-2">{taskPreview}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50 text-center">
          <p className="text-xs text-slate-400">
            Powered by LocalLane — Connecting Eugene's community
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 print:hidden"
          onClick={() => setLightboxPhoto(null)} role="dialog" aria-modal="true">
          <button type="button" onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-amber-500 rounded-lg bg-slate-800/80"
            aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxPhoto} alt="" className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
