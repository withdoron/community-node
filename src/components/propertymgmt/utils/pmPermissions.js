// PM workspace permission helpers — mirrors isTeamCoach/isTeamMember pattern.
// Pure functions, no hooks. Importable from any component.
//
// Role hierarchy (three-tier fractal):
//   Tier 1 (full access):    admin
//   Tier 2 (scoped write):   property_manager, owner, worker
//   Tier 3 (narrow access):  tenant

/**
 * Determine the user's role in a PM workspace.
 * Admin = workspace creator. Otherwise reads from PMWorkspaceMember record.
 */
export const getPMRole = (profile, currentUser, memberRecord) => {
  if (profile?.user_id === currentUser?.id) return 'admin';
  return memberRecord?.role || null;
};

/** Tier 1: Full CRUD, settings, invite, promote, delete workspace */
export const isPMAdmin = (role) => role === 'admin';

/** Tier 1-2: Can manage properties, expenses, labor, maintenance */
export const isPMManager = (role) => ['admin', 'property_manager'].includes(role);

/** Shorthand for "can write data" — admin or property manager */
export const canPMEdit = (role) => ['admin', 'property_manager'].includes(role);

/** Property owner role (read-only finances, see their stakes) */
export const isPMOwnerRole = (role) => role === 'owner';

/** Tier 3: Narrowest access — own unit only */
export const isPMTenant = (role) => role === 'tenant';

/** Worker role — maintenance tasks, limited property access */
export const isPMWorker = (role) => role === 'worker';

/** Can view financial data (admin, manager, and owners in read-only) */
export const canViewFinances = (role) => ['admin', 'property_manager', 'owner'].includes(role);

/** Can finalize/unfinalize settlements (admin and manager only) */
export const canFinalizeSettlement = (role) => ['admin', 'property_manager'].includes(role);
