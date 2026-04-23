/**
 * FIELD SERVICE DOCUMENTS — Workflow Redesign
 *
 * Client-grouped document list, required client selection,
 * one-action Send for Signature, recall flow, amendment support.
 * Industry-agnostic — works for any Field Service workspace preset.
 *
 * Templates are seeded by functions/initializeWorkspace.ts (service role).
 * PRE-REQUISITE: FSDocument entity must have fields:
 *   portal_token, portal_link_active, sent_for_signature_at,
 *   recalled_at, amendment_of, signed_at
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import SigningFlow, { SignatureDisplay } from '@/components/shared/SigningFlow';
import {
  FileText, Plus, ArrowLeft, Pencil, Trash2, Loader2, Save,
  Search, Eye, Printer, X, Copy, Send, Archive, Shield,
  ChevronDown, UserPlus, FolderOpen, RotateCcw, FilePlus,
  ExternalLink, AlertTriangle, Check,
} from 'lucide-react';

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px]';
const LABEL_CLASS = 'block text-foreground-soft text-sm font-medium mb-1';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Normalize status for display — maps legacy "sent" to "awaiting_signature" */
function normalizeStatus(status) {
  if (status === 'sent') return 'awaiting_signature';
  return status || 'draft';
}

const DOC_STATUS_CONFIG = {
  draft:              { label: 'Draft',              color: 'bg-muted-foreground/20 text-muted-foreground', priority: 1 },
  awaiting_signature: { label: 'Awaiting Signature', color: 'bg-primary/20 text-primary-hover', priority: 0, pulse: true },
  signed:             { label: 'Signed',             color: 'bg-emerald-500/20 text-emerald-400', priority: 2 },
  archived:           { label: 'Archived',           color: 'bg-secondary/50 text-muted-foreground/50', priority: 3 },
};

const TEMPLATE_TYPE_BADGES = {
  lien_notice:    { label: 'Lien Notice',   color: 'bg-primary/20 text-primary-hover' },
  sub_agreement:  { label: 'Sub Agreement', color: 'bg-sky-500/20 text-sky-400' },
  contract:       { label: 'Contract',      color: 'bg-violet-500/20 text-violet-400' },
  change_order:   { label: 'Change Order',  color: 'bg-rose-500/20 text-rose-400' },
  waiver:         { label: 'Waiver',        color: 'bg-emerald-500/20 text-emerald-400' },
  custom:         { label: 'Custom',        color: 'bg-muted-foreground/20 text-muted-foreground' },
};

// ═══════════════════════════════════════════════════
// Legal Disclaimer — system templates only
// ═══════════════════════════════════════════════════

const SYSTEM_TEMPLATE_DISCLAIMER =
  'This template is provided as a convenience. It is not legal advice. Laws vary by ' +
  'jurisdiction and change over time. Before using this document for a real transaction, ' +
  'have it reviewed by a licensed attorney in your state. LocalLane makes no warranty that ' +
  'this template is fit for any particular purpose or complies with all applicable laws.';

// ═══════════════════════════════════════════════════
// Merge Field Replacement Engine
// ═══════════════════════════════════════════════════

function mergeFields(content, data) {
  let result = content;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

// Branding composites from the Business record (primary) with FSProfile fallback.
// Legacy {{company_*}} and new {{business_*}} both resolve to the same values.
function buildMergeData(profile, business, client, project, estimate) {
  const today = new Date();
  const bizName = business?.name || profile?.business_name || profile?.workspace_name || '';
  const bizPhoneRaw = business?.phone || profile?.phone || '';
  const bizPhone = bizPhoneRaw ? formatPhone(bizPhoneRaw) : '';
  const bizEmail = business?.email || business?.contact_email || profile?.email || '';
  const bizWebsite = business?.website || profile?.website || '';
  const bizAddress = business?.street_address || business?.address || '';
  const bizCity = business?.city || '';
  const bizState = business?.state || '';
  const bizZip = business?.zip_code || '';
  const bizFullAddress = [bizAddress, bizCity, [bizState, bizZip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const bizLogo = business?.logo_url || profile?.logo_url || '';
  const bizBanner = business?.banner_url || '';
  return {
    date: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    current_date: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    current_year: String(today.getFullYear()),
    client_name: client?.name || '',
    client_email: client?.email || '',
    client_phone: client?.phone ? formatPhone(client.phone) : '',
    client_address: client?.address || '',
    client_city: client?.city || '',
    client_state: client?.state || '',
    client_zip_code: client?.zip_code || '',
    client_company_name: client?.company_name || '',
    client_full_address: [client?.address, client?.city, [client?.state, client?.zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    project_name: project?.name || '',
    project_address: project?.address || client?.address || '',
    project_description: project?.description || '',
    start_date: project?.start_date || '',
    end_date: project?.estimated_end_date || '',
    project_budget: project?.total_budget ? fmt(project.total_budget) : '',
    estimate_number: estimate?.estimate_number || '',
    estimate_total: estimate?.total ? fmt(estimate.total) : '',
    estimate_subtotal: estimate?.subtotal ? fmt(estimate.subtotal) : '',
    estimate_terms: estimate?.terms || '',
    // Legacy company_* (preserved for existing system templates)
    company_name: bizName,
    company_phone: bizPhone,
    company_email: bizEmail,
    company_website: bizWebsite,
    // New business_* — preferred for new templates
    business_name: bizName,
    business_phone: bizPhone,
    business_email: bizEmail,
    business_website: bizWebsite,
    business_address: bizAddress,
    business_city: bizCity,
    business_state: bizState,
    business_zip_code: bizZip,
    business_full_address: bizFullAddress,
    business_logo_url: bizLogo,
    business_banner_url: bizBanner,
    business_license_number: profile?.license_number || '',
    business_tagline: business?.tagline || profile?.tagline || '',
    // Owner / signature fields
    owner_name: profile?.owner_name || '',
    owner_signature_name: profile?.owner_name || '',
    owner_signature_email: profile?.email || '',
    owner_signature_phone: profile?.phone ? formatPhone(profile.phone) : '',
    // Legacy / misc
    license_number: profile?.license_number || '',
    service_area: profile?.service_area || business?.service_area || '',
    amount_owed: estimate?.total ? fmt(estimate.total) : project?.total_budget ? fmt(project.total_budget) : '',
    due_date: '',
    sub_name: '',
    scope_of_work: '',
    sub_amount: '',
    payment_terms: '',
  };
}

// Preview merge data — real branding, bracketed placeholders for per-client fields
const PREVIEW_PLACEHOLDERS = {
  client_name: '[Client Name]',
  client_email: '[Client Email]',
  client_phone: '[Client Phone]',
  client_address: '[Client Address]',
  client_city: '[Client City]',
  client_state: '[Client State]',
  client_zip_code: '[Client Zip]',
  client_company_name: '[Client Company]',
  client_full_address: '[Client Address]',
  project_name: '[Project Name]',
  project_address: '[Project Address]',
  project_description: '[Project Description]',
  start_date: '[Start Date]',
  end_date: '[End Date]',
  project_budget: '[Project Budget]',
  estimate_number: '[Estimate #]',
  estimate_total: '[Estimate Total]',
  estimate_subtotal: '[Estimate Subtotal]',
  estimate_terms: '[Estimate Terms]',
  amount_owed: '[Amount Owed]',
  due_date: '[Due Date]',
  sub_name: '[Subcontractor Name]',
  scope_of_work: '[Scope of Work]',
  sub_amount: '[Subcontractor Amount]',
  payment_terms: '[Payment Terms]',
};

function buildPreviewMergeData(profile, business) {
  return { ...buildMergeData(profile, business, null, null, null), ...PREVIEW_PLACEHOLDERS };
}

// ═══════════════════════════════════════════════════
// Status Badge (with optional pulsing dot)
// ═══════════════════════════════════════════════════

function StatusBadge({ status, signedAt }) {
  const normalized = normalizeStatus(status);
  const cfg = DOC_STATUS_CONFIG[normalized] || DOC_STATUS_CONFIG.draft;
  const dateStr = normalized === 'signed' && signedAt
    ? new Date(signedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-hover opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
      )}
      {cfg.label}
      {dateStr && <span className="ml-1 opacity-75">{dateStr}</span>}
    </span>
  );
}

// ═══════════════════════════════════════════════════
// Document Row (inline actions per status)
// ═══════════════════════════════════════════════════

function DocumentRow({ doc, onView, onEdit, onSendForSignature, onCopyLink, onRecall, onDelete, onPrint, deleteConfirm, setDeleteConfirm }) {
  const normalized = normalizeStatus(doc.status);
  const isDraft = normalized === 'draft';
  const isAwaiting = normalized === 'awaiting_signature';
  const isSigned = normalized === 'signed';

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors group">
      {/* Icon */}
      <FileText className={`h-4 w-4 flex-shrink-0 ${
        isSigned ? 'text-emerald-500' : isAwaiting ? 'text-primary' : 'text-muted-foreground/70'
      }`} />

      {/* Title + status */}
      <button type="button" onClick={() => onView(doc)} className="flex-1 min-w-0 text-left">
        <span className="text-sm font-medium text-foreground truncate block">{doc.title}</span>
      </button>

      <StatusBadge status={doc.status} signedAt={doc.signed_at || doc.signature_data?.signed_at} />

      {/* Inline actions — shown on hover / always on mobile */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        {isDraft && (
          <>
            <button type="button" onClick={() => onEdit(doc)} title="Edit"
              className="p-2.5 text-muted-foreground hover:text-primary transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onSendForSignature(doc)} title="Send for Signature"
              className="p-2.5 text-primary hover:text-primary-hover transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Send className="h-4 w-4" />
            </button>
            <button type="button"
              onClick={() => {
                if (deleteConfirm === doc.id) {
                  onDelete(doc.id);
                } else {
                  setDeleteConfirm(doc.id);
                  toast('Click delete again to confirm', { duration: 3000 });
                }
              }}
              title="Delete"
              className="p-2.5 text-muted-foreground/70 hover:text-red-400 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        {isAwaiting && (
          <>
            <button type="button" onClick={() => onCopyLink(doc)} title="Copy Signing Link"
              className="p-2.5 text-muted-foreground hover:text-primary transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onRecall(doc)} title="Recall"
              className="p-2.5 text-muted-foreground hover:text-orange-400 transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </button>
          </>
        )}
        {isSigned && (
          <>
            <button type="button" onClick={() => onView(doc)} title="View"
              className="p-2.5 text-muted-foreground hover:text-primary transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onPrint(doc)} title="Print"
              className="p-2.5 text-muted-foreground hover:text-foreground transition-colors rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Printer className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Client Section Header
// ═══════════════════════════════════════════════════

function ClientSectionHeader({ name, count }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1 first:pt-0">
      <div className="h-px flex-1 bg-secondary" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        {name} <span className="text-muted-foreground/50">({count})</span>
      </span>
      <div className="h-px flex-1 bg-secondary" />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Recall Confirmation Dialog
// ═══════════════════════════════════════════════════

function RecallDialog({ doc, onConfirm, onCancel, isRecalling }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Recall Document?</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          This will invalidate the signing link. Your client won't be able to sign until you send again.
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-foreground-soft hover:text-foreground hover:bg-transparent text-sm min-h-[44px] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={isRecalling}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-primary-foreground font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
            {isRecalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Recall
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Template Preview Modal — read-only preview before commit
// ═══════════════════════════════════════════════════

function TemplatePreviewModal({ template, profile, business, onClose, onUseTemplate }) {
  const rendered = useMemo(() => {
    if (!template) return '';
    const data = buildPreviewMergeData(profile, business);
    return mergeFields(template.content || '', data);
  }, [template, profile, business]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!template) return null;
  const isSystem = !!template.is_system;
  const logoUrl = business?.logo_url || profile?.logo_url || '';
  const bizName = business?.name || profile?.business_name || 'Your Business';
  const typeBadge = TEMPLATE_TYPE_BADGES[template.template_type] || TEMPLATE_TYPE_BADGES.custom;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl max-w-3xl w-full my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground truncate">{template.title}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${typeBadge.color}`}>
                {typeBadge.label}
              </span>
              {isSystem && (
                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground">
                  System Template
                </span>
              )}
              {template.description && (
                <span className="text-xs text-muted-foreground/70 truncate">{template.description}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground/70 hover:text-foreground-soft transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Disclaimer banner (system templates only) */}
        {isSystem && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-primary-hover flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground-soft leading-relaxed">
                {SYSTEM_TEMPLATE_DISCLAIMER}
              </p>
            </div>
          </div>
        )}

        {/* Rendered content on paper */}
        <div className="p-4">
          <div className="bg-white rounded-lg p-6 md:p-8 shadow-inner">
            {(logoUrl || bizName) && (
              <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={bizName}
                    className="h-12 w-12 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 truncate">{bizName}</p>
                  {(business?.tagline || profile?.tagline) && (
                    <p className="text-xs text-slate-600 truncate">{business?.tagline || profile?.tagline}</p>
                  )}
                </div>
              </div>
            )}

            <pre className="whitespace-pre-wrap text-sm text-slate-900 font-sans leading-relaxed">
              {rendered}
            </pre>

            {isSystem && (
              <div className="mt-6 pt-3 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 italic leading-snug">
                  {SYSTEM_TEMPLATE_DISCLAIMER}
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground/70 mt-3">
            Fields shown in [brackets] will be filled in during document creation.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end p-4 border-t border-border bg-secondary/30 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-foreground-soft hover:text-foreground hover:bg-transparent text-sm min-h-[44px] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onUseTemplate(template)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm min-h-[44px] transition-colors"
          >
            <FileText className="h-4 w-4" />
            Use this Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Document Detail View
// ═══════════════════════════════════════════════════

function DocumentDetail({
  doc, client, profile, business, sourceTemplate, currentUser, onBack, onUpdate, onDelete, onSendForSignature,
  onCopyLink, onRecall, onCreateAmendment, isUpdating,
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(doc.content || '');
  const [showOwnerSign, setShowOwnerSign] = useState(false);
  const [ownerSigning, setOwnerSigning] = useState(false);
  const normalized = normalizeStatus(doc.status);
  const isDraft = normalized === 'draft';
  const isAwaiting = normalized === 'awaiting_signature';
  const isSigned = normalized === 'signed';
  const isArchived = normalized === 'archived';

  const hasOwnerSig = !!doc.owner_signature_data;
  const hasClientSig = !!doc.signature_data;

  const handleSave = () => {
    onUpdate(doc.id, { content: editContent });
    setEditing(false);
  };

  const handleOwnerSign = async (signatureData) => {
    setOwnerSigning(true);
    try {
      await onUpdate(doc.id, {
        owner_signature_data: JSON.stringify(signatureData),
        owner_signed_at: signatureData.signed_at,
      });
      setShowOwnerSign(false);
      toast.success('Owner signature saved');
    } catch (err) {
      toast.error('Failed to save signature');
    }
    setOwnerSigning(false);
  };

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm min-h-[44px] print:hidden">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4 print:hidden">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-foreground">{doc.title}</h2>
            {client && <p className="text-sm text-muted-foreground mt-0.5">{client.name}</p>}
            {client?.email && <p className="text-xs text-muted-foreground/70">{client.email}</p>}
            {doc.project_name && <p className="text-xs text-muted-foreground/70 mt-0.5">{doc.project_name}</p>}
            {doc.amendment_of && (
              <p className="text-xs text-primary/70 mt-1">Amendment of a previous document</p>
            )}
          </div>
          <StatusBadge status={doc.status} signedAt={doc.signed_at} />
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground/70">
          {doc.created_at && (
            <span>Created: {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
          {doc.sent_for_signature_at && (
            <span>Sent: {new Date(doc.sent_for_signature_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
          {doc.recalled_at && (
            <span className="text-orange-400/70">Recalled: {new Date(doc.recalled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
          {isDraft && !editing && (
            <button type="button" onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent text-xs min-h-[44px] transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {isDraft && (
            <button type="button" onClick={() => onSendForSignature(doc)} disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs min-h-[44px] transition-colors disabled:opacity-50">
              <Send className="h-3.5 w-3.5" /> Send for Signature
            </button>
          )}
          {isAwaiting && (
            <>
              <button type="button" onClick={() => onCopyLink(doc)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent text-xs min-h-[44px] transition-colors">
                <Copy className="h-3.5 w-3.5" /> Copy Signing Link
              </button>
              <button type="button" onClick={() => onRecall(doc)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-orange-800/50 text-orange-400 hover:border-orange-600 hover:bg-transparent text-xs min-h-[44px] transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /> Recall
              </button>
            </>
          )}
          {isSigned && (
            <>
              <button type="button" onClick={() => onCreateAmendment(doc)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent text-xs min-h-[44px] transition-colors">
                <FilePlus className="h-3.5 w-3.5" /> Create Amendment
              </button>
              <button type="button" onClick={() => onUpdate(doc.id, { status: 'archived' })} disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground-soft hover:bg-transparent text-xs min-h-[44px] transition-colors disabled:opacity-50">
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            </>
          )}
          {isArchived && (
            <button type="button" onClick={() => onUpdate(doc.id, { status: 'signed' })} disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent text-xs min-h-[44px] transition-colors disabled:opacity-50">
              <Archive className="h-3.5 w-3.5" /> Unarchive
            </button>
          )}
          {!hasOwnerSig && !showOwnerSign && (
            <button type="button" onClick={() => setShowOwnerSign(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-700/50 text-emerald-400 hover:border-emerald-600 hover:bg-transparent text-xs min-h-[44px] transition-colors">
              <Shield className="h-3.5 w-3.5" /> Sign as Owner
            </button>
          )}
          {hasOwnerSig && (
            <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Owner Signed
            </span>
          )}
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground-soft hover:bg-transparent text-xs min-h-[44px] transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          {isDraft && (
            <button type="button" onClick={() => onDelete(doc.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-800/50 text-red-400 hover:border-red-700 hover:bg-transparent text-xs min-h-[44px] transition-colors ml-auto">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style>{`@media print {
        nav, .app-header, .print\\:hidden, [class*="sidebar"] { display: none !important; }
        @page { margin: 0.75in; size: letter; }
        body { background: white !important; margin: 0; padding: 0; }
        .doc-print-area { position: absolute; top: 0; left: 0; width: 100%; }
        .doc-print-area * { color: #111827 !important; }
      }`}</style>

      {/* Document Content */}
      <div className="doc-print-area bg-white rounded-xl p-6 md:p-10 shadow-lg print:shadow-none print:p-0 print:rounded-none">
        {/* Business letterhead — composites from Business branding when available */}
        {(business?.logo_url || profile?.logo_url || business?.name || profile?.business_name) && (
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200">
            {(business?.logo_url || profile?.logo_url) && (
              <img
                src={business?.logo_url || profile?.logo_url}
                alt={business?.name || profile?.business_name || 'Business logo'}
                className="h-12 w-12 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-900 truncate">
                {business?.name || profile?.business_name || profile?.workspace_name}
              </p>
              {(business?.tagline || profile?.tagline) && (
                <p className="text-xs text-slate-600 truncate">{business?.tagline || profile?.tagline}</p>
              )}
            </div>
          </div>
        )}
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[500px] bg-slate-50 border border-border text-primary-foreground rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <div className="flex gap-2">
              <button type="button" onClick={handleSave} disabled={isUpdating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
                <Save className="h-4 w-4" /> Save
              </button>
              <button type="button" onClick={() => { setEditContent(doc.content); setEditing(false); }}
                className="px-4 py-2 rounded-lg border border-border text-muted-foreground/50 text-sm min-h-[44px] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-primary-foreground font-sans leading-relaxed print:text-primary-foreground">
            {doc.content}
          </pre>
        )}

        {/* System template disclaimer footer */}
        {sourceTemplate?.is_system && (
          <div className="mt-6 pt-3 border-t border-slate-200">
            <p className="text-[10px] text-slate-500 italic leading-snug">
              {SYSTEM_TEMPLATE_DISCLAIMER}
            </p>
          </div>
        )}

        {/* Owner Signature */}
        {doc.owner_signature_data && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1 font-medium">Owner Signature</p>
            <SignatureDisplay signatureData={doc.owner_signature_data} darkMode={false} />
          </div>
        )}

        {/* Client Signature */}
        {doc.signature_data && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1 font-medium">Client Signature</p>
            <SignatureDisplay signatureData={doc.signature_data} darkMode={false} />
          </div>
        )}

        {/* Document hash (signed docs) */}
        {isSigned && doc.signature_data && (() => {
          const sig = typeof doc.signature_data === 'string' ? JSON.parse(doc.signature_data) : doc.signature_data;
          return sig?.document_hash ? (
            <p className="text-xs text-muted-foreground mt-4 font-mono break-all print:hidden">
              Integrity: {sig.document_hash}
            </p>
          ) : null;
        })()}
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
            documentContent={doc.content || ''}
            documentTitle={doc.title || 'Document'}
            signerName={profile?.owner_name || currentUser?.full_name || ''}
            signerEmail={profile?.email || currentUser?.email || ''}
            onSign={handleOwnerSign}
            isSaving={ownerSigning}
            darkMode={true}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Create Document Flow (multi-step)
// ═══════════════════════════════════════════════════

function CreateDocumentFlow({ profile, business, currentUser, templates, clients, projects, estimates, onSave, onCancel, isSaving, onClientCreated, initialTemplate }) {
  const [step, setStep] = useState('client'); // client | template | content
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate || null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', company_name: '', address: '', city: '', state: '', zip_code: '', phone: '' });
  const [creatingClient, setCreatingClient] = useState(false);

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const filteredProjects = useMemo(() =>
    clientId ? projects.filter((p) => p.client_id === clientId) : [],
    [projects, clientId]
  );

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  const linkedEstimate = useMemo(() => {
    if (!projectId) return null;
    return estimates
      .filter((e) => e.project_id === projectId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
  }, [estimates, projectId]);

  // When template is selected, populate content
  useEffect(() => {
    if (!selectedTemplate) return;
    const data = buildMergeData(profile, business, selectedClient, selectedProject, linkedEstimate);
    setContent(mergeFields(selectedTemplate.content || '', data));
    setTitle(selectedTemplate.title || '');
  }, [selectedTemplate, profile, business, selectedClient, selectedProject, linkedEstimate]);

  const handleAddClient = async () => {
    if (!newClient.name.trim() || !newClient.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setCreatingClient(true);
    try {
      // workspace_id matches profile.id for FSClient
      // user_id is required by the FSClient entity — pass workspace owner's user ID
      const created = await base44.entities.FSClient.create({
        workspace_id: profile.id,
        user_id: currentUser?.id,
        name: newClient.name.trim(),
        email: newClient.email.trim(),
        phone: newClient.phone.trim() || null,
        company_name: newClient.company_name.trim() || null,
        address: newClient.address.trim() || null,
        city: newClient.city.trim() || null,
        state: newClient.state.trim() || null,
        zip_code: newClient.zip_code.trim() || null,
        status: 'active',
      });
      setClientId(created.id);
      setShowAddClient(false);
      setNewClient({ name: '', email: '', company_name: '', address: '', city: '', state: '', zip_code: '', phone: '' });
      toast.success('Client added');
      onClientCreated?.();
    } catch (err) {
      toast.error(`Failed to add client: ${err.message}`);
    }
    setCreatingClient(false);
  };

  const handleSave = () => {
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    onSave({
      profile_id: profile.id,
      template_id: selectedTemplate?.id || null,
      client_id: clientId,
      project_id: projectId || null,
      title: title || 'Untitled Document',
      content,
      status: 'draft',
      client_name: selectedClient?.name || '',
      project_name: selectedProject?.name || '',
    });
  };

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={onCancel}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm min-h-[44px]">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
        <span className={step === 'client' ? 'text-primary font-semibold' : clientId ? 'text-emerald-500' : ''}>
          1. Client {clientId && <Check className="inline h-3 w-3" />}
        </span>
        <span className="text-slate-700">→</span>
        <span className={step === 'template' ? 'text-primary font-semibold' : selectedTemplate ? 'text-emerald-500' : ''}>
          2. Template {selectedTemplate && <Check className="inline h-3 w-3" />}
        </span>
        <span className="text-slate-700">→</span>
        <span className={step === 'content' ? 'text-primary font-semibold' : ''}>3. Content</span>
      </div>

      {/* Step 1: Select Client */}
      {step === 'client' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Select Client</h3>
          <p className="text-xs text-muted-foreground/70">A client is required for every document.</p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              className={`${INPUT_CLASS} pl-9`}
            />
          </div>

          {/* Client list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredClients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClientId(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                  clientId === c.id
                    ? 'bg-primary/10 border border-primary/30 text-primary-hover'
                    : 'hover:bg-secondary text-foreground-soft'
                }`}
              >
                <span className="font-medium">{c.name}</span>
                {c.email && <span className="text-xs text-muted-foreground/70 ml-2">{c.email}</span>}
              </button>
            ))}
            {filteredClients.length === 0 && !showAddClient && (
              <p className="text-sm text-muted-foreground/70 py-4 text-center">No clients found.</p>
            )}
          </div>

          {/* Add new client */}
          {!showAddClient ? (
            <button type="button" onClick={() => setShowAddClient(true)}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover min-h-[44px]">
              <UserPlus className="h-4 w-4" /> Add New Client
            </button>
          ) : (
            <div className="bg-secondary rounded-lg p-4 space-y-3 border border-border">
              <h4 className="text-sm font-medium text-foreground">Quick Add Client</h4>
              {/* Name + Email (required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>Name *</label>
                  <input type="text" className={INPUT_CLASS} value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Client name" />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Email *</label>
                  <input type="email" className={INPUT_CLASS} value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="client@email.com" />
                </div>
              </div>
              {/* Company */}
              <div>
                <label className={LABEL_CLASS}>Company</label>
                <input type="text" className={INPUT_CLASS} value={newClient.company_name}
                  onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })} placeholder="Company or business name" />
              </div>
              {/* Address */}
              <div>
                <label className={LABEL_CLASS}>Address</label>
                <input type="text" className={INPUT_CLASS} value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} placeholder="Street address" />
              </div>
              {/* City / State / Zip */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={LABEL_CLASS}>City</label>
                  <input type="text" className={INPUT_CLASS} value={newClient.city}
                    onChange={(e) => setNewClient({ ...newClient, city: e.target.value })} placeholder="City" />
                </div>
                <div>
                  <label className={LABEL_CLASS}>State</label>
                  <input type="text" className={INPUT_CLASS} value={newClient.state}
                    onChange={(e) => setNewClient({ ...newClient, state: e.target.value })} placeholder="State" />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Zip</label>
                  <input type="text" className={INPUT_CLASS} value={newClient.zip_code}
                    onChange={(e) => setNewClient({ ...newClient, zip_code: e.target.value })} placeholder="Zip code" />
                </div>
              </div>
              {/* Phone */}
              <div>
                <label className={LABEL_CLASS}>Phone</label>
                <input type="tel" className={INPUT_CLASS} value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })} placeholder="(555) 555-5555" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddClient} disabled={creatingClient || !newClient.name.trim() || !newClient.email.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs min-h-[44px] transition-colors disabled:opacity-50">
                  {creatingClient ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Add Client
                </button>
                <button type="button" onClick={() => setShowAddClient(false)}
                  className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-transparent text-xs min-h-[44px] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button type="button" onClick={() => setStep('template')} disabled={!clientId}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Template */}
      {step === 'template' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Choose Template</h3>
          <p className="text-xs text-muted-foreground/70">
            For: <span className="text-foreground-soft">{selectedClient?.name}</span>
          </p>

          <p className="text-xs text-muted-foreground/70">Click a template to preview. You can review the language and branding before committing.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.map((tpl) => {
              const typeBadge = TEMPLATE_TYPE_BADGES[tpl.template_type] || TEMPLATE_TYPE_BADGES.custom;
              const isSelected = selectedTemplate?.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setPreviewTemplate(tpl)}
                  className={`text-left bg-secondary border rounded-lg p-3 transition-colors ${
                    isSelected ? 'border-primary' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{tpl.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary-hover">
                            <Check className="h-3 w-3" /> Selected
                          </span>
                        )}
                      </div>
                      {tpl.description && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{tpl.description}</p>}
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground/70 flex-shrink-0 mt-0.5" />
                  </div>
                </button>
              );
            })}

            {/* Start from Blank */}
            <button
              type="button"
              onClick={() => {
                setSelectedTemplate({ id: null, title: 'Untitled Document', content: '', template_type: 'custom' });
                setStep('content');
              }}
              className="text-left bg-secondary border border-dashed border-border rounded-lg p-3 hover:border-primary/50 transition-colors"
            >
              <p className="text-sm font-medium text-muted-foreground">Start from Blank</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Create a custom document</p>
            </button>
          </div>

          {selectedTemplate?.id && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Continue with <span className="text-foreground-soft font-medium">{selectedTemplate.title}</span>.
              </p>
              <button type="button" onClick={() => setStep('content')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs min-h-[44px] transition-colors">
                Continue
              </button>
            </div>
          )}

          <button type="button" onClick={() => setStep('client')}
            className="text-sm text-muted-foreground hover:text-primary min-h-[44px]">
            ← Back to Client
          </button>
        </div>
      )}

      {/* Preview modal for template-step cards */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          profile={profile}
          business={business}
          onClose={() => setPreviewTemplate(null)}
          onUseTemplate={(tpl) => {
            setSelectedTemplate(tpl);
            setPreviewTemplate(null);
            setStep('content');
          }}
        />
      )}

      {/* Step 3: Content + Project + Save */}
      {step === 'content' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Document Details</h3>
              <button type="button" onClick={() => setStep('template')}
                className="text-xs text-muted-foreground hover:text-primary">
                ← Change Template
              </button>
            </div>

            {/* Title */}
            <div>
              <label className={LABEL_CLASS}>Document Title</label>
              <input type="text" className={INPUT_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Project (optional) */}
            <div>
              <label className={LABEL_CLASS}>Link to Project (optional)</label>
              <select className={INPUT_CLASS} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— No project —</option>
                {filteredProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">Document Content</h3>
            <p className="text-xs text-muted-foreground/70">
              Fields have been auto-filled from the selected client and project. Edit below before saving.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[400px] bg-secondary border border-border text-foreground rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={handleSave} disabled={isSaving || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save as Draft
            </button>
            <button type="button" onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-border text-foreground-soft hover:text-foreground hover:bg-transparent text-sm min-h-[44px] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Template Editor (custom templates only)
// ═══════════════════════════════════════════════════

function TemplateEditor({ template, onSave, onCancel, isSaving }) {
  const isNew = !template;
  const [title, setTitle] = useState(template?.title || '');
  const [description, setDescription] = useState(template?.description || '');
  const [templateType, setTemplateType] = useState(template?.template_type || 'custom');
  const [content, setContent] = useState(template?.content || '');

  const handleSave = () => {
    onSave({
      ...(template ? { id: template.id } : {}),
      title,
      description,
      template_type: templateType,
      content,
      is_system: false,
      merge_fields: JSON.stringify(
        [...content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i)
      ),
    });
  };

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={onCancel}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm min-h-[44px]">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="text-base font-semibold text-foreground">{isNew ? 'Create Custom Template' : 'Edit Template'}</h3>
        <div>
          <label className={LABEL_CLASS}>Title</label>
          <input type="text" className={INPUT_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Final Lien Waiver" />
        </div>
        <div>
          <label className={LABEL_CLASS}>Type</label>
          <select className={INPUT_CLASS} value={templateType} onChange={(e) => setTemplateType(e.target.value)}>
            {Object.entries(TEMPLATE_TYPE_BADGES).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Description</label>
          <input type="text" className={INPUT_CLASS} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this template" />
        </div>
        <div>
          <label className={LABEL_CLASS}>Content</label>
          <p className="text-xs text-muted-foreground/70 mb-1">
            Use {'{{field_name}}'} for merge fields. Available: client_name, client_address, project_name, project_address, company_name, license_number, date, estimate_total, etc.
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[300px] bg-secondary border border-border text-foreground rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="Type your template content here..."
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={isSaving || !title.trim() || !content.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isNew ? 'Create Template' : 'Save Changes'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-foreground-soft hover:text-foreground hover:bg-transparent text-sm min-h-[44px] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════

export default function FieldServiceDocuments({ profile, currentUser }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | create | detail | editTemplate | newTemplate
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [clientFilter, setClientFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [recallDoc, setRecallDoc] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [initialTemplate, setInitialTemplate] = useState(null);

  // ─── Query: Business ────────────────────────────
  // Business holds branding (logo_url, banner_url, name, address) composited into rendered documents.
  // .list() + client-side filter per DEC-140 pattern (service-role-created records + RLS quirk).
  const { data: business = null } = useQuery({
    queryKey: ['fs-business', profile?.business_id, profile?.user_id],
    queryFn: async () => {
      if (!profile?.business_id && !profile?.user_id) return null;
      try {
        if (profile?.business_id) {
          const biz = await base44.entities.Business.get(profile.business_id);
          if (biz) return biz;
        }
        if (profile?.user_id) {
          const all = await base44.entities.Business.list();
          return (Array.isArray(all) ? all : []).find((b) => b.owner_user_id === profile.user_id) || null;
        }
        return null;
      } catch { return null; }
    },
    enabled: !!(profile?.business_id || profile?.user_id),
  });

  // ─── Query: Templates ────────────────────────────
  // FSDocumentTemplate Read is authenticated — client-side scoping enforces isolation (DEC-140 pattern).
  // Visibility rules:
  //   - business_id matches current business → business-owned, visible
  //   - business_id is null AND profile_id matches this profile → legacy/system seeded for this profile, visible
  //   - business_id is null AND no profile_id match → treat as globally-visible system template
  //   - business_id set to any OTHER business → drop (private to that business)
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['fs-doc-templates', profile?.id, profile?.business_id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const all = await base44.entities.FSDocumentTemplate.list();
        return (Array.isArray(all) ? all : []).filter((t) => {
          if (t.business_id) {
            return t.business_id === profile?.business_id;
          }
          // Null business_id: system templates seeded per-profile today, visible if matches ours
          return t.profile_id === profile.id || !t.profile_id;
        });
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Documents ────────────────────────────
  // .filter() may return empty for records created by other users — use .list() + client filter
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['fs-documents', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const all = await base44.entities.FSDocument.list();
        return (Array.isArray(all) ? all : [])
          .filter((d) => d.profile_id === profile.id)
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Clients ──────────────────────────────
  // workspace_id matches profile.id for FSClient
  // .filter() may return empty — use .list() + client filter
  const { data: clients = [] } = useQuery({
    queryKey: ['fs-clients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const all = await base44.entities.FSClient.list();
        return (Array.isArray(all) ? all : []).filter((c) => c.workspace_id === profile.id);
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Projects ─────────────────────────────
  // .filter() may return empty — use .list() + client filter
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const all = await base44.entities.FSProject.list();
        return (Array.isArray(all) ? all : []).filter((p) => p.profile_id === profile.id);
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Estimates ────────────────────────────
  // .filter() may return empty — use .list() + client filter
  const { data: estimates = [] } = useQuery({
    queryKey: ['fs-estimates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const all = await base44.entities.FSEstimate.list();
        return (Array.isArray(all) ? all : []).filter((e) => e.profile_id === profile.id);
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Initialize workspace via universal server function ─────
  // Only the workspace owner triggers initialization — non-owner members skip this entirely (DEC-015).
  const isOwner = profile?.user_id && currentUser?.id && profile.user_id === currentUser.id;
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!isOwner || !profile?.id || !currentUser?.id || templatesLoading || seeded) return;
    if (templates.length > 0) { setSeeded(true); return; }

    const seed = async () => {
      const params = {
        action: 'initialize',
        workspace_type: 'field_service',
        profile_id: profile.id,
      };
      try {
        const result = await base44.functions.invoke('initializeWorkspace', params);
        if (result?.templates_created > 0) {
          queryClient.invalidateQueries(['fs-doc-templates', profile.id]);
          toast.success(`${result.templates_created} document template${result.templates_created > 1 ? 's' : ''} added`);
        }
      } catch (err) {
        console.error('initializeWorkspace failed:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      }
      setSeeded(true);
    };
    seed();
  }, [isOwner, profile?.id, currentUser?.id, templates.length, templatesLoading, seeded, queryClient]);

  // ─── Mutations ───────────────────────────────────

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.FSDocument.create(data),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries(['fs-documents', profile?.id]);
      toast.success('Document saved as draft');
      setSelectedDoc(newDoc);
      setView('detail');
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FSDocument.update(id, data),
    onSuccess: (updatedDoc) => {
      queryClient.invalidateQueries(['fs-documents', profile?.id]);
      toast.success('Document updated');
      if (selectedDoc) setSelectedDoc({ ...selectedDoc, ...updatedDoc });
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.FSDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-documents', profile?.id]);
      toast.success('Document deleted');
      setView('list');
      setSelectedDoc(null);
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        const { id, ...rest } = data;
        return base44.entities.FSDocumentTemplate.update(id, rest);
      }
      // New user templates are business-scoped when a business exists on the profile.
      // System templates are never created through this mutation (seeded via initializeWorkspace).
      return base44.entities.FSDocumentTemplate.create({
        ...data,
        profile_id: profile.id,
        business_id: profile?.business_id || business?.id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-doc-templates'] });
      toast.success('Template saved');
      setView('list');
      setEditingTemplate(null);
    },
    onError: (err) => toast.error(`Failed to save template: ${err.message}`),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.FSDocumentTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-doc-templates', profile?.id]);
      toast.success('Template deleted');
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  // ─── Actions ───────────────────────────────────

  /** One-action Send for Signature: generate token, update status, copy link */
  const handleSendForSignature = useCallback(async (doc) => {
    const token = crypto.randomUUID();
    const link = `${window.location.origin}/client-portal?workspace=${profile.id}&doc=${doc.id}&token=${token}&sign=true`;
    try {
      await base44.entities.FSDocument.update(doc.id, {
        status: 'awaiting_signature',
        portal_token: token,
        portal_link_active: true,
        sent_for_signature_at: new Date().toISOString(),
      });
      await navigator.clipboard.writeText(link);
      queryClient.invalidateQueries(['fs-documents', profile?.id]);
      toast.success('Link copied! Share it with your client to sign.');
      // Update selected doc if viewing detail
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc({
          ...doc,
          status: 'awaiting_signature',
          portal_token: token,
          portal_link_active: true,
          sent_for_signature_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      toast.error(`Failed to send: ${err.message}`);
    }
  }, [profile?.id, queryClient, selectedDoc]);

  /** Copy existing signing link */
  const handleCopyLink = useCallback(async (doc) => {
    const link = `${window.location.origin}/client-portal?workspace=${profile.id}&doc=${doc.id}&token=${doc.portal_token}&sign=true`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Signing link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [profile?.id]);

  /** Recall: invalidate link, revert to draft */
  const handleRecallConfirm = useCallback(async () => {
    if (!recallDoc) return;
    try {
      await base44.entities.FSDocument.update(recallDoc.id, {
        status: 'draft',
        portal_link_active: false,
        recalled_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries(['fs-documents', profile?.id]);
      toast.success('Document recalled. You can edit and resend.');
      if (selectedDoc?.id === recallDoc.id) {
        setSelectedDoc({
          ...recallDoc,
          status: 'draft',
          portal_link_active: false,
          recalled_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      toast.error(`Recall failed: ${err.message}`);
    }
    setRecallDoc(null);
  }, [recallDoc, profile?.id, queryClient, selectedDoc]);

  /** Create Amendment from signed document */
  const handleCreateAmendment = useCallback((doc) => {
    const amendmentData = {
      profile_id: profile.id,
      template_id: doc.template_id || null,
      client_id: doc.client_id,
      project_id: doc.project_id || null,
      title: `Amendment to ${doc.title}`,
      content: doc.content || '',
      status: 'draft',
      client_name: doc.client_name || '',
      project_name: doc.project_name || '',
      amendment_of: doc.id,
    };
    createDocMutation.mutate(amendmentData);
  }, [profile?.id, createDocMutation]);

  /** Print — opens detail view then triggers print */
  const handlePrint = useCallback((doc) => {
    setSelectedDoc(doc);
    setView('detail');
    setTimeout(() => window.print(), 300);
  }, []);

  // ─── Client-grouped documents ──────────────────

  const clientMap = useMemo(() => {
    const map = {};
    for (const c of clients) map[c.id] = c;
    return map;
  }, [clients]);

  const groupedDocs = useMemo(() => {
    // Filter documents
    let docs = documents.map((d) => ({ ...d, _normalized: normalizeStatus(d.status) }));

    // Filter by client
    if (clientFilter !== 'all') {
      docs = docs.filter((d) => d.client_id === clientFilter);
    }

    // Hide archived unless toggled
    if (!showArchived) {
      docs = docs.filter((d) => d._normalized !== 'archived');
    }

    // Group by client_id
    const groups = {};
    for (const doc of docs) {
      const cid = doc.client_id || '__none__';
      if (!groups[cid]) groups[cid] = [];
      groups[cid].push(doc);
    }

    // Sort within each group by status priority
    for (const cid of Object.keys(groups)) {
      groups[cid].sort((a, b) => {
        const pa = DOC_STATUS_CONFIG[a._normalized]?.priority ?? 9;
        const pb = DOC_STATUS_CONFIG[b._normalized]?.priority ?? 9;
        if (pa !== pb) return pa - pb;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
    }

    // Sort groups alphabetically by client name, "__none__" last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === '__none__') return 1;
      if (b === '__none__') return -1;
      const nameA = clientMap[a]?.name || '';
      const nameB = clientMap[b]?.name || '';
      return nameA.localeCompare(nameB);
    });

    return sortedKeys.map((cid) => ({
      clientId: cid,
      clientName: cid === '__none__' ? 'No Client Assigned' : (clientMap[cid]?.name || 'Unknown Client'),
      docs: groups[cid],
    }));
  }, [documents, clients, clientFilter, showArchived, clientMap]);

  const totalDocCount = documents.length;
  const awaitingCount = documents.filter((d) => normalizeStatus(d.status) === 'awaiting_signature').length;

  // ─── Loading ─────────────────────────────────────
  const isLoading = templatesLoading || docsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground/70">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading documents...
      </div>
    );
  }

  // ─── Sub-views ───────────────────────────────────
  if (view === 'create') {
    return (
      <CreateDocumentFlow
        profile={profile}
        business={business}
        currentUser={currentUser}
        templates={templates}
        clients={clients}
        projects={projects}
        estimates={estimates}
        isSaving={createDocMutation.isPending}
        onSave={(data) => createDocMutation.mutate(data)}
        onCancel={() => { setView('list'); setInitialTemplate(null); }}
        onClientCreated={() => queryClient.invalidateQueries(['fs-clients', profile?.id])}
        initialTemplate={initialTemplate}
      />
    );
  }

  if (view === 'detail' && selectedDoc) {
    const client = selectedDoc.client_id ? clientMap[selectedDoc.client_id] : null;
    const sourceTemplate = selectedDoc.template_id
      ? templates.find((t) => t.id === selectedDoc.template_id) || null
      : null;
    return (
      <DocumentDetail
        doc={selectedDoc}
        client={client}
        profile={profile}
        business={business}
        sourceTemplate={sourceTemplate}
        currentUser={currentUser}
        onBack={() => { setView('list'); setSelectedDoc(null); }}
        onUpdate={(id, data) => updateDocMutation.mutate({ id, data })}
        onDelete={(id) => {
          if (deleteConfirm === id) {
            deleteDocMutation.mutate(id);
          } else {
            setDeleteConfirm(id);
            toast('Click delete again to confirm', { duration: 3000 });
          }
        }}
        onSendForSignature={handleSendForSignature}
        onCopyLink={handleCopyLink}
        onRecall={(doc) => setRecallDoc(doc)}
        onCreateAmendment={handleCreateAmendment}
        isUpdating={updateDocMutation.isPending}
      />
    );
  }

  if (view === 'editTemplate') {
    return (
      <TemplateEditor
        template={editingTemplate}
        isSaving={saveTemplateMutation.isPending}
        onSave={(data) => saveTemplateMutation.mutate(data)}
        onCancel={() => { setView('list'); setEditingTemplate(null); }}
      />
    );
  }

  if (view === 'newTemplate') {
    return (
      <TemplateEditor
        template={null}
        isSaving={saveTemplateMutation.isPending}
        onSave={(data) => saveTemplateMutation.mutate(data)}
        onCancel={() => setView('list')}
      />
    );
  }

  // ─── Main List View ──────────────────────────────
  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-foreground">
          Documents
          {totalDocCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground font-normal">
              {totalDocCount}
            </span>
          )}
          {awaitingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary-hover font-normal">
              {awaitingCount} awaiting
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setView('create')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm min-h-[44px] transition-colors"
        >
          <Plus className="h-4 w-4" /> New Document
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Client filter */}
        <select
          className={`${INPUT_CLASS} sm:w-48`}
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
        >
          <option value="all">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Show archived toggle */}
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer min-h-[44px] px-2">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              showArchived
                ? 'bg-primary border-primary'
                : 'border-border bg-transparent'
            }`}
          >
            {showArchived && <Check className="h-3 w-3 text-primary-foreground" />}
          </button>
          Show Archived
        </label>

        {/* Templates toggle */}
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium min-h-[44px] transition-colors ml-auto ${
            showTemplates ? 'bg-secondary text-primary-hover border border-primary/30' : 'text-muted-foreground/70 hover:text-foreground-soft'
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" /> Templates
        </button>
      </div>

      {/* Templates section (collapsible) — two-section split by ownership */}
      {showTemplates && (() => {
        const systemTemplates = templates.filter((t) => !t.business_id);
        const businessTemplates = profile?.business_id
          ? templates.filter((t) => t.business_id === profile.business_id)
          : [];
        const businessLabel = (business?.name || profile?.business_name || '').toUpperCase();
        const renderCard = (tpl) => {
          const typeBadge = TEMPLATE_TYPE_BADGES[tpl.template_type] || TEMPLATE_TYPE_BADGES.custom;
          const canEdit = !!tpl.business_id; // user-owned templates are editable; system (null business_id) is not
          return (
            <div key={tpl.id} className="flex items-center justify-between gap-2 bg-secondary rounded-lg px-3 py-2 hover:border-primary/50 border border-transparent transition-colors">
              <button
                type="button"
                onClick={() => setPreviewTemplate(tpl)}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-sm text-foreground truncate">{tpl.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`inline-block px-1 py-0.5 rounded text-xs ${typeBadge.color}`}>{typeBadge.label}</span>
                  {!tpl.business_id && (
                    <span className="inline-block px-1 py-0.5 rounded text-xs bg-secondary text-muted-foreground/70">System</span>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => setPreviewTemplate(tpl)} title="Preview"
                  className="p-1.5 text-muted-foreground/70 hover:text-primary transition-colors">
                  <Eye className="h-3 w-3" />
                </button>
                {canEdit && (
                  <button type="button" onClick={() => { setEditingTemplate(tpl); setView('editTemplate'); }} title="Edit"
                    className="p-1.5 text-muted-foreground/70 hover:text-primary transition-colors">
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        };
        return (
          <div className="bg-card border border-border rounded-xl p-4 space-y-5">
            {/* Business-scoped section — above system when a business exists */}
            {profile?.business_id && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">
                    {businessLabel ? `${businessLabel} Templates` : 'My Business Templates'}
                  </h3>
                  <button type="button" onClick={() => setView('newTemplate')}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
                    <Plus className="h-3 w-3" /> Custom
                  </button>
                </div>
                {businessTemplates.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setView('newTemplate')}
                    className="w-full text-center py-6 px-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground-soft hover:border-primary/50 transition-colors"
                  >
                    <Plus className="h-4 w-4 mx-auto mb-1" />
                    <p className="text-sm">Add your first {business?.name || 'business'} template</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Private to your business</p>
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {businessTemplates.map(renderCard)}
                  </div>
                )}
              </div>
            )}

            {/* System section — always present */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">Document Templates</h3>
                {!profile?.business_id && (
                  <button type="button" onClick={() => setView('newTemplate')}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
                    <Plus className="h-3 w-3" /> Custom
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground/70">Click any template to preview before creating a document. System templates are provided as a convenience; review with an attorney before use.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {systemTemplates.map(renderCard)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* No clients state */}
      {clients.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-1">Add a client first to create documents.</p>
          <p className="text-muted-foreground/50 text-xs">Go to the People tab to add your first client.</p>
        </div>
      ) : groupedDocs.length === 0 ? (
        /* No documents state */
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {documents.length === 0
              ? 'No documents yet. Create your first document from a template.'
              : 'No documents match your current filters.'}
          </p>
        </div>
      ) : (
        /* Client-grouped document list */
        <div className="space-y-1">
          {groupedDocs.map(({ clientId: cid, clientName, docs }) => (
            <div key={cid}>
              <ClientSectionHeader name={clientName} count={docs.length} />
              <div>
                {docs.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onView={(d) => { setSelectedDoc(d); setView('detail'); }}
                    onEdit={(d) => { setSelectedDoc(d); setView('detail'); }}
                    onSendForSignature={handleSendForSignature}
                    onCopyLink={handleCopyLink}
                    onRecall={(d) => setRecallDoc(d)}
                    onDelete={(id) => deleteDocMutation.mutate(id)}
                    onPrint={handlePrint}
                    deleteConfirm={deleteConfirm}
                    setDeleteConfirm={setDeleteConfirm}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recall dialog */}
      {recallDoc && (
        <RecallDialog
          doc={recallDoc}
          onConfirm={handleRecallConfirm}
          onCancel={() => setRecallDoc(null)}
          isRecalling={updateDocMutation.isPending}
        />
      )}

      {/* Template preview modal — opens from the main templates grid */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          profile={profile}
          business={business}
          onClose={() => setPreviewTemplate(null)}
          onUseTemplate={(tpl) => {
            setInitialTemplate(tpl);
            setPreviewTemplate(null);
            setView('create');
          }}
        />
      )}
    </div>
  );
}
