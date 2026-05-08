import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ClientSelector from './ClientSelector';
import LineItemsEditor from './LineItemsEditor';
import CurrencyInput from './CurrencyInput';
import SigningFlow, { SignatureDisplay } from '@/components/shared/SigningFlow';
import { CATEGORY_MAP, makeItem, migrateLineItems, calcTotals } from '@/utils/fsLineItems';
import { getTradeCategories, getEstimateTradeCategories } from '@/utils/fsTradeCategories';
import { TRADE_TAXONOMY_PRESETS, resolvePresetById } from '@/utils/tradeTaxonomyPresets';
import { isEstimateLocked } from '@/utils/fsEstimateLifecycle';
import { printNode } from '@/utils/printNode';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText, Plus, ArrowLeft, Pencil, Trash2, Loader2, Save,
  Search, Copy, FolderOpen, Send, Eye, Printer, X, DollarSign, Link2,
  Lock, Shield, Check,
} from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent';
const LABEL_CLASS = 'block text-foreground-soft text-sm font-medium mb-1';

const STATUS_CONFIG = {
  draft:               { label: 'Draft',               color: 'bg-muted-foreground/20 text-muted-foreground' },
  sent:                { label: 'Sent',                 color: 'bg-primary/20 text-primary-hover' },
  awaiting_signature:  { label: 'Awaiting Signature',   color: 'bg-primary/20 text-primary-hover', pulse: true },
  viewed:              { label: 'Viewed',               color: 'bg-blue-500/20 text-blue-400' },
  accepted:            { label: 'Accepted',             color: 'bg-emerald-500/20 text-emerald-400' },
  signed:              { label: 'Signed',               color: 'bg-emerald-500/20 text-emerald-400' },
  declined:            { label: 'Declined',             color: 'bg-rose-700/20 text-rose-400' },
  expired:             { label: 'Expired',              color: 'bg-secondary/50 text-muted-foreground/50' },
};

const FILTER_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'awaiting_signature', label: 'Awaiting Signature' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'signed', label: 'Signed' },
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

// Trade-category helpers extracted to src/utils/fsTradeCategories.js
// (Phase 2.1, 2026-05-08) so ClientPortal can read the same taxonomy.
// Phase 2.2 will replace the default seed with a presets system.

const EMPTY_ESTIMATE = {
  title: '', client_id: '', client_name: '', client_email: '', client_phone: '', client_address: '',
  project_id: '', date: '', valid_until: '',
  line_items: [makeItem()],
  management_fee_pct: 0, insurance_fee_pct: 0, overhead_profit_pct: 0, tax_rate: 0, other_amount: 0,
  payment_terms: '', prepared_by: '',
  terms: '', notes: '',
  client_show_breakdown: false,
  // Phase 2.2: trade-grouping is the default (renamed from flat_layout=false
  // with semantic inversion). taxonomy_preset_id + trade_categories_snapshot
  // populated at creation time from the workspace's default preset (see
  // openNewEstimate); null here so the form starts empty.
  group_by_trade: true,
  taxonomy_preset_id: null,
  trade_categories_snapshot: null,
  show_csi_codes: false,
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

// Line item migration + calcTotals live in @/utils/fsLineItems (shared with FSChangeOrder).

// ═══════════════════════════════════════════════════
// Preview (client-facing branded estimate)
// ═══════════════════════════════════════════════════
function EstimatePreview({ estimate, profile, currentUser, onBack, onEdit, onConvert, onSendForSignature, onRecall, onOwnerSign, projects, clients, features }) {
  const [showOwnerSign, setShowOwnerSign] = useState(false);
  const [ownerSigning, setOwnerSigning] = useState(false);
  const items = migrateLineItems(estimate.line_items, estimate.labor_estimate);
  const totals = calcTotals(items, estimate.overhead_profit_pct, estimate.tax_rate, estimate.other_amount, estimate.management_fee_pct, estimate.insurance_fee_pct);
  const brandColor = profile?.brand_color || '#f59e0b';
  const showBreakdown = estimate.client_show_breakdown === true;
  // group_by_trade=true (default for new estimates) → trade-grouped render.
  // group_by_trade=false → single flat table. Renamed from flat_layout
  // 2026-05-08 (Phase 2.2) with semantic inversion via migration.
  const isFlatLayout = estimate.group_by_trade === false;
  // Snapshot first (per-estimate frozen taxonomy), workspace fallback for
  // legacy estimates pre-backfill (Phase 2.2 architecture).
  const tradeCategories = getEstimateTradeCategories(estimate, profile);
  const hasOwnerSig = !!estimate.owner_signature_data;
  const tradeCatMap = Object.fromEntries(tradeCategories.map((tc) => [tc.id, tc]));

  // Group items by trade category. Renders when group_by_trade is true (the
  // platform default). Untagged items (trade_category_id empty OR pointing
  // at a deleted trade) collect under a distinct "Unallocated" bucket at
  // order -1 — floats to the top of the grouped view, prompting the
  // contractor to tag. The bucket is keyed by tc.id (not tc.name) so a
  // workspace's actual "Other" trade and untagged items can't collapse
  // into the same group. The bucket renders only when at least one
  // untagged item exists.
  const groupedByTrade = useMemo(() => {
    if (isFlatLayout) return null;
    const UNALLOCATED_ID = '__unallocated__';
    const UNALLOCATED_TC = { id: UNALLOCATED_ID, name: 'Unallocated', order: -1 };
    const groups = new Map();
    for (const item of items) {
      const tcId = item.trade_category_id || '';
      const realTc = tcId ? tradeCatMap[tcId] : null;
      if (realTc) {
        if (!groups.has(realTc.id)) groups.set(realTc.id, { tc: realTc, items: [] });
        groups.get(realTc.id).items.push(item);
      } else {
        if (!groups.has(UNALLOCATED_ID)) groups.set(UNALLOCATED_ID, { tc: UNALLOCATED_TC, items: [] });
        groups.get(UNALLOCATED_ID).items.push(item);
      }
    }
    // Sort by trade category order — Unallocated at order -1 floats to top.
    return Array.from(groups.entries())
      .sort((a, b) => (a[1].tc.order ?? 999) - (b[1].tc.order ?? 999));
  }, [isFlatLayout, items, tradeCatMap]);

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
          className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm min-h-[44px]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => {
              // Print via an isolated hidden iframe rather than window.print() on
              // the parent document. Inside Base44's Act-As-User editor preview the
              // app renders inside a fixed-height iframe; window.print() on that
              // outer document clips our content to the iframe element's height
              // (single page, ~14 line items). Routing print through a fresh
              // document sidesteps the parent-frame constraint entirely.
              const node = document.querySelector('.estimate-print-area');
              const ref = estimate.estimate_number || `id-${(estimate.id || '').slice(0, 8)}`;
              const ok = printNode(node, {
                title: `Estimate-${ref}`,
                extraCss: `.estimate-print-area { font-size: ${isFlatLayout ? '10pt' : '9pt'}; }`,
              });
              if (!ok) toast.error('Could not open print preview.');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-primary hover:border-primary transition-colors text-sm min-h-[44px]">
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
          {(estimate.status === 'draft' || estimate.status === 'sent') && !estimate.project_id && (
            <button type="button" onClick={() => onConvert(estimate)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px]">
              <FolderOpen className="h-4 w-4" /> Accept & Create Project
            </button>
          )}
          {isEstimateLocked(estimate) && (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium min-h-[44px]">
              <Lock className="h-4 w-4" /> {estimate.status === 'signed' ? 'Signed' : 'Approved'}
            </span>
          )}
          <button type="button" onClick={() => {
              const token = estimate.portal_token;
              const url = token
                ? `${window.location.origin}/client-portal?workspace=${profile?.id}&estimate=${estimate.id}&token=${token}`
                : `${window.location.origin}/client-portal?estimate=${estimate.id}`;
              window.open(url, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent transition-colors text-sm min-h-[44px]">
            <Eye className="h-4 w-4" /> Preview as Client
          </button>
          {(estimate.status === 'sent' || estimate.status === 'awaiting_signature') && (
            <button type="button" onClick={() => {
                const token = estimate.portal_token || '';
                const url = `${window.location.origin}/client-portal?workspace=${profile?.id}&estimate=${estimate.id}&token=${token}`;
                navigator.clipboard.writeText(url).then(
                  () => toast.success('Link copied!'),
                  () => toast.error('Failed to copy link')
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent transition-colors text-sm min-h-[44px]">
              <Link2 className="h-4 w-4" /> Copy Link
            </button>
          )}
          {estimate.status === 'sent' && !estimate.signature_data && onSendForSignature && (
            <button type="button" onClick={() => onSendForSignature(estimate)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-foreground font-semibold transition-colors text-sm min-h-[44px]">
              <Shield className="h-4 w-4" /> Request Signature
            </button>
          )}
          {estimate.status === 'awaiting_signature' && onRecall && (
            <button type="button" onClick={() => onRecall(estimate)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 hover:bg-transparent transition-colors text-sm min-h-[44px]">
              <X className="h-4 w-4" /> Recall
            </button>
          )}
          {!hasOwnerSig && !showOwnerSign && (
            <button type="button" onClick={() => setShowOwnerSign(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-700/50 text-emerald-400 hover:border-emerald-600 hover:bg-transparent transition-colors text-sm min-h-[44px]">
              <Shield className="h-4 w-4" /> Sign as Owner
            </button>
          )}
          {hasOwnerSig && (
            <span className="flex items-center gap-1.5 px-3 py-2 text-sm text-emerald-400">
              <Check className="h-4 w-4" /> Owner Signed
            </span>
          )}
          {estimate.status !== 'accepted' && estimate.status !== 'signed' && estimate.status !== 'awaiting_signature' && (
            <button type="button" onClick={() => onEdit(estimate)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors text-sm min-h-[44px]">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Printable estimate */}
      <div className="estimate-print-area bg-white text-primary-foreground rounded-xl border border-border shadow-sm p-6 sm:p-8 print:p-6 print:shadow-none print:rounded-none print:border-none">
        <style>{`@media print {
          /* Hide every element that isn't the print area, an ancestor of it, or a descendant of it. */
          /* The previous visibility:hidden + position:absolute pattern collapsed multi-page content */
          /* to page 1 because absolutely-positioned blocks don't paginate. */
          body :not(:has(.estimate-print-area)):not(.estimate-print-area):not(.estimate-print-area *) {
            display: none !important;
          }
          body { background: white !important; margin: 0; padding: 0; }
          /* overflow-x-auto on line item wrappers resolves to overflow:auto on both axes per spec, */
          /* which clips tall tables to a single page in print. Force visible across the print tree. */
          .estimate-print-area, .estimate-print-area * { overflow: visible !important; }
          .estimate-print-area { font-size: ${isFlatLayout ? '10pt' : '9pt'}; }
          @page { margin: 0.5in; size: letter; }
          .print-avoid-break { page-break-inside: avoid; }
          .print-break-before { page-break-before: auto; }
        }`}</style>

        {/* Contractor header — bg-slate-50 carries through print thanks to
            print-color-adjust:exact set in printNode. The previous
            print:bg-white override flattened the header band; removing it
            restores the visual hierarchy the on-screen preview shows. */}
        <div className="flex justify-between items-start mb-8 pb-6 bg-slate-50 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 px-6 sm:px-8 pt-6 sm:pt-8 rounded-t-xl print:rounded-none" style={{ borderBottom: `3px solid ${brandColor}` }}>
          <div className="flex items-center gap-4">
            {profile?.logo_url && (
              <img src={profile.logo_url} alt={profile?.business_name || ''} className="max-h-16 max-w-[200px] object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: brandColor }}>
                {profile?.business_name || 'Business Name'}
              </h1>
              {profile?.license_number && <p className="text-sm text-muted-foreground/70">Lic# {profile.license_number}</p>}
              {profile?.service_area && <p className="text-sm text-muted-foreground/70">{profile.service_area}</p>}
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground/50">
            {profile?.phone && <p>{formatPhone(profile.phone)}</p>}
            {profile?.email && <p>{profile.email}</p>}
          </div>
        </div>

        {/* Estimate info + Client — two-column layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: brandColor }}>ESTIMATE</h2>
            <div className="text-sm space-y-0.5">
              <p><span className="text-muted-foreground/70">No:</span> {estimate.estimate_number}</p>
              <p><span className="text-muted-foreground/70">Date:</span> {fmtDate(estimate.date)}</p>
              {estimate.payment_terms && (
                <p><span className="text-muted-foreground/70">Terms:</span> {(PAYMENT_TERMS_OPTIONS.find((o) => o.value === estimate.payment_terms) || {}).label || estimate.payment_terms}</p>
              )}
              {estimate.valid_until && <p><span className="text-muted-foreground/70">Due Date:</span> {fmtDate(estimate.valid_until)}</p>}
              {linkedProject && <p><span className="text-muted-foreground/70">Project:</span> {linkedProject.name}</p>}
              <p><span className="text-muted-foreground/70">Prepared By:</span> {estimate.prepared_by || profile?.owner_name || '—'}</p>
            </div>
          </div>
          {clientName && (
            // Customer card preserves its bg-slate-50 fill in print (the
            // previous print:bg-white + print:border replacement collapsed
            // the styled card to a thin-bordered plain box).
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1">Customer</p>
              <p className="font-semibold">{clientName}</p>
              {clientAddress && <p className="text-sm text-muted-foreground/50">{clientAddress}</p>}
              {clientPhone && <p className="text-sm text-muted-foreground/50">{formatPhone(clientPhone)}</p>}
              {clientEmail && <p className="text-sm text-muted-foreground/50">{clientEmail}</p>}
            </div>
          )}
        </div>

        {estimate.title && <h3 className="text-lg font-bold text-primary-foreground mb-4">{estimate.title}</h3>}

        {/* Line items table — only when breakdown visible */}
        {showBreakdown && items.length > 0 && (
          <div className="mb-6">
            {!isFlatLayout && groupedByTrade ? (
              /* ─── Trade-grouped format (platform default) ─── */
              <div className="space-y-4 overflow-x-auto">
                {groupedByTrade.map(([tradeId, group]) => {
                  const catSubtotal = group.items.reduce((s, it) => s + (parseFloat(it.amount) || ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0))), 0);
                  return (
                    <div key={tradeId} className="print-avoid-break">
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1 pb-1 border-b" style={{ borderColor: brandColor }}>
                        {group.tc.name}
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
                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${cat.badge}`}>
                                      {cat.label}
                                    </span>
                                  )}
                                  {item.sub_name && <p className="text-xs text-muted-foreground/70 italic mt-0.5">{item.sub_name}</p>}
                                </td>
                                <td className="text-right py-1.5 w-28">{parseFloat(item.unit_price) ? fmt(item.unit_price) : ''}</td>
                                <td className="text-right py-1.5 w-28 font-medium">{fmt(amt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border">
                            <td colSpan={3} className="text-right py-1.5 text-xs text-muted-foreground/70 font-medium pr-2">Subtotal:</td>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: brandColor }}>
                      <th className="text-center py-2 text-muted-foreground/70 font-medium w-14">QTY</th>
                      <th className="text-left py-2 text-muted-foreground/70 font-medium">DESCRIPTION</th>
                      <th className="text-right py-2 text-muted-foreground/70 font-medium w-28">UNIT PRICE</th>
                      <th className="text-right py-2 text-muted-foreground/70 font-medium w-28">AMOUNT</th>
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
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${cat.badge}`}>
                                {cat.label}
                              </span>
                            )}
                            {item.sub_name && <p className="text-xs text-muted-foreground/70 italic mt-0.5">{item.sub_name}</p>}
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
        <div className="print-avoid-break border-t-2 border-border pt-4 mb-6">
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-1 text-sm">
              {showBreakdown && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground/70">Subtotal</span><span>{fmt(totals.subtotal)}</span></div>
                  {features?.management_fees_enabled === true && (parseFloat(estimate.management_fee_pct) || 0) > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground/70">Management Fee ({estimate.management_fee_pct}%)</span><span>{fmt(totals.managementFeeAmount)}</span></div>
                  )}
                  {features?.insurance_fee_enabled === true && (parseFloat(estimate.insurance_fee_pct) || 0) > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground/70">Insurance Fee ({estimate.insurance_fee_pct}%)</span><span>{fmt(totals.insuranceFeeAmount)}</span></div>
                  )}
                  {features?.overhead_profit_enabled === true && (parseFloat(estimate.overhead_profit_pct) || 0) > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground/70">O&P ({estimate.overhead_profit_pct}%)</span><span>{fmt(totals.opAmount)}</span></div>
                  )}
                  {(parseFloat(estimate.other_amount) || 0) > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground/70">Other</span><span>{fmt(estimate.other_amount)}</span></div>
                  )}
                  {features?.tax_enabled === true && (parseFloat(estimate.tax_rate) || 0) > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground/70">Tax ({estimate.tax_rate}%)</span><span>{fmt(totals.taxAmount)}</span></div>
                  )}
                </>
              )}
              <div className={`flex justify-between text-lg font-bold ${showBreakdown ? 'border-t border-border pt-2 mt-2' : ''}`} style={{ color: brandColor }}>
                <span>Total</span><span>{fmt(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        {estimate.terms && (
          <div className="print-avoid-break mb-6">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">This Proposal Includes the Conditions Noted</h4>
            <p className="text-sm text-muted-foreground/50 whitespace-pre-line">{estimate.terms}</p>
          </div>
        )}

        {/* Signature blocks */}
        <div className="print-avoid-break mt-8 space-y-4">
          {/* Owner Signature */}
          {estimate.owner_signature_data ? (
            <div>
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1 font-medium">Owner Signature</p>
              <SignatureDisplay signatureData={estimate.owner_signature_data} darkMode={false} />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-5">
              <div className="space-y-4">
                <div className="border-b border-border pb-1">
                  <p className="text-xs text-muted-foreground uppercase">Owner / Contractor Signature</p>
                </div>
                <div className="border-b border-border pb-1">
                  <p className="text-xs text-muted-foreground uppercase">Date</p>
                </div>
              </div>
            </div>
          )}

          {/* Client Signature */}
          {estimate.signature_data ? (
            <div>
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1 font-medium">Client Signature</p>
              <SignatureDisplay signatureData={estimate.signature_data} darkMode={false} />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-5">
              <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Client Approval</p>
              <div className="flex justify-between items-end mb-6">
                <span className="text-sm text-muted-foreground/70">Total:</span>
                <span className="text-lg font-bold" style={{ color: brandColor }}>{fmt(totals.total)}</span>
              </div>
              <div className="space-y-4">
                <div className="border-b border-border pb-1">
                  <p className="text-xs text-muted-foreground uppercase">Authorized Representative</p>
                </div>
                <div className="border-b border-border pb-1">
                  <p className="text-xs text-muted-foreground uppercase">Date</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground/50 whitespace-pre-line">{estimate.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-6 mt-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground/70">Thank you for your business</p>
          {(profile?.phone || profile?.email) && (
            <p className="text-xs text-muted-foreground">
              {profile?.phone && <span>{formatPhone(profile.phone)}</span>}
              {profile?.phone && profile?.email && <span className="mx-2">&middot;</span>}
              {profile?.email && <span>{profile.email}</span>}
            </p>
          )}
          <p className="text-xs text-foreground-soft mt-1">Powered by LocalLane</p>
        </div>
      </div>

      {/* Inline Owner Signing Flow */}
      {showOwnerSign && !hasOwnerSig && (
        <div className="bg-card border border-border rounded-xl p-4 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">Sign as Owner</h3>
            <button type="button" onClick={() => setShowOwnerSign(false)}
              className="p-1 text-muted-foreground/70 hover:text-foreground-soft">
              <X className="h-4 w-4" />
            </button>
          </div>
          <SigningFlow
            documentContent={[estimate.title, `Estimate #${estimate.estimate_number || ''}`, `Total: ${fmt(totals.total)}`].join('\n')}
            documentTitle={estimate.title || 'Estimate'}
            signerName={profile?.owner_name || currentUser?.full_name || ''}
            signerEmail={profile?.email || currentUser?.email || ''}
            onSign={async (signatureData) => {
              setOwnerSigning(true);
              try {
                await onOwnerSign(estimate, signatureData);
                setShowOwnerSign(false);
              } catch (err) {
                toast.error('Failed to save signature');
              }
              setOwnerSigning(false);
            }}
            isSaving={ownerSigning}
            darkMode={true}
          />
        </div>
      )}
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
    () => calcTotals(formData.line_items, formData.overhead_profit_pct, formData.tax_rate, formData.other_amount, formData.management_fee_pct, formData.insurance_fee_pct),
    [formData.line_items, formData.overhead_profit_pct, formData.tax_rate, formData.other_amount, formData.management_fee_pct, formData.insurance_fee_pct]
  );

  const saveMutation = useMutation({
    mutationFn: async ({ status }) => {
      const validItems = (formData.line_items || [])
        .filter((it) => (it.description || '').trim() || (parseFloat(it.unit_price) || 0) > 0)
        .map((it) => ({
          ...it,
          amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
        }));
      const totals = calcTotals(validItems, formData.overhead_profit_pct, formData.tax_rate, formData.other_amount, formData.management_fee_pct, formData.insurance_fee_pct);

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
        management_fee_pct: parseFloat(formData.management_fee_pct) || 0,
        management_fee_amount: totals.managementFeeAmount,
        insurance_fee_pct: parseFloat(formData.insurance_fee_pct) || 0,
        insurance_fee_amount: totals.insuranceFeeAmount,
        other_amount: parseFloat(formData.other_amount) || 0,
        terms: formData.terms,
        notes: formData.notes,
        status: status || 'draft',
        client_show_breakdown: formData.client_show_breakdown === true,
        group_by_trade: formData.group_by_trade !== false,
        taxonomy_preset_id: formData.taxonomy_preset_id || null,
        // trade_categories_snapshot is type 'object' in Base44 — wrap raw arrays
        // in {items: [...]} at the storage boundary (same convention as
        // line_items, trade_categories_json, phase_labels). formData stays as
        // a raw array internally; helper reads tolerate both shapes.
        trade_categories_snapshot: Array.isArray(formData.trade_categories_snapshot)
          ? { items: formData.trade_categories_snapshot }
          : (formData.trade_categories_snapshot || null),
        show_csi_codes: formData.show_csi_codes === true,
      };
      if (status === 'sent') {
        payload.sent_at = new Date().toISOString();
        payload.portal_token = crypto.randomUUID();
        payload.portal_link_active = true;
        payload.sent_for_signature_at = new Date().toISOString();
      }

      if (editingId) {
        return base44.entities.FSEstimate.update(editingId, payload);
      }
      payload.estimate_number = generateEstimateNumber(estimates);
      return base44.entities.FSEstimate.create(payload);
    },
    onSuccess: (saved, vars) => {
      // FSEstimate subscribers: list ['fs-estimates', profileId] + per-client
      // ['fs-client-estimates', clientId] (Client Detail) + per-estimate
      // ['fs-client-estimate', estimateId] (Client Portal) + per-estimate
      // ['fs-project-estimate', estimateId] (Project Detail). Invalidating the
      // bare prefix matches all id-suffixed keys (DEC-199 list/detail pair).
      // Same four-key set repeats at every FSEstimate mutation site below.
      queryClient.invalidateQueries({ queryKey: ['fs-estimates', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-estimate'] });
      if (vars.status === 'sent' && vars._copyLink) {
        const estId = saved?.id || editingId;
        const token = vars.portal_token || saved?.portal_token || '';
        const url = `${window.location.origin}/client-portal?workspace=${profile.id}&estimate=${estId}&token=${token}`;
        navigator.clipboard.writeText(url).then(
          () => toast.success('Link copied! Share it with your client.'),
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
  // Editor reads trade categories through the snapshot-aware helper. formData
  // carries the in-flight snapshot — preset-pick mutations write directly to
  // formData.trade_categories_snapshot, so the picker takes effect immediately
  // for the LineItemsEditor's category dropdown without waiting for save.
  const tradeCategories = getEstimateTradeCategories(formData, profile);
  const setLineItems = (items) => setFormData((prev) => ({ ...prev, line_items: items }));

  // Source estimate (for status-derived lock check). Editor is normally
  // unreachable for accepted/signed estimates per list-view gating, but the
  // lock here is defense-in-depth — picker + toggle become read-only display
  // if a locked estimate ever ends up in the editor.
  const sourceEstimate = useMemo(
    () => (editingId ? (estimates || []).find((e) => e.id === editingId) : null),
    [editingId, estimates]
  );
  const isLocked = isEstimateLocked(sourceEstimate);

  // Preset-change confirmation. When the user picks a different preset on a
  // draft/sent estimate, count line items whose trade_category_id won't exist
  // in the new preset's categories. Lines with stale references render under
  // Unallocated — the existing sentinel handling makes this safe; we just
  // surface the count so the contractor knows what's about to happen. No
  // auto-mapping (DEC-206 derivation discipline).
  const [pendingPreset, setPendingPreset] = useState(null);
  const requestPresetChange = (newPresetId) => {
    if (!newPresetId || newPresetId === formData.taxonomy_preset_id) return;
    setPendingPreset(newPresetId);
  };
  const applyPresetChange = () => {
    const preset = resolvePresetById(pendingPreset);
    if (!preset) {
      setPendingPreset(null);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      taxonomy_preset_id: preset.id,
      trade_categories_snapshot: preset.categories,
    }));
    setPendingPreset(null);
  };
  const pendingPresetMeta = useMemo(() => {
    if (!pendingPreset) return null;
    const newPreset = resolvePresetById(pendingPreset);
    if (!newPreset) return null;
    const newIds = new Set(newPreset.categories.map((c) => c.id));
    const staleCount = (formData.line_items || [])
      .filter((it) => it.trade_category_id && !newIds.has(it.trade_category_id))
      .length;
    return { preset: newPreset, staleCount };
  }, [pendingPreset, formData.line_items]);

  // FSEstimate.title is required at the entity level. The save buttons are
  // disabled when title is empty, but autofill or programmatic submission
  // could bypass that — toast a human message instead of letting Base44's
  // raw schema error reach the user.
  const handleSave = (status, opts = {}) => {
    if (!formData.title.trim()) {
      toast.error('Please enter an estimate title');
      return;
    }
    saveMutation.mutate({ status, ...opts });
  };

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={onDone}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm min-h-[44px]">
        <ArrowLeft className="h-4 w-4" /> Back to Estimates
      </button>

      <h2 className="text-xl font-bold text-foreground">
        {editingId ? 'Edit Estimate' : 'New Estimate'}
      </h2>

      {/* Title & Date */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
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
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">Client Information</h3>
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
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Client sees: {formData.client_show_breakdown ? 'Full breakdown' : 'Total only'}
          </span>
          <button type="button"
            onClick={() => set('client_show_breakdown', !formData.client_show_breakdown)}
            className="text-xs text-primary hover:text-primary-hover ml-1">
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

      {/* ═══ Trade Taxonomy panel ═══
          Phase 2.2: per-estimate snapshot architecture. The preset picker
          freezes the estimate's category list at preset-pick time; the toggle
          chooses grouped vs flat render. Both controls visible regardless of
          xactimate_enabled (Phase 2.2 decoupling). Locked when the estimate
          is accepted or signed (isEstimateLocked, defense in depth — list
          view normally prevents editor entry on locked estimates). */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div>
          <label className={LABEL_CLASS}>Trade taxonomy</label>
          <Select
            value={formData.taxonomy_preset_id || undefined}
            onValueChange={(value) => requestPresetChange(value)}
            disabled={isLocked}
          >
            <SelectTrigger className="w-full bg-secondary border-border text-foreground h-auto py-2 text-base focus:ring-ring">
              <SelectValue placeholder="Select a preset…" />
            </SelectTrigger>
            <SelectContent>
              {TRADE_TAXONOMY_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.trade_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Categories are frozen on this estimate. Each estimate can override the workspace default.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
          <div>
            <p className="text-sm text-foreground">Group by trade</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Show line items grouped by trade with per-trade subtotals. Toggle off for a simple flat list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !isLocked && set('group_by_trade', !formData.group_by_trade)}
            disabled={isLocked}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              formData.group_by_trade ? 'bg-primary' : 'bg-surface'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-slate-100 transition-transform ${
              formData.group_by_trade ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* ═══ Unified Line Items ═══ */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">Line Items</h3>
        <LineItemsEditor
          items={formData.line_items}
          onChange={setLineItems}
          tradeCategories={tradeCategories}
          showTradeCategories={formData.group_by_trade !== false}
          disabled={isLocked}
        />
      </div>

      {/* ═══ Summary ═══ */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-foreground-soft">
            <span>Subtotal</span><span className="font-medium">{fmt(formTotals.subtotal)}</span>
          </div>

          {/* Management Fee — gated on management_fees_enabled (Settings → Workspace Features).
              Calculates against subtotal-only, same basis as Insurance Fee and O&P; the three never stack.
              Display order: Subtotal → Management Fee → Insurance Fee → O&P → Tax → Other → Total. */}
          {features?.management_fees_enabled === true && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground-soft">Management Fee</span>
                <div className="flex items-center gap-1">
                  <input type="number"
                    className="w-20 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.management_fee_pct} onChange={(e) => set('management_fee_pct', e.target.value)}
                    onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('management_fee_pct', ''); }}
                    onBlur={(e) => { if (e.target.value === '') set('management_fee_pct', 0); }}
                    min="0" max="100" step="0.5" />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              {formTotals.managementFeeAmount > 0 && (
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Management Fee Amount</span><span>{fmt(formTotals.managementFeeAmount)}</span>
                </div>
              )}
            </>
          )}

          {/* Insurance Fee — gated on insurance_fee_enabled (Settings → Workspace Features).
              Manual % entry of the contractor's annual insurance allocation, applied to subtotal-only.
              Mirrors Management Fee mechanism exactly; independent of the Xactimate format toggle. */}
          {features?.insurance_fee_enabled === true && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground-soft">Insurance Fee</span>
                <div className="flex items-center gap-1">
                  <input type="number"
                    className="w-20 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.insurance_fee_pct} onChange={(e) => set('insurance_fee_pct', e.target.value)}
                    onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('insurance_fee_pct', ''); }}
                    onBlur={(e) => { if (e.target.value === '') set('insurance_fee_pct', 0); }}
                    min="0" max="100" step="0.5" />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              {formTotals.insuranceFeeAmount > 0 && (
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Insurance Fee Amount</span><span>{fmt(formTotals.insuranceFeeAmount)}</span>
                </div>
              )}
            </>
          )}

          {/* O&P — gated on overhead_profit_enabled toggle (Settings → Workspace Features) */}
          {features?.overhead_profit_enabled === true && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground-soft">O&P (Overhead & Profit)</span>
                <div className="flex items-center gap-1">
                  <input type="number"
                    className="w-20 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.overhead_profit_pct} onChange={(e) => set('overhead_profit_pct', e.target.value)}
                    onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('overhead_profit_pct', ''); }}
                    onBlur={(e) => { if (e.target.value === '') set('overhead_profit_pct', 0); }}
                    min="0" max="100" step="0.5" />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              {formTotals.opAmount > 0 && (
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>O&P Amount</span><span>{fmt(formTotals.opAmount)}</span>
                </div>
              )}
            </>
          )}

          {/* Tax — gated on tax_enabled feature flag (Settings → Workspace Features).
              Defaults off; Oregon contractors don't see Tax until they opt in. */}
          {features?.tax_enabled === true && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground-soft">Tax Rate</span>
                <div className="flex items-center gap-1">
                  <input type="number"
                    className="w-20 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.tax_rate} onChange={(e) => set('tax_rate', e.target.value)}
                    onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('tax_rate', ''); }}
                    onBlur={(e) => { if (e.target.value === '') set('tax_rate', 0); }}
                    min="0" max="100" step="0.1" />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              {formTotals.taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground pl-4">
                  <span>Tax Amount</span><span>{fmt(formTotals.taxAmount)}</span>
                </div>
              )}
            </>
          )}

          {/* Other */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground-soft">Other</span>
            <CurrencyInput
              showPrefix
              className="w-32 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
              value={formData.other_amount}
              onChange={(v) => set('other_amount', v)}
            />
          </div>

          <div className="flex justify-between text-lg font-bold text-primary border-t border-border pt-2">
            <span>Total</span><span>{fmt(formTotals.total)}</span>
          </div>
        </div>
      </div>

      {/* Terms & Notes */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
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
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Show cost breakdown to client</p>
            <p className="text-xs text-muted-foreground mt-0.5">When off, clients see total only on the estimate</p>
          </div>
          <button
            type="button"
            onClick={() => set('client_show_breakdown', !formData.client_show_breakdown)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              formData.client_show_breakdown ? 'bg-primary' : 'bg-surface'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-slate-100 transition-transform ${
              formData.client_show_breakdown ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Actions — mirrors the CO form pattern: Cancel on the left, primary actions on the right. */}
      <div className="flex gap-3 sticky bottom-0 bg-background py-3 -mx-1 px-1">
        <button type="button"
          onClick={onDone}
          disabled={saveMutation.isPending}
          className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors min-h-[44px] disabled:opacity-50">
          Cancel
        </button>
        <button type="button"
          disabled={!formData.title.trim() || saveMutation.isPending}
          onClick={() => handleSave('draft')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary text-primary hover:bg-primary/10 transition-colors text-sm font-medium min-h-[44px] disabled:opacity-50 disabled:pointer-events-none">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>
        <button type="button"
          disabled={!formData.title.trim() || saveMutation.isPending}
          onClick={() => handleSave('sent', { _copyLink: true })}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50 disabled:pointer-events-none">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Save & Copy Link
        </button>
      </div>

      {/* Preset-change confirmation. Shows when the user picks a different
          taxonomy preset; surfaces how many existing line items will fall to
          Unallocated under the new preset (no auto-mapping per DEC-206). */}
      <ConfirmDialog
        open={pendingPreset !== null}
        onOpenChange={(open) => { if (!open) setPendingPreset(null); }}
        title={pendingPresetMeta ? `Change to ${pendingPresetMeta.preset.name}?` : 'Change preset?'}
        description={
          pendingPresetMeta
            ? (pendingPresetMeta.staleCount > 0
                ? `${pendingPresetMeta.staleCount} line ${pendingPresetMeta.staleCount === 1 ? 'item is' : 'items are'} tagged to trades that don't exist in the new preset. They'll move to Unallocated after applying.`
                : 'No line items will move to Unallocated. The new categories take effect immediately.')
            : ''
        }
        confirmLabel="Apply preset"
        cancelLabel="Cancel"
        onConfirm={applyPresetChange}
      />
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
      try {
        const list = await base44.entities.FSEstimate.filter({ profile_id: profile.id });
        return (Array.isArray(list) ? list : list ? [list] : [])
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // One-shot prefill: tile drill-in row click on a Contract Total estimate
  // row (Project Detail) writes the target estimate id here, navigates to
  // the Estimates tab, and we open that estimate's preview on mount.
  // Same consume-and-clear semantics as PREFILL_TYPE_KEY in FieldServiceLog.
  useEffect(() => {
    const prefillId = localStorage.getItem('fs-estimate-prefill-id');
    if (!prefillId) return;
    localStorage.removeItem('fs-estimate-prefill-id');
    const found = estimates.find((e) => e.id === prefillId);
    if (found) {
      setPreviewEstimate(found);
      setView('preview');
    }
  }, [estimates]);

  // ─── Query: Projects for linking ────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Clients ──────────────────────────────
  const { data: clients = [] } = useQuery({
    queryKey: ['fs-clients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSClient.filter({ workspace_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
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
      queryClient.invalidateQueries({ queryKey: ['fs-estimates', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-estimate'] });
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
      queryClient.invalidateQueries({ queryKey: ['fs-estimates', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-projects', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-projects'] });
      toast.success('Project created from estimate');
      setConvertConfirm(null);
    },
    onError: (err) => toast.error(`Conversion failed: ${err.message}`),
  });

  const markAsSent = async (est) => {
    try {
      // Generate portal_token for the shareable link (or reuse existing)
      const portalToken = est.portal_token || crypto.randomUUID();
      await base44.entities.FSEstimate.update(est.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        portal_token: portalToken,
        portal_link_active: true,
        sent_for_signature_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['fs-estimates', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-estimate'] });
      // Copy the portal link to clipboard
      const url = `${window.location.origin}/client-portal?workspace=${profile.id}&estimate=${est.id}&token=${portalToken}`;
      navigator.clipboard.writeText(url).then(
        () => toast.success('Link copied! Share it with your client.'),
        () => toast.success('Estimate marked as sent (could not copy link)'),
      );
    } catch (err) { toast.error(err?.message || 'Failed to update status'); }
  };

  const sendForSignature = async (est) => {
    try {
      // Generate portal_token if not already present
      const portalToken = est.portal_token || crypto.randomUUID();
      await base44.entities.FSEstimate.update(est.id, {
        status: 'awaiting_signature',
        portal_token: portalToken,
        portal_link_active: true,
        sent_for_signature_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['fs-estimates', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-estimate'] });
      // Build signing link (includes sign=true)
      const url = `${window.location.origin}/client-portal?workspace=${profile.id}&estimate=${est.id}&token=${portalToken}&sign=true`;
      navigator.clipboard.writeText(url).then(
        () => toast.success('Signing link copied! Share it with your client.'),
        () => toast.success('Estimate sent for signature (could not copy link)'),
      );
    } catch (err) { toast.error(err?.message || 'Failed to send for signature'); }
  };

  const recallEstimate = async (est) => {
    try {
      await base44.entities.FSEstimate.update(est.id, {
        status: 'sent',
        portal_link_active: false,
        recalled_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['fs-estimates', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-estimate'] });
      toast.success('Estimate recalled. You can edit and resend.');
    } catch (err) { toast.error(err?.message || 'Failed to recall'); }
  };

  const copyPortalLink = async (est, withSign = false) => {
    const token = est.portal_token;
    if (!token) {
      // Backward compat: generate token for older estimates that don't have one
      return withSign ? sendForSignature(est) : markAsSent(est);
    }
    const url = `${window.location.origin}/client-portal?workspace=${profile.id}&estimate=${est.id}&token=${token}${withSign ? '&sign=true' : ''}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied!'),
      () => toast.error('Failed to copy link'),
    );
  };

  const reopenEstimate = async (est) => {
    try {
      await base44.entities.FSEstimate.update(est.id, { status: 'sent' });
      queryClient.invalidateQueries({ queryKey: ['fs-estimates', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-estimate'] });
      toast.success('Estimate reopened for editing');
    } catch (err) { toast.error(err?.message || 'Failed to reopen'); }
  };

  // ─── Navigation helpers ─────────────────────────
  const openNewEstimate = useCallback(() => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    // Resolve workspace's default taxonomy preset (Phase 2.2). When set, the
    // estimate freezes its categories at creation time — the snapshot is the
    // load-bearing render shape, so workspace setting changes after this point
    // do not retroactively touch the estimate.
    const defaultPreset = resolvePresetById(profile?.default_taxonomy_preset_id);
    setFormInitial({
      ...EMPTY_ESTIMATE,
      line_items: [makeItem()],
      terms: profile?.default_terms || '',
      prepared_by: profile?.owner_name || '',
      date: new Date().toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
      taxonomy_preset_id: defaultPreset?.id || null,
      trade_categories_snapshot: defaultPreset ? defaultPreset.categories : null,
    });
    setEditingId(null);
    setView('form');
  }, [profile?.default_terms, profile?.owner_name, profile?.default_taxonomy_preset_id]);

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
      management_fee_pct: est.management_fee_pct || 0,
      insurance_fee_pct: est.insurance_fee_pct || 0,
      overhead_profit_pct: est.overhead_profit_pct || 0,
      tax_rate: est.tax_rate || 0,
      other_amount: est.other_amount || 0,
      payment_terms: est.payment_terms || '',
      prepared_by: est.prepared_by || '',
      terms: est.terms || '', notes: est.notes || '',
      client_show_breakdown: est.client_show_breakdown === true,
      // group_by_trade default true preserves the platform default for legacy
      // estimates where the field is undefined; existing values pass through.
      group_by_trade: est.group_by_trade !== false,
      taxonomy_preset_id: est.taxonomy_preset_id || null,
      trade_categories_snapshot: est.trade_categories_snapshot || null,
      show_csi_codes: est.show_csi_codes === true,
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
      management_fee_pct: est.management_fee_pct || 0,
      insurance_fee_pct: est.insurance_fee_pct || 0,
      overhead_profit_pct: est.overhead_profit_pct || 0,
      tax_rate: est.tax_rate || 0,
      other_amount: est.other_amount || 0,
      payment_terms: est.payment_terms || '',
      prepared_by: est.prepared_by || '',
      terms: est.terms || '', notes: est.notes || '',
      client_show_breakdown: false,
      // Duplicate copies the source's taxonomy. User mental model: "same
      // shape as the original." If the contractor wants a different preset,
      // they can change it in the editor (or create a new estimate instead).
      group_by_trade: est.group_by_trade !== false,
      taxonomy_preset_id: est.taxonomy_preset_id || null,
      trade_categories_snapshot: est.trade_categories_snapshot || null,
      show_csi_codes: est.show_csi_codes === true,
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
        currentUser={currentUser}
        onBack={backToList}
        onEdit={(est) => openEditEstimate(est)}
        onConvert={(est) => setConvertConfirm(est)}
        onSendForSignature={(est) => sendForSignature(est)}
        onRecall={(est) => recallEstimate(est)}
        onOwnerSign={async (est, sigData) => {
          await base44.entities.FSEstimate.update(est.id, {
            owner_signature_data: JSON.stringify(sigData),
            owner_signed_at: sigData.signed_at,
          });
          queryClient.invalidateQueries({ queryKey: ['fs-estimates', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-estimate'] });
          toast.success('Owner signature saved');
        }}
        projects={projects}
        clients={clients}
        features={features}
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
        <h2 className="text-xl font-bold text-foreground">Estimates</h2>
        <button type="button" onClick={openNewEstimate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px]">
          <Plus className="h-4 w-4" /> New Estimate
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
        <input type="text" className={`${INPUT_CLASS} pl-9`} value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search estimates..." />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_CHIPS.map((chip) => (
          <button key={chip.value} type="button"
            onClick={() => setFilter(chip.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
              filter === chip.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
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
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {searchTerm || filter !== 'all' ? 'No estimates match your filters.' : 'No estimates yet.'}
          </p>
          <p className="text-muted-foreground/70 text-sm mt-1">Create your first estimate to get started.</p>
        </div>
      )}

      {/* Estimate cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((est) => {
            const sc = STATUS_CONFIG[est.status] || STATUS_CONFIG.draft;
            return (
              <article key={est.id}
                className="bg-card border border-border hover:border-primary/50 rounded-xl p-4 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{est.title || 'Untitled Estimate'}</p>
                    <p className="text-xs text-muted-foreground/70">{est.estimate_number}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 flex items-center gap-1 ${sc.color} ${est.status === 'declined' ? 'line-through' : ''}`}>
                    {sc.pulse && <span className="w-1.5 h-1.5 rounded-full bg-primary-hover animate-pulse" />}
                    {isEstimateLocked(est) && <Lock className="h-3 w-3" />}
                    {sc.label}
                    {est.status === 'signed' && est.signed_at && <span className="ml-1 text-xs opacity-70">{fmtDate(est.signed_at)}</span>}
                  </span>
                </div>

                {est.client_name && <p className="text-sm text-muted-foreground mb-1">{est.client_name}</p>}

                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs text-muted-foreground/70">{fmtDate(est.date)}</span>
                  <span className="text-primary font-bold text-sm">{fmt(est.total)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                  <button type="button" onClick={() => { setPreviewEstimate(est); setView('preview'); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary min-h-[44px] transition-colors">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  {est.status !== 'accepted' && est.status !== 'signed' && est.status !== 'awaiting_signature' && (
                    <button type="button" onClick={() => openEditEstimate(est)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary min-h-[44px] transition-colors">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                  <button type="button" onClick={() => duplicateEstimate(est)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary min-h-[44px] transition-colors">
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  {est.status === 'draft' && (
                    <button type="button" onClick={() => markAsSent(est)}
                      className="flex items-center gap-1 text-xs text-primary-hover hover:text-primary-hover min-h-[44px] transition-colors">
                      <Send className="h-3.5 w-3.5" /> Send to Client
                    </button>
                  )}
                  {est.status === 'sent' && (
                    <>
                      <button type="button" onClick={() => copyPortalLink(est)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary min-h-[44px] transition-colors">
                        <Link2 className="h-3.5 w-3.5" /> Copy Link
                      </button>
                      <button type="button" onClick={() => sendForSignature(est)}
                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 min-h-[44px] transition-colors">
                        <Shield className="h-3.5 w-3.5" /> Request Signature
                      </button>
                    </>
                  )}
                  {est.status === 'awaiting_signature' && (
                    <>
                      <button type="button" onClick={() => copyPortalLink(est, true)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary min-h-[44px] transition-colors">
                        <Link2 className="h-3.5 w-3.5" /> Copy Link
                      </button>
                      <button type="button" onClick={() => recallEstimate(est)}
                        className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 min-h-[44px] transition-colors">
                        <X className="h-3.5 w-3.5" /> Recall
                      </button>
                    </>
                  )}
                  {(est.status === 'draft' || est.status === 'sent') && !est.project_id && (
                    <button type="button" onClick={() => setConvertConfirm(est)}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 min-h-[44px] transition-colors">
                      <FolderOpen className="h-3.5 w-3.5" /> Accept & Create Project
                    </button>
                  )}
                  {isEstimateLocked(est) && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Lock className="h-3.5 w-3.5" /> {est.status === 'signed' ? 'Signed' : 'Approved'}
                    </span>
                  )}
                  {isEstimateLocked(est) && (
                    <button type="button" onClick={() => reopenEstimate(est)}
                      className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground min-h-[44px] transition-colors">
                      Reopen
                    </button>
                  )}
                  {est.project_id && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <FolderOpen className="h-3.5 w-3.5" /> Linked to project
                    </span>
                  )}
                  <div className="flex-1" />
                  {deleteConfirm === est.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground/70">Delete?</span>
                      <button type="button" onClick={() => deleteMutation.mutate(est.id)}
                        className="text-xs text-primary hover:text-primary-hover min-h-[44px]">Yes</button>
                      <button type="button" onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-muted-foreground hover:text-foreground-soft min-h-[44px]">No</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setDeleteConfirm(est.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground min-h-[44px] transition-colors">
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
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-2">Accept Estimate & Create Project</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Accept <span className="text-primary">{convertConfirm.title}</span> and create a project with
              a budget of {fmt(convertConfirm.total)}? The estimate will be locked.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConvertConfirm(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground-soft hover:text-foreground transition-colors text-sm min-h-[44px]">
                Cancel
              </button>
              <button type="button"
                disabled={convertMutation.isPending}
                onClick={() => convertMutation.mutate(convertConfirm)}
                className="flex-1 flex items-center justify-center px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50">
                {convertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept & Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
