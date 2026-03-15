import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VoiceInput from './VoiceInput';
import {
  FileText, Plus, ArrowLeft, Pencil, Trash2, Loader2, Save,
  Search, Copy, FolderOpen, Send, Eye, Printer, X, DollarSign,
} from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';
const LABEL_CLASS = 'block text-slate-300 text-sm font-medium mb-1';

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: 'bg-slate-500/20 text-slate-400' },
  sent:     { label: 'Sent',     color: 'bg-amber-500/20 text-amber-400' },
  viewed:   { label: 'Viewed',   color: 'bg-blue-500/20 text-blue-400' },
  accepted: { label: 'Accepted', color: 'bg-emerald-500/20 text-emerald-400' },
  declined: { label: 'Declined', color: 'bg-slate-500/20 text-slate-500' },
  expired:  { label: 'Expired',  color: 'bg-slate-800/50 text-slate-600' },
};

const FILTER_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
];

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

const EMPTY_LINE_ITEM = { description: '', qty: 1, unit: 'ea', unit_cost: 0 };
const EMPTY_LABOR_ITEM = { description: '', hours: 0, rate: 0 };

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const EMPTY_ESTIMATE = {
  title: '', client_name: '', client_email: '', client_phone: '', client_address: '',
  project_id: '', date: '', valid_until: '',
  line_items: [{ ...EMPTY_LINE_ITEM }],
  labor_estimate: [{ ...EMPTY_LABOR_ITEM }],
  tax_rate: 0, terms: '', notes: '',
};

function generateEstimateNumber(existingEstimates) {
  const year = new Date().getFullYear();
  const prefix = `EST-${year}-`;
  const seqs = (existingEstimates || [])
    .map((e) => e.estimate_number || '')
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const next = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function calcTotals(lineItems, laborEstimate, taxRate) {
  const lineTotal = (lineItems || []).reduce(
    (s, item) => s + (parseFloat(item.qty) || 0) * (parseFloat(item.unit_cost) || 0), 0
  );
  const laborTotal = (laborEstimate || []).reduce(
    (s, item) => s + (parseFloat(item.hours) || 0) * (parseFloat(item.rate) || 0), 0
  );
  const subtotal = lineTotal + laborTotal;
  const taxAmount = subtotal * ((parseFloat(taxRate) || 0) / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount, lineTotal, laborTotal };
}

function parseJSON(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

// ═══════════════════════════════════════════════════
// Preview (client-facing branded estimate)
// ═══════════════════════════════════════════════════
function EstimatePreview({ estimate, profile, onBack, onEdit }) {
  const lineItems = parseJSON(estimate.line_items);
  const laborEst = parseJSON(estimate.labor_estimate).filter(
    (l) => l.description || (parseFloat(l.hours) || 0) > 0
  );
  const lineTotal = lineItems.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unit_cost) || 0), 0);
  const laborTotal = laborEst.reduce((s, i) => s + (parseFloat(i.hours) || 0) * (parseFloat(i.rate) || 0), 0);
  const brandColor = profile?.brand_color || '#f59e0b';

  return (
    <div className="space-y-4 pb-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 transition-colors text-sm min-h-[44px]">
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
          <button type="button" onClick={() => onEdit(estimate)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm min-h-[44px]">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      {/* Printable estimate */}
      <div className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 print:p-0 print:shadow-none print:rounded-none">
        <style>{`@media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
        }`}</style>

        {/* Contractor header */}
        <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: brandColor }}>
                {profile?.business_name || 'Business Name'}
              </h1>
              {profile?.license_number && <p className="text-sm text-slate-500">Lic# {profile.license_number}</p>}
              {profile?.service_area && <p className="text-sm text-slate-500">{profile.service_area}</p>}
            </div>
          </div>
          <div className="text-right text-sm text-slate-600">
            {profile?.phone && <p>{profile.phone}</p>}
            {profile?.email && <p>{profile.email}</p>}
          </div>
        </div>

        {/* Estimate info */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">ESTIMATE</h2>
            <p className="text-sm text-slate-500">{estimate.estimate_number}</p>
          </div>
          <div className="text-right text-sm">
            <p><span className="text-slate-500">Date:</span> {fmtDate(estimate.date)}</p>
            {estimate.valid_until && (
              <p><span className="text-slate-500">Valid Until:</span> {fmtDate(estimate.valid_until)}</p>
            )}
          </div>
        </div>

        {/* Client */}
        {estimate.client_name && (
          <div className="mb-6 bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Prepared For</p>
            <p className="font-semibold">{estimate.client_name}</p>
            {estimate.client_address && <p className="text-sm text-slate-600">{estimate.client_address}</p>}
            {estimate.client_email && <p className="text-sm text-slate-600"><a href={`mailto:${estimate.client_email}`} className="underline hover:text-slate-900">{estimate.client_email}</a></p>}
            {estimate.client_phone && <p className="text-sm text-slate-600"><a href={`tel:${estimate.client_phone.replace(/\D/g, '')}`} className="underline hover:text-slate-900">{estimate.client_phone}</a></p>}
          </div>
        )}

        {estimate.title && <h3 className="text-lg font-bold text-slate-900 mb-4">{estimate.title}</h3>}

        {/* Line items table */}
        {lineItems.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Materials & Services</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">Description</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-16">Qty</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-16">Unit</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-24">Rate</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => {
                  const amt = (parseFloat(item.qty) || 0) * (parseFloat(item.unit_cost) || 0);
                  return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2">{item.description || '\u2014'}</td>
                      <td className="text-right py-2">{item.qty}</td>
                      <td className="text-right py-2">{item.unit || 'ea'}</td>
                      <td className="text-right py-2">{fmt(item.unit_cost)}</td>
                      <td className="text-right py-2 font-medium">{fmt(amt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan="4" className="text-right py-2 text-slate-500 font-medium">Materials Subtotal</td>
                  <td className="text-right py-2 font-bold">{fmt(lineTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Labor table */}
        {laborEst.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Labor</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">Description</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-20">Hours</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-24">Rate</th>
                  <th className="text-right py-2 text-slate-500 font-medium w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {laborEst.map((item, i) => {
                  const amt = (parseFloat(item.hours) || 0) * (parseFloat(item.rate) || 0);
                  return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2">{item.description || '\u2014'}</td>
                      <td className="text-right py-2">{item.hours}</td>
                      <td className="text-right py-2">{fmt(item.rate)}</td>
                      <td className="text-right py-2 font-medium">{fmt(amt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan="3" className="text-right py-2 text-slate-500 font-medium">Labor Subtotal</td>
                  <td className="text-right py-2 font-bold">{fmt(laborTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t-2 border-slate-300 pt-4 mb-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{fmt(estimate.subtotal)}</span></div>
              {(estimate.tax_rate || 0) > 0 && (
                <div className="flex justify-between"><span className="text-slate-500">Tax ({estimate.tax_rate}%)</span><span>{fmt(estimate.tax_amount)}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2 mt-2" style={{ color: brandColor }}>
                <span>Total</span><span>{fmt(estimate.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        {estimate.terms && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Terms & Conditions</h4>
            <p className="text-sm text-slate-600 whitespace-pre-line">{estimate.terms}</p>
          </div>
        )}

        {/* Notes */}
        {estimate.notes && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Notes</h4>
            <p className="text-sm text-slate-600 whitespace-pre-line">{estimate.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 mt-8 text-center">
          <p className="text-xs text-slate-400">Powered by LocalLane</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Form (Builder / Editor)
// ═══════════════════════════════════════════════════
function EstimateForm({ profile, currentUser, estimates, projects, editingId, initialData, onDone }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialData);

  const formTotals = useMemo(
    () => calcTotals(formData.line_items, formData.labor_estimate, formData.tax_rate),
    [formData.line_items, formData.labor_estimate, formData.tax_rate]
  );

  const saveMutation = useMutation({
    mutationFn: async ({ status }) => {
      const lineItems = (formData.line_items || []).filter(
        (item) => item.description.trim() || (parseFloat(item.unit_cost) || 0) > 0
      );
      const laborEst = (formData.labor_estimate || []).filter(
        (item) => item.description.trim() || (parseFloat(item.hours) || 0) > 0
      );
      const totals = calcTotals(lineItems, laborEst, formData.tax_rate);

      const payload = {
        profile_id: profile.id,
        user_id: currentUser?.id,
        title: formData.title,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        client_address: formData.client_address,
        project_id: formData.project_id || null,
        date: formData.date,
        valid_until: formData.valid_until || null,
        line_items: lineItems,
        labor_estimate: laborEst,
        subtotal: totals.subtotal,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        tax_amount: totals.taxAmount,
        total: totals.total,
        terms: formData.terms,
        notes: formData.notes,
        status: status || 'draft',
      };
      if (status === 'sent') payload.sent_at = new Date().toISOString();

      if (editingId) {
        return base44.entities.FSEstimate.update(editingId, payload);
      }
      payload.estimate_number = generateEstimateNumber(estimates);
      return base44.entities.FSEstimate.create(payload);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['fs-estimates', profile?.id]);
      const verb = vars.status === 'sent' ? 'saved & marked sent' : (editingId ? 'updated' : 'created');
      toast.success(`Estimate ${verb}`);
      onDone();
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  // ─── Line item helpers ──────────────────────────
  const updateLineItem = (idx, field, value) => {
    setFormData((prev) => {
      const items = [...prev.line_items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, line_items: items };
    });
  };
  const addLineItem = () => setFormData((prev) => ({ ...prev, line_items: [...prev.line_items, { ...EMPTY_LINE_ITEM }] }));
  const removeLineItem = (idx) => setFormData((prev) => ({
    ...prev, line_items: prev.line_items.length > 1 ? prev.line_items.filter((_, i) => i !== idx) : prev.line_items,
  }));

  // ─── Labor helpers ──────────────────────────────
  const updateLaborItem = (idx, field, value) => {
    setFormData((prev) => {
      const items = [...prev.labor_estimate];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, labor_estimate: items };
    });
  };
  const addLaborItem = () => setFormData((prev) => ({
    ...prev, labor_estimate: [...prev.labor_estimate, { ...EMPTY_LABOR_ITEM, rate: profile?.hourly_rate || 0 }],
  }));
  const removeLaborItem = (idx) => setFormData((prev) => ({
    ...prev, labor_estimate: prev.labor_estimate.length > 1 ? prev.labor_estimate.filter((_, i) => i !== idx) : prev.labor_estimate,
  }));

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={onDone}
        className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px]">
        <ArrowLeft className="h-4 w-4" /> Back to Estimates
      </button>

      <h2 className="text-xl font-bold text-slate-100">
        {editingId ? 'Edit Estimate' : 'New Estimate'}
      </h2>

      {/* Title & Date */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div>
          <label className={LABEL_CLASS}>Title *</label>
          <input type="text" className={INPUT_CLASS} value={formData.title}
            onChange={(e) => set('title', e.target.value)} placeholder="e.g., Kitchen Renovation Quote" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Date</label>
            <input type="date" className={INPUT_CLASS} value={formData.date}
              onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Valid Until</label>
            <input type="date" className={INPUT_CLASS} value={formData.valid_until}
              onChange={(e) => set('valid_until', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>Link to Project (optional)</label>
          <select className={INPUT_CLASS} value={formData.project_id}
            onChange={(e) => set('project_id', e.target.value)}>
            <option value="">None</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Client Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Name</label>
            <input type="text" className={INPUT_CLASS} value={formData.client_name}
              onChange={(e) => set('client_name', e.target.value)} placeholder="Client name" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Email</label>
            <input type="email" className={INPUT_CLASS} value={formData.client_email}
              onChange={(e) => set('client_email', e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Phone</label>
            <input type="tel" className={INPUT_CLASS} value={formData.client_phone}
              onChange={(e) => set('client_phone', formatPhone(e.target.value))} placeholder="(541) 555-0000" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Address</label>
            <input type="text" className={INPUT_CLASS} value={formData.client_address}
              onChange={(e) => set('client_address', e.target.value)} placeholder="123 Main St, Eugene, OR" />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Materials & Services</h3>
        {formData.line_items.map((item, idx) => (
          <div key={idx} className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input type="text" className={INPUT_CLASS} value={item.description}
                  onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                  placeholder="Item description" />
              </div>
              <VoiceInput onTranscript={(t) => updateLineItem(idx, 'description', (item.description ? item.description + ' ' : '') + t)} />
              {formData.line_items.length > 1 && (
                <button type="button" onClick={() => removeLineItem(idx)}
                  className="p-2 text-slate-500 hover:text-amber-500 min-h-[44px]">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-500">Qty</label>
                <input type="number" className={INPUT_CLASS} value={item.qty}
                  onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                  onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateLineItem(idx, 'qty', ''); }}
                  onBlur={(e) => { if (e.target.value === '') updateLineItem(idx, 'qty', 0); }}
                  min="0" step="any" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Unit</label>
                <select className={INPUT_CLASS} value={item.unit || 'ea'}
                  onChange={(e) => updateLineItem(idx, 'unit', e.target.value)}>
                  <option value="ea">ea</option>
                  <option value="hr">hr</option>
                  <option value="sqft">sqft</option>
                  <option value="lnft">lnft</option>
                  <option value="lot">lot</option>
                  <option value="day">day</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Unit Cost</label>
                <input type="number" className={INPUT_CLASS} value={item.unit_cost}
                  onChange={(e) => updateLineItem(idx, 'unit_cost', e.target.value)}
                  onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateLineItem(idx, 'unit_cost', ''); }}
                  onBlur={(e) => { if (e.target.value === '') updateLineItem(idx, 'unit_cost', 0); }}
                  min="0" step="0.01" />
              </div>
            </div>
            <div className="text-right text-sm text-slate-300">
              Line total: <span className="font-medium text-amber-500">
                {fmt((parseFloat(item.qty) || 0) * (parseFloat(item.unit_cost) || 0))}
              </span>
            </div>
          </div>
        ))}
        <button type="button" onClick={addLineItem}
          className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 min-h-[44px]">
          <Plus className="h-4 w-4" /> Add Line Item
        </button>
      </div>

      {/* Labor Estimate */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Labor Estimate</h3>
        {formData.labor_estimate.map((item, idx) => (
          <div key={idx} className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input type="text" className={INPUT_CLASS} value={item.description}
                  onChange={(e) => updateLaborItem(idx, 'description', e.target.value)}
                  placeholder="Labor description" />
              </div>
              <VoiceInput onTranscript={(t) => updateLaborItem(idx, 'description', (item.description ? item.description + ' ' : '') + t)} />
              {formData.labor_estimate.length > 1 && (
                <button type="button" onClick={() => removeLaborItem(idx)}
                  className="p-2 text-slate-500 hover:text-amber-500 min-h-[44px]">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Hours</label>
                <input type="number" className={INPUT_CLASS} value={item.hours}
                  onChange={(e) => updateLaborItem(idx, 'hours', e.target.value)}
                  onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateLaborItem(idx, 'hours', ''); }}
                  onBlur={(e) => { if (e.target.value === '') updateLaborItem(idx, 'hours', 0); }}
                  min="0" step="0.5" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Rate ($/hr)</label>
                <input type="number" className={INPUT_CLASS} value={item.rate}
                  onChange={(e) => updateLaborItem(idx, 'rate', e.target.value)}
                  onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateLaborItem(idx, 'rate', ''); }}
                  onBlur={(e) => { if (e.target.value === '') updateLaborItem(idx, 'rate', 0); }}
                  min="0" step="0.01" />
              </div>
            </div>
            <div className="text-right text-sm text-slate-300">
              Labor total: <span className="font-medium text-amber-500">
                {fmt((parseFloat(item.hours) || 0) * (parseFloat(item.rate) || 0))}
              </span>
            </div>
          </div>
        ))}
        <button type="button" onClick={addLaborItem}
          className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 min-h-[44px]">
          <Plus className="h-4 w-4" /> Add Labor Line
        </button>
      </div>

      {/* Totals & Tax */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Totals</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>Materials subtotal</span><span>{fmt(formTotals.lineTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Labor subtotal</span><span>{fmt(formTotals.laborTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-2">
            <span>Subtotal</span><span className="font-medium">{fmt(formTotals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Tax Rate</span>
            <div className="flex items-center gap-1">
              <input type="number"
                className="w-20 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.tax_rate} onChange={(e) => set('tax_rate', e.target.value)}
                onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('tax_rate', ''); }}
                onBlur={(e) => { if (e.target.value === '') set('tax_rate', 0); }}
                min="0" max="100" step="0.1" />
              <span className="text-slate-400">%</span>
            </div>
          </div>
          {formTotals.taxAmount > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>Tax</span><span>{fmt(formTotals.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-amber-500 border-t border-slate-700 pt-2">
            <span>Total</span><span>{fmt(formTotals.total)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Notes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div>
          <label className={LABEL_CLASS}>Terms & Conditions</label>
          <textarea className={`${INPUT_CLASS} min-h-[80px]`} rows="3" value={formData.terms}
            onChange={(e) => set('terms', e.target.value)}
            placeholder="Payment terms, warranty info, etc." />
        </div>
        <div>
          <label className={LABEL_CLASS}>Notes</label>
          <textarea className={`${INPUT_CLASS} min-h-[60px]`} rows="2" value={formData.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Internal notes or additional details" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 sticky bottom-0 bg-slate-950 py-3 -mx-1 px-1">
        <button type="button"
          disabled={!formData.title.trim() || saveMutation.isLoading}
          onClick={() => saveMutation.mutate({ status: 'draft' })}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50 disabled:pointer-events-none">
          {saveMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>
        <button type="button"
          disabled={!formData.title.trim() || saveMutation.isLoading}
          onClick={() => saveMutation.mutate({ status: 'sent' })}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50 disabled:pointer-events-none">
          {saveMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Save & Send
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
export default function FieldServiceEstimates({ profile, currentUser }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | form | preview
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formInitial, setFormInitial] = useState(null);
  const [previewEstimate, setPreviewEstimate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [convertConfirm, setConvertConfirm] = useState(null);

  // ─── Query: All estimates ───────────────────────
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['fs-estimates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSEstimate.filter({ profile_id: profile.id });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Projects for linking ────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Filtered list ──────────────────────────────
  const filtered = useMemo(() => {
    let list = estimates;
    if (filter !== 'all') list = list.filter((e) => e.status === filter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.client_name || '').toLowerCase().includes(q) ||
        (e.estimate_number || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [estimates, filter, searchTerm]);

  // ─── Mutations ──────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FSEstimate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-estimates', profile?.id]);
      toast.success('Estimate deleted');
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  const convertMutation = useMutation({
    mutationFn: async (estimate) => {
      const project = await base44.entities.FSProject.create({
        profile_id: profile.id,
        user_id: currentUser?.id,
        name: estimate.title || 'Untitled Project',
        client_name: estimate.client_name,
        client_phone: estimate.client_phone,
        client_email: estimate.client_email,
        address: estimate.client_address,
        total_budget: estimate.total || 0,
        status: 'active',
        estimate_id: estimate.id,
        notes: `Created from estimate ${estimate.estimate_number}`,
      });
      await base44.entities.FSEstimate.update(estimate.id, {
        project_id: project.id,
        status: 'accepted',
        responded_at: new Date().toISOString(),
      });
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-estimates', profile?.id]);
      queryClient.invalidateQueries(['fs-projects', profile?.id]);
      toast.success('Project created from estimate');
      setConvertConfirm(null);
    },
    onError: (err) => toast.error(`Conversion failed: ${err.message}`),
  });

  // ─── Navigation helpers ─────────────────────────
  const openNewEstimate = useCallback(() => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    setFormInitial({
      ...EMPTY_ESTIMATE,
      terms: profile?.default_terms || '',
      date: new Date().toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
      labor_estimate: [{ ...EMPTY_LABOR_ITEM, rate: profile?.hourly_rate || 0 }],
    });
    setEditingId(null);
    setView('form');
  }, [profile?.default_terms, profile?.hourly_rate]);

  const openEditEstimate = useCallback((est) => {
    let lineItems = parseJSON(est.line_items);
    if (lineItems.length === 0) lineItems = [{ ...EMPTY_LINE_ITEM }];
    let laborEst = parseJSON(est.labor_estimate);
    if (laborEst.length === 0) laborEst = [{ ...EMPTY_LABOR_ITEM }];

    setFormInitial({
      title: est.title || '', client_name: est.client_name || '',
      client_email: est.client_email || '', client_phone: est.client_phone || '',
      client_address: est.client_address || '', project_id: est.project_id || '',
      date: est.date || new Date().toISOString().split('T')[0],
      valid_until: est.valid_until || '',
      line_items: lineItems, labor_estimate: laborEst,
      tax_rate: est.tax_rate || 0, terms: est.terms || '', notes: est.notes || '',
    });
    setEditingId(est.id);
    setView('form');
  }, []);

  const duplicateEstimate = useCallback((est) => {
    let lineItems = parseJSON(est.line_items);
    if (lineItems.length === 0) lineItems = [{ ...EMPTY_LINE_ITEM }];
    let laborEst = parseJSON(est.labor_estimate);
    if (laborEst.length === 0) laborEst = [{ ...EMPTY_LABOR_ITEM }];

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    setFormInitial({
      title: `${est.title || 'Estimate'} (Copy)`,
      client_name: est.client_name || '', client_email: est.client_email || '',
      client_phone: est.client_phone || '', client_address: est.client_address || '',
      project_id: '', date: new Date().toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
      line_items: lineItems, labor_estimate: laborEst,
      tax_rate: est.tax_rate || 0, terms: est.terms || '', notes: est.notes || '',
    });
    setEditingId(null);
    setView('form');
    toast.success('Estimate duplicated — edit and save as new');
  }, []);

  const backToList = useCallback(() => {
    setView('list');
    setEditingId(null);
    setFormInitial(null);
    setPreviewEstimate(null);
  }, []);

  // ═══════════════════════════════════════════════
  // Preview view
  // ═══════════════════════════════════════════════
  if (view === 'preview' && previewEstimate) {
    return (
      <EstimatePreview
        estimate={previewEstimate}
        profile={profile}
        onBack={backToList}
        onEdit={(est) => openEditEstimate(est)}
      />
    );
  }

  // ═══════════════════════════════════════════════
  // Form view
  // ═══════════════════════════════════════════════
  if (view === 'form' && formInitial) {
    return (
      <EstimateForm
        profile={profile}
        currentUser={currentUser}
        estimates={estimates}
        projects={projects}
        editingId={editingId}
        initialData={formInitial}
        onDone={backToList}
      />
    );
  }

  // ═══════════════════════════════════════════════
  // List view
  // ═══════════════════════════════════════════════
  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-100">Estimates</h2>
        <button type="button" onClick={openNewEstimate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px]">
          <Plus className="h-4 w-4" /> New Estimate
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input type="text" className={`${INPUT_CLASS} pl-9`} value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search estimates..." />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_CHIPS.map((chip) => (
          <button key={chip.value} type="button"
            onClick={() => setFilter(chip.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
              filter === chip.value
                ? 'bg-amber-500 text-black'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}>
            {chip.label}
            {chip.value !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                {estimates.filter((e) => e.status === chip.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <FileText className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {searchTerm || filter !== 'all' ? 'No estimates match your filters.' : 'No estimates yet.'}
          </p>
          <p className="text-slate-500 text-sm mt-1">Create your first estimate to get started.</p>
        </div>
      )}

      {/* Estimate cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((est) => {
            const sc = STATUS_CONFIG[est.status] || STATUS_CONFIG.draft;
            return (
              <article key={est.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{est.title || 'Untitled Estimate'}</p>
                    <p className="text-xs text-slate-500">{est.estimate_number}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${sc.color} ${est.status === 'declined' ? 'line-through' : ''}`}>
                    {sc.label}
                  </span>
                </div>

                {est.client_name && <p className="text-sm text-slate-400 mb-1">{est.client_name}</p>}

                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs text-slate-500">{fmtDate(est.date)}</span>
                  <span className="text-amber-500 font-bold text-sm">{fmt(est.total)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-wrap">
                  <button type="button" onClick={() => { setPreviewEstimate(est); setView('preview'); }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 min-h-[36px] transition-colors">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  <button type="button" onClick={() => openEditEstimate(est)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 min-h-[36px] transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button type="button" onClick={() => duplicateEstimate(est)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 min-h-[36px] transition-colors">
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  {est.status === 'accepted' && !est.project_id && (
                    <button type="button" onClick={() => setConvertConfirm(est)}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 min-h-[36px] transition-colors">
                      <FolderOpen className="h-3.5 w-3.5" /> Convert to Project
                    </button>
                  )}
                  {est.project_id && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <FolderOpen className="h-3.5 w-3.5" /> Linked to project
                    </span>
                  )}
                  <div className="flex-1" />
                  {deleteConfirm === est.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Delete?</span>
                      <button type="button" onClick={() => deleteMutation.mutate(est.id)}
                        className="text-xs text-amber-500 hover:text-amber-400 min-h-[36px]">Yes</button>
                      <button type="button" onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-slate-400 hover:text-slate-300 min-h-[36px]">No</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setDeleteConfirm(est.id)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 min-h-[36px] transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Convert to Project modal */}
      {convertConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setConvertConfirm(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Convert to Project</h3>
            <p className="text-sm text-slate-400 mb-4">
              Create a new project from <span className="text-amber-500">{convertConfirm.title}</span> with
              a budget of {fmt(convertConfirm.total)}?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConvertConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors text-sm min-h-[44px]">
                Cancel
              </button>
              <button type="button"
                disabled={convertMutation.isLoading}
                onClick={() => convertMutation.mutate(convertConfirm)}
                className="flex-1 flex items-center justify-center px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50">
                {convertMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
