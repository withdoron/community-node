import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VoiceInput from './VoiceInput';
import ClientSelector from './ClientSelector';
import { SignatureDisplay } from '@/components/shared/SigningFlow';
import {
  FileText, Plus, ArrowLeft, Pencil, Trash2, Loader2, Save,
  Search, Copy, FolderOpen, Send, Eye, Printer, X, DollarSign, Link2,
  ChevronUp, ChevronDown, Lock, Shield,
} from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';
const LABEL_CLASS = 'block text-slate-300 text-sm font-medium mb-1';

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: 'bg-slate-500/20 text-slate-400' },
  sent:     { label: 'Sent',     color: 'bg-amber-500/20 text-amber-400' },
  viewed:   { label: 'Viewed',   color: 'bg-blue-500/20 text-blue-400' },
  accepted: { label: 'Accepted', color: 'bg-emerald-500/20 text-emerald-400' },
  declined: { label: 'Declined', color: 'bg-rose-700/20 text-rose-400' },
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

// ═══ Unified line item model ═══════════════════════

const CATEGORIES = [
  { value: 'materials',      label: 'Materials',      badge: 'bg-amber-500/20 text-amber-400' },
  { value: 'labor',          label: 'Labor',          badge: 'bg-sky-500/20 text-sky-400' },
  { value: 'subcontractor',  label: 'Subcontractor',  badge: 'bg-violet-500/20 text-violet-400' },
  { value: 'fee',            label: 'Fee',            badge: 'bg-slate-500/20 text-slate-400' },
  { value: 'other',          label: 'Other',          badge: 'bg-slate-600/20 text-slate-500' },
];
const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

// ═══ Trade categories for Xactimate format ═══════

const DEFAULT_TRADE_CATEGORIES = [
  'General Conditions', 'Demolition', 'Framing', 'Roofing', 'Siding & Exterior',
  'Windows & Doors', 'Electrical', 'Plumbing', 'HVAC', 'Insulation',
  'Drywall', 'Painting', 'Flooring', 'Concrete & Foundation',
  'Cabinetry & Countertops', 'Appliances', 'Cleanup & Hauling', 'Other',
];

function getTradeCategories(profile) {
  const tc = profile?.trade_categories_json;
  if (Array.isArray(tc) && tc.length > 0) return tc;
  if (tc && typeof tc === 'object' && Array.isArray(tc.items) && tc.items.length > 0) return tc.items;
  return DEFAULT_TRADE_CATEGORIES.map((name, i) => ({ id: `cat_${i}`, name, order: i }));
}

let _nextItemId = 1;
function newItemId() { return `item_${Date.now()}_${_nextItemId++}`; }

const EMPTY_UNIFIED_ITEM = {
  id: '', category: 'materials', trade_category_id: '', description: '', quantity: 1, unit_price: 0, amount: 0, sub_name: '',
};

function makeItem(overrides) {
  return { ...EMPTY_UNIFIED_ITEM, id: newItemId(), ...overrides };
}

const EMPTY_ESTIMATE = {
  title: '', client_id: '', client_name: '', client_email: '', client_phone: '', client_address: '',
  project_id: '', date: '', valid_until: '',
  line_items: [makeItem()],
  overhead_profit_pct: 0, tax_rate: 0, other_amount: 0,
  payment_terms: '', prepared_by: '',
  terms: '', notes: '',
  client_show_breakdown: false,
  is_insurance_estimate: false,
};

const PAYMENT_TERMS_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'due_on_receipt', label: 'Due on Receipt', days: 0 },
  { value: 'net_10', label: 'Net 10', days: 10 },
  { value: 'net_15', label: 'Net 15', days: 15 },
  { value: 'net_30', label: 'Net 30', days: 30 },
  { value: 'net_45', label: 'Net 45', days: 45 },
  { value: 'net_60', label: 'Net 60', days: 60 },
  { value: 'custom', label: 'Custom', days: null },
];

function calcDueDate(estDate, termsValue) {
  if (!estDate || !termsValue || termsValue === 'custom') return '';
  const opt = PAYMENT_TERMS_OPTIONS.find((o) => o.value === termsValue);
  if (!opt || opt.days == null) return '';
  const d = new Date(estDate + 'T12:00:00');
  d.setDate(d.getDate() + opt.days);
  return d.toISOString().split('T')[0];
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

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

// ═══ Read-time migration: old format → unified ═════

function parseJSON(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

/**
 * Migrate old separate line_items + labor_estimate to unified items.
 * New format: items have { id, category, description, quantity, unit_price, amount, sub_name }
 * Old materials format: { description, qty, unit, unit_cost }
 * Old labor format: { description, hours, rate }
 */
function migrateLineItems(rawLineItems, rawLaborEstimate) {
  const items = parseJSON(rawLineItems);
  const labor = parseJSON(rawLaborEstimate);

  // Check if already in unified format (first item has 'category' field)
  if (items.length > 0 && items[0].category) {
    return items.map((it) => ({
      ...EMPTY_UNIFIED_ITEM,
      ...it,
      id: it.id || newItemId(),
    }));
  }

  // Migrate old materials → unified
  const migratedMaterials = items
    .filter((it) => it.description || (parseFloat(it.unit_cost || it.unit_price) || 0) > 0)
    .map((it) => makeItem({
      category: 'materials',
      description: it.description || '',
      quantity: parseFloat(it.qty || it.quantity) || 1,
      unit_price: parseFloat(it.unit_cost || it.unit_price) || 0,
      amount: (parseFloat(it.qty || it.quantity) || 1) * (parseFloat(it.unit_cost || it.unit_price) || 0),
    }));

  // Migrate old labor → unified
  const migratedLabor = labor
    .filter((it) => it.description || (parseFloat(it.hours) || 0) > 0)
    .map((it) => {
      const hrs = parseFloat(it.hours) || 0;
      const rate = parseFloat(it.rate) || 0;
      return makeItem({
        category: 'labor',
        description: it.description || '',
        quantity: hrs,
        unit_price: rate,
        amount: hrs * rate,
      });
    });

  const merged = [...migratedMaterials, ...migratedLabor];
  return merged.length > 0 ? merged : [makeItem()];
}

// ═══ Calc totals from unified items ════════════════

function calcTotals(items, overheadProfitPct, taxRate, otherAmount) {
  const subtotal = (items || []).reduce((s, it) => {
    const amt = parseFloat(it.amount) || ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0));
    return s + amt;
  }, 0);
  const opAmount = subtotal * ((parseFloat(overheadProfitPct) || 0) / 100);
  const beforeTax = subtotal + opAmount + (parseFloat(otherAmount) || 0);
  const taxAmount = beforeTax * ((parseFloat(taxRate) || 0) / 100);
  return { subtotal, opAmount, beforeTax, taxAmount, total: beforeTax + taxAmount };
}

// ═══════════════════════════════════════════════════
// Preview (client-facing branded estimate)
// ═══════════════════════════════════════════════════
function EstimatePreview({ estimate, profile, onBack, onEdit, onConvert, projects, clients }) {
  const items = migrateLineItems(estimate.line_items, estimate.labor_estimate);
  const totals = calcTotals(items, estimate.overhead_profit_pct, estimate.tax_rate, estimate.other_amount);
  const brandColor = profile?.brand_color || '#f59e0b';
  const showBreakdown = estimate.client_show_breakdown === true;
  const isInsurance = estimate.is_insurance_estimate === true;
  const tradeCategories = getTradeCategories(profile);
  const tradeCatMap = Object.fromEntries(tradeCategories.map((tc) => [tc.id, tc]));

  // Group items by trade category (for insurance format)
  const groupedByTrade = useMemo(() => {
    if (!isInsurance) return null;
    const groups = new Map();
    for (const item of items) {
      const tcId = item.trade_category_id || '';
      const tc = tradeCatMap[tcId] || { id: tcId, name: 'Other', order: 999 };
      if (!groups.has(tc.name)) groups.set(tc.name, { tc, items: [] });
      groups.get(tc.name).items.push(item);
    }
    // Sort by trade category order
    return Array.from(groups.entries())
      .sort((a, b) => (a[1].tc.order ?? 999) - (b[1].tc.order ?? 999));
  }, [isInsurance, items, tradeCatMap]);

  // Live client data from FSClient (source of truth), fallback to inline copies
  const liveClient = estimate.client_id ? (clients || []).find((c) => c.id === estimate.client_id) : null;
  const clientName = liveClient?.name || estimate.client_name;
  const clientEmail = liveClient?.email || estimate.client_email;
  const clientPhone = liveClient?.phone || estimate.client_phone;
  const clientAddress = liveClient?.address || estimate.client_address;

  // Find linked project name
  const linkedProject = estimate.project_id ? (projects || []).find((p) => p.id === estimate.project_id) : null;

  return (
    <div className="space-y-4 pb-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 transition-colors text-sm min-h-[44px]">
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
          {(estimate.status === 'draft' || estimate.status === 'sent') && !estimate.project_id && (
            <button type="button" onClick={() => onConvert(estimate)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px]">
              <FolderOpen className="h-4 w-4" /> Accept & Create Project
            </button>
          )}
          {estimate.status === 'accepted' && (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium min-h-[44px]">
              <Lock className="h-4 w-4" /> Approved
            </span>
          )}
          <button type="button" onClick={() => {
              const url = `${window.location.origin}/client-portal?estimate=${estimate.id}`;
              window.open(url, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent transition-colors text-sm min-h-[44px]">
            <Eye className="h-4 w-4" /> Preview as Client
          </button>
          {estimate.status === 'sent' && !estimate.signature_data && (
            <button type="button" onClick={() => {
                const url = `${window.location.origin}/client-portal?estimate=${estimate.id}&sign=true`;
                navigator.clipboard.writeText(url).then(
                  () => toast.success('Signing link copied! Send this to the client.'),
                  () => toast.error('Failed to copy link')
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors text-sm min-h-[44px]">
              <Shield className="h-4 w-4" /> Request Signature
            </button>
          )}
          {estimate.status !== 'accepted' && (
            <button type="button" onClick={() => onEdit(estimate)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm min-h-[44px]">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Printable estimate */}
      <div className="estimate-print-area bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 print:p-6 print:shadow-none print:rounded-none print:border-none">
        <style>{`@media print {
          body * { visibility: hidden !important; }
          .estimate-print-area, .estimate-print-area * { visibility: visible !important; }
          .estimate-print-area { position: absolute; top: 0; left: 0; width: 100%; font-size: ${isInsurance ? '9pt' : '10pt'}; }
          @page { margin: 0.5in; size: letter; }
          body { background: white !important; margin: 0; padding: 0; }
          .print-avoid-break { page-break-inside: avoid; }
          .print-break-before { page-break-before: auto; }
        }`}</style>

        {/* Contractor header */}
        <div className="flex justify-between items-start mb-8 pb-6 bg-slate-50 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 px-6 sm:px-8 pt-6 sm:pt-8 rounded-t-xl print:rounded-none print:bg-white" style={{ borderBottom: `3px solid ${brandColor}` }}>
          <div className="flex items-center gap-4">
            {profile?.logo_url && (
              <img src={profile.logo_url} alt={profile?.business_name || ''} className="max-h-16 max-w-[200px] object-contain" />
            )}
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

        {/* Estimate info + Client — two-column layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: brandColor }}>{isInsurance ? 'INSURANCE ESTIMATE' : 'ESTIMATE'}</h2>
            <div className="text-sm space-y-0.5">
              <p><span className="text-slate-500">No:</span> {estimate.estimate_number}</p>
              <p><span className="text-slate-500">Date:</span> {fmtDate(estimate.date)}</p>
              {estimate.payment_terms && (
                <p><span className="text-slate-500">Terms:</span> {(PAYMENT_TERMS_OPTIONS.find((o) => o.value === estimate.payment_terms) || {}).label || estimate.payment_terms}</p>
              )}
              {estimate.valid_until && <p><span className="text-slate-500">Due Date:</span> {fmtDate(estimate.valid_until)}</p>}
              {linkedProject && <p><span className="text-slate-500">Project:</span> {linkedProject.name}</p>}
              <p><span className="text-slate-500">Prepared By:</span> {estimate.prepared_by || profile?.owner_name || '—'}</p>
            </div>
          </div>
          {clientName && (
            <div className="bg-slate-50 rounded-lg p-4 print:bg-white print:border print:border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Customer</p>
              <p className="font-semibold">{clientName}</p>
              {clientAddress && <p className="text-sm text-slate-600">{clientAddress}</p>}
              {clientPhone && <p className="text-sm text-slate-600">{formatPhone(clientPhone)}</p>}
              {clientEmail && <p className="text-sm text-slate-600">{clientEmail}</p>}
            </div>
          )}
        </div>

        {estimate.title && <h3 className="text-lg font-bold text-slate-900 mb-4">{estimate.title}</h3>}

        {/* Line items table — only when breakdown visible */}
        {showBreakdown && items.length > 0 && (
          <div className="mb-6">
            {isInsurance && groupedByTrade ? (
              /* ─── Xactimate grouped format ─── */
              <div className="space-y-4">
                {groupedByTrade.map(([tradeName, group]) => {
                  const catSubtotal = group.items.reduce((s, it) => s + (parseFloat(it.amount) || ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0))), 0);
                  return (
                    <div key={tradeName} className="print-avoid-break">
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1 pb-1 border-b" style={{ borderColor: brandColor }}>
                        {tradeName}
                      </h4>
                      <table className="w-full text-sm">
                        <tbody>
                          {group.items.map((item, i) => {
                            const amt = parseFloat(item.amount) || ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
                            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;
                            return (
                              <tr key={item.id || i} className={i % 2 === 1 ? 'bg-slate-50 print:bg-slate-50' : ''}>
                                <td className="text-center py-1.5 w-14">{item.quantity}</td>
                                <td className="py-1.5">
                                  <span>{item.description || '\u2014'}</span>
                                  {item.category !== 'materials' && (
                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${cat.badge}`}>
                                      {cat.label}
                                    </span>
                                  )}
                                  {item.sub_name && <p className="text-xs text-slate-500 italic mt-0.5">{item.sub_name}</p>}
                                </td>
                                <td className="text-right py-1.5 w-28">{parseFloat(item.unit_price) ? fmt(item.unit_price) : ''}</td>
                                <td className="text-right py-1.5 w-28 font-medium">{fmt(amt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200">
                            <td colSpan={3} className="text-right py-1.5 text-xs text-slate-500 font-medium pr-2">Subtotal:</td>
                            <td className="text-right py-1.5 w-28 text-xs font-semibold">{fmt(catSubtotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ─── Standard flat table ─── */
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: brandColor }}>
                      <th className="text-center py-2 text-slate-500 font-medium w-14">QTY</th>
                      <th className="text-left py-2 text-slate-500 font-medium">DESCRIPTION</th>
                      <th className="text-right py-2 text-slate-500 font-medium w-28">UNIT PRICE</th>
                      <th className="text-right py-2 text-slate-500 font-medium w-28">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const amt = parseFloat(item.amount) || ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
                      const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;
                      return (
                        <tr key={item.id || i} className={i % 2 === 1 ? 'bg-slate-50 print:bg-slate-50' : ''}>
                          <td className="text-center py-2">{item.quantity}</td>
                          <td className="py-2">
                            <span>{item.description || '\u2014'}</span>
                            {item.category !== 'materials' && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${cat.badge}`}>
                                {cat.label}
                              </span>
                            )}
                            {item.sub_name && <p className="text-xs text-slate-500 italic mt-0.5">{item.sub_name}</p>}
                          </td>
                          <td className="text-right py-2">{parseFloat(item.unit_price) ? fmt(item.unit_price) : ''}</td>
                          <td className="text-right py-2 font-medium">{fmt(amt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="print-avoid-break border-t-2 border-slate-200 pt-4 mb-6">
          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              {showBreakdown && (
                <>
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
                  {(parseFloat(estimate.overhead_profit_pct) || 0) > 0 && (
                    <div className="flex justify-between"><span className="text-slate-500">O&P ({estimate.overhead_profit_pct}%)</span><span>{fmt(totals.opAmount)}</span></div>
                  )}
                  {(parseFloat(estimate.other_amount) || 0) > 0 && (
                    <div className="flex justify-between"><span className="text-slate-500">Other</span><span>{fmt(estimate.other_amount)}</span></div>
                  )}
                  {(parseFloat(estimate.tax_rate) || 0) > 0 && (
                    <div className="flex justify-between"><span className="text-slate-500">Tax ({estimate.tax_rate}%)</span><span>{fmt(totals.taxAmount)}</span></div>
                  )}
                </>
              )}
              <div className={`flex justify-between text-lg font-bold ${showBreakdown ? 'border-t border-slate-200 pt-2 mt-2' : ''}`} style={{ color: brandColor }}>
                <span>Total</span><span>{fmt(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        {estimate.terms && (
          <div className="print-avoid-break mb-6">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">This Proposal Includes the Conditions Noted</h4>
            <p className="text-sm text-slate-600 whitespace-pre-line">{estimate.terms}</p>
          </div>
        )}

        {/* Signature block */}
        {estimate.signature_data ? (
          <div className="print-avoid-break mb-6 mt-8">
            <SignatureDisplay signatureData={estimate.signature_data} darkMode={false} />
          </div>
        ) : (
          <div className="print-avoid-break mb-6 border border-slate-200 rounded-lg p-5 mt-8">
            <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Sign Below to Accept Quote</p>
            <div className="flex justify-between items-end mb-6">
              <span className="text-sm text-slate-500">Total:</span>
              <span className="text-lg font-bold" style={{ color: brandColor }}>{fmt(totals.total)}</span>
            </div>
            <div className="space-y-4">
              <div className="border-b border-slate-300 pb-1">
                <p className="text-xs text-slate-400 uppercase">Authorized Representative</p>
              </div>
              <div className="border-b border-slate-300 pb-1">
                <p className="text-xs text-slate-400 uppercase">Date</p>
              </div>
            </div>
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
        <div className="border-t border-slate-200 pt-6 mt-8 text-center space-y-2">
          <p className="text-sm text-slate-500">Thank you for your business</p>
          {(profile?.phone || profile?.email) && (
            <p className="text-xs text-slate-400">
              {profile?.phone && <span>{profile.phone}</span>}
              {profile?.phone && profile?.email && <span className="mx-2">&middot;</span>}
              {profile?.email && <span>{profile.email}</span>}
            </p>
          )}
          <p className="text-xs text-slate-300 mt-1">Powered by LocalLane</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Form (Builder / Editor)
// ═══════════════════════════════════════════════════
function EstimateForm({ profile, currentUser, estimates, projects, clients, editingId, initialData, onDone, features }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialData);

  const formTotals = useMemo(
    () => calcTotals(formData.line_items, formData.overhead_profit_pct, formData.tax_rate, formData.other_amount),
    [formData.line_items, formData.overhead_profit_pct, formData.tax_rate, formData.other_amount]
  );

  const saveMutation = useMutation({
    mutationFn: async ({ status }) => {
      const validItems = (formData.line_items || [])
        .filter((it) => (it.description || '').trim() || (parseFloat(it.unit_price) || 0) > 0)
        .map((it) => ({
          ...it,
          amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
        }));
      const totals = calcTotals(validItems, formData.overhead_profit_pct, formData.tax_rate, formData.other_amount);

      // Sync inline client fields from live FSClient data (source of truth)
      let cName = formData.client_name;
      let cEmail = formData.client_email;
      let cPhone = formData.client_phone;
      let cAddr = formData.client_address;
      if (formData.client_id) {
        const live = clients.find((c) => c.id === formData.client_id);
        if (live) {
          cName = live.name || cName;
          cEmail = live.email || cEmail;
          cPhone = live.phone || cPhone;
          cAddr = live.address || cAddr;
        }
      }

      const payload = {
        profile_id: profile.id,
        user_id: currentUser?.id,
        title: formData.title,
        client_id: formData.client_id || null,
        client_name: cName,
        client_email: cEmail,
        client_phone: cPhone,
        client_address: cAddr,
        project_id: formData.project_id || null,
        date: formData.date,
        valid_until: formData.valid_until || null,
        payment_terms: formData.payment_terms || '',
        prepared_by: formData.prepared_by || '',
        line_items: { items: validItems },
        labor_estimate: { items: [] }, // empty — kept for backward compat
        subtotal: totals.subtotal,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        tax_amount: totals.taxAmount,
        total: totals.total,
        overhead_profit_pct: parseFloat(formData.overhead_profit_pct) || 0,
        other_amount: parseFloat(formData.other_amount) || 0,
        terms: formData.terms,
        notes: formData.notes,
        status: status || 'draft',
        client_show_breakdown: formData.client_show_breakdown === true,
        is_insurance_estimate: formData.is_insurance_estimate === true,
      };
      if (status === 'sent') payload.sent_at = new Date().toISOString();

      if (editingId) {
        return base44.entities.FSEstimate.update(editingId, payload);
      }
      payload.estimate_number = generateEstimateNumber(estimates);
      return base44.entities.FSEstimate.create(payload);
    },
    onSuccess: (saved, vars) => {
      queryClient.invalidateQueries(['fs-estimates', profile?.id]);
      if (vars.status === 'sent' && vars._copyLink) {
        const estId = saved?.id || editingId;
        const url = `${window.location.origin}/client-portal?estimate=${estId}`;
        navigator.clipboard.writeText(url).then(
          () => toast.success('Estimate saved. Link copied to clipboard!'),
          () => toast.success('Estimate saved (could not copy link)'),
        );
      } else {
        const verb = vars.status === 'sent' ? 'saved & marked sent' : (editingId ? 'updated' : 'created');
        toast.success(`Estimate ${verb}`);
      }
      onDone();
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const tradeCategories = getTradeCategories(profile);

  // ─── Unified line item helpers ────────────────
  const updateItem = (idx, field, value) => {
    setFormData((prev) => {
      const items = [...prev.line_items];
      const updated = { ...items[idx], [field]: value };
      // Auto-calc amount when qty or unit_price change (unless amount was directly edited)
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = (parseFloat(field === 'quantity' ? value : updated.quantity) || 0) *
                         (parseFloat(field === 'unit_price' ? value : updated.unit_price) || 0);
      }
      items[idx] = updated;
      return { ...prev, line_items: items };
    });
  };
  const addItem = (category) => setFormData((prev) => ({
    ...prev, line_items: [...prev.line_items, makeItem({ category: category || 'materials' })],
  }));
  const insertItemAfter = (idx) => {
    const newItem = makeItem({ category: 'materials' });
    setFormData((prev) => {
      const items = [...prev.line_items];
      items.splice(idx + 1, 0, newItem);
      return { ...prev, line_items: items };
    });
    // Auto-focus the new item's description after render
    requestAnimationFrame(() => {
      const inputs = document.querySelectorAll('[data-line-item-desc]');
      inputs[idx + 1]?.focus();
    });
  };
  const removeItem = (idx) => setFormData((prev) => ({
    ...prev, line_items: prev.line_items.length > 1 ? prev.line_items.filter((_, i) => i !== idx) : prev.line_items,
  }));
  const moveItem = (idx, dir) => {
    setFormData((prev) => {
      const items = [...prev.line_items];
      const target = idx + dir;
      if (target < 0 || target >= items.length) return prev;
      [items[idx], items[target]] = [items[target], items[idx]];
      return { ...prev, line_items: items };
    });
  };

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
              onChange={(e) => {
                set('date', e.target.value);
                if (formData.payment_terms && formData.payment_terms !== 'custom') {
                  set('valid_until', calcDueDate(e.target.value, formData.payment_terms));
                }
              }} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Payment Terms</label>
            <select className={INPUT_CLASS} value={formData.payment_terms}
              onChange={(e) => {
                set('payment_terms', e.target.value);
                if (e.target.value && e.target.value !== 'custom' && formData.date) {
                  set('valid_until', calcDueDate(formData.date, e.target.value));
                }
              }}>
              {PAYMENT_TERMS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Due Date</label>
            <input type="date" className={INPUT_CLASS} value={formData.valid_until}
              onChange={(e) => set('valid_until', e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Prepared By</label>
            <input type="text" className={INPUT_CLASS} value={formData.prepared_by}
              onChange={(e) => set('prepared_by', e.target.value)}
              placeholder={profile?.owner_name || 'Your name'} />
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
        <ClientSelector
          clients={clients}
          selectedClientId={formData.client_id}
          onSelect={(clientId) => {
            const client = clients.find((c) => c.id === clientId);
            setFormData((prev) => ({
              ...prev,
              client_id: clientId,
              client_name: client?.name || prev.client_name,
              client_email: client?.email || prev.client_email,
              client_phone: client?.phone || prev.client_phone,
              client_address: client?.address || prev.client_address,
            }));
          }}
          onClientCreated={(client) => {
            setFormData((prev) => ({
              ...prev,
              client_id: client.id,
              client_name: client.name || '',
              client_email: client.email || '',
              client_phone: client.phone || '',
              client_address: client.address || '',
            }));
          }}
          profileId={profile?.id}
          currentUser={currentUser}
        />
        {/* Client view indicator */}
        <div className="flex items-center gap-2 py-2 px-1">
          <Eye className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">
            Client sees: {formData.client_show_breakdown ? 'Full breakdown' : 'Total only'}
          </span>
          <button type="button"
            onClick={() => set('client_show_breakdown', !formData.client_show_breakdown)}
            className="text-xs text-amber-500 hover:text-amber-400 ml-1">
            Change
          </button>
        </div>
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

      {/* ═══ Insurance Estimate Toggle — before line items so user sees trade dropdown ═══ */}
      {features?.insurance_work_enabled === true && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white">Insurance Estimate (Xactimate format)</p>
              <p className="text-xs text-slate-400 mt-0.5">Groups line items by trade category for adjusters</p>
            </div>
            <button
              type="button"
              onClick={() => set('is_insurance_estimate', !formData.is_insurance_estimate)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                formData.is_insurance_estimate ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-slate-100 transition-transform ${
                formData.is_insurance_estimate ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Unified Line Items ═══ */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Line Items</h3>

        {formData.line_items.map((item, idx) => {
          const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.materials;
          const computedAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
          return (
            <React.Fragment key={item.id || idx}>
              <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                {/* Row 1: category + description + voice + reorder + remove */}
                <div className="flex items-center gap-2">
                  <select
                    value={item.category || 'materials'}
                    onChange={(e) => updateItem(idx, 'category', e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[90px]"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {formData.is_insurance_estimate && (
                    <select
                      value={item.trade_category_id || ''}
                      onChange={(e) => updateItem(idx, 'trade_category_id', e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[80px] max-w-[120px]"
                    >
                      <option value="">Trade</option>
                      {tradeCategories.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
                    </select>
                  )}
                  <div className="flex-1">
                    <input type="text" data-line-item-desc className={INPUT_CLASS} value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Description" />
                  </div>
                  <VoiceInput onTranscript={(t) => updateItem(idx, 'description', (item.description ? item.description + ' ' : '') + t)} />
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                      className="text-slate-500 hover:text-amber-500 disabled:opacity-30 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === formData.line_items.length - 1}
                      className="text-slate-500 hover:text-amber-500 disabled:opacity-30 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  {formData.line_items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="p-2 text-slate-500 hover:text-amber-500 min-h-[44px]">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Sub name (only for subcontractor category) */}
                {item.category === 'subcontractor' && (
                  <div>
                    <label className="text-xs text-slate-500">Sub Name</label>
                    <input type="text" className={INPUT_CLASS} value={item.sub_name || ''}
                      onChange={(e) => updateItem(idx, 'sub_name', e.target.value)}
                      placeholder="e.g., Gastlin Gutters" />
                  </div>
                )}

                {/* Row 2: qty, unit price, amount */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Qty</label>
                    <input type="number" className={INPUT_CLASS} value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateItem(idx, 'quantity', ''); }}
                      onBlur={(e) => { if (e.target.value === '') updateItem(idx, 'quantity', 0); }}
                      min="0" step="any" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Unit Price</label>
                    <input type="number" className={INPUT_CLASS} value={item.unit_price}
                      onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                      onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateItem(idx, 'unit_price', ''); }}
                      onBlur={(e) => { if (e.target.value === '') updateItem(idx, 'unit_price', 0); }}
                      min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Amount</label>
                    <div className={`${INPUT_CLASS} flex items-center justify-end bg-slate-800/60 cursor-default`}>
                      {fmt(computedAmt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Insert-between button */}
              <button
                type="button"
                onClick={() => insertItemAfter(idx)}
                className="group flex items-center justify-center w-full py-1 -my-1"
                title="Insert line item here"
              >
                <span className="flex-1 h-px bg-slate-800 group-hover:bg-amber-500/40 transition-colors" />
                <span className="flex items-center justify-center h-6 w-6 rounded-full border border-slate-700 text-slate-600 group-hover:border-amber-500 group-hover:text-amber-500 transition-colors">
                  <Plus className="h-3 w-3" />
                </span>
                <span className="flex-1 h-px bg-slate-800 group-hover:bg-amber-500/40 transition-colors" />
              </button>
            </React.Fragment>
          );
        })}

        {/* Add buttons */}
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => addItem('materials')}
            className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 min-h-[44px]">
            <Plus className="h-4 w-4" /> Add Line Item
          </button>
          <button type="button" onClick={() => addItem('labor')}
            className="flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300 min-h-[44px]">
            <Plus className="h-4 w-4" /> Labor
          </button>
          <button type="button" onClick={() => addItem('subcontractor')}
            className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 min-h-[44px]">
            <Plus className="h-4 w-4" /> Subcontractor
          </button>
          <button type="button" onClick={() => addItem('fee')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 min-h-[44px]">
            <Plus className="h-4 w-4" /> Fee
          </button>
        </div>
      </div>

      {/* ═══ Summary ═══ */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>Subtotal</span><span className="font-medium">{fmt(formTotals.subtotal)}</span>
          </div>

          {/* O&P — always visible (important for insurance work) */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">O&P (Overhead & Profit)</span>
            <div className="flex items-center gap-1">
              <input type="number"
                className="w-20 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.overhead_profit_pct} onChange={(e) => set('overhead_profit_pct', e.target.value)}
                onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('overhead_profit_pct', ''); }}
                onBlur={(e) => { if (e.target.value === '') set('overhead_profit_pct', 0); }}
                min="0" max="100" step="0.5" />
              <span className="text-slate-400">%</span>
            </div>
          </div>
          {formTotals.opAmount > 0 && (
            <div className="flex justify-between text-slate-400 pl-4">
              <span>O&P Amount</span><span>{fmt(formTotals.opAmount)}</span>
            </div>
          )}

          {/* Tax */}
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
            <div className="flex justify-between text-slate-400 pl-4">
              <span>Tax Amount</span><span>{fmt(formTotals.taxAmount)}</span>
            </div>
          )}

          {/* Other */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Other</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">$</span>
              <input type="number"
                className="w-24 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.other_amount} onChange={(e) => set('other_amount', e.target.value)}
                onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('other_amount', ''); }}
                onBlur={(e) => { if (e.target.value === '') set('other_amount', 0); }}
                min="0" step="0.01" />
            </div>
          </div>

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

      {/* Client Visibility Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Show cost breakdown to client</p>
            <p className="text-xs text-slate-400 mt-0.5">When off, clients see total only on the estimate</p>
          </div>
          <button
            type="button"
            onClick={() => set('client_show_breakdown', !formData.client_show_breakdown)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              formData.client_show_breakdown ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-slate-100 transition-transform ${
              formData.client_show_breakdown ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 sticky bottom-0 bg-slate-950 py-3 -mx-1 px-1">
        <button type="button"
          disabled={!formData.title.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate({ status: 'draft' })}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50 disabled:pointer-events-none">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>
        <button type="button"
          disabled={!formData.title.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate({ status: 'sent', _copyLink: true })}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50 disabled:pointer-events-none">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Save & Copy Link
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
export default function FieldServiceEstimates({ profile, currentUser, features }) {
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

  // ─── Query: Clients ──────────────────────────────
  const { data: clients = [] } = useQuery({
    queryKey: ['fs-clients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSClient.filter({ workspace_id: profile.id });
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
        client_id: estimate.client_id || null,
        client_name: estimate.client_name,
        client_phone: estimate.client_phone,
        client_email: estimate.client_email,
        address: estimate.client_address,
        total_budget: estimate.total || 0,
        status: 'active',
        estimate_id: estimate.id,
        client_show_breakdown: estimate.client_show_breakdown === true,
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

  const markAsSent = async (est) => {
    try {
      await base44.entities.FSEstimate.update(est.id, { status: 'sent', sent_at: new Date().toISOString() });
      queryClient.invalidateQueries(['fs-estimates', profile?.id]);
      toast.success('Estimate marked as sent');
    } catch (err) { toast.error(err?.message || 'Failed to update status'); }
  };

  const reopenEstimate = async (est) => {
    try {
      await base44.entities.FSEstimate.update(est.id, { status: 'sent' });
      queryClient.invalidateQueries(['fs-estimates', profile?.id]);
      toast.success('Estimate reopened for editing');
    } catch (err) { toast.error(err?.message || 'Failed to reopen'); }
  };

  // ─── Navigation helpers ─────────────────────────
  const openNewEstimate = useCallback(() => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    setFormInitial({
      ...EMPTY_ESTIMATE,
      line_items: [makeItem()],
      terms: profile?.default_terms || '',
      prepared_by: profile?.owner_name || '',
      date: new Date().toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
    });
    setEditingId(null);
    setView('form');
  }, [profile?.default_terms]);

  const openEditEstimate = useCallback((est) => {
    const items = migrateLineItems(est.line_items, est.labor_estimate);

    setFormInitial({
      title: est.title || '', client_id: est.client_id || '',
      client_name: est.client_name || '',
      client_email: est.client_email || '', client_phone: est.client_phone || '',
      client_address: est.client_address || '', project_id: est.project_id || '',
      date: est.date || new Date().toISOString().split('T')[0],
      valid_until: est.valid_until || '',
      line_items: items,
      overhead_profit_pct: est.overhead_profit_pct || 0,
      tax_rate: est.tax_rate || 0,
      other_amount: est.other_amount || 0,
      payment_terms: est.payment_terms || '',
      prepared_by: est.prepared_by || '',
      terms: est.terms || '', notes: est.notes || '',
      client_show_breakdown: est.client_show_breakdown === true,
      is_insurance_estimate: est.is_insurance_estimate === true,
    });
    setEditingId(est.id);
    setView('form');
  }, []);

  const duplicateEstimate = useCallback((est) => {
    const items = migrateLineItems(est.line_items, est.labor_estimate);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    setFormInitial({
      title: `${est.title || 'Estimate'} (Copy)`,
      client_id: est.client_id || '',
      client_name: est.client_name || '', client_email: est.client_email || '',
      client_phone: est.client_phone || '', client_address: est.client_address || '',
      project_id: '', date: new Date().toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
      line_items: items,
      overhead_profit_pct: est.overhead_profit_pct || 0,
      tax_rate: est.tax_rate || 0,
      other_amount: est.other_amount || 0,
      payment_terms: est.payment_terms || '',
      prepared_by: est.prepared_by || '',
      terms: est.terms || '', notes: est.notes || '',
      client_show_breakdown: false,
      is_insurance_estimate: est.is_insurance_estimate === true,
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
        onConvert={(est) => setConvertConfirm(est)}
        projects={projects}
        clients={clients}
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
        clients={clients}
        editingId={editingId}
        initialData={formInitial}
        onDone={backToList}
        features={features}
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
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 flex items-center gap-1 ${sc.color} ${est.status === 'declined' ? 'line-through' : ''}`}>
                    {est.status === 'accepted' && <Lock className="h-3 w-3" />}
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
                  {est.status !== 'accepted' && (
                    <button type="button" onClick={() => openEditEstimate(est)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 min-h-[36px] transition-colors">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                  <button type="button" onClick={() => duplicateEstimate(est)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 min-h-[36px] transition-colors">
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  {est.status === 'draft' && (
                    <button type="button" onClick={() => markAsSent(est)}
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 min-h-[36px] transition-colors">
                      <Send className="h-3.5 w-3.5" /> Mark Sent
                    </button>
                  )}
                  {(est.status === 'draft' || est.status === 'sent') && !est.project_id && (
                    <button type="button" onClick={() => setConvertConfirm(est)}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 min-h-[36px] transition-colors">
                      <FolderOpen className="h-3.5 w-3.5" /> Accept & Create Project
                    </button>
                  )}
                  {est.status === 'accepted' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Lock className="h-3.5 w-3.5" /> Approved
                    </span>
                  )}
                  {est.status === 'accepted' && (
                    <button type="button" onClick={() => reopenEstimate(est)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 min-h-[36px] transition-colors">
                      Reopen
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
            <h3 className="text-lg font-bold text-slate-100 mb-2">Accept Estimate & Create Project</h3>
            <p className="text-sm text-slate-400 mb-4">
              Accept <span className="text-amber-500">{convertConfirm.title}</span> and create a project with
              a budget of {fmt(convertConfirm.total)}? The estimate will be locked.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConvertConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-slate-100 transition-colors text-sm min-h-[44px]">
                Cancel
              </button>
              <button type="button"
                disabled={convertMutation.isPending}
                onClick={() => convertMutation.mutate(convertConfirm)}
                className="flex-1 flex items-center justify-center px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50">
                {convertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept & Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
