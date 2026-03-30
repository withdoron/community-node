import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Workspace → profile entity + user field (mirrors agentScopedQuery) ──
const WORKSPACE_PROFILE_MAP = {
  'field-service': { entity: 'FieldServiceProfile', userField: 'user_id' },
  'finance':       { entity: 'FinancialProfile',    userField: 'user_id' },
  'team':          { entity: 'Team',                userField: 'owner_id' },
  'property-pulse':{ entity: 'PMPropertyProfile',   userField: 'user_id' },
};

// ── Entity whitelist per workspace — only these entities accept agent writes ──
const ENTITY_WHITELIST = {
  'field-service': [
    'FSClient', 'FSProject', 'FSDailyLog', 'FSMaterialEntry', 'FSLaborEntry',
    'FSDailyPhoto', 'FSEstimate', 'FSPayment', 'FSPermit',
  ],
  'finance': ['Transaction', 'TransactionCategory', 'RecurringTransaction'],
  'team': ['Play', 'PlayAssignment', 'TeamMember'],
  'property-pulse': [
    'PMProperty', 'PMTenant', 'PMMaintenanceRequest', 'PMTransaction', 'PMListing',
  ],
  'platform': ['ServiceFeedback', 'Recommendation'],
};

// ── Required fields per entity (create only) ──
const REQUIRED_FIELDS = {
  FSClient:        ['name'],
  FSProject:       ['name'],
  Transaction:     ['amount', 'category', 'date'],
  Play:            ['name'],
  PMProperty:      ['name'],
  ServiceFeedback: ['message'],
};

// ── Entity → FK field for ownership stamping on create ──
// Mirrors ENTITY_CONFIG from agentScopedQuery
const ENTITY_FK = {
  // Field Service
  FSClient:        { fkField: 'workspace_id', workspace: 'field-service' },
  FSProject:       { fkField: 'profile_id',   workspace: 'field-service' },
  FSDailyLog:      { fkField: 'profile_id',   workspace: 'field-service' },
  FSMaterialEntry: { fkField: 'profile_id',   workspace: 'field-service' },
  FSLaborEntry:    { fkField: 'profile_id',   workspace: 'field-service' },
  FSDailyPhoto:    { fkField: 'profile_id',   workspace: 'field-service' },
  FSEstimate:      { fkField: 'profile_id',   workspace: 'field-service' },
  FSPayment:       { fkField: 'profile_id',   workspace: 'field-service' },
  FSPermit:        { fkField: 'profile_id',   workspace: 'field-service' },
  // Finance
  Transaction:          { fkField: 'profile_id', workspace: 'finance' },
  TransactionCategory:  { fkField: 'profile_id', workspace: 'finance' },
  RecurringTransaction: { fkField: 'profile_id', workspace: 'finance' },
  // Team
  Play:            { fkField: 'team_id', workspace: 'team' },
  PlayAssignment:  { fkField: 'team_id', workspace: 'team' },
  TeamMember:      { fkField: 'team_id', workspace: 'team' },
  // Property Pulse
  PMProperty:           { fkField: 'profile_id', workspace: 'property-pulse' },
  PMTenant:             { fkField: 'profile_id', workspace: 'property-pulse' },
  PMMaintenanceRequest: { fkField: 'profile_id', workspace: 'property-pulse' },
  PMTransaction:        { fkField: 'profile_id', workspace: 'property-pulse' },
  PMListing:            { fkField: 'profile_id', workspace: 'property-pulse' },
  // Platform
  ServiceFeedback: { fkField: 'user_id',  workspace: 'platform' },
  Recommendation:  { fkField: 'user_id',  workspace: 'platform' },
};

// Safe string comparison — handles ObjectId, number, null, undefined
function idMatch(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, user_id, workspace, entity, data, record_id } = body;

    // ── Validate required parameters ──
    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
      return Response.json({ success: false, error: 'user_id is required' }, { status: 400 });
    }
    if (action !== 'create' && action !== 'update') {
      return Response.json({ success: false, error: 'action must be "create" or "update"' }, { status: 400 });
    }
    if (!workspace) {
      return Response.json({ success: false, error: 'workspace is required' }, { status: 400 });
    }
    if (!entity) {
      return Response.json({ success: false, error: 'entity is required' }, { status: 400 });
    }
    if (!data || typeof data !== 'object') {
      return Response.json({ success: false, error: 'data object is required' }, { status: 400 });
    }
    if (action === 'update' && !record_id) {
      return Response.json({ success: false, error: 'record_id is required for update action' }, { status: 400 });
    }

    const entities = base44.asServiceRole.entities;

    // ── GATE 1: Admin check ──
    // Use .list() + idMatch() instead of .get() — .get() fails with ObjectId format mismatch
    console.log('[agentScopedWrite] received user_id:', user_id, typeof user_id);
    const allUsers = await entities.User.list();
    const user = allUsers.find(function(u) { return idMatch(u.id, user_id); });
    if (!user) {
      console.log('[agentScopedWrite] user not found. Total users:', allUsers.length, 'sample IDs:', allUsers.slice(0, 3).map(function(u) { return { id: u.id, type: typeof u.id }; }));
      return Response.json({ success: false, error: 'user_not_found', message: 'User not found for id: ' + user_id }, { status: 404 });
    }
    const isAdmin = user.role === 'admin';

    // ── GATE 2: Tier check (skip for admin and platform workspace) ──
    let profileId = null;

    if (!isAdmin && workspace !== 'platform') {
      const profileMapping = WORKSPACE_PROFILE_MAP[workspace];
      if (!profileMapping) {
        return Response.json(
          { success: false, error: `Unknown workspace: ${workspace}` },
          { status: 400 },
        );
      }

      const allProfiles = await entities[profileMapping.entity].list();
      const userProfile = allProfiles.find(
        (p) => idMatch(p[profileMapping.userField], user_id),
      );

      if (!userProfile) {
        return Response.json({
          success: false,
          error: 'no_workspace',
          message: `No ${workspace} workspace found for this user.`,
        }, { status: 404 });
      }

      profileId = String(userProfile.id);

      const tier = userProfile.subscription_tier || null;
      if (tier !== 'full') {
        return Response.json({
          success: false,
          error: 'upgrade_required',
          message: 'Write actions require the full assistant ($18/month). Your current plan includes read-only help mode.',
        }, { status: 403 });
      }
    }

    // For admin users on non-platform workspaces, still resolve profileId for FK stamping
    if (isAdmin && workspace !== 'platform' && !profileId) {
      const profileMapping = WORKSPACE_PROFILE_MAP[workspace];
      if (profileMapping) {
        const allProfiles = await entities[profileMapping.entity].list();
        const userProfile = allProfiles.find(
          (p) => idMatch(p[profileMapping.userField], user_id),
        );
        if (userProfile) {
          profileId = String(userProfile.id);
        }
      }
    }

    // ── GATE 3: Entity whitelist ──
    const allowed = ENTITY_WHITELIST[workspace];
    if (!allowed || !allowed.includes(entity)) {
      return Response.json({
        success: false,
        error: 'entity_not_allowed',
        message: `Cannot write to ${entity} in ${workspace} workspace.`,
      }, { status: 403 });
    }

    // ── REQUIRED FIELDS CHECK (create only) ──
    if (action === 'create') {
      const required = REQUIRED_FIELDS[entity];
      if (required) {
        const missing = required.filter((f) => data[f] == null || data[f] === '');
        if (missing.length > 0) {
          return Response.json({
            success: false,
            error: 'missing_fields',
            message: `${entity} requires: ${missing.join(', ')}`,
            missing,
          }, { status: 400 });
        }
      }
    }

    // ── EXECUTE ──
    if (action === 'create') {
      // Ownership stamping
      const writeData = { ...data, created_via: 'agent' };

      // Stamp FK field so the record belongs to the user's workspace
      const fkConfig = ENTITY_FK[entity];
      if (fkConfig && profileId) {
        const fk = fkConfig.fkField;
        // Only stamp if not already provided in data
        if (writeData[fk] == null) {
          if (fk === 'user_id' || fk === 'owner_id') {
            writeData[fk] = user_id;
          } else {
            // profile_id, workspace_id, team_id — use the resolved profile
            writeData[fk] = profileId;
          }
        }
      }

      // Platform entities get user_id stamped directly
      if (workspace === 'platform' && writeData.user_id == null) {
        writeData.user_id = user_id;
      }

      const record = await entities[entity].create(writeData);
      console.log(`[agentScopedWrite] CREATE ${entity} for user ${user_id}: ${record.id}`);

      return Response.json({
        success: true,
        action: 'create',
        entity,
        workspace,
        user_id,
        record,
      });
    }

    if (action === 'update') {
      const writeData = { ...data, updated_via: 'agent' };
      const record = await entities[entity].update(record_id, writeData);
      console.log(`[agentScopedWrite] UPDATE ${entity} ${record_id} for user ${user_id}`);

      return Response.json({
        success: true,
        action: 'update',
        entity,
        workspace,
        user_id,
        record,
      });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error(`[agentScopedWrite] ERROR: ${error.message}`);
    return Response.json(
      { success: false, error: 'server_error', message: error.message },
      { status: 500 },
    );
  }
});
