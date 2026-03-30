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
    var base44 = createClientFromRequest(req);
    var body = await req.json();
    var action = body.action;
    var user_id = body.user_id; // optional — fallback for MCP calls
    var workspace = body.workspace;
    var entity = body.entity;
    var data = body.data;
    var record_id = body.record_id;

    // ── Validate required parameters ──
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

    var entities = base44.asServiceRole.entities;

    // ── Resolve authenticated user ──
    // Primary: auth.me() works for in-app agent calls (carries user session)
    // Fallback: user_id parameter for MCP calls (passes reliable ObjectId)
    var user = null;
    var resolvedUserId = null;

    try {
      var me = await base44.auth.me();
      if (me && me.id) {
        resolvedUserId = String(me.id);
        user = me;
      }
    } catch (e) {
      // auth.me() failed — try MCP fallback
    }

    if (!user && user_id) {
      try {
        var allUsers = await entities.User.list();
        user = allUsers.find(function(u) { return idMatch(u.id, user_id); });
        if (user) resolvedUserId = String(user.id);
      } catch (e) {
        // list failed too
      }
    }

    if (!user || !resolvedUserId) {
      return Response.json({
        success: false,
        error: 'user_not_found',
        message: 'Could not identify the authenticated user.',
      }, { status: 401 });
    }

    var isAdmin = user.role === 'admin' || user._app_role === 'admin';

    // ── GATE 2: Tier check (skip for admin and platform workspace) ──
    var profileId = null;

    if (!isAdmin && workspace !== 'platform') {
      var profileMapping = WORKSPACE_PROFILE_MAP[workspace];
      if (!profileMapping) {
        return Response.json(
          { success: false, error: 'Unknown workspace: ' + workspace },
          { status: 400 },
        );
      }

      var allProfiles = await entities[profileMapping.entity].list();
      var userProfile = allProfiles.find(
        function(p) { return idMatch(p[profileMapping.userField], resolvedUserId); }
      );

      if (!userProfile) {
        return Response.json({
          success: false,
          error: 'no_workspace',
          message: 'No ' + workspace + ' workspace found for this user.',
        }, { status: 404 });
      }

      profileId = String(userProfile.id);

      var tier = userProfile.subscription_tier || null;
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
      var adminProfileMapping = WORKSPACE_PROFILE_MAP[workspace];
      if (adminProfileMapping) {
        var adminProfiles = await entities[adminProfileMapping.entity].list();
        var adminProfile = adminProfiles.find(
          function(p) { return idMatch(p[adminProfileMapping.userField], resolvedUserId); }
        );
        if (adminProfile) {
          profileId = String(adminProfile.id);
        }
      }
    }

    // ── GATE 3: Entity whitelist ──
    var allowed = ENTITY_WHITELIST[workspace];
    if (!allowed || !allowed.includes(entity)) {
      return Response.json({
        success: false,
        error: 'entity_not_allowed',
        message: 'Cannot write to ' + entity + ' in ' + workspace + ' workspace.',
      }, { status: 403 });
    }

    // ── REQUIRED FIELDS CHECK (create only) ──
    if (action === 'create') {
      var required = REQUIRED_FIELDS[entity];
      if (required) {
        var missing = required.filter(function(f) { return data[f] == null || data[f] === ''; });
        if (missing.length > 0) {
          return Response.json({
            success: false,
            error: 'missing_fields',
            message: entity + ' requires: ' + missing.join(', '),
            missing: missing,
          }, { status: 400 });
        }
      }
    }

    // ── EXECUTE ──
    if (action === 'create') {
      // Ownership stamping
      var writeData = Object.assign({}, data, { created_via: 'agent', created_by: resolvedUserId });

      // Stamp FK field so the record belongs to the user's workspace
      var fkConfig = ENTITY_FK[entity];
      if (fkConfig && profileId) {
        var fk = fkConfig.fkField;
        if (writeData[fk] == null) {
          if (fk === 'user_id' || fk === 'owner_id') {
            writeData[fk] = resolvedUserId;
          } else {
            writeData[fk] = profileId;
          }
        }
      }

      // Platform entities get user_id stamped directly
      if (workspace === 'platform' && writeData.user_id == null) {
        writeData.user_id = resolvedUserId;
      }

      var record = await entities[entity].create(writeData);
      console.log('[agentScopedWrite] CREATE ' + entity + ' for user ' + resolvedUserId + ': ' + record.id);

      return Response.json({
        success: true,
        action: 'create',
        entity: entity,
        workspace: workspace,
        user_id: resolvedUserId,
        record: record,
      });
    }

    if (action === 'update') {
      var updateData = Object.assign({}, data, { updated_via: 'agent' });
      var updatedRecord = await entities[entity].update(record_id, updateData);
      console.log('[agentScopedWrite] UPDATE ' + entity + ' ' + record_id + ' for user ' + resolvedUserId);

      return Response.json({
        success: true,
        action: 'update',
        entity: entity,
        workspace: workspace,
        user_id: resolvedUserId,
        record: updatedRecord,
      });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[agentScopedWrite] ERROR: ' + error.message);
    return Response.json(
      { success: false, error: 'server_error', message: error.message },
      { status: 500 },
    );
  }
});
