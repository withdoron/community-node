import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Printer, Camera, Shield, X, FileText, ClipboardList } from 'lucide-react';
import SigningFlow, { SignatureDisplay } from '@/components/shared/SigningFlow';
import { getFeatures } from '@/utils/fsFeatures';
import { getEstimateTradeCategories, getTradeCategories, deriveLineTrade } from '@/utils/fsTradeCategories';
import { useWorkspacePeople } from '@/hooks/useWorkspacePeople';
import { isEstimateLocked } from '@/utils/fsEstimateLifecycle';
import { toast } from 'sonner';

/**
 * Invoke a Base44 server function WITHOUT requiring user authentication.
 * The standard base44.functions.invoke() sends the user's auth token — in the
 * client portal the visitor is unauthenticated, so the API returns 401 before
 * the function even runs. This helper hits the same endpoint with only the
 * X-App-Id header (no Bearer token), which is sufficient for server functions
 * that use asServiceRole internally.
 */
async function invokeUnauthenticated(functionName, data) {
  const url = `${appParams.serverUrl}/api/apps/${appParams.appId}/functions/${functionName}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-App-Id': String(appParams.appId),
  };
  // Include functions version header if set (mirrors SDK behavior)
  if (appParams.functionsVersion) {
    headers['Base44-Functions-Version'] = appParams.functionsVersion;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.message || `Server function failed (${res.status})`);
  }
  return res.json();
}

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

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseJSON(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function parseTasks(t) {
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
}

// ═══════════════════════════════════════════════════
// Branded Header (shared across all portal views)
// ═══════════════════════════════════════════════════

function PortalHeader({ profile, brandColor }) {
  if (!profile) return null;
  return (
    <div className="p-6 sm:p-8" style={{ borderBottom: `3px solid ${brandColor}` }}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          {profile.logo_url ? (
            <img src={profile.logo_url} alt={profile.business_name || ''} className="max-h-16 max-w-[200px] object-contain" />
          ) : null}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: brandColor }}>
              {profile.business_name || 'Contractor'}
            </h1>
            {profile.license_number && <p className="text-sm text-muted-foreground/70">Lic# {profile.license_number}</p>}
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground/50">
          {profile.phone && <p><a href={`tel:${profile.phone.replace(/\D/g, '')}`} className="hover:text-primary-foreground underline">{formatPhone(profile.phone)}</a></p>}
          {profile.email && <p><a href={`mailto:${profile.email}`} className="hover:text-primary-foreground underline">{profile.email}</a></p>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Estimate View
// ═══════════════════════════════════════════════════

function EstimatePortalView({ estimateId, signMode = false }) {
  const queryClient = useQueryClient();
  const { data: estimate, isLoading: estLoading } = useQuery({
    queryKey: ['fs-public-estimate-view', estimateId],
    queryFn: async () => {
      const list = await base44.entities.FSEstimate.filter({ id: estimateId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!estimateId,
  });

  const profileId = estimate?.profile_id;
  const { data: profile, isLoading: profLoading } = useQuery({
    queryKey: ['fs-public-profile', profileId],
    queryFn: async () => {
      const list = await base44.entities.FieldServiceProfile.filter({ id: profileId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!profileId,
  });

  // Trade-grouped render mirrors EstimatePreview (DEC-206 platform default,
  // Phase 2.2 per-estimate snapshot). When group_by_trade is false, the flat
  // table renders. When true (default for new estimates), line items group by
  // trade with per-group subtotals; untagged items collect under "Unallocated"
  // at the top. Two-World Architecture (DEC-203) — clients see the same honest
  // grouping the contractor sees in EstimatePreview.
  //
  // Hooks must run on every render in stable order (Rules of Hooks), so the
  // useMemo calls and their derived dependencies sit above the early returns
  // for loading / not-found states. parseJSON returns [] on undefined input;
  // getEstimateTradeCategories reads the per-estimate snapshot first and falls
  // back to the workspace working list — both safe during the first render
  // before queries resolve.
  const lineItems = estimate ? parseJSON(estimate.line_items) : [];
  const isFlatLayout = estimate?.group_by_trade === false;
  const tradeCategories = getEstimateTradeCategories(estimate, profile);
  // Phase 2.5: workspace-current taxonomy + peopleMap power derivation. The
  // public profile read at line 134 already returns the full FieldServiceProfile
  // (including workers_json + trade_categories_json), so no new fetch needed.
  const workspaceCategories = useMemo(() => getTradeCategories(profile), [profile]);
  const { peopleMap } = useWorkspacePeople(profile);
  const tradeCatMap = useMemo(
    () => Object.fromEntries(tradeCategories.map((tc) => [tc.id, tc])),
    [tradeCategories]
  );
  // Phase 2.5: empty trade_category_id falls through deriveLineTrade before
  // falling to Unallocated. Mirrors EstimatePreview grouping shape exactly.
  const groupedByTrade = useMemo(() => {
    if (isFlatLayout) return null;
    const UNALLOCATED_ID = '__unallocated__';
    const UNALLOCATED_TC = { id: UNALLOCATED_ID, name: 'Unallocated', order: -1 };
    const groups = new Map();
    for (const item of lineItems) {
      const derived = deriveLineTrade(item, peopleMap, tradeCategories, workspaceCategories);
      const tcId = derived.id || '';
      const realTc = tcId ? tradeCatMap[tcId] : null;
      if (realTc) {
        if (!groups.has(realTc.id)) groups.set(realTc.id, { tc: realTc, items: [] });
        groups.get(realTc.id).items.push(item);
      } else {
        if (!groups.has(UNALLOCATED_ID)) groups.set(UNALLOCATED_ID, { tc: UNALLOCATED_TC, items: [] });
        groups.get(UNALLOCATED_ID).items.push(item);
      }
    }
    return Array.from(groups.entries())
      .sort((a, b) => (a[1].tc.order ?? 999) - (b[1].tc.order ?? 999));
  }, [isFlatLayout, lineItems, tradeCatMap, peopleMap, tradeCategories, workspaceCategories]);

  if (estLoading || profLoading) return <PortalLoading />;
  if (!estimate) return <PortalNotFound message="This estimate link may be invalid or expired." />;

  const brandColor = profile?.brand_color || '#f59e0b';
  const STATUS_LABELS = { draft: 'Draft', sent: 'Sent', awaiting_signature: 'Awaiting Signature', viewed: 'Viewed', accepted: 'Accepted', signed: 'Signed', declined: 'Declined' };
  const features = getFeatures(profile);
  const printRef = estimate.estimate_number || `id-${(estimate.id || '').slice(0, 8)}`;

  // Totals breakdown — mirrors EstimatePreview/PDF and the CO ClientPortal view
  // (DEC-203 Two-World Architecture: clients on the signing surface see the
  // same honest math the contractor sees). Privacy via client_show_breakdown:
  // when false, only the grand total renders; when true, the full row-by-row
  // breakdown shows. Stored _amount fields are preferred when present, with a
  // pct × subtotal fallback for backwards compat with records saved before
  // the amount fields existed (O&P never had a stored amount, computed live).
  const subtotal = parseFloat(estimate.subtotal) || 0;
  const mfPct = parseFloat(estimate.management_fee_pct) || 0;
  const mfAmount = parseFloat(estimate.management_fee_amount) || (subtotal * (mfPct / 100));
  const ifPct = parseFloat(estimate.insurance_fee_pct) || 0;
  const ifAmount = parseFloat(estimate.insurance_fee_amount) || (subtotal * (ifPct / 100));
  const opPct = parseFloat(estimate.overhead_profit_pct) || 0;
  const opAmount = subtotal * (opPct / 100);
  const otherAmount = parseFloat(estimate.other_amount) || 0;
  const taxPct = parseFloat(estimate.tax_rate) || 0;
  const taxAmount = parseFloat(estimate.tax_amount) || 0;
  const showBreakdown = estimate.client_show_breakdown === true;

  return (
    <PortalShell printTitle={`Estimate-${printRef}`}>
      <div className="max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-sm print:rounded-none print:shadow-none print:max-w-none">
        <PortalHeader profile={profile} brandColor={brandColor} />

        <div className="px-6 sm:px-8 py-6">
          {/* Title + Meta */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-primary-foreground">{estimate.title || 'Estimate'}</h2>
              {estimate.estimate_number && <p className="text-sm text-muted-foreground/70 mt-0.5">#{estimate.estimate_number}</p>}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isEstimateLocked(estimate) ? 'bg-emerald-100 text-emerald-700' :
              (estimate.status === 'sent' || estimate.status === 'awaiting_signature') ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-muted-foreground/50'
            }`}>
              {STATUS_LABELS[estimate.status] || estimate.status}
            </span>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground/70 mb-4">
            {estimate.date && <span>Date: {fmtDate(estimate.date)}</span>}
            {estimate.valid_until && <span>Valid until: {fmtDate(estimate.valid_until)}</span>}
          </div>

          {/* Client info */}
          {estimate.client_name && (
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1">Customer</p>
              <p className="font-semibold text-primary-foreground">{estimate.client_name}</p>
              {estimate.client_address && <p className="text-sm text-muted-foreground/50">{estimate.client_address}</p>}
              {estimate.client_phone && <p className="text-sm text-muted-foreground/50">{formatPhone(estimate.client_phone)}</p>}
              {estimate.client_email && <p className="text-sm text-muted-foreground/50">{estimate.client_email}</p>}
            </div>
          )}

          {/* Line items — trade-grouped (default) or flat per estimate.group_by_trade */}
          {lineItems.length > 0 && (
            <div className="mb-6">
              {!isFlatLayout && groupedByTrade ? (
                /* ─── Trade-grouped format (platform default) ─── */
                <div className="space-y-4">
                  {groupedByTrade.map(([tradeId, group]) => {
                    const catSubtotal = group.items.reduce(
                      (s, it) => s + ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)),
                      0
                    );
                    return (
                      <div key={tradeId}>
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1 pb-1 border-b" style={{ borderColor: brandColor }}>
                          {group.tc.name}
                        </h4>
                        <table className="w-full text-sm">
                          <tbody>
                            {group.items.map((item, i) => {
                              const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                              return (
                                <tr key={item.id || i} className="border-b border-slate-100">
                                  <td className="py-2 text-primary-foreground">{item.description || '—'}</td>
                                  <td className="py-2 text-muted-foreground/50 text-right w-16">{item.quantity}</td>
                                  <td className="py-2 text-muted-foreground/50 text-right w-28">{fmt(item.unit_price)}</td>
                                  <td className="py-2 text-primary-foreground font-medium text-right w-28">{fmt(amount)}</td>
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
                /* ─── Standard flat table (group_by_trade=false) ─── */
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 text-muted-foreground/70 font-medium">Description</th>
                      <th className="pb-2 text-muted-foreground/70 font-medium text-right">Qty</th>
                      <th className="pb-2 text-muted-foreground/70 font-medium text-right">Unit Price</th>
                      <th className="pb-2 text-muted-foreground/70 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => {
                      const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                      return (
                        <tr key={item.id || i} className="border-b border-slate-100">
                          <td className="py-2 text-primary-foreground">{item.description || '—'}</td>
                          <td className="py-2 text-muted-foreground/50 text-right">{item.quantity}</td>
                          <td className="py-2 text-muted-foreground/50 text-right">{fmt(item.unit_price)}</td>
                          <td className="py-2 text-primary-foreground font-medium text-right">{fmt(amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Totals — full breakdown when client_show_breakdown is true,
              grand total only when false. Display order matches EstimatePreview
              and the PDF: Subtotal → Management Fee → Insurance Fee → O&P →
              Other → Tax → Total. */}
          <div className="border-t border-border pt-4 space-y-1 text-sm">
            {showBreakdown && (
              <>
                {subtotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Subtotal</span>
                    <span className="font-medium">{fmt(subtotal)}</span>
                  </div>
                )}
                {features.management_fees_enabled === true && mfPct > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Management Fee ({mfPct}%)</span>
                    <span className="font-medium">{fmt(mfAmount)}</span>
                  </div>
                )}
                {features.insurance_fee_enabled === true && ifPct > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Insurance Fee ({ifPct}%)</span>
                    <span className="font-medium">{fmt(ifAmount)}</span>
                  </div>
                )}
                {features.overhead_profit_enabled === true && opPct > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">O&P ({opPct}%)</span>
                    <span className="font-medium">{fmt(opAmount)}</span>
                  </div>
                )}
                {otherAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Other</span>
                    <span className="font-medium">{fmt(otherAmount)}</span>
                  </div>
                )}
                {features.tax_enabled === true && taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Tax ({taxPct}%)</span>
                    <span className="font-medium">{fmt(taxAmount)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span style={{ color: brandColor }}>{fmt(estimate.total)}</span>
            </div>
          </div>

          {/* Terms */}
          {estimate.terms && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1">Terms & Conditions</p>
              <p className="text-sm text-muted-foreground/50 whitespace-pre-line">{estimate.terms}</p>
            </div>
          )}

          {/* Notes */}
          {estimate.notes && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-muted-foreground/50 whitespace-pre-line">{estimate.notes}</p>
            </div>
          )}

          {/* Signature display (already signed) */}
          {estimate.signature_data && (
            <div className="mt-6 pt-4 border-t border-border">
              <SignatureDisplay signatureData={estimate.signature_data} darkMode={false} />
            </div>
          )}
        </div>

        {/* Signing flow (when sign=true and in signable state) */}
        {signMode && (estimate.status === 'sent' || estimate.status === 'awaiting_signature') && !estimate.signature_data && estimate.portal_link_active !== false && (
          <div className="px-6 sm:px-8 pb-6">
            <EstimateSigningSection
              estimate={estimate}
              queryClient={queryClient}
            />
          </div>
        )}

        {/* Recalled message */}
        {signMode && estimate.portal_link_active === false && !estimate.signature_data && (
          <div className="px-6 sm:px-8 pb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-amber-800 font-medium">This estimate has been recalled by the sender.</p>
              <p className="text-amber-600 text-sm mt-1">Please contact {profile?.business_name || 'the sender'} for the updated version.</p>
            </div>
          </div>
        )}

        <PortalFooter />
      </div>
    </PortalShell>
  );
}

function EstimateSigningSection({ estimate, queryClient }) {
  const signMutation = useMutation({
    mutationFn: async (signatureData) => {
      // Route through server function — unauthenticated portal clients can't
      // update FSEstimate directly. Same pattern as signDocument.
      await invokeUnauthenticated('signEstimate', {
        estimate_id: estimate.id,
        portal_token: estimate.portal_token,
        signature_data: signatureData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-public-estimate-view'] });
    },
    onError: (err) => {
      console.error('Estimate e-sign failed:', err);
      toast.error('Could not save signature. Please try again.');
    },
  });

  // Build content string for hashing (the estimate text the signer sees)
  const docContent = [
    estimate.title,
    `Estimate #${estimate.estimate_number || ''}`,
    `Total: ${estimate.total}`,
    estimate.terms || '',
    estimate.notes || '',
  ].join('\n');

  return (
    <SigningFlow
      documentContent={docContent}
      documentTitle={estimate.title || 'Estimate'}
      signerName={estimate.client_name || ''}
      signerEmail={estimate.client_email || ''}
      onSign={(data) => signMutation.mutate(data)}
      isSaving={signMutation.isPending}
      darkMode={false}
    />
  );
}

// ═══════════════════════════════════════════════════
// Change Order View (Phase 1 Item 2c — lightweight signing surface)
// Mirrors EstimatePortalView. Item 6 lands the polished CO blocks layout.
// ═══════════════════════════════════════════════════

function ChangeOrderPortalView({ coId, signMode = false, portalToken = null }) {
  const queryClient = useQueryClient();
  const { data: co, isLoading: coLoading } = useQuery({
    queryKey: ['fs-public-co-view', coId],
    queryFn: async () => {
      const list = await base44.entities.FSChangeOrder.filter({ id: coId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!coId,
  });

  const profileId = co?.workspace_id;
  const { data: profile, isLoading: profLoading } = useQuery({
    queryKey: ['fs-public-profile', profileId],
    queryFn: async () => {
      const list = await base44.entities.FieldServiceProfile.filter({ id: profileId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!profileId,
  });

  const { data: project } = useQuery({
    queryKey: ['fs-public-co-project', co?.project_id],
    queryFn: async () => {
      if (!co?.project_id) return null;
      const list = await base44.entities.FSProject.filter({ id: co.project_id });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!co?.project_id,
  });

  if (coLoading || profLoading) return <PortalLoading />;
  if (!co) return <PortalNotFound message="This change order link may be invalid or expired." />;

  const brandColor = profile?.brand_color || '#f59e0b';
  const businessName = profile?.business_name || profile?.workspace_name || 'this business';
  const lineItems = parseJSON(co.line_items);
  const STATUS_LABELS = {
    draft: 'Draft', sent: 'Sent', awaiting_signature: 'Awaiting Signature',
    accepted: 'Accepted', signed: 'Signed', declined: 'Declined',
  };

  const hasToken = !!portalToken;
  const tokenValid = hasToken && co.portal_token === portalToken;
  const linkActive = co.portal_link_active !== false;
  const isRecalled = hasToken && !linkActive && co.status !== 'signed';
  const alreadySigned = co.status === 'signed';
  const canSign =
    signMode && tokenValid && linkActive &&
    (co.status === 'awaiting_signature' || co.status === 'sent') && !co.signature_data;

  const adjustment = co.amount !== undefined && co.amount !== null
    ? parseFloat(co.amount)
    : parseFloat(co.total) || 0;

  // Privacy toggle — same FSProject.client_show_breakdown field the estimate
  // portal honors. When false the client sees only descriptions and the grand
  // total; when true they see line item amounts + the calculated breakdown.
  const showBreakdown = project?.client_show_breakdown === true;
  const subtotal = parseFloat(co.subtotal) || (Array.isArray(lineItems)
    ? lineItems.reduce((s, it) => s + (parseFloat(it.amount) || ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0))), 0)
    : 0);
  const mfPct = parseFloat(co.management_fee_pct) || 0;
  const mfAmount = parseFloat(co.management_fee_amount) || (subtotal * (mfPct / 100));
  const ifPct = parseFloat(co.insurance_fee_pct) || 0;
  const ifAmount = parseFloat(co.insurance_fee_amount) || (subtotal * (ifPct / 100));
  const opPct = parseFloat(co.overhead_profit_pct) || 0;
  const opAmount = subtotal * (opPct / 100);
  const taxPct = parseFloat(co.tax_rate) || 0;
  const taxAmount = parseFloat(co.tax_amount) || 0;
  const otherAmount = parseFloat(co.other_amount) || 0;
  const features = getFeatures(profile);
  const taxVisible = features.tax_enabled === true && taxPct > 0;
  const coPrintTitle = `ChangeOrder-${co.change_order_number || `id-${(co.id || '').slice(0, 8)}`}`;

  if (isRecalled) {
    return (
      <PortalShell printTitle={coPrintTitle}>
        <div className="max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-sm">
          <PortalHeader profile={profile} brandColor={brandColor} />
          <div className="px-6 sm:px-8 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-primary-foreground mb-2">Change Order Recalled</h2>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
              This change order has been recalled by {businessName}. Please contact them for the updated version.
            </p>
          </div>
          <PortalFooter />
        </div>
      </PortalShell>
    );
  }

  if (hasToken && !tokenValid && !alreadySigned) {
    return <PortalNotFound message="This change order link may be invalid or expired." />;
  }

  return (
    <PortalShell printTitle={coPrintTitle}>
      <div className="max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-sm print:rounded-none print:shadow-none print:max-w-none">
        <PortalHeader profile={profile} brandColor={brandColor} />

        <div className="px-6 sm:px-8 py-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-primary-foreground">{co.title || 'Change Order'}</h2>
              {co.change_order_number && (
                <p className="text-sm text-muted-foreground/70 mt-0.5">{co.change_order_number}</p>
              )}
              {project?.name && (
                <p className="text-sm text-muted-foreground/70 mt-0.5">Project: {project.name}</p>
              )}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              alreadySigned ? 'bg-emerald-100 text-emerald-700' :
              (co.status === 'awaiting_signature' || co.status === 'sent') ? 'bg-amber-100 text-amber-700' :
              co.status === 'declined' ? 'bg-rose-100 text-rose-700' :
              'bg-slate-100 text-muted-foreground/50'
            }`}>
              {STATUS_LABELS[co.status] || co.status}
            </span>
          </div>

          {co.description && (
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-primary-foreground whitespace-pre-line">{co.description}</p>
            </div>
          )}

          {/* Line items — full table when client_show_breakdown is true,
              description-only list when toggled off (matches estimate portal). */}
          {lineItems.length > 0 && showBreakdown && (
            <div className="mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-muted-foreground/70 font-medium">Description</th>
                    <th className="pb-2 text-muted-foreground/70 font-medium text-right">Qty</th>
                    <th className="pb-2 text-muted-foreground/70 font-medium text-right">Unit Price</th>
                    <th className="pb-2 text-muted-foreground/70 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => {
                    const lineAmount = parseFloat(item.amount) || ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));
                    return (
                      <tr key={item.id || i} className="border-b border-slate-100">
                        <td className="py-2 text-primary-foreground">{item.description || '—'}</td>
                        <td className="py-2 text-muted-foreground/50 text-right">{item.quantity}</td>
                        <td className="py-2 text-muted-foreground/50 text-right">{fmt(item.unit_price)}</td>
                        <td className="py-2 text-primary-foreground font-medium text-right">{fmt(lineAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {lineItems.length > 0 && !showBreakdown && (
            <ul className="mb-6 list-disc list-inside text-sm text-primary-foreground space-y-1">
              {lineItems.map((item, i) => (
                <li key={item.id || i}>{item.description || '—'}</li>
              ))}
            </ul>
          )}

          {/* Calculated breakdown — only when contractor opted in */}
          {showBreakdown && (mfPct > 0 || ifPct > 0 || opPct > 0 || taxVisible || otherAmount > 0) && (
            <div className="border-t border-border pt-3 mb-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground/70">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {mfPct > 0 && (
                <div className="flex justify-between text-muted-foreground/70">
                  <span>Management Fee ({mfPct}%)</span><span>{fmt(mfAmount)}</span>
                </div>
              )}
              {ifPct > 0 && (
                <div className="flex justify-between text-muted-foreground/70">
                  <span>Insurance Fee ({ifPct}%)</span><span>{fmt(ifAmount)}</span>
                </div>
              )}
              {opPct > 0 && (
                <div className="flex justify-between text-muted-foreground/70">
                  <span>O&P ({opPct}%)</span><span>{fmt(opAmount)}</span>
                </div>
              )}
              {otherAmount > 0 && (
                <div className="flex justify-between text-muted-foreground/70">
                  <span>Other</span><span>{fmt(otherAmount)}</span>
                </div>
              )}
              {taxVisible && (
                <div className="flex justify-between text-muted-foreground/70">
                  <span>Tax ({taxPct}%)</span><span>{fmt(taxAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Net adjustment — always shown */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between text-base font-bold">
              <span>Net Contract Adjustment</span>
              <span style={{ color: brandColor }}>
                {adjustment >= 0 ? '+' : ''}{fmt(adjustment)}
              </span>
            </div>
            {project?.original_budget !== undefined && project?.original_budget !== null && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                This change order amends the original signed contract of{' '}
                {fmt(parseFloat(project.original_budget) || 0)}.
              </p>
            )}
          </div>

          {/* Signature display (already signed) */}
          {co.signature_data && (
            <div className="mt-6 pt-4 border-t border-border">
              <SignatureDisplay signatureData={co.signature_data} darkMode={false} />
            </div>
          )}

          {alreadySigned && hasToken && (
            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-sm text-emerald-700 font-medium">This change order has already been signed.</p>
            </div>
          )}
        </div>

        {canSign && (
          <div className="px-6 sm:px-8 pb-6">
            <ChangeOrderSigningSection co={co} queryClient={queryClient} />
          </div>
        )}

        {!signMode && (co.status === 'awaiting_signature' || co.status === 'sent') && !co.signature_data && (
          <div className="px-6 sm:px-8 pb-6 text-center">
            <p className="text-sm text-muted-foreground/70 italic">
              {businessName} will send you a signing link when this change order is ready for your signature.
            </p>
          </div>
        )}

        <PortalFooter />
      </div>
    </PortalShell>
  );
}

function ChangeOrderSigningSection({ co, queryClient }) {
  const signMutation = useMutation({
    mutationFn: async (signatureData) => {
      await invokeUnauthenticated('signChangeOrder', {
        change_order_id: co.id,
        portal_token: co.portal_token,
        signature_data: signatureData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-public-co-view'] });
    },
    onError: (err) => {
      console.error('Change order e-sign failed:', err);
      toast.error('Could not save signature. Please try again.');
    },
  });

  const adjustment = co.amount !== undefined && co.amount !== null
    ? parseFloat(co.amount)
    : parseFloat(co.total) || 0;

  const docContent = [
    co.title || 'Change Order',
    co.change_order_number || '',
    co.description || '',
    `Net adjustment: ${adjustment}`,
  ].join('\n');

  return (
    <SigningFlow
      documentContent={docContent}
      documentTitle={co.title || 'Change Order'}
      onSign={(data) => signMutation.mutate(data)}
      isSaving={signMutation.isPending}
      darkMode={false}
    />
  );
}

// ═══════════════════════════════════════════════════
// Document View (with portal_token validation + recall handling)
// ═══════════════════════════════════════════════════

function DocumentPortalView({ docId, signMode = false, portalToken = null }) {
  const queryClient = useQueryClient();
  const { data: doc, isLoading: docLoading } = useQuery({
    queryKey: ['fs-public-doc-view', docId],
    queryFn: async () => {
      const list = await base44.entities.FSDocument.filter({ id: docId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!docId,
  });

  const profileId = doc?.profile_id;
  const { data: profile, isLoading: profLoading } = useQuery({
    queryKey: ['fs-public-profile', profileId],
    queryFn: async () => {
      const list = await base44.entities.FieldServiceProfile.filter({ id: profileId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!profileId,
  });

  if (docLoading || profLoading) return <PortalLoading />;
  if (!doc) return <PortalNotFound message="This document link may be invalid or expired." />;

  const brandColor = profile?.brand_color || '#f59e0b';
  const businessName = profile?.business_name || profile?.workspace_name || 'this business';

  // Normalize status — map legacy "sent" to "awaiting_signature"
  const normalizedStatus = doc.status === 'sent' ? 'awaiting_signature' : doc.status;
  const STATUS_LABELS = { draft: 'Draft', awaiting_signature: 'Awaiting Signature', signed: 'Signed', archived: 'Archived' };

  // Token validation for signing links
  const hasToken = !!portalToken;
  const tokenValid = hasToken && doc.portal_token === portalToken;
  const linkActive = doc.portal_link_active !== false; // treat undefined/null as active for backward compat
  const isRecalled = hasToken && !linkActive;
  const alreadySigned = normalizedStatus === 'signed';
  const canSign = signMode && tokenValid && linkActive && (normalizedStatus === 'awaiting_signature') && !doc.signature_data;

  // Edge case: client opens recalled link
  if (isRecalled && hasToken && !alreadySigned) {
    return (
      <PortalShell>
        <div className="max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-sm">
          <PortalHeader profile={profile} brandColor={brandColor} />
          <div className="px-6 sm:px-8 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-primary-foreground mb-2">Document Recalled</h2>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
              This document has been recalled by {businessName}. Please contact them for the updated version.
            </p>
          </div>
          <PortalFooter />
        </div>
      </PortalShell>
    );
  }

  // Edge case: invalid token on signing link
  if (hasToken && !tokenValid && !alreadySigned) {
    return <PortalNotFound message="This document link may be invalid or expired." />;
  }

  return (
    <PortalShell>
      <div className="max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-sm print:rounded-none print:shadow-none print:max-w-none">
        <PortalHeader profile={profile} brandColor={brandColor} />

        <div className="px-6 sm:px-8 py-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-primary-foreground">{doc.title}</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              alreadySigned ? 'bg-emerald-100 text-emerald-700' :
              normalizedStatus === 'awaiting_signature' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-muted-foreground/50'
            }`}>
              {STATUS_LABELS[normalizedStatus] || normalizedStatus}
            </span>
          </div>

          {doc.client_name && <p className="text-sm text-muted-foreground/70 mb-1">Client: {doc.client_name}</p>}
          {doc.created_at && <p className="text-xs text-muted-foreground mb-4">{fmtDate(doc.created_at)}</p>}

          {/* Document content */}
          <div className="bg-slate-50 rounded-lg p-6 print:bg-white print:p-0">
            <pre className="whitespace-pre-wrap text-sm text-primary-foreground font-sans leading-relaxed">
              {doc.content}
            </pre>
          </div>

          {/* Signature display (already signed) */}
          {doc.signature_data && (
            <div className="mt-6 pt-4 border-t border-border">
              <SignatureDisplay signatureData={doc.signature_data} darkMode={false} />
            </div>
          )}

          {/* Already signed — show message if they opened the signing link again */}
          {alreadySigned && hasToken && (
            <div className="mt-6 pt-4 border-t border-border text-center">
              <p className="text-sm text-emerald-700 font-medium">This document has already been signed.</p>
            </div>
          )}
        </div>

        {/* Signing flow (validated token, active link, awaiting signature) */}
        {canSign && (
          <div className="px-6 sm:px-8 pb-6">
            <DocumentSigningSection doc={doc} profile={profile} queryClient={queryClient} />
          </div>
        )}

        {/* Prompt when awaiting but not in sign mode (no token) */}
        {!signMode && normalizedStatus === 'awaiting_signature' && !doc.signature_data && (
          <div className="px-6 sm:px-8 pb-6 text-center">
            <p className="text-sm text-muted-foreground/70 italic">
              {businessName} will send you a signing link when this document is ready for your signature.
            </p>
          </div>
        )}

        <PortalFooter />
      </div>
    </PortalShell>
  );
}

function DocumentSigningSection({ doc, profile, queryClient }) {
  const [signedSuccessfully, setSignedSuccessfully] = useState(false);
  const [signatureResult, setSignatureResult] = useState(null);
  const businessName = profile?.business_name || profile?.workspace_name || 'this business';

  const signMutation = useMutation({
    mutationFn: async (signatureData) => {
      // Route through server function — unauthenticated portal clients can't
      // update FSDocument directly. The server function validates the portal_token
      // and updates via asServiceRole. Uses invokeUnauthenticated() because the
      // standard base44.functions.invoke() sends a Bearer token which is absent
      // in the client portal (incognito/unauthenticated), causing a 401 before
      // the function even runs.
      await invokeUnauthenticated('signDocument', {
        document_id: doc.id,
        portal_token: doc.portal_token,
        signature_data: signatureData,
      });
      return signatureData;
    },
    onSuccess: (signatureData) => {
      setSignatureResult(signatureData);
      setSignedSuccessfully(true);
      queryClient.invalidateQueries({ queryKey: ['fs-public-doc-view'] });
    },
    onError: (err) => {
      console.error('Document e-sign failed:', err);
      toast.error('Could not save signature. Please try again.');
    },
  });

  // Post-signature confirmation screen
  if (signedSuccessfully && signatureResult) {
    const signedDate = signatureResult.signed_at
      ? new Date(signatureResult.signed_at).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : '';

    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-primary-foreground mb-1">Document Signed Successfully</h3>
          <p className="text-sm text-muted-foreground/50 mb-4">{doc.title}</p>
          <div className="text-sm text-muted-foreground/70 space-y-0.5">
            <p>Signed by: {signatureResult.signer_name}</p>
            {signedDate && <p>Date: {signedDate}</p>}
          </div>
          {signatureResult.signature_image && (
            <img
              src={signatureResult.signature_image}
              alt={`Signature of ${signatureResult.signer_name}`}
              className="max-h-16 max-w-[200px] object-contain mx-auto mt-4"
            />
          )}
        </div>

        {/* Construction Gate — remove when post-signature invitation passes walkthrough */}
        {false && (
          <div className="border border-border rounded-xl p-6 text-center space-y-4">
            <div className="h-px bg-slate-200" />
            <p className="text-sm text-muted-foreground/50">
              {businessName} uses Local Lane to manage their work. Stay connected?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a href="/signup?role=client" className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm transition-colors text-center">
                See my documents & projects
              </a>
              <a href="/onboarding" className="px-4 py-2.5 rounded-lg border border-border text-slate-700 hover:text-primary-foreground text-sm transition-colors text-center">
                Start my own business on Local Lane
              </a>
            </div>
            <button type="button" className="text-xs text-muted-foreground hover:text-muted-foreground/50">No thanks</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <SigningFlow
      documentContent={doc.content || ''}
      documentTitle={doc.title || 'Document'}
      signerName={doc.client_name || ''}
      signerEmail={''}
      onSign={(data) => signMutation.mutate(data)}
      isSaving={signMutation.isPending}
      darkMode={false}
    />
  );
}

// ═══════════════════════════════════════════════════
// Project View (refactored from original monolith)
// ═══════════════════════════════════════════════════

function ProjectPortalView({ profileId: pathProfileId, projectId: pathProjectId }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // ─── Queries ────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['fs-public-profile', pathProfileId],
    queryFn: async () => {
      if (!pathProfileId) return null;
      const list = await base44.entities.FieldServiceProfile.filter({ id: pathProfileId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!pathProfileId,
  });

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['fs-public-project', pathProjectId],
    queryFn: async () => {
      if (!pathProjectId) return null;
      const list = await base44.entities.FSProject.filter({ id: pathProjectId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!pathProjectId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['fs-public-payments', pathProjectId],
    queryFn: async () => {
      const list = await base44.entities.FSPayment.filter({ project_id: pathProjectId });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!pathProjectId,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['fs-public-photos', pathProjectId],
    queryFn: async () => {
      const list = await base44.entities.FSDailyPhoto.filter({ project_id: pathProjectId });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!pathProjectId,
  });

  const { data: permits = [] } = useQuery({
    queryKey: ['fs-public-permits', pathProjectId],
    queryFn: async () => {
      const list = await base44.entities.FSPermit.filter({ project_id: pathProjectId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!pathProjectId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['fs-public-logs', pathProjectId],
    queryFn: async () => {
      const list = await base44.entities.FSDailyLog.filter({ project_id: pathProjectId });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!pathProjectId,
  });

  const { data: estimate } = useQuery({
    queryKey: ['fs-public-estimate', project?.estimate_id],
    queryFn: async () => {
      if (!project?.estimate_id) return null;
      const list = await base44.entities.FSEstimate.filter({ id: project.estimate_id });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!project?.estimate_id,
  });

  // ─── Derived ────────────────────────────────────
  const brandColor = profile?.brand_color || '#f59e0b';

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

  const loading = profileLoading || projectLoading;

  if (loading) return <PortalLoading />;
  if (!project || !profile) return <PortalNotFound message="This project link may be invalid or expired." />;

  // Open books: show budget breakdown if contractor has enabled it
  const showBreakdown = project.client_show_breakdown === true;

  return (
    <PortalShell>
      <div className="max-w-3xl mx-auto bg-white rounded-xl overflow-hidden shadow-sm print:rounded-none print:shadow-none print:max-w-none">
        <PortalHeader profile={profile} brandColor={brandColor} />

        {/* Project Info */}
        <div className="px-6 sm:px-8 py-6">
          <h2 className="text-xl font-bold text-primary-foreground">{project.name}</h2>
          {project.address && <p className="text-sm text-muted-foreground/70 mt-1">{project.address}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 capitalize">
              {project.status}
            </span>
            {daysSinceStart > 0 && (
              <span className="text-xs text-muted-foreground/70">Day {daysSinceStart} &middot; {dayCount} logs</span>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="px-6 sm:px-8 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Budget Progress */}
          {referenceTotal > 0 && (
            <div className="border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Budget Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/70">Estimate Total</span>
                  <span className="font-bold">{fmt(referenceTotal)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${paidPct}%`, backgroundColor: brandColor }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground/70">
                  <span>{Math.round(paidPct)}% complete</span>
                  <span>{fmt(balance)} remaining</span>
                </div>
              </div>

              {/* Open Books — budget breakdown */}
              {showBreakdown && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-xs text-muted-foreground/70 uppercase tracking-wider">Cost Breakdown</p>
                  {project.original_budget > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground/70">Original Budget</span>
                      <span className="font-medium">{fmt(project.original_budget)}</span>
                    </div>
                  )}
                  {project.original_budget > 0 && project.total_budget !== project.original_budget && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground/70">Change Orders</span>
                      <span className="font-medium">{fmt((project.total_budget || 0) - (project.original_budget || 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground/70">Total Paid</span>
                    <span className="font-medium text-emerald-600">{fmt(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-700">Balance Due</span>
                    <span style={{ color: brandColor }}>{fmt(balance)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Summary */}
          {payments.length > 0 && (
            <div className="border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/70">Total Paid</span>
                  <span className="font-bold text-emerald-600">{fmt(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/70">Balance</span>
                  <span className="font-bold" style={{ color: brandColor }}>{fmt(balance)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                  {payments.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex justify-between text-xs text-muted-foreground/70">
                      <span>{fmtDate(p.date)} &middot; <span className="capitalize">{p.type?.replace('_', ' ')}</span></span>
                      <span className="font-medium text-slate-700">{fmt(p.amount)}</span>
                    </div>
                  ))}
                  {payments.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+ {payments.length - 4} more payments</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Photos */}
          {photoUrls.length > 0 && (
            <div className="border border-border rounded-xl p-5 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-4 w-4" style={{ color: brandColor }} />
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Latest Photos</h3>
                <span className="text-xs text-muted-foreground ml-auto">{photos.length} total</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {photoUrls.slice(0, 12).map((p, i) => (
                  <button key={p.id || i} type="button" onClick={() => setLightboxPhoto(p.url)}
                    className="aspect-square rounded-lg overflow-hidden border border-border relative">
                    <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                    {p.phase && (
                      <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-foreground px-1 py-0.5 rounded">
                        {p.phase}
                      </span>
                    )}
                  </button>
                ))}
                {photoUrls.length > 12 && (
                  <div className="aspect-square rounded-lg bg-slate-50 border border-border flex items-center justify-center text-sm font-medium text-muted-foreground">
                    +{photoUrls.length - 12}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permits */}
          {permits.length > 0 && (
            <div className="border border-border rounded-xl p-5">
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
                        {permit.permit_number && <span className="text-xs text-muted-foreground ml-1">#{permit.permit_number}</span>}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          permit.status === 'issued' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {PERMIT_STATUS[permit.status] || permit.status}
                        </span>
                        {lastInsp && (
                          <p className="text-xs text-muted-foreground mt-0.5">
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
            <div className="border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Recent Updates</h3>
              <div className="space-y-3">
                {logs.slice(0, 5).map((log) => {
                  const taskPreview = parseTasks(log.tasks_completed);
                  const logPhotos = photos.filter((p) => p.daily_log_id === log.id);
                  return (
                    <div key={log.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-muted-foreground/70">{fmtDate(log.date)}</span>
                        {logPhotos.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Camera className="h-3 w-3" /> {logPhotos.length}
                          </span>
                        )}
                      </div>
                      {taskPreview && (
                        <p className="text-sm text-muted-foreground/50 line-clamp-2">{taskPreview}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <PortalFooter />
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 print:hidden"
          onClick={() => setLightboxPhoto(null)} role="dialog" aria-modal="true">
          <button type="button" onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-primary rounded-lg bg-secondary/80"
            aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxPhoto} alt="" className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </PortalShell>
  );
}

// ═══════════════════════════════════════════════════
// Shared UI
// ═══════════════════════════════════════════════════

function PortalShell({ children, printTitle = null }) {
  // PDF filename defaults to <title>. When the parent passes a printTitle (e.g.
  // `Estimate-EST-2026-001`) we swap document.title for the duration of print
  // so contractors save Estimate-EST-2026-001.pdf instead of the generic page
  // title. Restore on a delay since browser print is async.
  const handlePrint = () => {
    if (!printTitle) {
      window.print();
      return;
    }
    const previous = document.title;
    document.title = printTitle;
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = previous; }, 1000);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`@media print {
        body { background: white !important; }
        .print\\:hidden { display: none !important; }
      }`}</style>

      {/* Print button */}
      <div className="max-w-3xl mx-auto px-4 py-4 flex justify-end print:hidden">
        <button type="button" onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground/50 hover:text-primary-foreground transition-colors text-sm">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {children}
    </div>
  );
}

function PortalLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
    </div>
  );
}

function PortalNotFound({ message }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-primary-foreground mb-2">Not Found</h1>
        <p className="text-muted-foreground/70">{message || 'This link may be invalid or expired.'}</p>
        <p className="text-sm text-muted-foreground mt-4">If you believe this is an error, contact your contractor.</p>
      </div>
    </div>
  );
}

function PortalFooter() {
  return (
    <div className="px-6 sm:px-8 py-4 bg-slate-50 text-center">
      <p className="text-xs text-muted-foreground">
        Powered by LocalLane — Connecting Eugene's community
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Main Router
// ═══════════════════════════════════════════════════

export default function ClientPortal() {
  const { profileId, projectId } = useParams();
  const [searchParams] = useSearchParams();

  // Query param-based routing (new pattern)
  const estimateId = searchParams.get('estimate');
  const docId = searchParams.get('doc');
  const coId = searchParams.get('co');
  const qsProjectId = searchParams.get('project');
  const signMode = searchParams.get('sign') === 'true';
  const portalToken = searchParams.get('token');

  // Priority: estimate > doc > co > project (query params) > project (path params)
  if (estimateId) {
    return <EstimatePortalView estimateId={estimateId} signMode={signMode} />;
  }
  if (docId) {
    return <DocumentPortalView docId={docId} signMode={signMode} portalToken={portalToken} />;
  }
  if (coId) {
    return <ChangeOrderPortalView coId={coId} signMode={signMode} portalToken={portalToken} />;
  }
  if (profileId && projectId) {
    return <ProjectPortalView profileId={profileId} projectId={projectId} />;
  }
  if (qsProjectId) {
    // For query param project links — we need the profileId from the project itself
    return <ProjectPortalViewByProjectId projectId={qsProjectId} />;
  }

  // No valid params — landing page
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold text-primary-foreground mb-2">Client Portal</h1>
        <p className="text-muted-foreground/70 mb-4">
          This portal is accessed through a link shared by your contractor.
          If you received a link, please use the full URL provided.
        </p>
        <p className="text-sm text-muted-foreground">
          Contact your contractor for an updated link if this page was reached in error.
        </p>
      </div>
    </div>
  );
}

// Helper for query-param project access (fetches profileId from project)
function ProjectPortalViewByProjectId({ projectId }) {
  const { data: project, isLoading } = useQuery({
    queryKey: ['fs-public-project-lookup', projectId],
    queryFn: async () => {
      const list = await base44.entities.FSProject.filter({ id: projectId });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!projectId,
  });

  if (isLoading) return <PortalLoading />;
  if (!project) return <PortalNotFound message="This project link may be invalid or expired." />;

  return <ProjectPortalView profileId={project.profile_id} projectId={projectId} />;
}
