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
import { SignatureDisplay } from '@/components/shared/SigningFlow';
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
  'w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[44px]';
const LABEL_CLASS = 'block text-slate-300 text-sm font-medium mb-1';

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
  draft:              { label: 'Draft',              color: 'bg-slate-500/20 text-slate-400', priority: 1 },
  awaiting_signature: { label: 'Awaiting Signature', color: 'bg-amber-500/20 text-amber-400', priority: 0, pulse: true },
  signed:             { label: 'Signed',             color: 'bg-emerald-500/20 text-emerald-400', priority: 2 },
  archived:           { label: 'Archived',           color: 'bg-slate-800/50 text-slate-600', priority: 3 },
};

const TEMPLATE_TYPE_BADGES = {
  lien_notice:    { label: 'Lien Notice',   color: 'bg-amber-500/20 text-amber-400' },
  sub_agreement:  { label: 'Sub Agreement', color: 'bg-sky-500/20 text-sky-400' },
  contract:       { label: 'Contract',      color: 'bg-violet-500/20 text-violet-400' },
  change_order:   { label: 'Change Order',  color: 'bg-rose-500/20 text-rose-400' },
  waiver:         { label: 'Waiver',        color: 'bg-emerald-500/20 text-emerald-400' },
  custom:         { label: 'Custom',        color: 'bg-slate-500/20 text-slate-400' },
};

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

function buildMergeData(profile, client, project, estimate) {
  const today = new Date();
  return {
    date: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    current_date: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    current_year: String(today.getFullYear()),
    client_name: client?.name || '',
    client_email: client?.email || '',
    client_phone: client?.phone ? formatPhone(client.phone) : '',
    client_address: client?.address || '',
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
    company_name: profile?.business_name || profile?.workspace_name || '',
    company_phone: profile?.phone ? formatPhone(profile.phone) : '',
    company_email: profile?.email || '',
    company_website: profile?.website || '',
    owner_name: profile?.owner_name || '',
    license_number: profile?.license_number || '',
    service_area: profile?.service_area || '',
    amount_owed: estimate?.total ? fmt(estimate.total) : project?.total_budget ? fmt(project.total_budget) : '',
    due_date: '',
    sub_name: '',
    scope_of_work: '',
    sub_amount: '',
    payment_terms: '',
  };
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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
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
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-800/50 transition-colors group">
      {/* Icon */}
      <FileText className={`h-4 w-4 flex-shrink-0 ${
        isSigned ? 'text-emerald-500' : isAwaiting ? 'text-amber-500' : 'text-slate-500'
      }`} />

      {/* Title + status */}
      <button type="button" onClick={() => onView(doc)} className="flex-1 min-w-0 text-left">
        <span className="text-sm font-medium text-slate-100 truncate block">{doc.title}</span>
      </button>

      <StatusBadge status={doc.status} signedAt={doc.signed_at || doc.signature_data?.signed_at} />

      {/* Inline actions — shown on hover / always on mobile */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {isDraft && (
          <>
            <button type="button" onClick={() => onEdit(doc)} title="Edit"
              className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onSendForSignature(doc)} title="Send for Signature"
              className="p-1.5 text-amber-500 hover:text-amber-400 transition-colors rounded">
              <Send className="h-3.5 w-3.5" />
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
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {isAwaiting && (
          <>
            <button type="button" onClick={() => onCopyLink(doc)} title="Copy Signing Link"
              className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onRecall(doc)} title="Recall"
              className="p-1.5 text-slate-400 hover:text-orange-400 transition-colors rounded">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {isSigned && (
          <>
            <button type="button" onClick={() => onView(doc)} title="View"
              className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded">
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onPrint(doc)} title="Print"
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors rounded">
              <Printer className="h-3.5 w-3.5" />
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
      <div className="h-px flex-1 bg-slate-800" />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
        {name} <span className="text-slate-600">({count})</span>
      </span>
      <div className="h-px flex-1 bg-slate-800" />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Recall Confirmation Dialog
// ═══════════════════════════════════════════════════

function RecallDialog({ doc, onConfirm, onCancel, isRecalling }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-100">Recall Document?</h3>
        </div>
        <p className="text-sm text-slate-400">
          This will invalidate the signing link. Your client won't be able to sign until you send again.
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-transparent text-sm min-h-[44px] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={isRecalling}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
            {isRecalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Recall
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
  doc, client, onBack, onUpdate, onDelete, onSendForSignature,
  onCopyLink, onRecall, onCreateAmendment, isUpdating,
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(doc.content || '');
  const normalized = normalizeStatus(doc.status);
  const isDraft = normalized === 'draft';
  const isAwaiting = normalized === 'awaiting_signature';
  const isSigned = normalized === 'signed';
  const isArchived = normalized === 'archived';

  const handleSave = () => {
    onUpdate(doc.id, { content: editContent });
    setEditing(false);
  };

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px] print:hidden">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </button>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 print:hidden">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{doc.title}</h2>
            {client && <p className="text-sm text-slate-400 mt-0.5">{client.name}</p>}
            {client?.email && <p className="text-xs text-slate-500">{client.email}</p>}
            {doc.project_name && <p className="text-xs text-slate-500 mt-0.5">{doc.project_name}</p>}
            {doc.amendment_of && (
              <p className="text-xs text-amber-500/70 mt-1">Amendment of a previous document</p>
            )}
          </div>
          <StatusBadge status={doc.status} signedAt={doc.signed_at} />
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
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
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
          {isDraft && !editing && (
            <button type="button" onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent text-xs min-h-[44px] transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {isDraft && (
            <button type="button" onClick={() => onSendForSignature(doc)} disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs min-h-[44px] transition-colors disabled:opacity-50">
              <Send className="h-3.5 w-3.5" /> Send for Signature
            </button>
          )}
          {isAwaiting && (
            <>
              <button type="button" onClick={() => onCopyLink(doc)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent text-xs min-h-[44px] transition-colors">
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent text-xs min-h-[44px] transition-colors">
                <FilePlus className="h-3.5 w-3.5" /> Create Amendment
              </button>
              <button type="button" onClick={() => onUpdate(doc.id, { status: 'archived' })} disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-transparent text-xs min-h-[44px] transition-colors disabled:opacity-50">
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            </>
          )}
          {isArchived && (
            <button type="button" onClick={() => onUpdate(doc.id, { status: 'signed' })} disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent text-xs min-h-[44px] transition-colors disabled:opacity-50">
              <Archive className="h-3.5 w-3.5" /> Unarchive
            </button>
          )}
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-transparent text-xs min-h-[44px] transition-colors">
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
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[500px] bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            />
            <div className="flex gap-2">
              <button type="button" onClick={handleSave} disabled={isUpdating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
                <Save className="h-4 w-4" /> Save
              </button>
              <button type="button" onClick={() => { setEditContent(doc.content); setEditing(false); }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm min-h-[44px] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-slate-900 font-sans leading-relaxed print:text-black">
            {doc.content}
          </pre>
        )}

        {/* Signature display */}
        {doc.signature_data && (
          <SignatureDisplay signatureData={doc.signature_data} darkMode={false} />
        )}

        {/* Document hash (signed docs) */}
        {isSigned && doc.signature_data && (() => {
          const sig = typeof doc.signature_data === 'string' ? JSON.parse(doc.signature_data) : doc.signature_data;
          return sig?.document_hash ? (
            <p className="text-xs text-slate-400 mt-4 font-mono break-all print:hidden">
              Integrity: {sig.document_hash}
            </p>
          ) : null;
        })()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Create Document Flow (multi-step)
// ═══════════════════════════════════════════════════

function CreateDocumentFlow({ profile, currentUser, templates, clients, projects, estimates, onSave, onCancel, isSaving, onClientCreated }) {
  const [step, setStep] = useState('client'); // client | template | content
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
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
    const data = buildMergeData(profile, selectedClient, selectedProject, linkedEstimate);
    setContent(mergeFields(selectedTemplate.content || '', data));
    setTitle(selectedTemplate.title || '');
  }, [selectedTemplate, profile, selectedClient, selectedProject, linkedEstimate]);

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
        status: 'active',
      });
      setClientId(created.id);
      setShowAddClient(false);
      setNewClient({ name: '', email: '', phone: '' });
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
        className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px]">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={step === 'client' ? 'text-amber-500 font-semibold' : clientId ? 'text-emerald-500' : ''}>
          1. Client {clientId && <Check className="inline h-3 w-3" />}
        </span>
        <span className="text-slate-700">→</span>
        <span className={step === 'template' ? 'text-amber-500 font-semibold' : selectedTemplate ? 'text-emerald-500' : ''}>
          2. Template {selectedTemplate && <Check className="inline h-3 w-3" />}
        </span>
        <span className="text-slate-700">→</span>
        <span className={step === 'content' ? 'text-amber-500 font-semibold' : ''}>3. Content</span>
      </div>

      {/* Step 1: Select Client */}
      {step === 'client' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-base font-semibold text-slate-100">Select Client</h3>
          <p className="text-xs text-slate-500">A client is required for every document.</p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
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
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="font-medium">{c.name}</span>
                {c.email && <span className="text-xs text-slate-500 ml-2">{c.email}</span>}
              </button>
            ))}
            {filteredClients.length === 0 && !showAddClient && (
              <p className="text-sm text-slate-500 py-4 text-center">No clients found.</p>
            )}
          </div>

          {/* Add new client */}
          {!showAddClient ? (
            <button type="button" onClick={() => setShowAddClient(true)}
              className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 min-h-[44px]">
              <UserPlus className="h-4 w-4" /> Add New Client
            </button>
          ) : (
            <div className="bg-slate-800 rounded-lg p-4 space-y-3 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-200">Quick Add Client</h4>
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
              <div>
                <label className={LABEL_CLASS}>Phone</label>
                <input type="tel" className={INPUT_CLASS} value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })} placeholder="(555) 555-5555" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddClient} disabled={creatingClient || !newClient.name.trim() || !newClient.email.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs min-h-[44px] transition-colors disabled:opacity-50">
                  {creatingClient ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Add Client
                </button>
                <button type="button" onClick={() => setShowAddClient(false)}
                  className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-transparent text-xs min-h-[44px] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button type="button" onClick={() => setStep('template')} disabled={!clientId}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Template */}
      {step === 'template' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-base font-semibold text-slate-100">Choose Template</h3>
          <p className="text-xs text-slate-500">
            For: <span className="text-slate-300">{selectedClient?.name}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.map((tpl) => {
              const typeBadge = TEMPLATE_TYPE_BADGES[tpl.template_type] || TEMPLATE_TYPE_BADGES.custom;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => { setSelectedTemplate(tpl); setStep('content'); }}
                  className="text-left bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-amber-500/50 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-100 truncate">{tpl.title}</p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${typeBadge.color} mt-1`}>
                    {typeBadge.label}
                  </span>
                  {tpl.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>}
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
              className="text-left bg-slate-800 border border-dashed border-slate-600 rounded-lg p-3 hover:border-amber-500/50 transition-colors"
            >
              <p className="text-sm font-medium text-slate-400">Start from Blank</p>
              <p className="text-xs text-slate-600 mt-1">Create a custom document</p>
            </button>
          </div>

          <button type="button" onClick={() => setStep('client')}
            className="text-sm text-slate-400 hover:text-amber-500 min-h-[44px]">
            ← Back to Client
          </button>
        </div>
      )}

      {/* Step 3: Content + Project + Save */}
      {step === 'content' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Document Details</h3>
              <button type="button" onClick={() => setStep('template')}
                className="text-xs text-slate-400 hover:text-amber-500">
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Document Content</h3>
            <p className="text-xs text-slate-500">
              Fields have been auto-filled from the selected client and project. Edit below before saving.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[400px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={handleSave} disabled={isSaving || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save as Draft
            </button>
            <button type="button" onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-transparent text-sm min-h-[44px] transition-colors">
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
        className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px]">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-base font-semibold text-slate-100">{isNew ? 'Create Custom Template' : 'Edit Template'}</h3>
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
          <p className="text-xs text-slate-500 mb-1">
            Use {'{{field_name}}'} for merge fields. Available: client_name, client_address, project_name, project_address, company_name, license_number, date, estimate_total, etc.
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[300px] bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            placeholder="Type your template content here..."
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={isSaving || !title.trim() || !content.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm min-h-[44px] transition-colors disabled:opacity-50">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isNew ? 'Create Template' : 'Save Changes'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-transparent text-sm min-h-[44px] transition-colors">
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

  // ─── Query: Templates ────────────────────────────
  // .filter() returns empty for service-role-created records — Base44 SDK quirk.
  // Use .list() + client filter by profile_id instead.
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['fs-doc-templates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const all = await base44.entities.FSDocumentTemplate.list();
        return (Array.isArray(all) ? all : []).filter((t) => t.profile_id === profile.id);
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
      return base44.entities.FSDocumentTemplate.create({ ...data, profile_id: profile.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-doc-templates', profile?.id]);
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
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading documents...
      </div>
    );
  }

  // ─── Sub-views ───────────────────────────────────
  if (view === 'create') {
    return (
      <CreateDocumentFlow
        profile={profile}
        currentUser={currentUser}
        templates={templates}
        clients={clients}
        projects={projects}
        estimates={estimates}
        isSaving={createDocMutation.isPending}
        onSave={(data) => createDocMutation.mutate(data)}
        onCancel={() => setView('list')}
        onClientCreated={() => queryClient.invalidateQueries(['fs-clients', profile?.id])}
      />
    );
  }

  if (view === 'detail' && selectedDoc) {
    const client = selectedDoc.client_id ? clientMap[selectedDoc.client_id] : null;
    return (
      <DocumentDetail
        doc={selectedDoc}
        client={client}
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
        <h2 className="text-lg font-bold text-slate-100">
          Documents
          {totalDocCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 font-normal">
              {totalDocCount}
            </span>
          )}
          {awaitingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 font-normal">
              {awaitingCount} awaiting
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setView('create')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm min-h-[44px] transition-colors"
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
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer min-h-[44px] px-2">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              showArchived
                ? 'bg-amber-500 border-amber-500'
                : 'border-slate-600 bg-transparent'
            }`}
          >
            {showArchived && <Check className="h-3 w-3 text-black" />}
          </button>
          Show Archived
        </label>

        {/* Templates toggle */}
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium min-h-[44px] transition-colors ml-auto ${
            showTemplates ? 'bg-slate-800 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" /> Templates
        </button>
      </div>

      {/* Templates section (collapsible) */}
      {showTemplates && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Document Templates</h3>
            <button type="button" onClick={() => setView('newTemplate')}
              className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400">
              <Plus className="h-3 w-3" /> Custom
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.map((tpl) => {
              const typeBadge = TEMPLATE_TYPE_BADGES[tpl.template_type] || TEMPLATE_TYPE_BADGES.custom;
              return (
                <div key={tpl.id} className="flex items-center justify-between gap-2 bg-slate-800 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{tpl.title}</p>
                    <span className={`inline-block px-1 py-0.5 rounded text-xs ${typeBadge.color}`}>{typeBadge.label}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!tpl.is_system && (
                      <button type="button" onClick={() => { setEditingTemplate(tpl); setView('editTemplate'); }}
                        className="p-1.5 text-slate-500 hover:text-amber-500 transition-colors">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No clients state */}
      {clients.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-1">Add a client first to create documents.</p>
          <p className="text-slate-600 text-xs">Go to the People tab to add your first client.</p>
        </div>
      ) : groupedDocs.length === 0 ? (
        /* No documents state */
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
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
    </div>
  );
}
