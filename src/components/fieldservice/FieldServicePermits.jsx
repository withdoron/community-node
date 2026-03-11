import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Shield, Plus, X, Loader2, Save, ChevronDown, ChevronRight, ExternalLink, ClipboardCheck,
} from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';
const LABEL_CLASS = 'block text-slate-300 text-sm font-medium mb-1';

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
};

const PERMIT_STATUS = {
  not_applied: { label: 'Not Applied', color: 'bg-slate-500/20 text-slate-400' },
  applied:     { label: 'Applied',     color: 'bg-amber-500/20 text-amber-400' },
  issued:      { label: 'Issued',      color: 'bg-emerald-500/20 text-emerald-400' },
  expired:     { label: 'Expired',     color: 'bg-amber-500/20 text-amber-400' },
};

const INSPECTION_STATUS = {
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400' },
  pass:    { label: 'Pass',    color: 'bg-emerald-500/20 text-emerald-400' },
  fail:    { label: 'Fail',    color: 'bg-slate-500/20 text-slate-400' },
};

const EMPTY_PERMIT = {
  permit_type: 'building', permit_number: '', status: 'not_applied',
  applied_date: '', issued_date: '', expiry_date: '', notes: '',
};

const EMPTY_INSPECTION = {
  type: '', date: '', status: 'pending', inspector: '', notes: '',
};

function parseJSON(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

// ─── Permit Card ──────────────────────────────────
function PermitCard({ permit, profileId, projectId }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [inspectionData, setInspectionData] = useState({ ...EMPTY_INSPECTION, date: new Date().toISOString().split('T')[0] });

  const inspections = parseJSON(permit.inspections);
  const sc = PERMIT_STATUS[permit.status] || PERMIT_STATUS.not_applied;

  const addInspection = useMutation({
    mutationFn: async () => {
      const updated = [...inspections, { ...inspectionData, id: Date.now() }];
      return base44.entities.FSPermit.update(permit.id, {
        inspections: JSON.stringify(updated),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-permits', projectId]);
      toast.success('Inspection logged');
      setShowInspectionForm(false);
      setInspectionData({ ...EMPTY_INSPECTION, date: new Date().toISOString().split('T')[0] });
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const setInsp = (field, value) => setInspectionData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="bg-slate-800/50 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800 transition-colors min-h-[44px]">
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-100 capitalize">{permit.permit_type}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
          </div>
          {permit.permit_number && <p className="text-xs text-slate-500 mt-0.5">#{permit.permit_number}</p>}
        </div>
        <div className="text-right text-xs text-slate-500 flex-shrink-0">
          {permit.issued_date ? fmtDate(permit.issued_date) : permit.applied_date ? fmtDate(permit.applied_date) : ''}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Dates */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {permit.applied_date && <span>Applied: {fmtDate(permit.applied_date)}</span>}
            {permit.issued_date && <span>Issued: {fmtDate(permit.issued_date)}</span>}
            {permit.expiry_date && <span>Expires: {fmtDate(permit.expiry_date)}</span>}
          </div>
          {permit.notes && <p className="text-sm text-slate-400">{permit.notes}</p>}

          {/* eBuild link */}
          {permit.permit_number && (
            <a href="https://pdd.eugene-or.gov/buildingpermits/permitsearch"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400">
              View on eBuild <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Inspections */}
          <div className="border-t border-slate-700 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Inspections</p>
              <button type="button" onClick={() => setShowInspectionForm(true)}
                className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 min-h-[36px]">
                <Plus className="h-3 w-3" /> Log Inspection
              </button>
            </div>

            {inspections.length === 0 && !showInspectionForm && (
              <p className="text-xs text-slate-600">No inspections logged yet.</p>
            )}

            {inspections.length > 0 && (
              <div className="space-y-1.5">
                {inspections.map((insp, i) => {
                  const isc = INSPECTION_STATUS[insp.status] || INSPECTION_STATUS.pending;
                  return (
                    <div key={insp.id || i} className="bg-slate-900/50 rounded-lg p-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-200">{insp.type || 'Inspection'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${isc.color}`}>{isc.label}</span>
                        </div>
                        <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
                          {insp.date && <span>{fmtDate(insp.date)}</span>}
                          {insp.inspector && <span>By: {insp.inspector}</span>}
                        </div>
                        {insp.notes && <p className="text-xs text-slate-500 mt-0.5">{insp.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Inspection form */}
            {showInspectionForm && (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-300">Log Inspection</p>
                  <button type="button" onClick={() => setShowInspectionForm(false)}
                    className="p-1 text-slate-500 hover:text-amber-500"><X className="h-3 w-3" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Type</label>
                    <input type="text" className={INPUT_CLASS} value={inspectionData.type}
                      onChange={(e) => setInsp('type', e.target.value)} placeholder="e.g., Framing" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Date</label>
                    <input type="date" className={INPUT_CLASS} value={inspectionData.date}
                      onChange={(e) => setInsp('date', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Status</label>
                    <select className={INPUT_CLASS} value={inspectionData.status}
                      onChange={(e) => setInsp('status', e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Inspector</label>
                    <input type="text" className={INPUT_CLASS} value={inspectionData.inspector}
                      onChange={(e) => setInsp('inspector', e.target.value)} placeholder="Name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Notes</label>
                  <input type="text" className={INPUT_CLASS} value={inspectionData.notes}
                    onChange={(e) => setInsp('notes', e.target.value)} placeholder="Optional" />
                </div>
                <button type="button"
                  disabled={!inspectionData.type.trim() || addInspection.isLoading}
                  onClick={() => addInspection.mutate()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm min-h-[44px] disabled:opacity-50">
                  {addInspection.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Inspection'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────
export default function FieldServicePermits({ projectId, profileId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_PERMIT);

  const { data: permits = [], isLoading } = useQuery({
    queryKey: ['fs-permits', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const list = await base44.entities.FSPermit.filter({ project_id: projectId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!projectId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.FSPermit.create({
        project_id: projectId,
        profile_id: profileId,
        permit_type: formData.permit_type,
        permit_number: formData.permit_number,
        status: formData.status,
        applied_date: formData.applied_date || null,
        issued_date: formData.issued_date || null,
        expiry_date: formData.expiry_date || null,
        notes: formData.notes,
        inspections: '[]',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-permits', projectId]);
      toast.success('Permit added');
      setShowForm(false);
      setFormData(EMPTY_PERMIT);
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-bold text-slate-100">Permits & Inspections</h3>
        </div>
        <button type="button" onClick={() => { setFormData(EMPTY_PERMIT); setShowForm(true); }}
          className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 min-h-[44px]">
          <Plus className="h-4 w-4" /> Add Permit
        </button>
      </div>

      {/* Add permit form */}
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">New Permit</p>
            <button type="button" onClick={() => setShowForm(false)}
              className="p-1 text-slate-500 hover:text-amber-500"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Permit Type</label>
              <select className={INPUT_CLASS} value={formData.permit_type}
                onChange={(e) => set('permit_type', e.target.value)}>
                <option value="building">Building</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="mechanical">Mechanical</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Status</label>
              <select className={INPUT_CLASS} value={formData.status}
                onChange={(e) => set('status', e.target.value)}>
                <option value="not_applied">Not Applied</option>
                <option value="applied">Applied</option>
                <option value="issued">Issued</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Permit Number</label>
            <input type="text" className={INPUT_CLASS} value={formData.permit_number}
              onChange={(e) => set('permit_number', e.target.value)} placeholder="e.g., BLD-2026-001" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(formData.status === 'applied' || formData.status === 'issued' || formData.status === 'expired') && (
              <div>
                <label className={LABEL_CLASS}>Applied Date</label>
                <input type="date" className={INPUT_CLASS} value={formData.applied_date}
                  onChange={(e) => set('applied_date', e.target.value)} />
              </div>
            )}
            {(formData.status === 'issued' || formData.status === 'expired') && (
              <div>
                <label className={LABEL_CLASS}>Issued Date</label>
                <input type="date" className={INPUT_CLASS} value={formData.issued_date}
                  onChange={(e) => set('issued_date', e.target.value)} />
              </div>
            )}
            {formData.status === 'expired' && (
              <div>
                <label className={LABEL_CLASS}>Expiry Date</label>
                <input type="date" className={INPUT_CLASS} value={formData.expiry_date}
                  onChange={(e) => set('expiry_date', e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Notes</label>
            <input type="text" className={INPUT_CLASS} value={formData.notes}
              onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes" />
          </div>

          <button type="button"
            disabled={saveMutation.isLoading}
            onClick={() => saveMutation.mutate()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm min-h-[44px] disabled:opacity-50">
            {saveMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Permit</>}
          </button>
        </div>
      )}

      {/* Permit list */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
        </div>
      )}

      {!isLoading && permits.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-2">No permits tracked yet.</p>
      )}

      {!isLoading && permits.length > 0 && (
        <div className="space-y-2">
          {permits.map((permit) => (
            <PermitCard key={permit.id} permit={permit} profileId={profileId} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
}
