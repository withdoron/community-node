// Universal workspace initialization — seeds default data for any workspace type.
// Runs as service role to bypass entity-level permissions on all entity creates.
// Idempotent: checks for existing records before creating. Safe to call multiple times.
//
// Supported workspace types:
//   field_service  — seeds 4 Oregon lien law document templates (DEC-085)
//   business       — placeholder (no default data yet)
//   team           — placeholder (no default data yet)
//   finance        — placeholder (no default data yet)
//   property_management — placeholder (no default data yet)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ═══════════════════════════════════════════════════════════════════════
// Field Service: Oregon System Document Templates
// ═══════════════════════════════════════════════════════════════════════

const FS_SYSTEM_TEMPLATES = [
  {
    title: 'Information Notice to Owner',
    template_type: 'lien_notice',
    description: 'Required notice to property owner before work begins (ORS 87.093)',
    is_system: true,
    sort_order: 1,
    merge_fields: JSON.stringify(['date', 'client_name', 'project_address', 'company_name', 'license_number', 'company_phone', 'company_email', 'project_name', 'start_date', 'estimate_total']),
    content: `INFORMATION NOTICE TO OWNER

Date: {{date}}

Owner: {{client_name}}
Property Address: {{project_address}}

Dear {{client_name}},

Oregon law requires contractors to provide this notice before beginning work on your property.

Under Oregon Revised Statutes (ORS 87.093), any contractor, subcontractor, or material supplier who provides labor, materials, or services for the improvement of your property may have a right to file a lien against your property if they are not paid.

CONTRACTOR INFORMATION
Contractor: {{company_name}}
License #: {{license_number}}
Phone: {{company_phone}}
Email: {{company_email}}

PROJECT DETAILS
Project: {{project_name}}
Property Address: {{project_address}}
Estimated Start Date: {{start_date}}
Estimated Total: {{estimate_total}}

This notice is provided for informational purposes as required by Oregon law. It does not mean there is a problem with payment on your project.

For more information about your rights, contact the Construction Contractors Board at (503) 378-4621 or www.oregon.gov/ccb.


Contractor Signature: ________________________  Date: ________________________

Owner Acknowledgment: ________________________  Date: ________________________`,
  },
  {
    title: 'Notice of Right to Lien',
    template_type: 'lien_notice',
    description: "Preserves contractor's right to file a lien (ORS 87.021)",
    is_system: true,
    sort_order: 2,
    merge_fields: JSON.stringify(['date', 'client_name', 'client_address', 'project_address', 'company_name', 'license_number', 'amount_owed']),
    content: `NOTICE OF RIGHT TO LIEN

Date: {{date}}

TO: {{client_name}}
    {{client_address}}

RE: Property at {{project_address}}

Dear {{client_name}},

This notice is provided pursuant to Oregon Revised Statutes (ORS 87.021).

The undersigned has furnished or will furnish labor, materials, equipment, or services for the improvement of your property located at:

{{project_address}}

CLAIMANT INFORMATION
Name: {{company_name}}
License #: {{license_number}}

AMOUNT
The estimated or actual amount of the claim is: {{amount_owed}}

NOTICE
Under Oregon law, those who furnish labor, materials, equipment, or services for the construction, alteration, or repair of any improvement to real property may have lien rights on that property if they are not paid for their contributions.

This notice is required to be given within eight (8) business days of first furnishing labor or materials.


Signature: ________________________  Date: ________________________

{{company_name}}`,
  },
  {
    title: 'Pre-Claim Notice',
    template_type: 'lien_notice',
    description: 'Required notice before filing a construction lien (ORS 87.057)',
    is_system: true,
    sort_order: 3,
    merge_fields: JSON.stringify(['date', 'client_name', 'client_address', 'project_address', 'company_name', 'amount_owed', 'due_date']),
    content: `PRE-CLAIM NOTICE

Date: {{date}}

TO: {{client_name}}
    {{client_address}}

RE: Property at {{project_address}}

Dear {{client_name}},

This notice is provided pursuant to Oregon Revised Statutes (ORS 87.057) as a prerequisite to filing a construction lien.

CLAIMANT
{{company_name}}

PROPERTY
{{project_address}}

AMOUNT CLAIMED
{{amount_owed}}

DUE DATE
Payment was due on or before: {{due_date}}

NOTICE
Oregon law requires that this notice be sent at least ten (10) days before filing a construction lien. This notice is sent in accordance with that requirement.

The claimant has provided labor, materials, equipment, or services for the improvement of the above-described property and has not received payment for the amount claimed.

Payment of the amount claimed may prevent the filing of a construction lien against the property.

If you have questions regarding this notice, please contact:
{{company_name}}


Signature: ________________________  Date: ________________________`,
  },
  {
    title: 'Subcontractor Agreement',
    template_type: 'sub_agreement',
    description: 'Standard agreement between general contractor and subcontractor',
    is_system: true,
    sort_order: 4,
    merge_fields: JSON.stringify(['date', 'company_name', 'sub_name', 'project_name', 'project_address', 'scope_of_work', 'sub_amount', 'payment_terms', 'start_date', 'end_date']),
    content: `SUBCONTRACTOR AGREEMENT

Date: {{date}}

This agreement is entered into between:

GENERAL CONTRACTOR: {{company_name}} ("Contractor")
SUBCONTRACTOR: {{sub_name}} ("Subcontractor")

PROJECT INFORMATION
Project: {{project_name}}
Location: {{project_address}}

1. SCOPE OF WORK
Subcontractor agrees to perform the following work:

{{scope_of_work}}

2. COMPENSATION
Total compensation for the work described above: {{sub_amount}}

Payment Terms: {{payment_terms}}

3. SCHEDULE
Start Date: {{start_date}}
Completion Date: {{end_date}}

4. INSURANCE
Subcontractor shall maintain, at Subcontractor's expense:
- General liability insurance with minimum coverage of $1,000,000 per occurrence
- Workers' compensation insurance as required by Oregon law
- Automobile liability insurance if vehicles are used on the project

Proof of insurance must be provided before work begins.

5. COMPLIANCE
Subcontractor shall comply with all applicable federal, state, and local laws, ordinances, rules, and regulations, including Oregon construction contractor licensing requirements.

6. INDEPENDENT CONTRACTOR
Subcontractor is an independent contractor, not an employee of Contractor. Subcontractor is responsible for all taxes, insurance, and other obligations arising from Subcontractor's work.

7. WARRANTY
Subcontractor warrants all work performed under this agreement for a period of one (1) year from the date of completion.


CONTRACTOR
{{company_name}}

Signature: ________________________  Date: ________________________

SUBCONTRACTOR
{{sub_name}}

Signature: ________________________  Date: ________________________`,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Workspace Initializers — one function per workspace type
// ═══════════════════════════════════════════════════════════════════════

interface InitResult {
  initialized: boolean;
  templates_created: number;
  errors?: string[];
}

async function initFieldService(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  profileId: string,
): Promise<InitResult> {
  // Check if templates already exist for this profile (idempotent)
  const existing = await base44.asServiceRole.entities.FSDocumentTemplate.filter({ profile_id: profileId });
  if (existing && existing.length > 0) {
    return { initialized: true, templates_created: 0 };
  }

  // Seed all 4 system templates independently (one failure does not block others)
  let created = 0;
  const errors: string[] = [];

  for (const tpl of FS_SYSTEM_TEMPLATES) {
    try {
      await base44.asServiceRole.entities.FSDocumentTemplate.create({
        ...tpl,
        profile_id: profileId,
      });
      created++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[initFieldService] Failed to seed "${tpl.title}":`, message);
      errors.push(`${tpl.title}: ${message}`);
    }
  }

  return {
    initialized: true,
    templates_created: created,
    ...(errors.length > 0 ? { errors } : {}),
  };
}

async function initBusiness(
  _base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  _profileId: string,
): Promise<InitResult> {
  // Add default seeding for business workspaces here as the workspace grows
  return { initialized: true, templates_created: 0 };
}

async function initTeam(
  _base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  _profileId: string,
): Promise<InitResult> {
  // Add default seeding for team workspaces here as the workspace grows
  return { initialized: true, templates_created: 0 };
}

async function initFinance(
  _base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  _profileId: string,
): Promise<InitResult> {
  // Add default seeding for finance workspaces here as the workspace grows
  return { initialized: true, templates_created: 0 };
}

async function initPropertyManagement(
  _base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  _profileId: string,
): Promise<InitResult> {
  // Add default seeding for property management workspaces here as the workspace grows
  return { initialized: true, templates_created: 0 };
}

const INITIALIZERS: Record<string, (
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  profileId: string,
) => Promise<InitResult>> = {
  field_service: initFieldService,
  business: initBusiness,
  team: initTeam,
  finance: initFinance,
  property_management: initPropertyManagement,
};

// ═══════════════════════════════════════════════════════════════════════
// HTTP Handler
// ═══════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { action, workspace_type, profile_id } = body;

    if (action !== 'initialize') {
      return Response.json({ error: 'Invalid action. Expected "initialize"' }, { status: 400 });
    }

    if (!workspace_type || typeof workspace_type !== 'string') {
      return Response.json({ error: 'workspace_type is required' }, { status: 400 });
    }

    if (!profile_id || typeof profile_id !== 'string') {
      return Response.json({ error: 'profile_id is required' }, { status: 400 });
    }

    const initializer = INITIALIZERS[workspace_type];
    if (!initializer) {
      return Response.json({
        error: `Unknown workspace_type: "${workspace_type}". Valid types: ${Object.keys(INITIALIZERS).join(', ')}`,
      }, { status: 400 });
    }

    // Authorization: verify the user owns this workspace or is admin
    // For field_service, check FieldServiceProfile. For others, check ownership generically.
    if (user.role !== 'admin') {
      if (workspace_type === 'field_service') {
        const profile = await base44.asServiceRole.entities.FieldServiceProfile.get(profile_id as string);
        if (!profile || profile.user_id !== user.id) {
          return Response.json({ error: 'Not authorized for this workspace' }, { status: 403 });
        }
      }
      // Other workspace types: add ownership checks as they mature
    }

    const result = await initializer(base44, profile_id as string);

    return Response.json(result);
  } catch (error) {
    console.error('initializeWorkspace error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
