/**
 * FIELD SERVICE DOCUMENTS — Phase 4 (DEC-085)
 *
 * Oregon Construction Contract Requirements:
 * 1. Information Notice to Owner (INO) — ORS 87.093
 * 2. Notice of Right to Lien — ORS 87.021
 * 3. Pre-Claim Notice — ORS 87.057
 * 4. Subcontractor Agreement
 *
 * NOTE: ORS references need Bari confirmation.
 *
 * Future phases:
 * - Phase 5: Client portal document sharing
 * - Phase 6: E-signature flow ✓
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SignatureDisplay } from '@/components/shared/SigningFlow';
import {
  FileText, Plus, ArrowLeft, Pencil, Trash2, Loader2, Save,
  Search, Eye, Printer, X, Lock, Copy, Filter,
  Send, Archive, ChevronDown, Shield,
} from 'lucide-react';

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

const DOC_STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: 'bg-slate-500/20 text-slate-400' },
  sent:     { label: 'Sent',     color: 'bg-amber-500/20 text-amber-400' },
  signed:   { label: 'Signed',   color: 'bg-emerald-500/20 text-emerald-400' },
  archived: { label: 'Archived', color: 'bg-slate-800/50 text-slate-600' },
};

const TEMPLATE_TYPE_BADGES = {
  lien_notice:    { label: 'Lien Notice',   color: 'bg-amber-500/20 text-amber-400' },
  sub_agreement:  { label: 'Sub Agreement', color: 'bg-sky-500/20 text-sky-400' },
  contract:       { label: 'Contract',      color: 'bg-violet-500/20 text-violet-400' },
  change_order:   { label: 'Change Order',  color: 'bg-rose-500/20 text-rose-400' },
  waiver:         { label: 'Waiver',        color: 'bg-emerald-500/20 text-emerald-400' },
  custom:         { label: 'Custom',        color: 'bg-slate-500/20 text-slate-400' },
};

const FILTER_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'signed', label: 'Signed' },
  { value: 'archived', label: 'Archived' },
];

// System templates are seeded by functions/initializeWorkspace.ts (server-side, service role).
// Client no longer creates templates directly — the server function is the source of truth.

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
    // Client
    client_name: client?.name || '',
    client_email: client?.email || '',
    client_phone: client?.phone ? formatPhone(client.phone) : '',
    client_address: client?.address || '',
    // Project
    project_name: project?.name || '',
    project_address: project?.address || client?.address || '',
    project_description: project?.description || '',
    start_date: project?.start_date || '',
    end_date: project?.estimated_end_date || '',
    project_budget: project?.total_budget ? fmt(project.total_budget) : '',
    // Estimate
    estimate_number: estimate?.estimate_number || '',
    estimate_total: estimate?.total ? fmt(estimate.total) : '',
    estimate_subtotal: estimate?.subtotal ? fmt(estimate.subtotal) : '',
    estimate_terms: estimate?.terms || '',
    // Profile / Company
    company_name: profile?.business_name || profile?.workspace_name || '',
    company_phone: profile?.phone ? formatPhone(profile.phone) : '',
    company_email: profile?.email || '',
    company_website: profile?.website || '',
    owner_name: profile?.owner_name || '',
    license_number: profile?.license_number || '',
    service_area: profile?.service_area || '',
    // Computed
    amount_owed: estimate?.total ? fmt(estimate.total) : project?.total_budget ? fmt(project.total_budget) : '',
    due_date: '',
    // Sub-specific (filled manually by user)
    sub_name: '',
    scope_of_work: '',
    sub_amount: '',
    payment_terms: '',
  };
}

// ═══════════════════════════════════════════════════
// Template Card
// ═══════════════════════════════════════════════════

function TemplateCard({ template, onUse, onEdit, onDelete }) {
  const typeBadge = TEMPLATE_TYPE_BADGES[template.template_type] || TEMPLATE_TYPE_BADGES.custom;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-semibold text-slate-100 truncate">{template.title}</h4>
            {template.is_system && <Lock className="h-3 w-3 text-slate-500 flex-shrink-0" />}
          </div>
          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${typeBadge.color} mb-2`}>
            {typeBadge.label}
          </span>
          <p className="text-xs text-slate-400 line-clamp-2">{template.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={() => onUse(template)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs min-h-[44px] transition-colors"
        >
          <FileText className="h-3.5 w-3.5" /> Use Template
        </button>
        {!template.is_system && (
          <>
            <button
              type="button"
              onClick={() => onEdit(template)}
              className="p-2 text-slate-500 hover:text-amber-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(template)}
              className="p-2 text-slate-500 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Document Card
// ═══════════════════════════════════════════════════

function DocumentCard({ doc, onView }) {
  const statusCfg = DOC_STATUS_CONFIG[doc.status] || DOC_STATUS_CONFIG.draft;
  const dateStr = doc.created_at
    ? new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  return (
    <button
      type="button"
      onClick={() => onView(doc)}
      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-100 truncate">{doc.title}</p>
          {doc.client_name && <p className="text-xs text-slate-400 mt-0.5">{doc.client_name}</p>}
          {doc.project_name && <p className="text-xs text-slate-500 mt-0.5">{doc.project_name}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
      </div>
      {dateStr && <p className="text-xs text-slate-500 mt-2">{dateStr}</p>}
    </button>
  );
}

// ═══════════════════════════════════════════════════
// Document Detail / Print View
// ═══════════════════════════════════════════════════

function DocumentDetail({ doc, onBack, onUpdate, onDelete, isUpdating }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(doc.content || '');
  const statusCfg = DOC_STATUS_CONFIG[doc.status] || DOC_STATUS_CONFIG.draft;
  const isDraft = doc.status === 'draft';

  const handleSave = () => {
    onUpdate(doc.id, { content: editContent });
    setEditing(false);
  };

  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString();
    if (newStatus === 'signed') updates.signed_at = new Date().toISOString();
    onUpdate(doc.id, updates);
  };

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm min-h-[44px]">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </button>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{doc.title}</h2>
            {doc.client_name && <p className="text-sm text-slate-400 mt-0.5">{doc.client_name}</p>}
            {doc.project_name && <p className="text-sm text-slate-500">{doc.project_name}</p>}
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
          {isDraft && !editing && (
            <button type="button" onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 text-xs min-h-[44px] transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
          {doc.status === 'draft' && (
            <button type="button" onClick={() => handleStatusChange('sent')} disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs min-h-[44px] transition-colors disabled:opacity-50">
              <Send className="h-3.5 w-3.5" /> Mark as Sent
            </button>
          )}
          {doc.status === 'sent' && (
            <button type="button" onClick={() => handleStatusChange('signed')} disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs min-h-[44px] transition-colors disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> Mark as Signed
            </button>
          )}
          {doc.status !== 'archived' && (
            <button type="button" onClick={() => handleStatusChange('archived')} disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-300 text-xs min-h-[44px] transition-colors disabled:opacity-50">
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          )}
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-300 text-xs min-h-[44px] transition-colors">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button type="button"
            onClick={() => {
              const url = `${window.location.origin}/client-portal?doc=${doc.id}`;
              navigator.clipboard.writeText(url).then(
                () => toast.success('Client portal link copied!'),
                () => toast.error('Failed to copy link')
              );
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-300 text-xs min-h-[44px] transition-colors">
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </button>
          {doc.status === 'sent' && !doc.signature_data && (
            <button type="button"
              onClick={() => {
                const url = `${window.location.origin}/client-portal?doc=${doc.id}&sign=true`;
                navigator.clipboard.writeText(url).then(
                  () => toast.success('Signing link copied! Send this to the client.'),
                  () => toast.error('Failed to copy link')
                );
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs min-h-[44px] transition-colors">
              <Shield className="h-3.5 w-3.5" /> Request Signature
            </button>
          )}
          {isDraft && (
            <button type="button" onClick={() => onDelete(doc.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-800/50 text-red-400 hover:border-red-700 text-xs min-h-[44px] transition-colors ml-auto">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Content — print-friendly */}
      <div className="bg-white rounded-xl p-6 md:p-10 shadow-lg print:shadow-none print:p-0 print:rounded-none">
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

        {/* Signature display (when signed) */}
        {doc.signature_data && (
          <SignatureDisplay signatureData={doc.signature_data} darkMode={false} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Create Document Flow
// ═══════════════════════════════════════════════════

function CreateDocumentFlow({ template, profile, clients, projects, estimates, onSave, onCancel, isSaving }) {
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState(template.title);
  const textareaRef = useRef(null);

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  const filteredProjects = useMemo(() =>
    clientId ? projects.filter((p) => p.client_id === clientId) : projects,
    [projects, clientId]
  );
  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  // Find the most recent estimate for this project
  const linkedEstimate = useMemo(() => {
    if (!projectId) return null;
    return estimates
      .filter((e) => e.project_id === projectId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
  }, [estimates, projectId]);

  // Auto-merge when selections change
  useEffect(() => {
    const data = buildMergeData(profile, selectedClient, selectedProject, linkedEstimate);
    setContent(mergeFields(template.content, data));
  }, [template, profile, selectedClient, selectedProject, linkedEstimate]);

  const handleSave = () => {
    onSave({
      profile_id: profile.id,
      template_id: template.id,
      client_id: clientId || null,
      project_id: projectId || null,
      title,
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

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-base font-semibold text-slate-100">Create Document from: {template.title}</h3>

        {/* Title */}
        <div>
          <label className={LABEL_CLASS}>Document Title</label>
          <input type="text" className={INPUT_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {/* Client */}
        <div>
          <label className={LABEL_CLASS}>Select Client</label>
          <select className={INPUT_CLASS} value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(''); }}>
            <option value="">— Choose a client —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Project (optional) */}
        <div>
          <label className={LABEL_CLASS}>Select Project (optional)</label>
          <select className={INPUT_CLASS} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— No project —</option>
            {filteredProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Merged Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Document Content</h3>
        <p className="text-xs text-slate-500">
          Fields have been auto-filled from the selected client and project. Edit below before saving.
        </p>
        <textarea
          ref={textareaRef}
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
          className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-slate-100 text-sm min-h-[44px] transition-colors">
          Cancel
        </button>
      </div>
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
          className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-slate-100 text-sm min-h-[44px] transition-colors">
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
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [section, setSection] = useState('templates'); // templates | documents
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ─── Query: Templates ────────────────────────────
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['fs-doc-templates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSDocumentTemplate.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Documents ────────────────────────────
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['fs-documents', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSDocument.filter({ profile_id: profile.id });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
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

  // ─── Query: Projects ─────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Estimates ────────────────────────────
  const { data: estimates = [] } = useQuery({
    queryKey: ['fs-estimates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSEstimate.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Initialize workspace via universal server function (service role bypasses entity permissions) ─────────
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!profile?.id || !currentUser?.id || templatesLoading || seeded) return;
    if (templates.length > 0) { setSeeded(true); return; }

    const seed = async () => {
      try {
        const result = await base44.functions.invoke('initializeWorkspace', {
          action: 'initialize',
          workspace_type: 'field_service',
          profile_id: profile.id,
        });
        if (result?.templates_created > 0) {
          queryClient.invalidateQueries(['fs-doc-templates', profile.id]);
          toast.success(`${result.templates_created} Oregon document template${result.templates_created > 1 ? 's' : ''} added`);
        }
      } catch (err) {
        console.error('Failed to initialize workspace templates:', err?.message || err);
        toast.error('Could not initialize templates');
      }
      setSeeded(true);
    };
    seed();
  }, [profile?.id, currentUser?.id, templates.length, templatesLoading, seeded, queryClient]);

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

  // ─── Filtered documents ──────────────────────────
  const filteredDocs = useMemo(() => {
    let list = documents;
    if (filter !== 'all') list = list.filter((d) => d.status === filter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((d) =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.client_name || '').toLowerCase().includes(q) ||
        (d.project_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [documents, filter, searchTerm]);

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
  if (view === 'create' && selectedTemplate) {
    return (
      <CreateDocumentFlow
        template={selectedTemplate}
        profile={profile}
        clients={clients}
        projects={projects}
        estimates={estimates}
        isSaving={createDocMutation.isPending}
        onSave={(data) => createDocMutation.mutate(data)}
        onCancel={() => { setView('list'); setSelectedTemplate(null); }}
      />
    );
  }

  if (view === 'detail' && selectedDoc) {
    return (
      <DocumentDetail
        doc={selectedDoc}
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
    <div className="space-y-6 pb-8">

      {/* Section Toggle */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setSection('templates')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
            section === 'templates'
              ? 'bg-amber-500 text-black'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Templates
        </button>
        <button
          type="button"
          onClick={() => setSection('documents')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
            section === 'documents'
              ? 'bg-amber-500 text-black'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Documents {documents.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">{documents.length}</span>
          )}
        </button>
      </div>

      {/* Templates Section */}
      {section === 'templates' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Document Templates</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onUse={(t) => { setSelectedTemplate(t); setView('create'); }}
                onEdit={(t) => { setEditingTemplate(t); setView('editTemplate'); }}
                onDelete={(t) => {
                  if (deleteConfirm === t.id) {
                    deleteTemplateMutation.mutate(t.id);
                  } else {
                    setDeleteConfirm(t.id);
                    toast('Click delete again to confirm', { duration: 3000 });
                  }
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setView('newTemplate')}
            className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 min-h-[44px]"
          >
            <Plus className="h-4 w-4" /> Create Custom Template
          </button>
        </div>
      )}

      {/* Documents Section */}
      {section === 'documents' && (
        <div className="space-y-3">
          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents..."
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[36px] transition-colors ${
                  filter === chip.value
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Document list */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                {documents.length === 0
                  ? 'No documents yet. Use a template to create your first document.'
                  : 'No documents match your filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onView={(d) => { setSelectedDoc(d); setView('detail'); }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
