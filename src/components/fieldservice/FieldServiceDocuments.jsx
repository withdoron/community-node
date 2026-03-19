/**
 * FIELD SERVICE DOCUMENTS — SPEC (DEC-085)
 *
 * Oregon Construction Contract Requirements:
 * ──────────────────────────────────────────
 * 1. Information Notice to Owner (INO) — ORS 87.093
 *    Must be delivered to property owner before or at start of work.
 *    Informs owner of lien rights, contractor obligations, and
 *    the Construction Contractors Board complaint process.
 *
 * 2. Notice of Right to Lien — ORS 87.021
 *    Filed with county clerk to preserve lien rights on the property.
 *    Must be delivered within 8 business days of first furnishing
 *    labor/materials. Required for subcontractors and suppliers.
 *
 * 3. Pre-Claim Notice — ORS 87.057
 *    Required before filing a construction lien. Must be sent to
 *    owner, general contractor, and mortgage lender at least 10 days
 *    before filing the lien. Identifies the claimant, property, and
 *    amount claimed.
 *
 * NOTE: ORS references need Bari confirmation — verify against
 * current Oregon Revised Statutes for construction lien law.
 *
 * Additional Documents:
 * - Subcontractor Agreement (scope, payment terms, insurance requirements)
 * - Change Order Authorization (client signature required)
 * - Final Lien Waiver / Release (upon final payment)
 *
 *
 * Data Model:
 * ──────────
 * FSDocumentTemplate (system and custom templates):
 *   id                 — auto
 *   profile_id         — FK to FieldServiceProfile
 *   template_type      — enum: lien_notice | sub_agreement | contract | change_order | waiver | custom
 *   title              — string (e.g. "Information Notice to Owner")
 *   description        — string (short summary)
 *   content            — text (template body with merge fields like {{client_name}})
 *   merge_fields       — JSON array of field keys used in this template
 *   is_system          — boolean (true = platform-provided, false = user-created)
 *   created_at         — datetime
 *   updated_at         — datetime
 *
 * FSDocument (generated from templates):
 *   id                 — auto
 *   profile_id         — FK to FieldServiceProfile
 *   template_id        — FK to FSDocumentTemplate
 *   project_id         — FK to FSProject (optional)
 *   client_id          — FK to FSClient
 *   title              — string
 *   content            — text (merged content, editable after generation)
 *   status             — enum: draft | sent | signed | archived
 *   sent_at            — datetime (nullable)
 *   signed_at          — datetime (nullable)
 *   signature_data     — JSON (nullable — future e-sign: { name, date, ip, image_url })
 *   created_at         — datetime
 *   updated_at         — datetime
 *
 *
 * Available Merge Fields:
 * ───────────────────────
 * From FSClient:
 *   {{client_name}}          {{client_email}}
 *   {{client_phone}}         {{client_address}}
 *
 * From FSProject:
 *   {{project_name}}         {{project_address}}
 *   {{project_description}}  {{project_start_date}}
 *   {{project_end_date}}     {{project_budget}}
 *   {{project_status}}
 *
 * From FSEstimate:
 *   {{estimate_number}}      {{estimate_date}}
 *   {{estimate_total}}       {{estimate_subtotal}}
 *   {{estimate_tax}}         {{estimate_terms}}
 *   {{estimate_valid_until}} {{estimate_prepared_by}}
 *
 * From FieldServiceProfile:
 *   {{company_name}}         {{company_phone}}
 *   {{company_email}}        {{company_website}}
 *   {{owner_name}}           {{license_number}}
 *   {{service_area}}
 *
 * System:
 *   {{current_date}}         {{current_year}}
 *
 *
 * Recommended UI:
 * ───────────────
 * - New "Documents" tab in Field Service (between People and Settings in workspaceTypes.js)
 * - Two-panel layout: Templates list + Generated documents list
 * - Create flow: pick template -> select client/project -> auto-fill merge fields -> edit -> save
 * - Document status badges: Draft (slate), Sent (amber), Signed (emerald), Archived (slate dim)
 * - Print/PDF support reusing the same pattern as EstimatePreview (white bg, print CSS)
 * - Client portal: shared link for client to view and sign (future)
 *
 *
 * Build Phases:
 * ─────────────
 * Phase 1: Templates + document generation (no e-sign)
 *   - CRUD for FSDocumentTemplate
 *   - System templates for Oregon INO, Notice of Right to Lien, Pre-Claim Notice
 *   - Merge field replacement engine
 *   - Print/PDF output
 *
 * Phase 2: Client portal document sharing
 *   - Shareable link per document
 *   - Client views document in portal (read-only)
 *   - Status tracking: sent -> viewed
 *
 * Phase 3: E-signature flow
 *   - Canvas-based signature capture
 *   - Signature storage and verification
 *   - Status: viewed -> signed
 *   - Signed document PDF generation with embedded signature
 *
 *
 * Base44 Entities Needed: FSDocumentTemplate, FSDocument
 * (Create in Base44 dashboard before building Phase 1)
 */

// Component will be built in a future session
export default function FieldServiceDocuments() {
  return null;
}
