import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Cloud, Download, Check, Link2, Loader2,
} from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return d; }
};

function getTasks(log) {
  const t = log?.tasks_completed;
  if (Array.isArray(t)) return t;
  if (typeof t === 'string') {
    const s = t.trim();
    if (s.startsWith('[')) {
      try { const p = JSON.parse(t); return Array.isArray(p) ? p : [t]; }
      catch { return t.split('\n').filter(Boolean); }
    }
    return t.split('\n').filter(Boolean);
  }
  return [];
}

export default function FieldServiceReport({ logId, profile, onBack }) {
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [labor, setLabor] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [project, setProject] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (logId) loadReport(logId);
  }, [logId]);

  const loadReport = async (id) => {
    setLoading(true);
    try {
      const [logList, matList, labList, photoList] = await Promise.all([
        base44.entities.FSDailyLog.filter({ id }).catch(() => []),
        base44.entities.FSMaterialEntry.filter({ daily_log_id: id }).catch(() => []),
        base44.entities.FSLaborEntry.filter({ daily_log_id: id }).catch(() => []),
        base44.entities.FSDailyPhoto.filter({ daily_log_id: id }).catch(() => []),
      ]);

      const theLog = Array.isArray(logList) && logList[0] ? logList[0] : null;
      if (!theLog) { setLoading(false); return; }

      setLog(theLog);
      setMaterials(Array.isArray(matList) ? matList : []);
      setLabor(Array.isArray(labList) ? labList : []);
      setPhotos(Array.isArray(photoList) ? photoList : []);

      if (theLog.project_id) {
        const projList = await base44.entities.FSProject.filter({ id: theLog.project_id }).catch(() => []);
        setProject(Array.isArray(projList) && projList[0] ? projList[0] : null);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `${profile?.business_name || 'Field Service'} - ${project?.name || 'Report'} - ${fmtDate(log?.date)}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 1000);
    }, 150);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?fieldservice=${profile?.id}&report=${logId}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Log not found</p>
        {onBack && (
          <button type="button" onClick={onBack} className="text-amber-500 hover:text-amber-400 text-sm mt-4 min-h-[44px]">
            <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
          </button>
        )}
      </div>
    );
  }

  const tasks = getTasks(log);
  const materialsTotal = materials.reduce((s, m) => s + (m.total_cost || 0), 0);
  const laborTotal = labor.reduce((s, l) => s + (l.total_cost || 0), 0);
  const dayTotal = materialsTotal + laborTotal;

  return (
    <div className="max-w-3xl mx-auto pb-24 print:p-0 print:max-w-none">
      {/* Back + toolbar — hidden in print */}
      <div className="mb-4 print:hidden">
        {onBack && (
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
      </div>

      <div className="bg-slate-900 rounded-xl p-3 flex flex-wrap gap-3 items-center justify-center mb-6 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors min-h-[44px]"
        >
          <Download className="h-4 w-4" /> Print / Save PDF
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors min-h-[44px]"
        >
          {linkCopied ? (
            <><Check className="h-4 w-4 text-emerald-400" /> Copied!</>
          ) : (
            <><Link2 className="h-4 w-4" /> Copy Link</>
          )}
        </button>
      </div>

      {/* Report Content */}
      <article className="report-content">
        {/* Header */}
        <header className="mb-8 print:mb-6">
          <div className="flex items-center gap-4">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover print:border print:border-gray-300" />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold text-slate-100 print:text-black">
                {profile?.business_name || 'Field Service'}
              </h1>
              <p className="text-amber-500 text-lg font-medium mt-1 print:text-amber-600">
                Daily Progress Report
              </p>
            </div>
          </div>
          {(profile?.license_number || profile?.phone || profile?.email) && (
            <p className="text-slate-500 text-sm mt-2 print:text-gray-500">
              {[
                profile.license_number && `License ${profile.license_number}`,
                profile.phone,
                profile.email,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="mt-3 space-y-0.5 text-slate-400 text-sm print:text-gray-600">
            <p>Date: {fmtDate(log.date)}</p>
            {log.day_number && <p>Day: {String(log.day_number).startsWith('Day ') ? log.day_number : `Day ${log.day_number}`}</p>}
            <p>Project: {project?.name ?? '—'}</p>
            {project?.client_name && <p>Client: {project.client_name}</p>}
            {project?.address && <p>Address: {project.address}</p>}
          </div>
          {log.weather && (
            <div className="inline-flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 text-slate-400 text-sm mt-3 print:bg-gray-100 print:text-gray-600">
              <Cloud className="h-4 w-4" />
              <span>{log.weather}</span>
            </div>
          )}
        </header>

        {/* Photos */}
        {photos.length > 0 && (
          <section className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-lg font-bold text-slate-100 mb-3 print:text-black">Photos</h2>
            <div className="grid grid-cols-2 gap-4">
              {photos.map((p, i) => {
                const photoUrl = typeof p.photo === 'object' && p.photo?.url ? p.photo.url : (p.photo || '');
                return (
                  <div key={i} className="break-inside-avoid">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={p.caption || 'Photo'}
                        className="w-full max-h-64 object-cover rounded-lg border border-slate-700 print:border-gray-300"
                      />
                    ) : (
                      <div className="w-full aspect-square max-h-64 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-slate-500 text-sm">
                        No image
                      </div>
                    )}
                    {(p.caption || p.phase) && (
                      <p className="text-slate-400 text-sm italic mt-1 print:text-gray-600">
                        {[p.phase, p.caption].filter(Boolean).join(' — ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Work Completed */}
        {tasks.length > 0 && (
          <section className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-lg font-bold text-slate-100 mb-3 print:text-black">Work Completed</h2>
            <ul className="space-y-1 text-slate-300 text-sm print:text-gray-800 list-none pl-0">
              {tasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 print:bg-amber-600" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Materials */}
        {materials.length > 0 && (
          <section className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-lg font-bold text-slate-100 mb-3 print:text-black">Materials Used</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 text-xs uppercase print:bg-gray-200 print:text-black">
                    <th className="text-left py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Description</th>
                    <th className="text-right py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Qty</th>
                    <th className="text-left py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Unit</th>
                    <th className="text-right py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Unit Cost</th>
                    <th className="text-right py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-slate-900 print:bg-white' : 'bg-slate-950/50 print:bg-gray-50'}>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-100 print:text-black">{m.description}</td>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black text-right">{m.quantity}</td>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black">{m.unit}</td>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black text-right">{fmt(m.unit_cost)}</td>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black text-right">{fmt(m.total_cost)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800 font-bold print:bg-gray-200">
                    <td colSpan={4} className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black text-right">Subtotal</td>
                    <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-amber-500 font-bold text-right print:text-amber-700">{fmt(materialsTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Labor */}
        {labor.length > 0 && (
          <section className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-lg font-bold text-slate-100 mb-3 print:text-black">Labor</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 text-xs uppercase print:bg-gray-200 print:text-black">
                    <th className="text-left py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Worker</th>
                    <th className="text-right py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Hours</th>
                    <th className="text-right py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Rate</th>
                    <th className="text-right py-2 px-3 border border-slate-700 print:border-gray-300 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {labor.map((l, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-slate-900 print:bg-white' : 'bg-slate-950/50 print:bg-gray-50'}>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-100 print:text-black">{l.worker_name}</td>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black text-right">{l.hours}</td>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black text-right">{fmt(l.hourly_rate)}</td>
                      <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black text-right">{fmt(l.total_cost)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800 font-bold print:bg-gray-200">
                    <td colSpan={3} className="py-2 px-3 border border-slate-700 print:border-gray-300 text-slate-300 print:text-black text-right">Subtotal</td>
                    <td className="py-2 px-3 border border-slate-700 print:border-gray-300 text-amber-500 font-bold text-right print:text-amber-700">{fmt(laborTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Daily Summary */}
        <section className="mb-8 print:mb-6 print:break-inside-avoid">
          <h2 className="text-lg font-bold text-slate-100 mb-3 print:text-black">Daily Summary</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 print:bg-gray-50 print:border-gray-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-gray-600">Materials</span>
                <span className="text-slate-300 print:text-black">{fmt(materialsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-gray-600">Labor</span>
                <span className="text-slate-300 print:text-black">{fmt(laborTotal)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-700 print:border-gray-300">
                <span className="text-slate-100 font-bold print:text-black">Day Total</span>
                <span className="text-amber-500 font-bold text-lg print:text-amber-700">{fmt(dayTotal)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        {log.notes && (
          <section className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-lg font-bold text-slate-100 mb-3 print:text-black">Notes</h2>
            <p className="text-slate-300 print:text-gray-800 whitespace-pre-wrap">{log.notes}</p>
          </section>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-800 print:border-gray-300 print:pt-6">
          <p className="text-slate-500 text-sm print:text-gray-600">
            Report generated by {profile?.business_name || 'Field Service'} · {new Date().toLocaleDateString()}
          </p>
          <p className="text-slate-600 text-xs mt-1 print:text-gray-500">
            Powered by LocalLane
          </p>
        </footer>
      </article>

      {/* Print Styles */}
      <style>{`
        @media print {
          nav, .app-header, .print\\:hidden, button, [class*="toolbar"] { display: none !important; }
          @page { margin: 0.5in; size: letter; }
          body { background: white !important; margin: 0; padding: 0; }
          .report-content { background: white !important; color: #111827 !important; }
          .report-content * { color: #111827 !important; }
          .report-content .text-amber-500, .report-content .text-amber-600 { color: #b45309 !important; }
          .report-content h2 { font-size: 14pt !important; font-weight: 700 !important; }
          .report-content table { width: 100% !important; border-collapse: collapse !important; }
          .report-content thead tr { background: #1e293b !important; }
          .report-content thead th { color: white !important; }
          .report-content [class*="bg-slate"] { background: transparent !important; }
          .report-content [class*="border-slate"] { border-color: #e5e7eb !important; }
        }
      `}</style>
    </div>
  );
}
